// Update media files with proper CDN URLs including HMAC tokens
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// CDN configuration
const CDN_URL = process.env.CLOUDFLARE_CDN_URL || 'https://cdn.unpuzzle.co'
const AUTH_SECRET = process.env.CDN_AUTH_SECRET || process.env.AUTH_SECRET

/**
 * Generate HMAC token for CDN authentication (simplified version)
 */
function generateHMACToken(filePath, secret) {
  const timestamp = Date.now().toString()
  const message = `${timestamp}.${filePath}`

  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64')
    .replace(/\+/g, '-')  // URL-safe base64
    .replace(/\//g, '_')  // URL-safe base64
    .replace(/=/g, '')    // Remove padding

  return `${timestamp}.${signature}`
}

/**
 * Generate CDN URL with HMAC token
 */
function generateCDNUrl(fileName) {
  // Ensure fileName doesn't start with /
  const cleanFileName = fileName.startsWith('/') ? fileName.slice(1) : fileName

  // URL-encode the filename FIRST (important!)
  const encodedFileName = encodeURIComponent(cleanFileName)

  // Generate token for the encoded path
  const token = generateHMACToken(`/${encodedFileName}`, AUTH_SECRET)

  // Build CDN URL with encoded filename and token
  return `${CDN_URL}/${encodedFileName}?token=${token}`
}

async function updateCdnUrlsWithTokens() {
  console.log('🔧 Updating CDN URLs with HMAC tokens...\n')

  if (!AUTH_SECRET) {
    console.error('❌ CDN_AUTH_SECRET or AUTH_SECRET not configured in .env.local')
    console.log('   Please add: CDN_AUTH_SECRET=your-secret-key')
    return
  }

  // Get videos with private URLs
  const { data: videos, error } = await supabase
    .from('media_files')
    .select('id, name, backblaze_url, cdn_url')
    .eq('file_type', 'video')
    .like('cdn_url', 'private:%')
    // .limit(10) // Process all videos - removed limit

  if (error) {
    console.error('❌ Failed to fetch videos:', error)
    return
  }

  console.log(`📹 Found ${videos.length} videos to update\n`)

  let updated = 0
  let failed = 0

  for (const video of videos) {
    console.log(`\nProcessing: ${video.name}`)

    // Extract filename from private URL
    const parts = video.backblaze_url?.split(':')
    const fileName = parts?.[2] || video.name

    // Generate CDN URL with token
    const cdnUrlWithToken = generateCDNUrl(fileName)

    console.log(`  📎 Generated CDN URL with token`)
    console.log(`     URL: ${cdnUrlWithToken.substring(0, 80)}...`)

    // Update database
    const { error: updateError } = await supabase
      .from('media_files')
      .update({
        cdn_url: cdnUrlWithToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', video.id)

    if (updateError) {
      console.log(`  ❌ Failed to update: ${updateError.message}`)
      failed++
    } else {
      console.log(`  ✅ Updated CDN URL`)
      updated++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Update Summary:')
  console.log(`  ✅ Updated: ${updated} videos`)
  console.log(`  ❌ Failed: ${failed} videos`)
  console.log('='.repeat(50))

  if (updated > 0) {
    console.log('\n💡 Next steps:')
    console.log('1. Queue these videos for duration extraction')
    console.log('2. The duration worker will use the CDN URLs with tokens')
    console.log('3. Tokens are valid for 6 hours by default')
  }
}

updateCdnUrlsWithTokens()
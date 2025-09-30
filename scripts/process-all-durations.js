// Process all video durations with fresh CDN tokens
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const WebSocket = require('ws')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// CDN configuration
const CDN_URL = process.env.CLOUDFLARE_CDN_URL || 'https://cdn.unpuzzle.co'
const AUTH_SECRET = process.env.CDN_AUTH_SECRET || process.env.AUTH_SECRET

// WebSocket configuration
const WS_URL = 'ws://localhost:8080'

/**
 * Generate HMAC token for CDN authentication
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

/**
 * Extract filename from various URL formats
 */
function extractFileName(mediaFile) {
  // Try to extract from backblaze_url first
  if (mediaFile.backblaze_url) {
    if (mediaFile.backblaze_url.startsWith('private:')) {
      // Format: private:bucket:filename
      const parts = mediaFile.backblaze_url.split(':')
      return parts[2] || mediaFile.name
    }
    // Try to extract from URL path
    try {
      const url = new URL(mediaFile.backblaze_url)
      const pathParts = url.pathname.split('/')
      return pathParts[pathParts.length - 1] || mediaFile.name
    } catch {
      // Not a valid URL, use name
    }
  }
  return mediaFile.name
}

/**
 * Create a duration job via WebSocket
 */
function createDurationJob(ws, videoId, videoName) {
  return new Promise((resolve, reject) => {
    const jobData = {
      type: 'create-duration-job',
      data: {
        videoId,
        videoName
      }
    }

    // Set up response handler
    const responseHandler = (data) => {
      const message = JSON.parse(data)
      if (message.type === 'job-created' && message.data.videoId === videoId) {
        ws.off('message', responseHandler)
        resolve(message.data)
      } else if (message.type === 'error') {
        ws.off('message', responseHandler)
        reject(new Error(message.error))
      }
    }

    ws.on('message', responseHandler)
    ws.send(JSON.stringify(jobData))

    // Timeout after 5 seconds
    setTimeout(() => {
      ws.off('message', responseHandler)
      resolve({ jobId: 'timeout', videoId })
    }, 5000)
  })
}

async function processAllDurations() {
  console.log('🚀 Starting comprehensive duration processing...\n')

  if (!AUTH_SECRET) {
    console.error('❌ CDN_AUTH_SECRET or AUTH_SECRET not configured in .env.local')
    return
  }

  // Get all videos without duration
  const { data: videos, error } = await supabase
    .from('media_files')
    .select('id, name, backblaze_url, cdn_url, duration_seconds')
    .eq('file_type', 'video')
    .is('duration_seconds', null)

  if (error) {
    console.error('❌ Failed to fetch videos:', error)
    return
  }

  console.log(`📹 Found ${videos.length} videos without duration\n`)

  if (videos.length === 0) {
    console.log('✅ All videos already have durations!')
    return
  }

  // Update each video with fresh CDN URL and queue for processing
  console.log('📦 Step 1: Updating all videos with fresh CDN URLs...\n')

  let updatedCount = 0
  for (const video of videos) {
    const fileName = extractFileName(video)
    const cdnUrlWithToken = generateCDNUrl(fileName)

    const { error: updateError } = await supabase
      .from('media_files')
      .update({
        cdn_url: cdnUrlWithToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', video.id)

    if (updateError) {
      console.log(`❌ Failed to update ${video.name}: ${updateError.message}`)
    } else {
      updatedCount++
      process.stdout.write(`\r✅ Updated ${updatedCount}/${videos.length} videos with fresh CDN URLs`)
    }
  }

  console.log('\n\n📦 Step 2: Queueing all videos for duration extraction...\n')

  // Connect to WebSocket server
  const ws = new WebSocket(WS_URL)

  await new Promise((resolve, reject) => {
    ws.on('open', resolve)
    ws.on('error', reject)
  })

  console.log('📡 Connected to WebSocket server\n')

  // Queue all videos for processing
  let queuedCount = 0
  let batchSize = 5

  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize)

    const promises = batch.map(video =>
      createDurationJob(ws, video.id, video.name)
        .catch(err => {
          console.error(`\n❌ Failed to queue ${video.name}: ${err.message}`)
          return null
        })
    )

    await Promise.all(promises)
    queuedCount += batch.length

    process.stdout.write(`\r📤 Queued ${queuedCount}/${videos.length} videos for processing`)

    // Small delay between batches
    if (i + batchSize < videos.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  ws.close()

  console.log('\n\n' + '='.repeat(50))
  console.log('✅ Processing Complete!')
  console.log('='.repeat(50))
  console.log(`📊 Summary:`)
  console.log(`  • Updated ${updatedCount} videos with fresh CDN URLs`)
  console.log(`  • Queued ${queuedCount} videos for duration extraction`)
  console.log('\n💡 Monitor progress with: pm2 logs unpuzzle-duration-worker')
  console.log('   The duration worker will process these with the fresh tokens')
}

processAllDurations().catch(console.error)
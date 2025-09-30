// Generate accessible Backblaze URLs for videos
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Backblaze B2 configuration
const B2_BUCKET_NAME = process.env.BACKBLAZE_BUCKET_NAME || 'unpuzzle-video-storage'
const B2_ENDPOINT = process.env.BACKBLAZE_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com'

async function generateBackblazeUrls() {
  console.log('🔧 Generating Backblaze URLs for videos...\n')

  // Get all video files without CDN URLs
  const { data: videos, error } = await supabase
    .from('media_files')
    .select('id, name, backblaze_url, backblaze_file_id')
    .eq('file_type', 'video')
    .is('cdn_url', null)
    .limit(10) // Process 10 at a time for testing

  if (error) {
    console.error('❌ Failed to fetch videos:', error)
    return
  }

  console.log(`📹 Found ${videos.length} videos to process\n`)

  let updated = 0
  let failed = 0

  for (const video of videos) {
    console.log(`Processing: ${video.name}`)

    // Extract file name from the private URL format
    // Format: private:fileId:fileName
    const parts = video.backblaze_url?.split(':')
    const fileName = parts?.[2] || video.name

    // Generate public Backblaze URL
    // This assumes your bucket is public or you have a CDN set up
    const publicUrl = `${B2_ENDPOINT}/${B2_BUCKET_NAME}/${encodeURIComponent(fileName)}`

    console.log(`  Generated URL: ${publicUrl}`)

    // Update the database with the CDN URL
    const { error: updateError } = await supabase
      .from('media_files')
      .update({
        cdn_url: publicUrl,
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
  console.log('📊 URL Generation Summary:')
  console.log(`  ✅ Updated: ${updated} videos`)
  console.log(`  ❌ Failed: ${failed} videos`)
  console.log('='.repeat(50))

  if (updated > 0) {
    console.log('\n💡 Now run the backfill script to extract durations:')
    console.log('   node scripts/backfill-all-durations.js')
  }
}

generateBackblazeUrls()
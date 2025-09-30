// Script to queue all videos with CDN URLs for duration extraction
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function backfillDurations() {
  console.log('🎬 Starting duration backfill for all videos...\n')

  // Get all video files that don't have duration yet
  const { data: videos, error } = await supabase
    .from('media_files')
    .select('id, name, cdn_url, backblaze_url, duration_seconds')
    .eq('file_type', 'video')
    .is('duration_seconds', null)

  if (error) {
    console.error('❌ Failed to fetch videos:', error)
    return
  }

  console.log(`📹 Found ${videos.length} videos without duration\n`)

  let queued = 0
  let skipped = 0

  for (const video of videos) {
    console.log(`\nProcessing: ${video.name}`)

    // Check if video has a valid URL (CDN preferred, or valid HTTP URL)
    const videoUrl = video.cdn_url || video.backblaze_url

    if (!videoUrl || videoUrl.startsWith('private:')) {
      console.log(`  ⚠️ Skipped - No accessible URL (private Backblaze format)`)
      skipped++
      continue
    }

    // Queue the job via WebSocket server
    try {
      const response = await fetch('http://localhost:8080/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'create-duration-job',
          operationId: `duration_${video.id}_${Date.now()}`,
          data: {
            jobType: 'duration',
            videoId: video.id,
            fileName: video.name,
            userId: 'backfill-script'
          }
        })
      })

      if (response.ok) {
        console.log(`  ✅ Queued for processing`)
        queued++
      } else {
        console.log(`  ❌ Failed to queue: ${response.status}`)
        skipped++
      }
    } catch (error) {
      console.log(`  ❌ Error queuing: ${error.message}`)
      skipped++
    }

    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Backfill Summary:')
  console.log(`  ✅ Queued: ${queued} videos`)
  console.log(`  ⚠️ Skipped: ${skipped} videos`)
  console.log('='.repeat(50))

  if (queued > 0) {
    console.log('\n💡 Check the duration worker logs to monitor processing:')
    console.log('   pm2 logs unpuzzle-duration-worker --lines 50')
  }
}

backfillDurations()
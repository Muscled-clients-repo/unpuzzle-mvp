// Fix CDN URLs to use proper Backblaze public format and extract durations
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Backblaze public URL format
// Your bucket: unpuzzle-mvp
const B2_PUBLIC_URL = 'https://f005.backblazeb2.com/file/unpuzzle-mvp'

async function fixCdnUrlsAndProcess() {
  console.log('🔧 Fixing CDN URLs and processing durations...\n')

  // Get all videos with private CDN URLs
  const { data: videos, error } = await supabase
    .from('media_files')
    .select('id, name, cdn_url, backblaze_file_id')
    .eq('file_type', 'video')
    .like('cdn_url', 'private:%')
    .is('duration_seconds', null)
    // .limit(5) // Process all videos - removed limit

  if (error) {
    console.error('❌ Failed to fetch videos:', error)
    return
  }

  console.log(`📹 Found ${videos.length} videos to fix and process\n`)

  let updated = 0
  let queued = 0
  let failed = 0

  for (const video of videos) {
    console.log(`\nProcessing: ${video.name}`)

    // Extract the actual filename from the private URL
    // Format: private:fileId:fileName
    const parts = video.cdn_url?.split(':')
    const fileName = parts?.[2] || video.name

    // Generate proper Backblaze public URL
    const publicUrl = `${B2_PUBLIC_URL}/${encodeURIComponent(fileName)}`

    console.log(`  📎 Generated public URL: ${publicUrl}`)

    // Update the CDN URL in database
    const { error: updateError } = await supabase
      .from('media_files')
      .update({
        cdn_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', video.id)

    if (updateError) {
      console.log(`  ❌ Failed to update URL: ${updateError.message}`)
      failed++
      continue
    }

    console.log(`  ✅ Updated CDN URL`)
    updated++

    // Now queue for duration extraction
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
            userId: 'fix-script'
          }
        })
      })

      if (response.ok) {
        console.log(`  ✅ Queued for duration extraction`)
        queued++
      } else {
        console.log(`  ⚠️ Failed to queue: ${response.status}`)
      }
    } catch (error) {
      console.log(`  ⚠️ Error queuing: ${error.message}`)
    }

    // Small delay between processing
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Processing Summary:')
  console.log(`  ✅ URLs Updated: ${updated}`)
  console.log(`  📦 Jobs Queued: ${queued}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log('='.repeat(50))

  if (queued > 0) {
    console.log('\n💡 Monitor processing with:')
    console.log('   pm2 logs unpuzzle-duration-worker --lines 50')
    console.log('\n⚠️ Note: Videos must be publicly accessible in your Backblaze bucket')
    console.log('   If FFprobe fails, check your Backblaze bucket settings')
  }
}

fixCdnUrlsAndProcess()
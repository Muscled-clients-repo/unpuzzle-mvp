// Check which videos have CDN URLs
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkCdnUrls() {
  console.log('📹 Checking CDN URLs for all videos...\n')

  // Get all video files
  const { data: videos, error } = await supabase
    .from('media_files')
    .select('id, name, cdn_url, backblaze_url, duration_seconds')
    .eq('file_type', 'video')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Failed to fetch videos:', error)
    return
  }

  let withCdn = 0
  let withoutCdn = 0
  let withDuration = 0
  let needsDuration = []

  console.log(`Total videos: ${videos.length}\n`)
  console.log('Videos with CDN URLs:')
  console.log('=' * 50)

  for (const video of videos) {
    if (video.cdn_url) {
      withCdn++
      console.log(`✅ ${video.name}`)
      console.log(`   CDN: ${video.cdn_url}`)
      console.log(`   Duration: ${video.duration_seconds || 'NOT SET'}`)

      if (!video.duration_seconds) {
        needsDuration.push(video)
      } else {
        withDuration++
      }
      console.log()
    } else {
      withoutCdn++
    }
  }

  console.log('\n' + '=' * 50)
  console.log('📊 Summary:')
  console.log(`  Videos with CDN URL: ${withCdn}`)
  console.log(`  Videos without CDN URL: ${withoutCdn}`)
  console.log(`  Videos with duration: ${withDuration}`)
  console.log(`  Videos needing duration: ${needsDuration.length}`)
  console.log('=' * 50)

  if (needsDuration.length > 0) {
    console.log('\n🎬 Videos with CDN URL but no duration:')
    needsDuration.forEach(v => {
      console.log(`  - ${v.name} (ID: ${v.id})`)
    })
  }
}

checkCdnUrls()
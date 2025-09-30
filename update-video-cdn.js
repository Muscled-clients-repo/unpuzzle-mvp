// Update a video record with a CDN URL for testing
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const videoId = '56907301-1b42-434a-9b91-60df1409529d'

// Use a sample video URL that FFprobe can actually access
// This is a public test video
const testCdnUrl = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4'

async function updateVideoCdn() {
  console.log('📹 Updating video with CDN URL...')

  const { data, error } = await supabase
    .from('media_files')
    .update({
      cdn_url: testCdnUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', videoId)
    .select()

  if (error) {
    console.error('❌ Failed to update:', error)
  } else {
    console.log('✅ Updated video:', data)
  }
}

updateVideoCdn()
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkVideo() {
  const videoId = '073e667f-b697-4571-8462-014783219dbc'

  const { data, error } = await supabase
    .from('media_files')
    .select('id, name, original_name, cdn_url, backblaze_url, created_at')
    .eq('id', videoId)
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('\n📹 Video Details:')
  console.log('ID:', data.id)
  console.log('Name:', data.name)
  console.log('Original Name:', data.original_name)
  console.log('Created:', data.created_at)
  console.log('\n🔗 URLs:')
  console.log('CDN URL:', data.cdn_url)
  console.log('Backblaze URL:', data.backblaze_url)
  console.log('\n✅ CDN URL format:', data.cdn_url?.startsWith('https://cdn.unpuzzle.co') ? 'CORRECT' : 'WRONG')
}

checkVideo().then(() => process.exit(0))

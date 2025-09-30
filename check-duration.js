// Check if duration was saved to database
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const videoId = '56907301-1b42-434a-9b91-60df1409529d'

async function checkDuration() {
  console.log('📹 Checking video duration in database...')

  const { data, error } = await supabase
    .from('media_files')
    .select('id, name, duration_seconds, updated_at')
    .eq('id', videoId)
    .single()

  if (error) {
    console.error('❌ Failed to fetch:', error)
  } else {
    console.log('✅ Video data:')
    console.log(`   ID: ${data.id}`)
    console.log(`   Name: ${data.name}`)
    console.log(`   Duration: ${data.duration_seconds} seconds`)
    console.log(`   Updated: ${data.updated_at}`)
  }
}

checkDuration()
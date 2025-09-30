// Check if any durations have been processed
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDurations() {
  console.log('🔍 Checking video durations...')

  try {
    // Check videos with durations
    const { data: withDuration, error: withError } = await supabase
      .from('media_files')
      .select('id, name, duration_seconds')
      .not('duration_seconds', 'is', null)
      .limit(5)

    // Check videos without durations
    const { data: withoutDuration, error: withoutError } = await supabase
      .from('media_files')
      .select('id, name, duration_seconds')
      .is('duration_seconds', null)
      .limit(5)

    if (withError) {
      console.error('❌ Error checking with duration:', withError)
      return
    }

    if (withoutError) {
      console.error('❌ Error checking without duration:', withoutError)
      return
    }

    console.log('\n✅ Videos WITH duration:')
    withDuration.forEach(video => {
      console.log(`   ${video.name}: ${video.duration_seconds}s`)
    })

    console.log('\n❌ Videos WITHOUT duration:')
    withoutDuration.forEach(video => {
      console.log(`   ${video.name}: ${video.duration_seconds}`)
    })

    console.log(`\n📊 Summary:`)
    console.log(`   With duration: ${withDuration.length}`)
    console.log(`   Without duration: ${withoutDuration.length}`)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkDurations()
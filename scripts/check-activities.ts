import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkActivities() {
  console.log('🔍 Checking community_activities table...\n')

  // Check total count
  const { count: totalCount, error: countError } = await supabase
    .from('community_activities')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('❌ Error counting activities:', countError)
    return
  }

  console.log(`📊 Total activities in table: ${totalCount}\n`)

  // Check by activity type
  const { data: byType, error: typeError } = await supabase
    .from('community_activities')
    .select('activity_type')

  if (typeError) {
    console.error('❌ Error fetching activity types:', typeError)
    return
  }

  const typeCounts = byType?.reduce((acc: any, row: any) => {
    acc[row.activity_type] = (acc[row.activity_type] || 0) + 1
    return acc
  }, {})

  console.log('📈 Activities by type:')
  console.log(typeCounts)
  console.log('')

  // Check sample activities
  const { data: sampleActivities, error: sampleError } = await supabase
    .from('community_activities')
    .select('id, user_id, activity_type, created_at')
    .limit(5)
    .order('created_at', { ascending: false })

  if (sampleError) {
    console.error('❌ Error fetching sample activities:', sampleError)
    return
  }

  console.log('🔎 Sample activities (most recent 5):')
  console.table(sampleActivities)
  console.log('')

  // Check if current user has activities
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (user) {
    const { count: userCount, error: userActivityError } = await supabase
      .from('community_activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (!userActivityError) {
      console.log(`👤 Activities for current user (${user.id}): ${userCount}`)
    }
  }
}

checkActivities().then(() => {
  console.log('✅ Check complete')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})

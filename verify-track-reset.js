// Verify track data reset status
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTrackReset() {
  console.log('🔍 Verifying Track Data Status\n');
  console.log('=' .repeat(50));

  // Check student_track_assignments
  const { count: assignmentCount } = await supabase
    .from('student_track_assignments')
    .select('*', { count: 'exact', head: true });

  console.log('\n📊 Current Data Status:\n');
  console.log(`Student Track Assignments: ${assignmentCount || 0} records`);

  // Check profiles with current_goal_id
  const { count: profileGoalCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .not('current_goal_id', 'is', null);

  console.log(`Profiles with goal set: ${profileGoalCount || 0} records`);

  // Check profiles with current_track_id
  const { count: profileTrackCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .not('current_track_id', 'is', null);

  console.log(`Profiles with track set: ${profileTrackCount || 0} records`);

  // Check track change requests
  const { count: requestCount } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('request_type', 'track_change');

  console.log(`Track change requests: ${requestCount || 0} records`);

  // Check goal conversations
  const { count: conversationCount } = await supabase
    .from('goal_conversations')
    .select('*', { count: 'exact', head: true });

  console.log(`Goal conversations: ${conversationCount || 0} records`);

  // Check conversation messages
  const { count: messageCount } = await supabase
    .from('conversation_messages')
    .select('*', { count: 'exact', head: true });

  console.log(`Conversation messages: ${messageCount || 0} records`);

  console.log('\n' + '=' .repeat(50));

  // Check if data is cleared
  const totalRecords = (assignmentCount || 0) + (profileGoalCount || 0) +
                       (profileTrackCount || 0) + (requestCount || 0) +
                       (conversationCount || 0) + (messageCount || 0);

  if (totalRecords === 0) {
    console.log('\n✅ READY FOR TESTING');
    console.log('All track-related data has been cleared.');
    console.log('\nYou can now:');
    console.log('1. Login as a student (12@123.com)');
    console.log('2. Go to /student/track-selection');
    console.log('3. Choose a track and complete questionnaire');
    console.log('4. Verify courses appear in dashboard');
    console.log('\nFor instructor testing:');
    console.log('1. Login as instructor');
    console.log('2. Check for new track assignment notifications');
  } else {
    console.log('\n⚠️  DATA STILL EXISTS');
    console.log('Run the migration to clear the data:');
    console.log('npx supabase migration up');
  }

  // Check default goals are set
  console.log('\n' + '=' .repeat(50));
  console.log('\n🎯 Checking Default Goals:\n');

  const { data: defaultGoals } = await supabase
    .from('track_goals')
    .select(`
      id,
      name,
      tracks!inner (name)
    `)
    .eq('is_default', true);

  if (defaultGoals && defaultGoals.length > 0) {
    console.log('Default goals configured:');
    defaultGoals.forEach(goal => {
      console.log(`  ✓ ${goal.tracks.name}: ${goal.name}`);
    });
  } else {
    console.log('❌ NO DEFAULT GOALS SET!');
    console.log('Track assignment will fail without default goals.');
  }

  console.log('\n');
}

verifyTrackReset().catch(console.error);
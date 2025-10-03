// Test track goals setup
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTrackGoals() {
  console.log('🎯 Testing Track Goals Setup\n');
  console.log('=' .repeat(50));

  // Get all track goals
  const { data: goals, error } = await supabase
    .from('track_goals')
    .select(`
      id,
      track_id,
      name,
      description,
      is_default,
      sort_order,
      is_active,
      tracks!inner (name)
    `)
    .order('tracks(name)', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    console.log('❌ Error fetching goals:', error.message);
    return;
  }

  console.log(`\n📊 Found ${goals?.length || 0} goals:\n`);

  // Group by track
  const trackGroups = {};
  goals.forEach(goal => {
    const trackName = goal.tracks.name;
    if (!trackGroups[trackName]) {
      trackGroups[trackName] = [];
    }
    trackGroups[trackName].push(goal);
  });

  // Display goals by track
  for (const [trackName, trackGoals] of Object.entries(trackGroups)) {
    console.log(`\n${trackName}:`);
    console.log('-'.repeat(40));

    trackGoals.forEach(goal => {
      console.log(`  ${goal.is_default ? '⭐' : '  '} ${goal.name}`);
      console.log(`      ID: ${goal.id}`);
      console.log(`      Active: ${goal.is_active}`);
      console.log(`      Sort: ${goal.sort_order}`);
      if (goal.description) {
        console.log(`      Desc: ${goal.description.substring(0, 50)}...`);
      }
    });

    const hasDefault = trackGoals.some(g => g.is_default);
    if (!hasDefault) {
      console.log(`\n  ⚠️  WARNING: No default goal set for ${trackName}!`);
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('\n📝 Summary:');

  const tracksWithDefaults = Object.entries(trackGroups).filter(([_, goals]) =>
    goals.some(g => g.is_default)
  );

  const tracksWithoutDefaults = Object.entries(trackGroups).filter(([_, goals]) =>
    !goals.some(g => g.is_default)
  );

  if (tracksWithDefaults.length > 0) {
    console.log(`✅ Tracks with default goals: ${tracksWithDefaults.map(([name]) => name).join(', ')}`);
  }

  if (tracksWithoutDefaults.length > 0) {
    console.log(`❌ Tracks WITHOUT default goals: ${tracksWithoutDefaults.map(([name]) => name).join(', ')}`);
    console.log('\n⚠️  The assignTrackToStudent function will fail to set current_goal_id');
    console.log('   for tracks without default goals!');
  } else {
    console.log('✅ All tracks have default goals set');
    console.log('   Track assignment should now properly set current_goal_id');
  }

  // Check course assignments to goals
  console.log('\n' + '=' .repeat(50));
  console.log('\n🎯 Checking Course-Goal Assignments:\n');

  const { data: assignments, error: assignError } = await supabase
    .from('course_goal_assignments')
    .select(`
      goal_id,
      track_goals!inner (name, tracks!inner(name)),
      courses!inner (title)
    `)
    .limit(10);

  if (!assignError && assignments && assignments.length > 0) {
    console.log('Sample course assignments:');
    assignments.forEach(a => {
      console.log(`  • ${a.courses.title}`);
      console.log(`    → ${a.track_goals.tracks.name} / ${a.track_goals.name}`);
    });
  } else {
    console.log('No course-goal assignments found or error fetching them');
  }

  console.log('\n');
}

testTrackGoals().catch(console.error);
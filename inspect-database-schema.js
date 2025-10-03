// Inspect actual database schema
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectSchema() {
  console.log('🔍 Inspecting Actual Database Schema\n');
  console.log('=' .repeat(60));

  // Try direct table queries
  console.log('📊 Checking tables individually:\n');

    // Check user_track_assignments
    console.log('1. user_track_assignments:');
    const { data: uta, error: utaError } = await supabase
      .from('user_track_assignments')
      .select('*')
      .limit(0); // Just get structure, no data

    if (!utaError) {
      console.log('   ✅ EXISTS');
      // Get a sample record to see structure
      const { data: sample } = await supabase
        .from('user_track_assignments')
        .select('*')
        .limit(1);

      if (sample && sample.length > 0) {
        console.log('   Columns:', Object.keys(sample[0]).join(', '));
      } else {
        // Get structure from empty query
        const { data: empty } = await supabase
          .from('user_track_assignments')
          .insert({})
          .select()
          .limit(0);
        console.log('   Table exists but is empty');
      }
    } else {
      console.log('   ❌ Does not exist');
    }

    // Check student_track_assignments
    console.log('\n2. student_track_assignments:');
    const { error: staError } = await supabase
      .from('student_track_assignments')
      .select('*')
      .limit(0);

    if (!staError) {
      console.log('   ✅ EXISTS');
    } else {
      console.log('   ❌ Does not exist');
    }

    // Check student_preferences
    console.log('\n3. student_preferences:');
    const { error: spError } = await supabase
      .from('student_preferences')
      .select('*')
      .limit(0);

    if (!spError) {
      console.log('   ✅ EXISTS');
    } else {
      console.log('   ❌ Does not exist');
    }

    // Check course_recommendations
    console.log('\n4. course_recommendations:');
    const { error: crError } = await supabase
      .from('course_recommendations')
      .select('*')
      .limit(0);

    if (!crError) {
      console.log('   ✅ EXISTS');
    } else {
      console.log('   ❌ Does not exist');
    }

    // Check tracks table
    console.log('\n5. tracks:');
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('*')
      .limit(1);

    if (!tracksError) {
      console.log('   ✅ EXISTS');
      if (tracks && tracks.length > 0) {
        console.log('   Columns:', Object.keys(tracks[0]).join(', '));
      }
    } else {
      console.log('   ❌ Does not exist');
    }

    // Check track_goals table
    console.log('\n6. track_goals:');
    const { data: goals, error: goalsError } = await supabase
      .from('track_goals')
      .select('*')
      .limit(1);

    if (!goalsError) {
      console.log('   ✅ EXISTS');
      if (goals && goals.length > 0) {
        console.log('   Columns:', Object.keys(goals[0]).join(', '));
      }
    } else {
      console.log('   ❌ Does not exist');
    }

  console.log('\n' + '=' .repeat(60));
  console.log('\n🎯 Summary:');
  console.log('This shows the ACTUAL tables and columns in your Supabase database.');
  console.log('Compare this with what the code expects to find mismatches.');
}

inspectSchema().catch(console.error);
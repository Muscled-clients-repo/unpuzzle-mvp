// Check which track assignment tables actually exist
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('🔍 Checking Track Assignment Tables\n');
  console.log('=' .repeat(50));

  // Try to query student_track_assignments
  console.log('\n1. Checking student_track_assignments table:');
  const { data: studentData, error: studentError } = await supabase
    .from('student_track_assignments')
    .select('id')
    .limit(1);

  if (studentError) {
    console.log('   ❌ Table does not exist or error:', studentError.code);
  } else {
    console.log('   ✅ Table exists');
  }

  // Try to query user_track_assignments
  console.log('\n2. Checking user_track_assignments table:');
  const { data: userData, error: userError } = await supabase
    .from('user_track_assignments')
    .select('id')
    .limit(1);

  if (userError) {
    console.log('   ❌ Table does not exist or error:', userError.code);
  } else {
    console.log('   ✅ Table exists');
  }

  // Check column structure if tables exist
  if (!studentError) {
    console.log('\n3. student_track_assignments columns:');
    const { data: count } = await supabase
      .from('student_track_assignments')
      .select('*', { count: 'exact', head: true });
    console.log('   Record count:', count || 0);
  }

  if (!userError) {
    console.log('\n4. user_track_assignments columns:');
    const { data: count } = await supabase
      .from('user_track_assignments')
      .select('*', { count: 'exact', head: true });
    console.log('   Record count:', count || 0);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('\n🎯 Findings:');
  console.log('The code uses "student_track_assignments" but you might have "user_track_assignments"');
  console.log('This could be a naming inconsistency between migrations and code.');
}

checkTables().catch(console.error);
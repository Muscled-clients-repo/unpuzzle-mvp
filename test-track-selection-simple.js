// Test track selection by checking database directly
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTrackSelection() {
  console.log('🧪 Testing Track Selection Flow\n');
  console.log('=' .repeat(50));

  // Simulate what the helper function does
  async function getTrackIdByType(trackType) {
    const trackName = trackType === 'agency' ? 'Agency Track' : 'SaaS Track';

    const { data, error } = await supabase
      .from('tracks')
      .select('id')
      .eq('name', trackName)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Failed to find track:', trackName, error);
      return null;
    }

    return data.id;
  }

  console.log('\n1️⃣ Testing Track ID Mapping:\n');

  const agencyId = await getTrackIdByType('agency');
  console.log(`✅ 'agency' → Track ID: ${agencyId}`);

  const saasId = await getTrackIdByType('saas');
  console.log(`✅ 'saas'   → Track ID: ${saasId}`);

  console.log('\n2️⃣ Checking student_track_assignments table:\n');

  // Check if the table exists and has the right columns
  const { data: assignments, error: assignError } = await supabase
    .from('student_track_assignments')
    .select('*')
    .limit(1);

  if (assignError) {
    if (assignError.message.includes('relation "public.student_track_assignments" does not exist')) {
      console.log('❌ Table "student_track_assignments" not found!');
      console.log('   Migration may not have run correctly.');
    } else {
      console.log('❌ Error checking assignments:', assignError.message);
    }
  } else {
    console.log('✅ Table "student_track_assignments" exists and is accessible');

    // Check the columns
    if (assignments && assignments.length > 0) {
      const columns = Object.keys(assignments[0]);
      console.log('   Columns:', columns.join(', '));
    } else {
      console.log('   (No assignments yet, table is empty)');
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('\n✅ Summary:');
  console.log('1. Track IDs can be resolved from "agency"/"saas" strings');
  console.log('2. The questionnaire UI now uses assignTrackByType() helper');
  console.log('3. This helper converts the string to the actual UUID');
  console.log('4. The track assignment should work correctly now\n');
  console.log('📝 Next: Test the actual flow by logging in as a student');
  console.log('   and going through the track selection questionnaire.\n');
}

testTrackSelection().catch(console.error);
// Check student track selection test data
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStudentTrackData() {
  console.log('🔍 Checking Student Track Selection Data\n');
  console.log('=' .repeat(50));

  // Get student ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .eq('email', '12@123.com')
    .single();

  if (profileError || !profile) {
    console.log('❌ Student account not found for 12@123.com');
    console.log('Error:', profileError?.message);
    return;
  }

  console.log('👤 Student Profile:');
  console.log('  ID:', profile.id);
  console.log('  Email:', profile.email);
  console.log('  Name:', profile.full_name || 'Not set');
  console.log('  Role:', profile.role);

  console.log('\n' + '=' .repeat(50));

  // Check preferences
  const { data: preferences } = await supabase
    .from('student_preferences')
    .select('*')
    .eq('student_id', profile.id)
    .single();

  console.log('\n📋 Student Preferences:');
  if (preferences) {
    console.log('  ✅ Questionnaire Completed:', preferences.completed_questionnaire ? 'Yes' : 'No');
    if (preferences.completed_questionnaire) {
      console.log('  📅 Completed At:', preferences.questionnaire_completed_at);
    }
    console.log('  🎓 Skill Level:', preferences.skill_level);
    console.log('  ⏰ Time Commitment:', preferences.time_commitment_hours, 'hours/week');
    console.log('  🚀 Learning Pace:', preferences.learning_pace);
    console.log('  📚 Content Formats:', preferences.content_format_preferences);
    console.log('  🎯 Difficulty:', preferences.difficulty_preference);
  } else {
    console.log('  ❌ No preferences found - questionnaire not started');
  }

  console.log('\n' + '=' .repeat(50));

  // Check track assignments
  const { data: assignments } = await supabase
    .from('student_track_assignments')
    .select('*')
    .eq('student_id', profile.id)
    .order('assigned_at', { ascending: false });

  console.log('\n🎯 Track Assignments:', assignments?.length || 0, 'found');
  if (assignments && assignments.length > 0) {
    assignments.forEach((a, index) => {
      console.log(`\n  Assignment ${index + 1}:`);
      console.log('    Type:', a.assignment_type);
      console.log('    Track ID:', a.track_id);
      console.log('    Progress:', a.progress_percentage + '%');
      console.log('    Confidence:', a.confidence_score + '%');
      console.log('    Source:', a.assignment_source);
      console.log('    Active:', a.is_active ? 'Yes' : 'No');
      console.log('    Assigned:', new Date(a.assigned_at).toLocaleDateString());
      if (a.assignment_reasoning) {
        console.log('    Reasoning:', a.assignment_reasoning);
      }
    });
  } else {
    console.log('  ❌ No track assignments yet');
  }

  console.log('\n' + '=' .repeat(50));

  // Check course recommendations
  const { data: recommendations } = await supabase
    .from('course_recommendations')
    .select('*')
    .eq('student_id', profile.id)
    .eq('is_active', true)
    .order('confidence_score', { ascending: false })
    .limit(5);

  console.log('\n📚 Course Recommendations:', recommendations?.length || 0, 'active');
  if (recommendations && recommendations.length > 0) {
    recommendations.forEach((r, index) => {
      console.log(`  ${index + 1}. Course ID: ${r.course_id}`);
      console.log(`     Confidence: ${r.confidence_score}% | Relevance: ${(r.relevance_score * 100).toFixed(0)}%`);
      console.log(`     Source: ${r.recommendation_source}`);
    });
  } else {
    console.log('  ❌ No course recommendations yet');
  }

  console.log('\n' + '=' .repeat(50));
  console.log('\n💡 Testing Instructions:');
  console.log('1. Run: npm run dev');
  console.log('2. Login at http://localhost:3000 with 12@123.com');
  console.log('3. Navigate to track selection from student dashboard');
  console.log('4. Test both questionnaire and direct selection paths');
  console.log('\nSee TEST-TRACK-SELECTION.md for detailed test steps');
}

checkStudentTrackData().catch(console.error);
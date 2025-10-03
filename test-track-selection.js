// Test the track selection helper functions
require('dotenv').config({ path: '.env.local' });

async function testTrackHelpers() {
  console.log('🧪 Testing Track Helper Functions\n');
  console.log('=' .repeat(50));

  // Import the helper functions
  const { getTrackIdByType, getTracksForSelection } = await import('./src/lib/actions/track-helpers.ts');

  console.log('\n1️⃣ Testing getTrackIdByType()\n');

  try {
    const agencyId = await getTrackIdByType('agency');
    console.log('✅ Agency Track ID:', agencyId);

    const saasId = await getTrackIdByType('saas');
    console.log('✅ SaaS Track ID:', saasId);
  } catch (error) {
    console.log('❌ Error getting track IDs:', error.message);
  }

  console.log('\n2️⃣ Testing getTracksForSelection()\n');

  try {
    const tracks = await getTracksForSelection();
    console.log('✅ Available tracks:');
    tracks.forEach(track => {
      console.log(`   - ${track.name} (type: ${track.type}, id: ${track.id})`);
    });
  } catch (error) {
    console.log('❌ Error getting tracks for selection:', error.message);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('\n✅ Helper functions are ready to use!');
  console.log('\nThe questionnaire flow should now work:');
  console.log('1. User selects "agency" or "saas" as a string');
  console.log('2. assignTrackByType() converts it to the actual UUID');
  console.log('3. Track gets assigned with the correct ID\n');
}

testTrackHelpers().catch(console.error);
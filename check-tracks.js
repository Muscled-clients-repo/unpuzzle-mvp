// Check what tracks exist in the database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTracks() {
  console.log('🔍 Checking Tracks in Database\n');
  console.log('=' .repeat(50));

  // Get all tracks
  const { data: tracks, error } = await supabase
    .from('tracks')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.log('❌ Error fetching tracks:', error.message);
    return;
  }

  console.log(`\n📊 Found ${tracks?.length || 0} tracks:\n`);

  if (tracks && tracks.length > 0) {
    tracks.forEach((track, index) => {
      console.log(`Track ${index + 1}:`);
      console.log(`  ID: ${track.id}`);
      console.log(`  Name: ${track.name}`);
      console.log(`  Description: ${track.description || 'No description'}`);
      console.log(`  Active: ${track.is_active}`);
      console.log('');
    });

    console.log('=' .repeat(50));
    console.log('\n💡 UI Issue:');
    console.log('The questionnaire is passing "agency" or "saas" as strings');
    console.log('But assignTrackToStudent needs the actual track ID (UUID)');
    console.log('\nPossible Solutions:');
    console.log('1. Map track names to IDs in the UI');
    console.log('2. Create a helper function to lookup track ID by name');
    console.log('3. Update tracks table to have a slug field for easy lookup');
  } else {
    console.log('❌ No tracks found in database!');
    console.log('\nYou need to create tracks first:');
    console.log(`
INSERT INTO tracks (name, description, is_active) VALUES
  ('Agency Track', 'Build and scale your agency business', true),
  ('SaaS Track', 'Create and grow your SaaS product', true);
    `);
  }
}

checkTracks().catch(console.error);
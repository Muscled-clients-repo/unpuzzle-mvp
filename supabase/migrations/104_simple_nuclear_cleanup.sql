-- Simple Nuclear Cleanup - Handle missing tables
-- Just destroy everything with CASCADE, ignore table errors

-- Drop functions with CASCADE (this destroys all dependent triggers)
DROP FUNCTION IF EXISTS update_user_learning_stats() CASCADE;
DROP FUNCTION IF EXISTS update_enrollment_progress() CASCADE;
DROP FUNCTION IF EXISTS update_current_lesson() CASCADE;
DROP FUNCTION IF EXISTS increment_ai_interaction_count() CASCADE;
DROP FUNCTION IF EXISTS track_ai_interaction() CASCADE;
DROP FUNCTION IF EXISTS get_videos_needing_transcription(UUID) CASCADE;

SELECT 'Nuclear cleanup complete - all ghost functions destroyed!' as status;
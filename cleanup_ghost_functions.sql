-- Manual cleanup script for ghost functions and triggers
-- Run this directly in Supabase SQL editor if migration system isn't working

-- Drop all ghost triggers
DROP TRIGGER IF EXISTS trigger_update_enrollment_progress ON video_progress;
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_enrollment ON enrollments;
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_video ON video_progress;
DROP TRIGGER IF EXISTS trigger_update_current_lesson ON video_progress;
DROP TRIGGER IF EXISTS trigger_increment_ai_interactions ON ai_interactions;
DROP TRIGGER IF EXISTS trigger_track_ai_interactions ON ai_interactions;

-- Drop all ghost functions
DROP FUNCTION IF EXISTS get_videos_needing_transcription(UUID);
DROP FUNCTION IF EXISTS update_enrollment_progress();
DROP FUNCTION IF EXISTS update_current_lesson();
DROP FUNCTION IF EXISTS increment_ai_interaction_count();
DROP FUNCTION IF EXISTS track_ai_interaction();
DROP FUNCTION IF EXISTS update_user_learning_stats();

-- Drop ghost policies
DROP POLICY IF EXISTS "students_read_enrolled_transcripts" ON video_transcripts;
DROP POLICY IF EXISTS "students_access_enrolled_videos" ON videos;
DROP POLICY IF EXISTS "students_manage_enrollments" ON enrollments;
DROP POLICY IF EXISTS "students_manage_ai_interactions" ON ai_interactions;

SELECT 'Ghost functions and triggers cleanup complete!' as status;
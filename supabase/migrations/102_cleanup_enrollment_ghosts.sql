-- Migration: Clean up enrollment ghost schema safely
-- Date: 2025-09-29
-- Description: Remove only enrollment remnants without touching existing triggers
-- Risk Level: LOW - Only removes non-existent table references

-- =============================================================================
-- SAFELY REMOVE ENROLLMENT GHOSTS (table already manually deleted)
-- =============================================================================

-- Only drop enrollment-specific triggers if they exist (won't affect video progress)
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_enrollment ON enrollments;
DROP TRIGGER IF EXISTS trigger_increment_ai_interactions ON ai_interactions;

-- Only drop enrollment-specific functions (won't affect existing functions)
DROP FUNCTION IF EXISTS update_enrollment_progress();
DROP FUNCTION IF EXISTS increment_ai_interaction_count();

-- Only drop enrollment-specific policies (won't affect other RLS policies)
DROP POLICY IF EXISTS "students_read_enrolled_transcripts" ON video_transcripts;
DROP POLICY IF EXISTS "students_access_enrolled_videos" ON videos;
DROP POLICY IF EXISTS "students_access_enrolled_courses" ON courses;

-- Only drop enrollment-specific indexes (table doesn't exist anyway)
DROP INDEX IF EXISTS idx_enrollments_user_id;
DROP INDEX IF EXISTS idx_enrollments_last_accessed;
DROP INDEX IF EXISTS idx_enrollments_course_id;

-- Ensure enrollments table is gone (safe - already manually deleted)
DROP TABLE IF EXISTS enrollments CASCADE;

-- =============================================================================
-- VERIFICATION (Safe checks only)
-- =============================================================================

DO $$
BEGIN
    -- Verify enrollments table is gone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'enrollments'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✓ enrollments table confirmed removed';
    END IF;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'ENROLLMENT GHOST CLEANUP COMPLETE';
    RAISE NOTICE '• Removed enrollment-specific triggers/functions/policies only';
    RAISE NOTICE '• Did NOT modify existing video progress triggers';
    RAISE NOTICE '• Did NOT modify existing user stats functions';
    RAISE NOTICE '=============================================================================';
END $$;
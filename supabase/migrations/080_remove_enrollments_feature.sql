-- Migration: Remove Enrollments Feature Completely
-- Date: 2025-09-24
-- Description: Remove all enrollment-based functionality and dependencies
-- Risk Level: HIGH - Removing core enrollment system

-- =============================================================================
-- DROP TRIGGERS THAT DEPEND ON ENROLLMENTS
-- =============================================================================

-- Drop triggers that reference enrollments table
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_enrollment ON enrollments;
DROP TRIGGER IF EXISTS trigger_update_enrollment_progress ON video_progress;
DROP TRIGGER IF EXISTS trigger_increment_ai_interactions ON ai_interactions;

-- =============================================================================
-- DROP FUNCTIONS THAT UPDATE ENROLLMENTS
-- =============================================================================

-- Drop functions that reference enrollments
DROP FUNCTION IF EXISTS update_enrollment_progress();
DROP FUNCTION IF EXISTS increment_ai_interaction_count();

-- =============================================================================
-- UPDATE RLS POLICIES THAT REFERENCE ENROLLMENTS
-- =============================================================================

-- Drop and recreate video_transcripts policy without enrollment dependency
DROP POLICY IF EXISTS "students_read_enrolled_transcripts" ON video_transcripts;

-- Create new policy for video transcripts (community-based access)
CREATE POLICY "authenticated_users_read_transcripts" ON video_transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('student', 'instructor', 'admin')
    )
  );

-- =============================================================================
-- UPDATE FUNCTIONS TO REMOVE ENROLLMENT REFERENCES
-- =============================================================================

-- Recreate update_user_learning_stats function without enrollment dependencies
CREATE OR REPLACE FUNCTION update_user_learning_stats()
RETURNS TRIGGER AS $$
DECLARE
  total_watch_minutes INTEGER;
BEGIN
  -- Calculate total watch time from video_progress
  SELECT COALESCE(SUM(watch_duration_minutes), 0) INTO total_watch_minutes
  FROM video_progress
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  -- Update user_learning_stats (remove enrollment-based stats)
  INSERT INTO user_learning_stats (
    user_id,
    total_watch_time_minutes,
    last_activity_at,
    updated_at
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    total_watch_minutes,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
    last_activity_at = EXCLUDED.last_activity_at,
    updated_at = EXCLUDED.updated_at;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DROP ENROLLMENTS TABLE AND ALL DEPENDENCIES
-- =============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_enrollments_user_id;
DROP INDEX IF EXISTS idx_enrollments_last_accessed;

-- Drop the enrollments table (this will cascade to dependent objects)
DROP TABLE IF EXISTS enrollments CASCADE;

-- =============================================================================
-- UPDATE REMAINING TRIGGERS
-- =============================================================================

-- Recreate video progress trigger without enrollment updates
CREATE TRIGGER trigger_update_user_stats_on_video
  AFTER INSERT OR UPDATE OR DELETE ON video_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_learning_stats();

-- Create simple AI interaction tracking (no enrollment dependency)
CREATE OR REPLACE FUNCTION track_ai_interaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user learning stats when AI interaction occurs
  INSERT INTO user_learning_stats (
    user_id,
    last_activity_at,
    updated_at
  ) VALUES (
    NEW.user_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_activity_at = EXCLUDED.last_activity_at,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for AI interactions
CREATE TRIGGER trigger_track_ai_interactions
  AFTER INSERT ON ai_interactions
  FOR EACH ROW
  EXECUTE FUNCTION track_ai_interaction();

-- =============================================================================
-- CLEAN UP USER_LEARNING_STATS TABLE STRUCTURE
-- =============================================================================

-- Remove enrollment-related columns from user_learning_stats if they exist
DO $$
BEGIN
    -- Remove enrollment-specific columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_learning_stats'
        AND column_name = 'active_courses'
    ) THEN
        ALTER TABLE user_learning_stats DROP COLUMN active_courses;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_learning_stats'
        AND column_name = 'completed_courses'
    ) THEN
        ALTER TABLE user_learning_stats DROP COLUMN completed_courses;
    END IF;

    RAISE NOTICE 'Enrollment-related columns removed from user_learning_stats';
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    -- Verify enrollments table is gone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'enrollments'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✓ enrollments table successfully removed';
    ELSE
        RAISE WARNING '! enrollments table still exists';
    END IF;

    -- Verify triggers are updated
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'trigger_update_user_stats_on_video'
    ) THEN
        RAISE NOTICE '✓ Video progress tracking updated';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'trigger_track_ai_interactions'
    ) THEN
        RAISE NOTICE '✓ AI interaction tracking updated';
    END IF;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'ENROLLMENT FEATURE COMPLETELY REMOVED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Changes Made:';
    RAISE NOTICE '• Dropped enrollments table and all dependencies';
    RAISE NOTICE '• Updated video_transcripts RLS to community-based access';
    RAISE NOTICE '• Simplified user learning stats tracking';
    RAISE NOTICE '• Removed enrollment-based triggers and functions';
    RAISE NOTICE '• Updated AI interaction tracking';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'System Impact:';
    RAISE NOTICE '• Students now have community-based access to all published content';
    RAISE NOTICE '• Progress tracking continues via video_progress table';
    RAISE NOTICE '• User stats updated based on actual usage, not enrollments';
    RAISE NOTICE '• Course access controlled by course.status, not enrollment';
    RAISE NOTICE '=============================================================================';
END $$;
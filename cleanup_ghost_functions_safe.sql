-- Safe cleanup script for ghost functions and triggers
-- Handles missing tables gracefully

-- Drop all ghost functions first (functions don't care if tables exist)
DROP FUNCTION IF EXISTS get_videos_needing_transcription(UUID);
DROP FUNCTION IF EXISTS update_enrollment_progress();
DROP FUNCTION IF EXISTS update_current_lesson();
DROP FUNCTION IF EXISTS increment_ai_interaction_count();
DROP FUNCTION IF EXISTS track_ai_interaction();
DROP FUNCTION IF EXISTS update_user_learning_stats();

-- Drop ghost triggers only if tables exist
DO $$
BEGIN
    -- Check and drop triggers on video_progress if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_progress') THEN
        DROP TRIGGER IF EXISTS trigger_update_enrollment_progress ON video_progress;
        DROP TRIGGER IF EXISTS trigger_update_user_stats_on_video ON video_progress;
        DROP TRIGGER IF EXISTS trigger_update_current_lesson ON video_progress;
        RAISE NOTICE 'Dropped triggers on video_progress table';
    ELSE
        RAISE NOTICE 'video_progress table does not exist - skipping triggers';
    END IF;

    -- Check and drop triggers on enrollments if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments') THEN
        DROP TRIGGER IF EXISTS trigger_update_user_stats_on_enrollment ON enrollments;
        RAISE NOTICE 'Dropped triggers on enrollments table';
    ELSE
        RAISE NOTICE 'enrollments table does not exist - skipping triggers';
    END IF;

    -- Check and drop triggers on ai_interactions if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_interactions') THEN
        DROP TRIGGER IF EXISTS trigger_increment_ai_interactions ON ai_interactions;
        DROP TRIGGER IF EXISTS trigger_track_ai_interactions ON ai_interactions;
        RAISE NOTICE 'Dropped triggers on ai_interactions table';
    ELSE
        RAISE NOTICE 'ai_interactions table does not exist - skipping triggers';
    END IF;

    -- Check and drop triggers on videos if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'videos') THEN
        DROP TRIGGER IF EXISTS trigger_update_videos ON videos;
        RAISE NOTICE 'Dropped triggers on videos table';
    ELSE
        RAISE NOTICE 'videos table does not exist - skipping triggers';
    END IF;
END $$;

-- Drop ghost policies only if tables exist
DO $$
BEGIN
    -- Video transcripts policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_transcripts') THEN
        DROP POLICY IF EXISTS "students_read_enrolled_transcripts" ON video_transcripts;
        RAISE NOTICE 'Dropped policies on video_transcripts table';
    END IF;

    -- Other ghost policies
    DROP POLICY IF EXISTS "students_access_enrolled_videos" ON videos;
    DROP POLICY IF EXISTS "students_manage_enrollments" ON enrollments;
    DROP POLICY IF EXISTS "students_manage_ai_interactions" ON ai_interactions;

    RAISE NOTICE 'Ghost policy cleanup attempted (tables may not exist)';
END $$;

-- Final verification
DO $$
DECLARE
    ghost_functions INTEGER;
    remaining_triggers INTEGER;
BEGIN
    -- Count any remaining functions that reference ghost tables
    SELECT COUNT(*) INTO ghost_functions
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND (
        routine_definition ILIKE '%videos%' OR
        routine_definition ILIKE '%enrollments%' OR
        routine_definition ILIKE '%ai_interactions%' OR
        routine_definition ILIKE '%video_progress%'
    );

    -- Count any remaining triggers with ghost patterns
    SELECT COUNT(*) INTO remaining_triggers
    FROM information_schema.triggers
    WHERE (
        trigger_name LIKE '%enrollment%' OR
        trigger_name LIKE '%video%' OR
        trigger_name LIKE '%ai_interaction%'
    );

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'SAFE GHOST CLEANUP COMPLETE';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Results:';
    RAISE NOTICE '• Functions with ghost table references: %', ghost_functions;
    RAISE NOTICE '• Triggers with ghost patterns: %', remaining_triggers;
    RAISE NOTICE '';

    IF ghost_functions = 0 AND remaining_triggers = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All ghost functions and triggers removed';
    ELSE
        RAISE NOTICE '⚠️  Some references may remain - database is now safer but may need manual review';
    END IF;

    RAISE NOTICE '=============================================================================';
END $$;

SELECT 'Safe ghost functions cleanup complete!' as status;
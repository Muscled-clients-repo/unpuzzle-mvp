-- Migration: Remove Ghost Functions and Triggers
-- Date: 2025-09-29
-- Description: Clean up all functions/triggers that reference deleted tables (videos, enrollments, ai_interactions)
-- Risk Level: LOW - These functions are unused and reference non-existent tables

-- =============================================================================
-- DROP TRIGGERS THAT REFERENCE DELETED TABLES
-- =============================================================================

-- Enrollment-related triggers (reference deleted enrollments table)
DROP TRIGGER IF EXISTS trigger_update_enrollment_progress ON video_progress;
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_enrollment ON enrollments;

-- Video-related triggers (reference deleted videos table)
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_video ON video_progress;
DROP TRIGGER IF EXISTS trigger_update_current_lesson ON video_progress;

-- AI interaction triggers (reference deleted ai_interactions table)
DROP TRIGGER IF EXISTS trigger_increment_ai_interactions ON ai_interactions;
DROP TRIGGER IF EXISTS trigger_increment_ai_interactions ON ai_interactions_temp;
DROP TRIGGER IF EXISTS trigger_track_ai_interactions ON ai_interactions;

-- =============================================================================
-- DROP FUNCTIONS THAT REFERENCE DELETED TABLES
-- =============================================================================

-- Functions that reference deleted videos table
DROP FUNCTION IF EXISTS get_videos_needing_transcription(UUID);

-- Functions that reference deleted enrollments table
DROP FUNCTION IF EXISTS update_enrollment_progress();
DROP FUNCTION IF EXISTS update_current_lesson();

-- Functions that reference deleted ai_interactions table
DROP FUNCTION IF EXISTS increment_ai_interaction_count();
DROP FUNCTION IF EXISTS track_ai_interaction();

-- Functions that reference deleted user_learning_stats columns
DROP FUNCTION IF EXISTS update_user_learning_stats();

-- =============================================================================
-- DROP UTILITY FUNCTIONS (if no longer needed)
-- =============================================================================

-- Time formatting function (keep if used elsewhere, remove if not)
-- DROP FUNCTION IF EXISTS format_time_ago(TIMESTAMPTZ);

-- =============================================================================
-- CLEAN UP ANY REMAINING GHOST POLICIES
-- =============================================================================

-- Video-related policies (reference deleted videos table)
DROP POLICY IF EXISTS "students_read_enrolled_transcripts" ON video_transcripts;
DROP POLICY IF EXISTS "students_access_enrolled_videos" ON videos;
DROP POLICY IF EXISTS "instructors_manage_videos" ON videos;

-- Enrollment-related policies
DROP POLICY IF EXISTS "students_manage_enrollments" ON enrollments;
DROP POLICY IF EXISTS "instructors_view_enrollments" ON enrollments;

-- AI interaction policies
DROP POLICY IF EXISTS "students_manage_ai_interactions" ON ai_interactions;
DROP POLICY IF EXISTS "instructors_view_ai_interactions" ON ai_interactions;

-- =============================================================================
-- VERIFICATION AND CLEANUP REPORT
-- =============================================================================

DO $$
DECLARE
    function_count INTEGER;
    trigger_count INTEGER;
BEGIN
    -- Count remaining functions that might reference ghost tables
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND (
        routine_definition ILIKE '%videos%' OR
        routine_definition ILIKE '%enrollments%' OR
        routine_definition ILIKE '%ai_interactions%'
    );

    -- Count remaining triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name LIKE 'trigger_%enrollment%'
    OR trigger_name LIKE 'trigger_%video%'
    OR trigger_name LIKE 'trigger_%ai%';

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'GHOST FUNCTION CLEANUP COMPLETE';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Removed Functions:';
    RAISE NOTICE '• get_videos_needing_transcription() - referenced deleted videos table';
    RAISE NOTICE '• update_enrollment_progress() - referenced deleted enrollments table';
    RAISE NOTICE '• update_current_lesson() - referenced deleted videos/enrollments tables';
    RAISE NOTICE '• increment_ai_interaction_count() - referenced deleted ai_interactions table';
    RAISE NOTICE '• track_ai_interaction() - referenced deleted ai_interactions table';
    RAISE NOTICE '• update_user_learning_stats() - referenced deleted enrollments table';
    RAISE NOTICE '';
    RAISE NOTICE 'Removed Triggers:';
    RAISE NOTICE '• trigger_update_enrollment_progress - referenced deleted tables';
    RAISE NOTICE '• trigger_update_user_stats_on_enrollment - referenced deleted tables';
    RAISE NOTICE '• trigger_update_user_stats_on_video - referenced deleted tables';
    RAISE NOTICE '• trigger_update_current_lesson - referenced deleted tables';
    RAISE NOTICE '• trigger_increment_ai_interactions - referenced deleted tables';
    RAISE NOTICE '';
    RAISE NOTICE 'Removed Policies:';
    RAISE NOTICE '• All RLS policies referencing deleted videos/enrollments/ai_interactions tables';
    RAISE NOTICE '';
    RAISE NOTICE 'Database Status:';
    RAISE NOTICE '• Functions possibly referencing ghost tables: %', function_count;
    RAISE NOTICE '• Ghost triggers remaining: %', trigger_count;
    RAISE NOTICE '';
    IF function_count = 0 AND trigger_count = 0 THEN
        RAISE NOTICE '✅ DATABASE CLEANUP SUCCESSFUL - No ghost references detected';
    ELSE
        RAISE NOTICE '⚠️  Manual review recommended - Some references may remain';
    END IF;
    RAISE NOTICE '=============================================================================';
END $$;
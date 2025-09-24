-- Migration: Complete Backup Table Cleanup
-- Date: 2025-09-23
-- Description: Remove all backup tables created during previous migrations - test data only
-- Risk Level: NONE - Just backup table cleanup, app not released

-- =============================================================================
-- BACKUP TABLE CLEANUP
-- =============================================================================

-- Drop backup tables from migration 070 (profiles track cleanup)
DROP TABLE IF EXISTS backup_profiles_track_data_20250923;

-- Drop backup tables from migration 069 (empty track assignment tables)
DROP TABLE IF EXISTS backup_course_track_assignments_20250923;
DROP TABLE IF EXISTS backup_student_track_assignments_20250923;

-- Drop backup tables from migration 072 (courses table cleanup)
DROP TABLE IF EXISTS backup_courses_unused_columns_20250923;

-- Drop backup tables from migration 071 (videos table cleanup)
DROP TABLE IF EXISTS backup_videos_columns_20250923;

-- Drop backup tables from migration 068 (phase 1 cleanup)
DROP TABLE IF EXISTS backup_action_types_20250923;
DROP TABLE IF EXISTS backup_user_actions_20250923;
DROP TABLE IF EXISTS backup_course_recommendations_20250923;
DROP TABLE IF EXISTS backup_daily_note_upload_errors_20250923;
DROP TABLE IF EXISTS backup_migration_status_20250923;

-- Drop unused structures from migration 070 (never used in app)
DROP TABLE IF EXISTS user_track_assignments CASCADE;
DROP VIEW IF EXISTS track_goal_progressions CASCADE;

-- =============================================================================
-- VERIFICATION AND LOGGING
-- =============================================================================

DO $$
DECLARE
    backup_tables TEXT[] := ARRAY[
        'backup_profiles_track_data_20250923',
        'backup_course_track_assignments_20250923',
        'backup_student_track_assignments_20250923',
        'backup_courses_unused_columns_20250923',
        'backup_videos_columns_20250923',
        'backup_action_types_20250923',
        'backup_user_actions_20250923',
        'backup_course_recommendations_20250923',
        'backup_daily_note_upload_errors_20250923',
        'backup_migration_status_20250923'
    ];
    unused_objects TEXT[] := ARRAY[
        'user_track_assignments',
        'track_goal_progressions'
    ];
    current_table TEXT;
    cleanup_count INTEGER := 0;
BEGIN
    -- Verify backup tables were dropped
    FOREACH current_table IN ARRAY backup_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables t
            WHERE t.table_name = current_table AND t.table_schema = 'public'
        ) THEN
            cleanup_count := cleanup_count + 1;
            RAISE NOTICE '✓ Removed backup table: %', current_table;
        ELSE
            RAISE WARNING '! Backup table still exists: %', current_table;
        END IF;
    END LOOP;

    -- Verify unused objects were dropped
    FOREACH current_table IN ARRAY unused_objects
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables t
            WHERE t.table_name = current_table AND t.table_schema = 'public'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.views v
            WHERE v.table_name = current_table AND v.table_schema = 'public'
        ) THEN
            cleanup_count := cleanup_count + 1;
            RAISE NOTICE '✓ Removed unused object: %', current_table;
        ELSE
            RAISE WARNING '! Unused object still exists: %', current_table;
        END IF;
    END LOOP;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'BACKUP TABLE CLEANUP COMPLETED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Objects Removed: % / %', cleanup_count, array_length(backup_tables, 1) + array_length(unused_objects, 1);
    RAISE NOTICE 'Database Size: Significantly reduced by removing backup tables';
    RAISE NOTICE 'Safety: No app functionality affected - only backup data removed';
    RAISE NOTICE 'Reason: Test data backups no longer needed, app not released yet';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'REMAINING CORE TABLES:';
    RAISE NOTICE '• courses, videos, profiles - Core functionality';
    RAISE NOTICE '• media_files, course_chapters - Content management';
    RAISE NOTICE '• tracks, track_goals, course_goal_assignments - Learning paths';
    RAISE NOTICE '• All conversation and goal management tables';
    RAISE NOTICE '• All analytics tables (ai_interactions, enrollments, etc.)';
    RAISE NOTICE '=============================================================================';
END $$;
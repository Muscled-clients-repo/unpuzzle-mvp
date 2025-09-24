-- Migration: Cleanup Unused Tables and Views
-- Date: 2025-09-23
-- Description: Remove unused backup tables and track assignment structures - test data only
-- Risk Level: NONE - Just test data cleanup

-- Drop backup tables from previous migrations
DROP TABLE IF EXISTS backup_profiles_track_data_20250923;
DROP TABLE IF EXISTS backup_course_track_assignments_20250923;
DROP TABLE IF EXISTS backup_student_track_assignments_20250923;
DROP TABLE IF EXISTS backup_courses_unused_columns_20250923;
DROP TABLE IF EXISTS backup_videos_columns_20250923;

-- Drop backup tables from migration 068 (dated tables)
DROP TABLE IF EXISTS backup_action_types_20250923;
DROP TABLE IF EXISTS backup_user_actions_20250923;
DROP TABLE IF EXISTS backup_course_recommendations_20250923;
DROP TABLE IF EXISTS backup_daily_note_upload_errors_20250923;
DROP TABLE IF EXISTS backup_migration_status_20250923;

-- Drop unused track views/tables (if they exist)
DROP VIEW IF EXISTS track_goal_progressions CASCADE;
DROP TABLE IF EXISTS user_track_assignments CASCADE;

-- Log the cleanup
DO $$
BEGIN
    RAISE NOTICE '✓ Database cleanup completed - removed backup tables:';
    RAISE NOTICE '  - backup_profiles_track_data_20250923 (migration 070 backup)';
    RAISE NOTICE '  - backup_course_track_assignments_20250923 (migration 069 backup)';
    RAISE NOTICE '  - backup_student_track_assignments_20250923 (migration 069 backup)';
    RAISE NOTICE '  - backup_courses_unused_columns_20250923 (migration 072 backup)';
    RAISE NOTICE '  - backup_videos_columns_20250923 (migration 071 backup)';
    RAISE NOTICE '  - backup_action_types_20250923 (migration 068 backup)';
    RAISE NOTICE '  - backup_user_actions_20250923 (migration 068 backup)';
    RAISE NOTICE '  - backup_course_recommendations_20250923 (migration 068 backup)';
    RAISE NOTICE '  - backup_daily_note_upload_errors_20250923 (migration 068 backup)';
    RAISE NOTICE '  - backup_migration_status_20250923 (migration 068 backup)';
    RAISE NOTICE '  - user_track_assignments (unused table from migration 070)';
    RAISE NOTICE '  - track_goal_progressions (unused view)';
    RAISE NOTICE '✓ Reason: Test data backups no longer needed, app not released';
END $$;
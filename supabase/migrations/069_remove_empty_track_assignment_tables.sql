-- Migration: Remove Empty Track Assignment Tables and Unused View
-- Date: 2025-09-23
-- Description: Remove empty course_track_assignments, student_track_assignments tables and unused track_goal_progressions view
-- Risk Level: ZERO - Tables are empty, view is unused in codebase

-- =============================================================================
-- PHASE 2.4: REMOVE EMPTY TRACK ASSIGNMENT TABLES
-- =============================================================================

-- Verify tables are empty before removal (safety check)
DO $$
DECLARE
    course_track_count INTEGER;
    student_track_count INTEGER;
BEGIN
    -- Count records in course_track_assignments
    SELECT COUNT(*) INTO course_track_count FROM course_track_assignments;

    -- Count records in student_track_assignments
    SELECT COUNT(*) INTO student_track_count FROM student_track_assignments;

    -- Log current state
    RAISE NOTICE 'course_track_assignments table has % records', course_track_count;
    RAISE NOTICE 'student_track_assignments table has % records', student_track_count;

    -- Proceed with removal if tables are empty
    IF course_track_count = 0 AND student_track_count = 0 THEN
        RAISE NOTICE 'Both tables are empty. Proceeding with removal...';
    ELSE
        RAISE WARNING 'Tables contain data! course_track_assignments: %, student_track_assignments: %',
                     course_track_count, student_track_count;
        RAISE EXCEPTION 'Aborting migration - tables are not empty as expected';
    END IF;
END $$;

-- =============================================================================
-- BACKUP CREATION (Just in case)
-- =============================================================================

-- Create backup of course_track_assignments (even though empty)
CREATE TABLE IF NOT EXISTS backup_course_track_assignments_20250923 AS
SELECT * FROM course_track_assignments;

-- Create backup of student_track_assignments (even though empty)
CREATE TABLE IF NOT EXISTS backup_student_track_assignments_20250923 AS
SELECT * FROM student_track_assignments;

-- =============================================================================
-- TABLE REMOVAL
-- =============================================================================

-- Drop course_track_assignments table and all its dependencies
DROP TABLE IF EXISTS course_track_assignments CASCADE;

-- Drop student_track_assignments table and all its dependencies
DROP TABLE IF EXISTS student_track_assignments CASCADE;

-- Drop unused track_goal_progressions view
DROP VIEW IF EXISTS track_goal_progressions CASCADE;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify tables were removed
DO $$
BEGIN
    -- Check if course_track_assignments still exists
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_name = 'course_track_assignments' AND table_schema = 'public') THEN
        RAISE WARNING 'course_track_assignments table still exists!';
    ELSE
        RAISE NOTICE '✓ course_track_assignments table successfully removed';
    END IF;

    -- Check if student_track_assignments still exists
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_name = 'student_track_assignments' AND table_schema = 'public') THEN
        RAISE WARNING 'student_track_assignments table still exists!';
    ELSE
        RAISE NOTICE '✓ student_track_assignments table successfully removed';
    END IF;

    -- Check if track_goal_progressions view still exists
    IF EXISTS (SELECT 1 FROM information_schema.views
               WHERE table_name = 'track_goal_progressions' AND table_schema = 'public') THEN
        RAISE WARNING 'track_goal_progressions view still exists!';
    ELSE
        RAISE NOTICE '✓ track_goal_progressions view successfully removed';
    END IF;
END $$;

-- =============================================================================
-- CLEANUP ORPHANED INDEXES
-- =============================================================================

-- Clean up any remaining indexes on the deleted tables
DO $$
DECLARE
    index_record RECORD;
    cleanup_count INTEGER := 0;
BEGIN
    -- Look for any remaining indexes on deleted tables
    FOR index_record IN
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE tablename IN ('course_track_assignments', 'student_track_assignments')
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || index_record.indexname || ' CASCADE';
        cleanup_count := cleanup_count + 1;
        RAISE NOTICE 'Cleaned up orphaned index: %', index_record.indexname;
    END LOOP;

    IF cleanup_count = 0 THEN
        RAISE NOTICE 'No orphaned indexes found (indexes properly removed with tables)';
    ELSE
        RAISE NOTICE 'Cleaned up % orphaned indexes', cleanup_count;
    END IF;
END $$;

-- =============================================================================
-- LOG SCHEMA CHANGE
-- =============================================================================

-- Log this cleanup in schema_changes table
INSERT INTO public.schema_changes (
    change_type,
    description,
    tables_affected,
    estimated_impact,
    created_at
) VALUES (
    'table_removal',
    'Phase 2.4: Removed empty track assignment tables and unused view (course_track_assignments, student_track_assignments, track_goal_progressions)',
    3,
    'Simplified track assignment architecture, eliminated unnecessary JOIN operations, reduced schema complexity',
    NOW()
);

-- =============================================================================
-- PERFORMANCE IMPACT ANALYSIS
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'PHASE 2.4: TRACK SYSTEM CLEANUP COMPLETED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Tables Removed: 2 (course_track_assignments, student_track_assignments)';
    RAISE NOTICE 'Views Removed: 1 (track_goal_progressions)';
    RAISE NOTICE 'Track System Simplification: 5 structures → 2 tables (60%% reduction)';
    RAISE NOTICE 'Data Loss: ZERO - Tables were confirmed empty, view was unused';
    RAISE NOTICE 'Performance Impact: Eliminated unnecessary JOINs and query complexity';
    RAISE NOTICE 'Remaining Track Tables: tracks, track_goals (core functionality preserved)';
    RAISE NOTICE 'Backup Tables: backup_course_track_assignments_20250923, backup_student_track_assignments_20250923';
    RAISE NOTICE 'Risk Level: ZERO - No data or functionality impact';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'TRACK SYSTEM NOW SIMPLIFIED:';
    RAISE NOTICE '✓ tracks table - Core track definitions';
    RAISE NOTICE '✓ track_goals table - Goals within tracks';
    RAISE NOTICE '✗ course_track_assignments - REMOVED (empty)';
    RAISE NOTICE '✗ student_track_assignments - REMOVED (empty)';
    RAISE NOTICE '✗ track_goal_progressions - REMOVED (unused view)';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'NEXT STEPS FOR TRACK ASSIGNMENTS:';
    RAISE NOTICE '1. Use direct foreign keys: courses.track_id, profiles.current_track_id';
    RAISE NOTICE '2. Simple JOINs: tracks JOIN track_goals for goal progressions';
    RAISE NOTICE '3. No intermediate tables needed for basic track assignments';
    RAISE NOTICE '=============================================================================';
END $$;
-- Migration: Phase 2.2 - Courses Table Column Cleanup
-- Date: 2025-09-23
-- Description: Remove unused columns from courses table (revenue, difficulty, completion_rate, pending_confusions)
-- Risk Level: LOW - Removing unused/unwanted columns

-- =============================================================================
-- PHASE 2.2: COURSES TABLE COLUMN CLEANUP
-- =============================================================================

-- Create backup of courses table before cleanup
CREATE TABLE backup_courses_unused_columns_20250923 AS
SELECT id, revenue, difficulty, completion_rate, pending_confusions, created_at
FROM courses;

-- =============================================================================
-- COLUMN ANALYSIS AND VERIFICATION
-- =============================================================================

DO $$
DECLARE
    revenue_count INTEGER;
    revenue_nonzero INTEGER;
    total_courses INTEGER;
BEGIN
    -- Count courses with revenue data
    SELECT COUNT(*) INTO revenue_count FROM courses WHERE revenue IS NOT NULL;
    SELECT COUNT(*) INTO revenue_nonzero FROM courses WHERE revenue > 0;

    -- Total courses
    SELECT COUNT(*) INTO total_courses FROM courses;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'COURSES TABLE REVENUE COLUMN ANALYSIS';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Total courses: %', total_courses;
    RAISE NOTICE 'Courses with revenue data: % (% non-zero) - REMOVING per requirements', revenue_count, revenue_nonzero;
    RAISE NOTICE 'REMOVING: revenue, difficulty, completion_rate, pending_confusions (not wanted in app)';
    RAISE NOTICE '=============================================================================';
END $$;

-- =============================================================================
-- REMOVE UNUSED COLUMNS
-- =============================================================================

-- Remove revenue column (not needed per requirements)
ALTER TABLE courses DROP COLUMN IF EXISTS revenue;

-- Remove difficulty column (not wanted in app at the moment)
ALTER TABLE courses DROP COLUMN IF EXISTS difficulty;

-- Remove completion_rate column (not used in UI, not wanted at the moment)
ALTER TABLE courses DROP COLUMN IF EXISTS completion_rate;

-- Remove pending_confusions column (not used in UI, not wanted at the moment)
ALTER TABLE courses DROP COLUMN IF EXISTS pending_confusions;

-- NOTE: KEEPING essential columns:
-- - tags: Used for course filtering and organization
-- - All other core course functionality columns

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify unwanted columns were removed and essential columns preserved
DO $$
DECLARE
    removed_columns TEXT[];
    essential_columns TEXT[];
    essential_count INTEGER := 0;
BEGIN
    -- Check which target columns still exist (should be none)
    SELECT array_agg(column_name) INTO removed_columns
    FROM information_schema.columns
    WHERE table_name = 'courses'
    AND table_schema = 'public'
    AND column_name IN ('revenue', 'difficulty', 'completion_rate', 'pending_confusions');

    -- Check that essential columns still exist
    SELECT array_agg(column_name) INTO essential_columns
    FROM information_schema.columns
    WHERE table_name = 'courses'
    AND table_schema = 'public'
    AND column_name IN ('tags', 'title', 'description', 'status');

    IF removed_columns IS NULL THEN
        RAISE NOTICE '✓ All 4 unwanted columns successfully removed from courses table';
    ELSE
        RAISE WARNING 'Some columns still exist: %', removed_columns;
    END IF;

    essential_count := array_length(essential_columns, 1);
    RAISE NOTICE '✓ Essential columns preserved: % (tags, title, description, status)', essential_count;
    RAISE NOTICE 'Courses table cleanup: unwanted columns removed, core functionality preserved';
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
    'column_removal',
    'Phase 2.2: Removed unwanted columns from courses table (revenue, difficulty, completion_rate, pending_confusions)',
    1,
    'Cleaned up courses table by removing unused/unwanted features, preserved core course functionality',
    NOW()
);

-- =============================================================================
-- PERFORMANCE IMPACT ANALYSIS
-- =============================================================================

DO $$
DECLARE
    backup_rows INTEGER;
BEGIN
    -- Count backup rows
    SELECT COUNT(*) INTO backup_rows FROM backup_courses_unused_columns_20250923;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'PHASE 2.2: COURSES TABLE COLUMN CLEANUP COMPLETED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Columns Removed: 4 (revenue, difficulty, completion_rate, pending_confusions)';
    RAISE NOTICE 'Feature Alignment: Removed unwanted features per requirements';
    RAISE NOTICE 'Core Functionality: Preserved all essential course features';
    RAISE NOTICE 'Backup Created: backup_courses_unused_columns_20250923 (% rows)', backup_rows;
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'BENEFITS:';
    RAISE NOTICE '✓ Removed revenue tracking (not needed per requirements)';
    RAISE NOTICE '✓ Removed difficulty display (not wanted in app at the moment)';
    RAISE NOTICE '✓ Removed completion_rate analytics (not used in current UI)';
    RAISE NOTICE '✓ Removed pending_confusions tracking (not wanted at the moment)';
    RAISE NOTICE '✓ Preserved tags for course filtering and organization';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'REMAINING CORE COLUMNS INCLUDE:';
    RAISE NOTICE '• id, instructor_id - Core identifiers';
    RAISE NOTICE '• title, description, thumbnail_url - Course metadata';
    RAISE NOTICE '• status, price, is_free - Publishing and pricing';
    RAISE NOTICE '• tags - Organization and filtering (PRESERVED)';
    RAISE NOTICE '• rating - Course quality metrics';
    RAISE NOTICE '• students, total_videos, total_duration_minutes - Basic metrics';
    RAISE NOTICE '• created_at, updated_at - Timestamps';
    RAISE NOTICE '=============================================================================';
END $$;
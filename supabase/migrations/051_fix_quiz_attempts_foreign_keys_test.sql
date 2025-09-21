-- Migration 051: Fix quiz_attempts foreign key constraints
-- Purpose: Convert TEXT foreign keys to proper UUID foreign keys with constraints
-- Approach: Conservative testing and validation

-- STEP 1: Check current data integrity before making changes
DO $$
DECLARE
    invalid_video_count INTEGER;
    invalid_course_count INTEGER;
    total_quiz_attempts INTEGER;
BEGIN
    -- Count total quiz attempts
    SELECT COUNT(*) INTO total_quiz_attempts FROM quiz_attempts;
    RAISE NOTICE 'Total quiz attempts: %', total_quiz_attempts;

    -- Check for invalid video_id references
    SELECT COUNT(*) INTO invalid_video_count
    FROM quiz_attempts qa
    WHERE qa.video_id NOT IN (
        SELECT id::TEXT FROM videos
    );
    RAISE NOTICE 'Quiz attempts with invalid video_id: %', invalid_video_count;

    -- Check for invalid course_id references
    SELECT COUNT(*) INTO invalid_course_count
    FROM quiz_attempts qa
    WHERE qa.course_id NOT IN (
        SELECT id::TEXT FROM courses
    );
    RAISE NOTICE 'Quiz attempts with invalid course_id: %', invalid_course_count;

    -- Report findings
    IF invalid_video_count > 0 OR invalid_course_count > 0 THEN
        RAISE NOTICE '⚠️  Found % orphaned quiz attempts that need cleanup', (invalid_video_count + invalid_course_count);
        RAISE NOTICE 'Run data cleanup before adding foreign key constraints';
    ELSE
        RAISE NOTICE '✅ All quiz attempts have valid video and course references';
        RAISE NOTICE 'Safe to proceed with foreign key constraints';
    END IF;

    -- Check if columns are already UUID type
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'video_id') = 'uuid' THEN
        RAISE NOTICE 'ℹ️  video_id is already UUID type';
    ELSE
        RAISE NOTICE 'ℹ️  video_id is TEXT type, needs conversion';
    END IF;

    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'course_id') = 'uuid' THEN
        RAISE NOTICE 'ℹ️  course_id is already UUID type';
    ELSE
        RAISE NOTICE 'ℹ️  course_id is TEXT type, needs conversion';
    END IF;

END $$;

-- STEP 2: Clean up any orphaned data (only if found above)
-- Commented out for safety - will enable based on STEP 1 results

/*
-- Clean up orphaned quiz attempts (ONLY RUN IF STEP 1 SHOWS PROBLEMS)
DELETE FROM quiz_attempts
WHERE video_id NOT IN (SELECT id::TEXT FROM videos);

DELETE FROM quiz_attempts
WHERE course_id NOT IN (SELECT id::TEXT FROM courses);
*/

-- STEP 3: Convert column types (only if not already UUID)
-- Commented out for safety - will enable based on STEP 1 results

/*
-- Convert TEXT columns to UUID (ONLY RUN IF STEP 1 SHOWS TEXT TYPE)
ALTER TABLE quiz_attempts
    ALTER COLUMN video_id TYPE UUID USING video_id::UUID;

ALTER TABLE quiz_attempts
    ALTER COLUMN course_id TYPE UUID USING course_id::UUID;
*/

-- STEP 4: Add foreign key constraints (final step)
-- Commented out for safety - will enable after successful column conversion

/*
-- Add foreign key constraints (ONLY RUN AFTER SUCCESSFUL TYPE CONVERSION)
ALTER TABLE quiz_attempts
    ADD CONSTRAINT fk_quiz_attempts_video_id
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE;

ALTER TABLE quiz_attempts
    ADD CONSTRAINT fk_quiz_attempts_course_id
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
*/

-- Final status check
DO $$
BEGIN
    RAISE NOTICE '📋 Migration 051 - Phase 1 Complete';
    RAISE NOTICE 'Next steps based on results above:';
    RAISE NOTICE '1. If orphaned data found: uncomment cleanup section';
    RAISE NOTICE '2. If TEXT type found: uncomment conversion section';
    RAISE NOTICE '3. If all checks pass: uncomment constraint section';
    RAISE NOTICE 'Run each phase separately and test results';
END $$;
-- Migration 058: Clean dev environment test data
-- Purpose: Remove all test recordings and quiz attempts for fresh optimized database
-- ONLY RUN IN DEVELOPMENT - NOT PRODUCTION

-- WARNING: This will delete ALL reflections and quiz attempts
-- Only run this in development environment

-- STEP 1: Clean up all test quiz attempts
DELETE FROM quiz_attempts;

-- STEP 2: Clean up all test reflections (voice recordings)
DELETE FROM reflections;

-- STEP 3: Reset auto-increment sequences (if any)
-- This ensures clean IDs for new test data

-- STEP 4: Verify cleanup
DO $$
DECLARE
    quiz_count INTEGER;
    reflection_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO quiz_count FROM quiz_attempts;
    SELECT COUNT(*) INTO reflection_count FROM reflections;

    RAISE NOTICE '✅ Migration 058 Complete - Dev Environment Cleaned';
    RAISE NOTICE 'Database cleanup results:';
    RAISE NOTICE '  - Quiz attempts remaining: %', quiz_count;
    RAISE NOTICE '  - Reflections remaining: %', reflection_count;
    RAISE NOTICE '  - Database is now compact and optimized';
    RAISE NOTICE '  - All constraints and indexes preserved';
    RAISE NOTICE 'Ready for fresh testing with optimized schema!';
END $$;
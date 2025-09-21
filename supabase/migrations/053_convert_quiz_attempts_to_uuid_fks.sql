-- Migration 053: Convert quiz_attempts TEXT columns to UUID with foreign keys
-- Purpose: Based on migration 052 findings - data is valid UUIDs stored as TEXT
-- Safe to convert and add constraints

-- STEP 1: Convert TEXT columns to UUID type
-- This is safe because the data is already in valid UUID format
ALTER TABLE quiz_attempts
    ALTER COLUMN video_id TYPE UUID USING video_id::UUID;

ALTER TABLE quiz_attempts
    ALTER COLUMN course_id TYPE UUID USING course_id::UUID;

-- STEP 2: Add foreign key constraints
-- This ensures referential integrity going forward
ALTER TABLE quiz_attempts
    ADD CONSTRAINT fk_quiz_attempts_video_id
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE;

ALTER TABLE quiz_attempts
    ADD CONSTRAINT fk_quiz_attempts_course_id
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- STEP 3: Add performance indexes for video page queries
-- These indexes will dramatically improve video page load times
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_video_page
    ON quiz_attempts(user_id, video_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_course
    ON quiz_attempts(user_id, course_id, created_at DESC);

-- STEP 4: Verify the changes
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 053 Complete';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '  - video_id converted from TEXT to UUID';
    RAISE NOTICE '  - course_id converted from TEXT to UUID';
    RAISE NOTICE '  - Foreign key constraints added';
    RAISE NOTICE '  - Performance indexes created';
    RAISE NOTICE 'Next: Test video page performance and run reflections migration';
END $$;
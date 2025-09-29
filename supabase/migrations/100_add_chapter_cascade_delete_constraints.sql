-- Add foreign key constraint with CASCADE DELETE for junction table
-- Industry Standard: When a chapter is deleted, all media links should be automatically removed
-- This follows the same pattern as YouTube, Coursera, Udemy for content management

-- 1. Add foreign key constraint from course_chapter_media to course_chapters with CASCADE DELETE
-- Check if constraint already exists first
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_course_chapter_media_chapter_id'
        AND table_name = 'course_chapter_media'
    ) THEN
        ALTER TABLE course_chapter_media
        ADD CONSTRAINT fk_course_chapter_media_chapter_id
        FOREIGN KEY (chapter_id) REFERENCES course_chapters(id) ON DELETE CASCADE;

        RAISE NOTICE 'Added CASCADE DELETE constraint: course_chapter_media.chapter_id -> course_chapters.id';
    ELSE
        RAISE NOTICE 'CASCADE DELETE constraint already exists: fk_course_chapter_media_chapter_id';
    END IF;
END $$;

-- 2. Create index for the foreign key to improve performance
CREATE INDEX IF NOT EXISTS idx_course_chapter_media_chapter_fk
ON course_chapter_media(chapter_id);

-- 3. Add comment explaining the cascade behavior
COMMENT ON CONSTRAINT fk_course_chapter_media_chapter_id ON course_chapter_media
IS 'Ensures that when a chapter is deleted, all associated media links are automatically removed. Industry standard cascade deletion pattern.';

-- 4. Verify the constraint works by checking the foreign key relationships
-- This will help debug any issues during testing
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    -- Check if the constraint exists and log its properties
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_name = 'fk_course_chapter_media_chapter_id'
        AND tc.table_name = 'course_chapter_media'
        AND rc.delete_rule = 'CASCADE'
    ) INTO constraint_exists;

    IF constraint_exists THEN
        RAISE NOTICE 'CASCADE DELETE constraint verified: course_chapter_media.chapter_id -> course_chapters.id';
        RAISE NOTICE 'When a chapter is deleted from course_chapters, all related records in course_chapter_media will be automatically deleted';
    ELSE
        RAISE WARNING 'CASCADE DELETE constraint not properly configured!';
    END IF;
END $$;
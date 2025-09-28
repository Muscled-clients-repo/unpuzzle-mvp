-- Migration: Fix Junction Table Foreign Key Constraint
-- Date: 2025-09-28
-- Purpose: Add missing FK constraint between course_chapter_media and course_chapters
-- Industry Standard: Proper referential integrity like YouTube/Coursera

-- Add the missing foreign key constraint
-- This enables PostgREST automatic joins and maintains referential integrity
ALTER TABLE course_chapter_media
ADD CONSTRAINT fk_course_chapter_media_chapter_id
FOREIGN KEY (chapter_id) REFERENCES course_chapters(id)
ON DELETE CASCADE;

-- Verify the constraint was added
COMMENT ON CONSTRAINT fk_course_chapter_media_chapter_id ON course_chapter_media
IS 'Foreign key constraint enabling automatic PostgREST joins and cascade deletes. Follows industry standard junction table patterns.';

-- This enables:
-- 1. Automatic PostgREST joins: SELECT *, course_chapter_media(*) FROM course_chapters
-- 2. Cascade deletes: Delete chapter → automatically delete all associated media links
-- 3. Referential integrity: Cannot link media to non-existent chapters
-- 4. Schema cache recognition: PostgREST will detect this relationship automatically
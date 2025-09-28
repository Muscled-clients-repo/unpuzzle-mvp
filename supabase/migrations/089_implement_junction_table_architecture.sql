-- Migration: Implement Junction Table Architecture
-- Date: 2025-09-27
-- Purpose: Replace videos table with course_chapter_media junction table
-- Industry Standard: Based on YouTube, Coursera, Udemy patterns

-- Create course_chapter_media junction table
CREATE TABLE course_chapter_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id TEXT NOT NULL, -- References course_chapters.id (text format)
  media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  order_in_chapter INTEGER NOT NULL,
  title TEXT, -- Custom title per chapter (can override media_files.name)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints for data integrity
  UNIQUE(chapter_id, media_file_id), -- Prevent duplicate media in same chapter
  UNIQUE(chapter_id, order_in_chapter) -- Prevent order conflicts in chapter
);

-- Create indexes for optimal performance
CREATE INDEX idx_course_chapter_media_chapter_id ON course_chapter_media(chapter_id);
CREATE INDEX idx_course_chapter_media_media_file_id ON course_chapter_media(media_file_id);
CREATE INDEX idx_course_chapter_media_order ON course_chapter_media(chapter_id, order_in_chapter);

-- Drop videos table entirely (clean slate approach)
-- This follows industry best practice of single source of truth
DROP TABLE IF EXISTS videos CASCADE;

-- Update media_usage table to work with junction table if needed
-- Note: media_usage.resource_id will now reference course_chapter_media.id for chapter resources
COMMENT ON TABLE course_chapter_media IS 'Junction table linking media files to course chapters. Follows industry standard many-to-many relationship pattern used by YouTube, Coursera, and Udemy.';
COMMENT ON COLUMN course_chapter_media.title IS 'Custom title for this media in this specific chapter context. Allows same media file to have different titles in different chapters.';
COMMENT ON COLUMN course_chapter_media.order_in_chapter IS 'Position of media within the chapter. Must be unique per chapter to maintain consistent ordering.';
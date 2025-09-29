-- Migration: Add transcript_segments column for segmented transcript support
-- Date: 2025-09-28
-- Purpose: Enable time-stamped transcript segments for video selection and AI context

-- Add transcript_segments column to course_chapter_media table
ALTER TABLE course_chapter_media
ADD COLUMN IF NOT EXISTS transcript_segments JSONB;

-- Add comment explaining the structure
COMMENT ON COLUMN course_chapter_media.transcript_segments IS 'Time-stamped transcript segments in format: [{"start": 10.5, "end": 15.2, "text": "..."}]';

-- Create index for efficient JSON queries on transcript segments
CREATE INDEX IF NOT EXISTS idx_course_chapter_media_transcript_segments
ON course_chapter_media USING GIN (transcript_segments);

-- Add constraint to ensure it's an array when not null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_transcript_segments_is_array'
    AND table_name = 'course_chapter_media'
  ) THEN
    ALTER TABLE course_chapter_media
    ADD CONSTRAINT check_transcript_segments_is_array
    CHECK (transcript_segments IS NULL OR jsonb_typeof(transcript_segments) = 'array');
  END IF;
END $$;
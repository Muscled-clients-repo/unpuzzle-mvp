-- Add transcript functionality to course_chapter_media table
-- This enables transcript storage and management in the junction table architecture

-- 1. Add transcript columns to course_chapter_media
ALTER TABLE course_chapter_media
ADD COLUMN transcript_file_path TEXT,
ADD COLUMN transcript_text TEXT,
ADD COLUMN transcript_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN transcript_uploaded_at TIMESTAMP WITH TIME ZONE;

-- 2. Add index for transcript status queries (for performance)
CREATE INDEX idx_course_chapter_media_transcript_status
ON course_chapter_media(transcript_status);

-- 3. Add index for transcript searches (for performance)
CREATE INDEX idx_course_chapter_media_transcript_text
ON course_chapter_media USING gin(to_tsvector('english', transcript_text));

-- 4. Add constraint for valid transcript status values
ALTER TABLE course_chapter_media
ADD CONSTRAINT chk_transcript_status
CHECK (transcript_status IN ('pending', 'processing', 'completed', 'failed', 'none'));

-- 5. Add comments for documentation
COMMENT ON COLUMN course_chapter_media.transcript_file_path IS 'Path to the JSON transcript file with segmented data';
COMMENT ON COLUMN course_chapter_media.transcript_text IS 'Full transcript text for the media file';
COMMENT ON COLUMN course_chapter_media.transcript_status IS 'Status of transcript processing: pending, processing, completed, failed, none';
COMMENT ON COLUMN course_chapter_media.transcript_uploaded_at IS 'Timestamp when transcript was uploaded or generated';

-- 6. Update existing records to have 'none' status for media without transcripts
UPDATE course_chapter_media
SET transcript_status = 'none'
WHERE transcript_text IS NULL;
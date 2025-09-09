-- Media-Course Linking Infrastructure for Phase 4B
-- Adds support for linking media files to course chapters

-- Add media_file_id to videos table to support media linking
-- This allows videos to reference existing media files instead of being standalone
ALTER TABLE videos ADD COLUMN media_file_id uuid REFERENCES media_files(id) ON DELETE SET NULL;

-- Add index for performance when querying media file relationships
CREATE INDEX idx_videos_media_file_id ON videos(media_file_id);

-- Create media_usage table for tracking where media files are used
-- This enables delete protection and usage analytics
CREATE TABLE media_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  media_file_id uuid NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK (resource_type IN ('chapter', 'course', 'lesson')),
  resource_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for quick lookups and performance
CREATE INDEX idx_media_usage_media_file ON media_usage(media_file_id);
CREATE INDEX idx_media_usage_resource ON media_usage(resource_type, resource_id);
CREATE INDEX idx_media_usage_course ON media_usage(course_id);

-- Enable RLS on media_usage table
ALTER TABLE media_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view media usage for courses they own
CREATE POLICY "Users can view media usage for own courses" ON media_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = media_usage.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert media usage for courses they own
CREATE POLICY "Users can insert media usage for own courses" ON media_usage
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = media_usage.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete media usage for courses they own
CREATE POLICY "Users can delete media usage for own courses" ON media_usage
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = media_usage.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- Add comment to document the new functionality
COMMENT ON TABLE media_usage IS 'Tracks where media files are used across courses, chapters, and lessons for delete protection and analytics';
COMMENT ON COLUMN videos.media_file_id IS 'References media_files table for videos created from media library linking';
-- Video Transcription System
-- Supports Whisper.cpp integration with PM2 job queue management

-- Table to store video transcripts
CREATE TABLE IF NOT EXISTS video_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  transcript_text TEXT NOT NULL,
  transcript_segments JSONB, -- Detailed segments with timestamps
  word_count INTEGER,
  language_code VARCHAR(10) DEFAULT 'en',
  confidence_score DECIMAL(5,4), -- 0.0000 to 1.0000
  processing_duration_seconds INTEGER,
  whisper_model_used VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one transcript per video
  UNIQUE(video_id)
);

-- Table to track transcription jobs and queue
CREATE TABLE IF NOT EXISTS transcription_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  video_ids JSONB NOT NULL, -- Array of video UUIDs to transcribe
  status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  worker_id VARCHAR(100), -- PM2 worker that picked up the job
  total_videos INTEGER NOT NULL,
  completed_videos INTEGER DEFAULT 0,
  error_message TEXT,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for AI-generated content based on transcripts
CREATE TABLE IF NOT EXISTS ai_video_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  transcript_id UUID NOT NULL REFERENCES video_transcripts(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('hint', 'quiz', 'summary', 'key_points')),
  content_data JSONB NOT NULL, -- Structured content (questions, hints, etc.)
  ai_model_used VARCHAR(50),
  confidence_score DECIMAL(5,4),
  human_reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Allow multiple content types per video
  UNIQUE(video_id, content_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_transcripts_video_id ON video_transcripts(video_id);
CREATE INDEX IF NOT EXISTS idx_video_transcripts_course_id ON video_transcripts(course_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status ON transcription_jobs(status);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_user_id ON transcription_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_course_id ON transcription_jobs(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_video_content_video_id ON ai_video_content(video_id);
CREATE INDEX IF NOT EXISTS idx_ai_video_content_transcript_id ON ai_video_content(transcript_id);
CREATE INDEX IF NOT EXISTS idx_ai_video_content_content_type ON ai_video_content(content_type);

-- Function to update job progress and status
CREATE OR REPLACE FUNCTION update_transcription_job_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the updated_at timestamp
  NEW.updated_at = NOW();

  -- Set processing timestamps based on status changes
  IF OLD.status = 'queued' AND NEW.status = 'processing' THEN
    NEW.processing_started_at = NOW();
  END IF;

  IF OLD.status IN ('queued', 'processing') AND NEW.status IN ('completed', 'failed', 'cancelled') THEN
    NEW.processing_completed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER transcription_jobs_update_trigger
  BEFORE UPDATE ON transcription_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_transcription_job_progress();

-- Function to get videos that need transcription for a course
CREATE OR REPLACE FUNCTION get_videos_needing_transcription(course_uuid UUID)
RETURNS TABLE (
  video_id UUID,
  video_title TEXT,
  video_duration_minutes INTEGER,
  has_transcript BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id as video_id,
    v.title as video_title,
    v.duration_minutes as video_duration_minutes,
    (vt.id IS NOT NULL) as has_transcript
  FROM videos v
  LEFT JOIN video_transcripts vt ON v.id = vt.video_id
  WHERE v.course_id = course_uuid
  ORDER BY v.chapter_order ASC, v.video_order ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get transcription job status
CREATE OR REPLACE FUNCTION get_transcription_job_status(job_uuid UUID)
RETURNS TABLE (
  job_id UUID,
  status VARCHAR,
  progress_percent INTEGER,
  total_videos INTEGER,
  completed_videos INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tj.id as job_id,
    tj.status,
    tj.progress_percent,
    tj.total_videos,
    tj.completed_videos,
    tj.error_message,
    tj.created_at,
    tj.processing_started_at,
    tj.processing_completed_at
  FROM transcription_jobs tj
  WHERE tj.id = job_uuid;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for security
ALTER TABLE video_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcription_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_video_content ENABLE ROW LEVEL SECURITY;

-- Instructors can access transcripts for their courses
CREATE POLICY "Instructors can manage video transcripts" ON video_transcripts
  USING (
    course_id IN (
      SELECT id FROM courses WHERE instructor_id = auth.uid()
    )
  );

-- Instructors can manage transcription jobs for their courses
CREATE POLICY "Instructors can manage transcription jobs" ON transcription_jobs
  USING (
    course_id IN (
      SELECT id FROM courses WHERE instructor_id = auth.uid()
    )
  );

-- Instructors can manage AI content for their courses
CREATE POLICY "Instructors can manage AI video content" ON ai_video_content
  USING (
    video_id IN (
      SELECT v.id FROM videos v
      JOIN courses c ON v.course_id = c.id
      WHERE c.instructor_id = auth.uid()
    )
  );

-- Students can read transcripts for enrolled courses
CREATE POLICY "Students can read video transcripts" ON video_transcripts
  FOR SELECT USING (
    course_id IN (
      SELECT course_id FROM enrollments WHERE user_id = auth.uid()
    )
  );

-- Students can read AI content for enrolled courses
CREATE POLICY "Students can read AI video content" ON ai_video_content
  FOR SELECT USING (
    video_id IN (
      SELECT v.id FROM videos v
      JOIN enrollments e ON v.course_id = e.course_id
      WHERE e.user_id = auth.uid()
    )
  );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON video_transcripts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON transcription_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_video_content TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
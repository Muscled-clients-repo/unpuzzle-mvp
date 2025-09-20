-- Clean recreation of quiz_attempts table with exact structure needed
-- This avoids all the column mismatch issues

-- Drop the existing table if it exists (this will also drop policies and triggers)
DROP TABLE IF EXISTS quiz_attempts CASCADE;

-- Create the complete table with all required columns
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  video_timestamp DECIMAL NOT NULL,

  -- Quiz content and results
  questions JSONB NOT NULL, -- Array of question objects with options, correct answers, explanations
  user_answers JSONB NOT NULL, -- Array of user's selected answers (indices)
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL NOT NULL,

  -- Timing data for analytics
  quiz_duration_seconds INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_quiz_attempts_user_video ON quiz_attempts(user_id, video_id);
CREATE INDEX idx_quiz_attempts_course ON quiz_attempts(course_id);
CREATE INDEX idx_quiz_attempts_timestamp ON quiz_attempts(video_timestamp);
CREATE INDEX idx_quiz_attempts_created_at ON quiz_attempts(created_at);

-- Enable RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create the simple RLS policy that works (matches reflections pattern)
CREATE POLICY "Users manage own quiz attempts" ON quiz_attempts
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_quiz_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at
CREATE TRIGGER update_quiz_attempts_updated_at
  BEFORE UPDATE ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_attempts_updated_at();
-- Create quiz_attempts table for storing quiz results and analytics
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

-- Indexes for performance
CREATE INDEX idx_quiz_attempts_user_video ON quiz_attempts(user_id, video_id);
CREATE INDEX idx_quiz_attempts_course ON quiz_attempts(course_id);
CREATE INDEX idx_quiz_attempts_timestamp ON quiz_attempts(video_timestamp);
CREATE INDEX idx_quiz_attempts_created_at ON quiz_attempts(created_at);

-- RLS policies
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own quiz attempts
CREATE POLICY "Users can view own quiz attempts" ON quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own quiz attempts
CREATE POLICY "Users can insert own quiz attempts" ON quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own quiz attempts
CREATE POLICY "Users can update own quiz attempts" ON quiz_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- Instructors can view quiz attempts for their courses
CREATE POLICY "Instructors can view course quiz attempts" ON quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_courses
      WHERE user_courses.course_id = quiz_attempts.course_id
      AND user_courses.user_id = auth.uid()
      AND user_courses.role = 'instructor'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quiz_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_quiz_attempts_updated_at
  BEFORE UPDATE ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_attempts_updated_at();
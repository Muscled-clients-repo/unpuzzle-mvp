-- Complete quiz_attempts table creation with ALL required columns
-- This ensures we have the exact structure needed by the application

-- First, let's check if the table exists and what columns it has
-- If it exists but is incomplete, we'll add missing columns
-- If it doesn't exist, we'll create it completely

-- Add quiz_duration_seconds column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'quiz_duration_seconds'
    ) THEN
        ALTER TABLE quiz_attempts ADD COLUMN quiz_duration_seconds INTEGER;
    END IF;
END $$;

-- Add created_at column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE quiz_attempts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add updated_at column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE quiz_attempts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add video_timestamp column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'video_timestamp'
    ) THEN
        ALTER TABLE quiz_attempts ADD COLUMN video_timestamp DECIMAL NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add video_id column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'video_id'
    ) THEN
        ALTER TABLE quiz_attempts ADD COLUMN video_id TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- Add course_id column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'course_id'
    ) THEN
        ALTER TABLE quiz_attempts ADD COLUMN course_id TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- Add user_id column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE quiz_attempts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add id column if missing (should be primary key)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'id'
    ) THEN
        ALTER TABLE quiz_attempts ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_video ON quiz_attempts(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course ON quiz_attempts(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_timestamp ON quiz_attempts(video_timestamp);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON quiz_attempts(created_at);

-- Ensure RLS is enabled
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create or replace the trigger function for updated_at
CREATE OR REPLACE FUNCTION update_quiz_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_quiz_attempts_updated_at ON quiz_attempts;
CREATE TRIGGER update_quiz_attempts_updated_at
  BEFORE UPDATE ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_attempts_updated_at();
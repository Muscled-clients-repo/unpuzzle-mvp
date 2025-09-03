-- Migration: 005_student_courses_core_tables_fixed.sql
-- Date: 2025-09-03
-- Purpose: Create foundational tables for student course enrollment and progress tracking
-- FIXED VERSION: Handles existing objects gracefully

-- ============================================================
-- STUDENT ENROLLMENT SYSTEM
-- ============================================================

-- ============================================================
-- Table: enrollments
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Enrollment metadata
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Basic progress tracking (denormalized for performance)
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  completed_videos INTEGER DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  current_lesson_title TEXT DEFAULT 'Not started',
  current_video_id UUID REFERENCES videos(id),
  estimated_time_remaining_formatted TEXT DEFAULT '0 hours',
  
  -- Mock data replacement fields for UI
  ai_interactions_count INTEGER DEFAULT 0,
  
  -- Timestamps
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Ensure one enrollment per user per course
  UNIQUE(user_id, course_id)
);

-- ============================================================
-- Table: video_progress
-- ============================================================
CREATE TABLE IF NOT EXISTS video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Progress tracking
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  last_position_seconds INTEGER DEFAULT 0,
  max_position_reached_seconds INTEGER DEFAULT 0,
  total_watch_time_seconds INTEGER DEFAULT 0,
  
  -- Engagement metrics for analytics
  pause_count INTEGER DEFAULT 0,
  rewind_count INTEGER DEFAULT 0,
  playback_speed DECIMAL(3,1) DEFAULT 1.0,
  
  -- Timestamps
  first_started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One progress record per user per video
  UNIQUE(user_id, video_id)
);

-- ============================================================
-- Table: user_learning_stats
-- ============================================================
CREATE TABLE IF NOT EXISTS user_learning_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Course statistics
  total_courses_enrolled INTEGER DEFAULT 0,
  active_courses_count INTEGER DEFAULT 0,
  completed_courses_count INTEGER DEFAULT 0,
  
  -- Learning progress
  total_videos_completed INTEGER DEFAULT 0,
  total_watch_time_minutes INTEGER DEFAULT 0,
  total_watch_time_formatted TEXT DEFAULT '0h',
  
  -- AI interaction stats
  total_ai_interactions INTEGER DEFAULT 0,
  
  -- Performance metrics
  average_completion_rate DECIMAL(5,2) DEFAULT 0.0,
  
  -- Updated tracking
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TEMPORARY: Mock data support tables
-- ============================================================

-- Simplified AI interactions for initial UI support
CREATE TABLE IF NOT EXISTS ai_interactions_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simplified struggling topics for initial UI support  
CREATE TABLE IF NOT EXISTS learning_struggles_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  concept_name TEXT NOT NULL,
  status TEXT DEFAULT 'active'
);

-- Simplified milestones for initial UI support
CREATE TABLE IF NOT EXISTS learning_milestones_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_achieved BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- INDEXES for Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_last_accessed ON enrollments(user_id, last_accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_progress_user_course ON video_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_user_video ON video_progress(user_id, video_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) Policies - WITH DROP/RECREATE
-- ============================================================

-- Enrollments
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own enrollments" ON enrollments;
CREATE POLICY "Users can view their own enrollments" ON enrollments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own enrollments" ON enrollments;
CREATE POLICY "Users can insert their own enrollments" ON enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own enrollments" ON enrollments;
CREATE POLICY "Users can update their own enrollments" ON enrollments
  FOR UPDATE USING (auth.uid() = user_id);

-- Video Progress
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own video progress" ON video_progress;
CREATE POLICY "Users can manage their own video progress" ON video_progress
  FOR ALL USING (auth.uid() = user_id);

-- User Learning Stats
ALTER TABLE user_learning_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own learning stats" ON user_learning_stats;
CREATE POLICY "Users can manage their own learning stats" ON user_learning_stats
  FOR ALL USING (auth.uid() = user_id);

-- Temp tables RLS - Fixed with DROP before CREATE
ALTER TABLE ai_interactions_temp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own AI interactions" ON ai_interactions_temp;
CREATE POLICY "Users can manage their own AI interactions" ON ai_interactions_temp
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE learning_struggles_temp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own struggles" ON learning_struggles_temp;
CREATE POLICY "Users can manage their own struggles" ON learning_struggles_temp
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE learning_milestones_temp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own milestones" ON learning_milestones_temp;
CREATE POLICY "Users can manage their own milestones" ON learning_milestones_temp
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
-- After running, this should return 6 tables:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'enrollments', 
  'video_progress', 
  'user_learning_stats',
  'ai_interactions_temp',
  'learning_struggles_temp',
  'learning_milestones_temp'
);
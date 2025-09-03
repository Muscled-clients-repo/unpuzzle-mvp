-- Migration: 005_student_courses_core_tables.sql
-- Date: 2025-09-03
-- Purpose: Create foundational tables for student course enrollment and progress tracking
-- Step 1 of student courses backend implementation

-- ============================================================
-- STUDENT ENROLLMENT SYSTEM
-- ============================================================

-- Note: courses table already exists from previous migrations
-- We'll focus on student-specific tables

-- ============================================================
-- Table: enrollments
-- Purpose: Track student enrollment and basic progress
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
  total_videos INTEGER DEFAULT 0, -- Cached from course
  current_lesson_title TEXT DEFAULT 'Not started',
  current_video_id UUID REFERENCES videos(id),
  estimated_time_remaining_formatted TEXT DEFAULT '0 hours',
  
  -- Mock data replacement fields for UI
  ai_interactions_count INTEGER DEFAULT 0,
  
  -- Timestamps
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ, -- NULL until course is 100% complete
  
  -- Ensure one enrollment per user per course
  UNIQUE(user_id, course_id)
);

-- ============================================================
-- Table: video_progress
-- Purpose: Track granular video watching progress
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
-- Purpose: Aggregated statistics for dashboard (denormalized)
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
  total_watch_time_formatted TEXT DEFAULT '0h', -- "12.5h" format for UI
  
  -- AI interaction stats (for mock data replacement)
  total_ai_interactions INTEGER DEFAULT 0,
  
  -- Performance metrics
  average_completion_rate DECIMAL(5,2) DEFAULT 0.0, -- Percentage
  
  -- Updated tracking
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TEMPORARY: Mock data support tables (will expand in later steps)
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
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================================

-- Enrollments: Users only see their own data
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

-- Video Progress: Users only see their own progress
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own video progress" ON video_progress;
CREATE POLICY "Users can manage their own video progress" ON video_progress
  FOR ALL USING (auth.uid() = user_id);

-- User Learning Stats: Users only see their own stats
ALTER TABLE user_learning_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own learning stats" ON user_learning_stats;
CREATE POLICY "Users can manage their own learning stats" ON user_learning_stats
  FOR ALL USING (auth.uid() = user_id);

-- Temp tables RLS
ALTER TABLE ai_interactions_temp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own AI interactions" ON ai_interactions_temp
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE learning_struggles_temp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own struggles" ON learning_struggles_temp
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE learning_milestones_temp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own milestones" ON learning_milestones_temp
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SAMPLE DATA INSERTION (Skipped - requires real user)
-- ============================================================
-- Note: Sample data insertion requires a real authenticated user ID
-- You can manually insert test data after migration using:
--
-- INSERT INTO enrollments (user_id, course_id, progress_percent, completed_videos, total_videos)
-- VALUES (
--   auth.uid(), -- Your real authenticated user ID
--   (SELECT id FROM courses LIMIT 1), -- First course
--   35, -- 35% progress
--   2,  -- 2 videos completed
--   10  -- 10 total videos
-- );
--
-- INSERT INTO video_progress (user_id, course_id, video_id, progress_percent)
-- VALUES (
--   auth.uid(),
--   (SELECT id FROM courses LIMIT 1),
--   (SELECT id FROM videos LIMIT 1),
--   100
-- );
--
-- INSERT INTO user_learning_stats (user_id, total_courses_enrolled, active_courses_count)
-- VALUES (auth.uid(), 1, 1);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Test 1: Check enrollments table
-- SELECT * FROM enrollments;

-- Test 2: Check video progress
-- SELECT * FROM video_progress;

-- Test 3: Check learning stats
-- SELECT * FROM user_learning_stats;

-- Test 4: Join enrollments with courses (checking existing courses table)
-- SELECT 
--   e.*, 
--   c.title as course_title,
--   c.instructor_id
-- FROM enrollments e
-- JOIN courses c ON e.course_id = c.id;

-- Test 5: Count tables created
-- SELECT COUNT(*) as new_tables_count 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('enrollments', 'video_progress', 'user_learning_stats');

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================
-- DROP TABLE IF EXISTS learning_milestones_temp CASCADE;
-- DROP TABLE IF EXISTS learning_struggles_temp CASCADE;
-- DROP TABLE IF EXISTS ai_interactions_temp CASCADE;
-- DROP TABLE IF EXISTS user_learning_stats CASCADE;
-- DROP TABLE IF EXISTS video_progress CASCADE;
-- DROP TABLE IF EXISTS enrollments CASCADE;
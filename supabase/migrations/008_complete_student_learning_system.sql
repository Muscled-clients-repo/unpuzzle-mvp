-- Migration: 008_complete_student_learning_system.sql
-- Date: 2025-09-03
-- Purpose: Complete consolidated migration for student learning system
-- This migration can be run independently and handles all tables/triggers

-- ============================================================
-- CLEANUP: Drop old temp tables if they exist
-- ============================================================
DROP TABLE IF EXISTS ai_interactions_temp CASCADE;
DROP TABLE IF EXISTS learning_struggles_temp CASCADE;
DROP TABLE IF EXISTS learning_milestones_temp CASCADE;

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Table: enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Enrollment metadata
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Progress tracking
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  completed_videos INTEGER DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  current_lesson_title TEXT DEFAULT 'Not started',
  current_video_id UUID REFERENCES videos(id),
  estimated_time_remaining_formatted TEXT DEFAULT '0 hours',
  ai_interactions_count INTEGER DEFAULT 0,
  
  -- Timestamps
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Ensure one enrollment per user per course
  UNIQUE(user_id, course_id)
);

-- Table: video_progress
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
  
  -- Engagement metrics
  pause_count INTEGER DEFAULT 0,
  rewind_count INTEGER DEFAULT 0,
  playback_speed DECIMAL(3,1) DEFAULT 1.0,
  
  -- Timestamps
  first_started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, video_id)
);

-- Table: user_learning_stats
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
  total_ai_interactions INTEGER DEFAULT 0,
  
  -- Performance metrics
  average_completion_rate DECIMAL(5,2) DEFAULT 0.0,
  
  -- Updated tracking
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS TABLES
-- ============================================================

-- AI Interactions
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  
  interaction_type TEXT CHECK (interaction_type IN (
    'hint', 'explanation', 'quiz', 'reflection', 'question', 'summary'
  )),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  
  video_timestamp_seconds INTEGER,
  concepts_discussed TEXT[],
  
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  helpful BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning Struggles
CREATE TABLE IF NOT EXISTS learning_struggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  
  concept_name TEXT NOT NULL,
  difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  
  evidence_type TEXT CHECK (evidence_type IN (
    'multiple_rewinds', 'pause_duration', 'ai_help_requests', 
    'quiz_failures', 'slow_progress', 'manual_report'
  )),
  evidence_data JSONB DEFAULT '{}',
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'improving', 'resolved')),
  resolution_strategy TEXT,
  
  identified_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning Milestones
CREATE TABLE IF NOT EXISTS learning_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  milestone_type TEXT CHECK (milestone_type IN (
    'module_completion', 'skill_mastery', 'time_goal', 
    'interaction_goal', 'course_completion', 'quiz_score'
  )),
  title TEXT NOT NULL,
  description TEXT,
  
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  
  is_achieved BOOLEAN DEFAULT FALSE,
  achieved_at TIMESTAMPTZ,
  
  sequence_order INTEGER DEFAULT 0,
  prerequisite_milestone_id UUID REFERENCES learning_milestones(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  
  quiz_type TEXT CHECK (quiz_type IN ('video_quiz', 'module_quiz', 'final_exam')),
  questions_count INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  score_percent INTEGER DEFAULT 0 CHECK (score_percent >= 0 AND score_percent <= 100),
  
  time_spent_seconds INTEGER DEFAULT 0,
  attempt_number INTEGER DEFAULT 1,
  passed BOOLEAN DEFAULT FALSE,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE(user_id, video_id, attempt_number)
);

-- Reflections
CREATE TABLE IF NOT EXISTS reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  
  reflection_prompt TEXT,
  reflection_text TEXT NOT NULL,
  
  reflection_type TEXT CHECK (reflection_type IN (
    'understanding', 'application', 'confusion', 'insight', 'feedback'
  )),
  
  instructor_response TEXT,
  instructor_responded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_last_accessed ON enrollments(user_id, last_accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_progress_user_course ON video_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_user_video ON video_progress(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_course ON ai_interactions(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created ON ai_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_struggles_active ON learning_struggles(user_id, course_id) 
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_learning_milestones_pending ON learning_milestones(user_id, course_id) 
  WHERE is_achieved = FALSE;
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_reflections_user ON reflections(user_id, course_id);

-- ============================================================
-- TRIGGER FUNCTIONS
-- ============================================================

-- Drop old versions if they exist
DROP FUNCTION IF EXISTS update_enrollment_progress() CASCADE;
DROP FUNCTION IF EXISTS update_user_learning_stats() CASCADE;
DROP FUNCTION IF EXISTS update_current_lesson() CASCADE;
DROP FUNCTION IF EXISTS increment_ai_interaction_count() CASCADE;
DROP FUNCTION IF EXISTS increment_ai_interaction_count_v2() CASCADE;
DROP FUNCTION IF EXISTS update_milestone_progress() CASCADE;
DROP FUNCTION IF EXISTS format_time_ago(TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS detect_learning_struggle(UUID, UUID, UUID, TEXT, TEXT) CASCADE;

-- Function to update enrollment progress when video progress changes
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_videos INTEGER;
  completed_videos INTEGER;
  new_progress INTEGER;
  remaining_minutes INTEGER;
  course_duration INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_videos
  FROM videos 
  WHERE course_id = NEW.course_id;
  
  SELECT COUNT(*) INTO completed_videos
  FROM video_progress 
  WHERE user_id = NEW.user_id 
    AND course_id = NEW.course_id 
    AND progress_percent >= 95;
  
  new_progress := CASE 
    WHEN total_videos > 0 THEN (completed_videos::DECIMAL / total_videos * 100)::INTEGER
    ELSE 0
  END;
  
  SELECT total_duration INTO course_duration
  FROM courses 
  WHERE id = NEW.course_id;
  
  remaining_minutes := GREATEST(0, 
    ROUND(COALESCE(course_duration, 0) * (100 - new_progress) / 100.0)
  );
  
  UPDATE enrollments 
  SET 
    completed_videos = completed_videos,
    total_videos = total_videos,
    progress_percent = new_progress,
    estimated_time_remaining_formatted = 
      CASE 
        WHEN remaining_minutes = 0 THEN 'Complete!'
        WHEN remaining_minutes < 60 THEN remaining_minutes || ' minutes'
        ELSE ROUND(remaining_minutes::DECIMAL / 60, 1) || ' hours'
      END,
    last_accessed_at = NOW(),
    completed_at = CASE WHEN new_progress >= 100 THEN NOW() ELSE NULL END
  WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user learning stats
CREATE OR REPLACE FUNCTION update_user_learning_stats()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
  completed_count INTEGER;
  total_completed_videos INTEGER;
  total_watch_minutes INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM enrollments 
  WHERE user_id = NEW.user_id 
    AND completed_at IS NULL;
  
  SELECT COUNT(*) INTO completed_count
  FROM enrollments 
  WHERE user_id = NEW.user_id 
    AND completed_at IS NOT NULL;
  
  SELECT COUNT(*) INTO total_completed_videos
  FROM video_progress 
  WHERE user_id = NEW.user_id 
    AND progress_percent >= 95;
  
  SELECT COALESCE(SUM(total_watch_time_seconds / 60), 0) INTO total_watch_minutes
  FROM video_progress 
  WHERE user_id = NEW.user_id;
  
  INSERT INTO user_learning_stats (
    user_id, 
    active_courses_count,
    completed_courses_count,
    total_videos_completed,
    total_watch_time_minutes,
    total_watch_time_formatted,
    total_courses_enrolled,
    updated_at
  )
  VALUES (
    NEW.user_id,
    active_count,
    completed_count,
    total_completed_videos,
    total_watch_minutes,
    CASE 
      WHEN total_watch_minutes < 60 THEN total_watch_minutes || 'm'
      ELSE ROUND(total_watch_minutes::DECIMAL / 60, 1) || 'h'
    END,
    active_count + completed_count,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    active_courses_count = EXCLUDED.active_courses_count,
    completed_courses_count = EXCLUDED.completed_courses_count,
    total_videos_completed = EXCLUDED.total_videos_completed,
    total_watch_time_minutes = EXCLUDED.total_watch_time_minutes,
    total_watch_time_formatted = EXCLUDED.total_watch_time_formatted,
    total_courses_enrolled = EXCLUDED.total_courses_enrolled,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment AI interaction count
CREATE OR REPLACE FUNCTION increment_ai_interaction_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE enrollments 
  SET 
    ai_interactions_count = COALESCE(ai_interactions_count, 0) + 1,
    last_accessed_at = NOW()
  WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
  
  UPDATE user_learning_stats 
  SET 
    total_ai_interactions = COALESCE(total_ai_interactions, 0) + 1,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_learning_stats (user_id, total_ai_interactions, updated_at)
    VALUES (NEW.user_id, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE 
    SET total_ai_interactions = COALESCE(user_learning_stats.total_ai_interactions, 0) + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update milestone progress
CREATE OR REPLACE FUNCTION update_milestone_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.target_value > 0 THEN
    NEW.progress_percent := LEAST(100, 
      ROUND((NEW.current_value::DECIMAL / NEW.target_value) * 100)::INTEGER
    );
    
    IF NEW.progress_percent >= 100 AND NOT NEW.is_achieved THEN
      NEW.is_achieved := TRUE;
      NEW.achieved_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CREATE TRIGGERS
-- ============================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_enrollment_progress ON video_progress;
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_video ON video_progress;
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_enrollment ON enrollments;
DROP TRIGGER IF EXISTS trigger_increment_ai_interactions ON ai_interactions;
DROP TRIGGER IF EXISTS trigger_update_milestone_progress ON learning_milestones;

-- Create new triggers
CREATE TRIGGER trigger_update_enrollment_progress
  AFTER INSERT OR UPDATE ON video_progress
  FOR EACH ROW 
  EXECUTE FUNCTION update_enrollment_progress();

CREATE TRIGGER trigger_update_user_stats_on_video
  AFTER INSERT OR UPDATE ON video_progress
  FOR EACH ROW 
  EXECUTE FUNCTION update_user_learning_stats();

CREATE TRIGGER trigger_update_user_stats_on_enrollment
  AFTER INSERT OR UPDATE OR DELETE ON enrollments
  FOR EACH ROW 
  EXECUTE FUNCTION update_user_learning_stats();

CREATE TRIGGER trigger_increment_ai_interactions
  AFTER INSERT ON ai_interactions
  FOR EACH ROW 
  EXECUTE FUNCTION increment_ai_interaction_count();

CREATE TRIGGER trigger_update_milestone_progress
  BEFORE INSERT OR UPDATE ON learning_milestones
  FOR EACH ROW 
  EXECUTE FUNCTION update_milestone_progress();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_struggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view their own enrollments" ON enrollments;
CREATE POLICY "Users can view their own enrollments" ON enrollments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own enrollments" ON enrollments;
CREATE POLICY "Users can insert their own enrollments" ON enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own enrollments" ON enrollments;
CREATE POLICY "Users can update their own enrollments" ON enrollments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own video progress" ON video_progress;
CREATE POLICY "Users can manage their own video progress" ON video_progress
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own learning stats" ON user_learning_stats;
CREATE POLICY "Users can manage their own learning stats" ON user_learning_stats
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own AI interactions" ON ai_interactions;
CREATE POLICY "Users manage own AI interactions" ON ai_interactions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own struggles" ON learning_struggles;
CREATE POLICY "Users manage own struggles" ON learning_struggles
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own milestones" ON learning_milestones;
CREATE POLICY "Users manage own milestones" ON learning_milestones
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users manage own quiz attempts" ON quiz_attempts
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own reflections" ON reflections;
CREATE POLICY "Users manage own reflections" ON reflections
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 
  'Tables created:' as status,
  COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'enrollments', 'video_progress', 'user_learning_stats',
  'ai_interactions', 'learning_struggles', 'learning_milestones',
  'quiz_attempts', 'reflections'
);

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$ 
BEGIN 
  RAISE NOTICE 'Student Learning System migration completed successfully!';
  RAISE NOTICE 'Created 8 tables, 5 functions, 5 triggers, and RLS policies';
END $$;
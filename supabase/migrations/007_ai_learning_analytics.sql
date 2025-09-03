-- Migration: 007_ai_learning_analytics.sql
-- Date: 2025-09-03
-- Purpose: Replace temp tables with full AI interactions and learning analytics tables
-- Step 3 of student courses backend implementation

-- ============================================================
-- DROP TEMPORARY TABLES (Replace with full implementations)
-- ============================================================
-- Note: These temp tables were created in migration 005
-- Using IF EXISTS to handle case where migration is run independently
DROP TABLE IF EXISTS ai_interactions_temp CASCADE;
DROP TABLE IF EXISTS learning_struggles_temp CASCADE;
DROP TABLE IF EXISTS learning_milestones_temp CASCADE;

-- ============================================================
-- AI INTERACTIONS (Full Implementation)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Interaction details
  interaction_type TEXT CHECK (interaction_type IN (
    'hint', 'explanation', 'quiz', 'reflection', 'question', 'summary'
  )),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  
  -- Context for better analytics
  video_timestamp_seconds INTEGER, -- Where in video this happened
  concepts_discussed TEXT[], -- Array of concepts covered
  
  -- Quality tracking
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  helpful BOOLEAN,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT ai_interactions_user_course_idx 
    UNIQUE (user_id, course_id, created_at)
);

-- ============================================================
-- LEARNING STRUGGLES (Full Implementation)
-- ============================================================
CREATE TABLE IF NOT EXISTS learning_struggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Struggle identification
  concept_name TEXT NOT NULL,
  difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  
  -- Evidence of struggle
  evidence_type TEXT CHECK (evidence_type IN (
    'multiple_rewinds', 'pause_duration', 'ai_help_requests', 
    'quiz_failures', 'slow_progress', 'manual_report'
  )),
  evidence_data JSONB DEFAULT '{}', -- Store specific metrics
  
  -- Resolution tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'improving', 'resolved')),
  resolution_strategy TEXT, -- What helped resolve it
  
  -- Timestamps
  identified_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEARNING MILESTONES (Full Implementation)
-- ============================================================
CREATE TABLE IF NOT EXISTS learning_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Milestone definition
  milestone_type TEXT CHECK (milestone_type IN (
    'module_completion', 'skill_mastery', 'time_goal', 
    'interaction_goal', 'course_completion', 'quiz_score'
  )),
  title TEXT NOT NULL, -- "Complete Module 2", "Master CSS Grid"
  description TEXT,
  
  -- Progress tracking
  target_value INTEGER, -- For measurable milestones
  current_value INTEGER DEFAULT 0,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  
  -- Achievement status
  is_achieved BOOLEAN DEFAULT FALSE,
  achieved_at TIMESTAMPTZ,
  
  -- Sequencing
  sequence_order INTEGER DEFAULT 0,
  prerequisite_milestone_id UUID REFERENCES learning_milestones(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUIZ ATTEMPTS (For complete mock data replacement)
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Quiz details
  quiz_type TEXT CHECK (quiz_type IN ('video_quiz', 'module_quiz', 'final_exam')),
  questions_count INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  score_percent INTEGER DEFAULT 0 CHECK (score_percent >= 0 AND score_percent <= 100),
  
  -- Time tracking
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Attempt tracking
  attempt_number INTEGER DEFAULT 1,
  passed BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Prevent duplicate attempts
  UNIQUE(user_id, video_id, attempt_number)
);

-- ============================================================
-- REFLECTIONS (Student reflections on content)
-- ============================================================
CREATE TABLE IF NOT EXISTS reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Reflection content
  reflection_prompt TEXT,
  reflection_text TEXT NOT NULL,
  
  -- Categorization
  reflection_type TEXT CHECK (reflection_type IN (
    'understanding', 'application', 'confusion', 'insight', 'feedback'
  )),
  
  -- Instructor interaction
  instructor_response TEXT,
  instructor_responded_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for Performance
-- ============================================================
CREATE INDEX idx_ai_interactions_user_course ON ai_interactions(user_id, course_id);
CREATE INDEX idx_ai_interactions_created ON ai_interactions(created_at DESC);
CREATE INDEX idx_learning_struggles_active ON learning_struggles(user_id, course_id) 
  WHERE status = 'active';
CREATE INDEX idx_learning_milestones_pending ON learning_milestones(user_id, course_id) 
  WHERE is_achieved = FALSE;
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id, course_id);
CREATE INDEX idx_reflections_user ON reflections(user_id, course_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- AI Interactions
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own AI interactions" ON ai_interactions;
CREATE POLICY "Users manage own AI interactions" ON ai_interactions
  FOR ALL USING (auth.uid() = user_id);

-- Learning Struggles  
ALTER TABLE learning_struggles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own struggles" ON learning_struggles;
CREATE POLICY "Users manage own struggles" ON learning_struggles
  FOR ALL USING (auth.uid() = user_id);

-- Learning Milestones
ALTER TABLE learning_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own milestones" ON learning_milestones;
CREATE POLICY "Users manage own milestones" ON learning_milestones
  FOR ALL USING (auth.uid() = user_id);

-- Quiz Attempts
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users manage own quiz attempts" ON quiz_attempts
  FOR ALL USING (auth.uid() = user_id);

-- Reflections
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own reflections" ON reflections;
CREATE POLICY "Users manage own reflections" ON reflections
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- UPDATE TRIGGER for AI interactions (replace temp trigger)
-- ============================================================
-- Drop trigger only if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_interactions_temp') THEN
    DROP TRIGGER IF EXISTS trigger_increment_ai_interactions ON ai_interactions_temp;
  END IF;
END $$;

-- New trigger for real ai_interactions table
CREATE OR REPLACE FUNCTION increment_ai_interaction_count_v2()
RETURNS TRIGGER AS $$
BEGIN
  -- Update enrollment AI interaction count
  UPDATE enrollments 
  SET 
    ai_interactions_count = COALESCE(ai_interactions_count, 0) + 1,
    last_accessed_at = NOW()
  WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
  
  -- Update user stats AI interaction count
  UPDATE user_learning_stats 
  SET 
    total_ai_interactions = COALESCE(total_ai_interactions, 0) + 1,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  -- If no stats record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_learning_stats (user_id, total_ai_interactions, updated_at)
    VALUES (NEW.user_id, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE 
    SET total_ai_interactions = COALESCE(user_learning_stats.total_ai_interactions, 0) + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_ai_interactions_v2
  AFTER INSERT ON ai_interactions
  FOR EACH ROW 
  EXECUTE FUNCTION increment_ai_interaction_count_v2();

-- ============================================================
-- TRIGGER for milestone progress updates
-- ============================================================
CREATE OR REPLACE FUNCTION update_milestone_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update progress percent based on current and target values
  IF NEW.target_value > 0 THEN
    NEW.progress_percent := LEAST(100, 
      ROUND((NEW.current_value::DECIMAL / NEW.target_value) * 100)::INTEGER
    );
    
    -- Check if milestone is achieved
    IF NEW.progress_percent >= 100 AND NOT NEW.is_achieved THEN
      NEW.is_achieved := TRUE;
      NEW.achieved_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_milestone_progress
  BEFORE INSERT OR UPDATE ON learning_milestones
  FOR EACH ROW 
  EXECUTE FUNCTION update_milestone_progress();

-- ============================================================
-- HELPER FUNCTION: Detect learning struggles from behavior
-- ============================================================
CREATE OR REPLACE FUNCTION detect_learning_struggle(
  p_user_id UUID,
  p_course_id UUID,
  p_video_id UUID,
  p_concept TEXT,
  p_evidence_type TEXT
)
RETURNS UUID AS $$
DECLARE
  struggle_id UUID;
BEGIN
  -- Check if struggle already exists for this concept
  SELECT id INTO struggle_id
  FROM learning_struggles
  WHERE user_id = p_user_id 
    AND course_id = p_course_id
    AND concept_name = p_concept
    AND status != 'resolved';
  
  IF struggle_id IS NULL THEN
    -- Create new struggle record
    INSERT INTO learning_struggles (
      user_id, course_id, video_id, 
      concept_name, evidence_type, status
    )
    VALUES (
      p_user_id, p_course_id, p_video_id,
      p_concept, p_evidence_type, 'active'
    )
    RETURNING id INTO struggle_id;
  ELSE
    -- Update existing struggle
    UPDATE learning_struggles
    SET 
      difficulty_level = LEAST(5, difficulty_level + 1),
      updated_at = NOW()
    WHERE id = struggle_id;
  END IF;
  
  RETURN struggle_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Test 1: Check new tables were created
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN (
--   'ai_interactions', 'learning_struggles', 'learning_milestones',
--   'quiz_attempts', 'reflections'
-- );
-- Expected: 5 rows

-- Test 2: Check temp tables were dropped
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name LIKE '%_temp';
-- Expected: 0 rows

-- Test 3: Check new triggers and functions
-- SELECT proname FROM pg_proc 
-- WHERE proname IN (
--   'increment_ai_interaction_count_v2',
--   'update_milestone_progress',
--   'detect_learning_struggle'
-- );
-- Expected: 3 rows

-- Test 4: Test complex join for UI data (no data yet, but should not error)
-- SELECT 
--   e.user_id,
--   e.course_id,
--   e.progress_percent,
--   COUNT(DISTINCT ai.id) as ai_count,
--   COUNT(DISTINCT ls.id) FILTER (WHERE ls.status = 'active') as active_struggles,
--   COUNT(DISTINCT lm.id) FILTER (WHERE NOT lm.is_achieved) as pending_milestones
-- FROM enrollments e
-- LEFT JOIN ai_interactions ai ON ai.user_id = e.user_id AND ai.course_id = e.course_id
-- LEFT JOIN learning_struggles ls ON ls.user_id = e.user_id AND ls.course_id = e.course_id
-- LEFT JOIN learning_milestones lm ON lm.user_id = e.user_id AND lm.course_id = e.course_id
-- GROUP BY e.user_id, e.course_id, e.progress_percent;
-- Expected: Runs without error (may return 0 rows if no data)

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================
-- DROP TABLE IF EXISTS reflections CASCADE;
-- DROP TABLE IF EXISTS quiz_attempts CASCADE;
-- DROP TABLE IF EXISTS learning_milestones CASCADE;
-- DROP TABLE IF EXISTS learning_struggles CASCADE;
-- DROP TABLE IF EXISTS ai_interactions CASCADE;
-- DROP FUNCTION IF EXISTS increment_ai_interaction_count_v2() CASCADE;
-- DROP FUNCTION IF EXISTS update_milestone_progress() CASCADE;
-- DROP FUNCTION IF EXISTS detect_learning_struggle(UUID, UUID, UUID, TEXT, TEXT) CASCADE;
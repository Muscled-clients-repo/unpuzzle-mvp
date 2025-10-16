-- Migration 138: Extend community_activities for Complete Activity Timeline
-- Purpose: Add missing columns and triggers to track all 11 activity types
-- Date: 2025-10-15

-- ============================================================
-- STEP 1: Add Missing Columns
-- ============================================================

-- Add activity_date for daily grouping (Goal Conversations)
ALTER TABLE community_activities
ADD COLUMN IF NOT EXISTS activity_date DATE
GENERATED ALWAYS AS (DATE(created_at AT TIME ZONE 'America/New_York')) STORED;

-- Add course_id for course completion activities
ALTER TABLE community_activities
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

COMMENT ON COLUMN community_activities.activity_date IS 'Date of activity in EST timezone for daily grouping';
COMMENT ON COLUMN community_activities.course_id IS 'Course reference for course completion activities';

-- ============================================================
-- STEP 2: Add Performance Indexes
-- ============================================================

-- Index for Goal Conversations (activities grouped by day)
CREATE INDEX IF NOT EXISTS idx_community_activities_user_date
  ON community_activities(user_id, activity_date DESC);

-- Index for Student Journey Tab (activities on specific video)
CREATE INDEX IF NOT EXISTS idx_community_activities_user_media_timestamp
  ON community_activities(user_id, media_file_id, timestamp_seconds ASC)
  WHERE media_file_id IS NOT NULL;

-- Index for Community/Goals Page (activities per goal)
CREATE INDEX IF NOT EXISTS idx_community_activities_user_goal_timeline
  ON community_activities(user_id, goal_id, created_at DESC)
  WHERE goal_id IS NOT NULL;

-- Index for filtering by activity type
CREATE INDEX IF NOT EXISTS idx_community_activities_type
  ON community_activities(activity_type, created_at DESC);

-- ============================================================
-- STEP 3: Trigger Functions
-- ============================================================

-- ============================================================
-- Trigger 1: Track Reflection Activities (text, screenshot, voice, loom)
-- ============================================================
CREATE OR REPLACE FUNCTION track_reflection_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
  v_video_title TEXT;
BEGIN
  -- Get student's current goal
  SELECT current_goal_id INTO v_goal_id
  FROM profiles
  WHERE id = NEW.user_id;

  -- Get video title
  SELECT name INTO v_video_title
  FROM media_files
  WHERE id = NEW.video_id;

  -- Insert into community activities
  INSERT INTO community_activities (
    user_id, activity_type, content, goal_id, goal_title,
    media_file_id, video_title, course_id, timestamp_seconds,
    reflection_id, metadata, is_public
  ) VALUES (
    NEW.user_id,
    NEW.reflection_type, -- 'text', 'screenshot', 'voice', 'loom'
    CASE
      WHEN NEW.reflection_type = 'voice' THEN 'Voice memo: ' || COALESCE(LEFT(NEW.reflection_text, 100), 'No transcript')
      WHEN NEW.reflection_type = 'screenshot' THEN 'Screenshot: ' || COALESCE(LEFT(NEW.reflection_text, 100), 'No description')
      WHEN NEW.reflection_type = 'loom' THEN 'Loom video: ' || COALESCE(LEFT(NEW.reflection_text, 100), 'No description')
      ELSE LEFT(NEW.reflection_text, 200)
    END,
    v_goal_id,
    (SELECT goal_title FROM profiles WHERE id = NEW.user_id),
    NEW.video_id,
    v_video_title,
    NEW.course_id,
    NEW.video_timestamp_seconds,
    NEW.id,
    jsonb_build_object(
      'file_url', NEW.file_url,
      'duration_seconds', NEW.duration_seconds,
      'reflection_prompt', NEW.reflection_prompt
    ),
    false -- Reflections are private by default
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_reflection_activity_timeline ON reflections;
CREATE TRIGGER after_reflection_activity_timeline
AFTER INSERT ON reflections
FOR EACH ROW
EXECUTE FUNCTION track_reflection_activity();

-- ============================================================
-- Trigger 2: Track Quiz Completion Activities
-- ============================================================
CREATE OR REPLACE FUNCTION track_quiz_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
  v_video_title TEXT;
BEGIN
  -- Get student's current goal
  SELECT current_goal_id INTO v_goal_id
  FROM profiles
  WHERE id = NEW.user_id;

  -- Get video title
  SELECT name INTO v_video_title
  FROM media_files
  WHERE id = NEW.video_id;

  -- Insert into community activities
  INSERT INTO community_activities (
    user_id, activity_type, content, goal_id, goal_title,
    media_file_id, video_title, course_id, timestamp_seconds,
    quiz_attempt_id, metadata, is_public
  ) VALUES (
    NEW.user_id,
    'quiz',
    'Quiz completed: ' || NEW.score || '/' || NEW.total_questions || ' correct (' || NEW.percentage || '%)',
    v_goal_id,
    (SELECT goal_title FROM profiles WHERE id = NEW.user_id),
    NEW.video_id,
    v_video_title,
    NEW.course_id,
    NEW.video_timestamp,
    NEW.id,
    jsonb_build_object(
      'percentage', NEW.percentage,
      'score', NEW.score,
      'total_questions', NEW.total_questions,
      'quiz_duration_seconds', NEW.quiz_duration_seconds
    ),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_quiz_activity_timeline ON quiz_attempts;
CREATE TRIGGER after_quiz_activity_timeline
AFTER INSERT ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION track_quiz_activity();

-- ============================================================
-- Trigger 3: Track AI Chat Activities
-- ============================================================
CREATE OR REPLACE FUNCTION track_ai_chat_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
  v_video_title TEXT;
BEGIN
  -- Get student's current goal
  SELECT current_goal_id INTO v_goal_id
  FROM profiles
  WHERE id = NEW.user_id;

  -- Get video title if available
  IF NEW.media_file_id IS NOT NULL THEN
    SELECT name INTO v_video_title
    FROM media_files
    WHERE id = NEW.media_file_id;
  END IF;

  -- Insert into community activities
  INSERT INTO community_activities (
    user_id, activity_type, content, goal_id, goal_title,
    media_file_id, video_title, timestamp_seconds,
    ai_conversation_id, metadata, is_public
  ) VALUES (
    NEW.user_id,
    'ai_chat',
    'AI Chat: ' || LEFT(NEW.user_message, 150) || '...',
    v_goal_id,
    (SELECT goal_title FROM profiles WHERE id = NEW.user_id),
    NEW.media_file_id,
    v_video_title,
    NEW.video_timestamp,
    NEW.id,
    jsonb_build_object(
      'model_used', NEW.model_used,
      'conversation_context', NEW.conversation_context
    ),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_ai_chat_activity_timeline ON video_ai_conversations;
CREATE TRIGGER after_ai_chat_activity_timeline
AFTER INSERT ON video_ai_conversations
FOR EACH ROW
EXECUTE FUNCTION track_ai_chat_activity();

-- ============================================================
-- Trigger 4: Track Course Completion Activities
-- ============================================================
CREATE OR REPLACE FUNCTION track_course_completion_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
  v_course_title TEXT;
BEGIN
  -- Only track when course is newly completed
  IF (OLD.progress_percent < 100 AND NEW.progress_percent >= 100) OR
     (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL) THEN

    -- Get student's current goal
    SELECT current_goal_id INTO v_goal_id
    FROM profiles
    WHERE id = NEW.user_id;

    -- Get course title
    SELECT title INTO v_course_title
    FROM courses
    WHERE id = NEW.course_id;

    -- Insert into community activities
    INSERT INTO community_activities (
      user_id, activity_type, content, goal_id, goal_title,
      course_id, metadata, is_public
    ) VALUES (
      NEW.user_id,
      'course_completion',
      'Completed course: ' || COALESCE(v_course_title, 'Unknown Course'),
      v_goal_id,
      (SELECT goal_title FROM profiles WHERE id = NEW.user_id),
      NEW.course_id,
      jsonb_build_object(
        'course_title', v_course_title,
        'completed_videos', NEW.completed_videos,
        'total_videos', NEW.total_videos
      ),
      true -- Course completions are public
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_course_completion_activity_timeline ON enrollments;
CREATE TRIGGER after_course_completion_activity_timeline
AFTER UPDATE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION track_course_completion_activity();

-- ============================================================
-- Trigger 5: Track Daily Note Submission Activities
-- ============================================================
CREATE OR REPLACE FUNCTION track_daily_note_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into community activities
  INSERT INTO community_activities (
    user_id, activity_type, content, goal_id, goal_title,
    metadata, is_public
  ) VALUES (
    NEW.user_id,
    'daily_note_submission',
    'Daily note: ' || LEFT(NEW.note, 200),
    NEW.goal_id,
    (SELECT goal_title FROM profiles WHERE id = NEW.user_id),
    jsonb_build_object('note_date', NEW.note_date),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_daily_note_activity_timeline ON user_daily_notes;
CREATE TRIGGER after_daily_note_activity_timeline
AFTER INSERT ON user_daily_notes
FOR EACH ROW
EXECUTE FUNCTION track_daily_note_activity();

-- ============================================================
-- Trigger 6: Track Revenue Proof Submission Activities
-- ============================================================
CREATE OR REPLACE FUNCTION track_revenue_proof_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
  v_metadata JSONB;
BEGIN
  -- Only track revenue submission messages
  IF NEW.message_type = 'revenue_submission' THEN

    -- Get student's current goal
    SELECT current_goal_id INTO v_goal_id
    FROM profiles
    WHERE id = NEW.sender_id;

    -- Extract revenue metadata
    v_metadata := NEW.metadata;

    -- Insert into community activities
    INSERT INTO community_activities (
      user_id, activity_type, content, goal_id, goal_title,
      conversation_message_id, metadata, is_public
    ) VALUES (
      NEW.sender_id,
      'revenue_proof_submission',
      NEW.content,
      v_goal_id,
      (SELECT goal_title FROM profiles WHERE id = NEW.sender_id),
      NEW.id,
      v_metadata,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_revenue_proof_activity_timeline ON conversation_messages;
CREATE TRIGGER after_revenue_proof_activity_timeline
AFTER INSERT ON conversation_messages
FOR EACH ROW
WHEN (NEW.message_type = 'revenue_submission')
EXECUTE FUNCTION track_revenue_proof_activity();

-- ============================================================
-- Trigger 7: Track Goal Change Activities (goal_achieved, new_goal_entered)
-- ============================================================
CREATE OR REPLACE FUNCTION track_goal_change_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_old_goal_title TEXT;
  v_new_goal_title TEXT;
BEGIN
  -- Only track when goal ID actually changes
  IF OLD.current_goal_id IS DISTINCT FROM NEW.current_goal_id THEN

    -- Get old goal title
    IF OLD.current_goal_id IS NOT NULL THEN
      SELECT name INTO v_old_goal_title
      FROM track_goals
      WHERE id = OLD.current_goal_id;

      -- Track goal achievement if old goal was completed
      IF OLD.goal_status = 'completed' THEN
        INSERT INTO community_activities (
          user_id, activity_type, content, goal_id, goal_title,
          metadata, is_public
        ) VALUES (
          NEW.id,
          'goal_achieved',
          'Achieved goal: ' || COALESCE(v_old_goal_title, OLD.goal_title, 'Unknown'),
          OLD.current_goal_id,
          v_old_goal_title,
          jsonb_build_object(
            'goal_id', OLD.current_goal_id,
            'goal_title', v_old_goal_title,
            'goal_progress', OLD.goal_progress,
            'started_at', OLD.goal_started_at,
            'completed_at', OLD.goal_completed_at
          ),
          true -- Goal achievements are public
        );
      END IF;
    END IF;

    -- Get new goal title
    IF NEW.current_goal_id IS NOT NULL THEN
      SELECT name INTO v_new_goal_title
      FROM track_goals
      WHERE id = NEW.current_goal_id;

      -- Track new goal entry
      INSERT INTO community_activities (
        user_id, activity_type, content, goal_id, goal_title,
        metadata, is_public
      ) VALUES (
        NEW.id,
        'new_goal_entered',
        'Started new goal: ' || COALESCE(v_new_goal_title, NEW.goal_title, 'Unknown'),
        NEW.current_goal_id,
        v_new_goal_title,
        jsonb_build_object(
          'goal_id', NEW.current_goal_id,
          'goal_title', v_new_goal_title,
          'previous_goal_id', OLD.current_goal_id,
          'previous_goal_title', v_old_goal_title
        ),
        true -- New goals are public
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_goal_change_activity_timeline ON profiles;
CREATE TRIGGER after_goal_change_activity_timeline
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.current_goal_id IS DISTINCT FROM NEW.current_goal_id)
EXECUTE FUNCTION track_goal_change_activity();

-- ============================================================
-- STEP 4: Grant Permissions
-- ============================================================

-- Students can insert their own activities (via triggers)
-- Students can view their own activities
-- Instructors can view all activities
-- (RLS policies should already exist on community_activities)

-- ============================================================
-- STEP 5: Verification
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 138 Complete - Community Activities Extended';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  - Added activity_date column (DATE, GENERATED)';
  RAISE NOTICE '  - Added course_id column (UUID)';
  RAISE NOTICE '  - Added 4 performance indexes';
  RAISE NOTICE '  - Created 7 trigger functions for automatic activity tracking';
  RAISE NOTICE 'Activity types now tracked:';
  RAISE NOTICE '  1. text (reflections)';
  RAISE NOTICE '  2. screenshot (reflections)';
  RAISE NOTICE '  3. voice (reflections)';
  RAISE NOTICE '  4. loom (reflections)';
  RAISE NOTICE '  5. quiz (quiz completions)';
  RAISE NOTICE '  6. ai_chat (AI conversations)';
  RAISE NOTICE '  7. course_completion (course finished)';
  RAISE NOTICE '  8. daily_note_submission (daily notes)';
  RAISE NOTICE '  9. revenue_proof_submission (revenue proofs)';
  RAISE NOTICE '  10. goal_achieved (goal completed)';
  RAISE NOTICE '  11. new_goal_entered (new goal started)';
END $$;

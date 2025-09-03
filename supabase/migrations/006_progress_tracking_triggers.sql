-- Migration: 006_progress_tracking_triggers.sql
-- Date: 2025-09-03
-- Purpose: Add database triggers for automatic progress calculation
-- Step 2 of student courses backend implementation

-- ============================================================
-- TRIGGER FUNCTIONS FOR AUTOMATIC CALCULATIONS
-- ============================================================

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
  -- Get total videos for the course
  SELECT COUNT(*) INTO total_videos
  FROM videos 
  WHERE course_id = NEW.course_id;
  
  -- Count completed videos for this enrollment
  SELECT COUNT(*) INTO completed_videos
  FROM video_progress 
  WHERE user_id = NEW.user_id 
    AND course_id = NEW.course_id 
    AND progress_percent >= 95; -- Consider 95%+ as completed
  
  -- Calculate overall progress percentage
  new_progress := CASE 
    WHEN total_videos > 0 THEN (completed_videos::DECIMAL / total_videos * 100)::INTEGER
    ELSE 0
  END;
  
  -- Get course duration for time remaining calculation
  SELECT total_duration INTO course_duration
  FROM courses 
  WHERE id = NEW.course_id;
  
  -- Calculate estimated time remaining (rough estimate)
  remaining_minutes := GREATEST(0, 
    ROUND(course_duration * (100 - new_progress) / 100.0)
  );
  
  -- Update enrollment record
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
  -- Count active courses (enrolled but not completed)
  SELECT COUNT(*) INTO active_count
  FROM enrollments 
  WHERE user_id = NEW.user_id 
    AND completed_at IS NULL;
  
  -- Count completed courses
  SELECT COUNT(*) INTO completed_count
  FROM enrollments 
  WHERE user_id = NEW.user_id 
    AND completed_at IS NOT NULL;
  
  -- Count total completed videos across all courses
  SELECT COUNT(*) INTO total_completed_videos
  FROM video_progress 
  WHERE user_id = NEW.user_id 
    AND progress_percent >= 95;
  
  -- Calculate total watch time
  SELECT COALESCE(SUM(total_watch_time_seconds / 60), 0) INTO total_watch_minutes
  FROM video_progress 
  WHERE user_id = NEW.user_id;
  
  -- Insert or update user stats
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

-- Function to set current lesson when video progress is updated
CREATE OR REPLACE FUNCTION update_current_lesson()
RETURNS TRIGGER AS $$
DECLARE
  video_title TEXT;
  video_id UUID;
BEGIN
  -- Only update if this video is not yet complete
  IF NEW.progress_percent < 95 THEN
    -- Get the video title
    SELECT title, id INTO video_title, video_id
    FROM videos 
    WHERE id = NEW.video_id;
    
    -- Update enrollment with current lesson info
    UPDATE enrollments 
    SET 
      current_lesson_title = video_title,
      current_video_id = video_id,
      last_accessed_at = NOW()
    WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
  ELSE
    -- Video completed, find next video
    SELECT v.title, v.id INTO video_title, video_id
    FROM videos v
    LEFT JOIN video_progress vp ON v.id = vp.video_id AND vp.user_id = NEW.user_id
    WHERE v.course_id = NEW.course_id
      AND (vp.progress_percent IS NULL OR vp.progress_percent < 95)
    ORDER BY v.sequence_num
    LIMIT 1;
    
    IF video_id IS NOT NULL THEN
      UPDATE enrollments 
      SET 
        current_lesson_title = video_title,
        current_video_id = video_id,
        last_accessed_at = NOW()
      WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment AI interaction count
CREATE OR REPLACE FUNCTION increment_ai_interaction_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update enrollment AI interaction count
  UPDATE enrollments 
  SET ai_interactions_count = COALESCE(ai_interactions_count, 0) + 1
  WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
  
  -- Update user stats AI interaction count
  UPDATE user_learning_stats 
  SET 
    total_ai_interactions = COALESCE(total_ai_interactions, 0) + 1,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
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
DROP TRIGGER IF EXISTS trigger_update_current_lesson ON video_progress;
DROP TRIGGER IF EXISTS trigger_increment_ai_interactions ON ai_interactions_temp;

-- Trigger: Update enrollment progress when video progress changes
CREATE TRIGGER trigger_update_enrollment_progress
  AFTER INSERT OR UPDATE ON video_progress
  FOR EACH ROW 
  EXECUTE FUNCTION update_enrollment_progress();

-- Trigger: Update user stats when video progress changes
CREATE TRIGGER trigger_update_user_stats_on_video
  AFTER INSERT OR UPDATE ON video_progress
  FOR EACH ROW 
  EXECUTE FUNCTION update_user_learning_stats();

-- Trigger: Update user stats when enrollment changes
CREATE TRIGGER trigger_update_user_stats_on_enrollment
  AFTER INSERT OR UPDATE OR DELETE ON enrollments
  FOR EACH ROW 
  EXECUTE FUNCTION update_user_learning_stats();

-- Trigger: Update current lesson when video progress changes
CREATE TRIGGER trigger_update_current_lesson
  AFTER INSERT OR UPDATE ON video_progress
  FOR EACH ROW 
  EXECUTE FUNCTION update_current_lesson();

-- Trigger: Increment AI interaction counts
CREATE TRIGGER trigger_increment_ai_interactions
  AFTER INSERT ON ai_interactions_temp
  FOR EACH ROW 
  EXECUTE FUNCTION increment_ai_interaction_count();

-- ============================================================
-- HELPER FUNCTIONS FOR DATA ACCESS
-- ============================================================

-- Function to get formatted time ago
CREATE OR REPLACE FUNCTION format_time_ago(timestamp_val TIMESTAMPTZ)
RETURNS TEXT AS $$
DECLARE
  diff_interval INTERVAL;
  diff_seconds INTEGER;
  diff_minutes INTEGER;
  diff_hours INTEGER;
  diff_days INTEGER;
BEGIN
  diff_interval := NOW() - timestamp_val;
  diff_seconds := EXTRACT(EPOCH FROM diff_interval)::INTEGER;
  diff_minutes := diff_seconds / 60;
  diff_hours := diff_minutes / 60;
  diff_days := diff_hours / 24;
  
  IF diff_minutes < 1 THEN
    RETURN 'Just now';
  ELSIF diff_minutes < 60 THEN
    RETURN diff_minutes || ' minutes ago';
  ELSIF diff_hours < 24 THEN
    RETURN diff_hours || ' hours ago';
  ELSIF diff_days < 7 THEN
    RETURN diff_days || ' days ago';
  ELSE
    RETURN (diff_days / 7) || ' weeks ago';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Test 1: Check if functions were created
-- SELECT proname FROM pg_proc 
-- WHERE proname IN (
--   'update_enrollment_progress',
--   'update_user_learning_stats',
--   'update_current_lesson',
--   'increment_ai_interaction_count',
--   'format_time_ago'
-- );

-- Test 2: Check if triggers were created
-- SELECT tgname FROM pg_trigger 
-- WHERE tgname LIKE 'trigger_%';

-- Test 3: Test the format_time_ago function
-- SELECT 
--   format_time_ago(NOW() - INTERVAL '30 seconds') as thirty_seconds_ago,
--   format_time_ago(NOW() - INTERVAL '5 minutes') as five_minutes_ago,
--   format_time_ago(NOW() - INTERVAL '2 hours') as two_hours_ago,
--   format_time_ago(NOW() - INTERVAL '3 days') as three_days_ago;

-- Test 4: Manual test of trigger (requires real data)
-- INSERT INTO video_progress (user_id, course_id, video_id, progress_percent)
-- VALUES (auth.uid(), [course_id], [video_id], 50)
-- ON CONFLICT (user_id, video_id) 
-- DO UPDATE SET progress_percent = EXCLUDED.progress_percent;
--
-- Then check if enrollment was updated:
-- SELECT * FROM enrollments WHERE user_id = auth.uid();

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================
-- DROP TRIGGER IF EXISTS trigger_update_enrollment_progress ON video_progress;
-- DROP TRIGGER IF EXISTS trigger_update_user_stats_on_video ON video_progress;
-- DROP TRIGGER IF EXISTS trigger_update_user_stats_on_enrollment ON enrollments;
-- DROP TRIGGER IF EXISTS trigger_update_current_lesson ON video_progress;
-- DROP TRIGGER IF EXISTS trigger_increment_ai_interactions ON ai_interactions_temp;
-- DROP FUNCTION IF EXISTS update_enrollment_progress();
-- DROP FUNCTION IF EXISTS update_user_learning_stats();
-- DROP FUNCTION IF EXISTS update_current_lesson();
-- DROP FUNCTION IF EXISTS increment_ai_interaction_count();
-- DROP FUNCTION IF EXISTS format_time_ago(TIMESTAMPTZ);
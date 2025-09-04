-- Fix the user_learning_stats trigger to properly handle DELETE operations
-- This prevents the "null value in column user_id" error when deleting courses

CREATE OR REPLACE FUNCTION update_user_learning_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  active_count INTEGER;
  completed_count INTEGER;
  total_completed_videos INTEGER;
  total_watch_minutes INTEGER;
BEGIN
  -- Determine which user_id to use based on operation
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;
  
  -- Skip if no user_id (shouldn't happen but safe guard)
  IF target_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count active courses (enrolled but not completed)
  SELECT COUNT(*) INTO active_count
  FROM enrollments 
  WHERE user_id = target_user_id 
    AND completed_at IS NULL;
  
  -- Count completed courses
  SELECT COUNT(*) INTO completed_count
  FROM enrollments 
  WHERE user_id = target_user_id 
    AND completed_at IS NOT NULL;
  
  -- Count total completed videos across all courses
  SELECT COUNT(*) INTO total_completed_videos
  FROM video_progress 
  WHERE user_id = target_user_id 
    AND progress_percent >= 95;
  
  -- Calculate total watch time
  SELECT COALESCE(SUM(total_watch_time_seconds / 60), 0) INTO total_watch_minutes
  FROM video_progress 
  WHERE user_id = target_user_id;
  
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
    target_user_id,
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
  
  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Also fix the enrollment trigger to handle DELETE properly
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
DECLARE
  completed_videos INTEGER;
  total_videos INTEGER;
  target_enrollment RECORD;
BEGIN
  -- Handle DELETE vs INSERT/UPDATE
  IF TG_OP = 'DELETE' THEN
    target_enrollment := OLD;
  ELSE
    target_enrollment := NEW;
  END IF;
  
  -- Count completed videos for this enrollment
  SELECT COUNT(*) INTO completed_videos
  FROM video_progress vp
  JOIN videos v ON v.id = vp.video_id
  WHERE vp.user_id = target_enrollment.user_id 
    AND vp.course_id = target_enrollment.course_id
    AND vp.progress_percent >= 95;
  
  -- Count total videos in course
  SELECT COUNT(*) INTO total_videos
  FROM videos 
  WHERE course_id = target_enrollment.course_id;
  
  -- Only update if not deleting
  IF TG_OP != 'DELETE' THEN
    -- Update enrollment progress
    UPDATE enrollments 
    SET 
      progress_percent = CASE 
        WHEN total_videos > 0 THEN (completed_videos::DECIMAL / total_videos) * 100
        ELSE 0
      END,
      last_accessed_at = NOW(),
      completed_at = CASE 
        WHEN total_videos > 0 AND completed_videos = total_videos THEN NOW()
        ELSE completed_at
      END,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
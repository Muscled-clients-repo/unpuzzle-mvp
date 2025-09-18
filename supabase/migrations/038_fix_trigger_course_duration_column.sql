-- Fix trigger to use correct course duration column name
-- The courses table has 'total_duration_minutes', not 'total_duration'

CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_videos_count INTEGER;
  completed_videos_count INTEGER;
  new_progress INTEGER;
  remaining_minutes INTEGER;
  course_duration_minutes INTEGER;
BEGIN
  -- Get total videos for this course
  SELECT COUNT(*) INTO total_videos_count
  FROM videos
  WHERE course_id = NEW.course_id;

  -- Get completed videos for this user/course
  SELECT COUNT(*) INTO completed_videos_count
  FROM video_progress
  WHERE user_id = NEW.user_id
    AND course_id = NEW.course_id
    AND progress_percent >= 95;

  -- Calculate new progress percentage
  new_progress := CASE
    WHEN total_videos_count > 0 THEN (completed_videos_count::DECIMAL / total_videos_count * 100)::INTEGER
    ELSE 0
  END;

  -- Get course duration (correct column name)
  SELECT total_duration_minutes INTO course_duration_minutes
  FROM courses
  WHERE id = NEW.course_id;

  -- Calculate remaining time
  remaining_minutes := GREATEST(0,
    ROUND(COALESCE(course_duration_minutes, 0) * (100 - new_progress) / 100.0)
  );

  -- Update enrollments table with explicit column references
  UPDATE enrollments
  SET
    completed_videos = completed_videos_count,      -- Use local variable
    total_videos = total_videos_count,              -- Use local variable
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
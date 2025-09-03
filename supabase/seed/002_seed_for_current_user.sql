-- Seed Script: Create test enrollments for current user
-- User ID: 28a603f0-f9ac-42b8-a5b1-9dd632dc74d6
-- Date: 2025-09-03

-- First, let's check if we have courses
DO $$
DECLARE
  v_user_id UUID := '28a603f0-f9ac-42b8-a5b1-9dd632dc74d6';
  course_1_id UUID;
  course_2_id UUID;
  course_3_id UUID;
BEGIN
  -- Get first 3 courses (or create sample ones if none exist)
  SELECT id INTO course_1_id FROM courses WHERE status = 'published' ORDER BY created_at LIMIT 1;
  SELECT id INTO course_2_id FROM courses WHERE status = 'published' ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO course_3_id FROM courses WHERE status = 'published' ORDER BY created_at OFFSET 2 LIMIT 1;
  
  -- If no courses exist, let's check for any courses at all
  IF course_1_id IS NULL THEN
    SELECT id INTO course_1_id FROM courses ORDER BY created_at LIMIT 1;
    SELECT id INTO course_2_id FROM courses ORDER BY created_at OFFSET 1 LIMIT 1;
    SELECT id INTO course_3_id FROM courses ORDER BY created_at OFFSET 2 LIMIT 1;
  END IF;
  
  IF course_1_id IS NULL THEN
    RAISE NOTICE 'No courses found. Creating sample courses...';
    
    -- Get an instructor ID (any user will do for testing)
    DECLARE instructor_id UUID;
    BEGIN
      SELECT id INTO instructor_id FROM profiles LIMIT 1;
      
      IF instructor_id IS NULL THEN
        -- Use the current user as instructor
        instructor_id := v_user_id;
        
        -- Make sure profile exists
        INSERT INTO profiles (id, email, role, name)
        VALUES (v_user_id, 'test@example.com', 'instructor', 'Test User')
        ON CONFLICT (id) DO NOTHING;
      END IF;
      
      -- Create sample courses
      INSERT INTO courses (id, instructor_id, title, description, status, price, total_videos, total_duration_minutes)
      VALUES 
        (gen_random_uuid(), instructor_id, 'Introduction to React', 'Learn React from scratch', 'published', 99.99, 10, 180),
        (gen_random_uuid(), instructor_id, 'Advanced TypeScript', 'Master TypeScript patterns', 'published', 149.99, 15, 240),
        (gen_random_uuid(), instructor_id, 'Next.js Full Course', 'Build full-stack apps with Next.js', 'published', 199.99, 20, 360)
      RETURNING id INTO course_1_id;
      
      -- Get the IDs of the other courses
      SELECT id INTO course_2_id FROM courses WHERE title = 'Advanced TypeScript';
      SELECT id INTO course_3_id FROM courses WHERE title = 'Next.js Full Course';
    END;
  END IF;
  
  RAISE NOTICE 'Creating enrollments for user % in courses...', v_user_id;
  
  -- Create enrollments with different progress levels
  INSERT INTO enrollments (
    user_id, course_id, progress_percent, completed_videos, 
    total_videos, current_lesson_title, estimated_time_remaining_formatted,
    ai_interactions_count, last_accessed_at
  ) VALUES
  -- Course 1: Good progress
  (
    v_user_id, 
    course_1_id,
    65,  -- 65% complete
    7,   -- 7 videos completed
    10,  -- 10 total videos
    'Advanced React Hooks',
    '2.5 hours',
    24,  -- Used AI 24 times
    NOW() - INTERVAL '2 hours'
  ),
  -- Course 2: Just started
  (
    v_user_id,
    course_2_id,
    15,  -- 15% complete
    2,   -- 2 videos completed
    15,  -- 15 total videos
    'TypeScript Basics',
    '8 hours',
    5,   -- Used AI 5 times
    NOW() - INTERVAL '1 day'
  ),
  -- Course 3: Medium progress
  (
    v_user_id,
    course_3_id,
    45,  -- 45% complete
    9,   -- 9 videos completed
    20,  -- 20 total videos
     'API Routes in Next.js',
    '5 hours',
    18,  -- Used AI 18 times
    NOW() - INTERVAL '3 days'
  )
  ON CONFLICT (user_id, course_id) DO UPDATE
  SET 
    progress_percent = EXCLUDED.progress_percent,
    completed_videos = EXCLUDED.completed_videos,
    last_accessed_at = EXCLUDED.last_accessed_at;
  
  -- Create some video progress records
  IF course_1_id IS NOT NULL THEN
    -- Create video progress for course 1
    INSERT INTO video_progress (
      user_id, course_id, video_id, progress_percent,
      last_position_seconds, total_watch_time_seconds
    )
    SELECT 
      v_user_id,
      course_1_id,
      v.id,
      100,  -- Completed
      0,    -- At end
      1800  -- Watched for 30 minutes
    FROM videos v
    WHERE v.course_id = course_1_id
    LIMIT 7
    ON CONFLICT (user_id, video_id) DO NOTHING;
  END IF;
  
  -- Create or update user stats
  INSERT INTO user_learning_stats (
    user_id,
    total_courses_enrolled,
    active_courses_count,
    completed_courses_count,
    total_videos_completed,
    total_watch_time_minutes,
    total_watch_time_formatted,
    total_ai_interactions,
    average_completion_rate
  ) VALUES (
    v_user_id,
    3,      -- 3 courses enrolled
    3,      -- 3 active
    0,      -- 0 completed
    18,     -- 18 videos completed total
    540,    -- 540 minutes watched
    '9h',   -- 9 hours formatted
    47,     -- 47 AI interactions total
    41.67   -- 41.67% average completion
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    total_courses_enrolled = EXCLUDED.total_courses_enrolled,
    total_videos_completed = EXCLUDED.total_videos_completed,
    updated_at = NOW();
  
  RAISE NOTICE 'Successfully created enrollments for user %', v_user_id;
  RAISE NOTICE 'Enrolled in % courses', 3;
  
END $$;

-- Verify the data
SELECT 
  e.*, 
  c.title as course_title,
  c.status as course_status
FROM enrollments e
JOIN courses c ON e.course_id = c.id
WHERE e.user_id = '28a603f0-f9ac-42b8-a5b1-9dd632dc74d6';
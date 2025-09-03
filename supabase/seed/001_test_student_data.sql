-- Seed Script: 001_test_student_data.sql
-- Purpose: Create test data for student learning system
-- Date: 2025-09-03

-- ============================================================
-- IMPORTANT: Replace these IDs with real values from your database
-- ============================================================
-- 1. Get a real user ID by running: SELECT id FROM auth.users LIMIT 1;
-- 2. Get real course IDs by running: SELECT id, title FROM courses LIMIT 3;
-- 3. Get real video IDs by running: SELECT id, title, course_id FROM videos LIMIT 10;

-- ============================================================
-- TEST DATA VARIABLES (Update these with your real IDs)
-- ============================================================
DO $$
DECLARE
  test_user_id UUID;
  course_1_id UUID;
  course_2_id UUID;
  course_3_id UUID;
  video_1_id UUID;
  video_2_id UUID;
BEGIN
  -- Get the first user (or create a test user)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No users found. Please create a user first or update this script with a real user ID';
    RETURN;
  END IF;

  -- Get first 3 courses
  SELECT id INTO course_1_id FROM courses ORDER BY created_at LIMIT 1;
  SELECT id INTO course_2_id FROM courses ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO course_3_id FROM courses ORDER BY created_at OFFSET 2 LIMIT 1;
  
  IF course_1_id IS NULL THEN
    RAISE NOTICE 'No courses found. Please create courses first';
    RETURN;
  END IF;

  -- ============================================================
  -- 1. CREATE ENROLLMENTS
  -- ============================================================
  INSERT INTO enrollments (
    user_id, course_id, progress_percent, completed_videos, 
    total_videos, current_lesson_title, estimated_time_remaining_formatted,
    ai_interactions_count, last_accessed_at
  ) VALUES
  -- Course 1: Good progress
  (
    test_user_id, 
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
    test_user_id,
    course_2_id,
    15,  -- 15% complete
    2,   -- 2 videos completed
    12,  -- 12 total videos
    'Introduction to Machine Learning',
    '8 hours',
    5,   -- Used AI 5 times
    NOW() - INTERVAL '1 day'
  ),
  -- Course 3: Almost complete
  (
    test_user_id,
    course_3_id,
    90,  -- 90% complete
    9,   -- 9 videos completed
    10,  -- 10 total videos
    'Final Project Review',
    '30 minutes',
    45,  -- Used AI 45 times
    NOW() - INTERVAL '3 days'
  )
  ON CONFLICT (user_id, course_id) DO UPDATE
  SET 
    progress_percent = EXCLUDED.progress_percent,
    completed_videos = EXCLUDED.completed_videos,
    last_accessed_at = EXCLUDED.last_accessed_at;

  -- ============================================================
  -- 2. CREATE VIDEO PROGRESS
  -- ============================================================
  -- Get some video IDs for course 1
  FOR video_1_id IN 
    SELECT id FROM videos WHERE course_id = course_1_id LIMIT 5
  LOOP
    INSERT INTO video_progress (
      user_id, course_id, video_id, progress_percent,
      last_position_seconds, total_watch_time_seconds
    ) VALUES (
      test_user_id,
      course_1_id,
      video_1_id,
      100,  -- Completed
      0,    -- At end
      1800  -- Watched for 30 minutes
    )
    ON CONFLICT (user_id, video_id) DO NOTHING;
  END LOOP;

  -- ============================================================
  -- 3. CREATE USER STATS
  -- ============================================================
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
    test_user_id,
    3,      -- 3 courses enrolled
    2,      -- 2 active
    0,      -- 0 completed
    18,     -- 18 videos completed total
    540,    -- 540 minutes watched
    '9h',   -- 9 hours formatted
    74,     -- 74 AI interactions total
    56.67   -- 56.67% average completion
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    total_courses_enrolled = EXCLUDED.total_courses_enrolled,
    total_videos_completed = EXCLUDED.total_videos_completed,
    updated_at = NOW();

  -- ============================================================
  -- 4. CREATE LEARNING STRUGGLES
  -- ============================================================
  INSERT INTO learning_struggles (
    user_id, course_id, video_id, concept_name,
    difficulty_level, evidence_type, status
  ) 
  SELECT 
    test_user_id,
    course_1_id,
    (SELECT id FROM videos WHERE course_id = course_1_id LIMIT 1),
    concept,
    3,
    'multiple_rewinds',
    'active'
  FROM (VALUES 
    ('React useEffect cleanup'),
    ('Custom hooks patterns'),
    ('Context API optimization')
  ) AS concepts(concept)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 5. CREATE LEARNING MILESTONES
  -- ============================================================
  INSERT INTO learning_milestones (
    user_id, course_id, milestone_type, title,
    target_value, current_value, progress_percent, is_achieved
  ) VALUES
  (
    test_user_id,
    course_1_id,
    'module_completion',
    'Complete React Fundamentals Module',
    5,
    5,
    100,
    true
  ),
  (
    test_user_id,
    course_1_id,
    'module_completion',
    'Complete Advanced Hooks Module',
    5,
    2,
    40,
    false
  ),
  (
    test_user_id,
    course_2_id,
    'skill_mastery',
    'Master Python Basics',
    10,
    2,
    20,
    false
  )
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 6. CREATE AI INTERACTIONS
  -- ============================================================
  INSERT INTO ai_interactions (
    user_id, course_id, interaction_type, 
    prompt, response, created_at
  ) 
  SELECT 
    test_user_id,
    course_1_id,
    'question',
    'Can you explain how useEffect cleanup works?',
    'useEffect cleanup functions run when the component unmounts or before the effect runs again...',
    NOW() - (random() * INTERVAL '7 days')
  FROM generate_series(1, 5)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test data created successfully for user: %', test_user_id;
  RAISE NOTICE 'Enrolled in courses: %, %, %', course_1_id, course_2_id, course_3_id;
  
END $$;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Check the data was created:
SELECT 
  'Enrollments created:' as check,
  COUNT(*) as count 
FROM enrollments 
WHERE user_id IN (SELECT id FROM auth.users LIMIT 1);

SELECT 
  'Video progress records:' as check,
  COUNT(*) as count 
FROM video_progress 
WHERE user_id IN (SELECT id FROM auth.users LIMIT 1);

SELECT 
  'Learning milestones:' as check,
  COUNT(*) as count 
FROM learning_milestones 
WHERE user_id IN (SELECT id FROM auth.users LIMIT 1);
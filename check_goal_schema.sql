-- Check if required tables and columns exist for goal-based course access
-- Run these queries in Supabase SQL Editor

-- 1. Check if course_goal_assignments table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'course_goal_assignments'
);

-- 2. Check if profiles table has current_goal_id column
SELECT EXISTS (
   SELECT FROM information_schema.columns
   WHERE table_schema = 'public'
   AND table_name = 'profiles'
   AND column_name = 'current_goal_id'
);

-- 3. Check if track_goals table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'track_goals'
);

-- 4. Get all tables related to goals/tracks
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%goal%'
OR table_name LIKE '%track%';

-- 5. Show profiles table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 6. Show courses table structure (to verify goal_id column)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'courses'
ORDER BY ordinal_position;
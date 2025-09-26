
-- Check the actual data structure for instructor-student relationships
-- Option 1: Look for instructor_id in user_track_assignments
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'user_track_assignments'
ORDER BY ordinal_position;

-- Option 2: Check if there's an instructor_students table
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%instructor%' OR table_name LIKE '%student%');

-- Option 3: Check all user_track_assignments data to understand the model
SELECT id, user_id, status, assigned_at, instructor_id
FROM user_track_assignments 
LIMIT 10;


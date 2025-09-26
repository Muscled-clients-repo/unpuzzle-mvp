-- Test if we can access the specific profile that should exist
SELECT id, full_name, email, current_goal_id, role
FROM profiles
WHERE id = '28a603f0-f9ac-42b8-a5b1-9dd632dc74d6';

-- Check if there are OTHER student profiles
SELECT id, full_name, email, current_goal_id, role
FROM profiles
WHERE role = 'student'
LIMIT 10;

-- Check if there are instructor profiles
SELECT id, full_name, email, current_goal_id, role
FROM profiles
WHERE role = 'instructor'
LIMIT 5;
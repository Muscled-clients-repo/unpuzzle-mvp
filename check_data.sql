
-- Check what profiles data exists
SELECT id, full_name, email, role, current_goal_id 
FROM profiles 
LIMIT 10;

-- Check the user_track_assignments data
SELECT id, user_id, status, assigned_at 
FROM user_track_assignments 
WHERE status = 'active';


-- Check if user 28a603f0-f9ac-42b8-a5b1-9dd632dc74d6 has any activities

-- 1. Check community_activities for this user
SELECT 'community_activities' as table_name, COUNT(*) as count
FROM community_activities
WHERE user_id = '28a603f0-f9ac-42b8-a5b1-9dd632dc74d6'
UNION ALL
-- 2. Check reflections for this user
SELECT 'reflections', COUNT(*)
FROM reflections
WHERE user_id = '28a603f0-f9ac-42b8-a5b1-9dd632dc74d6'
UNION ALL
-- 3. Check quiz_attempts for this user
SELECT 'quiz_attempts', COUNT(*)
FROM quiz_attempts
WHERE user_id = '28a603f0-f9ac-42b8-a5b1-9dd632dc74d6'
UNION ALL
-- 4. Check video_ai_conversations for this user
SELECT 'video_ai_conversations', COUNT(*)
FROM video_ai_conversations
WHERE user_id = '28a603f0-f9ac-42b8-a5b1-9dd632dc74d6';

-- 5. Check total activities in database
SELECT 'TOTAL community_activities' as info, COUNT(*) as count
FROM community_activities;

-- 6. Show sample activities if any exist
SELECT
  user_id,
  activity_type,
  LEFT(content, 50) as content,
  created_at
FROM community_activities
WHERE user_id = '28a603f0-f9ac-42b8-a5b1-9dd632dc74d6'
LIMIT 10;

-- 7. Check if this user exists in profiles
SELECT 'User exists in profiles:' as info, COUNT(*) as count
FROM profiles
WHERE id = '28a603f0-f9ac-42b8-a5b1-9dd632dc74d6';

-- 8. Show user's current goal
SELECT
  id,
  full_name,
  email,
  current_goal_id,
  goal_title
FROM profiles
WHERE id = '28a603f0-f9ac-42b8-a5b1-9dd632dc74d6';

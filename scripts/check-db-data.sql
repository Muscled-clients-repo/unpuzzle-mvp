-- Quick check of what data exists in the database

-- 1. Check community_activities table
SELECT 'Total activities:' as check_name, COUNT(*) as count FROM community_activities
UNION ALL
SELECT 'Reflections:', COUNT(*) FROM reflections
UNION ALL
SELECT 'Quiz attempts:', COUNT(*) FROM quiz_attempts
UNION ALL
SELECT 'AI conversations:', COUNT(*) FROM video_ai_conversations
UNION ALL
SELECT 'Course completions (100%):', COUNT(*) FROM enrollments WHERE progress_percent >= 100
UNION ALL
SELECT 'Daily notes:', COUNT(*) FROM user_daily_notes
UNION ALL
SELECT 'Revenue submissions:', COUNT(*) FROM conversation_messages WHERE message_type = 'revenue_submission';

-- 2. Check if any activities exist
SELECT
  activity_type,
  COUNT(*) as count
FROM community_activities
GROUP BY activity_type
ORDER BY count DESC;

-- 3. Check sample activity
SELECT
  id,
  user_id,
  activity_type,
  LEFT(content, 50) as content_preview,
  created_at
FROM community_activities
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check if current user has any reflections/quizzes
SELECT
  'User has reflections:' as check,
  COUNT(*) as count
FROM reflections
WHERE user_id IN (SELECT id FROM profiles LIMIT 5);

-- Check Views Usage - Updated Analysis
-- Views don't store data, they're just saved queries

-- Step 1: List all conversation-related views
SELECT
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE '%conversation%'
ORDER BY viewname;

-- Step 2: Check what tables the views are built on
SELECT
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('active_goal_conversations', 'conversation_timeline');

-- Step 3: Test if views return any data
SELECT 'active_goal_conversations' as view_name, COUNT(*) as record_count
FROM active_goal_conversations
UNION ALL
SELECT 'conversation_timeline' as view_name, COUNT(*) as record_count
FROM conversation_timeline;

-- Step 4: Check view access statistics (views don't have insert/update/delete stats)
-- Views are just queries, so we can only check if they exist and work
SELECT
  'Views are just saved queries - no usage stats available' as note,
  'Use steps 1-3 above to analyze view definitions and data' as recommendation;
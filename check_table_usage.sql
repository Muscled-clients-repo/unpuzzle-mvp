-- Database Table Usage Analysis
-- Run these queries in Supabase SQL Editor to check table record counts

-- Check record counts for all conversation-related tables
SELECT
  'active_goal_conversations' as table_name,
  COUNT(*) as record_count
FROM active_goal_conversations
UNION ALL
SELECT
  'conversation_attachments' as table_name,
  COUNT(*) as record_count
FROM conversation_attachments
UNION ALL
SELECT
  'conversation_messages' as table_name,
  COUNT(*) as record_count
FROM conversation_messages
UNION ALL
SELECT
  'conversation_timeline' as table_name,
  COUNT(*) as record_count
FROM conversation_timeline
UNION ALL
SELECT
  'conversations' as table_name,
  COUNT(*) as record_count
FROM conversations
UNION ALL
SELECT
  'goal_conversations' as table_name,
  COUNT(*) as record_count
FROM goal_conversations
ORDER BY record_count DESC;

-- Check for any recent activity (last 30 days) in these tables
SELECT
  'active_goal_conversations' as table_name,
  COUNT(*) as recent_records
FROM active_goal_conversations
WHERE created_at > NOW() - INTERVAL '30 days'
UNION ALL
SELECT
  'conversation_attachments' as table_name,
  COUNT(*) as recent_records
FROM conversation_attachments
WHERE created_at > NOW() - INTERVAL '30 days'
UNION ALL
SELECT
  'conversation_messages' as table_name,
  COUNT(*) as recent_records
FROM conversation_messages
WHERE created_at > NOW() - INTERVAL '30 days'
UNION ALL
SELECT
  'conversation_timeline' as table_name,
  COUNT(*) as recent_records
FROM conversation_timeline
WHERE created_at > NOW() - INTERVAL '30 days'
UNION ALL
SELECT
  'conversations' as table_name,
  COUNT(*) as recent_records
FROM conversations
WHERE created_at > NOW() - INTERVAL '30 days'
UNION ALL
SELECT
  'goal_conversations' as table_name,
  COUNT(*) as recent_records
FROM goal_conversations
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY recent_records DESC;

-- Check if any tables are completely empty
SELECT
  schemaname,
  relname as table_name,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE relname LIKE '%conversation%'
ORDER BY live_rows ASC;
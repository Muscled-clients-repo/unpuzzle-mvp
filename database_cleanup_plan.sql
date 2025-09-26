-- Database Cleanup Plan for Conversation Tables
-- Based on analysis results

-- Step 1: Check if missing tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('active_goal_conversations', 'conversation_timeline')
ORDER BY table_name;

-- Step 2: Verify conversations table is truly empty before deletion
SELECT COUNT(*) as total_records FROM conversations;

-- Step 3: Check for any foreign key dependencies on conversations table
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'conversations';

-- Step 4: Cleanup commands (run if safe)
-- VACUUM FULL goal_conversations;  -- Cleanup 49 dead rows
-- VACUUM FULL conversation_messages;  -- Cleanup 35 dead rows
-- DROP TABLE IF EXISTS conversations CASCADE;  -- Only if no dependencies found

-- Step 5: Check what's using conversations table in code vs reality
-- Since conversations is empty but used in code, we may need to:
-- 1. Remove code references, OR
-- 2. Start using the table properly
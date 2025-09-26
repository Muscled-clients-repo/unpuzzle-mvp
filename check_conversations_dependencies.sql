-- Find what's depending on conversations table

-- Check foreign key constraints that reference conversations
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'conversations';

-- Check if any views depend on conversations table
SELECT
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%conversations%'
  AND definition NOT ILIKE '%goal_conversations%'
  AND definition NOT ILIKE '%conversation_messages%'
  AND definition NOT ILIKE '%conversation_attachments%';

-- Check if any functions depend on conversations
SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition ILIKE '%conversations%'
  AND routine_definition NOT ILIKE '%goal_conversations%';
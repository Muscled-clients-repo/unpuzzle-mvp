-- Check dependencies for ai_interactions and ai_video_content tables

-- Check foreign key constraints that reference these tables
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name IN ('ai_interactions', 'ai_video_content');

-- Check if any views depend on these tables
SELECT
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND (definition ILIKE '%ai_interactions%' OR definition ILIKE '%ai_video_content%');

-- Check table structures to see what they were supposed to store
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('ai_interactions', 'ai_video_content')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
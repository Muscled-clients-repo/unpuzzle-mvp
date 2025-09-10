-- Check actual data types in your database tables
-- Run this in Supabase SQL Editor to see the real column types

-- Check media_files table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'media_files' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check courses table structure  
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'courses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check what auth.uid() returns
SELECT auth.uid(), pg_typeof(auth.uid()) as auth_uid_type;
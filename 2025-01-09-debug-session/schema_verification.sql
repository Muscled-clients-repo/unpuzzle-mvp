-- Schema Verification Queries
-- Run these to get concrete facts about data types instead of making assumptions

-- 1. Check media_files table schema
SELECT 
  'media_files' as table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'media_files' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check courses table schema  
SELECT 
  'courses' as table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'courses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check videos table schema
SELECT 
  'videos' as table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'videos' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check course_chapters table schema
SELECT 
  'course_chapters' as table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'course_chapters' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check auth.uid() return type and value
SELECT 
  'auth_uid_info' as info_type,
  auth.uid() as auth_uid_value,
  pg_typeof(auth.uid()) as auth_uid_type;

-- 6. Check if tables exist
SELECT 
  schemaname,
  tablename
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('media_files', 'courses', 'videos', 'course_chapters')
ORDER BY tablename;
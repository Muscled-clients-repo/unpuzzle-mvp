-- Check what RLS policies are still active on profiles table
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Check if there are still circular references
-- Based on the logs, these are the policies causing issues:

-- Temporarily disable ALL RLS policies on profiles table
-- This will allow the query to work while we investigate

DROP POLICY IF EXISTS "Users can update own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Check if RLS is enabled on profiles
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- Test the profiles query after dropping policies
SELECT id, full_name, email, current_goal_id
FROM profiles
LIMIT 5;
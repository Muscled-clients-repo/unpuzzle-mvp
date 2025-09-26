-- Part 1: Drop conversations table with all its dependencies
-- Run this first

-- Step 1: Drop all RLS policies on conversations table
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Instructors can view student conversations" ON conversations;
DROP POLICY IF EXISTS "Students can view own conversations" ON conversations;

-- Step 2: Drop any indexes on conversations table
DROP INDEX IF EXISTS idx_conversations_student_id;
DROP INDEX IF EXISTS idx_conversations_instructor_id;
DROP INDEX IF EXISTS idx_conversations_created_at;
DROP INDEX IF EXISTS idx_conversations_status;

-- Step 3: Drop any triggers on conversations table
DROP TRIGGER IF EXISTS conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS handle_conversations_updated_at ON conversations;

-- Step 4: Now drop the table with CASCADE to force removal
DROP TABLE conversations CASCADE;
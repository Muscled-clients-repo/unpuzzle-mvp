-- Fix quiz_attempts RLS policies to match working pattern from other tables
-- Drop existing complex policies from migration 044
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can update own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Instructors can view course quiz attempts" ON quiz_attempts;

-- Drop and recreate the simple policy (in case it exists from migration 008)
DROP POLICY IF EXISTS "Users manage own quiz attempts" ON quiz_attempts;

-- Create simple, working policy that matches reflections table pattern
CREATE POLICY "Users manage own quiz attempts" ON quiz_attempts
  FOR ALL USING (auth.uid() = user_id);
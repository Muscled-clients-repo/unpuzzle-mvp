-- Fix RLS policy for soft deleting community posts
-- Problem: Multiple UPDATE policies were conflicting
-- Solution: Drop ALL existing UPDATE policies and create ONE clean policy

-- Drop ALL existing update policies (including duplicates)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'community_posts'
        AND cmd = 'UPDATE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON community_posts', pol.policyname);
    END LOOP;
END $$;

-- Create ONE clean update policy
-- Users can update their own posts (includes soft delete)
CREATE POLICY "Users can update their own posts"
  ON community_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

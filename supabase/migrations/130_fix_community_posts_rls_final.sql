-- Final fix for community_posts RLS policies
-- Root cause: UPDATE policy needs explicit WITH CHECK that allows deleted_at changes
-- The USING clause checks the OLD row, WITH CHECK checks the NEW row
-- When setting deleted_at, the NEW row still has the same author_id, so it should pass

DROP POLICY IF EXISTS "community_posts_update_policy" ON community_posts;

-- Create UPDATE policy with explicit WITH CHECK
-- WITH CHECK: Allow update as long as author_id remains unchanged in NEW row
CREATE POLICY "community_posts_update_policy" ON community_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

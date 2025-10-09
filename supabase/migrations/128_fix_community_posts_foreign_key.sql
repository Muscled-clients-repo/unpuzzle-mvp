-- Change foreign key from auth.users to profiles
-- This allows Supabase PostgREST to join community_posts with profiles directly

-- First, drop the existing FK to auth.users
ALTER TABLE community_posts
  DROP CONSTRAINT IF EXISTS community_posts_author_id_fkey;

-- Add new FK to profiles instead
-- This works because profiles.id references auth.users.id with the same UUID
ALTER TABLE community_posts
  ADD CONSTRAINT community_posts_author_id_fkey
  FOREIGN KEY (author_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

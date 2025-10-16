-- Migration 141: Update RLS Policies for Featured Students
-- Purpose: Allow public access to featured students' goal timeline data
-- Date: 2025-10-16

-- ============================================================
-- STEP 1: Allow public read access to featured students in profiles
-- ============================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public can view featured students" ON profiles;

-- Create policy to allow anyone to view featured students' basic info
CREATE POLICY "Public can view featured students"
ON profiles FOR SELECT
USING (is_featured = true);

-- ============================================================
-- STEP 2: Allow public read access to featured students' activities
-- ============================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public can view featured students' activities" ON community_activities;

-- Create policy to allow anyone to view activities of featured students
CREATE POLICY "Public can view featured students' activities"
ON community_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = community_activities.user_id
    AND profiles.is_featured = true
  )
);

-- ============================================================
-- STEP 3: Verification
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 141 Complete - Featured Students RLS Updated';
  RAISE NOTICE 'Public access granted for:';
  RAISE NOTICE '  - Featured students profiles (SELECT)';
  RAISE NOTICE '  - Featured students activities (SELECT)';
  RAISE NOTICE 'Anyone (including guests) can now view featured students goal timelines';
END $$;

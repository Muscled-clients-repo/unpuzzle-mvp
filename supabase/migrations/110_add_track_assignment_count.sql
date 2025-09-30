-- Migration: Add track assignment counter to profiles
-- Date: 2025-09-30
-- Description: Track number of times a user has been assigned a track
--              to differentiate new signups (count=0) from track changes (count>=1)

-- =============================================================================
-- ADD TRACK ASSIGNMENT COUNT COLUMN
-- =============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS track_assignment_count INTEGER DEFAULT 0;

-- Set existing users with a track to count 1
UPDATE profiles
SET track_assignment_count = 1
WHERE current_track_id IS NOT NULL
  AND track_assignment_count = 0;

-- Add index for filtering queries
CREATE INDEX IF NOT EXISTS idx_profiles_track_assignment_count
ON profiles(track_assignment_count);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    -- Check if column was added
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'track_assignment_count'
    ) THEN
        RAISE NOTICE '✓ track_assignment_count column added to profiles';
    END IF;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'TRACK ASSIGNMENT COUNTER SETUP COMPLETE';
    RAISE NOTICE '• track_assignment_count = 0: New user (New Signups tab)';
    RAISE NOTICE '• track_assignment_count >= 1: Existing user (Track Changes tab)';
    RAISE NOTICE '• Counter increments each time track is assigned';
    RAISE NOTICE '=============================================================================';
END $$;

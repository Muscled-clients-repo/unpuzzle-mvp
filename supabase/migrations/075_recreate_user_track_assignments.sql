-- Migration: Recreate user_track_assignments table and add current goal fields to profiles
-- Date: 2025-09-24
-- Description: Recreate user_track_assignments + add current goal fields to profiles for performance
-- Risk Level: LOW - Creating table and adding denormalized fields for fast community/goal access

-- =============================================================================
-- RECREATE USER TRACK ASSIGNMENTS TABLE
-- =============================================================================

-- Create dedicated track assignments table (recreating from migration 070)
CREATE TABLE IF NOT EXISTS user_track_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES track_goals(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'changed', 'abandoned')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_user_track_assignments_user ON user_track_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_track_assignments_active ON user_track_assignments(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_track_assignments_track ON user_track_assignments(track_id, status);
CREATE INDEX IF NOT EXISTS idx_user_track_assignments_goal ON user_track_assignments(goal_id, status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_track_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS trigger_user_track_assignments_updated_at ON user_track_assignments;
CREATE TRIGGER trigger_user_track_assignments_updated_at
    BEFORE UPDATE ON user_track_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_user_track_assignments_updated_at();

-- =============================================================================
-- ADD CURRENT GOAL FIELDS BACK TO PROFILES TABLE
-- =============================================================================

-- Add current goal tracking fields to profiles for fast community/goal displays
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS current_goal_id UUID REFERENCES track_goals(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS current_track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS goal_assigned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS track_assigned_at TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_current_goal ON profiles(current_goal_id) WHERE current_goal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_current_track ON profiles(current_track_id) WHERE current_track_id IS NOT NULL;

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on the table
ALTER TABLE user_track_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own assignments
DROP POLICY IF EXISTS "users_can_read_own_assignments" ON user_track_assignments;
CREATE POLICY "users_can_read_own_assignments" ON user_track_assignments
    FOR SELECT USING (user_id = auth.uid());

-- Policy: Users can insert their own assignments
DROP POLICY IF EXISTS "users_can_insert_own_assignments" ON user_track_assignments;
CREATE POLICY "users_can_insert_own_assignments" ON user_track_assignments
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own assignments
DROP POLICY IF EXISTS "users_can_update_own_assignments" ON user_track_assignments;
CREATE POLICY "users_can_update_own_assignments" ON user_track_assignments
    FOR UPDATE USING (user_id = auth.uid());

-- Policy: Instructors can read all assignments for their students
DROP POLICY IF EXISTS "instructors_can_read_student_assignments" ON user_track_assignments;
CREATE POLICY "instructors_can_read_student_assignments" ON user_track_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'instructor'
        )
    );

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    -- Verify table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'user_track_assignments' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✓ user_track_assignments table created successfully';
    ELSE
        RAISE WARNING '! user_track_assignments table creation failed';
    END IF;

    -- Verify indexes exist
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'user_track_assignments'
        AND indexname = 'idx_user_track_assignments_user'
    ) THEN
        RAISE NOTICE '✓ Performance indexes created successfully';
    ELSE
        RAISE WARNING '! Index creation may have failed';
    END IF;

    -- Verify profile columns were added
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'current_goal_id'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✓ Profile current goal fields added successfully';
    ELSE
        RAISE WARNING '! Profile column additions may have failed';
    END IF;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'HYBRID GOAL TRACKING ARCHITECTURE IMPLEMENTED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Tables Created:';
    RAISE NOTICE '• user_track_assignments - Full assignment history & relationships';
    RAISE NOTICE '• profiles.current_goal_id - Denormalized current goal for fast reads';
    RAISE NOTICE '• profiles.current_track_id - Denormalized current track for fast reads';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Performance Benefits:';
    RAISE NOTICE '• Community posts can show goals without JOIN operations';
    RAISE NOTICE '• Instructor dashboard gets detailed assignment history';
    RAISE NOTICE '• Student pages get fast current goal access';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Architecture:';
    RAISE NOTICE '• Normalized: user_track_assignments (history, relationships, analytics)';
    RAISE NOTICE '• Denormalized: profiles columns (current state, community display)';
    RAISE NOTICE '• Security: RLS enabled on both tables';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Test instructor student-goals page functionality';
    RAISE NOTICE '2. Test student goal displays in community posts';
    RAISE NOTICE '3. Verify goal assignment flows work end-to-end';
    RAISE NOTICE '=============================================================================';
END $$;
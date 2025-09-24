-- Migration: Phase 2.3 - Move Track Assignments from Profiles to Dedicated Table
-- Date: 2025-09-23
-- Description: Move track assignment fields from profiles table to dedicated user_track_assignments table
-- Risk Level: LOW - Simple data migration with fallback preservation

-- =============================================================================
-- PHASE 2.3: PROFILES TABLE TRACK ASSIGNMENT CLEANUP
-- =============================================================================

-- Create dedicated track assignments table
CREATE TABLE user_track_assignments (
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
CREATE INDEX idx_user_track_assignments_user ON user_track_assignments(user_id);
CREATE INDEX idx_user_track_assignments_active ON user_track_assignments(user_id, status) WHERE status = 'active';
CREATE INDEX idx_user_track_assignments_track ON user_track_assignments(track_id, status);

-- =============================================================================
-- DATA MIGRATION
-- =============================================================================

-- Migrate existing track assignments from profiles table
DO $$
DECLARE
    migrated_count INTEGER := 0;
BEGIN
    -- Insert active track assignments from profiles
    INSERT INTO user_track_assignments (user_id, track_id, goal_id, assigned_at, status)
    SELECT
        id,
        current_track_id,
        current_goal_id,
        COALESCE(track_assigned_at, created_at), -- Use track_assigned_at if available, otherwise created_at
        'active'
    FROM profiles
    WHERE current_track_id IS NOT NULL;

    GET DIAGNOSTICS migrated_count = ROW_COUNT;

    RAISE NOTICE 'Migrated % track assignments from profiles to user_track_assignments', migrated_count;
END $$;

-- =============================================================================
-- BACKUP CURRENT PROFILE TRACK DATA
-- =============================================================================

-- Create backup of current profile track assignments before removal
CREATE TABLE backup_profiles_track_data_20250923 AS
SELECT
    id,
    current_track_id,
    current_goal_id,
    track_assigned_at,
    goal_assigned_at,
    created_at
FROM profiles
WHERE current_track_id IS NOT NULL OR current_goal_id IS NOT NULL;

-- =============================================================================
-- DROP COLUMNS WITH CASCADE (DROPS DEPENDENT POLICIES AUTOMATICALLY)
-- =============================================================================

-- Remove track assignment columns from profiles table using CASCADE
-- This will automatically drop any dependent policies
ALTER TABLE profiles DROP COLUMN IF EXISTS current_track_id CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS current_goal_id CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS track_assigned_at CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS goal_assigned_at CASCADE;

-- =============================================================================
-- RECREATE POLICIES USING NEW ASSIGNMENT TABLE
-- =============================================================================

-- Recreate video access policy using new assignment table
CREATE POLICY "Students can read videos for their assigned track courses" ON videos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_track_assignments uta
            JOIN course_goal_assignments cga ON uta.goal_id = cga.goal_id
            WHERE uta.user_id = auth.uid()
            AND uta.status = 'active'
            AND cga.course_id = videos.course_id
        )
    );

-- Recreate video transcripts policy using new assignment table
CREATE POLICY "students_read_goal_matched_transcripts" ON video_transcripts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_track_assignments uta
            JOIN course_goal_assignments cga ON uta.goal_id = cga.goal_id
            JOIN videos v ON v.course_id = cga.course_id
            WHERE uta.user_id = auth.uid()
            AND uta.status = 'active'
            AND v.id = video_transcripts.video_id
        )
    );

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify migration success
DO $$
DECLARE
    profile_track_count INTEGER;
    assignment_count INTEGER;
    backup_count INTEGER;
BEGIN
    -- Check if track columns still exist in profiles
    SELECT COUNT(*) INTO profile_track_count
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name IN ('current_track_id', 'current_goal_id', 'track_assigned_at', 'goal_assigned_at');

    -- Count assignments in new table
    SELECT COUNT(*) INTO assignment_count FROM user_track_assignments;

    -- Count backup records
    SELECT COUNT(*) INTO backup_count FROM backup_profiles_track_data_20250923;

    RAISE NOTICE 'Profile track columns remaining: %', profile_track_count;
    RAISE NOTICE 'Track assignments in new table: %', assignment_count;
    RAISE NOTICE 'Backup records created: %', backup_count;

    -- Verify successful column removal
    IF profile_track_count = 0 THEN
        RAISE NOTICE '✓ All track assignment columns successfully removed from profiles';
    ELSE
        RAISE WARNING 'Some track columns still exist in profiles table';
    END IF;

    -- Verify data migration
    IF assignment_count > 0 THEN
        RAISE NOTICE '✓ Track assignments successfully migrated to dedicated table';
    ELSE
        RAISE NOTICE 'No active track assignments found to migrate';
    END IF;
END $$;

-- =============================================================================
-- UPDATE TRIGGER FOR TIMESTAMPS
-- =============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_track_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
CREATE TRIGGER trigger_user_track_assignments_updated_at
    BEFORE UPDATE ON user_track_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_user_track_assignments_updated_at();

-- =============================================================================
-- LOG SCHEMA CHANGE
-- =============================================================================

-- Log this migration in schema_changes table
INSERT INTO public.schema_changes (
    change_type,
    description,
    tables_affected,
    estimated_impact,
    created_at
) VALUES (
    'table_creation_column_removal',
    'Phase 2.3: Moved track assignments from profiles table to dedicated user_track_assignments table',
    2,
    'Improved data organization, better track assignment history tracking, cleaner profiles table',
    NOW()
);

-- =============================================================================
-- PERFORMANCE IMPACT ANALYSIS
-- =============================================================================

DO $$
DECLARE
    profile_columns_before INTEGER := 4; -- track columns removed
    assignment_indexes INTEGER := 3; -- indexes created
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'PHASE 2.3: PROFILES TRACK ASSIGNMENT CLEANUP COMPLETED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'New Table Created: user_track_assignments';
    RAISE NOTICE 'Columns Removed from Profiles: % (current_track_id, current_goal_id, track_assigned_at, goal_assigned_at)', profile_columns_before;
    RAISE NOTICE 'Performance Indexes Added: %', assignment_indexes;
    RAISE NOTICE 'Track Assignment History: Now supported with status tracking';
    RAISE NOTICE 'Data Integrity: Foreign key constraints with CASCADE/SET NULL protection';
    RAISE NOTICE 'Backup Created: backup_profiles_track_data_20250923';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'BENEFITS:';
    RAISE NOTICE '✓ Cleaner profiles table focused on user data only';
    RAISE NOTICE '✓ Dedicated track assignment history tracking';
    RAISE NOTICE '✓ Support for assignment status (active, changed, abandoned)';
    RAISE NOTICE '✓ Optimized indexes for track assignment queries';
    RAISE NOTICE '✓ Better data organization and future extensibility';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'QUERY PATTERNS:';
    RAISE NOTICE '- Get user current track: SELECT * FROM user_track_assignments WHERE user_id = ? AND status = ''active''';
    RAISE NOTICE '- Track assignment history: SELECT * FROM user_track_assignments WHERE user_id = ? ORDER BY created_at DESC';
    RAISE NOTICE '- Users on track: SELECT * FROM user_track_assignments WHERE track_id = ? AND status = ''active''';
    RAISE NOTICE '=============================================================================';
END $$;
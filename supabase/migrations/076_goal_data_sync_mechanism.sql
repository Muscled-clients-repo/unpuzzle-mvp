-- Migration: Goal Data Sync Mechanism
-- Date: 2025-09-24
-- Description: Create triggers to keep profiles and user_track_assignments in sync
-- Risk Level: LOW - Adding automation to prevent data drift

-- =============================================================================
-- HELPER FUNCTION: SYNC PROFILE WHEN ASSIGNMENT BECOMES INACTIVE
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_user_profile_on_inactive(target_user_id UUID, excluded_assignment_id UUID)
RETURNS VOID AS $$
DECLARE
    next_active_assignment RECORD;
BEGIN
    -- Check if there's another active assignment
    SELECT * INTO next_active_assignment
    FROM user_track_assignments
    WHERE user_id = target_user_id
    AND id != excluded_assignment_id
    AND status = 'active'
    ORDER BY assigned_at DESC
    LIMIT 1;

    IF FOUND THEN
        -- Update profile with next active assignment
        UPDATE profiles
        SET
            current_goal_id = next_active_assignment.goal_id,
            current_track_id = next_active_assignment.track_id,
            goal_assigned_at = next_active_assignment.assigned_at,
            track_assigned_at = next_active_assignment.assigned_at
        WHERE id = target_user_id;

        RAISE NOTICE 'Profile updated: User % switched to goal %', target_user_id, next_active_assignment.goal_id;
    ELSE
        -- No other active assignments, clear profile goal data
        UPDATE profiles
        SET
            current_goal_id = NULL,
            current_track_id = NULL,
            goal_assigned_at = NULL,
            track_assigned_at = NULL
        WHERE id = target_user_id;

        RAISE NOTICE 'Profile cleared: User % has no active goals', target_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SYNC FUNCTION: UPDATE PROFILES WHEN TRACK ASSIGNMENTS CHANGE
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_profile_goal_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT: Set current goal in profile when new active assignment created
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE profiles
        SET
            current_goal_id = NEW.goal_id,
            current_track_id = NEW.track_id,
            goal_assigned_at = NEW.assigned_at,
            track_assigned_at = NEW.assigned_at
        WHERE id = NEW.user_id;

        -- Clear any other active assignments for this user (only one active goal at a time)
        UPDATE user_track_assignments
        SET status = 'changed'
        WHERE user_id = NEW.user_id
        AND id != NEW.id
        AND status = 'active';

        RAISE NOTICE 'Profile updated: User % assigned goal %', NEW.user_id, NEW.goal_id;
        RETURN NEW;
    END IF;

    -- Handle UPDATE: Update profile if assignment becomes active/inactive
    IF TG_OP = 'UPDATE' THEN
        -- If assignment became active
        IF NEW.status = 'active' AND OLD.status != 'active' THEN
            UPDATE profiles
            SET
                current_goal_id = NEW.goal_id,
                current_track_id = NEW.track_id,
                goal_assigned_at = NEW.assigned_at,
                track_assigned_at = NEW.assigned_at
            WHERE id = NEW.user_id;

            -- Clear other active assignments
            UPDATE user_track_assignments
            SET status = 'changed'
            WHERE user_id = NEW.user_id
            AND id != NEW.id
            AND status = 'active';

            RAISE NOTICE 'Profile updated: User % goal reactivated %', NEW.user_id, NEW.goal_id;
        END IF;

        -- If assignment became inactive
        IF NEW.status != 'active' AND OLD.status = 'active' THEN
            PERFORM sync_user_profile_on_inactive(NEW.user_id, NEW.id);
        END IF;

        RETURN NEW;
    END IF;

    -- Handle DELETE: Update profile when assignment deleted
    IF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        PERFORM sync_user_profile_on_inactive(OLD.user_id, OLD.id);
        RETURN OLD;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CREATE TRIGGERS
-- =============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_profile_goal_data ON user_track_assignments;

-- Create trigger for all operations
CREATE TRIGGER trigger_sync_profile_goal_data
    AFTER INSERT OR UPDATE OR DELETE ON user_track_assignments
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_goal_data();

-- =============================================================================
-- VALIDATION FUNCTION (Optional - for manual sync if needed)
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_profile_goal_sync()
RETURNS TABLE (
    user_id UUID,
    profile_goal_id UUID,
    assignment_goal_id UUID,
    sync_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as user_id,
        p.current_goal_id as profile_goal_id,
        uta.goal_id as assignment_goal_id,
        CASE
            WHEN p.current_goal_id = uta.goal_id THEN 'SYNCED'
            WHEN p.current_goal_id IS NULL AND uta.goal_id IS NULL THEN 'SYNCED_NULL'
            ELSE 'OUT_OF_SYNC'
        END as sync_status
    FROM profiles p
    LEFT JOIN user_track_assignments uta ON (
        p.id = uta.user_id
        AND uta.status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    -- Verify function exists
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'sync_profile_goal_data'
    ) THEN
        RAISE NOTICE '✓ Sync function created successfully';
    ELSE
        RAISE WARNING '! Sync function creation failed';
    END IF;

    -- Verify trigger exists
    IF EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trigger_sync_profile_goal_data'
    ) THEN
        RAISE NOTICE '✓ Sync trigger created successfully';
    ELSE
        RAISE WARNING '! Sync trigger creation failed';
    END IF;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'GOAL DATA SYNC MECHANISM IMPLEMENTED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Automatic Sync Features:';
    RAISE NOTICE '• New goal assignments → Update profiles.current_goal_id';
    RAISE NOTICE '• Goal status changes → Update profiles accordingly';
    RAISE NOTICE '• Goal deletions → Clear or reassign profile goal data';
    RAISE NOTICE '• One active goal per user → Automatically manage conflicts';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Usage:';
    RAISE NOTICE '• INSERT INTO user_track_assignments → Profiles auto-updated';
    RAISE NOTICE '• UPDATE user_track_assignments SET status → Profiles auto-synced';
    RAISE NOTICE '• SELECT * FROM validate_profile_goal_sync() → Check sync status';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Benefits:';
    RAISE NOTICE '• No manual sync needed when goals change';
    RAISE NOTICE '• Prevents data drift between tables';
    RAISE NOTICE '• Maintains referential integrity';
    RAISE NOTICE '• Supports complex goal transition workflows';
    RAISE NOTICE '=============================================================================';
END $$;
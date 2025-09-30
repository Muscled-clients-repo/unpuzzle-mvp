-- Migration: Reset Track Selection Data for Testing
-- Date: 2025-09-30
-- Description: Clears all track-related data to allow fresh testing of the complete flow
-- WARNING: This will DELETE data - only run in development/testing environments!

-- =============================================================================
-- SAFETY CHECK (Optional - uncomment to prevent accidental production run)
-- =============================================================================
-- DO $$
-- BEGIN
--     IF current_database() = 'production' THEN
--         RAISE EXCEPTION 'This migration should not run on production database!';
--     END IF;
-- END $$;

-- =============================================================================
-- FIX TRIGGER FIRST (It's still using old column name 'user_id' instead of 'student_id')
-- =============================================================================

-- Update the sync functions to use the new column name
CREATE OR REPLACE FUNCTION sync_user_profile_on_inactive(target_user_id UUID, excluded_assignment_id UUID)
RETURNS VOID AS $$
DECLARE
    next_active_assignment RECORD;
BEGIN
    -- Check if there's another active assignment
    SELECT * INTO next_active_assignment
    FROM student_track_assignments  -- Updated table name
    WHERE student_id = target_user_id  -- Updated column name
    AND id != excluded_assignment_id
    AND status = 'active'
    ORDER BY assigned_at DESC
    LIMIT 1;

    IF FOUND THEN
        -- Update profile with the next active goal
        UPDATE profiles
        SET current_goal_id = next_active_assignment.goal_id
        WHERE id = target_user_id;
    ELSE
        -- No other active assignments, clear the current goal
        UPDATE profiles
        SET current_goal_id = NULL
        WHERE id = target_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_profile_goal_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT: Set current goal in profile when new active assignment created
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE profiles
        SET current_goal_id = NEW.goal_id
        WHERE id = NEW.student_id;  -- Updated column name
        RETURN NEW;
    END IF;

    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- If assignment became active
        IF NEW.status = 'active' AND OLD.status != 'active' THEN
            UPDATE profiles
            SET current_goal_id = NEW.goal_id
            WHERE id = NEW.student_id;  -- Updated column name
        END IF;

        -- If assignment became inactive
        IF NEW.status != 'active' AND OLD.status = 'active' THEN
            PERFORM sync_user_profile_on_inactive(NEW.student_id, NEW.id);  -- Updated column name
        END IF;

        RETURN NEW;
    END IF;

    -- Handle DELETE: Update profile when assignment deleted
    IF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        PERFORM sync_user_profile_on_inactive(OLD.student_id, OLD.id);  -- Updated column name
        RETURN OLD;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger on the correct table
DROP TRIGGER IF EXISTS trigger_sync_profile_goal_data ON student_track_assignments;

CREATE TRIGGER trigger_sync_profile_goal_data
    AFTER INSERT OR UPDATE OR DELETE ON student_track_assignments
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_goal_data();

DO $$
BEGIN
    RAISE NOTICE '✓ Fixed trigger functions to use student_id instead of user_id';
END $$;

-- =============================================================================
-- CLEAR TRACK ASSIGNMENT DATA
-- =============================================================================

-- 1. Clear all student track assignments
DELETE FROM student_track_assignments;
DO $$
BEGIN
    RAISE NOTICE '✓ Cleared student_track_assignments table';
END $$;

-- 2. Reset current_goal_id AND current_track_id in profiles (keeps profiles intact)
UPDATE profiles
SET current_goal_id = NULL,
    current_track_id = NULL
WHERE current_goal_id IS NOT NULL
   OR current_track_id IS NOT NULL;

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✓ Reset current_goal_id and current_track_id for % profiles', updated_count;
END $$;

-- =============================================================================
-- CLEAR TRACK CHANGE REQUESTS
-- =============================================================================

-- 3. Clear all track change requests (keeps other request types)
DELETE FROM requests
WHERE request_type = 'track_change';

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '✓ Deleted % track change requests', deleted_count;
END $$;

-- =============================================================================
-- CLEAR CONVERSATION DATA
-- =============================================================================

-- 4. Clear conversation messages (must be done before conversations due to FK)
DELETE FROM conversation_messages
WHERE conversation_id IN (
    SELECT id FROM goal_conversations
);

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '✓ Deleted % conversation messages', deleted_count;
END $$;

-- 5. Clear goal conversations
DELETE FROM goal_conversations;

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '✓ Deleted % goal conversations', deleted_count;
END $$;

-- =============================================================================
-- CLEAR STUDENT PREFERENCES (Optional - uncomment if you want to reset these too)
-- =============================================================================

-- DELETE FROM student_preferences;
-- DO $$
-- DECLARE
--     deleted_count INTEGER;
-- BEGIN
--     GET DIAGNOSTICS deleted_count = ROW_COUNT;
--     RAISE NOTICE '✓ Deleted % student preference records', deleted_count;
-- END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    assignment_count INTEGER;
    profile_goal_count INTEGER;
    profile_track_count INTEGER;
    request_count INTEGER;
    conversation_count INTEGER;
    message_count INTEGER;
BEGIN
    -- Check remaining counts
    SELECT COUNT(*) INTO assignment_count FROM student_track_assignments;
    SELECT COUNT(*) INTO profile_goal_count FROM profiles WHERE current_goal_id IS NOT NULL;
    SELECT COUNT(*) INTO profile_track_count FROM profiles WHERE current_track_id IS NOT NULL;
    SELECT COUNT(*) INTO request_count FROM requests WHERE request_type = 'track_change';
    SELECT COUNT(*) INTO conversation_count FROM goal_conversations;
    SELECT COUNT(*) INTO message_count FROM conversation_messages;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'TRACK DATA RESET COMPLETE';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Verification:';
    RAISE NOTICE '  • Student track assignments: %', assignment_count;
    RAISE NOTICE '  • Profiles with goal set: %', profile_goal_count;
    RAISE NOTICE '  • Profiles with track set: %', profile_track_count;
    RAISE NOTICE '  • Track change requests: %', request_count;
    RAISE NOTICE '  • Goal conversations: %', conversation_count;
    RAISE NOTICE '  • Conversation messages: %', message_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for testing:';
    RAISE NOTICE '  ✓ Students can now select tracks from scratch';
    RAISE NOTICE '  ✓ Instructors will see no pending requests';
    RAISE NOTICE '  ✓ Track selection flow can be tested end-to-end';
    RAISE NOTICE '=============================================================================';
END $$;

-- =============================================================================
-- OPTIONAL: Insert Test Data (Uncomment to add sample data for testing)
-- =============================================================================

-- -- Ensure we have test tracks with default goals
-- DO $$
-- BEGIN
--     -- Verify Agency Track has a default goal
--     UPDATE track_goals
--     SET is_default = true
--     WHERE track_id = (SELECT id FROM tracks WHERE name = 'Agency Track')
--     AND name = '$1K Agency';
--
--     -- Verify SaaS Track has a default goal
--     UPDATE track_goals
--     SET is_default = true
--     WHERE track_id = (SELECT id FROM tracks WHERE name = 'SaaS Track')
--     AND name = '$1K SaaS MRR';
--
--     RAISE NOTICE '✓ Verified default goals are set for both tracks';
-- END $$;
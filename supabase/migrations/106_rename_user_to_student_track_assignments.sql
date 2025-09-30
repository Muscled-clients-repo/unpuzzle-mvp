-- Migration: Rename user_track_assignments to student_track_assignments
-- Date: 2025-09-30
-- Description: Rename table to match code expectations and simplify track selection
-- Risk Level: MEDIUM - Renaming table with data

-- =============================================================================
-- RENAME TABLE
-- =============================================================================

-- Rename the table
ALTER TABLE user_track_assignments RENAME TO student_track_assignments;

-- Rename user_id column to student_id for consistency
ALTER TABLE student_track_assignments RENAME COLUMN user_id TO student_id;

-- =============================================================================
-- UPDATE INDEXES
-- =============================================================================

-- Drop old indexes (they'll be recreated with new names)
DROP INDEX IF EXISTS idx_user_track_assignments_user;
DROP INDEX IF EXISTS idx_user_track_assignments_active;
DROP INDEX IF EXISTS idx_user_track_assignments_track;
DROP INDEX IF EXISTS idx_user_track_assignments_goal;

-- Create new indexes with updated names
CREATE INDEX idx_student_track_assignments_student ON student_track_assignments(student_id);
CREATE INDEX idx_student_track_assignments_active ON student_track_assignments(student_id, status) WHERE status = 'active';
CREATE INDEX idx_student_track_assignments_track ON student_track_assignments(track_id, status);
CREATE INDEX idx_student_track_assignments_goal ON student_track_assignments(goal_id, status);

-- =============================================================================
-- UPDATE RLS POLICIES
-- =============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "users_can_read_own_assignments" ON student_track_assignments;
DROP POLICY IF EXISTS "users_can_insert_own_assignments" ON student_track_assignments;
DROP POLICY IF EXISTS "users_can_update_own_assignments" ON student_track_assignments;
DROP POLICY IF EXISTS "instructors_can_read_student_assignments" ON student_track_assignments;

-- Create new policies with student_id
CREATE POLICY "students_can_read_own_assignments" ON student_track_assignments
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "students_can_insert_own_assignments" ON student_track_assignments
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "students_can_update_own_assignments" ON student_track_assignments
    FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "instructors_can_read_student_assignments" ON student_track_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'instructor'
        )
    );

-- =============================================================================
-- UPDATE TRIGGER FUNCTION
-- =============================================================================

-- Drop old trigger
DROP TRIGGER IF EXISTS trigger_user_track_assignments_updated_at ON student_track_assignments;

-- Create new trigger with updated name
CREATE TRIGGER trigger_student_track_assignments_updated_at
    BEFORE UPDATE ON student_track_assignments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    -- Verify table was renamed
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'student_track_assignments' AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✓ Table renamed to student_track_assignments successfully';
    ELSE
        RAISE WARNING '! Table rename failed';
    END IF;

    -- Verify column was renamed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'student_track_assignments'
        AND column_name = 'student_id'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✓ Column renamed to student_id successfully';
    ELSE
        RAISE WARNING '! Column rename failed';
    END IF;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'TABLE STRUCTURE AFTER MIGRATION:';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Table: student_track_assignments';
    RAISE NOTICE 'Columns:';
    RAISE NOTICE '  - id (UUID)';
    RAISE NOTICE '  - student_id (UUID) - renamed from user_id';
    RAISE NOTICE '  - track_id (UUID)';
    RAISE NOTICE '  - goal_id (UUID)';
    RAISE NOTICE '  - assigned_at (TIMESTAMP)';
    RAISE NOTICE '  - status (TEXT) - active/changed/abandoned';
    RAISE NOTICE '  - created_at (TIMESTAMP)';
    RAISE NOTICE '  - updated_at (TIMESTAMP)';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'CODE CHANGES NEEDED:';
    RAISE NOTICE '1. Remove references to non-existent columns:';
    RAISE NOTICE '   - assignment_type, confidence_score, assignment_source, assignment_reasoning';
    RAISE NOTICE '2. Map is_active to status=active';
    RAISE NOTICE '3. The table name now matches what the code expects';
    RAISE NOTICE '=============================================================================';
END $$;
-- Remove ghost foreign key constraints from deleted enrollments table
-- These constraints exist in system catalogs but table is gone

-- Safely drop ghost constraints (ignore errors if already gone)
DO $$
BEGIN
    -- Remove ghost course reference
    BEGIN
        ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_course_id_fkey;
        RAISE NOTICE 'Removed ghost constraint: enrollments_course_id_fkey';
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE 'enrollments table does not exist - constraint already gone';
        WHEN undefined_object THEN
            RAISE NOTICE 'Constraint enrollments_course_id_fkey does not exist';
    END;

    -- Remove ghost user reference
    BEGIN
        ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_user_id_fkey;
        RAISE NOTICE 'Removed ghost constraint: enrollments_user_id_fkey';
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE 'enrollments table does not exist - constraint already gone';
        WHEN undefined_object THEN
            RAISE NOTICE 'Constraint enrollments_user_id_fkey does not exist';
    END;

    RAISE NOTICE '🧹 Ghost constraint cleanup complete!';
END $$;
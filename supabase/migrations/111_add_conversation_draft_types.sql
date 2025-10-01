-- Migration: Add draft types for goal conversation system
-- Date: 2025-10-01
-- Description: Extend drafts table to support daily_note and instructor_response types

-- =============================================================================
-- UPDATE DRAFT TYPE CONSTRAINT
-- =============================================================================

-- Drop existing constraint
ALTER TABLE drafts
DROP CONSTRAINT IF EXISTS drafts_type_check;

-- Add new constraint with conversation draft types
ALTER TABLE drafts
ADD CONSTRAINT drafts_type_check
CHECK (type IN ('bug_report', 'feature_request', 'daily_note', 'instructor_response'));

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================='
    RAISE NOTICE 'DRAFT TYPES UPDATED'
    RAISE NOTICE '• bug_report: Bug report modal drafts'
    RAISE NOTICE '• feature_request: Feature request modal drafts'
    RAISE NOTICE '• daily_note: Student daily progress entry drafts'
    RAISE NOTICE '• instructor_response: Instructor feedback drafts'
    RAISE NOTICE '============================================================================='
END $$;

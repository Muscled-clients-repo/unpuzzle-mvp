-- Migration: Allow multiple goal conversations per student-instructor pair
-- Date: 2025-09-30
-- Description: Remove strict unique constraint and allow multiple conversations
--              Only enforce uniqueness for ACTIVE conversations

-- =============================================================================
-- DROP OLD CONSTRAINT
-- =============================================================================

-- Drop the old constraint that prevented multiple conversations
ALTER TABLE goal_conversations
DROP CONSTRAINT IF EXISTS unique_student_instructor_pair;

-- =============================================================================
-- ADD PARTIAL UNIQUE INDEX FOR ACTIVE CONVERSATIONS
-- =============================================================================

-- Allow multiple conversations per student-instructor pair
-- But only ONE can be 'active' at a time
-- This allows historical conversations to be preserved for review
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_student_instructor_conversation
ON goal_conversations (student_id, instructor_id)
WHERE status = 'active';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    -- Check if old constraint is removed
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_student_instructor_pair'
    ) THEN
        RAISE NOTICE '✓ Old unique constraint removed';
    END IF;

    -- Check if new index exists
    IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'unique_active_student_instructor_conversation'
    ) THEN
        RAISE NOTICE '✓ New partial unique index created for active conversations';
    END IF;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'GOAL CONVERSATIONS UPDATE COMPLETE';
    RAISE NOTICE '• Students can now have multiple conversations per instructor';
    RAISE NOTICE '• Each goal gets its own conversation';
    RAISE NOTICE '• Only one conversation can be active at a time';
    RAISE NOTICE '• Old conversations are preserved for review';
    RAISE NOTICE '=============================================================================';
END $$;

-- Migration: Rename drafts table to feedback_drafts
-- Date: 2025-10-01
-- Description: Rename drafts table to feedback_drafts to clarify its purpose
--              Remove daily_note and instructor_response types
--              Keep ONLY for bug_report and feature_request

-- =============================================================================
-- RENAME TABLE
-- =============================================================================

-- Rename the table
ALTER TABLE drafts RENAME TO feedback_drafts;

-- =============================================================================
-- UPDATE CONSTRAINT
-- =============================================================================

-- Drop old constraint
ALTER TABLE feedback_drafts
DROP CONSTRAINT IF EXISTS drafts_type_check;

-- Add new constraint with only bug_report and feature_request
ALTER TABLE feedback_drafts
ADD CONSTRAINT feedback_drafts_type_check
CHECK (type IN ('bug_report', 'feature_request'));

-- =============================================================================
-- CLEAN UP ANY CONVERSATION DRAFTS THAT MAY HAVE BEEN CREATED
-- =============================================================================

-- Delete any daily_note or instructor_response drafts (shouldn't exist, but clean up just in case)
DELETE FROM feedback_drafts
WHERE type IN ('daily_note', 'instructor_response');

-- =============================================================================
-- UPDATE INDEXES
-- =============================================================================

-- Rename indexes to match new table name
ALTER INDEX IF EXISTS drafts_pkey RENAME TO feedback_drafts_pkey;
ALTER INDEX IF EXISTS drafts_user_id_type_idx RENAME TO feedback_drafts_user_id_type_idx;

-- =============================================================================
-- UPDATE RLS POLICIES
-- =============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can manage own drafts" ON feedback_drafts;
DROP POLICY IF EXISTS "Users can view own drafts" ON feedback_drafts;

-- Create new policies with updated names
CREATE POLICY "Users can manage own feedback drafts"
ON feedback_drafts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count FROM feedback_drafts;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'TABLE RENAMED: drafts -> feedback_drafts';
    RAISE NOTICE '• Purpose: Bug reports and feature requests only';
    RAISE NOTICE '• Removed types: daily_note, instructor_response';
    RAISE NOTICE '• Kept types: bug_report, feature_request';
    RAISE NOTICE '• Remaining drafts in table: %', remaining_count;
    RAISE NOTICE '• Conversation drafts now live in conversation_messages.is_draft';
    RAISE NOTICE '=============================================================================';
END $$;

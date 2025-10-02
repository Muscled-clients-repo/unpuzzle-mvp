-- Migration: Add draft support to conversation_messages table (fixed)
-- Date: 2025-10-01
-- Description: Implement hybrid draft architecture where conversation messages can be saved as drafts

-- =============================================================================
-- ADD DRAFT AND VISIBILITY COLUMNS TO CONVERSATION_MESSAGES (IF NOT EXISTS)
-- =============================================================================

-- Add is_draft column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversation_messages' AND column_name = 'is_draft'
    ) THEN
        ALTER TABLE conversation_messages
        ADD COLUMN is_draft BOOLEAN DEFAULT FALSE NOT NULL;
        RAISE NOTICE 'Added is_draft column';
    ELSE
        RAISE NOTICE 'is_draft column already exists';
    END IF;
END $$;

-- Add visibility column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversation_messages' AND column_name = 'visibility'
    ) THEN
        ALTER TABLE conversation_messages
        ADD COLUMN visibility TEXT DEFAULT 'shared' NOT NULL
        CHECK (visibility IN ('private', 'shared'));
        RAISE NOTICE 'Added visibility column';
    ELSE
        RAISE NOTICE 'visibility column already exists';
    END IF;
END $$;

-- Create partial index for efficient draft queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_conversation_messages_drafts
ON conversation_messages(conversation_id, sender_id, is_draft)
WHERE is_draft = TRUE;

-- Create index for user's drafts across all conversations (if not exists)
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_drafts
ON conversation_messages(sender_id, is_draft)
WHERE is_draft = TRUE;

-- =============================================================================
-- UPDATE RLS POLICIES TO HANDLE DRAFTS
-- =============================================================================

-- Drop existing policies to recreate with draft support
DROP POLICY IF EXISTS "Users can view own messages and assigned conversation messages" ON conversation_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON conversation_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON conversation_messages;
DROP POLICY IF EXISTS "Students can view own and shared messages" ON conversation_messages;
DROP POLICY IF EXISTS "Instructors can view assigned conversation shared messages" ON conversation_messages;
DROP POLICY IF EXISTS "Users can delete own drafts" ON conversation_messages;

-- Students can view:
-- 1. Their own messages (including drafts and private notes)
-- 2. Shared messages from instructors in their conversations
CREATE POLICY "Students can view own and shared messages"
ON conversation_messages FOR SELECT
USING (
  sender_id = auth.uid()  -- Own messages (including drafts and private)
  OR
  (
    visibility = 'shared'  -- Only shared messages from others
    AND EXISTS (
      SELECT 1 FROM goal_conversations gc
      WHERE gc.id = conversation_messages.conversation_id
      AND gc.student_id = auth.uid()
    )
  )
);

-- Instructors can view shared messages in conversations they're assigned to
-- They CANNOT see students' private notes or drafts
CREATE POLICY "Instructors can view assigned conversation shared messages"
ON conversation_messages FOR SELECT
USING (
  visibility = 'shared'  -- Only shared messages
  AND is_draft = FALSE   -- No drafts
  AND EXISTS (
    SELECT 1 FROM goal_conversations gc
    JOIN profiles p ON p.id = auth.uid()
    WHERE gc.id = conversation_messages.conversation_id
    AND gc.instructor_id = auth.uid()
    AND p.role = 'instructor'
  )
);

-- Users can insert their own messages (including drafts)
CREATE POLICY "Users can insert own messages"
ON conversation_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM goal_conversations gc
    WHERE gc.id = conversation_messages.conversation_id
    AND (gc.student_id = auth.uid() OR gc.instructor_id = auth.uid())
  )
);

-- Users can update their own messages (only drafts and within time limit for non-drafts)
CREATE POLICY "Users can update own messages"
ON conversation_messages FOR UPDATE
USING (sender_id = auth.uid())
WITH CHECK (
  sender_id = auth.uid()
  AND (
    is_draft = TRUE  -- Can always update drafts
    OR
    updated_at > NOW() - INTERVAL '5 minutes'  -- Can update published messages for 5 minutes
  )
);

-- Users can delete their own draft messages
CREATE POLICY "Users can delete own drafts"
ON conversation_messages FOR DELETE
USING (sender_id = auth.uid() AND is_draft = TRUE);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'DRAFT AND VISIBILITY SUPPORT ADDED/UPDATED FOR CONVERSATION_MESSAGES';
    RAISE NOTICE '• is_draft column: %', (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_messages' AND column_name = 'is_draft'));
    RAISE NOTICE '• visibility column: %', (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_messages' AND column_name = 'visibility'));
    RAISE NOTICE '• RLS policies updated for draft and visibility support';
    RAISE NOTICE '=============================================================================';
END $$;

-- Add missing foreign key constraint for conversation_messages.sender_id -> profiles.id
-- Date: 2025-09-25
-- Description: Fix the relationship between conversation_messages and profiles tables

-- =============================================================================
-- ADD MISSING FOREIGN KEY CONSTRAINT
-- =============================================================================

-- Add foreign key constraint for sender_id -> profiles.id
-- This will allow Supabase to understand the relationship between tables
ALTER TABLE conversation_messages
ADD CONSTRAINT fk_conversation_messages_sender_id
FOREIGN KEY (sender_id) REFERENCES profiles(id);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    -- Check if the foreign key constraint was created
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'conversation_messages'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'sender_id'
    AND kcu.referenced_table_name = 'profiles';

    IF constraint_count > 0 THEN
        RAISE NOTICE '============================================================================';
        RAISE NOTICE 'FOREIGN KEY CONSTRAINT ADDED SUCCESSFULLY';
        RAISE NOTICE '============================================================================';
        RAISE NOTICE 'Added: conversation_messages.sender_id -> profiles.id';
        RAISE NOTICE '• Fixes: "Could not find relationship" error';
        RAISE NOTICE '• Enables: conversation_timeline view to work properly';
        RAISE NOTICE '• Allows: Supabase to understand table relationships';
        RAISE NOTICE '============================================================================';
        RAISE NOTICE 'Expected Results:';
        RAISE NOTICE '• ✅ conversation_timeline view returns messages';
        RAISE NOTICE '• ✅ Profile JOINs work in queries';
        RAISE NOTICE '• ✅ Images display in conversations';
        RAISE NOTICE '============================================================================';
    ELSE
        RAISE WARNING 'Foreign key constraint creation may have failed';
    END IF;
END $$;
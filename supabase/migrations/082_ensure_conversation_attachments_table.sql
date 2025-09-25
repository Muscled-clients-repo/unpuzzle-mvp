-- Migration: Ensure conversation_attachments table exists
-- Date: 2025-09-24
-- Description: Create conversation_attachments table if it doesn't exist (for conversation system)

-- =============================================================================
-- ENSURE CONVERSATION MESSAGES TABLE EXISTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message_text TEXT,
    message_type VARCHAR(50) DEFAULT 'note',
    target_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ENSURE CONVERSATION ATTACHMENTS TABLE EXISTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversation_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    cdn_url TEXT,
    backblaze_file_id TEXT,
    upload_status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add backblaze_file_id column if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversation_attachments'
        AND column_name = 'backblaze_file_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE conversation_attachments ADD COLUMN backblaze_file_id TEXT;
        RAISE NOTICE '✓ Added backblaze_file_id column to conversation_attachments';
    ELSE
        RAISE NOTICE '✓ backblaze_file_id column already exists in conversation_attachments';
    END IF;
END $$;

-- =============================================================================
-- ENSURE CONVERSATIONS TABLE EXISTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    goal_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, instructor_id)
);

-- =============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_conversation_attachments_message_id ON conversation_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_target_date ON conversation_messages(target_date);
CREATE INDEX IF NOT EXISTS idx_conversations_student_instructor ON conversations(student_id, instructor_id);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE conversation_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CREATE RLS POLICIES FOR CONVERSATION ATTACHMENTS
-- =============================================================================

-- Students can only see attachments in their own conversations
DROP POLICY IF EXISTS "students_read_own_conversation_attachments" ON conversation_attachments;
CREATE POLICY "students_read_own_conversation_attachments" ON conversation_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_messages cm
      JOIN conversations c ON cm.conversation_id = c.id
      WHERE cm.id = conversation_attachments.message_id
      AND c.student_id = auth.uid()
    )
  );

-- Instructors can see attachments in conversations with their students
DROP POLICY IF EXISTS "instructors_read_student_conversation_attachments" ON conversation_attachments;
CREATE POLICY "instructors_read_student_conversation_attachments" ON conversation_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_messages cm
      JOIN conversations c ON cm.conversation_id = c.id
      WHERE cm.id = conversation_attachments.message_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Users can insert attachments into their own messages
DROP POLICY IF EXISTS "users_insert_own_conversation_attachments" ON conversation_attachments;
CREATE POLICY "users_insert_own_conversation_attachments" ON conversation_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_messages cm
      WHERE cm.id = conversation_attachments.message_id
      AND cm.sender_id = auth.uid()
    )
  );

-- =============================================================================
-- CREATE RLS POLICIES FOR CONVERSATION MESSAGES
-- =============================================================================

-- Students can read messages in their own conversations
DROP POLICY IF EXISTS "students_read_own_messages" ON conversation_messages;
CREATE POLICY "students_read_own_messages" ON conversation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_messages.conversation_id
      AND c.student_id = auth.uid()
    )
  );

-- Instructors can read messages in conversations with their students
DROP POLICY IF EXISTS "instructors_read_student_messages" ON conversation_messages;
CREATE POLICY "instructors_read_student_messages" ON conversation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_messages.conversation_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Users can insert their own messages
DROP POLICY IF EXISTS "users_insert_own_messages" ON conversation_messages;
CREATE POLICY "users_insert_own_messages" ON conversation_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- =============================================================================
-- CREATE RLS POLICIES FOR CONVERSATIONS
-- =============================================================================

-- Students can read their own conversations
DROP POLICY IF EXISTS "students_read_own_conversations" ON conversations;
CREATE POLICY "students_read_own_conversations" ON conversations
  FOR SELECT USING (student_id = auth.uid());

-- Instructors can read conversations with their students
DROP POLICY IF EXISTS "instructors_read_student_conversations" ON conversations;
CREATE POLICY "instructors_read_student_conversations" ON conversations
  FOR SELECT USING (instructor_id = auth.uid());

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    -- Verify conversation_attachments table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'conversation_attachments'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✓ conversation_attachments table exists';
    ELSE
        RAISE WARNING '! conversation_attachments table missing';
    END IF;

    -- Verify conversation_messages table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'conversation_messages'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✓ conversation_messages table exists';
    ELSE
        RAISE WARNING '! conversation_messages table missing';
    END IF;

    -- Verify conversations table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'conversations'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✓ conversations table exists';
    ELSE
        RAISE WARNING '! conversations table missing';
    END IF;

    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'CONVERSATION SYSTEM TABLES VERIFIED';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '• Regenerate database types: npx supabase gen types typescript';
    RAISE NOTICE '• Test image upload functionality';
    RAISE NOTICE '• Verify conversation message creation works';
    RAISE NOTICE '============================================================================';
END $$;
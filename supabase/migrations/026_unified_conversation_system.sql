-- Unified Conversation System Migration
-- This creates the new unified schema alongside existing tables for parallel implementation

-- 1. Single conversation container
CREATE TABLE IF NOT EXISTS goal_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES track_goals(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Unified message stream (replaces user_daily_notes, instructor_goal_responses, user_actions)
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES goal_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL CHECK (message_type IN ('daily_note', 'instructor_response', 'activity', 'milestone')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- Activity details, response type, etc.
    reply_to_id UUID REFERENCES conversation_messages(id) ON DELETE SET NULL, -- For threading
    target_date DATE, -- For daily entries
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Unified attachment handling (replaces daily_note_files, instructor_response_files)
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    cdn_url TEXT NOT NULL,
    backblaze_file_id TEXT,
    storage_path TEXT NOT NULL,
    upload_status TEXT DEFAULT 'completed' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance-optimized indexes
CREATE INDEX IF NOT EXISTS idx_goal_conversations_student ON goal_conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_goal_conversations_instructor ON goal_conversations(instructor_id);
CREATE INDEX IF NOT EXISTS idx_goal_conversations_status ON goal_conversations(status) WHERE status = 'active';

-- Optimized for chronological message access
CREATE INDEX IF NOT EXISTS idx_conversation_messages_timeline ON conversation_messages(conversation_id, target_date DESC NULLS LAST, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_type ON conversation_messages(message_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_replies ON conversation_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_messages_sender ON conversation_messages(sender_id, created_at DESC);

-- Optimized for attachment retrieval
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_type ON message_attachments(mime_type);

-- Enable RLS on new tables
ALTER TABLE goal_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goal_conversations
CREATE POLICY "Students can view own conversations" ON goal_conversations
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Instructors can view assigned conversations" ON goal_conversations
    FOR SELECT USING (auth.uid() = instructor_id);

CREATE POLICY "Students can create conversations" ON goal_conversations
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Instructors can update assigned conversations" ON goal_conversations
    FOR UPDATE USING (auth.uid() = instructor_id);

-- RLS Policies for conversation_messages
CREATE POLICY "Conversation participants can view messages" ON conversation_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM goal_conversations
            WHERE student_id = auth.uid() OR instructor_id = auth.uid()
        )
    );

CREATE POLICY "Conversation participants can create messages" ON conversation_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT id FROM goal_conversations
            WHERE student_id = auth.uid() OR instructor_id = auth.uid()
        )
    );

CREATE POLICY "Message authors can update their messages" ON conversation_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- RLS Policies for message_attachments
CREATE POLICY "Conversation participants can view attachments" ON message_attachments
    FOR SELECT USING (
        message_id IN (
            SELECT cm.id FROM conversation_messages cm
            JOIN goal_conversations gc ON gc.id = cm.conversation_id
            WHERE gc.student_id = auth.uid() OR gc.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Message authors can manage attachments" ON message_attachments
    FOR ALL USING (
        message_id IN (
            SELECT id FROM conversation_messages
            WHERE sender_id = auth.uid()
        )
    );

-- Admin policies for all tables
CREATE POLICY "Admins can manage all conversations" ON goal_conversations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all messages" ON conversation_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all attachments" ON message_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_goal_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_conversation_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_goal_conversations_updated_at
    BEFORE UPDATE ON goal_conversations
    FOR EACH ROW EXECUTE FUNCTION update_goal_conversations_updated_at();

CREATE TRIGGER trigger_conversation_messages_updated_at
    BEFORE UPDATE ON conversation_messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_messages_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON goal_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_attachments TO authenticated;

-- Create optimized view for single-query conversation data
CREATE OR REPLACE VIEW conversation_timeline AS
SELECT
    cm.id,
    cm.conversation_id,
    cm.sender_id,
    cm.message_type,
    cm.content,
    cm.metadata,
    cm.reply_to_id,
    cm.target_date,
    cm.created_at,
    cm.updated_at,
    -- Sender information
    sender.full_name as sender_name,
    sender.role as sender_role,
    sender.avatar_url as sender_avatar,
    -- Reply information
    reply_msg.content as reply_content,
    reply_sender.full_name as reply_sender_name,
    -- Conversation information
    gc.student_id,
    gc.instructor_id,
    gc.status as conversation_status,
    -- Aggregated attachments
    COALESCE(
        JSON_AGG(
            CASE
                WHEN ma.id IS NOT NULL THEN
                    JSON_BUILD_OBJECT(
                        'id', ma.id,
                        'filename', ma.filename,
                        'original_filename', ma.original_filename,
                        'file_size', ma.file_size,
                        'mime_type', ma.mime_type,
                        'cdn_url', ma.cdn_url,
                        'created_at', ma.created_at
                    )
                ELSE NULL
            END
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'::json
    ) as attachments
FROM conversation_messages cm
JOIN goal_conversations gc ON gc.id = cm.conversation_id
JOIN profiles sender ON sender.id = cm.sender_id
LEFT JOIN conversation_messages reply_msg ON reply_msg.id = cm.reply_to_id
LEFT JOIN profiles reply_sender ON reply_sender.id = reply_msg.sender_id
LEFT JOIN message_attachments ma ON ma.message_id = cm.id
GROUP BY
    cm.id, cm.conversation_id, cm.sender_id, cm.message_type, cm.content,
    cm.metadata, cm.reply_to_id, cm.target_date, cm.created_at, cm.updated_at,
    sender.full_name, sender.role, sender.avatar_url,
    reply_msg.content, reply_sender.full_name,
    gc.student_id, gc.instructor_id, gc.status;

-- Grant view permissions
GRANT SELECT ON conversation_timeline TO authenticated;
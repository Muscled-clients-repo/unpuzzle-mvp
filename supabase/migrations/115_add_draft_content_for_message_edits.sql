-- Migration: Add draft_content column for editing published messages
-- Date: 2025-10-01
-- Description: Allow users to save draft edits of published messages without duplicating messages

-- =============================================================================
-- ADD DRAFT_CONTENT COLUMN
-- =============================================================================

-- Add draft_content column to store draft edits
ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS draft_content TEXT;

-- Add index for messages with pending draft edits
CREATE INDEX IF NOT EXISTS idx_conversation_messages_draft_edits
ON conversation_messages(sender_id)
WHERE draft_content IS NOT NULL;

-- =============================================================================
-- UPDATE CONVERSATION_TIMELINE VIEW
-- =============================================================================

DROP VIEW IF EXISTS conversation_timeline;

CREATE OR REPLACE VIEW conversation_timeline AS
SELECT
    -- Message fields (including draft_content)
    cm.id,
    cm.conversation_id,
    cm.sender_id,
    cm.message_type,
    cm.content,
    cm.draft_content,
    cm.metadata,
    cm.reply_to_id,
    cm.target_date,
    cm.is_draft,
    cm.visibility,
    cm.created_at,
    cm.updated_at,

    -- Conversation fields
    gc.student_id,
    gc.instructor_id,

    -- Sender information
    p.full_name as sender_name,
    p.role as sender_role,
    p.avatar_url as sender_avatar,

    -- Aggregated attachments as JSONB array
    COALESCE(
        json_agg(
            json_build_object(
                'id', ca.id,
                'message_id', ca.message_id,
                'filename', ca.filename,
                'original_filename', ca.original_filename,
                'file_size', ca.file_size,
                'mime_type', ca.mime_type,
                'cdn_url', ca.cdn_url,
                'storage_path', ca.storage_path,
                'backblaze_file_id', ca.backblaze_file_id,
                'upload_status', ca.upload_status,
                'created_at', ca.created_at,
                'updated_at', ca.updated_at
            )
        ) FILTER (WHERE ca.id IS NOT NULL),
        '[]'::json
    ) as attachments

FROM conversation_messages cm
JOIN goal_conversations gc ON cm.conversation_id = gc.id
LEFT JOIN profiles p ON cm.sender_id = p.id
LEFT JOIN conversation_attachments ca ON cm.id = ca.message_id
GROUP BY
    cm.id,
    cm.conversation_id,
    cm.sender_id,
    cm.message_type,
    cm.content,
    cm.draft_content,
    cm.metadata,
    cm.reply_to_id,
    cm.target_date,
    cm.is_draft,
    cm.visibility,
    cm.created_at,
    cm.updated_at,
    gc.student_id,
    gc.instructor_id,
    p.full_name,
    p.role,
    p.avatar_url;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'DRAFT_CONTENT COLUMN ADDED FOR MESSAGE EDITS';
    RAISE NOTICE '• draft_content column: stores draft edits of published messages';
    RAISE NOTICE '• No message duplication: edits stored on same message row';
    RAISE NOTICE '• On save: draft_content → content, then draft_content cleared';
    RAISE NOTICE '• On cancel: draft_content cleared';
    RAISE NOTICE '• conversation_timeline view updated to include draft_content';
    RAISE NOTICE '=============================================================================';
END $$;

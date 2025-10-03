-- Migration: Update conversation_timeline view to include draft columns
-- Date: 2025-10-01
-- Description: Add is_draft and visibility columns to conversation_timeline view

-- =============================================================================
-- RECREATE VIEW WITH DRAFT COLUMNS
-- =============================================================================

DROP VIEW IF EXISTS conversation_timeline;

CREATE OR REPLACE VIEW conversation_timeline AS
SELECT
    -- Message fields (including new draft columns)
    cm.id,
    cm.conversation_id,
    cm.sender_id,
    cm.message_type,
    cm.content,
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
    RAISE NOTICE 'CONVERSATION_TIMELINE VIEW UPDATED WITH DRAFT COLUMNS';
    RAISE NOTICE '• is_draft column: added';
    RAISE NOTICE '• visibility column: added';
    RAISE NOTICE '• View now supports draft filtering';
    RAISE NOTICE '=============================================================================';
END $$;

-- Fix conversation_timeline view to match actual table structure
-- Date: 2025-09-25
-- Description: Recreate the view with correct column names and relationships

-- =============================================================================
-- DROP AND RECREATE THE VIEW WITH CORRECT STRUCTURE
-- =============================================================================

-- Drop the existing problematic view
DROP VIEW IF EXISTS conversation_timeline;

-- Check actual conversation_messages table structure first
-- (This will be shown in the migration output for reference)
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'ACTUAL CONVERSATION_MESSAGES TABLE STRUCTURE:';
    RAISE NOTICE '============================================================================';

    FOR rec IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'conversation_messages'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '• %: % (%)', rec.column_name, rec.data_type,
                     CASE WHEN rec.is_nullable = 'YES' THEN 'nullable' ELSE 'not null' END;
    END LOOP;

    RAISE NOTICE '============================================================================';
END $$;

-- Create the view with correct structure based on actual table
-- Using the structure we know works from manual testing
CREATE OR REPLACE VIEW conversation_timeline AS
SELECT
    -- Message fields (using actual column names)
    cm.id,
    cm.conversation_id,
    cm.sender_id,
    cm.message_type,
    cm.content,  -- Using 'content' not 'message_text' based on our debug logs
    cm.metadata,
    cm.reply_to_id,
    cm.target_date,
    cm.created_at,
    cm.updated_at,

    -- Conversation fields
    gc.student_id,
    gc.instructor_id,

    -- Sender information (this JOIN works from our manual test)
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
LEFT JOIN profiles p ON cm.sender_id = p.id  -- This JOIN works from our test
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
DECLARE
    message_count INTEGER;
    test_conversation_id UUID := '77f2d2d1-d0aa-476f-9f59-c379980e7b9b';
BEGIN
    -- Test the recreated view
    SELECT COUNT(*) INTO message_count
    FROM conversation_timeline
    WHERE conversation_id = test_conversation_id;

    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'CONVERSATION TIMELINE VIEW RECREATED';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Test Results:';
    RAISE NOTICE '• View recreated successfully: ✓';
    RAISE NOTICE '• Test conversation: %', test_conversation_id;
    RAISE NOTICE '• Messages found in view: %', message_count;

    IF message_count > 0 THEN
        RAISE NOTICE '• STATUS: ✅ SUCCESS - View now returns messages!';
        RAISE NOTICE '• Expected result: Images should now display in conversations';
    ELSE
        RAISE NOTICE '• STATUS: ❌ ISSUE - View still returns 0 messages';
        RAISE NOTICE '• Next step: Check if conversation_id exists in goal_conversations table';
    END IF;

    RAISE NOTICE '============================================================================';
END $$;
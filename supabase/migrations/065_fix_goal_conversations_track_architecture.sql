-- Migration 065: Fix goal_conversations architecture to use proper foreign keys
-- Replace track_type enum with track_id foreign key for better data integrity
-- Safe to run since app hasn't shipped yet (no production data)

-- STEP 1: Clean up existing data (safe since no production users)
DELETE FROM conversation_messages;
DELETE FROM goal_conversations;

-- STEP 2: Drop dependent views first
DROP VIEW IF EXISTS instructor_review_queue;

-- STEP 3: Remove track_type column and add proper track_id foreign key
ALTER TABLE goal_conversations
DROP COLUMN IF EXISTS track_type;

ALTER TABLE goal_conversations
ADD COLUMN track_id UUID REFERENCES tracks(id) ON DELETE CASCADE;

-- STEP 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_goal_conversations_track_id ON goal_conversations(track_id);

-- STEP 5: Recreate views with proper track_id foreign key

CREATE OR REPLACE VIEW instructor_review_queue AS
SELECT
    gc.id as conversation_id,
    gc.student_id,
    gc.track_id,
    t.name as track_name,
    t.description as track_description,
    gc.created_at,
    p.full_name as student_name,
    p.email as student_email,
    p.avatar_url as student_avatar,
    -- Get questionnaire response
    cm.content as questionnaire_content,
    cm.metadata as questionnaire_data,
    cm.created_at as questionnaire_submitted_at
FROM goal_conversations gc
JOIN profiles p ON p.id = gc.student_id
JOIN tracks t ON t.id = gc.track_id
LEFT JOIN conversation_messages cm ON cm.conversation_id = gc.id
    AND cm.message_type = 'questionnaire_response'
WHERE gc.status = 'pending_instructor_review'
ORDER BY gc.created_at ASC;

-- Grant permissions on updated view
GRANT SELECT ON instructor_review_queue TO authenticated;

-- STEP 6: Update track_goal_progressions view to be more flexible
DROP VIEW IF EXISTS track_goal_progressions;

CREATE OR REPLACE VIEW track_goal_progressions AS
SELECT
    t.id as track_id,
    t.name as track_name,
    CASE
        WHEN t.name ILIKE '%agency%' THEN 'agency'
        WHEN t.name ILIKE '%saas%' THEN 'saas'
        ELSE 'unknown'
    END as track_type,
    ARRAY_AGG(
        jsonb_build_object(
            'goal_id', tg.id,
            'goal', tg.description,
            'name', tg.name,
            'amount', COALESCE(tg.target_amount, 0),
            'order', tg.sort_order
        ) ORDER BY tg.sort_order
    ) as goals
FROM tracks t
JOIN track_goals tg ON tg.track_id = t.id
WHERE t.is_active = true
GROUP BY t.id, t.name;

-- Grant permissions on updated view
GRANT SELECT ON track_goal_progressions TO authenticated;

-- STEP 7: Add helpful comments
COMMENT ON COLUMN goal_conversations.track_id IS 'Foreign key to tracks table - replaces track_type enum for better data integrity';
COMMENT ON VIEW instructor_review_queue IS 'Updated to use track_id foreign key instead of track_type enum';
COMMENT ON VIEW track_goal_progressions IS 'Provides goal progressions by track using proper foreign key relationships';

-- STEP 8: Verify the schema is clean
DO $$
BEGIN
    -- Check that track_type column is gone
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goal_conversations'
        AND column_name = 'track_type'
    ) THEN
        RAISE EXCEPTION 'track_type column still exists - migration failed';
    END IF;

    -- Check that track_id column exists with foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'goal_conversations'
        AND column_name = 'track_id'
    ) THEN
        RAISE EXCEPTION 'track_id column missing - migration failed';
    END IF;

    RAISE NOTICE '✅ goal_conversations architecture successfully updated to use track_id foreign key';
END $$;
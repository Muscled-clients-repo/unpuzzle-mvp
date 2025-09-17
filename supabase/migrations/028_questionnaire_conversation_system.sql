-- Questionnaire Conversation System
-- Enhances conversation system to handle track-specific questionnaires

-- Add track_type to goal_conversations
ALTER TABLE goal_conversations
ADD COLUMN track_type TEXT CHECK (track_type IN ('agency', 'saas'));

-- Update conversation status enum to include pending_instructor_review
ALTER TABLE goal_conversations
DROP CONSTRAINT IF EXISTS goal_conversations_status_check;

ALTER TABLE goal_conversations
ADD CONSTRAINT goal_conversations_status_check
CHECK (status IN ('pending_instructor_review', 'active', 'archived', 'completed'));

-- Update default status to pending for new conversations
ALTER TABLE goal_conversations
ALTER COLUMN status SET DEFAULT 'pending_instructor_review';

-- Update message_type enum to include questionnaire_response
ALTER TABLE conversation_messages
DROP CONSTRAINT IF EXISTS conversation_messages_message_type_check;

ALTER TABLE conversation_messages
ADD CONSTRAINT conversation_messages_message_type_check
CHECK (message_type IN ('daily_note', 'instructor_response', 'activity', 'milestone', 'questionnaire_response'));

-- Create index for track-based queries
CREATE INDEX IF NOT EXISTS idx_goal_conversations_track_type ON goal_conversations(track_type);
CREATE INDEX IF NOT EXISTS idx_goal_conversations_pending_review ON goal_conversations(status) WHERE status = 'pending_instructor_review';

-- Update RLS policies to handle pending conversations
-- Students can view their own conversations regardless of status
-- But can only CREATE messages when status is 'active'

-- Drop existing message creation policy and recreate with status check
DROP POLICY IF EXISTS "Conversation participants can create messages" ON conversation_messages;

CREATE POLICY "Conversation participants can create messages" ON conversation_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT id FROM goal_conversations
            WHERE (student_id = auth.uid() OR instructor_id = auth.uid())
            AND (
                -- Students can only send messages in active conversations
                (student_id = auth.uid() AND status = 'active') OR
                -- Instructors can send messages in any status
                (instructor_id = auth.uid())
            )
        )
    );

-- Create policy for system-generated questionnaire messages
CREATE POLICY "System can create questionnaire messages" ON conversation_messages
    FOR INSERT WITH CHECK (
        message_type = 'questionnaire_response' AND
        conversation_id IN (
            SELECT id FROM goal_conversations
            WHERE student_id = sender_id
        )
    );

-- Add instructor policy for managing pending conversations
CREATE POLICY "Instructors can update pending conversations" ON goal_conversations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'instructor'
        )
    );

-- Create view for instructor review queue
CREATE OR REPLACE VIEW instructor_review_queue AS
SELECT
    gc.id as conversation_id,
    gc.student_id,
    gc.track_type,
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
LEFT JOIN conversation_messages cm ON cm.conversation_id = gc.id
    AND cm.message_type = 'questionnaire_response'
WHERE gc.status = 'pending_instructor_review'
ORDER BY gc.created_at ASC;

-- Grant permissions on new view
GRANT SELECT ON instructor_review_queue TO authenticated;

-- Create view for track-specific goal progressions
CREATE OR REPLACE VIEW track_goal_progressions AS
SELECT
    'agency' as track_type,
    ARRAY[
        '{"goal": "Earn $1k total from agency services", "amount": 1000, "order": 1}',
        '{"goal": "Earn $5k total from agency services", "amount": 5000, "order": 2}',
        '{"goal": "Earn $10k total from agency services", "amount": 10000, "order": 3}',
        '{"goal": "Earn $20k total from agency services", "amount": 20000, "order": 4}',
        '{"goal": "Earn $50k total from agency services", "amount": 50000, "order": 5}',
        '{"goal": "Earn $100k total from agency services", "amount": 100000, "order": 6}',
        '{"goal": "Earn $250k total from agency services", "amount": 250000, "order": 7}',
        '{"goal": "Earn $500k total from agency services", "amount": 500000, "order": 8}'
    ]::jsonb[] as goals
UNION ALL
SELECT
    'saas' as track_type,
    ARRAY[
        '{"goal": "Reach $1k Monthly Recurring Revenue", "amount": 1000, "order": 1}',
        '{"goal": "Reach $3k Monthly Recurring Revenue", "amount": 3000, "order": 2}',
        '{"goal": "Reach $5k Monthly Recurring Revenue", "amount": 5000, "order": 3}',
        '{"goal": "Reach $10k Monthly Recurring Revenue", "amount": 10000, "order": 4}',
        '{"goal": "Reach $20k Monthly Recurring Revenue", "amount": 20000, "order": 5}'
    ]::jsonb[] as goals;

-- Grant permissions on goal progressions view
GRANT SELECT ON track_goal_progressions TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE goal_conversations IS 'Enhanced to support track-specific questionnaires with pending instructor review workflow';
COMMENT ON COLUMN goal_conversations.track_type IS 'Type of track: agency (revenue goals) or saas (MRR goals)';
COMMENT ON COLUMN goal_conversations.status IS 'Conversation status: pending_instructor_review (after questionnaire), active (after goal assignment), archived, completed';
COMMENT ON VIEW instructor_review_queue IS 'Queue of students awaiting instructor review and goal assignment';
COMMENT ON VIEW track_goal_progressions IS 'Predefined goal progressions for each track type';
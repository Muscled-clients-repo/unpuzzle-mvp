-- Add 'revenue_submission' to conversation_messages message_type constraint
-- This allows storing revenue proof submissions in the conversation timeline

-- Drop existing constraint
ALTER TABLE conversation_messages
DROP CONSTRAINT IF EXISTS conversation_messages_message_type_check;

-- Add new constraint with revenue_submission included
ALTER TABLE conversation_messages
ADD CONSTRAINT conversation_messages_message_type_check
CHECK (message_type IN ('daily_note', 'instructor_response', 'activity', 'milestone', 'revenue_submission'));

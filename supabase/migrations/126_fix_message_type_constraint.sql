-- Fix message_type constraint to include all existing types and add revenue_submission
-- Based on current data: questionnaire_response, daily_note

-- Drop existing constraint
ALTER TABLE conversation_messages
DROP CONSTRAINT IF EXISTS conversation_messages_message_type_check;

-- Add new constraint with existing types plus revenue_submission (milestone removed)
ALTER TABLE conversation_messages
ADD CONSTRAINT conversation_messages_message_type_check
CHECK (message_type IN ('daily_note', 'questionnaire_response', 'revenue_submission'));

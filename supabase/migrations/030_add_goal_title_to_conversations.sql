-- Add goal_title field to goal_conversations table
-- This allows storing the human-readable goal title directly in the conversation

ALTER TABLE public.goal_conversations
ADD COLUMN goal_title TEXT;

-- Update existing conversations with goal titles from track_goals
UPDATE public.goal_conversations
SET goal_title = track_goals.description
FROM public.track_goals
WHERE goal_conversations.goal_id = track_goals.id
AND goal_conversations.goal_title IS NULL;

-- Add index for performance
CREATE INDEX goal_conversations_goal_title_idx ON public.goal_conversations(goal_title);
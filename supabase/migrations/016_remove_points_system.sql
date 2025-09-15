-- Remove points system from actions tables
-- This migration removes points-related columns and logic

-- Remove points column from action_types
ALTER TABLE public.action_types DROP COLUMN IF EXISTS points;

-- Remove points column from user_actions  
ALTER TABLE public.user_actions DROP COLUMN IF EXISTS points;

-- Update the existing data is fine since we're just removing columns
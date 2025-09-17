-- Update Track Goals to Match Progressive Revenue Structure
-- This migration replaces generic milestone goals with specific revenue targets

-- Clear existing goals
DELETE FROM public.track_goals;

-- Insert progressive agency goals
DO $$
DECLARE
  agency_track_id UUID;
  saas_track_id UUID;
BEGIN
  -- Get track IDs
  SELECT id INTO agency_track_id FROM public.tracks WHERE name = 'Agency Track';
  SELECT id INTO saas_track_id FROM public.tracks WHERE name = 'SaaS Track';

  -- Agency Track Goals (Total Revenue Progression)
  INSERT INTO public.track_goals (track_id, name, description, is_default, sort_order) VALUES
    (agency_track_id, 'agency-1k', 'Earn $1,000 total revenue from agency services', true, 1),
    (agency_track_id, 'agency-5k', 'Earn $5,000 total revenue from agency services', false, 2),
    (agency_track_id, 'agency-10k', 'Earn $10,000 total revenue from agency services', false, 3),
    (agency_track_id, 'agency-30k', 'Earn $30,000 total revenue from agency services', false, 4),
    (agency_track_id, 'agency-50k', 'Earn $50,000 total revenue from agency services', false, 5),
    (agency_track_id, 'agency-100k', 'Earn $100,000 total revenue from agency services', false, 6),
    (agency_track_id, 'agency-250k', 'Earn $250,000 total revenue from agency services', false, 7),
    (agency_track_id, 'agency-500k', 'Earn $500,000 total revenue from agency services', false, 8);

  -- SaaS Track Goals (Monthly Recurring Revenue Progression)
  INSERT INTO public.track_goals (track_id, name, description, is_default, sort_order) VALUES
    (saas_track_id, 'saas-1k-mrr', 'Reach $1,000 Monthly Recurring Revenue', true, 1),
    (saas_track_id, 'saas-3k-mrr', 'Reach $3,000 Monthly Recurring Revenue', false, 2),
    (saas_track_id, 'saas-5k-mrr', 'Reach $5,000 Monthly Recurring Revenue', false, 3),
    (saas_track_id, 'saas-10k-mrr', 'Reach $10,000 Monthly Recurring Revenue', false, 4),
    (saas_track_id, 'saas-20k-mrr', 'Reach $20,000 Monthly Recurring Revenue', false, 5);
END $$;

-- Update any existing user assignments to use new goal structure
-- This handles the transition from old goals to new ones
UPDATE public.profiles
SET current_goal_id = NULL,
    goal_assigned_at = NULL
WHERE current_goal_id IS NOT NULL;

-- Note: Instructors will need to reassign goals for existing students
-- This ensures clean transition to the new progressive goal structure
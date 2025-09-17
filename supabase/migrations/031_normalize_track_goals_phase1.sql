-- Phase 1: Add normalized columns and fix defaults
-- Safe migration - backwards compatible

-- Add new columns to track_goals table
ALTER TABLE public.track_goals
ADD COLUMN IF NOT EXISTS target_amount INTEGER,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS goal_type VARCHAR(50) DEFAULT 'revenue',
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Fix multiple defaults - only keep first goal as default per track
UPDATE public.track_goals
SET is_default = false
WHERE name NOT IN ('agency-1k', 'saas-1k-mrr');

-- Populate target_amount from goal names
UPDATE public.track_goals
SET target_amount = CASE
  WHEN name LIKE '%1k%' THEN 1000
  WHEN name LIKE '%3k%' THEN 3000
  WHEN name LIKE '%5k%' THEN 5000
  WHEN name LIKE '%10k%' THEN 10000
  WHEN name LIKE '%20k%' THEN 20000
  WHEN name LIKE '%30k%' THEN 30000
  WHEN name LIKE '%50k%' THEN 50000
  WHEN name LIKE '%100k%' THEN 100000
  WHEN name LIKE '%250k%' THEN 250000
  WHEN name LIKE '%500k%' THEN 500000
  ELSE 1000
END;

-- Set goal_type based on name patterns
UPDATE public.track_goals
SET goal_type = CASE
  WHEN name LIKE '%mrr%' THEN 'monthly_recurring_revenue'
  WHEN name LIKE '%agency%' OR name LIKE '%saas%' THEN 'revenue'
  ELSE 'revenue'
END;

-- Set sort_order based on target_amount
UPDATE public.track_goals
SET sort_order = CASE target_amount
  WHEN 1000 THEN 1
  WHEN 3000 THEN 2
  WHEN 5000 THEN 3
  WHEN 10000 THEN 4
  WHEN 20000 THEN 5
  WHEN 30000 THEN 6
  WHEN 50000 THEN 7
  WHEN 100000 THEN 8
  WHEN 250000 THEN 9
  WHEN 500000 THEN 10
  ELSE 0
END;

-- Update descriptions to be more user-friendly
UPDATE public.track_goals
SET description = CASE
  WHEN name = 'agency-1k' THEN 'Build your agency foundation and earn your first $1,000'
  WHEN name = 'agency-5k' THEN 'Scale operations and reach $5,000 in revenue'
  WHEN name = 'agency-10k' THEN 'Establish systems and hit $10,000 monthly'
  WHEN name = 'agency-30k' THEN 'Build a team and reach $30,000 monthly'
  WHEN name = 'agency-50k' THEN 'Scale to $50,000 monthly revenue'
  WHEN name = 'agency-100k' THEN 'Achieve $100,000 monthly milestone'
  WHEN name = 'agency-250k' THEN 'Scale to $250,000 monthly revenue'
  WHEN name = 'agency-500k' THEN 'Reach the ultimate $500,000 monthly goal'
  WHEN name = 'saas-1k-mrr' THEN 'Launch your SaaS and reach $1,000 MRR'
  WHEN name = 'saas-3k-mrr' THEN 'Grow to $3,000 in monthly recurring revenue'
  WHEN name = 'saas-5k-mrr' THEN 'Scale to $5,000 MRR milestone'
  WHEN name = 'saas-10k-mrr' THEN 'Reach $10,000 monthly recurring revenue'
  WHEN name = 'saas-20k-mrr' THEN 'Achieve $20,000 MRR success'
  ELSE description
END;

-- Add constraint to ensure one default per track (when track_id is properly set)
-- Note: This will be enabled in Phase 2 when track_id relationships are fixed

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_track_goals_sort_order ON public.track_goals(sort_order);
CREATE INDEX IF NOT EXISTS idx_track_goals_target_amount ON public.track_goals(target_amount);

-- Grant permissions
GRANT SELECT, UPDATE ON public.track_goals TO authenticated;
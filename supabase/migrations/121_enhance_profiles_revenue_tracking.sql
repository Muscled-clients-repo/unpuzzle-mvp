-- Enhance profiles table with revenue tracking for goal progress
-- This allows tracking monetary goals for Agency Track (total revenue) and SaaS Track (MRR)

-- Add goal tracking columns to existing profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goal_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS goal_completed_at TIMESTAMPTZ;

-- Add revenue tracking columns
-- Agency Track: total_revenue_earned (cumulative, additive)
-- SaaS Track: current_mrr (monthly recurring revenue, replace if higher)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_revenue_earned DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_mrr DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_updated_at TIMESTAMPTZ;

-- Add goal completion history (array of completed goal IDs)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS completed_goals UUID[] DEFAULT '{}';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_total_revenue_earned ON public.profiles(total_revenue_earned);
CREATE INDEX IF NOT EXISTS idx_profiles_current_mrr ON public.profiles(current_mrr);
CREATE INDEX IF NOT EXISTS idx_profiles_completed_goals ON public.profiles USING GIN(completed_goals);
CREATE INDEX IF NOT EXISTS idx_profiles_goal_started_at ON public.profiles(goal_started_at);
CREATE INDEX IF NOT EXISTS idx_profiles_goal_completed_at ON public.profiles(goal_completed_at);

-- Helper function: Update revenue based on track type
-- Agency: Add to total_revenue_earned
-- SaaS: Replace current_mrr if higher (using GREATEST)
CREATE OR REPLACE FUNCTION update_user_revenue(
  p_user_id UUID,
  p_track_type TEXT,
  p_amount DECIMAL(10,2)
)
RETURNS VOID AS $$
BEGIN
  IF p_track_type = 'agency' THEN
    -- Agency: ADD to total revenue earned
    UPDATE public.profiles
    SET
      total_revenue_earned = total_revenue_earned + p_amount,
      revenue_updated_at = NOW()
    WHERE id = p_user_id;
  ELSIF p_track_type = 'saas' THEN
    -- SaaS: REPLACE if higher (last 30 days MRR)
    UPDATE public.profiles
    SET
      current_mrr = GREATEST(current_mrr, p_amount),
      revenue_updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid track type. Must be "agency" or "saas"';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Mark goal as completed
CREATE OR REPLACE FUNCTION mark_goal_completed(
  p_user_id UUID,
  p_goal_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    goal_completed_at = NOW(),
    completed_goals = array_append(completed_goals, p_goal_id)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Check if user has completed a specific goal
CREATE OR REPLACE FUNCTION has_completed_goal(
  p_user_id UUID,
  p_goal_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_completed BOOLEAN;
BEGIN
  SELECT p_goal_id = ANY(completed_goals)
  INTO v_has_completed
  FROM public.profiles
  WHERE id = p_user_id;

  RETURN COALESCE(v_has_completed, false);
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get user's progress towards current goal
CREATE OR REPLACE FUNCTION get_goal_progress(
  p_user_id UUID
)
RETURNS TABLE(
  current_goal_id UUID,
  goal_name TEXT,
  goal_target_amount DECIMAL(10,2),
  track_type TEXT,
  current_amount DECIMAL(10,2),
  progress_percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.current_goal_id,
    tg.name AS goal_name,
    tg.target_amount::DECIMAL(10,2) AS goal_target_amount,
    t.name AS track_type,
    CASE
      WHEN t.name = 'Agency Track' THEN p.total_revenue_earned
      WHEN t.name = 'SaaS Track' THEN p.current_mrr
      ELSE 0
    END AS current_amount,
    CASE
      WHEN tg.target_amount > 0 THEN
        ROUND(
          (CASE
            WHEN t.name = 'Agency Track' THEN p.total_revenue_earned
            WHEN t.name = 'SaaS Track' THEN p.current_mrr
            ELSE 0
          END / tg.target_amount * 100)::DECIMAL,
          2
        )
      ELSE 0
    END AS progress_percentage
  FROM public.profiles p
  LEFT JOIN public.track_goals tg ON p.current_goal_id = tg.id
  LEFT JOIN public.tracks t ON p.current_track_id = t.id
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Note: Revenue updates will be triggered via conversation_messages metadata
-- When instructor approves a revenue submission, the backend will call update_user_revenue()

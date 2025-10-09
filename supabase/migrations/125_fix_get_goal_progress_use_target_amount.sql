-- Fix get_goal_progress function to use existing target_amount column instead of revenue_target
-- This replaces the function created in migration 121

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

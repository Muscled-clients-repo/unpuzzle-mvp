-- Phase 3: Clean up redundant database structures
-- Remove course_track_assignments table and track_type column from goal_conversations

-- First, verify that course_track_assignments is no longer needed
-- (courses are now assigned to goals, and goals belong to tracks)

-- Drop the redundant course_track_assignments table
DROP TABLE IF EXISTS public.course_track_assignments CASCADE;

-- Remove track_type column from goal_conversations
-- (should use proper FK relationship to tracks table instead)
ALTER TABLE public.goal_conversations
DROP COLUMN IF EXISTS track_type;

-- Add proper foreign key relationship for goal_conversations to tracks
-- (if not already present from the goal_id -> track_goals -> tracks relationship)

-- Add database constraints to ensure data integrity
-- Ensure each track has at least one default goal
CREATE OR REPLACE FUNCTION ensure_track_has_default_goal()
RETURNS TRIGGER AS $$
BEGIN
  -- When updating a goal to not be default, ensure there's still a default goal in the track
  IF OLD.is_default = true AND NEW.is_default = false THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.track_goals
      WHERE track_id = NEW.track_id
      AND is_default = true
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Each track must have at least one default goal';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce default goal constraint
DROP TRIGGER IF EXISTS ensure_default_goal_trigger ON public.track_goals;
CREATE TRIGGER ensure_default_goal_trigger
  BEFORE UPDATE ON public.track_goals
  FOR EACH ROW EXECUTE FUNCTION ensure_track_has_default_goal();

-- Add constraint to ensure target_amount is positive when present
ALTER TABLE public.track_goals
ADD CONSTRAINT check_positive_target_amount
CHECK (target_amount IS NULL OR target_amount > 0);

-- Add constraint to ensure valid currency codes
ALTER TABLE public.track_goals
ADD CONSTRAINT check_valid_currency
CHECK (currency IS NULL OR LENGTH(currency) = 3);

-- Add constraint to ensure valid goal_type values
ALTER TABLE public.track_goals
ADD CONSTRAINT check_valid_goal_type
CHECK (goal_type IN ('revenue', 'monthly_recurring_revenue', 'profit_margin', 'customer_acquisition'));

-- Update any views that might reference the dropped table
-- Recreate courses_with_assignments view to only use goal assignments
DROP VIEW IF EXISTS public.courses_with_assignments;

CREATE OR REPLACE VIEW public.courses_with_assignments AS
SELECT
  c.*,
  array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as assigned_tracks,
  array_agg(DISTINCT tg.name) FILTER (WHERE tg.name IS NOT NULL) as assigned_goals,
  array_agg(DISTINCT tg.target_amount) FILTER (WHERE tg.target_amount IS NOT NULL) as goal_amounts,
  array_agg(DISTINCT tg.goal_type) FILTER (WHERE tg.goal_type IS NOT NULL) as goal_types,
  c.tags as custom_tags
FROM public.courses c
LEFT JOIN public.course_goal_assignments cga ON c.id = cga.course_id
LEFT JOIN public.track_goals tg ON cga.goal_id = tg.id
LEFT JOIN public.tracks t ON tg.track_id = t.id
GROUP BY c.id;

GRANT SELECT ON public.courses_with_assignments TO authenticated;

-- Create index for performance on the remaining assignment table
CREATE INDEX IF NOT EXISTS course_goal_assignments_performance_idx
ON public.course_goal_assignments(course_id, goal_id);

-- Add comment to document the cleanup
COMMENT ON TABLE public.course_goal_assignments IS
'Assigns courses to specific goals. Courses are visible to users with matching goals. Track assignment is derived from goal.track_id.';

COMMENT ON TABLE public.track_goals IS
'Goals within tracks. Contains normalized target_amount, currency, and goal_type instead of parsing from goal names.';
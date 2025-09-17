-- Phase 2: Optimize get_user_courses function to use normalized data
-- Remove dependency on course_track_assignments (redundant table)

CREATE OR REPLACE FUNCTION public.get_user_courses(user_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  status TEXT,
  price DECIMAL,
  is_free BOOLEAN,
  difficulty TEXT,
  rating DECIMAL,
  students INTEGER,
  total_videos INTEGER,
  total_duration_minutes INTEGER
)
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.id, c.title, c.description, c.thumbnail_url, c.status,
         c.price, c.is_free, c.difficulty, c.rating, c.students,
         c.total_videos, c.total_duration_minutes
  FROM public.courses c
  INNER JOIN public.profiles p ON p.id = user_id
  WHERE c.status = 'published'
  AND (
    -- Course is assigned to user's specific goal
    EXISTS (
      SELECT 1 FROM public.course_goal_assignments cga
      WHERE cga.course_id = c.id AND cga.goal_id = p.current_goal_id
    )
    OR
    -- Course is assigned to any goal in user's track (derived from goals)
    EXISTS (
      SELECT 1 FROM public.course_goal_assignments cga
      INNER JOIN public.track_goals tg ON cga.goal_id = tg.id
      WHERE cga.course_id = c.id
      AND tg.track_id = p.current_track_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the courses_with_assignments view to use normalized data
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_courses(UUID) TO authenticated;
-- Fix get_user_courses function to only show courses for user's specific goal
-- Remove the track-level filtering that was causing cross-goal visibility

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
    -- Course is assigned to user's specific goal ONLY
    EXISTS (
      SELECT 1 FROM public.course_goal_assignments cga
      WHERE cga.course_id = c.id AND cga.goal_id = p.current_goal_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_courses(UUID) TO authenticated;
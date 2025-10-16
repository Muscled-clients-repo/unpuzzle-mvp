-- Recreate course assignment tables that were removed in migration 069
-- These tables are needed for the community courses feature to show courses grouped by tracks and goals
-- They enable many-to-many relationships: courses can belong to multiple tracks/goals

-- ============================================================================
-- RECREATE COURSE_TRACK_ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.course_track_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, track_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS course_track_assignments_course_id_idx ON public.course_track_assignments(course_id);
CREATE INDEX IF NOT EXISTS course_track_assignments_track_id_idx ON public.course_track_assignments(track_id);

-- Enable RLS
ALTER TABLE public.course_track_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RECREATE COURSE_GOAL_ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.course_goal_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES public.track_goals(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, goal_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS course_goal_assignments_course_id_idx ON public.course_goal_assignments(course_id);
CREATE INDEX IF NOT EXISTS course_goal_assignments_goal_id_idx ON public.course_goal_assignments(goal_id);

-- Enable RLS
ALTER TABLE public.course_goal_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Public access for discovery
-- ============================================================================

-- Instructors can manage assignments for their own courses
CREATE POLICY "Instructors can manage own course track assignments"
  ON public.course_track_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_track_assignments.course_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- Public can view track assignments for published courses (guest access)
CREATE POLICY "Public can view track assignments for published courses"
  ON public.course_track_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_track_assignments.course_id
      AND courses.status = 'published'
    )
  );

-- Instructors can manage assignments for their own courses
CREATE POLICY "Instructors can manage own course goal assignments"
  ON public.course_goal_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_goal_assignments.course_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- Public can view goal assignments for published courses (guest access)
CREATE POLICY "Public can view goal assignments for published courses"
  ON public.course_goal_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_goal_assignments.course_id
      AND courses.status = 'published'
    )
  );

-- Grant permissions
GRANT SELECT ON public.course_track_assignments TO anon, authenticated;
GRANT SELECT ON public.course_goal_assignments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_track_assignments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_goal_assignments TO authenticated;

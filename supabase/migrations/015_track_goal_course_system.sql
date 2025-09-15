-- Track-Goal-Course System Implementation
-- This migration implements the core track, goal, and course tagging system

-- Create tracks table
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create goals table for each track
CREATE TABLE public.track_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(track_id, name)
);

-- Update users table to include track and goal assignments
ALTER TABLE public.profiles 
ADD COLUMN current_track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
ADD COLUMN current_goal_id UUID REFERENCES public.track_goals(id) ON DELETE SET NULL,
ADD COLUMN track_assigned_at TIMESTAMPTZ,
ADD COLUMN goal_assigned_at TIMESTAMPTZ;

-- Create course track assignments (many-to-many)
CREATE TABLE public.course_track_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, track_id)
);

-- Create course goal assignments (many-to-many) 
CREATE TABLE public.course_goal_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES public.track_goals(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, goal_id)
);

-- Note: We'll use the existing tags TEXT[] column in courses table instead of a separate table

-- Create action types table for community actions system
CREATE TABLE public.action_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 1,
  is_auto_tracked BOOLEAN DEFAULT false, -- true for Unpuzzle platform actions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(track_id, name)
);

-- Create user actions table for tracking community actions and points
CREATE TABLE public.user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_type_id UUID REFERENCES public.action_types(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES public.track_goals(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 1,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  action_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX tracks_name_idx ON public.tracks(name);
CREATE INDEX track_goals_track_id_idx ON public.track_goals(track_id);
CREATE INDEX track_goals_is_default_idx ON public.track_goals(is_default);
CREATE INDEX profiles_current_track_id_idx ON public.profiles(current_track_id);
CREATE INDEX profiles_current_goal_id_idx ON public.profiles(current_goal_id);
CREATE INDEX course_track_assignments_course_id_idx ON public.course_track_assignments(course_id);
CREATE INDEX course_track_assignments_track_id_idx ON public.course_track_assignments(track_id);
CREATE INDEX course_goal_assignments_course_id_idx ON public.course_goal_assignments(course_id);
CREATE INDEX course_goal_assignments_goal_id_idx ON public.course_goal_assignments(goal_id);
-- No separate course_tags table needed
CREATE INDEX action_types_track_id_idx ON public.action_types(track_id);
CREATE INDEX user_actions_user_id_idx ON public.user_actions(user_id);
CREATE INDEX user_actions_action_date_idx ON public.user_actions(action_date);
CREATE INDEX user_actions_goal_id_idx ON public.user_actions(goal_id);

-- Enable RLS on new tables
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_track_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_goal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracks (public read, admin manage)
CREATE POLICY "Public can view active tracks" 
  ON public.tracks FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can manage tracks" 
  ON public.tracks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for track_goals (public read, admin manage)
CREATE POLICY "Public can view active goals" 
  ON public.track_goals FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can manage goals" 
  ON public.track_goals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for course assignments (instructors manage own courses)
CREATE POLICY "Instructors can manage own course track assignments" 
  ON public.course_track_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_track_assignments.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Users can view course track assignments for published courses" 
  ON public.course_track_assignments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_track_assignments.course_id 
      AND courses.status = 'published'
    )
  );

CREATE POLICY "Instructors can manage own course goal assignments" 
  ON public.course_goal_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_goal_assignments.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Users can view course goal assignments for published courses" 
  ON public.course_goal_assignments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_goal_assignments.course_id 
      AND courses.status = 'published'
    )
  );

-- No separate course_tags table policies needed

-- RLS Policies for action types (public read, admin manage)
CREATE POLICY "Public can view active action types" 
  ON public.action_types FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can manage action types" 
  ON public.action_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for user actions (users manage own actions)
CREATE POLICY "Users can manage own actions" 
  ON public.user_actions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instructors can view student actions for their courses" 
  ON public.user_actions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER track_goals_updated_at
  BEFORE UPDATE ON public.track_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER action_types_updated_at
  BEFORE UPDATE ON public.action_types
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert initial track data (Agency Track and SaaS Track)
INSERT INTO public.tracks (name, description) VALUES 
  ('Agency Track', 'Build and scale a successful agency business with proven systems'),
  ('SaaS Track', 'Transition from agency to SaaS with live development guidance');

-- Insert initial goals for each track
DO $$
DECLARE
  agency_track_id UUID;
  saas_track_id UUID;
BEGIN
  -- Get track IDs
  SELECT id INTO agency_track_id FROM public.tracks WHERE name = 'Agency Track';
  SELECT id INTO saas_track_id FROM public.tracks WHERE name = 'SaaS Track';
  
  -- Agency Track Goals
  INSERT INTO public.track_goals (track_id, name, description, is_default, sort_order) VALUES 
    (agency_track_id, 'Build $10k/month Agency', 'Scale agency operations to consistent $10k monthly revenue', true, 1),
    (agency_track_id, 'Optimize for 80% Margins', 'Achieve 80% profit margins through team building and automation', false, 2),
    (agency_track_id, 'Scale to $25k/month', 'Expand agency operations to $25k monthly recurring revenue', false, 3);
  
  -- SaaS Track Goals  
  INSERT INTO public.track_goals (track_id, name, description, is_default, sort_order) VALUES 
    (saas_track_id, 'Build First SaaS MVP', 'Develop and launch minimum viable product using Claude Code', true, 1),
    (saas_track_id, 'Reach $5k MRR', 'Achieve $5k monthly recurring revenue from SaaS product', false, 2),
    (saas_track_id, 'Scale to $20k MRR', 'Scale SaaS product to $20k monthly recurring revenue', false, 3);
END $$;

-- Insert initial action types for each track
DO $$
DECLARE
  agency_track_id UUID;
  saas_track_id UUID;
BEGIN
  -- Get track IDs
  SELECT id INTO agency_track_id FROM public.tracks WHERE name = 'Agency Track';
  SELECT id INTO saas_track_id FROM public.tracks WHERE name = 'SaaS Track';
  
  -- Agency Track Action Types
  INSERT INTO public.action_types (track_id, name, description, points, is_auto_tracked) VALUES 
    (agency_track_id, 'Course Completed', 'Completed an agency course module', 10, true),
    (agency_track_id, 'Video Watched', 'Watched a training video', 5, true),
    (agency_track_id, 'Quiz Completed', 'Completed a course quiz', 5, true),
    (agency_track_id, 'Goal Update', 'Posted daily goal progress update', 3, false),
    (agency_track_id, 'Community Post', 'Created a community discussion post', 2, false),
    (agency_track_id, 'Community Comment', 'Commented on community discussion', 1, false);
  
  -- SaaS Track Action Types
  INSERT INTO public.action_types (track_id, name, description, points, is_auto_tracked) VALUES 
    (saas_track_id, 'Course Completed', 'Completed a SaaS development course module', 10, true),
    (saas_track_id, 'Video Watched', 'Watched a development video', 5, true),
    (saas_track_id, 'Quiz Completed', 'Completed a course quiz', 5, true),
    (saas_track_id, 'Goal Update', 'Posted daily goal progress update', 3, false),
    (saas_track_id, 'Community Post', 'Created a community discussion post', 2, false),
    (saas_track_id, 'Community Comment', 'Commented on community discussion', 1, false),
    (saas_track_id, 'Live Session Attended', 'Attended live development session', 8, true),
    (saas_track_id, 'Code Submitted', 'Submitted code for review', 5, false);
END $$;

-- Create function to get filtered courses for user's track and goal
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
) AS $$
BEGIN
  -- If user has no track/goal assignment, return all published courses
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_id 
    AND (current_track_id IS NOT NULL OR current_goal_id IS NOT NULL)
  ) THEN
    RETURN QUERY
    SELECT c.id, c.title, c.description, c.thumbnail_url, c.status, 
           c.price, c.is_free, c.difficulty, c.rating, c.students,
           c.total_videos, c.total_duration_minutes
    FROM public.courses c
    WHERE c.status = 'published';
    RETURN;
  END IF;

  -- Return courses filtered by user's track and goal
  RETURN QUERY
  SELECT DISTINCT c.id, c.title, c.description, c.thumbnail_url, c.status,
         c.price, c.is_free, c.difficulty, c.rating, c.students,
         c.total_videos, c.total_duration_minutes
  FROM public.courses c
  INNER JOIN public.profiles p ON p.id = user_id
  WHERE c.status = 'published'
  AND (
    -- Course is assigned to user's track
    EXISTS (
      SELECT 1 FROM public.course_track_assignments cta 
      WHERE cta.course_id = c.id AND cta.track_id = p.current_track_id
    )
    OR
    -- Course is assigned to user's goal
    EXISTS (
      SELECT 1 FROM public.course_goal_assignments cga
      WHERE cga.course_id = c.id AND cga.goal_id = p.current_goal_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_courses(UUID) TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_actions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_track_assignments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_goal_assignments TO authenticated;
-- No separate course_tags table permissions needed

-- Create view for easy course filtering queries
CREATE OR REPLACE VIEW public.courses_with_assignments AS
SELECT 
  c.*,
  array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as assigned_tracks,
  array_agg(DISTINCT tg.name) FILTER (WHERE tg.name IS NOT NULL) as assigned_goals,
  c.tags as custom_tags
FROM public.courses c
LEFT JOIN public.course_track_assignments cta ON c.id = cta.course_id
LEFT JOIN public.tracks t ON cta.track_id = t.id
LEFT JOIN public.course_goal_assignments cga ON c.id = cga.course_id  
LEFT JOIN public.track_goals tg ON cga.goal_id = tg.id
GROUP BY c.id;

GRANT SELECT ON public.courses_with_assignments TO authenticated;
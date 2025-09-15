-- Student Track Assignment System
-- Links students to their selected learning tracks

-- Student track assignments table
CREATE TABLE public.student_track_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  track_id UUID NOT NULL, -- Will add FK constraint when tracks table exists
  assignment_type TEXT DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'secondary')),
  confidence_score INTEGER DEFAULT 100 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  assignment_source TEXT DEFAULT 'manual' CHECK (assignment_source IN ('manual', 'questionnaire', 'recommendation')),
  assignment_reasoning TEXT,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student preferences table
CREATE TABLE public.student_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  time_commitment_hours INTEGER DEFAULT 5 CHECK (time_commitment_hours >= 1 AND time_commitment_hours <= 40),
  skill_level TEXT DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  learning_pace TEXT DEFAULT 'normal' CHECK (learning_pace IN ('slow', 'normal', 'fast')),
  content_format_preferences JSONB DEFAULT '["video", "text", "interactive"]',
  goal_priorities JSONB DEFAULT '[]',
  difficulty_preference TEXT DEFAULT 'progressive' CHECK (difficulty_preference IN ('easy', 'progressive', 'challenging')),
  notification_preferences JSONB DEFAULT '{"course_updates": true, "progress_reminders": true, "new_recommendations": true}',
  completed_questionnaire BOOLEAN DEFAULT false,
  questionnaire_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course recommendations tracking
CREATE TABLE public.course_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID NOT NULL, -- Will add FK constraint when courses table exists
  recommendation_source TEXT DEFAULT 'algorithm' CHECK (recommendation_source IN ('algorithm', 'manual', 'peer_based', 'track_based')),
  confidence_score INTEGER DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  relevance_score DECIMAL(3,2) DEFAULT 0.50 CHECK (relevance_score >= 0.00 AND relevance_score <= 1.00),
  reasoning TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  viewed BOOLEAN DEFAULT false,
  clicked BOOLEAN DEFAULT false,
  enrolled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX student_track_assignments_student_id_idx ON public.student_track_assignments(student_id);
CREATE INDEX student_track_assignments_track_id_idx ON public.student_track_assignments(track_id);
CREATE INDEX student_track_assignments_active_idx ON public.student_track_assignments(is_active);
CREATE INDEX student_track_assignments_type_idx ON public.student_track_assignments(assignment_type);

CREATE INDEX student_preferences_student_id_idx ON public.student_preferences(student_id);
CREATE INDEX student_preferences_questionnaire_idx ON public.student_preferences(completed_questionnaire);

CREATE INDEX course_recommendations_student_id_idx ON public.course_recommendations(student_id);
CREATE INDEX course_recommendations_course_id_idx ON public.course_recommendations(course_id);
CREATE INDEX course_recommendations_active_idx ON public.course_recommendations(is_active);
CREATE INDEX course_recommendations_source_idx ON public.course_recommendations(recommendation_source);
CREATE INDEX course_recommendations_score_idx ON public.course_recommendations(confidence_score DESC, relevance_score DESC);

-- Unique constraints
ALTER TABLE public.student_track_assignments 
ADD CONSTRAINT unique_student_track_assignment 
UNIQUE (student_id, track_id, assignment_type);

ALTER TABLE public.student_preferences 
ADD CONSTRAINT unique_student_preferences 
UNIQUE (student_id);

-- Enable RLS
ALTER TABLE public.student_track_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student track assignments
CREATE POLICY "Students can manage own track assignments" 
  ON public.student_track_assignments FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Instructors can view student track assignments" 
  ON public.student_track_assignments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
    )
  );

-- RLS Policies for student preferences
CREATE POLICY "Students can manage own preferences" 
  ON public.student_preferences FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Instructors can view student preferences" 
  ON public.student_preferences FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
    )
  );

-- RLS Policies for course recommendations
CREATE POLICY "Students can manage own recommendations" 
  ON public.course_recommendations FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Instructors can view course recommendations" 
  ON public.course_recommendations FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER student_track_assignments_updated_at
  BEFORE UPDATE ON public.student_track_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER student_preferences_updated_at
  BEFORE UPDATE ON public.student_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER course_recommendations_updated_at
  BEFORE UPDATE ON public.course_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_track_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_recommendations TO authenticated;

-- Note: Analytics view will be created after tracks table is implemented
-- Uncomment this view once tracks table exists:
/*
CREATE VIEW public.student_track_progress_summary AS
SELECT 
  sta.student_id,
  p.email,
  p.full_name,
  t.title as track_title,
  t.focus_area,
  sta.assignment_type,
  sta.progress_percentage,
  sta.confidence_score,
  sta.assignment_source,
  sta.assigned_at,
  sta.completed_at
FROM public.student_track_assignments sta
JOIN public.profiles p ON p.id = sta.student_id
JOIN public.tracks t ON t.id = sta.track_id
WHERE sta.is_active = true;
*/
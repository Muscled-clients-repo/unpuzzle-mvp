-- Enhanced courses schema for instructor UI compatibility
-- This schema matches the exact data structure expected by the instructor courses page

-- First, create the enhanced courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic course info
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  
  -- Status that matches UI expectations
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'under_review')),
  
  -- Pricing
  price DECIMAL(10,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT false,
  
  -- Content metrics that UI displays
  total_videos INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  
  -- Student metrics that UI displays
  students INTEGER DEFAULT 0, -- enrollmentCount equivalent
  revenue DECIMAL(10,2) DEFAULT 0,
  completion_rate INTEGER DEFAULT 0, -- percentage 0-100
  
  -- Instructor-specific metrics
  pending_confusions INTEGER DEFAULT 0,
  
  -- Additional metadata
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[] DEFAULT '{}',
  rating DECIMAL(3,2) DEFAULT 0.00,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX courses_instructor_id_idx ON public.courses(instructor_id);
CREATE INDEX courses_status_idx ON public.courses(status);
CREATE INDEX courses_created_at_idx ON public.courses(created_at);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
-- Instructors can view, create, and manage their own courses
CREATE POLICY "Instructors can manage own courses" 
  ON public.courses FOR ALL
  USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);

-- Students can view published courses
CREATE POLICY "Students can view published courses" 
  ON public.courses FOR SELECT 
  USING (
    status = 'published' AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('student', 'instructor', 'admin')
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample data that matches the mock data structure
INSERT INTO public.courses (
  instructor_id, 
  title, 
  status, 
  students, 
  completion_rate, 
  revenue, 
  total_videos, 
  total_duration_minutes, 
  pending_confusions,
  price,
  difficulty
) VALUES 
-- Note: Replace 'YOUR_USER_ID_HERE' with actual instructor user ID
-- You can get this from: SELECT id FROM auth.users WHERE email = 'your-instructor-email@example.com';
(
  (SELECT id FROM public.profiles WHERE role = 'instructor' LIMIT 1), -- This will use the first instructor
  'React Masterclass',
  'published',
  423,
  67,
  25380,
  48,
  750, -- 12h 30m = 750 minutes
  3,
  199.99,
  'intermediate'
),
(
  (SELECT id FROM public.profiles WHERE role = 'instructor' LIMIT 1),
  'Python for Data Science',
  'published',
  312,
  72,
  18720,
  36,
  555, -- 9h 15m = 555 minutes
  1,
  149.99,
  'beginner'
),
(
  (SELECT id FROM public.profiles WHERE role = 'instructor' LIMIT 1),
  'Advanced TypeScript',
  'draft',
  0,
  0,
  0,
  12,
  225, -- 3h 45m = 225 minutes
  0,
  299.99,
  'advanced'
);

-- Function to calculate course duration in human-readable format
CREATE OR REPLACE FUNCTION public.format_duration(minutes INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF minutes IS NULL OR minutes = 0 THEN
    RETURN '0m';
  END IF;
  
  IF minutes < 60 THEN
    RETURN minutes || 'm';
  ELSE
    RETURN (minutes / 60) || 'h ' || (minutes % 60) || 'm';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to format last updated time (for now just relative to created_at)
CREATE OR REPLACE FUNCTION public.format_last_updated(updated_at TIMESTAMPTZ)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN updated_at > NOW() - INTERVAL '1 hour' THEN 
      EXTRACT(EPOCH FROM (NOW() - updated_at))::INTEGER / 60 || ' minutes ago'
    WHEN updated_at > NOW() - INTERVAL '1 day' THEN 
      EXTRACT(EPOCH FROM (NOW() - updated_at))::INTEGER / 3600 || ' hours ago'
    WHEN updated_at > NOW() - INTERVAL '7 days' THEN 
      EXTRACT(EPOCH FROM (NOW() - updated_at))::INTEGER / 86400 || ' days ago'
    ELSE 
      EXTRACT(EPOCH FROM (NOW() - updated_at))::INTEGER / 604800 || ' weeks ago'
  END;
END;
$$ LANGUAGE plpgsql;

-- View that matches exact mock data structure for easy querying
CREATE OR REPLACE VIEW public.instructor_courses_view AS 
SELECT 
  c.id,
  c.title,
  c.thumbnail_url,
  c.status,
  c.students,
  c.completion_rate AS "completionRate",
  c.revenue,
  format_last_updated(c.updated_at) AS "lastUpdated",
  c.total_videos AS "totalVideos",
  format_duration(c.total_duration_minutes) AS "totalDuration",
  c.pending_confusions AS "pendingConfusions",
  c.instructor_id,
  c.created_at,
  c.updated_at
FROM public.courses c;

-- Grant access to the view
GRANT SELECT ON public.instructor_courses_view TO authenticated;
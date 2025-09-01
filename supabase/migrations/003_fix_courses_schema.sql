-- Fix courses schema - Drop existing and recreate with enhanced structure
-- This migration safely replaces the old courses table with the enhanced version

-- First, drop existing views and functions that depend on courses table
DROP VIEW IF EXISTS public.instructor_courses_view CASCADE;
DROP FUNCTION IF EXISTS public.format_duration(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.format_last_updated(TIMESTAMPTZ) CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Instructors can manage own courses" ON public.courses;
DROP POLICY IF EXISTS "Students can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can view own courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can update own courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can delete own courses" ON public.courses;
DROP POLICY IF EXISTS "Public can view published courses" ON public.courses;

-- Drop existing triggers
DROP TRIGGER IF EXISTS courses_updated_at ON public.courses;

-- Drop the existing courses table
DROP TABLE IF EXISTS public.courses CASCADE;

-- Now create the enhanced courses table fresh
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
  students INTEGER DEFAULT 0,
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
CREATE POLICY "Instructors can manage own courses" 
  ON public.courses FOR ALL
  USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);

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

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to format duration
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

-- Create function to format last updated time
CREATE OR REPLACE FUNCTION public.format_last_updated(updated_at TIMESTAMPTZ)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN updated_at > NOW() - INTERVAL '1 hour' THEN 
      CASE 
        WHEN EXTRACT(EPOCH FROM (NOW() - updated_at))::INTEGER / 60 = 0 THEN 'just now'
        ELSE EXTRACT(EPOCH FROM (NOW() - updated_at))::INTEGER / 60 || ' minutes ago'
      END
    WHEN updated_at > NOW() - INTERVAL '1 day' THEN 
      EXTRACT(EPOCH FROM (NOW() - updated_at))::INTEGER / 3600 || ' hours ago'
    WHEN updated_at > NOW() - INTERVAL '7 days' THEN 
      EXTRACT(EPOCH FROM (NOW() - updated_at))::INTEGER / 86400 || ' days ago'
    WHEN updated_at > NOW() - INTERVAL '30 days' THEN 
      EXTRACT(EPOCH FROM (NOW() - updated_at))::INTEGER / 604800 || ' weeks ago'
    ELSE 
      EXTRACT(EPOCH FROM (NOW() - updated_at))::INTEGER / 2592000 || ' months ago'
  END;
END;
$$ LANGUAGE plpgsql;

-- Create view that matches exact mock data structure for easy querying
CREATE OR REPLACE VIEW public.instructor_courses_view AS 
SELECT 
  c.id,
  c.title,
  c.thumbnail_url AS thumbnail,
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

-- Insert sample data that matches the mock data structure
-- First, check if we have an instructor user, if not, this will be skipped
DO $$
DECLARE
  instructor_id_var UUID;
BEGIN
  -- Get the first instructor user ID
  SELECT id INTO instructor_id_var FROM public.profiles WHERE role = 'instructor' LIMIT 1;
  
  -- Only insert if we have an instructor
  IF instructor_id_var IS NOT NULL THEN
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
      difficulty,
      thumbnail_url,
      description
    ) VALUES 
    (
      instructor_id_var,
      'React Masterclass',
      'published',
      423,
      67,
      25380,
      48,
      750, -- 12h 30m = 750 minutes
      3,
      199.99,
      'intermediate',
      '/api/placeholder/400/225',
      'Master React from basics to advanced concepts including hooks, context, and performance optimization'
    ),
    (
      instructor_id_var,
      'Python for Data Science',
      'published',
      312,
      72,
      18720,
      36,
      555, -- 9h 15m = 555 minutes
      1,
      149.99,
      'beginner',
      '/api/placeholder/400/225',
      'Learn Python programming with focus on data science libraries like NumPy, Pandas, and Matplotlib'
    ),
    (
      instructor_id_var,
      'Advanced TypeScript',
      'draft',
      0,
      0,
      0,
      12,
      225, -- 3h 45m = 225 minutes
      0,
      299.99,
      'advanced',
      '/api/placeholder/400/225',
      'Deep dive into TypeScript advanced features, generics, decorators, and type gymnastics'
    );
    
    RAISE NOTICE 'Sample courses inserted successfully for instructor %', instructor_id_var;
  ELSE
    RAISE NOTICE 'No instructor found. Skipping sample data insertion. Create an instructor user first.';
  END IF;
END $$;
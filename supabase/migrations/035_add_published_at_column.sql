-- Add published_at column to courses table for tracking publication time

ALTER TABLE public.courses
ADD COLUMN published_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.courses.published_at IS 'Timestamp when the course was published';

-- Create index for efficient querying of published courses
CREATE INDEX IF NOT EXISTS idx_courses_published_at
ON public.courses(published_at)
WHERE status = 'published';
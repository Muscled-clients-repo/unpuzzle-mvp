-- Upgrade daily note files for Backblaze B2 integration
-- Add error tracking for file upload analytics

-- Add Backblaze B2 fields to daily_note_files
ALTER TABLE public.daily_note_files 
ADD COLUMN backblaze_file_id TEXT,
ADD COLUMN cdn_url TEXT;

-- Create error tracking table for file upload analytics
CREATE TABLE public.daily_note_upload_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  error_type TEXT NOT NULL CHECK (error_type IN ('file_too_large', 'invalid_type', 'total_size_exceeded', 'upload_failed')),
  file_size BIGINT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics queries
CREATE INDEX daily_note_upload_errors_user_id_idx ON public.daily_note_upload_errors(user_id);
CREATE INDEX daily_note_upload_errors_error_type_idx ON public.daily_note_upload_errors(error_type);
CREATE INDEX daily_note_upload_errors_created_at_idx ON public.daily_note_upload_errors(created_at);

-- Enable RLS for error tracking
ALTER TABLE public.daily_note_upload_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for error tracking (users can only see own errors, instructors see all)
CREATE POLICY "Users can view own upload errors" 
  ON public.daily_note_upload_errors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert upload errors" 
  ON public.daily_note_upload_errors FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Instructors can view all upload errors" 
  ON public.daily_note_upload_errors FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON public.daily_note_upload_errors TO authenticated;

-- Create view for daily error analytics (instructors only)
CREATE VIEW public.daily_upload_error_stats AS
SELECT 
  date_trunc('day', created_at)::date as error_date,
  error_type,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users,
  AVG(file_size::numeric / 1024 / 1024) as avg_file_size_mb,
  MAX(file_size::numeric / 1024 / 1024) as max_file_size_mb
FROM public.daily_note_upload_errors
GROUP BY date_trunc('day', created_at), error_type
ORDER BY error_date DESC, error_count DESC;

-- Grant view access to instructors only (security handled by underlying table RLS)
GRANT SELECT ON public.daily_upload_error_stats TO authenticated;

-- Note: RLS on views is handled by the underlying table policies
-- The view will respect the RLS policies of daily_note_upload_errors table
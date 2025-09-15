-- Daily Note File Attachments System
-- Architecture-compliant file storage for student daily updates

-- File attachments table for daily notes
CREATE TABLE public.daily_note_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_note_id UUID REFERENCES public.user_daily_notes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  upload_status TEXT DEFAULT 'completed' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX daily_note_files_note_id_idx ON public.daily_note_files(daily_note_id);
CREATE INDEX daily_note_files_user_id_idx ON public.daily_note_files(user_id);
CREATE INDEX daily_note_files_status_idx ON public.daily_note_files(upload_status);

-- Enable RLS
ALTER TABLE public.daily_note_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file attachments (users manage own files)
CREATE POLICY "Users can manage own daily note files" 
  ON public.daily_note_files FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instructors can view student daily note files" 
  ON public.daily_note_files FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER daily_note_files_updated_at
  BEFORE UPDATE ON public.daily_note_files
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_note_files TO authenticated;

-- Storage bucket for daily note files (if using Supabase Storage)
-- Note: This would typically be created via Supabase dashboard or storage API
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('daily-note-files', 'daily-note-files', false, 52428800, ARRAY['image/*', 'application/pdf', 'text/*']);

-- Optional: Create storage policy for daily note files
-- CREATE POLICY "Users can upload their own daily note files" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'daily-note-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view their own daily note files" ON storage.objects
--   FOR SELECT USING (bucket_id = 'daily-note-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their own daily note files" ON storage.objects
--   FOR DELETE USING (bucket_id = 'daily-note-files' AND auth.uid()::text = (storage.foldername(name))[1]);
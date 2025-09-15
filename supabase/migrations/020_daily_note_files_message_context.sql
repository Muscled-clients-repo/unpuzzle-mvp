-- Add message context to daily note files
-- This allows us to track which specific message an image was uploaded with

ALTER TABLE public.daily_note_files 
ADD COLUMN message_text TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.daily_note_files.message_text IS 'The specific message text that was added with this file upload';

-- Add index for searching by message text
CREATE INDEX daily_note_files_message_text_idx ON public.daily_note_files(message_text);
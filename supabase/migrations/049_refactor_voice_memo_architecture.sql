-- Migration: 049_refactor_voice_memo_architecture.sql
-- Purpose: Refactor voice memo architecture to match industry standards
-- Add proper columns for voice memo metadata instead of parsing text

-- Add new columns for voice memo metadata
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS duration_seconds DECIMAL(10,2);
ALTER TABLE reflections ADD COLUMN IF NOT EXISTS video_timestamp_seconds DECIMAL(10,2);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reflections_voice_memos
  ON reflections(user_id, video_id)
  WHERE reflection_type = 'voice' AND file_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reflections_video_timestamp
  ON reflections(video_timestamp_seconds)
  WHERE video_timestamp_seconds IS NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN reflections.file_url IS 'Direct URL to the voice memo audio file';
COMMENT ON COLUMN reflections.duration_seconds IS 'Duration of the voice memo in seconds';
COMMENT ON COLUMN reflections.video_timestamp_seconds IS 'Video timestamp when reflection was captured';

-- Update check constraint to be more flexible for future media types
ALTER TABLE reflections DROP CONSTRAINT IF EXISTS chk_reflection_type;
ALTER TABLE reflections ADD CONSTRAINT chk_reflection_type
  CHECK (reflection_type IN ('voice', 'screenshot', 'loom', 'text'));

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Voice memo architecture refactored successfully!';
  RAISE NOTICE 'Added file_url, duration_seconds, and video_timestamp_seconds columns';
  RAISE NOTICE 'This matches industry standards used by WhatsApp, Discord, etc.';
END $$;
-- Migration: Extend media_files table for studio support
-- Description: Add source_type and studio_metadata columns to track studio recordings and exports
-- Date: 2025-10-07

-- Add source_type column to distinguish upload vs recording vs export
ALTER TABLE media_files
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'upload'
  CHECK (source_type IN ('upload', 'recording', 'export'));

-- Add studio_metadata JSONB column for studio-specific data
ALTER TABLE media_files
  ADD COLUMN IF NOT EXISTS studio_metadata JSONB;

-- Create index for filtering by source_type
CREATE INDEX IF NOT EXISTS idx_media_files_source_type
  ON media_files(source_type);

-- Add comment for documentation
COMMENT ON COLUMN media_files.source_type IS 'Origin of the media file: upload (manual upload), recording (studio screen/voice recording), export (studio timeline export)';
COMMENT ON COLUMN media_files.studio_metadata IS 'Studio-specific metadata: recording_duration_ms, track_type, original_clip_id, project_id, etc.';

-- Example studio_metadata structure for different source types:
--
-- For source_type = 'recording':
-- {
--   "recording_duration_ms": 45000,
--   "track_type": "video",  // or "audio"
--   "original_clip_id": "clip-123",
--   "recorded_at": "2025-10-07T16:30:00Z"
-- }
--
-- For source_type = 'export':
-- {
--   "project_id": "uuid-456",
--   "exported_at": "2025-10-07T16:45:00Z",
--   "export_settings": {
--     "resolution": "1920x1080",
--     "fps": 30,
--     "codec": "h264"
--   }
-- }

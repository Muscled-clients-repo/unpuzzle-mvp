-- Migration: Create studio_projects table
-- Description: Store video studio project state with timeline data and auto-save support
-- Date: 2025-10-07

-- Create studio_projects table
CREATE TABLE IF NOT EXISTS studio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Project metadata
  title TEXT NOT NULL DEFAULT 'Untitled Project',
  description TEXT,

  -- Timeline state (complete snapshot of clips, tracks, and frames)
  timeline_state JSONB NOT NULL,
  -- Example structure:
  -- {
  --   "clips": [
  --     {
  --       "id": "clip-1",
  --       "name": "Intro Video",
  --       "trackIndex": 0,
  --       "startFrame": 0,
  --       "durationFrames": 300,
  --       "trimStartFrame": 0,
  --       "trimEndFrame": 300,
  --       "source": {
  --         "type": "media_file",
  --         "mediaFileId": "uuid-123",
  --         "url": "https://cdn.example.com/video.mp4"
  --       }
  --     }
  --   ],
  --   "tracks": [
  --     {"id": "V1", "type": "video", "name": "Video Track 1"},
  --     {"id": "A1", "type": "audio", "name": "Audio Track 1"}
  --   ],
  --   "totalFrames": 3600,
  --   "fps": 30
  -- }

  -- Draft/Published state
  is_draft BOOLEAN DEFAULT TRUE,

  -- Export tracking
  last_export_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
  last_exported_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_studio_projects_instructor
  ON studio_projects(instructor_id);

CREATE INDEX IF NOT EXISTS idx_studio_projects_is_draft
  ON studio_projects(is_draft);

CREATE INDEX IF NOT EXISTS idx_studio_projects_updated
  ON studio_projects(updated_at DESC);

-- Row Level Security (RLS)
ALTER TABLE studio_projects ENABLE ROW LEVEL SECURITY;

-- Policy: Instructors can view their own projects
CREATE POLICY "Instructors can view own studio projects"
  ON studio_projects FOR SELECT
  USING (auth.uid() = instructor_id);

-- Policy: Instructors can create their own projects
CREATE POLICY "Instructors can create own studio projects"
  ON studio_projects FOR INSERT
  WITH CHECK (auth.uid() = instructor_id);

-- Policy: Instructors can update their own projects
CREATE POLICY "Instructors can update own studio projects"
  ON studio_projects FOR UPDATE
  USING (auth.uid() = instructor_id);

-- Policy: Instructors can delete their own projects
CREATE POLICY "Instructors can delete own studio projects"
  ON studio_projects FOR DELETE
  USING (auth.uid() = instructor_id);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_studio_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_studio_projects_updated_at
  BEFORE UPDATE ON studio_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_studio_projects_updated_at();

-- Add comments for documentation
COMMENT ON TABLE studio_projects IS 'Stores video studio project state for auto-save and re-editing';
COMMENT ON COLUMN studio_projects.timeline_state IS 'Complete timeline snapshot: clips, tracks, frames, etc.';
COMMENT ON COLUMN studio_projects.is_draft IS 'TRUE for auto-saved drafts, FALSE for manually published projects';
COMMENT ON COLUMN studio_projects.last_export_id IS 'Reference to the most recent exported media file';

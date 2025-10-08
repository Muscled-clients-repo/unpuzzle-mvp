# Studio Database Migrations - SQL Scripts

**Date:** October 7, 2025
**Time:** 4:36 PM EST
**Purpose:** Extend media_files table and create studio_projects table for video studio integration

---

## Migration Files Created

1. ✅ `/supabase/migrations/116_extend_media_files_for_studio.sql`
2. ✅ `/supabase/migrations/117_create_studio_projects.sql`

---

## SQL Script 1: Extend media_files Table

**Run this first in Supabase SQL Editor:**

```sql
-- Migration: Extend media_files table for studio support
-- Description: Add source_type and studio_metadata columns to track studio recordings and exports

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

-- Add comments for documentation
COMMENT ON COLUMN media_files.source_type IS 'Origin of the media file: upload (manual upload), recording (studio screen/voice recording), export (studio timeline export)';
COMMENT ON COLUMN media_files.studio_metadata IS 'Studio-specific metadata: recording_duration_ms, track_type, original_clip_id, project_id, etc.';
```

### Expected Results:
- ✅ `source_type` column added with CHECK constraint
- ✅ `studio_metadata` JSONB column added
- ✅ Index created on `source_type`
- ✅ Column comments added

### Example Data After Migration:

**For uploaded videos (existing data):**
```json
{
  "source_type": "upload",
  "studio_metadata": null
}
```

**For studio recordings:**
```json
{
  "source_type": "recording",
  "studio_metadata": {
    "recording_duration_ms": 45000,
    "track_type": "video",
    "original_clip_id": "clip-123",
    "recorded_at": "2025-10-07T16:30:00Z"
  }
}
```

**For studio exports:**
```json
{
  "source_type": "export",
  "studio_metadata": {
    "project_id": "uuid-456",
    "exported_at": "2025-10-07T16:45:00Z",
    "export_settings": {
      "resolution": "1920x1080",
      "fps": 30,
      "codec": "h264"
    }
  }
}
```

---

## SQL Script 2: Create studio_projects Table

**Run this second in Supabase SQL Editor:**

```sql
-- Migration: Create studio_projects table
-- Description: Store video studio project state with timeline data and auto-save support

-- Create studio_projects table
CREATE TABLE IF NOT EXISTS studio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Project metadata
  title TEXT NOT NULL DEFAULT 'Untitled Project',
  description TEXT,

  -- Timeline state (complete snapshot of clips, tracks, and frames)
  timeline_state JSONB NOT NULL,

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
```

### Expected Results:
- ✅ `studio_projects` table created
- ✅ 3 indexes created (instructor, is_draft, updated_at)
- ✅ RLS enabled with 4 policies
- ✅ Auto-update trigger for `updated_at` created
- ✅ Table and column comments added

### Example Timeline State Structure:

```json
{
  "clips": [
    {
      "id": "clip-1",
      "name": "Intro Video",
      "trackIndex": 0,
      "startFrame": 0,
      "durationFrames": 300,
      "trimStartFrame": 0,
      "trimEndFrame": 300,
      "source": {
        "type": "media_file",
        "mediaFileId": "uuid-123",
        "url": "https://cdn.example.com/video.mp4"
      }
    },
    {
      "id": "clip-2",
      "name": "Screen Recording",
      "trackIndex": 0,
      "startFrame": 300,
      "durationFrames": 150,
      "source": {
        "type": "recording",
        "blob": "blob:http://localhost:3001/abc-123"
      }
    }
  ],
  "tracks": [
    {"id": "V1", "type": "video", "name": "Video Track 1"},
    {"id": "A1", "type": "audio", "name": "Audio Track 1"}
  ],
  "totalFrames": 3600,
  "fps": 30
}
```

---

## Verification Queries

After running both migrations, verify with these queries:

### 1. Check media_files columns:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'media_files'
  AND column_name IN ('source_type', 'studio_metadata');
```

**Expected output:**
| column_name | data_type | column_default |
|-------------|-----------|----------------|
| source_type | character varying | 'upload' |
| studio_metadata | jsonb | NULL |

### 2. Check studio_projects table:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'studio_projects';
```

**Expected output:**
| table_name |
|------------|
| studio_projects |

### 3. Check RLS policies:
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'studio_projects';
```

**Expected output:**
| policyname | cmd |
|------------|-----|
| Instructors can view own studio projects | SELECT |
| Instructors can create own studio projects | INSERT |
| Instructors can update own studio projects | UPDATE |
| Instructors can delete own studio projects | DELETE |

### 4. Test insert (as authenticated instructor):
```sql
-- This should succeed when run by an authenticated instructor
INSERT INTO studio_projects (
  instructor_id,
  title,
  timeline_state
) VALUES (
  auth.uid(),
  'Test Project',
  '{"clips": [], "tracks": [], "totalFrames": 0}'::jsonb
);
```

---

## Rollback Scripts (if needed)

### Rollback Script 1 (media_files):
```sql
-- Remove columns from media_files
DROP INDEX IF EXISTS idx_media_files_source_type;
ALTER TABLE media_files DROP COLUMN IF EXISTS source_type;
ALTER TABLE media_files DROP COLUMN IF EXISTS studio_metadata;
```

### Rollback Script 2 (studio_projects):
```sql
-- Drop studio_projects table and related objects
DROP TRIGGER IF EXISTS trigger_update_studio_projects_updated_at ON studio_projects;
DROP FUNCTION IF EXISTS update_studio_projects_updated_at();
DROP TABLE IF EXISTS studio_projects CASCADE;
```

---

## Next Steps After Running Migrations

1. ✅ Run Script 1 in Supabase SQL Editor
2. ✅ Run Script 2 in Supabase SQL Editor
3. ✅ Run verification queries to confirm
4. ⏳ Generate TypeScript types: `npx supabase gen types typescript --linked`
5. ⏳ Update `src/types/supabase.ts` with new types
6. ⏳ Create server actions: `src/app/actions/studio-actions.ts`
7. ⏳ Create TanStack Query hooks: `src/hooks/use-studio-queries.ts`
8. ⏳ Create Zustand store slice: `src/stores/slices/studio-slice.ts`

---

## Migration Summary

### Changes to `media_files`:
- Added `source_type` column (VARCHAR, default 'upload')
- Added `studio_metadata` column (JSONB, nullable)
- Added index on `source_type`

### New `studio_projects` table:
- Stores complete timeline state as JSONB
- Supports draft/published states
- Tracks last export to media_files
- RLS policies for instructor-only access
- Auto-updating timestamps

### Benefits:
- ✅ Unified media library (uploads + recordings + exports in one place)
- ✅ Auto-save support with draft states
- ✅ Can import media into studio
- ✅ Can save recordings to media library
- ✅ Can export timeline to media library
- ✅ Projects persist for re-editing

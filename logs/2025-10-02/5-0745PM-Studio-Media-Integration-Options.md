# Studio + Media Integration - Architecture Options
**Date**: October 2, 2025 - 7:45 PM
**Context**: Integrate `/instructor/media` assets with `/instructor/studio` for course content creation
**Goals**:
- Import media assets into studio timeline
- Save screen recordings to media library
- Create course content from studio output

---

## Current State Analysis

### What You Have Now:

**`/instructor/media`** (Fully Implemented)
- ✅ Database: `media_files` table with Backblaze B2 storage
- ✅ Features: Thumbnails, durations, tags, CDN URLs
- ✅ Types: Videos, images, audio files
- ✅ 30 files per page with lazy loading
- ✅ Bulk operations and filtering

**`/instructor/studio`** (Fully Implemented)
- ✅ Virtual Timeline Engine (frame-based editing)
- ✅ Screen recording with `useRecording` hook
- ✅ Clips and tracks management (V1 video, A1 audio)
- ✅ Resizable panels and view modes
- ✅ Timeline scrubbing and playback
- ❌ No media library integration
- ❌ Recordings not saved to database
- ❌ No export to courses

**Key Gap**:
- Studio operates in isolation - clips exist only in browser state
- No connection to media_files table
- No way to persist recordings or import existing assets

---

## Architecture Options

### **Option 1: Unified Media Library** (Recommended)
**Store ALL media (uploads + studio recordings) in the same `media_files` table**

#### Database Schema:
```sql
-- Extend existing media_files table
ALTER TABLE media_files ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'upload';
-- Values: 'upload', 'studio_recording', 'studio_export'

ALTER TABLE media_files ADD COLUMN IF NOT EXISTS studio_metadata JSONB;
-- Example studio_metadata:
{
  "recording_duration_ms": 45000,
  "track_type": "video", // or "audio"
  "original_clip_id": "clip-xyz",
  "export_settings": {
    "resolution": "1920x1080",
    "codec": "h264",
    "bitrate": "5000k"
  }
}

-- Optional: Track studio projects
CREATE TABLE studio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  -- Timeline state (JSON snapshot)
  timeline_state JSONB NOT NULL,
  -- Example: { clips: [...], tracks: [...], totalFrames: 3600 }

  -- Export info
  exported_media_file_id UUID REFERENCES media_files(id),
  export_status VARCHAR(20) DEFAULT 'draft', -- draft, rendering, exported

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_studio_projects_instructor ON studio_projects(instructor_id);
CREATE INDEX idx_studio_projects_course ON studio_projects(related_course_id);
```

#### Pros:
- ✅ **Single source of truth** - All media in one place
- ✅ **Reuse existing infrastructure** - Backblaze upload, CDN, thumbnails
- ✅ **Consistent UI** - Same media grid for uploads and recordings
- ✅ **Simpler queries** - One table to manage
- ✅ **Easy filtering** - `WHERE source_type = 'studio_recording'`

#### Cons:
- ⚠️ **Mixed concerns** - Uploads and studio content in same table
- ⚠️ **Large JSONB** - studio_metadata could get complex
- ⚠️ **Tight coupling** - Studio depends on media_files structure

#### Best For:
- Production MVP (ship fast)
- When recordings are treated like any other media
- Minimizing database complexity

---

### **Option 2: Separate Studio Assets Table**
**Create dedicated `studio_assets` table for recordings and exports**

#### Database Schema:
```sql
CREATE TABLE studio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- File storage (same as media_files)
  name TEXT NOT NULL,
  backblaze_file_id TEXT,
  backblaze_url TEXT NOT NULL,
  cdn_url TEXT,
  thumbnail_url TEXT,

  -- Asset metadata
  file_type VARCHAR(50) NOT NULL, -- video/mp4, audio/wav, etc.
  file_size BIGINT,
  duration_seconds INT,

  -- Studio-specific
  asset_type VARCHAR(20) NOT NULL, -- 'recording', 'export', 'imported'
  source_clip_id TEXT, -- Original clip ID from timeline
  recording_settings JSONB,

  -- Project association
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE CASCADE,

  -- Optional: Link to media_files if imported from /media
  source_media_file_id UUID REFERENCES media_files(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_studio_assets_instructor ON studio_assets(instructor_id);
CREATE INDEX idx_studio_assets_project ON studio_assets(studio_project_id);
CREATE INDEX idx_studio_assets_type ON studio_assets(asset_type);

-- Still need studio_projects table (same as Option 1)
```

#### Pros:
- ✅ **Clean separation** - Studio assets isolated from media library
- ✅ **Studio-specific fields** - No JSONB bloat in media_files
- ✅ **Flexible schema** - Can add studio features without affecting media
- ✅ **Better organization** - Clear distinction between uploads and recordings

#### Cons:
- ❌ **Duplicate infrastructure** - Need separate upload/CDN logic
- ❌ **More complexity** - Two tables to manage
- ❌ **Harder to share** - Can't easily use studio assets in courses without copying

#### Best For:
- Long-term scalability
- When studio is a distinct product area
- Teams with dedicated studio development

---

### **Option 3: Hybrid with Virtual Assets**
**Reference media_files for imports, store only recordings in studio_assets**

#### Database Schema:
```sql
-- Minimal studio_assets for recordings only
CREATE TABLE studio_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE CASCADE,

  -- Recording-specific
  recording_blob_url TEXT NOT NULL, -- Temporary browser blob or permanent CDN
  duration_ms INT NOT NULL,
  track_type VARCHAR(10) NOT NULL, -- 'video' or 'audio'

  -- Optional: Promote to media_files
  promoted_to_media BOOLEAN DEFAULT false,
  media_file_id UUID REFERENCES media_files(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline uses a mix of:
-- 1. References to media_files (imported assets)
-- 2. References to studio_recordings (screen captures)

-- Example timeline_state JSONB:
{
  "clips": [
    {
      "id": "clip-1",
      "type": "media_file",
      "media_file_id": "uuid-123", // Reference to media_files
      "startFrame": 0,
      "durationFrames": 300
    },
    {
      "id": "clip-2",
      "type": "recording",
      "studio_recording_id": "uuid-456", // Reference to studio_recordings
      "startFrame": 300,
      "durationFrames": 150
    }
  ]
}
```

#### Pros:
- ✅ **Best of both worlds** - Reuse media, isolated recordings
- ✅ **Flexible promotion** - Recordings can become permanent media
- ✅ **Efficient storage** - Only store what's unique to studio
- ✅ **Clear data flow** - Import from media, export to media

#### Cons:
- ⚠️ **Complex queries** - Need joins across multiple tables
- ⚠️ **State management** - Timeline tracks two asset types
- ⚠️ **Migration complexity** - Promoting recordings requires extra logic

#### Best For:
- When recordings are temporary (most get discarded)
- Need tight integration with media library
- Want to "graduate" recordings to permanent media

---

## UI/UX Flow Options

### **Flow 1: Asset Browser Panel** (Recommended)

**User Experience**:
1. Studio opens with left sidebar containing "Assets" tab
2. Assets tab shows:
   - All media from `/instructor/media` (paginated)
   - Filter: Videos, Images, Audio
   - Search by name/tags
   - Drag-and-drop to timeline
3. Dragging a media file creates a clip on selected track
4. Preview on hover

**Implementation**:
```tsx
// In VideoStudio.tsx
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={20} minSize={15}>
    <Tabs defaultValue="assets">
      <TabsList>
        <TabsTrigger value="assets">Assets</TabsTrigger>
        <TabsTrigger value="recordings">Recordings</TabsTrigger>
      </TabsList>

      <TabsContent value="assets">
        <MediaAssetBrowser
          onDragStart={(mediaFile) => handleAssetDrag(mediaFile)}
        />
      </TabsContent>

      <TabsContent value="recordings">
        <StudioRecordingsList />
      </TabsContent>
    </Tabs>
  </ResizablePanel>

  {/* Existing studio panels */}
</ResizablePanelGroup>
```

**Pros**:
- 🎯 Always accessible - no modal interruption
- 🎨 Visual browsing with thumbnails
- ⚡ Fast drag-and-drop workflow
- 📱 Familiar pattern (similar to video editors like Premiere)

**Cons**:
- ⚠️ Less screen space for timeline
- ⚠️ More complex layout management

---

### **Flow 2: Modal Asset Picker**

**User Experience**:
1. Click "Import Asset" button in studio toolbar
2. Opens modal showing media library
3. Select one or multiple files
4. Choose target track and position
5. Assets added to timeline

**Implementation**:
```tsx
// In VideoStudio.tsx
const [showAssetPicker, setShowAssetPicker] = useState(false)

<Button onClick={() => setShowAssetPicker(true)}>
  <Upload className="mr-2 h-4 w-4" />
  Import Assets
</Button>

<MediaAssetPickerModal
  open={showAssetPicker}
  onClose={() => setShowAssetPicker(false)}
  onSelect={(files) => handleImportAssets(files)}
  multiple={true}
/>
```

**Pros**:
- ✅ More timeline space
- ✅ Focused selection flow
- ✅ Easier to implement (4-6 hours)

**Cons**:
- ⚠️ Context switching (modal interrupts workflow)
- ⚠️ Can't see timeline while picking

---

### **Flow 3: Direct Route Integration**

**User Experience**:
1. In `/instructor/media`, add action menu: "Send to Studio"
2. Click "Send to Studio" → redirects to `/instructor/studio?import=<media_id>`
3. Studio detects `?import` param and auto-adds to timeline
4. Can queue multiple files: `?import=id1,id2,id3`

**Implementation**:
```tsx
// In media page dropdown
<DropdownMenuItem onClick={() => sendToStudio(item.id)}>
  <PlayCircle className="mr-2 h-4 w-4" />
  Send to Studio
</DropdownMenuItem>

// In studio page.tsx
const searchParams = useSearchParams()
const importIds = searchParams.get('import')?.split(',') || []

useEffect(() => {
  if (importIds.length > 0) {
    importMediaFiles(importIds)
  }
}, [importIds])
```

**Pros**:
- 🚀 No new UI needed in studio
- 🎯 Intent-based workflow (start in media, finish in studio)
- ⚡ Fast implementation (2-3 hours)

**Cons**:
- ⚠️ Page navigation required
- ⚠️ Can't browse while editing
- ⚠️ No visual feedback before import

---

## Recording Save Options

### **Approach A: Save to Media Library** (Recommended)

**Flow**:
1. User records screen in studio
2. Recording appears as clip on timeline
3. Click "Save Recording" button on clip
4. Opens dialog: Name, tags, description
5. Uploads to Backblaze via existing media upload action
6. Saved to `media_files` with `source_type = 'studio_recording'`
7. Now available in `/instructor/media`

**Implementation**:
```typescript
// In useRecording.ts
const saveRecordingToMedia = async (clip: Clip) => {
  // Convert blob to file
  const blob = await fetch(clip.thumbnailUrl).then(r => r.blob())
  const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'video/webm' })

  // Upload using existing media action
  const result = await uploadMediaFileAction(file, {
    name: clip.name || 'Screen Recording',
    tags: ['studio', 'recording'],
    source_type: 'studio_recording',
    studio_metadata: {
      recording_duration_ms: clip.durationFrames * (1000 / 30), // Convert frames to ms
      track_type: clip.trackIndex === 0 ? 'video' : 'audio',
      original_clip_id: clip.id
    }
  })

  return result
}
```

**Pros**:
- ✅ Reuses existing upload infrastructure
- ✅ Recordings immediately available in media library
- ✅ Can use in other projects/courses
- ✅ Automatic thumbnail generation

**Cons**:
- ⚠️ Every recording saved (even temporary ones)
- ⚠️ Storage costs if users record frequently

---

### **Approach B: Temporary Storage with Promotion**

**Flow**:
1. Recordings stored in browser IndexedDB temporarily
2. Listed in "Recordings" tab of studio
3. User can promote to media library when ready
4. Non-promoted recordings auto-deleted after 7 days

**Implementation**:
```typescript
// Store in IndexedDB
const saveRecordingLocally = async (clip: Clip) => {
  const db = await openDB('studio-recordings', 1)
  await db.put('recordings', {
    id: clip.id,
    blob: clip.blob,
    metadata: {
      name: clip.name,
      duration: clip.durationFrames,
      createdAt: Date.now()
    }
  })
}

// Promote to media library
const promoteRecording = async (recordingId: string) => {
  const db = await openDB('studio-recordings', 1)
  const recording = await db.get('recordings', recordingId)

  // Upload to media_files
  await uploadMediaFileAction(recording.blob, {
    name: recording.metadata.name,
    source_type: 'studio_recording'
  })

  // Delete from IndexedDB
  await db.delete('recordings', recordingId)
}
```

**Pros**:
- ✅ No storage cost for temporary recordings
- ✅ Only save what's valuable
- ✅ Faster (no upload during recording)

**Cons**:
- ⚠️ Complex state management
- ⚠️ Risk of data loss (browser storage)
- ⚠️ Extra step to make permanent

---

## Export to Courses Options

### **Option A: Export Timeline as Chapter**

**Flow**:
1. Finish editing in studio
2. Click "Export to Course" button
3. Select target course or create new
4. Timeline exports as single video file
5. Creates chapter in course with exported video

**Implementation**:
```typescript
// In VideoStudio.tsx
const exportToCourse = async () => {
  // 1. Render timeline to single video
  const exportedBlob = await renderTimeline(clips, totalFrames)

  // 2. Upload to media_files
  const mediaFile = await uploadMediaFileAction(exportedBlob, {
    name: `${studioProject.title} - Export`,
    source_type: 'studio_export'
  })

  // 3. Create course chapter
  await createChapterAction(selectedCourseId, {
    title: studioProject.title,
    description: studioProject.description,
    video_url: mediaFile.backblaze_url,
    media_file_id: mediaFile.id
  })
}
```

**Database Addition**:
```sql
-- Track export in studio_projects
ALTER TABLE studio_projects ADD COLUMN exported_chapter_id UUID REFERENCES course_chapters(id);
```

**Pros**:
- ✅ Simple workflow - one click
- ✅ Clean course structure
- ✅ Exportable as standalone video

**Cons**:
- ⚠️ Loses timeline editability
- ⚠️ Re-export needed for changes

---

### **Option B: Save Project with Embedded Timeline**

**Flow**:
1. Save studio project to `studio_projects` table
2. Course chapter references project (not exported video)
3. Player renders timeline dynamically
4. Can edit project later without re-creating chapter

**Implementation**:
```typescript
// Save project
const saveStudioProject = async () => {
  const { data: project } = await supabase
    .from('studio_projects')
    .insert({
      instructor_id: user.id,
      title: 'My Lesson',
      timeline_state: {
        clips,
        tracks,
        totalFrames
      },
      related_course_id: selectedCourseId
    })
    .select()
    .single()

  // Create chapter with project reference
  await supabase
    .from('course_chapters')
    .insert({
      course_id: selectedCourseId,
      title: project.title,
      studio_project_id: project.id, // NEW FIELD
      video_url: null // Rendered on-demand
    })
}
```

**Database Changes**:
```sql
ALTER TABLE course_chapters ADD COLUMN studio_project_id UUID REFERENCES studio_projects(id);

-- Chapter can have either video_url OR studio_project_id (not both)
ALTER TABLE course_chapters ADD CONSTRAINT chapter_content_check
  CHECK (
    (video_url IS NOT NULL AND studio_project_id IS NULL) OR
    (video_url IS NULL AND studio_project_id IS NOT NULL)
  );
```

**Pros**:
- ✅ Editable after publishing
- ✅ No re-export needed
- ✅ Dynamic rendering

**Cons**:
- ⚠️ Complex player logic
- ⚠️ Performance concerns (real-time rendering)
- ⚠️ Dependency on studio engine

---

## State Management Strategy

### **Zustand Store Extension** (Recommended for MVP)

**New Slice**: `studio-slice.ts`

```typescript
interface StudioSlice {
  // Asset browser
  selectedAssets: string[]
  setSelectedAssets: (ids: string[]) => void

  // Import from media
  importedMediaFiles: Record<string, MediaFile> // mediaFileId -> MediaFile
  importMediaFile: (mediaFile: MediaFile) => void
  createClipFromMedia: (mediaFileId: string, trackIndex: number, startFrame: number) => Clip

  // Save recordings
  saveRecordingToMedia: (clip: Clip, metadata: RecordingMetadata) => Promise<void>

  // Export
  exportTimelineToCourse: (courseId: string) => Promise<void>
  saveStudioProject: (title: string, description: string) => Promise<string>
}

export const createStudioSlice: StateCreator<AppStore, [], [], StudioSlice> = (set, get) => ({
  selectedAssets: [],
  setSelectedAssets: (ids) => set({ selectedAssets: ids }),

  importedMediaFiles: {},
  importMediaFile: (mediaFile) => set((state) => ({
    importedMediaFiles: {
      ...state.importedMediaFiles,
      [mediaFile.id]: mediaFile
    }
  })),

  createClipFromMedia: (mediaFileId, trackIndex, startFrame) => {
    const mediaFile = get().importedMediaFiles[mediaFileId]
    if (!mediaFile) throw new Error('Media file not imported')

    const durationFrames = mediaFile.duration_seconds * 30 // Assuming 30fps

    const clip: Clip = {
      id: `clip-${Date.now()}`,
      name: mediaFile.name,
      trackIndex,
      startFrame,
      durationFrames,
      trimStartFrame: 0,
      trimEndFrame: durationFrames,
      thumbnailUrl: mediaFile.cdn_url || mediaFile.thumbnail_url,
      source: {
        type: 'media_file',
        mediaFileId: mediaFile.id,
        url: mediaFile.cdn_url || mediaFile.backblaze_url
      }
    }

    get().addClip(clip) // Assumes existing addClip from video editor
    return clip
  },

  saveRecordingToMedia: async (clip, metadata) => {
    // Upload recording blob to media_files
    const blob = await fetch(clip.thumbnailUrl).then(r => r.blob())
    const file = new File([blob], `${metadata.name}.webm`, { type: 'video/webm' })

    await uploadMediaFileAction(file, {
      name: metadata.name,
      tags: ['studio', 'recording'],
      source_type: 'studio_recording',
      studio_metadata: {
        original_clip_id: clip.id,
        duration_ms: clip.durationFrames * (1000 / 30)
      }
    })
  },

  exportTimelineToCourse: async (courseId) => {
    // Export timeline as single video
    const { clips, tracks, totalFrames } = get()

    // TODO: Implement timeline rendering logic
    // For MVP, could use FFmpeg.wasm or server-side rendering

    throw new Error('Not implemented')
  },

  saveStudioProject: async (title, description) => {
    const { clips, tracks, totalFrames } = get()

    const { data: project } = await supabase
      .from('studio_projects')
      .insert({
        instructor_id: get().profile.id,
        title,
        description,
        timeline_state: { clips, tracks, totalFrames }
      })
      .select()
      .single()

    return project.id
  }
})
```

---

## Recommended Implementation Plan

### **🎯 Recommended Combo: Option 1 + Flow 1 + Approach A + Option A**

**Why**:
- ✅ **Fastest MVP**: 1-2 days total
- ✅ **Unified media library**: All assets in one place
- ✅ **Best UX**: Asset browser panel for easy access
- ✅ **Simple export**: Timeline → Video → Course chapter
- ✅ **Scalable**: Can add project saving later

**Phase 1: Media Import** (4-6 hours)
1. Extend `media_files` schema with `source_type` and `studio_metadata` columns
2. Create `MediaAssetBrowser` component (reuse MediaGrid)
3. Add asset browser panel to VideoStudio layout
4. Implement drag-and-drop to timeline
5. Create `createClipFromMedia` in studio slice
6. Test with video/image/audio imports

**Phase 2: Recording Save** (3-4 hours)
1. Add "Save Recording" button to clip context menu
2. Create `SaveRecordingModal` component
3. Implement `saveRecordingToMedia` in studio slice
4. Upload to Backblaze via existing media action
5. Show saved recording in media library
6. Test end-to-end recording flow

**Phase 3: Course Export** (4-6 hours)
1. Create `studio_projects` table
2. Add "Export to Course" button in studio toolbar
3. Create course selection modal
4. Implement timeline rendering (MVP: use first clip as preview)
5. Create chapter with exported video
6. Test export to existing course

**Phase 4: Polish** (2-3 hours)
1. Add loading states and error handling
2. Add success toasts and feedback
3. Add project auto-save (localStorage)
4. Add keyboard shortcuts for import
5. Add asset preview on hover

---

## Database Migration Script

```sql
-- Migration: Add studio support to media_files
ALTER TABLE media_files
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'upload'
    CHECK (source_type IN ('upload', 'studio_recording', 'studio_export'));

ALTER TABLE media_files
  ADD COLUMN IF NOT EXISTS studio_metadata JSONB;

CREATE INDEX idx_media_files_source_type ON media_files(source_type);

-- Migration: Create studio_projects table
CREATE TABLE studio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  timeline_state JSONB NOT NULL,

  related_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  exported_chapter_id UUID REFERENCES course_chapters(id) ON DELETE SET NULL,

  export_status VARCHAR(20) DEFAULT 'draft' CHECK (export_status IN ('draft', 'rendering', 'exported')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_studio_projects_instructor ON studio_projects(instructor_id);
CREATE INDEX idx_studio_projects_course ON studio_projects(related_course_id);

-- RLS Policies
ALTER TABLE studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors can view own projects"
  ON studio_projects FOR SELECT
  USING (auth.uid() = instructor_id);

CREATE POLICY "Instructors can create own projects"
  ON studio_projects FOR INSERT
  WITH CHECK (auth.uid() = instructor_id);

CREATE POLICY "Instructors can update own projects"
  ON studio_projects FOR UPDATE
  USING (auth.uid() = instructor_id);

CREATE POLICY "Instructors can delete own projects"
  ON studio_projects FOR DELETE
  USING (auth.uid() = instructor_id);

-- Optional: Add studio_project_id to course_chapters
ALTER TABLE course_chapters
  ADD COLUMN IF NOT EXISTS studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL;

-- Ensure chapter has either video_url OR studio_project_id
ALTER TABLE course_chapters
  ADD CONSTRAINT chapter_content_source_check
  CHECK (
    (video_url IS NOT NULL AND studio_project_id IS NULL) OR
    (video_url IS NULL AND studio_project_id IS NOT NULL) OR
    (video_url IS NOT NULL AND studio_project_id IS NOT NULL) -- Both allowed for hybrid approach
  );
```

---

## Key Decision Points

### 1. **Where to store recordings?**
   - **Recommendation**: Media library (Option 1)
   - **Reason**: Reuse infrastructure, consistent UX

### 2. **How to present assets in studio?**
   - **Recommendation**: Asset browser panel (Flow 1)
   - **Reason**: Best UX, always accessible

### 3. **Export as video or save project?**
   - **Recommendation**: Export as video (Option A) for MVP
   - **Reason**: Simpler, more reliable playback

### 4. **Create separate studio_assets table?**
   - **Recommendation**: No, use media_files with source_type
   - **Reason**: Faster MVP, less duplication

---

## Technical Considerations

### **File Type Support**:
- **Videos**: MP4, WebM (from recordings), MOV
- **Images**: JPG, PNG (for overlays, thumbnails)
- **Audio**: MP3, WAV, AAC (for audio tracks)

### **Timeline Integration**:
```typescript
// Clip source types
type ClipSource =
  | { type: 'recording', blob: Blob }
  | { type: 'media_file', mediaFileId: string, url: string }
  | { type: 'camera', stream: MediaStream }

interface Clip {
  id: string
  source: ClipSource
  // ... existing fields
}
```

### **Performance Optimization**:
- Lazy load asset thumbnails in browser
- Paginate asset browser (30 per page, like media grid)
- Cache imported media files in Zustand store
- Use CDN URLs for preview (not full video files)

---

## Next Steps

1. **Choose your approach** (recommend: Option 1 + Flow 1 + Approach A + Option A)
2. **Run database migration** for studio_projects and media_files updates
3. **Create MediaAssetBrowser component** (reuse from media grid)
4. **Implement studio slice** in Zustand store
5. **Add asset panel** to VideoStudio layout
6. **Test import flow** with existing media files
7. **Implement save recording** to media library
8. **Build export to course** functionality

Let me know which combination works best for your use case, and I'll start implementing!

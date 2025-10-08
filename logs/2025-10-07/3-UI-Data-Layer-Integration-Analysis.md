# Studio UI ↔ Data Layer Integration Analysis

**Date:** October 7, 2025
**Purpose:** Analyze type compatibility between UI components and data layer (TanStack Query + Zustand + Database)

---

## 1. UI Layer Types

### Source Files
- `/src/lib/video-editor/types.ts` - Core editor types
- `/src/lib/video-editor/useVideoEditor.ts` - Editor hook state management
- `/src/components/video-studio/VideoStudio.tsx` - Main UI component

### Current UI Types

#### Clip Type (UI)
```typescript
interface Clip {
  id: string
  url: string              // Blob URL from recording OR CDN URL from media library
  trackIndex: number       // Track number (0, 1, 2...)
  startFrame: number       // Position on timeline
  durationFrames: number   // Clip length
  originalDurationFrames?: number // For trim tracking
  sourceInFrame?: number   // Trim start point
  sourceOutFrame?: number  // Trim end point
  thumbnailUrl?: string    // Preview thumbnail
}
```

#### Track Type (UI)
```typescript
interface Track {
  id: string
  index: number
  name: string             // "V1", "A1", etc.
  type: 'video' | 'audio'
  visible: boolean
  locked: boolean
  muted?: boolean          // Audio only
}
```

#### EditorState Type (UI)
```typescript
interface EditorState {
  clips: Clip[]
  tracks: Track[]
  currentFrame: number
  isPlaying: boolean
  isRecording: boolean
  totalFrames: number
}
```

### UI State Management Location
- **Local state:** `useVideoEditor()` hook manages clips/tracks/playback in memory
- **No persistence:** Everything lives in `useState` - refresh = data loss
- **No auto-save:** Manual operations only

---

## 2. Data Layer Types

### Source Files
- `/src/types/supabase.ts` - Database schema (lines 1366-1419)
- `/src/hooks/use-studio-queries.ts` - TanStack Query hooks
- `/src/stores/slices/studio-slice.ts` - Zustand store
- `/src/app/actions/studio-actions.ts` - Server actions

### Database Schema: `studio_projects` Table

```typescript
studio_projects: {
  Row: {
    id: string
    instructor_id: string
    title: string
    description: string | null
    timeline_state: Json              // ⚠️ JSONB - stores entire timeline
    is_draft: boolean | null
    last_export_id: string | null
    last_exported_at: string | null
    created_at: string | null
    updated_at: string | null
  }
}
```

**`timeline_state` Structure (as defined in implementation plan):**
```typescript
timeline_state: {
  clips: Clip[]           // Same as UI Clip type
  tracks: Track[]         // Same as UI Track type
  totalFrames: number
  fps?: number            // Optional, defaults to 30
}
```

### TanStack Query Hook Types

**`StudioProject` interface (from `use-studio-queries.ts`):**
```typescript
interface StudioProject {
  id: string
  instructor_id: string
  title: string
  description: string | null
  timeline_state: {
    clips: any[]          // ⚠️ Using `any[]` - needs typed
    tracks: any[]         // ⚠️ Using `any[]` - needs typed
    totalFrames: number
    fps?: number
  }
  is_draft: boolean | null
  last_export_id: string | null
  last_exported_at: string | null
  created_at: string | null
  updated_at: string | null
}
```

**Available Hooks:**
- `useStudioProjects()` - List all projects
- `useStudioProject(projectId)` - Load single project
- `useSaveStudioProject()` - Save/update project
- `useDeleteStudioProject()` - Delete project
- `usePublishStudioProject()` - Convert draft to published
- `useSaveRecording()` - Save recording to media_files
- `useExportTimeline()` - Export timeline to media_files

### Zustand Store State

**Studio Slice (`studio-slice.ts`):**
```typescript
interface StudioState {
  // Project tracking
  currentProjectId: string | null

  // Auto-save state
  hasUnsavedChanges: boolean
  lastSavedAt: number | null
  autoSaveEnabled: boolean

  // Timeline UI state (NOT timeline data)
  currentFrame: number    // ⚠️ Duplicate of useVideoEditor.currentFrame
  isPlaying: boolean      // ⚠️ Duplicate of useVideoEditor.isPlaying
  zoom: number

  // Asset import
  importedMediaFiles: Record<string, any>

  // Selection state
  selectedClipIds: string[]
  selectedTrackId: string | null

  // Tool state
  activeTool: 'select' | 'trim' | 'split' | 'cut'

  // Export state
  isExporting: boolean
  exportProgress: number

  // Recording state
  isRecording: boolean    // ⚠️ Duplicate of useVideoEditor.isRecording
  recordingType: 'screen' | 'audio' | null
}
```

---

## 3. Type Compatibility Analysis

### ✅ PERFECT MATCHES (Direct Connect)

| Type | UI Location | Data Layer Location | Status |
|------|-------------|---------------------|--------|
| `Clip` | `types.ts` | `timeline_state.clips` | ✅ **100% compatible** |
| `Track` | `types.ts` | `timeline_state.tracks` | ✅ **100% compatible** |
| `totalFrames` | `useVideoEditor` | `timeline_state.totalFrames` | ✅ **100% compatible** |

**Why Perfect Match:**
The UI's `Clip` and `Track` types are exactly what the database expects in `timeline_state.clips` and `timeline_state.tracks`. No transformation needed.

---

### ⚠️ MISSING TYPE DEFINITIONS (Needs Update)

#### Problem 1: TanStack Query uses `any[]` for clips/tracks
**Location:** `/src/hooks/use-studio-queries.ts` (lines 20-24)

```typescript
// ❌ Current (too loose)
timeline_state: {
  clips: any[]
  tracks: any[]
  totalFrames: number
  fps?: number
}

// ✅ Should be
timeline_state: {
  clips: Clip[]
  tracks: Track[]
  totalFrames: number
  fps?: number
}
```

**Fix Required:** Import `Clip` and `Track` types from `@/lib/video-editor/types` and replace `any[]`.

---

### ⚠️ STATE DUPLICATION (Architectural Issue)

The Zustand store duplicates state that already exists in `useVideoEditor`:

| State | useVideoEditor | Zustand Store | Issue |
|-------|----------------|---------------|-------|
| `currentFrame` | ✅ Source of truth | ⚠️ Duplicate | Could desync |
| `isPlaying` | ✅ Source of truth | ⚠️ Duplicate | Could desync |
| `isRecording` | ✅ Source of truth | ⚠️ Duplicate | Could desync |

**Recommendation:**
- **Option A (Preferred):** Remove duplicates from Zustand, use `useVideoEditor` as single source of truth
- **Option B:** Move all timeline state to Zustand, remove from `useVideoEditor`

**Current Design:** `useVideoEditor` is the **canonical source** for timeline state (clips, tracks, playback). Zustand should only store UI-specific state (zoom, tools, selection).

---

### 🔌 MISSING CONNECTIONS (Integration Points)

These are the gaps preventing UI from talking to data layer:

#### Gap 1: No Save Button in UI
**What's Missing:** VideoStudio.tsx has no button to manually save project
**What Needs:** Call `useSaveStudioProject()` mutation
**Where:** Add "Save Project" button in toolbar (line ~420-450)

#### Gap 2: No Load Project on Mount
**What's Missing:** Editor doesn't load existing project from URL params
**What Needs:** Read `?projectId=xxx` from URL, call `useStudioProject(projectId)`, populate `useVideoEditor` clips/tracks
**Where:** Add effect in VideoStudio.tsx to load on mount

#### Gap 3: No Auto-Save Implementation
**What's Missing:** Editor doesn't auto-save every 30 seconds
**What Needs:**
- Effect with `setInterval` (30s)
- Check `hasUnsavedChanges` from Zustand
- Call `useSaveStudioProject()` with current clips/tracks
**Where:** VideoStudio.tsx or new `AutoSaveManager` component

#### Gap 4: No Media Library Panel
**What's Missing:** Can't import videos from `/instructor/media` into timeline
**What Needs:**
- New component `MediaAssetBrowser.tsx` using `useMediaFiles()`
- Drag media file → creates clip with CDN URL instead of blob URL
**Where:** Left sidebar panel in VideoStudio.tsx

#### Gap 5: Recording Save to Media Library
**What's Missing:** Recordings create clips but don't save to media_files table
**What Needs:**
- After `stopRecording()` creates clip, call `useSaveRecording()`
- Pass blob + metadata → saves to DB with `source_type='recording'`
**Where:** `useRecording.ts` hook after blob is ready

#### Gap 6: Export Timeline to Media Library
**What's Missing:** No export button, no export functionality
**What Needs:**
- "Export Timeline" button
- Render all clips to single video blob
- Call `useExportTimeline()` → saves to media_files with `source_type='export'`
**Where:** New toolbar button + export logic

#### Gap 7: Project List/Browser
**What's Missing:** No way to see list of saved projects
**What Needs:**
- New page `/instructor/studio/projects` using `useStudioProjects()`
- List projects with "Open" button → navigates to `/instructor/studio?projectId=xxx`
**Where:** New route file

---

## 4. Blob URL vs CDN URL Handling

### Current State
UI `Clip.url` can be:
1. **Blob URL** (`blob:http://localhost:3001/abc-123`) - For recordings, temporary
2. **CDN URL** (`https://cdn.unpuzzle.co/...`) - For media library imports

### Database State
`timeline_state.clips[].url` will store:
- Blob URLs will be **temporary** - need to save recording to media_files first, then replace with CDN URL
- CDN URLs are **permanent** - safe to save directly

### Issue: Blob URLs Break on Reload
**Problem:** If you save a project with blob URLs, they'll be invalid after page refresh.

**Solution Flow:**
1. User stops recording → creates clip with blob URL
2. **Immediately** save recording to media_files via `useSaveRecording()`
3. Get back CDN URL from server
4. **Replace** clip's blob URL with CDN URL
5. **Then** save project with CDN URL in timeline_state

**Required Changes:**
- `useRecording.ts` needs to call `useSaveRecording()` automatically after creating clip
- Update clip in `useVideoEditor` with CDN URL after save completes
- Only save projects after all blob URLs are converted to CDN URLs

---

## 5. Integration Strategy

### Phase 1: Type Safety (1 hour)
**Fix loose types in data layer:**
1. ✅ Import `Clip` and `Track` types into `use-studio-queries.ts`
2. ✅ Replace `any[]` with `Clip[]` and `Track[]`
3. ✅ Add type exports from `types.ts` if needed

### Phase 2: Basic Save/Load (2-3 hours)
**Connect existing UI to database:**
1. Add "Save Project" button → calls `useSaveStudioProject()`
2. Add URL param support → `?projectId=xxx`
3. Load project on mount → populate `useVideoEditor` from database
4. Add "New Project" button → clears editor

### Phase 3: Auto-Save (1 hour)
**Implement background persistence:**
1. Create `AutoSaveManager` component
2. Run `setInterval` every 30 seconds
3. Track changes with `hasUnsavedChanges` in Zustand
4. Call `useSaveStudioProject()` with `is_draft: true`

### Phase 4: Media Library Integration (3-4 hours)
**Enable asset imports:**
1. Create `MediaAssetBrowser` component
2. Fetch files with `useMediaFiles()`
3. Drag file → create clip with CDN URL
4. Add to timeline via `useVideoEditor.addClip()`

### Phase 5: Recording Persistence (2 hours)
**Save recordings to database:**
1. Modify `useRecording.ts` to call `useSaveRecording()` after recording stops
2. Replace blob URL with CDN URL in clip
3. Update `useVideoEditor` clips array
4. Test reload → recording should still work

### Phase 6: Export Functionality (4-5 hours)
**Build timeline export:**
1. Create export button in toolbar
2. Implement video rendering (merge clips into single video)
3. Call `useExportTimeline()` with rendered blob
4. Save to media_files with `source_type='export'`
5. Show in media library

### Phase 7: Project Browser (2 hours)
**Build project management UI:**
1. Create `/instructor/studio/projects` page
2. Use `useStudioProjects()` to list projects
3. Show title, updated_at, thumbnail
4. "Open" button → navigate to studio with projectId
5. "Delete" button → `useDeleteStudioProject()`

---

## 6. Data Flow Diagrams

### Current State (Disconnected)
```
┌─────────────────┐
│   VideoStudio   │
│    Component    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ useVideoEditor  │◄── useState (local only)
│   Hook          │
└─────────────────┘
         │
         ▼
    Clips/Tracks
    (lost on refresh)

❌ NO CONNECTION TO DATABASE
```

### Target State (Integrated)
```
┌─────────────────────────────────────────────┐
│            VideoStudio Component            │
└──┬───────────────┬──────────────────┬───────┘
   │               │                  │
   ▼               ▼                  ▼
┌──────────┐  ┌─────────────┐  ┌──────────────┐
│useVideo  │  │TanStack     │  │Zustand Store │
│Editor    │  │Query Hooks  │  │ (UI state)   │
│(timeline)│  │(data CRUD)  │  │              │
└──────────┘  └──────┬──────┘  └──────────────┘
                     │
                     ▼
              ┌──────────────┐
              │Server Actions│
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │  Supabase DB │
              │studio_projects│
              └──────────────┘

✅ FULL PERSISTENCE + AUTO-SAVE
```

---

## 7. Code Changes Required

### File: `/src/hooks/use-studio-queries.ts`
**Change:** Import and use proper types
```typescript
// Add import
import { Clip, Track } from '@/lib/video-editor/types'

// Update interface
export interface StudioProject {
  // ... other fields
  timeline_state: {
    clips: Clip[]        // ✅ Changed from any[]
    tracks: Track[]      // ✅ Changed from any[]
    totalFrames: number
    fps?: number
  }
  // ... rest
}
```

### File: `/src/components/video-studio/VideoStudio.tsx`
**Changes:**
1. Add save button
2. Add load logic
3. Add auto-save
4. Add media library panel

```typescript
// New imports
import { useSaveStudioProject, useStudioProject } from '@/hooks/use-studio-queries'
import { useSearchParams } from 'next/navigation'

export function VideoStudio() {
  const editor = useVideoEditor()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')

  // Load project on mount
  const { data: project } = useStudioProject(projectId)
  const { mutate: saveProject } = useSaveStudioProject()

  // Load timeline when project loads
  useEffect(() => {
    if (project?.timeline_state) {
      // Restore clips/tracks from database
      editor.loadTimeline(
        project.timeline_state.clips,
        project.timeline_state.tracks,
        project.timeline_state.totalFrames
      )
    }
  }, [project])

  // Manual save handler
  const handleSave = () => {
    saveProject({
      id: projectId || undefined,
      title: 'My Project', // Get from input
      timeline_state: {
        clips: editor.clips,
        tracks: editor.tracks,
        totalFrames: editor.totalFrames,
        fps: 30
      },
      is_draft: false
    })
  }

  // Auto-save every 30s
  useEffect(() => {
    if (!editor.clips.length) return // Don't auto-save empty projects

    const interval = setInterval(() => {
      saveProject({
        id: projectId || undefined,
        timeline_state: {
          clips: editor.clips,
          tracks: editor.tracks,
          totalFrames: editor.totalFrames,
          fps: 30
        },
        is_draft: true // Auto-saves are drafts
      })
    }, 30000)

    return () => clearInterval(interval)
  }, [editor.clips, editor.tracks, editor.totalFrames, projectId])

  return (
    <div>
      {/* Add Save Button */}
      <Button onClick={handleSave}>Save Project</Button>

      {/* Existing UI */}
      {/* ... */}
    </div>
  )
}
```

### File: `/src/lib/video-editor/useVideoEditor.ts`
**Add:** `loadTimeline` method to restore saved state
```typescript
export function useVideoEditor() {
  // ... existing code

  // New method: Load timeline from database
  const loadTimeline = useCallback((
    loadedClips: Clip[],
    loadedTracks: Track[],
    loadedTotalFrames: number
  ) => {
    setClipsWithRef(loadedClips)
    setTracks(loadedTracks)
    setTotalFramesWithRef(loadedTotalFrames)
    setCurrentFrame(0)
    historyRef.current.initialize(loadedClips, loadedTotalFrames)
  }, [])

  return {
    // ... existing returns
    loadTimeline, // ✅ Export new method
  }
}
```

### File: `/src/lib/video-editor/useRecording.ts`
**Add:** Call `useSaveRecording` after recording stops
```typescript
import { useSaveRecording } from '@/hooks/use-studio-queries'

export function useRecording(/* ... */) {
  const { mutate: saveRecording } = useSaveRecording()

  const stopRecording = async () => {
    // ... existing recording stop logic
    const blob = await mediaRecorder.stop()

    // Create temporary clip with blob URL
    const tempClip = {
      id: 'clip-' + Date.now(),
      url: URL.createObjectURL(blob),
      // ... rest of clip data
    }

    onClipCreated(tempClip)

    // ✅ NEW: Save recording to media library
    saveRecording({
      blob,
      metadata: {
        name: `Recording ${new Date().toISOString()}`,
        track_type: 'video',
        duration_ms: recordingDuration,
        clip_id: tempClip.id
      }
    }, {
      onSuccess: (result) => {
        // Replace blob URL with CDN URL
        updateClipUrl(tempClip.id, result.fileUrl)
      }
    })
  }
}
```

---

## 8. Summary

### ✅ What Works (No Changes Needed)
- Type compatibility between UI `Clip`/`Track` and database `timeline_state`
- Database schema is correct
- Server actions are implemented correctly
- TanStack Query hooks work properly

### ⚠️ What Needs Fixes
1. **Type safety:** Replace `any[]` with `Clip[]`/`Track[]` in TanStack hooks
2. **State duplication:** Remove duplicate state from Zustand or consolidate
3. **Blob URL handling:** Save recordings to media_files immediately, replace URLs

### 🔌 What Needs Building
1. Save/Load buttons and logic
2. Auto-save manager (30s interval)
3. Media library browser panel
4. Recording → media_files integration
5. Export timeline functionality
6. Project list/browser page

### Time Estimate
- **Type fixes:** 1 hour
- **Basic save/load:** 2-3 hours
- **Auto-save:** 1 hour
- **Media library panel:** 3-4 hours
- **Recording integration:** 2 hours
- **Export:** 4-5 hours
- **Project browser:** 2 hours

**Total:** ~15-20 hours of development

---

## 9. Next Steps

**Recommended Order:**
1. ✅ Fix type safety in `use-studio-queries.ts` (quick win)
2. ✅ Add `loadTimeline()` method to `useVideoEditor`
3. ✅ Implement basic save button + load on mount
4. ✅ Add auto-save manager
5. ✅ Build media library integration
6. ✅ Fix recording persistence
7. ✅ Build export functionality
8. ✅ Create project browser page

**Start with:** Type safety fixes + basic save/load (3-4 hours total) to get immediate value.

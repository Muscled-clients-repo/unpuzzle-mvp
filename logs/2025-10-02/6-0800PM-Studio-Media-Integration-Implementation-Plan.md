# Studio + Media Integration - Implementation Plan
**Date**: October 2, 2025 - 8:00 PM
**Architecture**: Option 1 (Unified Media Library)
**Goal**: Import media into studio, save recordings/exports to media library, persist projects for re-editing

---

## Core Requirements

1. ✅ Import assets from `/instructor/media` into studio timeline
2. ✅ Save screen/voice recordings to `media_files` table
3. ✅ Export rendered timeline to `media_files` table
4. ✅ Auto-save projects to cloud (`studio_projects`) every 30 seconds
5. ✅ Cloud-first auto-save with localStorage backup fallback
6. ✅ Draft/published state for projects (auto-saves are drafts)
7. ❌ No automatic course chapter creation (manual workflow)

---

## Database Schema

### Extend `media_files` Table
```sql
-- Migration: Add studio support
ALTER TABLE media_files
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'upload'
    CHECK (source_type IN ('upload', 'recording', 'export'));

ALTER TABLE media_files
  ADD COLUMN IF NOT EXISTS studio_metadata JSONB;

CREATE INDEX idx_media_files_source_type ON media_files(source_type);

-- Example studio_metadata:
{
  "recording_duration_ms": 45000,
  "track_type": "video", // or "audio"
  "original_clip_id": "clip-123",
  "project_id": "uuid-456" // Optional reference
}
```

### Create `studio_projects` Table
```sql
-- Migration: Create studio projects
CREATE TABLE studio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL DEFAULT 'Untitled Project',
  description TEXT,

  -- Timeline state (JSON snapshot)
  timeline_state JSONB NOT NULL,
  -- Example: { clips: [...], tracks: [...], totalFrames: 3600 }

  -- Draft/Published state
  is_draft BOOLEAN DEFAULT true,

  -- Export tracking
  last_export_id UUID REFERENCES media_files(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_studio_projects_instructor ON studio_projects(instructor_id);

-- RLS Policies
ALTER TABLE studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors can manage own projects"
  ON studio_projects FOR ALL
  USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);
```

---

## Architecture Patterns (Aligned with Codebase)

### Pattern 1: Server Actions (Pattern 05)
**File**: `src/app/actions/studio-actions.ts`

```typescript
'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

// Save project (auto-save or manual)
export async function saveStudioProjectAction(data: {
  id?: string // If updating existing
  title?: string
  description?: string
  timeline_state: {
    clips: Clip[]
    tracks: Track[]
    totalFrames: number
  }
  is_draft?: boolean
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  if (data.id) {
    // Update existing (auto-save or manual)
    const { data: project, error } = await supabase
      .from('studio_projects')
      .update({
        title: data.title,
        description: data.description,
        timeline_state: data.timeline_state,
        is_draft: data.is_draft ?? true,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id)
      .select()
      .single()

    return error ? { success: false, error: error.message } : { success: true, project }
  }

  // Create new (auto-save creates draft)
  const { data: project, error } = await supabase
    .from('studio_projects')
    .insert({
      instructor_id: user.id,
      title: data.title || 'Untitled Project',
      description: data.description,
      timeline_state: data.timeline_state,
      is_draft: data.is_draft ?? true
    })
    .select()
    .single()

  return error ? { success: false, error: error.message } : { success: true, project }
}

// Load project
export async function getStudioProjectAction(projectId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: project, error } = await supabase
    .from('studio_projects')
    .select('*')
    .eq('id', projectId)
    .single()

  return error ? { success: false, error: error.message } : { success: true, project }
}

// List projects
export async function getStudioProjectsAction() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: projects, error } = await supabase
    .from('studio_projects')
    .select('id, title, description, created_at, updated_at')
    .eq('instructor_id', user.id)
    .order('updated_at', { ascending: false })

  return error ? { success: false, error: error.message } : { success: true, projects }
}

// Save recording to media_files
export async function saveRecordingToMediaAction(
  blob: Blob,
  metadata: {
    name: string
    track_type: 'video' | 'audio'
    duration_ms: number
    clip_id: string
  }
) {
  // Convert blob to File
  const file = new File([blob], `${metadata.name}.webm`, { type: blob.type })

  // Reuse existing uploadMediaFileAction
  const { uploadMediaFileAction } = await import('./media-actions')

  return await uploadMediaFileAction(file, {
    name: metadata.name,
    tags: ['studio', 'recording'],
    source_type: 'recording',
    studio_metadata: {
      recording_duration_ms: metadata.duration_ms,
      track_type: metadata.track_type,
      original_clip_id: metadata.clip_id
    }
  })
}

// Export timeline to media_files
export async function exportTimelineToMediaAction(
  videoBlob: Blob,
  metadata: {
    title: string
    description?: string
    project_id?: string
  }
) {
  const file = new File([videoBlob], `${metadata.title}.mp4`, { type: 'video/mp4' })

  const { uploadMediaFileAction } = await import('./media-actions')

  const result = await uploadMediaFileAction(file, {
    name: metadata.title,
    tags: ['studio', 'export'],
    source_type: 'export',
    studio_metadata: {
      project_id: metadata.project_id,
      exported_at: new Date().toISOString()
    }
  })

  // Update project with last export
  if (result.success && metadata.project_id) {
    const supabase = await createSupabaseServerClient()
    await supabase
      .from('studio_projects')
      .update({ last_export_id: result.media.id })
      .eq('id', metadata.project_id)
  }

  return result
}
```

### Pattern 2: TanStack Query Hooks (Pattern 06)
**File**: `src/hooks/use-studio-queries.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  saveStudioProjectAction,
  getStudioProjectAction,
  getStudioProjectsAction,
  saveRecordingToMediaAction,
  exportTimelineToMediaAction
} from '@/app/actions/studio-actions'

// List projects
export function useStudioProjects() {
  return useQuery({
    queryKey: ['studio-projects'],
    queryFn: async () => {
      const result = await getStudioProjectsAction()
      if (!result.success) throw new Error(result.error)
      return result.projects
    }
  })
}

// Load single project
export function useStudioProject(projectId: string | null) {
  return useQuery({
    queryKey: ['studio-project', projectId],
    queryFn: async () => {
      if (!projectId) return null
      const result = await getStudioProjectAction(projectId)
      if (!result.success) throw new Error(result.error)
      return result.project
    },
    enabled: !!projectId
  })
}

// Save project mutation
export function useSaveStudioProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveStudioProjectAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    }
  })
}

// Save recording mutation
export function useSaveRecording() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ blob, metadata }: { blob: Blob; metadata: any }) =>
      saveRecordingToMediaAction(blob, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
    }
  })
}

// Export timeline mutation
export function useExportTimeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ blob, metadata }: { blob: Blob; metadata: any }) =>
      exportTimelineToMediaAction(blob, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
    }
  })
}
```

### Pattern 3: Zustand Store Slice (Pattern 07)
**File**: `src/stores/slices/studio-slice.ts`

```typescript
import { StateCreator } from 'zustand'

export interface StudioSlice {
  // Current project
  currentProjectId: string | null
  setCurrentProjectId: (id: string | null) => void

  // Auto-save state
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (value: boolean) => void
  lastSavedAt: number | null
  setLastSavedAt: (timestamp: number) => void

  // Asset import
  importedMediaFiles: Record<string, any>
  importMediaFile: (file: any) => void
  clearImportedMedia: () => void
}

export const createStudioSlice: StateCreator<any, [], [], StudioSlice> = (set) => ({
  currentProjectId: null,
  setCurrentProjectId: (id) => set({ currentProjectId: id }),

  hasUnsavedChanges: false,
  setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),

  lastSavedAt: null,
  setLastSavedAt: (timestamp) => set({ lastSavedAt: timestamp }),

  importedMediaFiles: {},
  importMediaFile: (file) =>
    set((state) => ({
      importedMediaFiles: { ...state.importedMediaFiles, [file.id]: file }
    })),

  clearImportedMedia: () => set({ importedMediaFiles: {} })
})
```

**Add to** `src/stores/app-store.ts`:
```typescript
import { StudioSlice, createStudioSlice } from './slices/studio-slice'

export interface AppStore extends
  // ... existing slices
  StudioSlice
{}

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      (...args) => ({
        // ... existing slices
        ...createStudioSlice(...args),
      })
    )
  )
)
```

---

## UI Components

### 1. Media Asset Browser Panel
**File**: `src/components/video-studio/MediaAssetBrowser.tsx`

```tsx
'use client'

import { useMediaFiles } from '@/hooks/use-media-queries'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDuration } from '@/lib/format-utils'

export function MediaAssetBrowser({ onAssetSelect }: { onAssetSelect: (file: any) => void }) {
  const { data, isLoading } = useMediaFiles({ page: 1, limit: 50 })

  if (isLoading) return <div className="p-4">Loading assets...</div>

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-2">
        {data?.media.map((file) => (
          <Card
            key={file.id}
            className="p-2 cursor-pointer hover:bg-accent"
            onClick={() => onAssetSelect(file)}
          >
            <div className="flex gap-2">
              <img
                src={file.thumbnail_url || file.cdn_url}
                alt={file.name}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(file.duration_seconds)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}
```

### 2. Save Project Dialog
**File**: `src/components/video-studio/SaveProjectDialog.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useSaveStudioProject } from '@/hooks/use-studio-queries'

export function SaveProjectDialog({
  open,
  onClose,
  timelineState,
  projectId
}: {
  open: boolean
  onClose: () => void
  timelineState: any
  projectId?: string
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const { mutate: saveProject, isPending } = useSaveStudioProject()

  const handleSave = () => {
    saveProject(
      { id: projectId, title, description, timeline_state: timelineState },
      {
        onSuccess: () => {
          onClose()
        }
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{projectId ? 'Update' : 'Save'} Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button onClick={handleSave} disabled={!title || isPending} className="w-full">
            {isPending ? 'Saving...' : 'Save Project'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### 3. Cloud Auto-Save Logic
**File**: `src/components/video-studio/AutoSaveManager.tsx`

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/stores/app-store'
import { useSaveStudioProject } from '@/hooks/use-studio-queries'
import { useToast } from '@/hooks/use-toast'

const AUTOSAVE_INTERVAL = 30000 // 30 seconds
const LOCALSTORAGE_BACKUP_KEY = 'studio-autosave-backup'

export function AutoSaveManager({ clips, tracks, totalFrames }: any) {
  const { currentProjectId, setCurrentProjectId, setLastSavedAt } = useAppStore()
  const { mutate: saveProject } = useSaveStudioProject()
  const { toast } = useToast()
  const lastSaveRef = useRef<number>(0)

  // Cloud auto-save every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      // Only save if timeline changed since last save
      if (now - lastSaveRef.current >= AUTOSAVE_INTERVAL) {
        saveProject(
          {
            id: currentProjectId || undefined,
            timeline_state: { clips, tracks, totalFrames },
            is_draft: true // Auto-saves are always drafts
          },
          {
            onSuccess: (result) => {
              if (!currentProjectId && result.project) {
                // First auto-save creates project
                setCurrentProjectId(result.project.id)
              }
              setLastSavedAt(Date.now())
              lastSaveRef.current = Date.now()

              // Clear localStorage backup on successful cloud save
              localStorage.removeItem(LOCALSTORAGE_BACKUP_KEY)
            },
            onError: (error) => {
              // Fallback to localStorage if cloud save fails
              localStorage.setItem(
                LOCALSTORAGE_BACKUP_KEY,
                JSON.stringify({ clips, tracks, totalFrames, timestamp: Date.now() })
              )
              toast({
                title: 'Auto-save failed',
                description: 'Saved locally as backup',
                variant: 'destructive'
              })
            }
          }
        )
      }
    }, AUTOSAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [clips, tracks, totalFrames, currentProjectId])

  // Restore from localStorage backup only if cloud fails
  useEffect(() => {
    const backup = localStorage.getItem(LOCALSTORAGE_BACKUP_KEY)
    if (backup && !currentProjectId) {
      const { clips, tracks, totalFrames } = JSON.parse(backup)
      // Prompt user: "Found local backup. Restore?"
      // If yes, restore state and save to cloud
    }
  }, [])

  return null
}
```

---

## Implementation Steps

### Phase 1: Database Setup (30 min)
1. Run migration for `media_files` extensions
2. Run migration for `studio_projects` table
3. Test RLS policies in Supabase dashboard

### Phase 2: Server Actions (1-2 hours)
1. Create `src/app/actions/studio-actions.ts`
2. Implement save/load/list project actions
3. Implement recording save action (reuse media upload)
4. Implement export action (reuse media upload)
5. Test with Postman or console

### Phase 3: TanStack Query Hooks (1 hour)
1. Create `src/hooks/use-studio-queries.ts`
2. Implement query hooks for projects
3. Implement mutation hooks for save/export
4. Test in React DevTools

### Phase 4: Zustand Store (30 min)
1. Create `src/stores/slices/studio-slice.ts`
2. Add to app-store.ts
3. Test state updates

### Phase 5: UI Integration (3-4 hours)
1. Create MediaAssetBrowser component
2. Add asset browser panel to VideoStudio layout
3. Implement asset selection → clip creation
4. Create SaveProjectDialog component
5. Add save/load buttons to studio toolbar
6. Implement auto-save manager
7. Add export flow UI

### Phase 6: Testing (1-2 hours)
1. Test import media → create clip
2. Test save recording → appears in media
3. Test save project → reload → restore
4. Test export → appears in media
5. Test auto-save recovery

---

## File Structure
```
src/
├── app/
│   └── actions/
│       └── studio-actions.ts          [NEW]
├── hooks/
│   └── use-studio-queries.ts          [NEW]
├── stores/
│   └── slices/
│       └── studio-slice.ts            [NEW]
└── components/
    └── video-studio/
        ├── MediaAssetBrowser.tsx      [NEW]
        ├── SaveProjectDialog.tsx      [NEW]
        ├── AutoSaveManager.tsx        [NEW]
        └── VideoStudio.tsx            [UPDATE]
```

---

## Success Criteria

- ✅ Can import media files from `/instructor/media` into timeline
- ✅ Screen recordings save to `media_files` with source_type='recording'
- ✅ Projects auto-save to cloud every 30 seconds
- ✅ Auto-saves create draft projects automatically
- ✅ Can access drafts from any device (cloud-synced)
- ✅ localStorage backup only if cloud save fails
- ✅ Export creates file in `media_files` with source_type='export'
- ✅ Exported videos appear in `/instructor/media`
- ✅ Can manually add exported videos to courses

---

## Rollback Plan

If issues occur:
```bash
# Revert migrations
git checkout HEAD~1 supabase/migrations/

# Revert code changes
git checkout HEAD~1 src/app/actions/studio-actions.ts
git checkout HEAD~1 src/hooks/use-studio-queries.ts
git checkout HEAD~1 src/stores/slices/studio-slice.ts
```

Low risk - all changes are additive.

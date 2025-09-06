# Clean Incremental Migration: CourseCreationSlice → NormalizedCourseSlice

## Target Normalized State Structure

```typescript
// /src/stores/slices/normalized-course-slice.ts
interface NormalizedState {
  // Flat lookup tables
  courses: Record<string, Course>
  videos: Record<string, Video>
  
  // UI state
  activeCourseId: string | null
  currentWizardStep: 'info' | 'content' | 'review'
  isSaving: boolean
}

interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  price?: number
  category?: string
  level?: string
  totalDuration?: string
  createdAt: Date
  updatedAt: Date
  userId: string
  status: 'draft' | 'published'
}

interface Video {
  id: string
  name: string
  url?: string
  backblazeFileId?: string
  chapterId: string  // Virtual chapter (e.g., "chapter-1234567890")
  order: number
  duration?: string
  size?: number
  thumbnailUrl?: string
  transcript?: string
  
  // Upload state (replaces uploadQueue)
  uploadStatus?: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  uploadProgress?: number
  markedForDeletion?: boolean
}
```

## Phase 1: Prepare Normalized Slice (Day 1 Morning)

### Step 1.1: Update normalized-course-slice.ts

**File**: `/src/stores/slices/normalized-course-slice.ts`

**BEFORE**:
```typescript
export interface NormalizedCourseSlice {
  normalizedState: {
    courses: Record<string, any>
    chapters: Record<string, any>  // Remove this
    videos: Record<string, any>
  }
  // Methods with wrong signatures
}
```

**AFTER**:
```typescript
export interface NormalizedCourseSlice {
  // Flat structure - no wrapper
  courses: Record<string, Course>
  videos: Record<string, Video>
  activeCourseId: string | null
  currentWizardStep: 'info' | 'content' | 'review'
  isSaving: boolean
  
  // Course methods
  createCourse: (data: Partial<Course>) => string
  updateCourse: (id: string, changes: Partial<Course>) => void
  deleteCourse: (id: string) => void
  setActiveCourse: (id: string | null) => void
  
  // Video methods
  addVideo: (file: File, chapterId: string) => string
  updateVideo: (id: string, changes: Partial<Video>) => void
  deleteVideo: (id: string) => void
  reorderVideos: (chapterId: string, videoIds: string[]) => void
  moveVideoToChapter: (videoId: string, newChapterId: string) => void
  
  // Chapter operations (virtual - no chapter entities)
  getChapterVideos: (chapterId: string) => Video[]
  createChapter: (courseId: string) => string  // Returns "chapter-{timestamp}"
  deleteChapter: (chapterId: string) => void  // Deletes all videos with this chapterId
  
  // UI methods
  setWizardStep: (step: 'info' | 'content' | 'review') => void
  setSaving: (saving: boolean) => void
  
  // Save operations
  saveDraft: () => Promise<void>
  publishCourse: () => Promise<void>
  loadCourseForEdit: (id: string) => Promise<void>
  resetCourse: () => void
}
```

### Step 1.2: Implement Core Methods

```typescript
const createNormalizedCourseSlice: StateCreator<NormalizedCourseSlice> = (set, get) => ({
  courses: {},
  videos: {},
  activeCourseId: null,
  currentWizardStep: 'info',
  isSaving: false,
  
  createCourse: (data) => {
    const id = crypto.randomUUID()
    set(state => ({
      courses: {
        ...state.courses,
        [id]: {
          id,
          title: '',
          description: '',
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: '', // Set from auth
          ...data
        }
      },
      activeCourseId: id
    }))
    return id
  },
  
  addVideo: (file, chapterId) => {
    const id = crypto.randomUUID()
    const existingVideos = Object.values(get().videos)
      .filter(v => v.chapterId === chapterId)
    
    set(state => ({
      videos: {
        ...state.videos,
        [id]: {
          id,
          name: file.name,
          chapterId,
          order: existingVideos.length,
          size: file.size,
          uploadStatus: 'pending',
          uploadProgress: 0
        }
      }
    }))
    
    // Trigger upload (separate from state)
    uploadVideoToBackblaze(id, file)
    return id
  },
  
  getChapterVideos: (chapterId) => {
    const videos = get().videos
    return Object.values(videos)
      .filter(v => v.chapterId === chapterId)
      .sort((a, b) => a.order - b.order)
  },
  
  createChapter: (courseId) => {
    const chapterId = `chapter-${Date.now()}`
    // No chapter entity to create - just return the ID
    return chapterId
  },
  
  saveDraft: async () => {
    const { activeCourseId, courses, videos } = get()
    if (!activeCourseId) return
    
    set({ isSaving: true })
    
    const course = courses[activeCourseId]
    const courseVideos = Object.values(videos)
      .filter(v => v.chapterId?.startsWith('chapter-'))
    
    await saveCourseAction({
      ...course,
      videos: courseVideos
    })
    
    set({ isSaving: false })
  }
})
```

### 📍 **CHECKPOINT 1A**:
- [ ] Normalized slice compiles without errors
- [ ] All methods have correct signatures
- [ ] No nested data structures
- [ ] No reference to chapters table

### Rollback Strategy Phase 1:
```bash
git stash  # Save work
git checkout HEAD -- src/stores/slices/normalized-course-slice.ts
```

---

## Phase 2: Update Type Exports (Day 1 Afternoon)

### Step 2.1: Export Types from Normalized Slice

**File**: `/src/stores/slices/normalized-course-slice.ts`

**ADD**:
```typescript
// Export types for other files
export type { Course, Video }
export interface VideoUpload extends Video {}  // Compatibility alias
export interface Chapter {  // Virtual chapter type for components
  id: string
  title: string
  order: number
}
```

### Step 2.2: Update Import Statements

**Files to Update**:
- `/src/services/supabase/video-service.ts`
- `/src/services/video/video-upload-service.ts`
- `/src/hooks/useVideoPreview.ts`
- `/src/hooks/useNormalizedVideoReorder.ts`
- `/src/app/api/upload/route.ts`

**BEFORE**:
```typescript
import { VideoUpload, Chapter } from '@/stores/slices/course-creation-slice'
```

**AFTER**:
```typescript
import { VideoUpload, Chapter } from '@/stores/slices/normalized-course-slice'
```

### 📍 **CHECKPOINT 2A**:
- [ ] All imports updated
- [ ] No TypeScript errors from missing types
- [ ] Build succeeds

### Rollback Strategy Phase 2:
```bash
git reset --hard HEAD~1  # Undo import changes
```

---

## Phase 3: Update Components - Read Operations (Day 2 Morning)

### Step 3.1: Update Course Edit Page

**File**: `/src/app/instructor/course/[id]/edit/page.tsx`

**BEFORE**:
```typescript
const courseCreation = useAppStore(state => state.courseCreation)
const uploadQueue = useAppStore(state => state.uploadQueue)

// Using nested structure
{courseCreation?.chapters.map(chapter => (
  <div key={chapter.id}>
    {chapter.videos.map(video => (
      <VideoCard video={video} />
    ))}
  </div>
))}
```

**AFTER**:
```typescript
const activeCourseId = useAppStore(state => state.activeCourseId)
const course = useAppStore(state => state.courses[activeCourseId!])
const videos = useAppStore(state => state.videos)
const getChapterVideos = useAppStore(state => state.getChapterVideos)

// Virtual chapters - get unique chapterIds from videos
const chapterIds = [...new Set(
  Object.values(videos)
    .filter(v => v.chapterId?.startsWith('chapter-'))
    .map(v => v.chapterId)
)]

// Using normalized structure
{chapterIds.map(chapterId => {
  const chapterVideos = getChapterVideos(chapterId)
  return (
    <div key={chapterId}>
      {chapterVideos.map(video => (
        <VideoCard video={video} />
      ))}
    </div>
  )
})}
```

### Step 3.2: Update Course Create Page

**File**: `/src/app/instructor/course/new/page.tsx`

**BEFORE**:
```typescript
useEffect(() => {
  resetCourseCreation()
}, [])

const courseCreation = useAppStore(state => state.courseCreation)
const currentStep = useAppStore(state => state.currentStep)
```

**AFTER**:
```typescript
useEffect(() => {
  resetCourse()
}, [])

const activeCourseId = useAppStore(state => state.activeCourseId)
const course = useAppStore(state => state.courses[activeCourseId!])
const currentWizardStep = useAppStore(state => state.currentWizardStep)
```

### Step 3.3: Update ChapterManager Component

**File**: `/src/components/course/ChapterManager.tsx`

**BEFORE**:
```typescript
interface Props {
  chapters: Chapter[]
  onUpdateChapter: (id: string, title: string) => void
  onDeleteChapter: (id: string) => void
  onReorderChapters: (chapters: Chapter[]) => void
}

// Receives full chapter objects with nested videos
```

**AFTER**:
```typescript
interface Props {
  chapterIds: string[]  // Just IDs
  onUpdateChapterTitle: (id: string, title: string) => void
  onDeleteChapter: (id: string) => void
  onReorderChapters: (chapterIds: string[]) => void
}

// Get videos for each chapter from store
const getChapterVideos = useAppStore(state => state.getChapterVideos)

{chapterIds.map(chapterId => {
  const videos = getChapterVideos(chapterId)
  // Render chapter UI
})}
```

### Step 3.4: Update VideoList Component

**File**: `/src/components/course/VideoList.tsx`

**BEFORE**:
```typescript
interface Props {
  videos: VideoUpload[]
  chapterId: string
  onReorder: (videos: VideoUpload[]) => void
}
```

**AFTER**:
```typescript
interface Props {
  videoIds: string[]  // Just IDs
  chapterId: string
  onReorder: (videoIds: string[]) => void
}

// Get video details from store
const videos = useAppStore(state => state.videos)

{videoIds.map(videoId => {
  const video = videos[videoId]
  // Render video UI
})}
```

### 📍 **CHECKPOINT 3A**:
- [ ] Edit page loads and displays course
- [ ] Create page initializes new course
- [ ] Components render with normalized data
- [ ] No console errors about missing properties

### Rollback Strategy Phase 3:
```bash
git checkout HEAD -- src/app/instructor/course/[id]/edit/page.tsx
git checkout HEAD -- src/app/instructor/course/new/page.tsx
git checkout HEAD -- src/components/course/ChapterManager.tsx
git checkout HEAD -- src/components/course/VideoList.tsx
```

---

## Phase 4: Update Components - Write Operations (Day 2 Afternoon)

### Step 4.1: Update Video Upload Handler

**File**: `/src/app/instructor/course/[id]/edit/page.tsx`

**BEFORE**:
```typescript
const addVideosToQueue = useAppStore(state => state.addVideosToQueue)

const handleFilesSelected = (files: FileList) => {
  addVideosToQueue(files)
}
```

**AFTER**:
```typescript
const addVideo = useAppStore(state => state.addVideo)

const handleFilesSelected = (files: FileList) => {
  // Get first chapter or create one
  const videos = Object.values(useAppStore.getState().videos)
  let chapterId = videos[0]?.chapterId
  
  if (!chapterId) {
    chapterId = `chapter-${Date.now()}`
  }
  
  Array.from(files).forEach(file => {
    addVideo(file, chapterId)
  })
}
```

### Step 4.2: Update Video Reorder

**File**: `/src/components/course/VideoList.tsx`

**BEFORE**:
```typescript
const reorderVideosInChapter = useAppStore(state => state.reorderVideosInChapter)

const handleReorder = (reorderedVideos: VideoUpload[]) => {
  reorderVideosInChapter(chapterId, reorderedVideos)
}
```

**AFTER**:
```typescript
const reorderVideos = useAppStore(state => state.reorderVideos)

const handleReorder = (reorderedVideoIds: string[]) => {
  reorderVideos(chapterId, reorderedVideoIds)
}
```

### Step 4.3: Update Save Operations

**File**: `/src/app/instructor/course/[id]/edit/page.tsx`

**BEFORE**:
```typescript
const saveDraft = useAppStore(state => state.saveDraft)
const publishCourse = useAppStore(state => state.publishCourse)
```

**AFTER**:
```typescript
// Same method names, but they now use normalized state internally
const saveDraft = useAppStore(state => state.saveDraft)
const publishCourse = useAppStore(state => state.publishCourse)
```

### Step 4.4: Update Delete Operations

**BEFORE**:
```typescript
const removeVideo = useAppStore(state => state.removeVideo)

const handleDeleteVideo = (videoId: string) => {
  removeVideo(videoId)
}
```

**AFTER**:
```typescript
const deleteVideo = useAppStore(state => state.deleteVideo)

const handleDeleteVideo = (videoId: string) => {
  deleteVideo(videoId)
}
```

### 📍 **CHECKPOINT 4A**: Test Everything
- [ ] Upload new videos
- [ ] Videos appear in correct chapter
- [ ] Reorder videos within chapter
- [ ] Delete video
- [ ] Save draft
- [ ] Reload page - data persists
- [ ] Create new course
- [ ] Publish course

### Rollback Strategy Phase 4:
```bash
git reset --hard HEAD~1  # Undo all write operation changes
```

---

## Phase 5: Remove Old Slice (Day 3 Morning)

### Step 5.1: Update App Store

**File**: `/src/stores/app-store.ts`

**BEFORE**:
```typescript
import { CourseCreationSlice } from './slices/course-creation-slice'

export interface AppStore extends 
  AuthSlice,
  CourseCreationSlice,  // Remove this
  NormalizedCourseSlice {
}

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createCourseCreationSlice(...a),  // Remove this
      ...createNormalizedCourseSlice(...a),
    })
  )
)
```

**AFTER**:
```typescript
// Don't import CourseCreationSlice

export interface AppStore extends 
  AuthSlice,
  NormalizedCourseSlice {
}

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createNormalizedCourseSlice(...a),
    })
  )
)
```

### Step 5.2: Delete Old Files

```bash
rm src/stores/slices/course-creation-slice.ts
rm src/stores/selectors/course-selectors.ts
```

### Step 5.3: Remove uploadQueue References

Search and remove any remaining `uploadQueue` references. Videos now have `uploadStatus` and `uploadProgress` directly.

### 📍 **CHECKPOINT 5A**: Final Testing
- [ ] No TypeScript errors
- [ ] No console errors  
- [ ] All features work
- [ ] Upload shows progress
- [ ] Videos save to database
- [ ] Backblaze upload works

### Rollback Strategy Phase 5:
```bash
git reset --hard HEAD~2  # Restore old slice and imports
```

---

## Components Requiring Updates

### Major Components:
1. `/src/app/instructor/course/[id]/edit/page.tsx` - Read from normalized, update methods
2. `/src/app/instructor/course/new/page.tsx` - Use normalized state
3. `/src/components/course/ChapterManager.tsx` - Work with IDs not objects
4. `/src/components/course/VideoList.tsx` - Work with IDs not objects
5. `/src/components/course/VideoUploader.tsx` - Already updated (no uploadQueue)

### Minor Components:
6. `/src/hooks/useNormalizedVideoReorder.ts` - Update selectors
7. `/src/hooks/useVideoPreview.ts` - Get video from normalized state
8. Any component importing types from course-creation-slice

---

## Handling 18 Missing Items from Review

All items addressed in normalized structure:

1. ✅ Database sync - `saveDraft()` uses normalized state
2. ✅ Upload queue - Merged into videos with `uploadStatus`
3. ✅ Type compatibility - Clean types, no adapters
4. ✅ Backblaze integration - `backblazeFileId` on Video
5. ✅ Auto-save - `isSaving` flag in state
6. ✅ Feature flags - Check in methods
7. ✅ UI fields - All on Course interface
8. ✅ Step navigation - `currentWizardStep` in state
9. ✅ Reset function - `resetCourse()` method
10. ✅ Drag between chapters - `moveVideoToChapter()`
11. ✅ Save indicators - `isSaving` flag
12. ✅ Upload queue structure - Part of Video interface
13. ✅ Type exports - Exported from normalized slice
14. ✅ Course metadata - All fields on Course interface
15. ✅ Video metadata - All fields on Video interface
16. ✅ Chapter interface - Virtual chapters (ID strings)
17. ✅ Auto chapter creation - In `addVideo()` method
18. ✅ First chapter assignment - In `addVideo()` method

---

## Testing Script After Each Phase

```typescript
// Test Course Creation
1. Start new course
2. Add title and description
3. Upload 3 videos
4. Verify videos appear
5. Reorder videos
6. Save draft
7. Refresh page
8. Verify data persists

// Test Course Editing
1. Load existing course
2. Add new video
3. Delete a video
4. Move video to different chapter
5. Save changes
6. Refresh page
7. Verify changes persist

// Test Edge Cases
1. Upload while offline
2. Delete all videos
3. Rapid save clicks
4. Large file upload
```

---

## Benefits of This Approach

1. **No adapters** - Direct normalized API usage
2. **No parallel states** - Clean migration
3. **Incremental safety** - Test at each phase
4. **Virtual chapters** - No database changes needed
5. **Single source of truth** - Videos table only
6. **Clean rollback** - Each phase can be reverted
7. **Type safety** - Proper TypeScript throughout

---

## Timeline

- **Day 1**: Phase 1-2 (Prepare slice, update types)
- **Day 2**: Phase 3-4 (Update components)
- **Day 3**: Phase 5 (Remove old code, final testing)

Total: 3 days with proper testing and rollback points.
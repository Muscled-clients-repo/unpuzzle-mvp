# Anti-Patterns to Normalized State: Concrete Corrections

## Overview
The migration plan contains several anti-patterns that violate normalized state principles. Here's how to correct them properly.

## Anti-Pattern 1: Nested Objects in Entities

### ❌ WRONG (From Migration Plan Line 402-404)
```typescript
// Chapter interface with nested video objects
export interface Chapter {
  id: string
  title: string
  videos: VideoUpload[]  // ANTI-PATTERN: Full objects nested
}
```

### ✅ CORRECT (Normalized)
```typescript
// Chapter only stores IDs
export interface Chapter {
  id: string
  title: string
  videoIds: string[]  // Just IDs, not objects
  order: number
}

// Videos are stored separately
export interface NormalizedState {
  videos: Record<string, Video>  // Lookup table
  chapters: Record<string, Chapter>  // Lookup table
}

// To get videos for a chapter:
const getChapterVideos = (state, chapterId) => {
  const chapter = state.chapters[chapterId]
  return chapter.videoIds.map(id => state.videos[id])
}
```

## Anti-Pattern 2: Duplicate Arrays (uploadQueue)

### ❌ WRONG (From Migration Plan Line 335-344)
```typescript
interface State {
  videos: Record<string, Video>  // Main video data
  uploadQueue: VideoUploadItem[]  // ANTI-PATTERN: Duplicate video data
}

// uploadQueue has different structure than videos:
interface VideoUploadItem {
  id: string
  name: string
  progress: number
  status: 'uploading' | 'complete'
}
```

### ✅ CORRECT (Single Source of Truth)
```typescript
// Everything in one place
interface Video {
  id: string
  name: string
  url?: string
  // Upload-related fields on the same entity
  uploadProgress?: number
  uploadStatus?: 'pending' | 'uploading' | 'complete' | 'error'
  file?: File  // Temporary during upload
}

interface NormalizedState {
  videos: Record<string, Video>  // SINGLE source for all video data
}

// To get uploading videos:
const getUploadingVideos = (state) => 
  Object.values(state.videos).filter(v => v.uploadStatus === 'uploading')
```

## Anti-Pattern 3: Mixed UI and Domain State

### ❌ WRONG (From Migration Plan Line 274-278)
```typescript
interface CourseCreationSlice {
  // Domain data mixed with UI state
  courseCreation: CourseCreationData
  currentStep: string  // UI state
  isAutoSaving: boolean  // UI state
  autoSaveTimer: NodeJS.Timeout  // UI implementation detail
}
```

### ✅ CORRECT (Separated Concerns)
```typescript
interface NormalizedState {
  // Pure domain data
  courses: Record<string, Course>
  chapters: Record<string, Chapter>
  videos: Record<string, Video>
  
  // UI state separate
  ui: {
    activeCourseId: string | null
    currentWizardStep: 'info' | 'content' | 'review'
    isSaving: boolean
  }
}

// Auto-save timer is NOT in state, it's a side effect
let autoSaveTimer: NodeJS.Timeout | null = null  // Outside state
```

## Anti-Pattern 4: Adapter Methods (Preserving Old API)

### ❌ WRONG (From Migration Plan Line 52-61)
```typescript
// Adding adapter methods to preserve old API
const normalizedSlice = {
  // These are anti-patterns - preserving old denormalized methods
  setCourseInfo: (info: Partial<CourseCreationData>) => {
    // Map to updateNormalizedCourse
  },
  addVideosToQueue: (files: FileList) => {
    // Map to normalized operations
  }
}
```

### ✅ CORRECT (Clean Normalized API)
```typescript
const normalizedSlice = {
  // Direct normalized operations only
  updateCourse: (courseId: string, changes: Partial<Course>) => {},
  addVideo: (video: Video) => {},
  updateVideo: (videoId: string, changes: Partial<Video>) => {},
  addVideoToChapter: (videoId: string, chapterId: string) => {}
  // No adapter methods!
}

// Components update to use normalized API directly:
// OLD: setCourseInfo({ title: 'New Title' })
// NEW: updateCourse(courseId, { title: 'New Title' })
```

## Anti-Pattern 5: Complex Selectors for Denormalized Views

### ❌ WRONG (From Migration Plan Line 104-117)
```typescript
// Creating complex adapter to maintain old structure
export const getNormalizedAsCourseCreation = (state): CourseCreationData => {
  const normalized = state.normalizedState
  return {
    title: normalized.courses[normalized.activeCourseId]?.title,
    chapters: Object.values(normalized.chapters).map(ch => ({
      ...ch,
      videos: ch.videoIds.map(id => normalized.videos[id])  // Denormalizing
    }))
  }
}
```

### ✅ CORRECT (Simple Normalized Selectors)
```typescript
// Simple, efficient selectors
export const getCourse = (state, courseId) => state.courses[courseId]
export const getChapter = (state, chapterId) => state.chapters[chapterId]
export const getVideo = (state, videoId) => state.videos[videoId]

// Components handle the composition:
function ChapterView({ chapterId }) {
  const chapter = useStore(state => getChapter(state, chapterId))
  const videos = useStore(state => 
    chapter.videoIds.map(id => state.videos[id])
  )
  // Compose in component, not in selector
}
```

## Anti-Pattern 6: CourseCreationData Type Preservation

### ❌ WRONG (From Migration Plan Line 257-260)
```typescript
// Trying to maintain compatibility with old type
interface CourseCreationData { /* old denormalized structure */ }
interface NormalizedState { /* new normalized structure */ }
type CourseAdapter = CourseCreationData & { _normalized: true }
```

### ✅ CORRECT (Clean Break)
```typescript
// Delete old types completely
// Use only normalized types
interface Course {
  id: string
  title: string
  description: string
  chapterIds: string[]  // Just IDs
}

// No CourseCreationData type at all
// No adapter types
// Components must update to use normalized structure
```

## Anti-Pattern 7: Virtual Chapters in Videos

### ❌ WRONG (Current Implementation)
```typescript
interface Video {
  chapterId?: string  // Virtual chapter reference
  // No actual chapters table in DB
}
```

### ✅ CORRECT (Proper Normalization)
```typescript
// 1. Add chapters to database
CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id),
  title TEXT,
  order INTEGER
)

// 2. Proper normalized state
interface Chapter {
  id: string
  courseId: string
  title: string
  order: number
  videoIds: string[]
}

interface Video {
  id: string
  chapterId: string  // Foreign key to real chapter
  order: number  // Order within chapter
}
```

## Anti-Pattern 8: File Objects in State

### ❌ WRONG (From Migration Plan Line 379)
```typescript
interface VideoUpload {
  file?: File  // ANTI-PATTERN: Non-serializable object in state
}
```

### ✅ CORRECT (Keep Files Separate)
```typescript
// State only has serializable data
interface Video {
  id: string
  name: string
  size: number  // File size in bytes
  uploadStatus: 'pending' | 'uploading' | 'complete'
}

// Files stored separately (not in Redux/Zustand)
const uploadManager = new Map<string, File>()  // Temporary file storage

// During upload:
function uploadVideo(videoId: string) {
  const file = uploadManager.get(videoId)
  // ... upload logic
  uploadManager.delete(videoId)  // Clean up after upload
}
```

## Anti-Pattern 9: Sync Middleware

### ❌ WRONG (From Migration Plan Line 74-81)
```typescript
// Creating middleware to sync between old and new state
export const syncToNormalized = (oldState: CourseCreationData) => {
  // Convert old state to normalized format
  // Update normalized state
}
```

### ✅ CORRECT (No Sync - Direct Migration)
```typescript
// One-time migration, not continuous sync
export const migrateToNormalized = (oldState) => {
  // Run ONCE during migration
  const normalized = convertToNormalized(oldState)
  // Replace entire state
  set(() => normalized)
  // Delete old state code immediately
}
```

## Anti-Pattern 10: Parallel State Mode

### ❌ WRONG (From Migration Plan Phase 2)
```typescript
// Running both states in parallel
interface AppStore {
  courseCreation: CourseCreationData  // Old state
  normalizedState: NormalizedState    // New state
  // Writing to both!
}
```

### ✅ CORRECT (Atomic Switch)
```typescript
// Strategy: Update ALL components in one commit
// 1. Create feature branch
// 2. Update state structure
// 3. Update ALL components
// 4. Test thoroughly
// 5. Merge - no parallel states ever

interface AppStore {
  // Only normalized state from day 1
  courses: Record<string, Course>
  chapters: Record<string, Chapter>
  videos: Record<string, Video>
}
```

## Summary: Clean Migration Strategy

### Instead of the 5-phase incremental approach with adapters:

1. **Feature Branch**: Create `refactor/normalized-state`
2. **State First**: Implement clean normalized state (no adapters)
3. **Update Components**: Update ALL components to use normalized API
4. **Test Everything**: Comprehensive testing on feature branch
5. **Atomic Merge**: Single commit to main, no parallel states

### Key Principles:
- ❌ NO adapter layers
- ❌ NO parallel states
- ❌ NO backward compatibility
- ✅ Clean normalized structure
- ✅ Single source of truth
- ✅ Direct API usage
- ✅ Atomic migration

### Benefits:
- No sync bugs (no dual state)
- Cleaner code (no adapters)
- Faster migration (no incremental phases)
- Better performance (normalized lookups)
- Maintainable (single pattern)
# Migration Plan: CourseCreationSlice → NormalizedCourseSlice

## Current State Analysis

### Dependencies on CourseCreationSlice:
1. **Course Edit Page** (`/app/instructor/course/[id]/edit/page.tsx`)
2. **Course Create Page** (`/app/instructor/course/new/page.tsx`)
3. **App Store** (`/stores/app-store.ts`)
4. **Components**: ChapterManager, VideoList, VideoUploader
5. **Hooks**: useNormalizedVideoReorder (uses selectors)
6. **Server Actions**: course-actions.ts (reads from store for saveDraft)

### Methods Currently Used from CourseCreationSlice:
```typescript
// State
courseCreation: CourseCreationData | null
uploadQueue: VideoUpload[]
isAutoSaving: boolean
currentStep: string

// Methods
setCourseInfo()
addVideosToQueue()
updateVideoProgress()
updateVideoStatus()
updateVideoName()
removeVideo()
createChapter()
updateChapter()
deleteChapter()
reorderChapters()
moveVideoToChapter()
reorderVideosInChapter()
moveVideoBetweenChapters()  // ADDED: Complex drag logic
saveDraft()
publishCourse()
loadCourseForEdit()
resetCourseCreation()
setCurrentStep()             // ADDED: Wizard navigation
toggleAutoSave()             // ADDED: Auto-save toggle
```

## Migration Strategy: Incremental with Checkpoints

### Phase 1: Create Adapter Layer (Day 1 Morning)
**Goal**: Make normalized slice compatible with existing UI without breaking anything

#### Step 1.1: Add Missing Methods to NormalizedCourseSlice
```typescript
// In normalized-course-slice.ts, add these adapter methods:

// These will map old method signatures to new normalized operations
setCourseInfo: (info: Partial<CourseCreationData>) => {
  // Map to updateNormalizedCourse
}

addVideosToQueue: (files: FileList) => {
  // Already exists, may need signature adjustment
}

// Add all other missing methods...
```

#### 📍 **CHECKPOINT 1A**: 
- [ ] All methods from CourseCreationSlice exist in NormalizedCourseSlice
- [ ] No TypeScript errors in normalized slice
- [ ] App still compiles

---

### Phase 2: Parallel State Mode (Day 1 Afternoon)
**Goal**: Run both states in parallel, UI reads from old, writes to both

#### Step 2.1: Create Sync Middleware
```typescript
// Create /src/stores/middleware/state-sync.ts
export const syncToNormalized = (oldState: CourseCreationData) => {
  // Convert old state to normalized format
  // Update normalized state
}
```

#### Step 2.2: Update Every Write Operation
```typescript
// In each method that modifies state:
setCourseInfo: (info) => {
  // 1. Update old state (existing code)
  // 2. ALSO update normalized state
  syncToNormalized(newState)
}
```

#### 📍 **CHECKPOINT 2A**:
- [ ] Create a test course
- [ ] Check browser DevTools → Redux → Both states have same data
- [ ] Upload a video → appears in both states
- [ ] No functionality broken

---

### Phase 3: Swap Read Operations (Day 2 Morning)
**Goal**: UI reads from normalized, writes to both

#### Step 3.1: Create Selector Adapters
```typescript
// /src/stores/adapters/normalized-to-old.ts
export const getNormalizedAsCourseCreation = (state): CourseCreationData => {
  const normalized = state.normalizedState
  return {
    // Map normalized back to old format for UI
    title: normalized.courses[normalized.activeCourseId]?.title,
    chapters: Object.values(normalized.chapters).map(ch => ({
      ...ch,
      videos: ch.videoIds.map(id => normalized.videos[id])
    }))
  }
}
```

#### Step 3.2: Update Edit Page to Read from Normalized
```typescript
// In edit/page.tsx
const courseCreation = useAppStore(state => 
  getNormalizedAsCourseCreation(state)
)
```

#### 📍 **CHECKPOINT 3A**:
- [ ] Edit page loads course from normalized state
- [ ] Videos display correctly
- [ ] Chapters show correct videos
- [ ] Can still edit/save

#### Step 3.3: Update Create Page
```typescript
// Same pattern for new/page.tsx
```

#### 📍 **CHECKPOINT 3B**:
- [ ] Create page works with normalized
- [ ] Can create new course
- [ ] Videos upload and display

---

### Phase 4: Remove Write to Old State (Day 2 Afternoon)
**Goal**: Only write to normalized, stop updating old state

#### Step 4.1: Remove Old State Updates
```typescript
// In each method:
setCourseInfo: (info) => {
  // Remove old state update
  // ONLY update normalized state
  updateNormalizedCourse(info)
}
```

#### 📍 **CHECKPOINT 4A**: Test EVERYTHING
- [ ] Create new course
- [ ] Upload videos
- [ ] Reorder videos
- [ ] Delete videos
- [ ] Save course
- [ ] Reload page - data persists
- [ ] Edit existing course
- [ ] Publish course

---

### Phase 5: Cleanup (Day 3)
**Goal**: Remove all old code

#### Step 5.1: Update App Store
```typescript
// Remove CourseCreationSlice from store
export interface AppStore extends 
  AuthSlice,
  // CourseCreationSlice, ← DELETE THIS LINE
  NormalizedCourseSlice,
```

#### Step 5.2: Delete Files
```bash
rm src/stores/slices/course-creation-slice.ts
rm src/stores/selectors/course-selectors.ts
```

#### Step 5.3: Clean Imports
```typescript
// Update all imports from course-creation-slice to normalized-course-slice
```

#### 📍 **CHECKPOINT 5A**: Final Testing
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] All features work
- [ ] Performance improved

---

## Incremental Testing Script

### After Each Checkpoint, Test:
```typescript
// 1. Course Creation
- Start new course
- Add title, description
- Create 2 chapters
- Upload 3 videos
- Reorder videos
- Save draft
- Refresh page
- Verify all data persists

// 2. Course Editing
- Load existing course
- Add new video
- Delete a video
- Rename chapter
- Move video between chapters
- Save changes
- Refresh page
- Verify changes persist

// 3. Edge Cases
- Upload while offline
- Delete last video in chapter
- Delete last chapter
- Rapid save clicks
- Large file upload
```

## CRITICAL MISSING ITEMS (Added After Review)

### 1. Database Sync Considerations
**MISSING**: The plan doesn't address how saveDraft() currently reads from store
```typescript
// course-creation-slice.ts saveDraft() uses:
- courseCreation.videos for database updates
- Checks normalized state as fallback
- Must ensure normalized state has ALL video metadata
```

### 2. Video Upload Flow
**MISSING**: uploadQueue is used by multiple components
```typescript
// Need to ensure uploadQueue exists in normalized:
- VideoUploader reads uploadQueue
- Edit/Create pages pass uploadQueue as prop
- Must maintain same structure
```

### 3. Type Definitions
**MISSING**: Type compatibility between old and new
```typescript
// Need adapter types:
interface CourseCreationData { /* old */ }
interface NormalizedState { /* new */ }
type CourseAdapter = CourseCreationData & { _normalized: true }
```

### 4. Backblaze Integration
**MISSING**: Video deletion flow
```typescript
// removeVideo() currently:
1. Updates UI (old state)
2. Calls API to delete from Backblaze
3. Must ensure normalized state tracks backblazeFileId
```

### 5. Auto-save Feature
**MISSING**: Auto-save timer management
```typescript
// CourseCreationSlice has debounced auto-save
// Must migrate timer logic to normalized
let autoSaveTimer: NodeJS.Timeout | null
```

### 6. Feature Flags
**MISSING**: Environment variable checks
```typescript
// Current code checks:
process.env.NEXT_PUBLIC_USE_REAL_COURSE_UPDATES
process.env.NEXT_PUBLIC_USE_REAL_COURSE_CREATION
// Must maintain these checks in normalized
```

### 7. UI State Fields
**MISSING**: Additional state fields used in UI
```typescript
// Edit page uses these fields not in normalized:
courseCreation?.createdAt  // Creation date display
courseCreation?.price      // Price field
courseCreation?.category   // Category selector
courseCreation?.level      // Difficulty level
// Must add to normalized course entity
```

### 8. Step Navigation (Create Page)
**MISSING**: currentStep state for wizard
```typescript
// Create page uses:
currentStep: 'info' | 'content' | 'review'
setCurrentStep()
// Multi-step form navigation must work
```

### 9. Course Reset Function
**MISSING**: resetCourseCreation() for new course page
```typescript
// Called on mount in create page:
useEffect(() => {
  resetCourseCreation() // Clears state for new course
}, [])
```

### 10. Video Drag Between Chapters
**MISSING**: moveVideoBetweenChapters complex logic
```typescript
// Handles drag & drop between different chapters
// Updates source and target chapter arrays
// Must maintain video order in both
```

### 11. Save Status Indicators
**MISSING**: isAutoSaving flag for UI feedback
```typescript
// UI shows saving spinner when isAutoSaving = true
// Must maintain this flag in normalized
```

### 12. Video Queue Management
**MISSING**: uploadQueue array structure details
```typescript
// uploadQueue has different structure than videos:
interface VideoUploadItem {
  id: string
  name: string
  progress: number
  status: 'uploading' | 'complete' | 'error'
}
// Different from video entity structure
```

### 13. Type Exports
**CRITICAL MISSING**: Types imported by other files
```typescript
// These types are exported and used elsewhere:
export interface VideoUpload { ... }
export interface Chapter { ... }

// Used by:
- services/supabase/video-service.ts
- services/video/video-upload-service.ts  
- hooks/useVideoPreview.ts
- hooks/useNormalizedVideoReorder.ts
- api/upload/route.ts
- Components (ChapterManager, VideoList, VideoUploader)

// MUST export these from normalized slice too!
```

### 14. Course Metadata Fields
**MISSING**: Additional CourseCreationData fields
```typescript
// CourseCreationData has these fields:
totalDuration?: string      // "12h 30m" format
lastSaved?: Date            // Last save timestamp
autoSaveEnabled: boolean    // Toggle for auto-save
thumbnail?: File | string   // Course thumbnail
```

### 15. Video Metadata Fields  
**MISSING**: VideoUpload interface complete structure
```typescript
export interface VideoUpload {
  id: string
  file?: File              // MISSING: File object reference
  name: string
  size: number            // MISSING: File size in bytes
  duration?: string       // MISSING: Video duration
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  progress: number
  url?: string
  thumbnailUrl?: string   // MISSING: Video thumbnail
  chapterId?: string
  order: number
  transcript?: string     // MISSING: Transcript data
  backblazeFileId?: string
  markedForDeletion?: boolean
}
```

### 16. Chapter Interface Complete
**MISSING**: Chapter interface full structure
```typescript
export interface Chapter {
  id: string
  title: string
  description?: string    // MISSING: Chapter description
  order: number
  videos: VideoUpload[]   // Array of full VideoUpload objects
  duration?: string       // MISSING: Total chapter duration
}
```

### 17. Automatic Chapter Creation
**MISSING**: Auto-create Chapter 1 logic
```typescript
// In addVideosToQueue:
if (!get().courseCreation?.chapters.length) {
  get().createChapter('Chapter 1')  // Auto-creates first chapter
}
// This MUST work in normalized too
```

### 18. First Chapter Assignment
**MISSING**: Auto-assign videos to first chapter
```typescript
// Videos automatically go to first chapter:
const firstChapterId = get().courseCreation?.chapters[0]?.id
// All new videos get: chapterId: firstChapterId
```

## Risk Mitigation

### Rollback Points:
1. **Before Phase 3**: Can still revert to old state only
2. **Before Phase 4**: Can still write to both states
3. **Before Phase 5**: Old code still exists, just unused

### Backup Strategy:
```bash
# Before starting
git checkout -b migration/normalized-state
git commit -am "Backup before migration"

# After each phase
git commit -am "Phase X complete - checkpoint"
```

## Success Metrics

### Before Migration:
- [ ] Document current bugs
- [ ] Measure save time
- [ ] Count state updates per action

### After Migration:
- [ ] All bugs fixed
- [ ] Save time < 1 second
- [ ] 50% fewer state updates
- [ ] Code reduced by 500+ lines

## Common Pitfalls to Avoid

1. **Don't migrate all at once** - Follow phases
2. **Don't skip checkpoints** - Test incrementally  
3. **Don't delete old code early** - Keep until Phase 5
4. **Don't forget edge cases** - Test video deletion especially
5. **Don't break TypeScript** - Fix types as you go

## Implementation Order

### Day 1:
- [ ] Morning: Phase 1 (Adapter Layer)
- [ ] Afternoon: Phase 2 (Parallel State)
- [ ] Test thoroughly

### Day 2:
- [ ] Morning: Phase 3 (Swap Reads)
- [ ] Afternoon: Phase 4 (Remove Old Writes)
- [ ] Test thoroughly

### Day 3:
- [ ] Morning: Phase 5 (Cleanup)
- [ ] Afternoon: Documentation & Training

## Emergency Procedures

### If Something Breaks:
1. **Check console** for state mismatch errors
2. **Check DevTools** for state shape
3. **Rollback** to last checkpoint commit
4. **Debug** specific method that failed
5. **Fix** and continue

### If Totally Stuck:
```bash
# Nuclear option - full revert
git reset --hard HEAD~[number_of_commits]
git checkout main
```

## Final Checklist

### Pre-Migration:
- [ ] All tests passing
- [ ] Backup created
- [ ] Team notified
- [ ] Migration branch created

### Post-Migration:
- [ ] Old files deleted
- [ ] Imports updated
- [ ] No console errors
- [ ] All features tested
- [ ] Performance improved
- [ ] Documentation updated
- [ ] Team trained on new structure
- [ ] uploadQueue working correctly
- [ ] Auto-save still functions
- [ ] Video deletion removes from Backblaze
- [ ] Feature flags still work

## Notes

- **Time Estimate**: 3 days with checkpoints
- **Risk Level**: Medium (mitigated by incremental approach)
- **Complexity**: High (but manageable with phases)
- **Reward**: Massive code reduction, bug fixes, better performance
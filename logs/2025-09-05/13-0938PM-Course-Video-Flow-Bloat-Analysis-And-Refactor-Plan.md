# Course & Video Flow - Bloat Analysis and Refactor Plan

## Executive Summary
The current course creation and video management system has significant code bloat due to:
1. Parallel state management systems (old + normalized)
2. Mixed API routes and server actions
3. Redundant service layers
4. Duplicate upload status displays
5. Unnecessary abstractions

## 1. BLOATED CODE TO DELETE

### 1.1 Duplicate State Management
**DELETE THESE FILES:**
```
❌ /src/stores/slices/course-creation-slice.ts (560+ lines)
   - Running parallel to normalized-course-slice
   - Causes state sync issues
   - Keep only normalized-course-slice

❌ /src/stores/selectors/course-selectors.ts (290+ lines)
   - Complex selectors for denormalized state
   - Replace with simple normalized lookups
```

### 1.2 Redundant Video Services
**DELETE THESE:**
```
❌ /src/services/video/video-upload-service.ts
   - Mock service, not used with real Backblaze
   
❌ /src/services/supabase/video-service.ts
   - Unnecessary abstraction layer
   - Move logic directly to server actions
```

### 1.3 API Routes (Replace with Server Actions)
**DELETE & REPLACE:**
```
❌ /src/app/api/upload/route.ts
   → Replace with uploadVideo server action
   
❌ /src/app/api/delete-video/[id]/route.ts
   → Replace with deleteVideo server action
   
❌ /src/app/api/courses/[id]/route.ts
   → Replace with updateCourse server action
```

### 1.4 Duplicate Components
**CONSOLIDATE:**
```
❌ Multiple VideoUpload implementations
❌ Duplicate progress indicators
❌ Redundant status badges
```

## 2. CODE TO REFACTOR

### 2.1 State Management - The Zustand Way

**CURRENT MESS:**
```typescript
// BAD: Multiple stores, complex sync
export interface AppStore extends 
  CourseCreationSlice,     // OLD - DELETE
  NormalizedCourseSlice,   // KEEP THIS
  // ... 10+ other slices
{}
```

**REFACTOR TO:**
```typescript
// GOOD: Single normalized store
export interface AppStore {
  // Auth & User
  auth: AuthState
  user: UserState
  
  // Course Management (normalized)
  courses: Record<string, Course>
  chapters: Record<string, Chapter>
  videos: Record<string, Video>
  
  // UI State
  ui: {
    activeCoursId: string | null
    uploadQueue: Upload[]
    hasChanges: boolean
  }
  
  // Actions (grouped by domain)
  courseActions: {
    create: (data: CourseData) => Promise<void>
    update: (id: string, data: Partial<Course>) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  
  videoActions: {
    upload: (file: File, chapterId: string) => Promise<void>
    reorder: (videos: string[], chapterId: string) => void
    delete: (id: string) => Promise<void>
  }
}
```

### 2.2 Server Actions Pattern

**CURRENT MESS:**
```typescript
// BAD: API route with manual auth, no type safety
export async function POST(request: NextRequest) {
  const authResult = await authenticateApiRequest(request)
  if (!authResult.success) return NextResponse.json({error})
  // ... 100+ lines of logic
}
```

**REFACTOR TO:**
```typescript
// GOOD: Server action, automatic auth, type-safe
'use server'

export async function uploadVideo(
  file: File,
  chapterId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const user = await requireAuth() // Throws if not authenticated
  
  // Direct, simple logic
  const url = await backblazeService.upload(file)
  await db.videos.create({ url, chapterId, userId: user.id })
  
  revalidatePath(`/course/${courseId}`)
  return { success: true, url }
}
```

### 2.3 Video Upload Flow

**CURRENT MESS:**
```typescript
// BAD: Complex flow with multiple status updates
1. Add to uploadQueue in store
2. Update progress in multiple places
3. Call API route
4. Update normalized state
5. Update old state
6. Sync with database
```

**REFACTOR TO:**
```typescript
// GOOD: Simple, single flow
const uploadVideo = async (file: File, chapterId: string) => {
  // 1. Optimistic update
  const tempId = crypto.randomUUID()
  addVideoToUI(tempId, file.name, chapterId)
  
  // 2. Upload via server action
  const result = await uploadVideoAction(file, chapterId)
  
  // 3. Update or rollback
  if (result.success) {
    updateVideo(tempId, result.data)
  } else {
    removeVideo(tempId)
    showError(result.error)
  }
}
```

## 3. PRIORITY REFACTOR ORDER

### Phase 1: Clean State (1-2 days)
1. **Delete CourseCreationSlice** completely
2. **Keep only NormalizedCourseSlice** 
3. **Remove all dual-state sync code**
4. **Fix any broken imports**

### Phase 2: Server Actions (1 day)
1. **Create `/app/actions/video.ts`**:
   - uploadVideo()
   - deleteVideo()
   - reorderVideos()
   
2. **Create `/app/actions/course.ts`**:
   - createCourse()
   - updateCourse()
   - deleteCourse()

3. **Delete all API routes**

### Phase 3: Component Cleanup (1 day)
1. **Single VideoUploader** component
2. **Remove duplicate progress displays**
3. **Consolidate status indicators**

### Phase 4: Database Optimization
1. **Add proper chapters table** (currently virtual)
2. **Add proper indexes**
3. **Fix constraint issues**

## 4. SPECIFIC FILES TO DELETE NOW

```bash
# Delete these immediately - they cause confusion
rm src/stores/slices/course-creation-slice.ts
rm src/services/video/video-upload-service.ts
rm src/services/supabase/video-service.ts
rm src/app/api/upload/route.ts
rm src/app/api/delete-video/\[id\]/route.ts
```

## 5. NEW CLEAN ARCHITECTURE

```
/src
  /app
    /actions          # Server actions only
      course.ts       # All course operations
      video.ts        # All video operations
    /instructor
      /course
        [id]/edit     # Uses server actions directly
        
  /stores
    /slices
      app-slice.ts    # Single normalized store
      
  /components
    /course
      VideoUploader   # Single upload component
      ChapterList     # Clean chapter display
      VideoList       # Clean video display
```

## 6. BENEFITS AFTER REFACTOR

1. **-60% less code** (remove ~2000 lines)
2. **Single source of truth** (normalized state only)
3. **Type-safe operations** (server actions)
4. **No state sync bugs** (one state)
5. **Faster development** (simpler mental model)
6. **Better performance** (less re-renders)

## 7. IMMEDIATE ACTIONS

### Today (Quick Wins):
1. ✅ Already removed duplicate upload displays
2. ⏳ Delete CourseCreationSlice
3. ⏳ Create video server actions
4. ⏳ Remove API routes

### Tomorrow:
1. Complete migration to normalized state
2. Test all video operations
3. Clean up components

### This Week:
1. Full refactor complete
2. Documentation updated
3. Team training on new patterns

## 8. CODE SMELLS TO AVOID

```typescript
// ❌ AVOID THESE PATTERNS:

// 1. Dual state updates
set(state => ({ oldState: x }))
set(state => ({ normalizedState: y }))

// 2. Complex selectors
const getVideosForChapterWithStatusAndOrder = ...

// 3. Service abstractions
class VideoService extends BaseService implements IVideoService

// 4. API routes for internal ops
fetch('/api/internal/video/upload')

// ✅ USE THESE INSTEAD:

// 1. Single state update
updateVideo(id, changes)

// 2. Simple lookups
videos[videoId]

// 3. Direct server actions
await uploadVideo(file)

// 4. Server actions
'use server'
export async function uploadVideo()
```

## 9. TESTING CHECKLIST

After refactor, ensure:
- [ ] Video upload works
- [ ] Video appears in chapter immediately
- [ ] Progress shows in ONE place only
- [ ] Drag & drop reorder works
- [ ] Delete removes from Backblaze + DB
- [ ] Page refresh maintains state
- [ ] No console errors
- [ ] No duplicate uploads

## 10. CONCLUSION

**Current State**: 
- ~5000 lines of tangled code
- 2 parallel state systems
- Mixed patterns (API routes + server actions)
- Multiple bugs from state sync

**After Refactor**:
- ~2000 lines of clean code
- 1 normalized state
- Server actions only
- Zero state sync issues

**Time Estimate**: 3-4 days for complete refactor
**Risk**: Low (keeping normalized state which already works)
**Reward**: High (60% less code, 90% fewer bugs)
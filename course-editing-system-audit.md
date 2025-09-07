# Course Creation/Editing System Audit & Migration Plan

## Executive Summary

After analyzing the current course editing system, I've identified significant architectural inconsistencies and SSOT violations that are causing race conditions and data synchronization issues. This document provides a comprehensive migration plan from the current mixed state management to a clean TanStack Query + Zustand hybrid architecture.

## Current State Analysis

### 1. Original Working Route (`/edit/page.tsx`)

**CURRENT STATE PROBLEMS:**
- **Mixed State Sources**: Component uses both TanStack Query (`useCourse`, `useChapters`) AND local component state (`courseData`, `hasChanges`, `saveStatus`)
- **SSOT Violations**: Course data exists in 3 places: TanStack Query cache, local `courseData` state, and form inputs
- **Race Conditions**: Manual `hasChanges` tracking fights with TanStack Query's automatic invalidation
- **Inconsistent Save Logic**: Manual save orchestration (`handleSave`) doesn't leverage TanStack Query's mutation system properly
- **Upload Progress Confusion**: Uses both Zustand (`uploadProgress`) and component state for progress tracking

**CURRENT DATA FLOW:**
```typescript
// ❌ PROBLEMATIC: Multiple sources of truth
const { data: course } = useCourse(courseId)           // TanStack Query
const [courseData, setCourseData] = useState<any>(null) // Component State
const [hasChanges, setHasChanges] = useState(false)     // Component State
const form = useFormState()                             // Zustand
```

### 2. POC Route (`/edit-v2/page.tsx`)

**IMPROVEMENTS MADE:**
- Added chapter editing capabilities with `ChapterManagerPOC`
- Implemented batch chapter mutations using proven video pattern
- Better separation of video vs chapter state management

**REMAINING ISSUES:**
- Still inherits all the SSOT problems from original route
- Added MORE component state for chapter changes (`hasPendingChapterChanges`, `chapterSaveFunction`)
-複雑な save logic now handles 3 different change types

### 3. ChapterManagerPOC Component

**WELL-IMPLEMENTED PATTERNS:**
- ✅ Smart display name resolution with proper precedence
- ✅ Pending changes tracking for UI feedback
- ✅ Batch save functions using TanStack Query mutations
- ✅ Optimistic updates with rollback support
- ✅ Tab navigation between edit fields

**DATA MANAGEMENT:**
```typescript
// ✅ GOOD: Clear separation of edit state
const [editingChapter, setEditingChapter] = useState<string | null>(null)
const [chapterTitle, setChapterTitle] = useState("")
const [pendingChapterChanges, setPendingChapterChanges] = useState<Record<string, string>>({})

// ✅ GOOD: Smart display name with clear precedence
const getChapterDisplayName = (chapter: Chapter): string => {
  if (editingChapter === chapter.id && chapterTitle) return chapterTitle // Currently editing
  if (pendingChapterChanges[chapter.id]) return pendingChapterChanges[chapter.id] // Pending changes
  return chapter.title || chapter.name || 'Untitled Chapter' // Server data
}
```

### 4. VideoList Component

**EXCELLENT PATTERNS:**
- ✅ Perfect SSOT implementation for video editing
- ✅ Robust pending changes system
- ✅ Smart display name resolution
- ✅ Batch mutations with optimistic updates
- ✅ Proper rollback on errors

### 5. Video Mutations Hook

**STRENGTHS:**
- ✅ Comprehensive optimistic updates
- ✅ Proper error handling with rollback
- ✅ Background reconciliation strategy
- ✅ Progress tracking integration

**ARCHITECTURAL ISSUE:**
- Updates both `['course', courseId]` and `['chapters', courseId]` caches simultaneously
- This creates data duplication and potential sync issues

### 6. Zustand UI Store

**WELL-DESIGNED:**
- ✅ Pure UI state only, no server data
- ✅ Proper persistence strategy (user preferences only)
- ✅ Clean separation of concerns
- ✅ Good hook abstractions

## Migration Plan

### Phase 1: TanStack Query Data Architecture

**GOAL**: Establish single source of truth for all server data

#### 1.1 Query Key Standardization

```typescript
// ✅ NEW: Single source of truth
const COURSE_QUERIES = {
  course: (courseId: string) => ['course', courseId] as const,
  chapters: (courseId: string) => ['course', courseId, 'chapters'] as const, 
  videos: (courseId: string) => ['course', courseId, 'videos'] as const,
}

// ❌ OLD: Multiple conflicting keys
// ['course', courseId] vs ['chapters', courseId]
```

#### 1.2 Unified Data Structure

```typescript
// ✅ NEW: Single normalized structure
interface CourseEditData {
  id: string
  title: string
  description: string
  price: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  status: 'draft' | 'published'
  chapters: Chapter[]
  // Remove separate videos array - videos live in chapters
}

interface Chapter {
  id: string
  title: string
  course_id: string
  order: number
  videos: VideoUpload[]
}
```

#### 1.3 Query Consolidation

```typescript
// ✅ NEW: Single comprehensive query
export function useCourseEdit(courseId: string) {
  return useQuery({
    queryKey: COURSE_QUERIES.course(courseId),
    queryFn: () => fetchCourseWithChaptersAndVideos(courseId),
    staleTime: 30000, // 30 seconds - balance between freshness and performance
  })
}

// ❌ OLD: Multiple conflicting queries
// useCourse(courseId) + useChapters(courseId)
```

### Phase 2: Zustand UI State Extraction

**GOAL**: Move all UI-only state to Zustand, remove component state

#### 2.1 Course Edit UI State

```typescript
// ✅ NEW: Add to Zustand UI slice
interface CourseEditUIState {
  // Tab Management
  activeTab: 'course-info' | 'chapters-videos' | 'settings'
  
  // Edit States (what's currently being edited)
  editingCourse: boolean
  editingChapterId: string | null
  editingVideoId: string | null
  
  // Form Data (temporary edits before save)
  courseFormData: Partial<CourseEditData> | null
  chapterEdits: Record<string, string> // chapterId -> new title
  videoEdits: Record<string, string>   // videoId -> new title
  
  // Save State
  pendingChanges: {
    course: boolean
    chapters: string[] // chapter IDs with changes
    videos: string[]   // video IDs with changes
  }
  
  // UI Feedback
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  lastSavedAt: Date | null
}

interface CourseEditUIActions {
  // Tab Management
  setActiveTab: (tab: CourseEditUIState['activeTab']) => void
  
  // Edit Management
  startEditingCourse: () => void
  stopEditingCourse: () => void
  startEditingChapter: (chapterId: string, initialValue: string) => void
  stopEditingChapter: (chapterId: string) => void
  startEditingVideo: (videoId: string, initialValue: string) => void
  stopEditingVideo: (videoId: string) => void
  
  // Form Data Management
  updateCourseForm: (updates: Partial<CourseEditData>) => void
  updateChapterTitle: (chapterId: string, title: string) => void
  updateVideoTitle: (videoId: string, title: string) => void
  
  // Save Management
  markCourseChanged: () => void
  markChapterChanged: (chapterId: string) => void
  markVideoChanged: (videoId: string) => void
  clearChanges: () => void
  setSaveStatus: (status: CourseEditUIState['saveStatus']) => void
  
  // Reset
  resetCourseEditUI: () => void
}
```

#### 2.2 Zustand Hook for Course Editing

```typescript
// ✅ NEW: Dedicated hook for course editing UI
export const useCourseEditUI = (courseId: string) => {
  const state = useAppStore(
    (s) => ({
      activeTab: s.activeTab,
      editingCourse: s.editingCourse,
      editingChapterId: s.editingChapterId,
      editingVideoId: s.editingVideoId,
      courseFormData: s.courseFormData,
      chapterEdits: s.chapterEdits,
      videoEdits: s.videoEdits,
      pendingChanges: s.pendingChanges,
      saveStatus: s.saveStatus,
    }),
    shallow
  )
  
  const actions = useAppStore(
    (s) => ({
      setActiveTab: s.setActiveTab,
      startEditingCourse: s.startEditingCourse,
      // ... all other actions
    })
  )
  
  // Computed values
  const hasAnyChanges = state.pendingChanges.course || 
    state.pendingChanges.chapters.length > 0 || 
    state.pendingChanges.videos.length > 0
    
  const totalChanges = 
    (state.pendingChanges.course ? 1 : 0) +
    state.pendingChanges.chapters.length +
    state.pendingChanges.videos.length
  
  return {
    ...state,
    ...actions,
    hasAnyChanges,
    totalChanges,
  }
}
```

### Phase 3: Mutation Architecture Redesign

**GOAL**: Clean, predictable mutations with proper optimistic updates

#### 3.1 Unified Course Mutations

```typescript
// ✅ NEW: Comprehensive course mutation hook
export function useCourseEditMutations(courseId: string) {
  const queryClient = useQueryClient()
  const courseEditUI = useCourseEditUI(courseId)
  
  // Course Data Mutation
  const updateCourse = useMutation({
    mutationFn: (updates: Partial<CourseEditData>) => 
      updateCourseAction(courseId, updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: COURSE_QUERIES.course(courseId) })
      const previous = queryClient.getQueryData(COURSE_QUERIES.course(courseId))
      
      queryClient.setQueryData(COURSE_QUERIES.course(courseId), (old: any) => ({
        ...old,
        ...updates
      }))
      
      return { previous }
    },
    onError: (err, updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(COURSE_QUERIES.course(courseId), context.previous)
      }
    },
    onSuccess: () => {
      courseEditUI.clearChanges()
      courseEditUI.setSaveStatus('saved')
      setTimeout(() => courseEditUI.setSaveStatus('idle'), 3000)
    }
  })
  
  // Batch Chapter Updates
  const batchUpdateChapters = useMutation({
    mutationFn: (updates: Array<{ id: string, title: string }>) =>
      batchUpdateChaptersAction(courseId, updates),
    // ... similar optimistic update pattern
  })
  
  // Batch Video Updates  
  const batchUpdateVideos = useMutation({
    mutationFn: (updates: Array<{ id: string, title: string }>) =>
      batchUpdateVideosAction(courseId, updates),
    // ... similar optimistic update pattern
  })
  
  // Smart Save Function - saves all pending changes
  const saveAllChanges = useCallback(async () => {
    courseEditUI.setSaveStatus('saving')
    
    try {
      // Save course changes
      if (courseEditUI.pendingChanges.course && courseEditUI.courseFormData) {
        await updateCourse.mutateAsync(courseEditUI.courseFormData)
      }
      
      // Save chapter changes
      if (courseEditUI.pendingChanges.chapters.length > 0) {
        const chapterUpdates = courseEditUI.pendingChanges.chapters.map(id => ({
          id,
          title: courseEditUI.chapterEdits[id]
        }))
        await batchUpdateChapters.mutateAsync(chapterUpdates)
      }
      
      // Save video changes
      if (courseEditUI.pendingChanges.videos.length > 0) {
        const videoUpdates = courseEditUI.pendingChanges.videos.map(id => ({
          id, 
          title: courseEditUI.videoEdits[id]
        }))
        await batchUpdateVideos.mutateAsync(videoUpdates)
      }
      
      courseEditUI.setSaveStatus('saved')
      toast.success('All changes saved successfully')
    } catch (error) {
      courseEditUI.setSaveStatus('error')
      toast.error('Failed to save changes')
    }
  }, [courseEditUI, updateCourse, batchUpdateChapters, batchUpdateVideos])
  
  return {
    updateCourse,
    batchUpdateChapters,
    batchUpdateVideos,
    saveAllChanges,
    isSaving: updateCourse.isPending || batchUpdateChapters.isPending || batchUpdateVideos.isPending
  }
}
```

### Phase 4: Component Refactoring

**GOAL**: Clean, stateless components that only consume TanStack Query + Zustand

#### 4.1 Refactored Edit Page

```typescript
// ✅ NEW: Clean, stateless component
export default function EditCoursePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const courseId = params.id
  
  // 📊 DATA: Single source of truth
  const { data: course, isLoading, error } = useCourseEdit(courseId)
  
  // 🎨 UI STATE: All from Zustand
  const courseEditUI = useCourseEditUI(courseId)
  
  // 🔄 MUTATIONS: Clean, predictable
  const mutations = useCourseEditMutations(courseId)
  
  // 🎯 EFFECTS: Only for initialization
  useEffect(() => {
    if (course && !courseEditUI.courseFormData) {
      courseEditUI.updateCourseForm({
        title: course.title,
        description: course.description,
        price: course.price,
        difficulty: course.difficulty,
      })
    }
  }, [course, courseEditUI])
  
  // 💾 SAVE: Simple, clean
  const handleSave = () => {
    if (courseEditUI.hasAnyChanges) {
      mutations.saveAllChanges()
    }
  }
  
  // 📝 INPUT CHANGES: Direct to Zustand
  const handleCourseChange = (field: string, value: any) => {
    courseEditUI.updateCourseForm({ [field]: value })
    courseEditUI.markCourseChanged()
  }
  
  if (isLoading) return <CourseEditSkeleton />
  if (error) return <CourseEditError error={error} />
  if (!course) return <CourseNotFound />
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* 📊 HEADER: Clean, predictable */}
      <CourseEditHeader
        course={course}
        hasChanges={courseEditUI.hasAnyChanges}
        saveStatus={courseEditUI.saveStatus}
        totalChanges={courseEditUI.totalChanges}
        onSave={handleSave}
        isSaving={mutations.isSaving}
      />
      
      {/* 📑 TABS: From Zustand */}
      <Tabs value={courseEditUI.activeTab} onValueChange={courseEditUI.setActiveTab}>
        <TabsList>
          <TabsTrigger value="course-info">Course Info</TabsTrigger>
          <TabsTrigger value="chapters-videos">Chapters & Videos</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="course-info">
          <CourseInfoEditor
            data={courseEditUI.courseFormData || course}
            onChange={handleCourseChange}
            isEditing={courseEditUI.editingCourse}
            onStartEdit={courseEditUI.startEditingCourse}
            onStopEdit={courseEditUI.stopEditingCourse}
          />
        </TabsContent>
        
        <TabsContent value="chapters-videos">
          <ChapterVideoManager
            chapters={course.chapters}
            courseId={courseId}
            editingChapterId={courseEditUI.editingChapterId}
            editingVideoId={courseEditUI.editingVideoId}
            chapterEdits={courseEditUI.chapterEdits}
            videoEdits={courseEditUI.videoEdits}
            onChapterEdit={courseEditUI.updateChapterTitle}
            onVideoEdit={courseEditUI.updateVideoTitle}
            // ... other handlers
          />
        </TabsContent>
        
        <TabsContent value="settings">
          <CourseSettings course={course} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## Implementation Order

### Step 1: Query Consolidation (Low Risk)
1. Create unified `useCourseEdit` query
2. Update existing components to use new query
3. Remove old separate queries
4. **Testing**: Verify no regressions in data loading

### Step 2: Zustand UI State (Medium Risk)  
1. Add course editing state to UI slice
2. Create `useCourseEditUI` hook
3. Gradually replace component state with Zustand
4. **Testing**: Verify edit states work correctly

### Step 3: Mutation Consolidation (High Risk)
1. Create unified mutations hook
2. Replace existing mutation logic
3. Test optimistic updates thoroughly
4. **Testing**: Verify all save operations work

### Step 4: Component Cleanup (Low Risk)
1. Remove all component state
2. Clean up effects and handlers
3. Simplify component logic
4. **Testing**: Full regression test

### Step 5: Performance Optimization (Low Risk)
1. Add proper React.memo where needed
2. Optimize selectors with shallow comparison
3. Add error boundaries
4. **Testing**: Performance testing

## Testing Strategy

### Unit Tests
- [ ] Query key consistency
- [ ] Zustand state updates
- [ ] Mutation optimistic updates
- [ ] Error rollback scenarios

### Integration Tests  
- [ ] Full save workflow
- [ ] Tab navigation with pending changes
- [ ] Upload progress tracking
- [ ] Keyboard navigation (Tab key)

### E2E Tests
- [ ] Complete course creation flow
- [ ] Edit existing course
- [ ] Handle network failures
- [ ] Concurrent editing scenarios

### Performance Tests
- [ ] Large course with many chapters/videos
- [ ] Rapid input changes
- [ ] Memory leak detection
- [ ] Bundle size impact

## Success Criteria

✅ **Single Source of Truth**: All server data comes from TanStack Query only  
✅ **Predictable UI State**: All UI state managed by Zustand only  
✅ **No Race Conditions**: Clean separation eliminates timing issues  
✅ **Optimistic Updates**: Immediate feedback with proper rollback  
✅ **Performance**: No unnecessary re-renders or network calls  
✅ **Developer Experience**: Clean, maintainable, debuggable code  
✅ **User Experience**: Fast, responsive, reliable editing experience

## Risk Mitigation

1. **Feature Flags**: Implement behind feature flag for safe rollout
2. **Gradual Migration**: Migrate one component at a time
3. **Rollback Plan**: Keep old code until fully validated  
4. **Monitoring**: Add detailed logging for debugging
5. **Backup Strategy**: Database backups before testing

## Code Examples - Before vs After

### Course Form State
```typescript
// ❌ BEFORE: Multiple sources of truth
const { data: course } = useCourse(courseId)
const [courseData, setCourseData] = useState<any>(null)
const [hasChanges, setHasChanges] = useState(false)
const form = useFormState()

const handleInputChange = (field: string, value: any) => {
  setCourseData({ ...courseData, [field]: value })
  form.setFormDirty()
  setHasChanges(true)
}

// ✅ AFTER: Single source pattern
const { data: course } = useCourseEdit(courseId)
const courseEditUI = useCourseEditUI(courseId)

const handleInputChange = (field: string, value: any) => {
  courseEditUI.updateCourseForm({ [field]: value })
  courseEditUI.markCourseChanged()
}
```

### Save Logic
```typescript
// ❌ BEFORE: Complex manual orchestration
const handleSave = async () => {
  setSaveStatus('saving')
  try {
    if (hasPendingVideoChanges && videoSaveFunction) {
      await videoSaveFunction()
    }
    if (hasPendingChapterChanges && chapterSaveFunction) {
      await chapterSaveFunction()
    }
    if (hasChanges && courseData) {
      await saveDraft.mutateAsync({ courseId, data: courseData })
    }
    setSaveStatus('saved')
  } catch (error) {
    setSaveStatus('error')
  }
}

// ✅ AFTER: Clean, simple
const handleSave = () => {
  if (courseEditUI.hasAnyChanges) {
    mutations.saveAllChanges()
  }
}
```

This comprehensive migration plan eliminates all current architectural issues while maintaining feature parity and improving developer experience. The phased approach ensures safe implementation with minimal risk.
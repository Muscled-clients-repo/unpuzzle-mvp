# Comprehensive State Management Audit & Migration Plan

## Executive Summary

Our current course editing system suffers from **Multiple Sources of Truth (MSOT)** causing race conditions, state synchronization issues, and unpredictable behavior. This document provides a comprehensive audit and migration plan to establish **TanStack Query as Single Source of Truth (SSOT)** for server data and **Zustand for UI state**.

---

## Current State Analysis

### 1. **Original Edit Route** (`/instructor/course/[id]/edit/page.tsx`)

**Current State Management:**
```typescript
// ❌ PROBLEM: Multiple overlapping state systems
const { data: course } = useCourse(courseId)           // TanStack Query
const { data: chapters } = useChapters(courseId)       // TanStack Query
const [courseData, setCourseData] = useState(null)     // Component State
const [hasChanges, setHasChanges] = useState(false)    // Component State
const form = useFormState()                            // Zustand Form State
```

**Problems Identified:**
- **Race Condition #1**: `courseData` competes with TanStack `course` data
- **Race Condition #2**: Form state fights with both `courseData` and TanStack cache  
- **Race Condition #3**: Manual `setHasChanges` conflicts with form dirty detection
- **SSOT Violation**: Course title exists in 3 places simultaneously
- **Complex Save Logic**: `handleSave` tries to orchestrate 3 different systems

### 2. **POC Edit Route** (`/instructor/course/[id]/edit-v2/page.tsx`)

**Current State Management:**
```typescript
// ❌ PROBLEM: Added MORE state layers instead of consolidating
const { data: course } = useCourse(courseId)
const { data: chapters } = useChapters(courseId)
const [hasChanges, setHasChanges] = useState(false)          // Course changes
const [hasPendingVideoChanges, setHasPendingVideoChanges] = useState(false)    // Video changes
const [hasPendingChapterChanges, setHasPendingChapterChanges] = useState(false) // Chapter changes
const [courseData, setCourseData] = useState<any>(null)      // Local course data
```

**Problems Identified:**
- **Multiplied State Complexity**: Now tracking 3 different pending change types
- **Save Button Logic Explosion**: Complex boolean algebra to determine button state
- **Still MSOT**: `courseData` still competes with TanStack cache

### 3. **ChapterManagerPOC Component**

**Current State Management:**
```typescript
// ❌ PROBLEM: Component-level state for server data
const [editingChapter, setEditingChapter] = useState<string | null>(null)
const [chapterTitle, setChapterTitle] = useState("")
const [pendingChapterChanges, setPendingChapterChanges] = useState<Record<string, string>>({})
```

**Problems Identified:**
- **UI State Mixed with Data**: `chapterTitle` is both UI state AND server data
- **Manual Change Tracking**: `pendingChapterChanges` duplicates what TanStack Query should handle
- **Complex Display Logic**: `getChapterDisplayName` has 3 fallback layers

### 4. **VideoList Component**

**Current State Management:**
```typescript
// ❌ PROBLEM: Same pattern replicated
const [editingVideo, setEditingVideo] = useState<string | null>(null)
const [videoName, setVideoName] = useState("")
const [pendingVideoChanges, setPendingVideoChanges] = useState<Record<string, string>>({})
```

**Problems Identified:**
- **Duplicated Pattern**: Same problems as ChapterManagerPOC
- **Batch Change Complexity**: Manual aggregation of changes for save button

---

## Migration Plan

### Phase 1: TanStack Query Foundation (Server Data SSOT)

#### 1.1 Course Data Migration

**BEFORE (Multiple Sources):**
```typescript
// ❌ Data exists in 3 places
const { data: course } = useCourse(courseId)           // Source 1
const [courseData, setCourseData] = useState(null)     // Source 2  
const form = useFormState()                            // Source 3 (has course fields)
```

**AFTER (Single Source):**
```typescript
// ✅ Single source with optimistic updates
const { data: course, updateCourse } = useCourseEdit(courseId)

// Custom hook handles optimistic updates internally
function useCourseEdit(courseId: string) {
  const queryClient = useQueryClient()
  
  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getCourse(courseId)
  })
  
  const updateMutation = useMutation({
    mutationFn: updateCourseAction,
    onMutate: async (updates) => {
      // Optimistic update to cache
      await queryClient.cancelQueries({ queryKey: ['course', courseId] })
      const previousData = queryClient.getQueryData(['course', courseId])
      
      queryClient.setQueryData(['course', courseId], (old: any) => ({
        ...old,
        ...updates
      }))
      
      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['course', courseId], context?.previousData)
    }
  })
  
  return {
    ...courseQuery,
    updateCourse: updateMutation.mutate
  }
}
```

#### 1.2 Chapter Data Migration

**BEFORE (Virtual + Component State):**
```typescript
const { data: chapters } = useChapters(courseId)
const [pendingChapterChanges, setPendingChapterChanges] = useState({})
```

**AFTER (Pure TanStack Query):**
```typescript
const { data: chapters, updateChapter, reorderChapters } = useChaptersEdit(courseId)

// Chapters hook handles all optimistic updates
function useChaptersEdit(courseId: string) {
  // Similar pattern but for chapters
  const updateChapterMutation = useMutation({
    mutationFn: updateChapterAction,
    onMutate: async ({ chapterId, updates }) => {
      // Update both course and chapters cache optimistically
      queryClient.setQueryData(['chapters', courseId], (old: Chapter[]) =>
        old.map(c => c.id === chapterId ? { ...c, ...updates } : c)
      )
    }
  })
  
  return {
    data: chapters,
    updateChapter: updateChapterMutation.mutate,
    isUpdating: updateChapterMutation.isPending
  }
}
```

#### 1.3 Video Data Migration

**BEFORE (Mixed State):**
```typescript
const [pendingVideoChanges, setPendingVideoChanges] = useState({})
const [videoSaveFunction, setVideoSaveFunction] = useState(null)
```

**AFTER (Pure TanStack Query):**
```typescript
const { updateVideo, batchUpdateVideos } = useVideosEdit(courseId)

// Videos handle their own optimistic updates
function useVideosEdit(courseId: string) {
  const batchUpdateMutation = useMutation({
    mutationFn: batchUpdateVideosAction,
    onMutate: async (updates) => {
      // Update all relevant cache keys optimistically
      queryClient.setQueryData(['videos', courseId], (old: Video[]) =>
        old.map(video => {
          const update = updates.find(u => u.id === video.id)
          return update ? { ...video, ...update } : video
        })
      )
    }
  })
  
  return {
    batchUpdateVideos: batchUpdateMutation.mutate,
    isPending: batchUpdateMutation.isPending
  }
}
```

### Phase 2: Zustand UI State Layer

#### 2.1 Course Edit UI State

**BEFORE (Component State):**
```typescript
const [activeTab, setActiveTab] = useState("course-info")
const [hasChanges, setHasChanges] = useState(false)
const [editingChapter, setEditingChapter] = useState(null)
```

**AFTER (Zustand Store):**
```typescript
// stores/course-edit-ui.ts
interface CourseEditUIState {
  activeTab: string
  setActiveTab: (tab: string) => void
  
  editing: {
    type: 'course' | 'chapter' | 'video' | null
    id: string | null
  }
  startEdit: (type: string, id: string) => void
  stopEdit: () => void
  
  modals: {
    videoPreview: boolean
    deleteConfirmation: boolean
    settings: boolean
  }
  openModal: (modal: keyof CourseEditUIState['modals']) => void
  closeModal: (modal: keyof CourseEditUIState['modals']) => void
  
  formData: {
    [key: string]: any // Temporary form data before save
  }
  updateFormField: (field: string, value: any) => void
  clearForm: () => void
}

export const useCourseEditUI = create<CourseEditUIState>((set, get) => ({
  activeTab: 'course-info',
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  editing: { type: null, id: null },
  startEdit: (type, id) => set({ editing: { type, id } }),
  stopEdit: () => set({ editing: { type: null, id: null } }),
  
  modals: {
    videoPreview: false,
    deleteConfirmation: false,  
    settings: false
  },
  openModal: (modal) => set(state => ({ 
    modals: { ...state.modals, [modal]: true } 
  })),
  closeModal: (modal) => set(state => ({ 
    modals: { ...state.modals, [modal]: false } 
  })),
  
  formData: {},
  updateFormField: (field, value) => set(state => ({
    formData: { ...state.formData, [field]: value }
  })),
  clearForm: () => set({ formData: {} })
}))
```

#### 2.2 Upload Progress State

**BEFORE (Component State):**
```typescript
const uploadProgress = useUploadProgress() // Hook with component state
```

**AFTER (Zustand Store):**
```typescript
// stores/upload-progress.ts
interface UploadProgressState {
  uploads: Record<string, {
    filename: string
    progress: number
    status: 'uploading' | 'processing' | 'complete' | 'error'
    chapterId?: string
  }>
  
  startUpload: (id: string, filename: string, chapterId?: string) => void
  updateProgress: (id: string, progress: number) => void
  setStatus: (id: string, status: UploadProgressState['uploads'][string]['status']) => void
  removeUpload: (id: string) => void
  clearCompleted: () => void
}

export const useUploadProgress = create<UploadProgressState>((set, get) => ({
  uploads: {},
  
  startUpload: (id, filename, chapterId) => set(state => ({
    uploads: {
      ...state.uploads,
      [id]: { filename, progress: 0, status: 'uploading', chapterId }
    }
  })),
  
  updateProgress: (id, progress) => set(state => ({
    uploads: {
      ...state.uploads,
      [id]: state.uploads[id] ? { ...state.uploads[id], progress } : state.uploads[id]
    }
  })),
  
  // ... other methods
}))
```

### Phase 3: Component Refactoring

#### 3.1 Course Edit Page Transformation

**BEFORE (Complex State Orchestration):**
```typescript
export default function CourseEditPage({ params }: { params: { id: string } }) {
  const courseId = params.id
  
  // ❌ Multiple state systems
  const { data: course } = useCourse(courseId)
  const { data: chapters } = useChapters(courseId)
  const [courseData, setCourseData] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [hasPendingVideoChanges, setHasPendingVideoChanges] = useState(false)
  const [hasPendingChapterChanges, setHasPendingChapterChanges] = useState(false)
  
  // ❌ Complex save logic
  const handleSave = async () => {
    if (hasPendingVideoChanges && videoSaveFunction) {
      await videoSaveFunction()
    }
    if (hasPendingChapterChanges && chapterSaveFunction) {
      await chapterSaveFunction()
    }
    if (hasChanges && courseData) {
      await saveDraft.mutateAsync({ courseId, data: courseData })
    }
  }
  
  // ❌ Complex button state
  const saveDisabled = (!hasChanges && !hasPendingVideoChanges && !hasPendingChapterChanges)
  
  return (
    <div>
      <Button disabled={saveDisabled} onClick={handleSave}>
        {/* Complex text logic */}
      </Button>
    </div>
  )
}
```

**AFTER (Clean Separation):**
```typescript
export default function CourseEditPage({ params }: { params: { id: string } }) {
  const courseId = params.id
  
  // ✅ Single sources of truth
  const course = useCourseEdit(courseId)
  const chapters = useChaptersEdit(courseId)
  const videos = useVideosEdit(courseId)
  const ui = useCourseEditUI()
  
  // ✅ Simple save logic
  const handleSave = () => {
    // Each mutation handles its own optimistic updates
    if (ui.formData.title !== course.data?.title) {
      course.updateCourse({ title: ui.formData.title })
    }
    // Clear UI state after mutations
    ui.clearForm()
  }
  
  // ✅ Simple button state
  const hasChanges = Object.keys(ui.formData).length > 0 || 
                    course.isPending || chapters.isPending || videos.isPending
  
  return (
    <div>
      <Button disabled={!hasChanges} onClick={handleSave}>
        {course.isPending || chapters.isPending || videos.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  )
}
```

#### 3.2 Chapter Manager Transformation

**BEFORE (Mixed State):**
```typescript
export function ChapterManagerPOC({ chapters, ... }) {
  // ❌ Component state mixing UI and data
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [chapterTitle, setChapterTitle] = useState("")
  const [pendingChapterChanges, setPendingChapterChanges] = useState({})
  
  // ❌ Complex display logic
  const getChapterDisplayName = (chapter) => {
    if (editingChapter === chapter.id && chapterTitle) return chapterTitle
    if (pendingChapterChanges[chapter.id]) return pendingChapterChanges[chapter.id]
    return chapter.title || 'Untitled Chapter'
  }
  
  return (
    <div>
      {chapters.map(chapter => (
        <div key={chapter.id}>
          <input 
            value={editingChapter === chapter.id ? chapterTitle : getChapterDisplayName(chapter)}
            onChange={(e) => {
              setChapterTitle(e.target.value)
              trackPendingChapterChange(chapter.id, e.target.value)
            }}
          />
        </div>
      ))}
    </div>
  )
}
```

**AFTER (Clean Separation):**
```typescript
export function ChapterManager({ courseId }: { courseId: string }) {
  // ✅ Clean separation
  const { data: chapters, updateChapter } = useChaptersEdit(courseId)
  const ui = useCourseEditUI()
  
  const isEditing = (chapterId: string) => 
    ui.editing.type === 'chapter' && ui.editing.id === chapterId
  
  const getDisplayValue = (chapter: Chapter) => 
    isEditing(chapter.id) ? (ui.formData[`chapter-${chapter.id}`] || chapter.title) : chapter.title
  
  return (
    <div>
      {chapters?.map(chapter => (
        <div key={chapter.id}>
          {isEditing(chapter.id) ? (
            <input
              value={ui.formData[`chapter-${chapter.id}`] || chapter.title}
              onChange={(e) => ui.updateFormField(`chapter-${chapter.id}`, e.target.value)}
              onBlur={() => {
                const newTitle = ui.formData[`chapter-${chapter.id}`]
                if (newTitle && newTitle !== chapter.title) {
                  updateChapter({ chapterId: chapter.id, title: newTitle })
                }
                ui.stopEdit()
              }}
            />
          ) : (
            <span onClick={() => {
              ui.startEdit('chapter', chapter.id)
              ui.updateFormField(`chapter-${chapter.id}`, chapter.title)
            }}>
              {chapter.title}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## Implementation Order

### Step 1: Create Zustand Stores (Low Risk)
1. **Create UI state stores** (`useCourseEditUI`, `useUploadProgress`)
2. **Test stores in isolation** with simple components
3. **No breaking changes** to existing functionality

### Step 2: Enhance TanStack Query Hooks (Medium Risk)
1. **Create enhanced hooks** (`useCourseEdit`, `useChaptersEdit`, `useVideosEdit`)
2. **Add optimistic updates** to all mutations
3. **Test new hooks alongside** existing ones

### Step 3: Migrate Components One by One (High Risk)
1. **Start with simplest component** (probably VideoUploader)
2. **Migrate to new hooks and stores**
3. **Test thoroughly before next component**
4. **Keep old code commented** until all tests pass

### Step 4: Remove Old State Systems (Cleanup)
1. **Remove component useState** calls
2. **Remove manual change tracking**
3. **Simplify save logic**
4. **Clean up unused props**

---

## Testing Strategy

### Unit Tests
```typescript
// Test TanStack Query hooks
describe('useCourseEdit', () => {
  it('should optimistically update course title', async () => {
    const { result } = renderHook(() => useCourseEdit('course-1'))
    
    act(() => {
      result.current.updateCourse({ title: 'New Title' })
    })
    
    // Should immediately show new title (optimistic)
    expect(result.current.data?.title).toBe('New Title')
  })
  
  it('should rollback on server error', async () => {
    // Mock server error
    server.use(
      rest.put('/api/courses/:id', (req, res, ctx) => {
        return res(ctx.status(500))
      })
    )
    
    const { result } = renderHook(() => useCourseEdit('course-1'))
    
    act(() => {
      result.current.updateCourse({ title: 'New Title' })
    })
    
    // Should rollback to original title
    await waitFor(() => {
      expect(result.current.data?.title).toBe('Original Title')
    })
  })
})

// Test Zustand stores
describe('useCourseEditUI', () => {
  it('should track editing state correctly', () => {
    const { result } = renderHook(() => useCourseEditUI())
    
    act(() => {
      result.current.startEdit('chapter', 'chapter-1')
    })
    
    expect(result.current.editing).toEqual({
      type: 'chapter',
      id: 'chapter-1'
    })
  })
})
```

### Integration Tests
```typescript
describe('Course Edit Page', () => {
  it('should save course changes optimistically', async () => {
    render(<CourseEditPage params={{ id: 'course-1' }} />)
    
    // Type new title
    const titleInput = screen.getByLabelText(/course title/i)
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)
    
    // Should immediately show updated title (optimistic)
    expect(titleInput).toHaveValue('Updated Title')
    
    // Should show saving state
    expect(saveButton).toHaveTextContent('Saving...')
    
    // Should return to normal state after save
    await waitFor(() => {
      expect(saveButton).toHaveTextContent('Save Changes')
    })
  })
})
```

### E2E Tests
```typescript
describe('Course Editing Flow', () => {
  it('should handle complete edit workflow', async () => {
    // Navigate to course edit
    await page.goto('/instructor/course/123/edit')
    
    // Edit course title
    await page.fill('[data-testid="course-title"]', 'New Course Title')
    
    // Edit chapter name
    await page.click('[data-testid="chapter-1-edit"]')
    await page.fill('[data-testid="chapter-1-input"]', 'New Chapter Name')
    await page.press('[data-testid="chapter-1-input"]', 'Enter')
    
    // Upload video
    await page.setInputFiles('[data-testid="video-upload"]', 'test-video.mp4')
    
    // Wait for upload progress
    await page.waitForSelector('[data-testid="upload-progress"]')
    await page.waitForSelector('[data-testid="upload-complete"]')
    
    // Save all changes
    await page.click('[data-testid="save-button"]')
    
    // Verify success
    await page.waitForSelector('[data-testid="save-success"]')
    
    // Refresh and verify persistence
    await page.reload()
    expect(await page.textContent('[data-testid="course-title"]')).toBe('New Course Title')
    expect(await page.textContent('[data-testid="chapter-1-name"]')).toBe('New Chapter Name')
  })
})
```

---

## Risk Mitigation

### Rollback Strategy
1. **Keep old code commented** until migration complete
2. **Feature flags** to switch between old/new systems
3. **Database backups** before any data structure changes
4. **Gradual rollout** starting with test accounts

### Performance Monitoring
1. **Monitor TanStack Query cache size** - ensure no memory leaks
2. **Track re-render counts** - ensure Zustand selectors are efficient
3. **Measure optimistic update speed** - should feel instant
4. **Monitor error rates** - catch rollback issues early

### Success Criteria
1. **No race conditions** - consistent state across components
2. **Instant UI feedback** - optimistic updates feel immediate
3. **Proper error handling** - failed operations rollback correctly
4. **Simplified codebase** - less state management boilerplate
5. **Better performance** - fewer unnecessary re-renders

---

## Expected Outcomes

### Developer Experience Improvements
- **Easier debugging**: Clear source of truth for each piece of state
- **Simpler testing**: Pure functions, predictable state changes
- **Less boilerplate**: No manual change tracking or save orchestration
- **Better TypeScript**: Proper typing for all state

### User Experience Improvements  
- **Faster feedback**: Optimistic updates feel instant
- **More reliable**: No race conditions or inconsistent state
- **Better error handling**: Clear feedback when operations fail
- **Smoother interactions**: No UI jank from competing state systems

### System Performance Improvements
- **Fewer re-renders**: Proper Zustand selectors prevent cascading updates
- **Better caching**: Single TanStack Query cache, no duplication
- **Smaller bundle**: Less state management code
- **Faster operations**: No complex save orchestration

This migration transforms the course editing system from a fragile, hard-to-maintain architecture to a robust, scalable solution that follows modern React best practices.
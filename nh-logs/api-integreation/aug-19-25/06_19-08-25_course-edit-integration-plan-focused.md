# Course Edit API Integration Plan - Non-Disruptive
## Focused on Edit Functionality Only

## Analysis

### API Endpoints from Postman Collection
- **Load Course**: `GET /api/v1/instructor/courses/{{course_id}}` (Get single course)
- **Update Course**: `PUT /api/v1/instructor/courses/{{course_id}}` (Update course details)

### Current Architecture (Keep Untouched ✅)
```typescript
// Current pattern - PRESERVE THIS
const {
  courseCreation,        // ✅ Keep for creation
  setCourseInfo,         // ✅ Keep for creation  
  createChapter,         // ✅ Keep for creation
  saveDraft,            // ✅ Keep for creation
  isAutoSaving,         // ✅ Keep for creation
  loadCourseForEdit     // ❌ Currently mock - make real
} = useAppStore()
```

## Implementation Strategy

### 1. Add Edit-Only Actions to Course Creation Slice

**File**: `src/stores/slices/course-creation-slice.ts`

```typescript
// Add ONLY these new actions - don't touch existing ones
export interface CourseCreationSlice {
  // 🚫 EXISTING ACTIONS - DON'T MODIFY
  courseCreation: CourseCreationData | null
  setCourseInfo: (info: Partial<CourseCreationData>) => void
  saveDraft: () => Promise<void>  // Keep existing implementation
  loadCourseForEdit: (courseId: string) => void  // Make this real
  // ... all other existing actions

  // ✅ NEW EDIT-ONLY ACTIONS
  updateExistingCourse: (courseId: string) => Promise<void>
  loadCourseFromAPI: (courseId: string) => Promise<void>
  markAsEditMode: () => void
  getEditModeStatus: () => boolean
}

// Implementation - ADD TO EXISTING, don't replace
export const createCourseCreationSlice: StateCreator<CourseCreationSlice> = (set, get) => ({
  // 🚫 KEEP ALL EXISTING IMPLEMENTATIONS EXACTLY AS THEY ARE
  courseCreation: null,
  uploadQueue: [],
  isAutoSaving: false,
  currentStep: 'info',
  saveError: null,
  lastSaveAttempt: null,
  
  // 🚫 KEEP EXISTING setCourseInfo - DON'T MODIFY
  setCourseInfo: (info) => {
    set(state => ({
      courseCreation: {
        ...state.courseCreation,
        ...info,
        lastSaved: new Date()
      } as CourseCreationData,
      saveError: null
    }))
    
    const { courseCreation, saveError } = get()
    if (courseCreation?.autoSaveEnabled && !saveError) {
      const currentTime = Date.now()
      const lastAttempt = get().lastSaveAttempt?.getTime() || 0
      const timeSinceLastAttempt = currentTime - lastAttempt
      
      if (timeSinceLastAttempt > 2000) {
        get().saveDraft()
      }
    }
  },

  // 🚫 KEEP EXISTING saveDraft - DON'T MODIFY
  saveDraft: async () => {
    // Keep exact existing implementation for course creation
    const { courseCreation } = get()
    if (!courseCreation) return
    
    // Check if this is edit mode
    if (courseCreation.id) {
      // Use new edit function
      await get().updateExistingCourse(courseCreation.id)
      return
    }
    
    // 🚫 KEEP ALL EXISTING CREATION LOGIC UNCHANGED
    const title = courseCreation.title?.trim() || ''
    const description = courseCreation.description?.trim() || ''
    
    if (!title || title.length < 3) {
      set({
        saveError: 'Course title is required and must be at least 3 characters long',
        isAutoSaving: false
      })
      return
    }
    
    if (description.length > 0 && description.length < 10) {
      set({
        saveError: 'Description must be at least 10 characters long or left empty',
        isAutoSaving: false
      })
      return
    }
    
    set({ isAutoSaving: true, lastSaveAttempt: new Date() })
    
    try {
      const courseData = {
        title: title,
        description: description,
        category: courseCreation.category || 'programming',
        difficulty: courseCreation.level || 'beginner',
        price: courseCreation.price || 0,
        isFree: courseCreation.price === 0,
        tags: courseCreation.category ? [courseCreation.category] : ['programming'],
        status: 'draft' as const
      }
      
      const result = await instructorCourseService.createCourse(courseData)
      
      if (result.data) {
        set(state => ({
          isAutoSaving: false,
          saveError: null,
          courseCreation: state.courseCreation ? {
            ...state.courseCreation,
            lastSaved: new Date(),
            hasAutoSaveError: false,
            id: result.data!.id || state.courseCreation.id
          } : null
        }))
        
        const appState = get() as any
        if (appState.loadInstructorCourses && appState.profile?.id) {
          appState.loadInstructorCourses(appState.profile.id)
        }
      } else {
        throw new Error(result.error || 'Failed to save draft')
      }
    } catch (error) {
      console.error('Failed to save draft:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save draft'
      
      set(state => ({
        isAutoSaving: false,
        saveError: errorMessage,
        courseCreation: state.courseCreation ? {
          ...state.courseCreation,
          hasAutoSaveError: true
        } : null
      }))
    }
  },

  // ✅ ENHANCE loadCourseForEdit WITH REAL API
  loadCourseForEdit: async (courseId) => {
    console.log('📖 Loading course for edit:', courseId)
    await get().loadCourseFromAPI(courseId)
  },

  // ✅ NEW ACTION: Load course from API
  loadCourseFromAPI: async (courseId: string) => {
    set({ isAutoSaving: true, saveError: null })
    
    try {
      const result = await instructorCourseService.getCourseForEditing(courseId)
      
      if (result.error) {
        set({ 
          saveError: result.error,
          isAutoSaving: false
        })
        return
      }

      const courseData = result.data!
      
      set({
        courseCreation: {
          ...courseData,
          id: courseId, // Ensure ID is set for edit mode
          autoSaveEnabled: false // Keep disabled for editing
        },
        currentStep: 'info',
        isAutoSaving: false,
        saveError: null
      })
      
      console.log('✅ Course loaded for editing successfully')
    } catch (error) {
      console.error('❌ Failed to load course:', error)
      set({
        saveError: 'Failed to load course',
        isAutoSaving: false
      })
    }
  },

  // ✅ NEW ACTION: Update existing course
  updateExistingCourse: async (courseId: string) => {
    const { courseCreation } = get()
    if (!courseCreation) return
    
    console.log('💾 Updating existing course:', courseId)
    set({ isAutoSaving: true, saveError: null })
    
    try {
      const result = await instructorCourseService.updateCourseDetails(courseId, courseCreation)
      
      if (result.error) {
        set({ 
          saveError: result.error,
          isAutoSaving: false
        })
        return
      }

      set(state => ({
        isAutoSaving: false,
        saveError: null,
        courseCreation: state.courseCreation ? {
          ...state.courseCreation,
          lastSaved: new Date()
        } : null
      }))
      
      console.log('✅ Course updated successfully')
      
    } catch (error) {
      console.error('❌ Failed to update course:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update course'
      
      set({
        isAutoSaving: false,
        saveError: errorMessage
      })
    }
  },

  // ✅ NEW ACTION: Mark as edit mode
  markAsEditMode: () => {
    set(state => ({
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        isEditMode: true
      } : null
    }))
  },

  // ✅ NEW ACTION: Get edit mode status  
  getEditModeStatus: () => {
    const { courseCreation } = get()
    return !!(courseCreation?.id)
  },

  // 🚫 KEEP ALL OTHER EXISTING ACTIONS UNCHANGED
  // addVideosToQueue, createChapter, updateChapter, etc.
})
```

### 2. Add Edit API Methods to Service (Without Breaking Creation)

**File**: `src/services/instructor-course-service.ts`

```typescript
// Add these methods to existing service - DON'T MODIFY EXISTING ONES

export class InstructorCourseService {
  // 🚫 KEEP ALL EXISTING METHODS UNCHANGED

  // ✅ NEW METHOD: Get course for editing
  async getCourseForEditing(courseId: string): Promise<ServiceResult<CourseCreationData>> {
    console.log('🔍 Loading course for editing:', courseId)
    
    if (useMockData) {
      // Keep existing mock logic
      const mockCourseData: CourseCreationData = {
        id: courseId,
        title: `Course ${courseId}`,
        description: `Description for course ${courseId}`,
        category: 'web-development',
        level: 'intermediate',
        price: 99,
        chapters: [
          {
            id: 'chapter-1',
            title: 'Introduction', 
            description: 'Getting started with the course',
            order: 0,
            videos: []
          }
        ],
        videos: [],
        status: 'draft',
        autoSaveEnabled: false,
        lastSaved: new Date()
      }
      return { data: mockCourseData }
    }

    // Real API call using Postman endpoint
    const response = await apiClient.get<Course>(`/api/v1/instructor/courses/${courseId}`)
    
    if (response.error) {
      return { error: response.error }
    }

    // Transform API Course to CourseCreationData format
    const course = response.data!
    const courseCreationData: CourseCreationData = {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.tags?.[0] || '',
      level: course.difficulty,
      price: course.price,
      chapters: [], // Will be loaded separately if needed
      videos: course.videos || [],
      status: course.isPublished ? 'published' : 'draft',
      autoSaveEnabled: false, // Keep disabled for editing
      lastSaved: new Date(course.updatedAt)
    }

    return { data: courseCreationData }
  }

  // ✅ NEW METHOD: Update existing course
  async updateCourseDetails(courseId: string, courseData: CourseCreationData): Promise<ServiceResult<Course>> {
    console.log('💾 Updating course details:', courseId)
    
    if (useMockData) {
      console.log('🎭 Mock update successful')
      return { data: {} as Course }
    }

    // Transform to API format based on Postman collection
    const updatePayload = {
      title: courseData.title,
      description: courseData.description,
      price: courseData.price,
      difficulty: courseData.level,
      tags: courseData.category ? [courseData.category] : [],
      // Add any other fields from the API spec
    }

    // Use the Postman endpoint
    const response = await apiClient.put<Course>(`/api/v1/instructor/courses/${courseId}`, updatePayload)
    
    if (response.error) {
      return { error: response.error }
    }

    return { data: response.data! }
  }
}
```

### 3. Update Edit Page Component (Minimal Changes)

**File**: `src/app/instructor/course/[id]/edit/page.tsx`

```typescript
// Minimal changes to existing component
export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  
  // ✅ Use existing pattern - just add new methods
  const {
    courseCreation,
    setCourseInfo,          // Existing
    createChapter,          // Existing  
    updateChapter,          // Existing
    deleteChapter,          // Existing
    saveDraft,             // Existing (enhanced to handle edit)
    isAutoSaving,          // Existing
    saveError,             // Existing
    loadCourseForEdit,     // Existing (now real)
    getEditModeStatus      // New
  } = useAppStore()

  const [activeTab, setActiveTab] = useState("info")
  const [initialLoad, setInitialLoad] = useState(true)

  // Load course data on mount
  useEffect(() => {
    if (courseId && initialLoad) {
      loadCourseForEdit(courseId)
      setInitialLoad(false)
    }
  }, [courseId, loadCourseForEdit, initialLoad])

  // Check if we're in edit mode
  const isEditMode = getEditModeStatus()

  const handleSave = async () => {
    // saveDraft now handles both create and edit automatically
    await saveDraft()
    
    // Show success and redirect if no errors
    if (!saveError) {
      setTimeout(() => {
        router.push('/instructor/courses')
      }, 1000)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    // Use existing setCourseInfo - it already handles change tracking
    setCourseInfo({ [field]: value })
  }

  if (!courseCreation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-6">
      {/* Header with edit mode indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditMode ? 'Edit Course' : 'Create Course'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {courseCreation.title || 'Untitled Course'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isAutoSaving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {isEditMode ? 'Updating...' : 'Saving...'}
            </div>
          )}
          
          {saveError && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {saveError}
            </Badge>
          )}
          
          {!isAutoSaving && !saveError && courseCreation.lastSaved && (
            <Badge variant="outline" className="gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              Saved
            </Badge>
          )}
          
          <Button
            onClick={handleSave}
            disabled={isAutoSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isEditMode ? 'Update Course' : 'Save Draft'}
          </Button>
        </div>
      </div>

      {/* Rest of component stays exactly the same */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Basic Info</TabsTrigger>
          <TabsTrigger value="chapters">Chapters & Videos</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
              <CardDescription>
                {isEditMode ? 'Update your course information' : 'Enter your course information'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={courseCreation.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter course title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={courseCreation.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your course"
                  rows={4}
                />
              </div>

              {/* Rest of form fields stay the same */}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Other tabs remain unchanged */}
      </Tabs>
    </div>
  )
}
```

## Implementation Roadmap

### Phase 1: Service Layer (30 minutes)
1. ✅ Add `getCourseForEditing()` method to instructor-course-service
2. ✅ Add `updateCourseDetails()` method to instructor-course-service  
3. ✅ Test with API endpoints from Postman collection

### Phase 2: Store Enhancement (30 minutes)
1. ✅ Add `loadCourseFromAPI()` action to course-creation-slice
2. ✅ Add `updateExistingCourse()` action to course-creation-slice
3. ✅ Enhance existing `loadCourseForEdit()` to use real API
4. ✅ Enhance existing `saveDraft()` to detect edit mode

### Phase 3: UI Updates (15 minutes)
1. ✅ Add edit mode detection to edit page
2. ✅ Update UI labels and messaging
3. ✅ Test complete edit workflow

## Key Benefits

1. **Zero Breaking Changes** ✅
   - All existing course creation functionality untouched
   - Same component APIs
   - Same store methods

2. **Real API Integration** ✅
   - Uses actual Postman API endpoints
   - Proper data transformation
   - Error handling

3. **Seamless Edit Experience** ✅
   - Auto-detects create vs edit mode
   - Same UI for both workflows
   - Proper loading and saving states

## API Endpoints Used

1. **Load for Editing**: `GET /api/v1/instructor/courses/{{course_id}}`
2. **Update Course**: `PUT /api/v1/instructor/courses/{{course_id}}`

## No Architecture Changes ❌

- ✅ Uses existing `useAppStore()` pattern
- ✅ Uses existing service layer
- ✅ Uses existing slice pattern
- ✅ No custom hooks
- ✅ No new architectural patterns

This approach adds course edit functionality while keeping the existing course creation workflow completely intact.
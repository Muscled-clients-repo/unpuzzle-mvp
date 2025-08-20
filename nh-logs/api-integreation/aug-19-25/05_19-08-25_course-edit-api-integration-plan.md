# Course Edit Page API Integration Plan
## Following Existing Architecture

## Current Architecture Analysis

### Existing Pattern ✅
```typescript
// Current pattern - KEEP THIS
const {
  courseCreation,
  setCourseInfo,
  createChapter,
  updateChapter,
  deleteChapter,
  saveDraft,
  isAutoSaving,
  loadCourseForEdit
} = useAppStore()
```

### Current Issues to Fix
1. **`loadCourseForEdit` uses mock data** - Need real API integration
2. **`saveDraft` uses course creation API** - Need course update API 
3. **No optimistic updates** - All changes need server round-trip
4. **Manual change tracking** - Local `hasChanges` state

## API Integration Strategy (Following Existing Patterns)

### 1. Enhance Existing Course Creation Slice

**File**: `src/stores/slices/course-creation-slice.ts`

```typescript
// Add to existing interface - don't replace
export interface CourseCreationData {
  // Existing fields...
  id?: string // Add for editing mode
  
  // Add edit-specific fields
  originalData?: CourseCreationData // For revert functionality
  isDirty?: boolean // Track if changes made
  lastServerSync?: Date // Track when last synced with server
}

// Enhance existing actions - don't replace
export interface CourseCreationSlice {
  // Existing actions...
  
  // Enhanced load for editing
  loadCourseForEdit: (courseId: string) => Promise<void>
  
  // New update action for editing
  updateCourse: (courseId: string, updates: Partial<CourseCreationData>) => Promise<void>
  
  // Enhanced save that works for both create and edit
  saveDraft: () => Promise<void>
  
  // Revert changes
  revertToOriginal: () => void
}
```

### 2. Integrate Real API Calls in Existing Service

**File**: `src/services/instructor-course-service.ts`

```typescript
// Add to existing service class
export class InstructorCourseService {
  // Existing methods...
  
  // Load course for editing
  async getCourseForEditing(courseId: string): Promise<ServiceResult<CourseCreationData>> {
    console.log('🔍 Loading course for editing:', courseId)
    
    if (useMockData) {
      // Keep existing mock logic for development
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

    // Real API call
    const response = await apiClient.get<Course>(`/api/v1/instructor/courses/${courseId}`)
    
    if (response.error) {
      return { error: response.error }
    }

    // Transform Course to CourseCreationData format
    const course = response.data!
    const courseCreationData: CourseCreationData = {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.tags?.[0] || '',
      level: course.difficulty,
      price: course.price,
      chapters: course.videos?.map((video, index) => ({
        id: `chapter-${index}`,
        title: `Chapter ${index + 1}`,
        description: '',
        order: index,
        videos: [video]
      })) || [],
      videos: course.videos || [],
      status: course.isPublished ? 'published' : 'draft',
      autoSaveEnabled: false,
      lastSaved: new Date(course.updatedAt)
    }

    return { data: courseCreationData }
  }

  // Update existing course
  async updateCourseDetails(courseId: string, updates: Partial<CourseCreationData>): Promise<ServiceResult<Course>> {
    console.log('💾 Updating course:', courseId, updates)
    
    if (useMockData) {
      console.log('🎭 Mock update successful')
      return { data: {} as Course }
    }

    // Transform CourseCreationData back to Course format for API
    const courseUpdate = {
      title: updates.title,
      description: updates.description,
      difficulty: updates.level,
      price: updates.price,
      tags: updates.category ? [updates.category] : undefined,
      // Don't update isPublished here - use separate publish/unpublish endpoints
    }

    const response = await apiClient.put<Course>(`/api/v1/instructor/courses/${courseId}`, courseUpdate)
    
    if (response.error) {
      return { error: response.error }
    }

    return { data: response.data! }
  }
}
```

### 3. Enhance Existing Slice Implementation

**Update**: `src/stores/slices/course-creation-slice.ts`

```typescript
// Enhance existing slice - don't replace
export const createCourseCreationSlice: StateCreator<CourseCreationSlice> = (set, get) => ({
  // Keep all existing state and actions...
  courseCreation: null,
  uploadQueue: [],
  isAutoSaving: false,
  currentStep: 'info',
  saveError: null,
  lastSaveAttempt: null,

  // Enhanced loadCourseForEdit with real API
  loadCourseForEdit: async (courseId: string) => {
    console.log('📖 Loading course for edit:', courseId)
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
          originalData: structuredClone(courseData), // Store original for revert
          isDirty: false
        },
        currentStep: 'info',
        isAutoSaving: false,
        saveError: null
      })
      
      console.log('✅ Course loaded for editing')
    } catch (error) {
      console.error('❌ Failed to load course:', error)
      set({
        saveError: 'Failed to load course',
        isAutoSaving: false
      })
    }
  },

  // Enhanced setCourseInfo with dirty tracking
  setCourseInfo: (info) => {
    set(state => ({
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        ...info,
        isDirty: true, // Mark as dirty when any field changes
        lastSaved: new Date()
      } : {
        title: '',
        description: '',
        category: '',
        level: 'beginner',
        price: 0,
        chapters: [],
        videos: [],
        status: 'draft',
        autoSaveEnabled: false,
        isDirty: true,
        ...info
      }
    }))
  },

  // New updateCourse action for editing mode
  updateCourse: async (courseId: string, updates: Partial<CourseCreationData>) => {
    console.log('🔄 Updating course:', courseId, updates)
    set({ isAutoSaving: true, saveError: null })
    
    try {
      const result = await instructorCourseService.updateCourseDetails(courseId, updates)
      
      if (result.error) {
        set({ 
          saveError: result.error,
          isAutoSaving: false
        })
        return
      }

      // Update local state to match server
      set(state => ({
        courseCreation: state.courseCreation ? {
          ...state.courseCreation,
          ...updates,
          isDirty: false, // Clear dirty flag after successful save
          lastServerSync: new Date()
        } : null,
        isAutoSaving: false,
        saveError: null
      }))
      
      console.log('✅ Course updated successfully')
      
    } catch (error) {
      console.error('❌ Failed to update course:', error)
      set({
        saveError: 'Failed to update course',
        isAutoSaving: false
      })
    }
  },

  // Enhanced saveDraft that works for both create and edit
  saveDraft: async () => {
    const { courseCreation } = get()
    if (!courseCreation) return
    
    console.log('💾 Saving draft...', courseCreation.id ? 'UPDATE MODE' : 'CREATE MODE')
    
    // If course has ID, update existing course
    if (courseCreation.id) {
      await get().updateCourse(courseCreation.id, courseCreation)
      return
    }
    
    // Otherwise, create new course (existing logic)
    // Keep existing create logic unchanged...
    const title = courseCreation.title?.trim() || ''
    const description = courseCreation.description?.trim() || ''
    
    if (!title || title.length < 3) {
      set({
        saveError: 'Course title is required and must be at least 3 characters long',
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
            id: result.data!.id,
            isDirty: false
          } : null
        }))
        console.log('✅ New course created successfully!')
      } else {
        throw new Error(result.error || 'Failed to save draft')
      }
    } catch (error) {
      console.error('❌ Failed to save draft:', error)
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

  // New revert functionality
  revertToOriginal: () => {
    set(state => {
      if (!state.courseCreation?.originalData) return state
      
      return {
        courseCreation: {
          ...state.courseCreation.originalData,
          originalData: state.courseCreation.originalData, // Keep original
          isDirty: false
        },
        saveError: null
      }
    })
    console.log('🔄 Reverted to original course data')
  },

  // Keep all other existing actions unchanged...
  // addVideosToQueue, updateVideoProgress, createChapter, etc.
})
```

### 4. Update Edit Page to Use Enhanced Store

**File**: `src/app/instructor/course/[id]/edit/page.tsx`

```typescript
// Minimal changes - follow existing pattern
export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  
  // Use existing pattern - just add new actions
  const {
    courseCreation,
    setCourseInfo,
    createChapter,
    updateChapter,
    deleteChapter,
    saveDraft,
    isAutoSaving,
    saveError,
    loadCourseForEdit,
    updateCourse,
    revertToOriginal
  } = useAppStore()

  // Remove local hasChanges state - use store's isDirty
  const [activeTab, setActiveTab] = useState("info")

  // Enhanced load on mount
  useEffect(() => {
    if (courseId) {
      loadCourseForEdit(courseId)
    }
  }, [courseId, loadCourseForEdit])

  // Enhanced save handler using store's isDirty
  const handleSave = async () => {
    if (!courseCreation?.isDirty) return
    
    if (courseCreation.id) {
      // Update existing course
      await updateCourse(courseCreation.id, courseCreation)
    } else {
      // Create new course (fallback)
      await saveDraft()
    }
    
    // Show success and redirect
    if (!saveError) {
      setTimeout(() => {
        router.push('/instructor/courses')
      }, 1000)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setCourseInfo({ [field]: value })
  }

  const handleRevert = () => {
    if (confirm('Are you sure you want to revert all changes?')) {
      revertToOriginal()
    }
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
      {/* Enhanced Header with Store State */}
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
            <h1 className="text-2xl font-bold">Edit Course</h1>
            <p className="text-sm text-muted-foreground">
              {courseCreation.title || 'Untitled Course'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Use store state instead of local state */}
          {isAutoSaving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </div>
          )}
          
          {courseCreation.isDirty && !isAutoSaving && (
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Unsaved changes
            </Badge>
          )}
          
          {!courseCreation.isDirty && !isAutoSaving && courseCreation.lastSaved && (
            <Badge variant="outline" className="gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              Saved
            </Badge>
          )}
          
          {saveError && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {saveError}
            </Badge>
          )}
          
          <div className="flex gap-2">
            {courseCreation.isDirty && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevert}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Revert
              </Button>
            )}
            
            <Button
              onClick={handleSave}
              disabled={!courseCreation.isDirty || isAutoSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Rest of the component stays the same - just use store state */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Basic Info</TabsTrigger>
          <TabsTrigger value="chapters">Chapters & Videos</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Forms use existing handleInputChange pattern */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
              <CardDescription>
                Update the basic information about your course
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
              
              {/* Continue with existing form fields... */}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Other tabs remain the same */}
      </Tabs>
    </div>
  )
}
```

## Implementation Roadmap

### Phase 1: API Integration (2-3 hours)
1. ✅ **Enhance instructor-course-service**
   - Add `getCourseForEditing()` method
   - Add `updateCourseDetails()` method
   - Keep existing mock data logic for development

2. ✅ **Update course-creation-slice** 
   - Add `isDirty` and `originalData` to existing state
   - Enhance `loadCourseForEdit` with real API call
   - Add `updateCourse` action for editing
   - Enhance `saveDraft` to handle both create and edit
   - Add `revertToOriginal` action

3. ✅ **Update edit page component**
   - Remove local `hasChanges` state
   - Use store's `isDirty` flag
   - Add revert functionality
   - Improve error display

### Phase 2: Testing & Polish (1 hour)
1. ✅ Test with real course data
2. ✅ Test error handling
3. ✅ Test revert functionality
4. ✅ Polish loading states

## Key Benefits of This Approach

1. **Follows Existing Architecture** ✅
   - Uses `useAppStore()` pattern
   - Enhances existing slices instead of creating new ones
   - No custom hooks introduced

2. **Minimal Breaking Changes** ✅
   - Keeps all existing functionality
   - Only adds new actions and state fields
   - Backward compatible

3. **Real API Integration** ✅
   - Integrates with instructor-course-service
   - Works with existing API client
   - Follows existing service patterns

4. **Better User Experience** ✅
   - Automatic dirty state tracking
   - Server-side validation
   - Revert functionality
   - Better error handling

## API Endpoints Needed

1. **GET** `/api/v1/instructor/courses/{id}` - Load course for editing
2. **PUT** `/api/v1/instructor/courses/{id}` - Update course details

## No Custom Hooks Required ❌

The solution uses only:
- ✅ Existing `useAppStore()` pattern
- ✅ Existing service layer
- ✅ Existing slice pattern
- ✅ Standard React hooks (useEffect, useState)

This approach integrates real API calls while maintaining the existing architecture patterns and eliminating the need for custom hooks.
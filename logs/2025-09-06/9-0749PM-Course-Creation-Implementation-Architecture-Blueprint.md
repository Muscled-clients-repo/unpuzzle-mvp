# Course Creation Implementation Architecture Blueprint

## Executive Summary

This document provides the **complete implementation architecture** for building a robust course creation flow with **TanStack Query as SSOT** for server data and **Zustand for UI state**. Every interface, hook, component pattern, and integration is defined to enable flawless step-by-step implementation.

---

## 1. Core Architecture Principles

### 1.1 Single Source of Truth (SSOT) Rules
```typescript
// ✅ CORRECT: TanStack Query for server data
const { data: course } = useCourseQuery(courseId)

// ✅ CORRECT: Zustand for UI state  
const { isEditing, startEdit } = useCourseCreationUI()

// ❌ WRONG: Component state for server data
const [course, setCourse] = useState(null)

// ❌ WRONG: TanStack Query for UI state
const { data: editingState } = useQuery(['editing-state'])
```

### 1.2 Data Flow Architecture
```
User Action → Zustand UI Update → TanStack Mutation → Server → Cache Update → UI Re-render
           ↓
    Optimistic Update (Instant UI Feedback)
```

### 1.3 State Boundaries
- **TanStack Query**: Course data, chapters, videos, upload results, user data
- **Zustand**: Editing modes, form data, modals, drag state, upload progress
- **Component State**: Only for pure UI animations or ref management

---

## 2. Type System Architecture

### 2.1 Core Domain Types

**File: `/src/types/course.ts`**
```typescript
// Base course entity
export interface Course {
  id: string
  title: string
  description: string | null
  price: number | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  status: 'draft' | 'published' | 'archived'
  instructor_id: string
  created_at: string
  updated_at: string
  
  // Computed fields (not stored in DB)
  chapters?: Chapter[]
  totalVideos?: number
  totalDuration?: number
  thumbnailUrl?: string
}

// Virtual chapter (derived from video chapter_id)
export interface Chapter {
  id: string // Format: 'chapter-{timestamp}' or 'chapter-{number}'
  title: string
  courseId: string
  order: number
  videos: Video[]
  videoCount: number
  totalDuration?: number
  
  // UI state (not stored in server)
  isExpanded?: boolean
}

// Video entity
export interface Video {
  id: string
  filename: string
  originalFilename: string
  course_id: string
  chapter_id: string
  order: number
  duration: number | null
  size: number
  format: string
  status: 'uploading' | 'processing' | 'ready' | 'error'
  
  // Backblaze storage
  backblaze_file_id: string | null
  backblaze_url: string | null
  
  // Metadata
  created_at: string
  updated_at: string
  
  // Computed fields
  thumbnailUrl?: string
  streamUrl?: string
  downloadUrl?: string
}

// Course creation wizard data
export interface CourseCreationData {
  // Step 1: Basic info
  title: string
  description: string
  price: number | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  
  // Step 2: Content structure (before upload)
  plannedChapters: Array<{
    id: string
    title: string
    plannedVideos: Array<{
      filename: string
      file: File
    }>
  }>
  
  // Step 3: Upload tracking
  uploads: Record<string, UploadItem>
}

export interface UploadItem {
  id: string
  file: File
  filename: string
  chapterId: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  backblazeFileId?: string
  videoId?: string // Set after DB insert
  error?: string
}
```

**File: `/src/types/api.ts`**
```typescript
// Standard API response wrapper
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Course creation API types
export interface CreateCourseRequest {
  title: string
  description?: string
  price?: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export interface CreateCourseResponse {
  course: Course
}

// Video upload API types
export interface VideoUploadRequest {
  courseId: string
  chapterId: string
  filename: string
  file: File
}

export interface VideoUploadResponse {
  video: Video
  uploadUrl: string
  fileId: string
}

// Batch operations
export interface BatchVideoUpdateRequest {
  updates: Array<{
    id: string
    filename?: string
    chapterId?: string
    order?: number
  }>
}

export interface BatchChapterUpdateRequest {
  updates: Array<{
    id: string
    title?: string
    order?: number
  }>
}

// Soft delete types
export interface PendingDelete {
  id: string
  type: 'video' | 'chapter'
  timestamp: number
}
```

**File: `/src/types/ui.ts`**
```typescript
// UI-specific types for Zustand stores
export interface DragItem {
  id: string
  type: 'video' | 'chapter'
  sourceChapterId?: string
  originalIndex: number
}

export interface DropTarget {
  id: string
  type: 'chapter' | 'chapter-content'
  chapterId?: string
  insertIndex?: number
}

export interface EditingState {
  type: 'course' | 'chapter' | 'video' | null
  id: string | null
  field?: string // For specific field editing
}

export interface ModalState {
  type: 'video-preview' | 'delete-confirmation' | 'upload-settings' | null
  data?: any
}

export interface ValidationError {
  field: string
  message: string
}

export interface FormState {
  isDirty: boolean
  isValid: boolean
  errors: ValidationError[]
}
```

---

## 3. Zustand Store Architecture

### 3.1 Course Creation UI Store

**File: `/src/stores/course-creation-ui.ts`**
```typescript
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { CourseCreationData, UploadItem, DragItem, DropTarget, EditingState, ModalState } from '@/types'

interface CourseCreationUIState {
  // ===== WIZARD NAVIGATION =====
  currentStep: 1 | 2 | 3 | 4 // 1=Basic, 2=Structure, 3=Upload, 4=Review
  completedSteps: Set<number>
  canProceedToStep: (step: number) => boolean
  setStep: (step: number) => void
  markStepCompleted: (step: number) => void
  
  // ===== FORM DATA (Temporary, before save) =====
  formData: CourseCreationData
  updateFormData: <K extends keyof CourseCreationData>(field: K, value: CourseCreationData[K]) => void
  validateForm: () => boolean
  clearForm: () => void
  
  // ===== EDITING STATES =====
  editing: EditingState
  startEdit: (type: EditingState['type'], id: string, field?: string) => void
  stopEdit: () => void
  isEditing: (type: string, id: string, field?: string) => boolean
  
  // ===== MODAL MANAGEMENT =====
  modal: ModalState
  openModal: (type: ModalState['type'], data?: any) => void
  closeModal: () => void
  
  // ===== DRAG & DROP STATE =====
  dragState: {
    isDragging: boolean
    dragItem: DragItem | null
    dropTarget: DropTarget | null
    previewData: any
  }
  startDrag: (item: DragItem) => void
  updateDragTarget: (target: DropTarget | null) => void
  endDrag: () => void
  
  // ===== UPLOAD MANAGEMENT =====
  uploads: Record<string, UploadItem>
  addUpload: (item: UploadItem) => void
  updateUploadProgress: (id: string, progress: number) => void
  updateUploadStatus: (id: string, status: UploadItem['status'], error?: string) => void
  removeUpload: (id: string) => void
  clearCompletedUploads: () => void
  getUploadsByChapter: (chapterId: string) => UploadItem[]
  getTotalUploadProgress: () => number
  
  // ===== PENDING OPERATIONS =====
  pendingDeletes: Set<string> // IDs of items marked for deletion
  markForDeletion: (id: string) => void
  unmarkForDeletion: (id: string) => void
  clearPendingDeletes: () => void
  
  // ===== UI PREFERENCES =====
  preferences: {
    autoSave: boolean
    showUploadProgress: boolean
    chapterExpanded: Record<string, boolean>
    viewMode: 'list' | 'grid'
  }
  updatePreference: <K extends keyof CourseCreationUIState['preferences']>(
    key: K, 
    value: CourseCreationUIState['preferences'][K]
  ) => void
  
  // ===== COMPUTED GETTERS =====
  getTotalVideosCount: () => number
  getTotalUploadSize: () => number
  getValidationErrors: () => string[]
  hasUnsavedChanges: () => boolean
}

export const useCourseCreationUI = create<CourseCreationUIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentStep: 1,
        completedSteps: new Set(),
        formData: {
          title: '',
          description: '',
          price: null,
          difficulty: 'beginner',
          plannedChapters: [],
          uploads: {}
        },
        editing: { type: null, id: null },
        modal: { type: null },
        dragState: {
          isDragging: false,
          dragItem: null,
          dropTarget: null,
          previewData: null
        },
        uploads: {},
        pendingDeletes: new Set(),
        preferences: {
          autoSave: true,
          showUploadProgress: true,
          chapterExpanded: {},
          viewMode: 'list'
        },

        // Navigation methods
        canProceedToStep: (step: number) => {
          const { completedSteps } = get()
          // Can always go to current or previous steps
          if (step <= Math.max(...completedSteps, 1)) return true
          // Can only proceed to next step if current is completed
          return completedSteps.has(step - 1)
        },

        setStep: (step) => {
          const { canProceedToStep } = get()
          if (canProceedToStep(step)) {
            set({ currentStep: step })
          }
        },

        markStepCompleted: (step) => {
          set((state) => ({
            completedSteps: new Set([...state.completedSteps, step])
          }))
        },

        // Form data methods
        updateFormData: (field, value) => {
          set((state) => ({
            formData: {
              ...state.formData,
              [field]: value
            }
          }))
        },

        validateForm: () => {
          const { formData } = get()
          return formData.title.trim().length > 0 && 
                 formData.description.trim().length > 0
        },

        clearForm: () => {
          set({
            formData: {
              title: '',
              description: '',
              price: null,
              difficulty: 'beginner',
              plannedChapters: [],
              uploads: {}
            }
          })
        },

        // Editing methods
        startEdit: (type, id, field) => {
          set({ editing: { type, id, field } })
        },

        stopEdit: () => {
          set({ editing: { type: null, id: null } })
        },

        isEditing: (type, id, field) => {
          const { editing } = get()
          return editing.type === type && 
                 editing.id === id && 
                 (field === undefined || editing.field === field)
        },

        // Modal methods
        openModal: (type, data) => {
          set({ modal: { type, data } })
        },

        closeModal: () => {
          set({ modal: { type: null } })
        },

        // Drag & drop methods
        startDrag: (item) => {
          set({
            dragState: {
              isDragging: true,
              dragItem: item,
              dropTarget: null,
              previewData: null
            }
          })
        },

        updateDragTarget: (target) => {
          set((state) => ({
            dragState: {
              ...state.dragState,
              dropTarget: target
            }
          }))
        },

        endDrag: () => {
          set({
            dragState: {
              isDragging: false,
              dragItem: null,
              dropTarget: null,
              previewData: null
            }
          })
        },

        // Upload methods
        addUpload: (item) => {
          set((state) => ({
            uploads: {
              ...state.uploads,
              [item.id]: item
            }
          }))
        },

        updateUploadProgress: (id, progress) => {
          set((state) => ({
            uploads: {
              ...state.uploads,
              [id]: state.uploads[id] ? {
                ...state.uploads[id],
                progress
              } : state.uploads[id]
            }
          }))
        },

        updateUploadStatus: (id, status, error) => {
          set((state) => ({
            uploads: {
              ...state.uploads,
              [id]: state.uploads[id] ? {
                ...state.uploads[id],
                status,
                error
              } : state.uploads[id]
            }
          }))
        },

        removeUpload: (id) => {
          set((state) => {
            const { [id]: removed, ...remaining } = state.uploads
            return { uploads: remaining }
          })
        },

        clearCompletedUploads: () => {
          set((state) => {
            const activeUploads = Object.fromEntries(
              Object.entries(state.uploads).filter(
                ([_, upload]) => upload.status !== 'complete'
              )
            )
            return { uploads: activeUploads }
          })
        },

        getUploadsByChapter: (chapterId) => {
          const { uploads } = get()
          return Object.values(uploads).filter(
            upload => upload.chapterId === chapterId
          )
        },

        getTotalUploadProgress: () => {
          const { uploads } = get()
          const uploadList = Object.values(uploads)
          if (uploadList.length === 0) return 100
          
          const totalProgress = uploadList.reduce(
            (sum, upload) => sum + upload.progress, 0
          )
          return Math.round(totalProgress / uploadList.length)
        },

        // Pending deletes methods
        markForDeletion: (id) => {
          set((state) => ({
            pendingDeletes: new Set([...state.pendingDeletes, id])
          }))
        },

        unmarkForDeletion: (id) => {
          set((state) => {
            const newPendingDeletes = new Set(state.pendingDeletes)
            newPendingDeletes.delete(id)
            return { pendingDeletes: newPendingDeletes }
          })
        },

        clearPendingDeletes: () => {
          set({ pendingDeletes: new Set() })
        },

        // Preferences methods
        updatePreference: (key, value) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              [key]: value
            }
          }))
        },

        // Computed getters
        getTotalVideosCount: () => {
          const { formData } = get()
          return formData.plannedChapters.reduce(
            (total, chapter) => total + chapter.plannedVideos.length, 0
          )
        },

        getTotalUploadSize: () => {
          const { uploads } = get()
          return Object.values(uploads).reduce(
            (total, upload) => total + upload.file.size, 0
          )
        },

        getValidationErrors: () => {
          const { formData } = get()
          const errors: string[] = []
          
          if (!formData.title.trim()) errors.push('Course title is required')
          if (!formData.description.trim()) errors.push('Course description is required')
          if (formData.plannedChapters.length === 0) errors.push('At least one chapter is required')
          
          return errors
        },

        hasUnsavedChanges: () => {
          const { formData, uploads } = get()
          return formData.title.trim().length > 0 ||
                 formData.description.trim().length > 0 ||
                 Object.keys(uploads).length > 0
        }
      }),
      {
        name: 'course-creation-ui',
        partialize: (state) => ({
          preferences: state.preferences,
          formData: {
            ...state.formData,
            uploads: {} // Don't persist file objects
          }
        })
      }
    )
  )
)
```

---

## 4. TanStack Query Hooks Architecture

### 4.1 Course Query Hooks

**File: `/src/hooks/use-course-queries.ts`**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  createCourseAction, 
  updateCourseAction, 
  getCourseAction,
  getCoursesAction 
} from '@/app/actions/course-actions'
import type { Course, CreateCourseRequest, ApiResponse } from '@/types'

// ===== QUERY KEYS =====
export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  list: (filters: any) => [...courseKeys.lists(), filters] as const,
  details: () => [...courseKeys.all, 'detail'] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
  creation: () => [...courseKeys.all, 'creation'] as const,
}

// ===== COURSE CREATION HOOK =====
export function useCourseCreation() {
  const queryClient = useQueryClient()
  
  const createMutation = useMutation({
    mutationFn: (data: CreateCourseRequest) => createCourseAction(data),
    
    onMutate: async (newCourse) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: courseKeys.lists() })
      
      // Snapshot previous value
      const previousCourses = queryClient.getQueryData(courseKeys.lists())
      
      // Optimistic update - add course to list immediately
      queryClient.setQueryData(courseKeys.lists(), (old: Course[] = []) => [
        {
          id: `temp-${Date.now()}`, // Temporary ID
          ...newCourse,
          status: 'draft' as const,
          instructor_id: 'current-user', // Will be set by server
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...old
      ])
      
      return { previousCourses }
    },
    
    onSuccess: (result, variables, context) => {
      if (result.success && result.data) {
        // Update cache with real server data
        queryClient.setQueryData(
          courseKeys.detail(result.data.id), 
          result.data
        )
        
        // Update the list to replace temp course with real one
        queryClient.setQueryData(courseKeys.lists(), (old: Course[] = []) => 
          old.map(course => 
            course.id.startsWith('temp-') ? result.data! : course
          )
        )
        
        toast.success('Course created successfully!')
      } else {
        toast.error(result.error || 'Failed to create course')
      }
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousCourses) {
        queryClient.setQueryData(courseKeys.lists(), context.previousCourses)
      }
      toast.error('Failed to create course')
    }
  })
  
  return {
    createCourse: createMutation.mutate,
    createCourseAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    error: createMutation.error
  }
}

// ===== COURSE EDIT HOOK =====
export function useCourseEdit(courseId: string) {
  const queryClient = useQueryClient()
  
  // Query for course data
  const courseQuery = useQuery({
    queryKey: courseKeys.detail(courseId),
    queryFn: () => getCourseAction(courseId),
    enabled: !!courseId
  })
  
  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Course>) => updateCourseAction(courseId, updates),
    
    onMutate: async (updates) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: courseKeys.detail(courseId) })
      
      // Snapshot previous value
      const previousCourse = queryClient.getQueryData(courseKeys.detail(courseId))
      
      // Optimistic update
      queryClient.setQueryData(courseKeys.detail(courseId), (old: Course) => ({
        ...old,
        ...updates,
        updated_at: new Date().toISOString()
      }))
      
      // Also update in lists cache if it exists
      queryClient.setQueryData(courseKeys.lists(), (old: Course[] = []) =>
        old.map(course => 
          course.id === courseId 
            ? { ...course, ...updates, updated_at: new Date().toISOString() }
            : course
        )
      )
      
      return { previousCourse }
    },
    
    onSuccess: (result) => {
      if (result.success) {
        // Background refetch for consistency
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: courseKeys.detail(courseId) })
        }, 2000)
        
        toast.success('Course updated successfully!')
      } else {
        toast.error(result.error || 'Failed to update course')
      }
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousCourse) {
        queryClient.setQueryData(courseKeys.detail(courseId), context.previousCourse)
      }
      toast.error('Failed to update course')
    }
  })
  
  return {
    course: courseQuery.data,
    isLoading: courseQuery.isLoading,
    error: courseQuery.error,
    updateCourse: updateMutation.mutate,
    updateCourseAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending
  }
}

// ===== COURSES LIST HOOK =====
export function useCoursesList(filters: any = {}) {
  return useQuery({
    queryKey: courseKeys.list(filters),
    queryFn: () => getCoursesAction(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}
```

### 4.2 Chapter Query Hooks

**File: `/src/hooks/use-chapter-queries.ts`**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  getChaptersForCourseAction,
  createChapterAction,
  updateChapterAction,
  deleteChapterAction,
  reorderChaptersAction
} from '@/app/actions/chapter-actions'
import type { Chapter, Course } from '@/types'

// ===== QUERY KEYS =====
export const chapterKeys = {
  all: ['chapters'] as const,
  lists: () => [...chapterKeys.all, 'list'] as const,
  list: (courseId: string) => [...chapterKeys.lists(), courseId] as const,
  details: () => [...chapterKeys.all, 'detail'] as const,
  detail: (id: string) => [...chapterKeys.details(), id] as const,
}

// ===== CHAPTERS LIST HOOK =====
export function useChaptersEdit(courseId: string) {
  const queryClient = useQueryClient()
  
  // Query for chapters data
  const chaptersQuery = useQuery({
    queryKey: chapterKeys.list(courseId),
    queryFn: () => getChaptersForCourseAction(courseId),
    enabled: !!courseId
  })
  
  // Create chapter mutation
  const createMutation = useMutation({
    mutationFn: (title: string) => createChapterAction(courseId, title),
    
    onMutate: async (title) => {
      await queryClient.cancelQueries({ queryKey: chapterKeys.list(courseId) })
      
      const previousChapters = queryClient.getQueryData(chapterKeys.list(courseId))
      
      // Optimistic update - add new chapter
      const tempChapter: Chapter = {
        id: `temp-chapter-${Date.now()}`,
        title,
        courseId,
        order: (previousChapters as Chapter[] || []).length,
        videos: [],
        videoCount: 0
      }
      
      queryClient.setQueryData(chapterKeys.list(courseId), (old: Chapter[] = []) => [
        ...old,
        tempChapter
      ])
      
      return { previousChapters }
    },
    
    onSuccess: (result) => {
      if (result.success) {
        // Replace temp chapter with real one
        queryClient.setQueryData(chapterKeys.list(courseId), (old: Chapter[] = []) =>
          old.map(chapter => 
            chapter.id.startsWith('temp-') ? result.data : chapter
          )
        )
        toast.success('Chapter created successfully!')
      }
    },
    
    onError: (error, variables, context) => {
      if (context?.previousChapters) {
        queryClient.setQueryData(chapterKeys.list(courseId), context.previousChapters)
      }
      toast.error('Failed to create chapter')
    }
  })
  
  // Update chapter mutation
  const updateMutation = useMutation({
    mutationFn: ({ chapterId, updates }: { chapterId: string, updates: Partial<Chapter> }) =>
      updateChapterAction(chapterId, updates),
    
    onMutate: async ({ chapterId, updates }) => {
      await queryClient.cancelQueries({ queryKey: chapterKeys.list(courseId) })
      
      const previousChapters = queryClient.getQueryData(chapterKeys.list(courseId))
      
      // Optimistic update
      queryClient.setQueryData(chapterKeys.list(courseId), (old: Chapter[] = []) =>
        old.map(chapter => 
          chapter.id === chapterId 
            ? { ...chapter, ...updates }
            : chapter
        )
      )
      
      // Also update course cache if it has chapters
      queryClient.setQueryData(['course', courseId], (old: Course) => {
        if (old?.chapters) {
          return {
            ...old,
            chapters: old.chapters.map(chapter =>
              chapter.id === chapterId ? { ...chapter, ...updates } : chapter
            )
          }
        }
        return old
      })
      
      return { previousChapters }
    },
    
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Chapter updated successfully!')
      }
    },
    
    onError: (error, variables, context) => {
      if (context?.previousChapters) {
        queryClient.setQueryData(chapterKeys.list(courseId), context.previousChapters)
      }
      toast.error('Failed to update chapter')
    }
  })
  
  // Delete chapter mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: (chapterId: string) => deleteChapterAction(courseId, chapterId),
    
    onMutate: async (chapterId) => {
      await queryClient.cancelQueries({ queryKey: chapterKeys.list(courseId) })
      
      const previousChapters = queryClient.getQueryData(chapterKeys.list(courseId))
      
      // Optimistic update - remove chapter
      queryClient.setQueryData(chapterKeys.list(courseId), (old: Chapter[] = []) =>
        old.filter(chapter => chapter.id !== chapterId)
      )
      
      return { previousChapters, deletedChapterId: chapterId }
    },
    
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Chapter deleted successfully!')
      }
    },
    
    onError: (error, variables, context) => {
      if (context?.previousChapters) {
        queryClient.setQueryData(chapterKeys.list(courseId), context.previousChapters)
      }
      toast.error('Failed to delete chapter')
    }
  })
  
  // Reorder chapters mutation
  const reorderMutation = useMutation({
    mutationFn: (newOrder: Chapter[]) => reorderChaptersAction(courseId, newOrder),
    
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: chapterKeys.list(courseId) })
      
      const previousChapters = queryClient.getQueryData(chapterKeys.list(courseId))
      
      // Optimistic update - reorder chapters
      queryClient.setQueryData(chapterKeys.list(courseId), newOrder)
      
      return { previousChapters }
    },
    
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Chapters reordered successfully!')
      }
    },
    
    onError: (error, variables, context) => {
      if (context?.previousChapters) {
        queryClient.setQueryData(chapterKeys.list(courseId), context.previousChapters)
      }
      toast.error('Failed to reorder chapters')
    }
  })
  
  return {
    chapters: chaptersQuery.data,
    isLoading: chaptersQuery.isLoading,
    error: chaptersQuery.error,
    createChapter: createMutation.mutate,
    updateChapter: updateMutation.mutate,
    deleteChapter: deleteMutation.mutate,
    reorderChapters: reorderMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending
  }
}
```

### 4.3 Video Query Hooks

**File: `/src/hooks/use-video-queries.ts`**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  uploadVideoAction,
  updateVideoAction,
  deleteVideoAction,
  batchUpdateVideosAction,
  reorderVideosAction
} from '@/app/actions/video-actions'
import type { Video, UploadItem } from '@/types'

// ===== QUERY KEYS =====
export const videoKeys = {
  all: ['videos'] as const,
  lists: () => [...videoKeys.all, 'list'] as const,
  list: (courseId: string) => [...videoKeys.lists(), courseId] as const,
  chapter: (chapterId: string) => [...videoKeys.all, 'chapter', chapterId] as const,
  details: () => [...videoKeys.all, 'detail'] as const,
  detail: (id: string) => [...videoKeys.details(), id] as const,
}

// ===== VIDEO UPLOAD HOOK =====
export function useVideoUpload(courseId: string) {
  const queryClient = useQueryClient()
  
  const uploadMutation = useMutation({
    mutationFn: async ({ 
      file, 
      chapterId, 
      onProgress 
    }: { 
      file: File
      chapterId: string
      onProgress?: (progress: number) => void
    }) => {
      return uploadVideoAction({
        file,
        courseId,
        chapterId,
        onProgress
      })
    },
    
    onMutate: async ({ file, chapterId }) => {
      // Create temporary video object for immediate UI feedback
      const tempVideo: Video = {
        id: `temp-video-${Date.now()}`,
        filename: file.name,
        originalFilename: file.name,
        course_id: courseId,
        chapter_id: chapterId,
        order: 0, // Will be calculated by server
        duration: null,
        size: file.size,
        format: file.type,
        status: 'uploading',
        backblaze_file_id: null,
        backblaze_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Add to videos cache optimistically
      queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) => [
        ...old,
        tempVideo
      ])
      
      // Update chapters cache to reflect new video count
      queryClient.setQueryData(['chapters', courseId], (old: any) => {
        if (!Array.isArray(old)) return old
        
        return old.map(chapter => 
          chapter.id === chapterId
            ? {
                ...chapter,
                videos: [...(chapter.videos || []), tempVideo],
                videoCount: (chapter.videoCount || 0) + 1
              }
            : chapter
        )
      })
      
      return { tempVideoId: tempVideo.id }
    },
    
    onSuccess: (result, variables, context) => {
      if (result.success && result.data) {
        const realVideo = result.data
        
        // Replace temporary video with real one
        queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) =>
          old.map(video => 
            video.id === context?.tempVideoId ? realVideo : video
          )
        )
        
        // Update chapters cache
        queryClient.setQueryData(['chapters', courseId], (old: any) => {
          if (!Array.isArray(old)) return old
          
          return old.map(chapter => 
            chapter.id === variables.chapterId
              ? {
                  ...chapter,
                  videos: chapter.videos.map((video: Video) =>
                    video.id === context?.tempVideoId ? realVideo : video
                  )
                }
              : chapter
          )
        })
        
        toast.success(`${realVideo.filename} uploaded successfully!`)
      } else {
        toast.error(result.error || 'Upload failed')
      }
    },
    
    onError: (error, variables, context) => {
      // Remove temporary video on error
      if (context?.tempVideoId) {
        queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) =>
          old.filter(video => video.id !== context.tempVideoId)
        )
        
        queryClient.setQueryData(['chapters', courseId], (old: any) => {
          if (!Array.isArray(old)) return old
          
          return old.map(chapter => 
            chapter.id === variables.chapterId
              ? {
                  ...chapter,
                  videos: chapter.videos.filter((video: Video) => 
                    video.id !== context.tempVideoId
                  ),
                  videoCount: Math.max(0, (chapter.videoCount || 1) - 1)
                }
              : chapter
          )
        })
      }
      
      toast.error(`Failed to upload ${variables.file.name}`)
    }
  })
  
  return {
    uploadVideo: uploadMutation.mutate,
    uploadVideoAsync: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending
  }
}

// ===== BATCH VIDEO OPERATIONS HOOK =====
export function useVideoBatchOperations(courseId: string) {
  const queryClient = useQueryClient()
  
  const batchUpdateMutation = useMutation({
    mutationFn: (updates: Array<{ id: string, filename?: string, chapterId?: string, order?: number }>) =>
      batchUpdateVideosAction(updates),
    
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: videoKeys.list(courseId) })
      await queryClient.cancelQueries({ queryKey: ['chapters', courseId] })
      
      const previousVideos = queryClient.getQueryData(videoKeys.list(courseId))
      const previousChapters = queryClient.getQueryData(['chapters', courseId])
      
      // Optimistic update for videos
      queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) =>
        old.map(video => {
          const update = updates.find(u => u.id === video.id)
          return update ? { ...video, ...update } : video
        })
      )
      
      // Optimistic update for chapters
      queryClient.setQueryData(['chapters', courseId], (old: any) => {
        if (!Array.isArray(old)) return old
        
        return old.map(chapter => ({
          ...chapter,
          videos: chapter.videos.map((video: Video) => {
            const update = updates.find(u => u.id === video.id)
            return update ? { ...video, ...update } : video
          })
        }))
      })
      
      return { previousVideos, previousChapters }
    },
    
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`${result.data.length} video(s) updated successfully!`)
        
        // Background refetch for consistency
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: videoKeys.list(courseId) })
          queryClient.refetchQueries({ queryKey: ['chapters', courseId] })
        }, 2000)
      }
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousVideos) {
        queryClient.setQueryData(videoKeys.list(courseId), context.previousVideos)
      }
      if (context?.previousChapters) {
        queryClient.setQueryData(['chapters', courseId], context.previousChapters)
      }
      
      toast.error('Failed to update videos')
    }
  })
  
  return {
    batchUpdateVideos: batchUpdateMutation.mutate,
    isBatchUpdating: batchUpdateMutation.isPending
  }
}

// ===== VIDEO DELETE HOOK =====
export function useVideoDelete(courseId: string) {
  const queryClient = useQueryClient()
  
  const deleteMutation = useMutation({
    mutationFn: (videoId: string) => deleteVideoAction(videoId),
    
    onMutate: async (videoId) => {
      await queryClient.cancelQueries({ queryKey: videoKeys.list(courseId) })
      await queryClient.cancelQueries({ queryKey: ['chapters', courseId] })
      
      const previousVideos = queryClient.getQueryData(videoKeys.list(courseId))
      const previousChapters = queryClient.getQueryData(['chapters', courseId])
      
      // Optimistic update - remove video
      queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) =>
        old.filter(video => video.id !== videoId)
      )
      
      // Update chapters cache
      queryClient.setQueryData(['chapters', courseId], (old: any) => {
        if (!Array.isArray(old)) return old
        
        return old.map(chapter => ({
          ...chapter,
          videos: chapter.videos.filter((video: Video) => video.id !== videoId),
          videoCount: Math.max(0, (chapter.videoCount || 1) - 1)
        }))
      })
      
      return { previousVideos, previousChapters, deletedVideoId: videoId }
    },
    
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Video deleted successfully!')
      }
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousVideos) {
        queryClient.setQueryData(videoKeys.list(courseId), context.previousVideos)
      }
      if (context?.previousChapters) {
        queryClient.setQueryData(['chapters', courseId], context.previousChapters)
      }
      
      toast.error('Failed to delete video')
    }
  })
  
  return {
    deleteVideo: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending
  }
}
```

---

## 5. Component Integration Patterns

### 5.1 Course Creation Wizard Component

**File: `/src/components/course/CourseCreationWizard.tsx`**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronRight, ChevronLeft, Save, Upload } from 'lucide-react'

import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { useCourseCreation } from '@/hooks/use-course-queries'
import { useVideoUpload } from '@/hooks/use-video-queries'

import { CourseBasicInfoStep } from './CourseBasicInfoStep'
import { CourseStructureStep } from './CourseStructureStep'
import { CourseUploadStep } from './CourseUploadStep'
import { CourseReviewStep } from './CourseReviewStep'

export function CourseCreationWizard() {
  const router = useRouter()
  
  // Zustand UI state
  const {
    currentStep,
    completedSteps,
    formData,
    canProceedToStep,
    setStep,
    markStepCompleted,
    validateForm,
    clearForm,
    hasUnsavedChanges
  } = useCourseCreationUI()
  
  // TanStack Query mutations
  const { createCourse, isCreating } = useCourseCreation()
  
  const steps = [
    { number: 1, title: 'Basic Info', component: CourseBasicInfoStep },
    { number: 2, title: 'Structure', component: CourseStructureStep },
    { number: 3, title: 'Upload', component: CourseUploadStep },
    { number: 4, title: 'Review', component: CourseReviewStep }
  ]
  
  const currentStepData = steps.find(s => s.number === currentStep)
  const CurrentStepComponent = currentStepData?.component
  
  const progressPercentage = (completedSteps.size / steps.length) * 100
  
  // Handle step navigation
  const handleNext = () => {
    if (currentStep === 1 && validateForm()) {
      markStepCompleted(1)
      setStep(2)
    } else if (currentStep === 2 && formData.plannedChapters.length > 0) {
      markStepCompleted(2)
      setStep(3)
    } else if (currentStep === 3) {
      markStepCompleted(3)
      setStep(4)
    } else if (currentStep === 4) {
      handleCreateCourse()
    }
  }
  
  const handlePrevious = () => {
    if (currentStep > 1) {
      setStep(currentStep - 1)
    }
  }
  
  // Handle course creation
  const handleCreateCourse = async () => {
    try {
      const course = await createCourse({
        title: formData.title,
        description: formData.description,
        price: formData.price,
        difficulty: formData.difficulty
      })
      
      if (course.success) {
        markStepCompleted(4)
        clearForm()
        router.push(`/instructor/course/${course.data.id}/edit`)
      }
    } catch (error) {
      console.error('Course creation failed:', error)
    }
  }
  
  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Create New Course</h1>
        <p className="text-muted-foreground">
          Follow the steps below to create your course
        </p>
      </div>
      
      {/* Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Progress</CardTitle>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercentage} className="w-full" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {steps.map(step => (
              <div key={step.number} className="flex flex-col items-center space-y-2">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${completedSteps.has(step.number) 
                    ? 'bg-green-500 text-white' 
                    : step.number === currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {step.number}
                </div>
                <span className="text-xs text-center">{step.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{currentStepData?.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {CurrentStepComponent && <CurrentStepComponent />}
        </CardContent>
      </Card>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={isCreating || (currentStep === 1 && !validateForm())}
        >
          {currentStep === 4 ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              {isCreating ? 'Creating...' : 'Create Course'}
            </>
          ) : (
            <>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
```

### 5.2 Drag & Drop Implementation

**File: `/src/components/course/DragDropManager.tsx`**
```typescript
'use client'

import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { GripVertical } from 'lucide-react'
import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { useChaptersEdit } from '@/hooks/use-chapter-queries'
import { useVideoBatchOperations } from '@/hooks/use-video-queries'
import type { Chapter, Video, DragItem, DropTarget } from '@/types'

// ===== DRAG & DROP ITEM TYPES =====
export const ItemTypes = {
  CHAPTER: 'chapter',
  VIDEO: 'video'
}

// ===== DRAGGABLE CHAPTER COMPONENT =====
interface DraggableChapterProps {
  chapter: Chapter
  index: number
  onMove: (dragIndex: number, hoverIndex: number) => void
  children: React.ReactNode
}

export function DraggableChapter({ chapter, index, onMove, children }: DraggableChapterProps) {
  const ui = useCourseCreationUI()
  
  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.CHAPTER,
    item: { 
      id: chapter.id, 
      type: 'chapter',
      sourceChapterId: null,
      originalIndex: index 
    } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    begin: () => {
      ui.startDrag({ 
        id: chapter.id, 
        type: 'chapter',
        sourceChapterId: null,
        originalIndex: index 
      })
    },
    end: () => {
      ui.endDrag()
    }
  })

  const [, drop] = useDrop({
    accept: ItemTypes.CHAPTER,
    hover: (draggedItem: DragItem) => {
      if (!draggedItem) return
      
      const dragIndex = draggedItem.originalIndex
      const hoverIndex = index

      if (dragIndex === hoverIndex) return

      onMove(dragIndex, hoverIndex)
      draggedItem.originalIndex = hoverIndex
    }
  })

  return (
    <div ref={drop} className={`${isDragging ? 'opacity-50' : ''}`}>
      <div ref={preview}>
        <div className="flex items-center gap-2">
          <div 
            ref={drag}
            className="cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity"
            title="Drag to reorder chapter"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

// ===== DRAGGABLE VIDEO COMPONENT =====
interface DraggableVideoProps {
  video: Video
  chapterIndex: number
  videoIndex: number
  onMoveWithinChapter: (chapterIndex: number, dragIndex: number, hoverIndex: number) => void
  onMoveBetweenChapters: (videoId: string, sourceChapterId: string, targetChapterId: string) => void
  children: React.ReactNode
}

export function DraggableVideo({ 
  video, 
  chapterIndex, 
  videoIndex, 
  onMoveWithinChapter,
  onMoveBetweenChapters,
  children 
}: DraggableVideoProps) {
  const ui = useCourseCreationUI()
  
  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.VIDEO,
    item: { 
      id: video.id, 
      type: 'video',
      sourceChapterId: video.chapter_id,
      originalIndex: videoIndex 
    } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    begin: () => {
      ui.startDrag({ 
        id: video.id, 
        type: 'video',
        sourceChapterId: video.chapter_id,
        originalIndex: videoIndex 
      })
    },
    end: () => {
      ui.endDrag()
    }
  })

  const [, drop] = useDrop({
    accept: ItemTypes.VIDEO,
    hover: (draggedItem: DragItem) => {
      if (!draggedItem) return
      
      const dragIndex = draggedItem.originalIndex
      const hoverIndex = videoIndex

      // Moving within same chapter
      if (draggedItem.sourceChapterId === video.chapter_id) {
        if (dragIndex !== hoverIndex) {
          onMoveWithinChapter(chapterIndex, dragIndex, hoverIndex)
          draggedItem.originalIndex = hoverIndex
        }
      }
    }
  })

  return (
    <div ref={drop} className={`${isDragging ? 'opacity-50' : ''}`}>
      <div ref={preview}>
        <div className="flex items-center gap-2">
          <div 
            ref={drag}
            className="cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity"
            title="Drag to reorder video"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

// ===== DROP ZONE FOR CHAPTERS =====
interface ChapterDropZoneProps {
  chapterId: string
  onVideoDrop: (videoId: string, sourceChapterId: string, targetChapterId: string) => void
  children: React.ReactNode
}

export function ChapterDropZone({ chapterId, onVideoDrop, children }: ChapterDropZoneProps) {
  const ui = useCourseCreationUI()
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.VIDEO,
    drop: (draggedItem: DragItem) => {
      if (draggedItem.sourceChapterId !== chapterId) {
        onVideoDrop(draggedItem.id, draggedItem.sourceChapterId!, chapterId)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
    hover: (draggedItem: DragItem) => {
      ui.updateDragTarget({
        id: chapterId,
        type: 'chapter-content',
        chapterId: chapterId
      })
    }
  })

  return (
    <div 
      ref={drop}
      className={`
        ${isOver && canDrop ? 'bg-blue-50 border-blue-200' : ''}
        ${canDrop ? 'border-dashed border-2' : ''}
        transition-all duration-200
      `}
    >
      {children}
    </div>
  )
}

// ===== MAIN DRAG & DROP PROVIDER =====
export function CourseEditDragDropProvider({ children }: { children: React.ReactNode }) {
  return (
    <DndProvider backend={HTML5Backend}>
      {children}
    </DndProvider>
  )
}
```

---

## 6. File Upload & Progress Architecture

### 6.1 Upload Manager Component

**File: `/src/components/course/UploadManager.tsx`**
```typescript
'use client'

import { useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { useVideoUpload } from '@/hooks/use-video-queries'
import type { UploadItem } from '@/types'

interface UploadManagerProps {
  courseId: string
  chapterId: string
  accept?: Record<string, string[]>
  maxSize?: number
  maxFiles?: number
}

export function UploadManager({ 
  courseId, 
  chapterId,
  accept = {
    'video/*': ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv']
  },
  maxSize = 1024 * 1024 * 1024 * 2, // 2GB
  maxFiles = 10
}: UploadManagerProps) {
  
  const ui = useCourseCreationUI()
  const { uploadVideo } = useVideoUpload(courseId)
  
  const chapterUploads = ui.getUploadsByChapter(chapterId)
  const totalProgress = ui.getTotalUploadProgress()
  
  // Handle file drops and selection
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const uploadId = `upload-${Date.now()}-${Math.random()}`
      
      // Add to UI store immediately
      const uploadItem: UploadItem = {
        id: uploadId,
        file,
        filename: file.name,
        chapterId,
        progress: 0,
        status: 'pending'
      }
      
      ui.addUpload(uploadItem)
      
      // Start upload with progress tracking
      uploadVideo({
        file,
        chapterId,
        onProgress: (progress) => {
          ui.updateUploadProgress(uploadId, progress)
        }
      }).then((result) => {
        if (result.success) {
          ui.updateUploadStatus(uploadId, 'complete')
          // Store videoId for later reference
          ui.updateUploadStatus(uploadId, 'complete')
        } else {
          ui.updateUploadStatus(uploadId, 'error', result.error)
        }
      }).catch((error) => {
        ui.updateUploadStatus(uploadId, 'error', error.message)
      })
    })
  }, [chapterId, uploadVideo, ui])
  
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    multiple: true
  })
  
  // Handle upload removal
  const handleRemoveUpload = (uploadId: string) => {
    ui.removeUpload(uploadId)
  }
  
  // Get upload status icon
  const getStatusIcon = (status: UploadItem['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Upload className="h-4 w-4 text-gray-400" />
    }
  }
  
  const activeUploads = chapterUploads.filter(upload => 
    upload.status === 'uploading' || upload.status === 'processing'
  )
  
  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            
            {isDragActive ? (
              <div>
                <p className="text-lg font-medium text-blue-600">Drop videos here</p>
                <p className="text-sm text-blue-500">Release to start uploading</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium">Drag & drop videos here</p>
                <p className="text-sm text-gray-500 mb-4">
                  or click to browse files
                </p>
                <Button variant="outline" size="sm">
                  Select Files
                </Button>
              </div>
            )}
            
            <p className="text-xs text-gray-400 mt-4">
              Supported formats: MP4, MOV, AVI, WMV, FLV, WebM, MKV
              <br />
              Maximum file size: 2GB per file
            </p>
          </div>
          
          {/* File Rejections */}
          {fileRejections.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-red-600">
                Some files were rejected:
              </h4>
              {fileRejections.map(({ file, errors }) => (
                <div key={file.name} className="text-xs text-red-500">
                  <span className="font-medium">{file.name}</span>: {' '}
                  {errors.map(error => error.message).join(', ')}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Upload Progress */}
      {activeUploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upload Progress</span>
              <span className="text-sm font-normal">
                {totalProgress}% Complete
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={totalProgress} className="mb-4" />
            
            <div className="space-y-3">
              {chapterUploads.map(upload => (
                <div key={upload.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {getStatusIcon(upload.status)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">
                        {upload.filename}
                      </span>
                      <span className="text-xs text-gray-500">
                        {upload.progress}%
                      </span>
                    </div>
                    
                    <Progress value={upload.progress} className="h-1" />
                    
                    {upload.error && (
                      <p className="text-xs text-red-500 mt-1">
                        {upload.error}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveUpload(upload.id)}
                    className="h-8 w-8 p-0 hover:bg-red-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Completed Uploads Summary */}
      {chapterUploads.some(u => u.status === 'complete') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Completed Uploads</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={ui.clearCompletedUploads}
              >
                Clear All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {chapterUploads
                .filter(upload => upload.status === 'complete')
                .map(upload => (
                  <div key={upload.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="flex-1">{upload.filename}</span>
                    <span className="text-green-600 font-medium">Complete</span>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## 7. Soft Delete Architecture

### 7.1 Soft Delete Manager

**File: `/src/components/course/SoftDeleteManager.tsx`**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Trash2, Undo } from 'lucide-react'

import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { useVideoDelete } from '@/hooks/use-video-queries'
import { useChaptersEdit } from '@/hooks/use-chapter-queries'
import type { Video, Chapter } from '@/types'

interface SoftDeleteManagerProps {
  courseId: string
  videos: Video[]
  chapters: Chapter[]
}

export function SoftDeleteManager({ courseId, videos, chapters }: SoftDeleteManagerProps) {
  const ui = useCourseCreationUI()
  const { deleteVideo } = useVideoDelete(courseId)
  const { deleteChapter } = useChaptersEdit(courseId)
  
  const [showPendingDeletes, setShowPendingDeletes] = useState(false)
  
  // Get items marked for deletion
  const pendingDeleteVideos = videos.filter(video => 
    ui.pendingDeletes.has(video.id)
  )
  
  const pendingDeleteChapters = chapters.filter(chapter => 
    ui.pendingDeletes.has(chapter.id)
  )
  
  const totalPendingDeletes = pendingDeleteVideos.length + pendingDeleteChapters.length
  
  // Auto-show panel when there are pending deletes
  useEffect(() => {
    if (totalPendingDeletes > 0 && !showPendingDeletes) {
      setShowPendingDeletes(true)
    }
  }, [totalPendingDeletes, showPendingDeletes])
  
  // Handle restoring items
  const handleRestoreVideo = (videoId: string) => {
    ui.unmarkForDeletion(videoId)
  }
  
  const handleRestoreChapter = (chapterId: string) => {
    ui.unmarkForDeletion(chapterId)
  }
  
  // Handle permanent deletion (when save is clicked)
  const handleCommitDeletes = async () => {
    const deletePromises: Promise<any>[] = []
    
    // Delete videos
    pendingDeleteVideos.forEach(video => {
      deletePromises.push(deleteVideo(video.id))
    })
    
    // Delete chapters
    pendingDeleteChapters.forEach(chapter => {
      deletePromises.push(deleteChapter(chapter.id))
    })
    
    try {
      await Promise.all(deletePromises)
      ui.clearPendingDeletes()
      setShowPendingDeletes(false)
    } catch (error) {
      console.error('Failed to delete items:', error)
    }
  }
  
  // Handle canceling all deletes
  const handleCancelAllDeletes = () => {
    ui.clearPendingDeletes()
    setShowPendingDeletes(false)
  }
  
  if (totalPendingDeletes === 0 && !showPendingDeletes) {
    return null
  }
  
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-5 w-5" />
            Pending Deletions
          </CardTitle>
          <Badge variant="outline" className="border-orange-300 text-orange-700">
            {totalPendingDeletes} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-orange-600">
          The following items are marked for deletion. They will be permanently removed 
          when you click "Save Changes".
        </p>
        
        {/* Pending Delete Videos */}
        {pendingDeleteVideos.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-orange-700 mb-2">
              Videos ({pendingDeleteVideos.length})
            </h4>
            <div className="space-y-2">
              {pendingDeleteVideos.map(video => (
                <div key={video.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="text-sm">{video.filename}</span>
                    <Badge variant="secondary" className="text-xs">
                      {chapters.find(c => c.id === video.chapter_id)?.title || 'Unknown Chapter'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestoreVideo(video.id)}
                    className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Undo className="h-3 w-3 mr-1" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Pending Delete Chapters */}
        {pendingDeleteChapters.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-orange-700 mb-2">
              Chapters ({pendingDeleteChapters.length})
            </h4>
            <div className="space-y-2">
              {pendingDeleteChapters.map(chapter => (
                <div key={chapter.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="text-sm">{chapter.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {chapter.videoCount} videos
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestoreChapter(chapter.id)}
                    className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Undo className="h-3 w-3 mr-1" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-orange-200">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelAllDeletes}
            className="text-gray-600"
          >
            Cancel All Deletions
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPendingDeletes(false)}
            >
              Hide
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCommitDeletes}
            >
              Delete Permanently ({totalPendingDeletes})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 8. Integration Testing Architecture

### 8.1 Test Utilities

**File: `/src/test/utils/course-creation-test-utils.tsx`**
```typescript
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

// Create a custom render function that includes all providers
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <DndProvider backend={HTML5Backend}>
          {children}
        </DndProvider>
      </QueryClientProvider>
    )
  }
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: createWrapper(), ...options })

// Mock data factories
export const createMockCourse = (overrides = {}) => ({
  id: 'course-1',
  title: 'Test Course',
  description: 'Test course description',
  price: 99,
  difficulty: 'beginner' as const,
  status: 'draft' as const,
  instructor_id: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

export const createMockChapter = (overrides = {}) => ({
  id: 'chapter-1',
  title: 'Test Chapter',
  courseId: 'course-1',
  order: 0,
  videos: [],
  videoCount: 0,
  ...overrides
})

export const createMockVideo = (overrides = {}) => ({
  id: 'video-1',
  filename: 'test-video.mp4',
  originalFilename: 'test-video.mp4',
  course_id: 'course-1',
  chapter_id: 'chapter-1',
  order: 0,
  duration: 300,
  size: 1024 * 1024 * 100, // 100MB
  format: 'video/mp4',
  status: 'ready' as const,
  backblaze_file_id: 'file-123',
  backblaze_url: 'https://example.com/video.mp4',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

export const createMockFile = (overrides = {}): File => {
  const file = new File(['test content'], 'test-video.mp4', {
    type: 'video/mp4',
    ...overrides
  })
  
  // Add size property that's not normally settable
  Object.defineProperty(file, 'size', {
    value: 1024 * 1024 * 100, // 100MB
    writable: false,
    ...overrides
  })
  
  return file
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { customRender as render }
```

### 8.2 Integration Test Suite

**File: `/src/test/integration/course-creation-flow.test.tsx`**
```typescript
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { server } from '../mocks/server'
import { rest } from 'msw'
import { render, createMockCourse, createMockFile } from '../utils/course-creation-test-utils'
import { CourseCreationWizard } from '@/components/course/CourseCreationWizard'
import { useCourseCreationUI } from '@/stores/course-creation-ui'

// Reset Zustand store before each test
beforeEach(() => {
  const { clearForm } = useCourseCreationUI.getState()
  clearForm()
})

describe('Course Creation Flow', () => {
  it('should complete the full course creation wizard', async () => {
    // Mock successful API responses
    server.use(
      rest.post('/api/courses', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          data: createMockCourse({ id: 'new-course-123' })
        }))
      }),
      rest.post('/api/videos/upload', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          data: {
            video: createMockVideo({ id: 'new-video-123' }),
            uploadUrl: 'https://upload.example.com',
            fileId: 'file-123'
          }
        }))
      })
    )

    render(<CourseCreationWizard />)

    // ===== STEP 1: Basic Info =====
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    
    // Fill basic course info
    fireEvent.change(screen.getByLabelText(/course title/i), {
      target: { value: 'My Test Course' }
    })
    
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'This is a test course description' }
    })
    
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: '99' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // ===== STEP 2: Structure =====
    await waitFor(() => {
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
    })
    
    // Add a chapter
    fireEvent.click(screen.getByRole('button', { name: /add chapter/i }))
    
    const chapterInput = screen.getByPlaceholderText(/chapter title/i)
    fireEvent.change(chapterInput, {
      target: { value: 'Introduction' }
    })
    
    fireEvent.keyDown(chapterInput, { key: 'Enter' })
    
    expect(screen.getByText('Introduction')).toBeInTheDocument()
    
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // ===== STEP 3: Upload =====
    await waitFor(() => {
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
    })
    
    // Upload a video
    const fileInput = screen.getByLabelText(/upload videos/i)
    const testFile = createMockFile({ name: 'intro-video.mp4' })
    
    fireEvent.change(fileInput, {
      target: { files: [testFile] }
    })
    
    // Wait for upload progress to appear
    await waitFor(() => {
      expect(screen.getByText('Upload Progress')).toBeInTheDocument()
    })
    
    // Wait for upload to complete
    await waitFor(() => {
      expect(screen.getByText(/complete/i)).toBeInTheDocument()
    }, { timeout: 5000 })
    
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    // ===== STEP 4: Review & Create =====
    await waitFor(() => {
      expect(screen.getByText('Step 4 of 4')).toBeInTheDocument()
    })
    
    // Verify course details are displayed
    expect(screen.getByText('My Test Course')).toBeInTheDocument()
    expect(screen.getByText('This is a test course description')).toBeInTheDocument()
    expect(screen.getByText('$99')).toBeInTheDocument()
    expect(screen.getByText('Introduction')).toBeInTheDocument()
    expect(screen.getByText('intro-video.mp4')).toBeInTheDocument()
    
    // Create the course
    const createButton = screen.getByRole('button', { name: /create course/i })
    fireEvent.click(createButton)
    
    // Wait for creation to complete
    await waitFor(() => {
      expect(screen.getByText(/creating/i)).toBeInTheDocument()
    })
    
    // Should redirect after successful creation
    await waitFor(() => {
      expect(window.location.pathname).toBe('/instructor/course/new-course-123/edit')
    }, { timeout: 3000 })
  })
  
  it('should handle drag and drop reordering', async () => {
    // Setup with multiple chapters and videos
    const { updateFormData } = useCourseCreationUI.getState()
    
    updateFormData('plannedChapters', [
      {
        id: 'chapter-1',
        title: 'Chapter 1',
        plannedVideos: [
          { filename: 'video-1.mp4', file: createMockFile({ name: 'video-1.mp4' }) },
          { filename: 'video-2.mp4', file: createMockFile({ name: 'video-2.mp4' }) }
        ]
      },
      {
        id: 'chapter-2',
        title: 'Chapter 2',
        plannedVideos: [
          { filename: 'video-3.mp4', file: createMockFile({ name: 'video-3.mp4' }) }
        ]
      }
    ])
    
    render(<CourseCreationWizard />)
    
    // Navigate to structure step
    fireEvent.click(screen.getByRole('button', { name: /next/i })) // Skip step 1
    
    await waitFor(() => {
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
    })
    
    // Get drag handles
    const chapterDragHandles = screen.getAllByLabelText(/drag to reorder chapter/i)
    const videoDragHandles = screen.getAllByLabelText(/drag to reorder video/i)
    
    expect(chapterDragHandles).toHaveLength(2)
    expect(videoDragHandles).toHaveLength(3)
    
    // Test chapter reordering (simplified - actual DnD testing requires more setup)
    const chapter1 = screen.getByText('Chapter 1')
    const chapter2 = screen.getByText('Chapter 2')
    
    // Verify initial order
    expect(chapter1.compareDocumentPosition(chapter2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    
    // TODO: Implement actual drag and drop simulation
    // This would require more complex setup with testing-library/user-event
    // and proper DnD testing utilities
  })
  
  it('should handle upload errors gracefully', async () => {
    // Mock upload failure
    server.use(
      rest.post('/api/videos/upload', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({
          success: false,
          error: 'Upload server temporarily unavailable'
        }))
      })
    )
    
    render(<CourseCreationWizard />)
    
    // Navigate to upload step
    fireEvent.click(screen.getByRole('button', { name: /next/i })) // Skip step 1
    fireEvent.click(screen.getByRole('button', { name: /next/i })) // Skip step 2
    
    await waitFor(() => {
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
    })
    
    // Try to upload a video
    const fileInput = screen.getByLabelText(/upload videos/i)
    const testFile = createMockFile({ name: 'test-video.mp4' })
    
    fireEvent.change(fileInput, {
      target: { files: [testFile] }
    })
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/upload server temporarily unavailable/i)).toBeInTheDocument()
    })
    
    // Should show error icon
    expect(screen.getByTestId('upload-error-icon')).toBeInTheDocument()
    
    // Should allow retry
    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
  })
  
  it('should handle soft deletes correctly', async () => {
    render(<CourseCreationWizard />)
    
    // Setup some content
    // ... (similar to previous tests)
    
    // Mark item for deletion
    const deleteButton = screen.getByLabelText(/delete video/i)
    fireEvent.click(deleteButton)
    
    // Should show in pending deletes
    await waitFor(() => {
      expect(screen.getByText(/pending deletions/i)).toBeInTheDocument()
    })
    
    // Should be able to restore
    const restoreButton = screen.getByRole('button', { name: /restore/i })
    fireEvent.click(restoreButton)
    
    // Should no longer be in pending deletes
    await waitFor(() => {
      expect(screen.queryByText(/pending deletions/i)).not.toBeInTheDocument()
    })
  })
})
```

---

## 9. Implementation Success Criteria

### 9.1 Functional Requirements
- ✅ **SSOT Compliance**: All server data flows through TanStack Query only
- ✅ **UI State Separation**: All UI state managed by Zustand only  
- ✅ **Optimistic Updates**: Instant UI feedback with proper rollback
- ✅ **Drag & Drop**: Smooth reordering of chapters and videos
- ✅ **File Upload**: Progress tracking with Backblaze integration
- ✅ **Soft Deletes**: Items marked for deletion until save
- ✅ **Form Validation**: Comprehensive validation at each step
- ✅ **Error Handling**: Graceful error recovery with user feedback

### 9.2 Performance Requirements
- ✅ **UI Responsiveness**: < 100ms for all interactions
- ✅ **Upload Performance**: Concurrent uploads with progress tracking
- ✅ **Memory Management**: No memory leaks in long-running sessions
- ✅ **Bundle Size**: Minimize bundle impact of new features
- ✅ **Cache Efficiency**: Optimal TanStack Query cache utilization

### 9.3 Testing Requirements
- ✅ **Unit Tests**: 90%+ coverage for all hooks and utilities
- ✅ **Integration Tests**: Complete user flows tested
- ✅ **E2E Tests**: Full course creation wizard automated
- ✅ **Performance Tests**: Load testing for upload scenarios
- ✅ **Accessibility Tests**: WCAG 2.1 AA compliance

### 9.4 Code Quality Requirements
- ✅ **TypeScript**: Strict typing for all components and hooks
- ✅ **ESLint**: Zero linting errors or warnings
- ✅ **Prettier**: Consistent code formatting
- ✅ **Documentation**: Comprehensive JSDoc comments
- ✅ **Git Strategy**: Clean commit history with conventional commits

---

## 10. Migration Path & Mandatory Approval Checkpoints

### 10.1 Phase 1: Foundation Files (Low Risk)
**Timeline: Week 1-2**

**What to build:**
1. **Create Zustand Store Files**
   - Copy `useCourseCreationUI` store from Section 3.1 → `/src/stores/course-creation-ui.ts`
   - Copy type definitions from Section 2 → `/src/types/course.ts`, `/src/types/api.ts`, `/src/types/ui.ts`
   - Write unit tests for all store methods

2. **Create TanStack Query Hook Files**
   - Copy `useCourseCreation` hook from Section 4.1 → `/src/hooks/use-course-queries.ts`
   - Copy `useChaptersEdit` hook from Section 4.2 → `/src/hooks/use-chapter-queries.ts`
   - Copy `useVideoUpload` hook from Section 4.3 → `/src/hooks/use-video-queries.ts`
   - Set up mock server responses for testing

3. **Create Testing Infrastructure**
   - Copy test utilities from Section 8.1 → `/src/test/utils/course-creation-test-utils.tsx`
   - Write unit tests for all hooks with mock data
   - Ensure all tests pass

**What NOT to build yet:**
- ❌ No UI components
- ❌ No drag & drop
- ❌ No real API integration
- ❌ No wizard pages

**Deliverables for Approval:**
- All store methods work (can set editing state, form data, uploads)
- All hooks return mock data correctly
- All unit tests pass (90%+ coverage)
- TypeScript compilation with zero errors

🛑 **MANDATORY CHECKPOINT 1**
**DO NOT START PHASE 2 UNTIL MAHTAB EXPLICITLY APPROVES**

**Review Criteria:**
1. Demo all Zustand store methods working in isolation
2. Show TanStack hooks returning mock course/chapter/video data
3. Show all tests passing with coverage report
4. Confirm TypeScript compilation is clean
5. Show file structure matches blueprint exactly

---

### 10.2 Phase 2: UI Components (Medium Risk)
**Timeline: Week 3-4**
**⚠️ REQUIRES CHECKPOINT 1 APPROVAL TO START**

**What to build:**
1. **Course Creation Wizard Shell**
   - Copy `CourseCreationWizard` from Section 5.1 → `/src/components/course/CourseCreationWizard.tsx`
   - Build step navigation and progress indicators
   - Connect to Zustand store (no TanStack integration yet)

2. **Individual Step Components**
   - Build `CourseBasicInfoStep` (form fields only)
   - Build `CourseStructureStep` (chapter management UI)
   - Build `CourseUploadStep` (file dropzone without real upload)
   - Build `CourseReviewStep` (summary display)

3. **Drag & Drop Foundation**
   - Copy `DragDropManager` from Section 5.2 → `/src/components/course/DragDropManager.tsx`
   - Implement visual drag & drop (no data persistence yet)
   - Test chapter and video reordering in UI only

**What NOT to build yet:**
- ❌ No real API calls
- ❌ No file upload to Backblaze
- ❌ No database integration
- ❌ No connection to existing course editing

**Deliverables for Approval:**
- Complete wizard UI with all 4 steps functional
- Drag & drop working visually (shows reordered items)
- Form validation working on all inputs
- All components using Zustand store correctly

🛑 **MANDATORY CHECKPOINT 2**
**DO NOT START PHASE 3 UNTIL MAHTAB EXPLICITLY APPROVES**

**Review Criteria:**
1. Demo complete wizard flow (4 steps) with form data persistence
2. Show drag & drop reordering of chapters and videos
3. Show form validation errors and success states
4. Confirm all UI components match existing design system
5. Show responsive design working on mobile/desktop

---

### 10.3 Phase 3: Full Integration (High Risk)
**Timeline: Week 5-6**
**⚠️ REQUIRES CHECKPOINT 2 APPROVAL TO START**

**What to build:**
1. **Connect TanStack Query to UI**
   - Replace mock data with real TanStack Query hooks
   - Implement optimistic updates for all mutations
   - Add error handling and rollback for failed operations

2. **File Upload Integration**
   - Copy `UploadManager` from Section 6.1 → `/src/components/course/UploadManager.tsx`
   - Connect to Backblaze upload service
   - Implement progress tracking in Zustand store
   - Handle upload errors and retries

3. **Soft Delete System**
   - Copy `SoftDeleteManager` from Section 7.1 → `/src/components/course/SoftDeleteManager.tsx`
   - Implement pending deletes with restore functionality
   - Connect to database soft delete actions

4. **Integration with Existing Course Editing**
   - Connect wizard to existing `/instructor/course/[id]/edit` route
   - Ensure data flows correctly between creation and editing
   - Test all optimistic updates work correctly

**What to test thoroughly:**
- ✅ Create course → Edit course flow
- ✅ File upload → Progress tracking → Success/Error
- ✅ Drag & drop → Database persistence → UI updates  
- ✅ Soft deletes → Restore → Permanent deletion
- ✅ Error scenarios → Rollback → User feedback

**Deliverables for Approval:**
- Complete end-to-end course creation flow working
- File uploads to Backblaze succeeding
- All optimistic updates working with proper rollback
- Soft delete/restore cycle working correctly
- Zero breaking changes to existing functionality

🛑 **MANDATORY CHECKPOINT 3**
**DO NOT START PHASE 4 UNTIL MAHTAB EXTENSIVELY TESTS AND APPROVES**

**Review Criteria:**
1. Demo complete course creation: Basic info → Structure → Upload → Live course
2. Show file upload with real progress bars and Backblaze storage
3. Demonstrate error handling: Network fails → UI rolls back gracefully
4. Show soft delete/restore working with database persistence
5. Confirm existing course editing still works perfectly
6. Performance testing: No memory leaks, fast UI responses

---

### 10.4 Phase 4: Production Deployment (Monitored Risk)
**Timeline: Week 7**
**⚠️ REQUIRES CHECKPOINT 3 APPROVAL TO START**

**What to deploy:**
1. **Feature Flag Deployment**
   - Deploy behind feature flag (`ENABLE_NEW_COURSE_CREATION=false`)
   - Set up monitoring for errors, performance metrics
   - Create rollback procedures

2. **Beta Testing**
   - Enable for test accounts only
   - Monitor user behavior and error rates
   - Collect feedback on user experience

3. **Gradual Rollout**
   - 10% of users → Monitor 24 hours
   - 50% of users → Monitor 48 hours  
   - 100% of users → Monitor 1 week

**Monitoring Requirements:**
- Error rate < 0.1%
- Upload success rate > 99%
- UI response time < 100ms
- Memory usage stable

**Deliverables for Approval:**
- Feature flag deployment successful
- Beta user feedback positive
- All monitoring metrics within acceptable ranges
- Rollback procedures tested and ready

🛑 **MANDATORY CHECKPOINT 4**
**DO NOT ENABLE FOR ALL USERS UNTIL MAHTAB APPROVES PRODUCTION METRICS**

**Review Criteria:**
1. Show production monitoring dashboard with all green metrics
2. Demonstrate feature flag toggle working (enable/disable instantly)
3. Show beta user feedback and usage analytics
4. Confirm rollback procedures work (test in staging)
5. Review any production issues and resolutions

---

## Emergency Stop Procedures

**If any issues arise during implementation:**

1. **STOP immediately** - Do not proceed to next phase
2. **Document the issue** with screenshots, error logs, steps to reproduce
3. **Create rollback plan** - How to return to previous working state
4. **Schedule review session** with Mahtab before continuing
5. **Do not make "quick fixes"** without approval

## Success Metrics for Each Phase

**Phase 1 Success:**
- All tests passing (90%+ coverage)
- TypeScript compilation clean
- Store/hook functionality demonstrated

**Phase 2 Success:**  
- Complete UI workflow functional
- Drag & drop working smoothly
- Form validation comprehensive

**Phase 3 Success:**
- End-to-end flow working perfectly
- All optimistic updates + rollbacks working
- No breaking changes to existing features

**Phase 4 Success:**
- Production deployment stable
- User adoption metrics positive  
- Error rates within acceptable limits

This phased approach with mandatory checkpoints ensures quality at every step and prevents moving forward with unresolved issues.

This architecture blueprint provides the complete foundation for building a robust, scalable course creation system with modern React patterns, comprehensive error handling, and excellent developer experience.
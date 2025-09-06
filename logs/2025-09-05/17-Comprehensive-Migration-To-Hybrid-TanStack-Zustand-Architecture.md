# Comprehensive Migration: Anti-Patterns → Modern Hybrid Architecture

**Target Architecture**: TanStack Query + Server Actions + Minimal Zustand UI State

## Executive Summary

**Current Problem**: Dual state management with complex synchronization
**Solution**: Hybrid architecture separating server state from UI state
**Timeline**: 4-5 days with comprehensive feature-by-feature migration
**Risk**: Low (incremental with rollback points)
**Reward**: 70% code reduction, eliminate state sync bugs, modern architecture

---

## Current State Analysis

### Existing Anti-Patterns to Eliminate

#### 1. Dual State Management Systems
```typescript
// CURRENT PROBLEM:
interface AppStore extends 
  CourseCreationSlice,      // 560+ lines - server data + UI state mixed
  NormalizedCourseSlice     // 431+ lines - server data + UI state mixed
{}

// Both slices try to manage:
- Course data (server state)
- Video data (server state) 
- Upload queues (mixed server/UI state)
- Save operations (server operations)
- UI flags (pure UI state)
```

#### 2. Manual State Synchronization
```typescript
// ANTI-PATTERN: Manual sync between states
saveDraft: async () => {
  // Update old state
  set(state => ({ courseCreation: {...} }))
  // ALSO update normalized state  
  set(state => ({ normalizedState: {...} }))
  // Try to keep them in sync manually
}
```

#### 3. Server Data in Client State
```typescript
// ANTI-PATTERN: Server data stored in Zustand
interface NormalizedState {
  courses: Record<string, Course>    // Should be in TanStack Query cache
  videos: Record<string, Video>      // Should be in TanStack Query cache  
  chapters: Record<string, Chapter>  // Should be in TanStack Query cache
}
```

#### 4. Complex Selectors and Denormalization
```typescript
// ANTI-PATTERN: Complex selectors recreating denormalized views
const getCourseWithChaptersAndVideos = (state, courseId) => {
  const course = state.courses[courseId]
  const chapters = Object.values(state.chapters)
    .filter(ch => ch.courseId === courseId)
    .map(ch => ({
      ...ch,
      videos: ch.videoIds.map(id => state.videos[id])
    }))
  return { ...course, chapters }
}
```

#### 5. Mixed API Routes and Server Actions
```typescript
// INCONSISTENT: Some operations use API routes, others use server actions
fetch('/api/upload', { method: 'POST' })           // API route
await saveCourseAction(courseData)                  // Server action
```

---

## Target Hybrid Architecture

### Clear Separation of Concerns

```typescript
// SERVER STATE: Managed by TanStack Query + Server Actions
- Course data fetching/caching
- Video upload/management  
- User authentication state
- All database operations

// UI STATE: Managed by Minimal Zustand
- Wizard step navigation
- Modal visibility
- Upload progress indicators
- Form validation states
- Temporary/transient state

// PERSISTENCE: Automatic via Next.js + TanStack Query
- Server state cached automatically
- Revalidation on mutations
- Background refetching
- Optimistic updates
```

---

## Feature-by-Feature Migration Plan

### Phase 1: Server Actions Foundation (Day 1)

#### 1.1 Course Operations
**Current State**: Mixed in course-creation-slice.ts
```typescript
// MIGRATE FROM:
setCourseInfo: (info) => {
  set(state => ({ courseCreation: { ...state.courseCreation, ...info }}))
}

saveDraft: async () => {
  const { courseCreation } = get()
  const response = await fetch('/api/courses', {
    method: 'POST',
    body: JSON.stringify(courseCreation)
  })
}
```

**MIGRATE TO**: Pure server actions
```typescript
// app/actions/course-actions.ts
'use server'

export async function createCourseAction(data: Partial<Course>) {
  const user = await requireAuth()
  
  const course = await db.courses.create({
    data: {
      id: crypto.randomUUID(),
      title: data.title || '',
      description: data.description || '',
      userId: user.id,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    }
  })
  
  revalidatePath('/instructor/courses')
  revalidatePath(`/instructor/course/${course.id}`)
  
  return { success: true, course }
}

export async function updateCourseAction(id: string, data: Partial<Course>) {
  const user = await requireAuth()
  
  const course = await db.courses.update({
    where: { id, userId: user.id },
    data: { ...data, updatedAt: new Date() }
  })
  
  revalidatePath(`/instructor/course/${id}`)
  
  return { success: true, course }
}

export async function getCourseAction(id: string) {
  const user = await requireAuth()
  
  const course = await db.courses.findFirst({
    where: { id, userId: user.id },
    include: {
      videos: {
        orderBy: { order: 'asc' }
      }
    }
  })
  
  if (!course) throw new Error('Course not found')
  return course
}

export async function deleteCourseAction(id: string) {
  const user = await requireAuth()
  
  // Delete associated videos from Backblaze
  const course = await db.courses.findFirst({
    where: { id, userId: user.id },
    include: { videos: true }
  })
  
  for (const video of course.videos) {
    if (video.backblazeFileId) {
      await backblazeService.deleteFile(video.backblazeFileId)
    }
  }
  
  await db.courses.delete({ where: { id, userId: user.id } })
  
  revalidatePath('/instructor/courses')
  
  return { success: true }
}
```

#### 1.2 Video Operations  
**Current State**: Mixed across multiple slices and API routes
```typescript
// MIGRATE FROM: Multiple locations
addVideosToQueue: (files) => { /* complex queue logic */ }
updateVideoProgress: (id, progress) => { /* manual progress tracking */ }
removeVideo: async (id) => { 
  // Update UI state
  // Call API route
  // Try to sync states
}
```

**MIGRATE TO**: Clean server actions
```typescript
// app/actions/video-actions.ts
'use server'

export async function uploadVideoAction(
  file: File, 
  courseId: string, 
  chapterId: string = 'chapter-1'
) {
  const user = await requireAuth()
  
  // Verify course ownership
  const course = await db.courses.findFirst({
    where: { id: courseId, userId: user.id }
  })
  if (!course) throw new Error('Course not found')
  
  // Upload to Backblaze
  const uploadResult = await backblazeService.upload(file)
  
  // Get next order position
  const lastVideo = await db.videos.findFirst({
    where: { courseId, chapterId },
    orderBy: { order: 'desc' }
  })
  
  // Create video record
  const video = await db.videos.create({
    data: {
      id: crypto.randomUUID(),
      name: file.name,
      url: uploadResult.url,
      backblazeFileId: uploadResult.fileId,
      courseId,
      chapterId,
      order: (lastVideo?.order || 0) + 1,
      size: file.size,
      status: 'ready',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })
  
  revalidatePath(`/instructor/course/${courseId}`)
  
  return { success: true, video }
}

export async function deleteVideoAction(id: string) {
  const user = await requireAuth()
  
  const video = await db.videos.findFirst({
    where: { 
      id,
      course: { userId: user.id }
    },
    include: { course: true }
  })
  
  if (!video) throw new Error('Video not found')
  
  // Delete from Backblaze
  if (video.backblazeFileId) {
    await backblazeService.deleteFile(video.backblazeFileId)
  }
  
  // Delete from database
  await db.videos.delete({ where: { id } })
  
  revalidatePath(`/instructor/course/${video.courseId}`)
  
  return { success: true }
}

export async function reorderVideosAction(
  courseId: string,
  chapterId: string, 
  videoIds: string[]
) {
  const user = await requireAuth()
  
  // Verify course ownership
  const course = await db.courses.findFirst({
    where: { id: courseId, userId: user.id }
  })
  if (!course) throw new Error('Course not found')
  
  // Update order for each video
  const updates = videoIds.map((videoId, index) => 
    db.videos.update({
      where: { id: videoId },
      data: { order: index }
    })
  )
  
  await db.$transaction(updates)
  
  revalidatePath(`/instructor/course/${courseId}`)
  
  return { success: true }
}

export async function moveVideoToChapterAction(
  videoId: string,
  newChapterId: string,
  newOrder: number
) {
  const user = await requireAuth()
  
  const video = await db.videos.findFirst({
    where: { 
      id: videoId,
      course: { userId: user.id }
    }
  })
  
  if (!video) throw new Error('Video not found')
  
  await db.videos.update({
    where: { id: videoId },
    data: { 
      chapterId: newChapterId,
      order: newOrder 
    }
  })
  
  revalidatePath(`/instructor/course/${video.courseId}`)
  
  return { success: true }
}
```

#### 1.3 Chapter Operations (Virtual)
**Current State**: Complex nested data structures
```typescript
// MIGRATE FROM: Complex chapter management
createChapter: (title) => {
  const id = crypto.randomUUID()
  set(state => ({
    courseCreation: {
      ...state.courseCreation,
      chapters: [...state.courseCreation.chapters, { id, title, videos: [] }]
    }
  }))
}
```

**MIGRATE TO**: Simple virtual chapter helpers
```typescript
// app/actions/chapter-actions.ts
'use server'

export async function getChaptersForCourseAction(courseId: string) {
  const user = await requireAuth()
  
  const videos = await db.videos.findMany({
    where: { 
      courseId,
      course: { userId: user.id }
    },
    orderBy: { order: 'asc' }
  })
  
  // Group by virtual chapter
  const chaptersMap = videos.reduce((acc, video) => {
    if (!acc[video.chapterId]) {
      acc[video.chapterId] = {
        id: video.chapterId,
        title: `Chapter ${video.chapterId.split('-')[1] || '1'}`,
        videos: []
      }
    }
    acc[video.chapterId].videos.push(video)
    return acc
  }, {} as Record<string, any>)
  
  return Object.values(chaptersMap)
}

export async function deleteChapterAction(courseId: string, chapterId: string) {
  const user = await requireAuth()
  
  // Delete all videos in this chapter
  const videos = await db.videos.findMany({
    where: { 
      courseId,
      chapterId,
      course: { userId: user.id }
    }
  })
  
  // Delete from Backblaze
  for (const video of videos) {
    if (video.backblazeFileId) {
      await backblazeService.deleteFile(video.backblazeFileId)
    }
  }
  
  // Delete from database
  await db.videos.deleteMany({
    where: { courseId, chapterId }
  })
  
  revalidatePath(`/instructor/course/${courseId}`)
  
  return { success: true }
}
```

#### 📍 **CHECKPOINT 1A**: Server Actions Complete
- [ ] All course operations via server actions
- [ ] All video operations via server actions  
- [ ] Virtual chapter helpers created
- [ ] No API routes for internal operations
- [ ] All actions have proper auth + error handling

---

### Phase 2: TanStack Query Setup (Day 1-2)

#### 2.1 Install and Configure TanStack Query
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

```typescript
// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000,   // 10 minutes
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

#### 2.2 Create Query Hooks
```typescript
// hooks/use-course-queries.ts
import { useQuery } from '@tanstack/react-query'
import { 
  getCourseAction,
  getCoursesAction,
  getChaptersForCourseAction 
} from '@/app/actions/course-actions'

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getCourseAction(courseId),
    enabled: !!courseId,
  })
}

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => getCoursesAction(),
  })
}

export function useChapters(courseId: string) {
  return useQuery({
    queryKey: ['chapters', courseId],
    queryFn: () => getChaptersForCourseAction(courseId),
    enabled: !!courseId,
  })
}

// hooks/use-video-queries.ts
import { useQuery } from '@tanstack/react-query'
import { getVideosForChapterAction } from '@/app/actions/video-actions'

export function useVideos(courseId: string, chapterId?: string) {
  return useQuery({
    queryKey: ['videos', courseId, chapterId],
    queryFn: () => getVideosForChapterAction(courseId, chapterId),
    enabled: !!courseId,
  })
}
```

#### 2.3 Create Mutation Hooks
```typescript
// hooks/use-course-mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  createCourseAction,
  updateCourseAction,
  deleteCourseAction 
} from '@/app/actions/course-actions'

export function useCourseMutations() {
  const queryClient = useQueryClient()
  
  const createCourse = useMutation({
    mutationFn: createCourseAction,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.setQueryData(['course', result.course.id], result.course)
    }
  })
  
  const updateCourse = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      updateCourseAction(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['course', id] })
      
      // Snapshot previous value
      const previousCourse = queryClient.getQueryData(['course', id])
      
      // Optimistically update
      queryClient.setQueryData(['course', id], (old: any) => ({
        ...old,
        ...data
      }))
      
      return { previousCourse }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousCourse) {
        queryClient.setQueryData(['course', variables.id], context.previousCourse)
      }
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.setQueryData(['course', variables.id], result.course)
    }
  })
  
  const deleteCourse = useMutation({
    mutationFn: deleteCourseAction,
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.removeQueries({ queryKey: ['course', courseId] })
    }
  })
  
  return { createCourse, updateCourse, deleteCourse }
}

// hooks/use-video-mutations.ts  
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  uploadVideoAction,
  deleteVideoAction,
  reorderVideosAction,
  moveVideoToChapterAction
} from '@/app/actions/video-actions'

export function useVideoMutations(courseId: string) {
  const queryClient = useQueryClient()
  
  const uploadVideo = useMutation({
    mutationFn: ({ file, chapterId }: { file: File, chapterId: string }) => 
      uploadVideoAction(file, courseId, chapterId),
    onMutate: async ({ file, chapterId }) => {
      // Add optimistic video
      const tempId = `temp-${Date.now()}`
      const optimisticVideo = {
        id: tempId,
        name: file.name,
        size: file.size,
        chapterId,
        status: 'uploading',
        progress: 0
      }
      
      queryClient.setQueryData(['videos', courseId, chapterId], (old: any[]) => [
        ...(old || []),
        optimisticVideo
      ])
      
      return { tempId }
    },
    onSuccess: (result, variables, context) => {
      // Replace optimistic with real data
      queryClient.setQueryData(['videos', courseId, variables.chapterId], (old: any[]) =>
        old?.map(v => v.id === context?.tempId ? result.video : v) || [result.video]
      )
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
    },
    onError: (err, variables, context) => {
      // Remove optimistic video on error
      queryClient.setQueryData(['videos', courseId, variables.chapterId], (old: any[]) =>
        old?.filter(v => v.id !== context?.tempId) || []
      )
    }
  })
  
  const deleteVideo = useMutation({
    mutationFn: deleteVideoAction,
    onMutate: async (videoId) => {
      // Optimistically remove video
      queryClient.setQueriesData({ queryKey: ['videos', courseId] }, (old: any[]) =>
        old?.filter(v => v.id !== videoId) || []
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', courseId] })
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
    }
  })
  
  const reorderVideos = useMutation({
    mutationFn: ({ chapterId, videoIds }: { chapterId: string, videoIds: string[] }) =>
      reorderVideosAction(courseId, chapterId, videoIds),
    onMutate: async ({ chapterId, videoIds }) => {
      // Optimistically reorder
      queryClient.setQueryData(['videos', courseId, chapterId], (old: any[]) => {
        if (!old) return []
        const videosMap = Object.fromEntries(old.map(v => [v.id, v]))
        return videoIds.map((id, index) => ({ 
          ...videosMap[id], 
          order: index 
        }))
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['videos', courseId] })
    }
  })
  
  return { uploadVideo, deleteVideo, reorderVideos }
}
```

#### 📍 **CHECKPOINT 2A**: TanStack Query Setup
- [ ] TanStack Query installed and configured
- [ ] Query hooks for courses, chapters, videos
- [ ] Mutation hooks with optimistic updates
- [ ] Error handling and rollbacks
- [ ] DevTools working

---

### Phase 3: Minimal UI State Slice (Day 2)

#### 3.1 Create Minimal UI-Only Zustand Slice
**Current State**: Mixed UI and server state
```typescript
// ELIMINATE THESE from Zustand:
courses: Record<string, Course>        // → TanStack Query
videos: Record<string, Video>          // → TanStack Query  
uploadQueue: VideoUpload[]            // → TanStack Query mutations
saveDraft: () => Promise<void>        // → Server actions
courseCreation: CourseCreationData    // → TanStack Query
```

**KEEP ONLY**: Pure UI state
```typescript
// stores/ui-slice.ts
import { StateCreator } from 'zustand'

export interface UIState {
  // Wizard Navigation
  currentWizardStep: 'info' | 'content' | 'review'
  
  // Modal Management
  activeModals: string[]
  modalData: Record<string, any>
  
  // Upload Progress (transient UI state)
  uploadProgress: Record<string, number>
  
  // Form States
  formErrors: Record<string, string[]>
  formTouched: Record<string, boolean>
  
  // Loading States (local only, not server loading)
  isWizardTransitioning: boolean
  
  // Preferences (will be persisted)
  autoSave: boolean
  theme: 'light' | 'dark'
  sidebarCollapsed: boolean
}

export interface UIActions {
  // Wizard
  setWizardStep: (step: UIState['currentWizardStep']) => void
  nextWizardStep: () => void
  prevWizardStep: () => void
  
  // Modals
  openModal: (modalId: string, data?: any) => void
  closeModal: (modalId: string) => void
  closeAllModals: () => void
  
  // Upload Progress
  setUploadProgress: (videoId: string, progress: number) => void
  clearUploadProgress: (videoId: string) => void
  
  // Form Management
  setFormError: (field: string, errors: string[]) => void
  clearFormErrors: () => void
  setFormTouched: (field: string, touched: boolean) => void
  
  // Preferences
  toggleAutoSave: () => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleSidebar: () => void
  
  // Reset
  resetUI: () => void
}

export interface UISlice extends UIState, UIActions {}

const initialUIState: UIState = {
  currentWizardStep: 'info',
  activeModals: [],
  modalData: {},
  uploadProgress: {},
  formErrors: {},
  formTouched: {},
  isWizardTransitioning: false,
  autoSave: true,
  theme: 'light',
  sidebarCollapsed: false,
}

export const createUISlice: StateCreator<UISlice> = (set, get) => ({
  ...initialUIState,
  
  // Wizard
  setWizardStep: (step) => set({ currentWizardStep: step }),
  
  nextWizardStep: () => set((state) => {
    const steps: UIState['currentWizardStep'][] = ['info', 'content', 'review']
    const currentIndex = steps.indexOf(state.currentWizardStep)
    const nextIndex = Math.min(currentIndex + 1, steps.length - 1)
    return { currentWizardStep: steps[nextIndex] }
  }),
  
  prevWizardStep: () => set((state) => {
    const steps: UIState['currentWizardStep'][] = ['info', 'content', 'review']
    const currentIndex = steps.indexOf(state.currentWizardStep)
    const prevIndex = Math.max(currentIndex - 1, 0)
    return { currentWizardStep: steps[prevIndex] }
  }),
  
  // Modals
  openModal: (modalId, data) => set((state) => ({
    activeModals: [...state.activeModals, modalId],
    modalData: { ...state.modalData, [modalId]: data }
  })),
  
  closeModal: (modalId) => set((state) => ({
    activeModals: state.activeModals.filter(id => id !== modalId),
    modalData: { ...state.modalData, [modalId]: undefined }
  })),
  
  closeAllModals: () => set({ activeModals: [], modalData: {} }),
  
  // Upload Progress
  setUploadProgress: (videoId, progress) => set((state) => ({
    uploadProgress: { ...state.uploadProgress, [videoId]: progress }
  })),
  
  clearUploadProgress: (videoId) => set((state) => {
    const { [videoId]: _, ...rest } = state.uploadProgress
    return { uploadProgress: rest }
  }),
  
  // Form Management
  setFormError: (field, errors) => set((state) => ({
    formErrors: { ...state.formErrors, [field]: errors }
  })),
  
  clearFormErrors: () => set({ formErrors: {} }),
  
  setFormTouched: (field, touched) => set((state) => ({
    formTouched: { ...state.formTouched, [field]: touched }
  })),
  
  // Preferences
  toggleAutoSave: () => set((state) => ({ autoSave: !state.autoSave })),
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  // Reset
  resetUI: () => set(initialUIState),
})

// stores/app-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UISlice, createUISlice } from './ui-slice'

export interface AppStore extends UISlice {}

export const useAppStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createUISlice(...args),
    }),
    {
      name: 'unpuzzle-ui-state',
      partialize: (state) => ({
        // Only persist preferences, not transient state
        autoSave: state.autoSave,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
```

#### 📍 **CHECKPOINT 3A**: UI Slice Created
- [ ] Minimal UI-only Zustand slice  
- [ ] No server data in Zustand
- [ ] Proper state persistence for preferences
- [ ] All UI operations covered

---

### Phase 4: Component Migration (Day 2-3)

#### 4.1 Course Edit Page Migration
**File**: `/app/instructor/course/[id]/edit/page.tsx`

**BEFORE**: Complex state management
```typescript
// CURRENT ANTI-PATTERN:
export default function CourseEditPage({ params }: { params: { id: string } }) {
  // Multiple state sources
  const courseCreation = useAppStore(state => state.courseCreation)
  const normalizedState = useAppStore(state => state.normalizedState)
  const uploadQueue = useAppStore(state => state.uploadQueue)
  
  // Multiple methods from different slices
  const setCourseInfo = useAppStore(state => state.setCourseInfo)
  const saveDraft = useAppStore(state => state.saveDraft)
  const addVideosToQueue = useAppStore(state => state.addVideosToQueue)
  
  // Manual loading/error handling
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    loadCourseForEdit(params.id)
  }, [params.id])
  
  // Complex save logic
  const handleSave = async () => {
    try {
      await saveDraft()
    } catch (err) {
      setError('Save failed')
    }
  }
  
  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {courseCreation && (
        <CourseForm 
          course={courseCreation}
          onUpdate={setCourseInfo}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
```

**AFTER**: Clean hybrid approach
```typescript
'use client'

import { useCourse } from '@/hooks/use-course-queries'
import { useCourseMutations } from '@/hooks/use-course-mutations'
import { useAppStore } from '@/stores/app-store'

export default function CourseEditPage({ params }: { params: { id: string } }) {
  // Server state via TanStack Query
  const { 
    data: course, 
    isLoading, 
    error 
  } = useCourse(params.id)
  
  // Server mutations
  const { updateCourse } = useCourseMutations()
  
  // UI state only
  const { currentWizardStep, setWizardStep } = useAppStore()
  
  // Simple update handler
  const handleUpdateCourse = (updates: Partial<Course>) => {
    updateCourse.mutate({ 
      id: params.id, 
      data: updates 
    })
  }
  
  if (isLoading) return <div>Loading course...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!course) return <div>Course not found</div>
  
  return (
    <div>
      <WizardNavigation 
        currentStep={currentWizardStep}
        onStepChange={setWizardStep}
      />
      
      <CourseForm 
        course={course}
        onUpdate={handleUpdateCourse}
        isUpdating={updateCourse.isPending}
      />
      
      <VideoManager courseId={course.id} />
    </div>
  )
}
```

#### 4.2 Course Create Page Migration  
**File**: `/app/instructor/course/new/page.tsx`

**BEFORE**: Complex initialization
```typescript
export default function CourseCreatePage() {
  const resetCourseCreation = useAppStore(state => state.resetCourseCreation)
  const courseCreation = useAppStore(state => state.courseCreation)
  const currentStep = useAppStore(state => state.currentStep)
  
  useEffect(() => {
    resetCourseCreation()
  }, [])
  
  return (
    <CreateCourseWizard 
      course={courseCreation}
      currentStep={currentStep}
    />
  )
}
```

**AFTER**: Clean approach
```typescript
'use client'

import { useCourseMutations } from '@/hooks/use-course-mutations'
import { useAppStore } from '@/stores/app-store'

export default function CourseCreatePage() {
  // Server mutations
  const { createCourse } = useCourseMutations()
  
  // UI state
  const { 
    currentWizardStep, 
    setWizardStep, 
    resetUI 
  } = useAppStore()
  
  // Reset UI state on mount
  useEffect(() => {
    resetUI()
  }, [resetUI])
  
  const handleCreateCourse = async (courseData: Partial<Course>) => {
    const result = await createCourse.mutateAsync(courseData)
    
    if (result.success) {
      // Navigate to edit page
      router.push(`/instructor/course/${result.course.id}/edit`)
    }
  }
  
  return (
    <CreateCourseWizard 
      currentStep={currentWizardStep}
      onStepChange={setWizardStep}
      onSubmit={handleCreateCourse}
      isCreating={createCourse.isPending}
    />
  )
}
```

#### 4.3 ChapterManager Component Migration
**File**: `/components/course/ChapterManager.tsx`

**BEFORE**: Complex nested data handling
```typescript
interface Props {
  chapters: Chapter[]
  onUpdateChapter: (id: string, title: string) => void
  onDeleteChapter: (id: string) => void
  onReorderChapters: (chapters: Chapter[]) => void
}

export default function ChapterManager({ chapters, ...props }: Props) {
  // Each chapter has full video objects nested
  return (
    <div>
      {chapters.map(chapter => (
        <ChapterCard 
          key={chapter.id}
          chapter={chapter}
          videos={chapter.videos}  // Nested data
          {...props}
        />
      ))}
    </div>
  )
}
```

**AFTER**: Clean normalized approach
```typescript
interface Props {
  courseId: string
}

export default function ChapterManager({ courseId }: Props) {
  // Server data via TanStack Query
  const { data: chapters, isLoading } = useChapters(courseId)
  
  if (isLoading) return <div>Loading chapters...</div>
  
  return (
    <div>
      {chapters?.map(chapter => (
        <ChapterCard 
          key={chapter.id}
          courseId={courseId}
          chapterId={chapter.id}
          title={chapter.title}
        />
      ))}
    </div>
  )
}

// components/course/ChapterCard.tsx
interface ChapterCardProps {
  courseId: string
  chapterId: string  
  title: string
}

function ChapterCard({ courseId, chapterId, title }: ChapterCardProps) {
  // Get videos for this chapter
  const { data: videos } = useVideos(courseId, chapterId)
  
  // Video mutations
  const { uploadVideo, deleteVideo, reorderVideos } = useVideoMutations(courseId)
  
  // UI state for upload progress
  const { uploadProgress } = useAppStore()
  
  return (
    <div>
      <h3>{title}</h3>
      
      <VideoUploader 
        onUpload={(file) => uploadVideo.mutate({ file, chapterId })}
        progress={uploadProgress}
      />
      
      <VideoList 
        videos={videos || []}
        onDelete={(id) => deleteVideo.mutate(id)}
        onReorder={(ids) => reorderVideos.mutate({ chapterId, videoIds: ids })}
      />
    </div>
  )
}
```

#### 4.4 VideoUploader Component Migration
**File**: `/components/course/VideoUploader.tsx`

**BEFORE**: Complex queue management
```typescript
export default function VideoUploader({ chapterId }: Props) {
  const addVideosToQueue = useAppStore(state => state.addVideosToQueue)
  const uploadQueue = useAppStore(state => state.uploadQueue)
  
  const handleFilesSelected = (files: FileList) => {
    addVideosToQueue(files)
  }
  
  return (
    <div>
      <input 
        type="file" 
        multiple 
        onChange={e => handleFilesSelected(e.target.files)} 
      />
      
      {uploadQueue.map(upload => (
        <UploadProgress 
          key={upload.id}
          name={upload.name}
          progress={upload.progress}
          status={upload.status}
        />
      ))}
    </div>
  )
}
```

**AFTER**: Simple upload with mutations
```typescript
interface Props {
  courseId: string
  chapterId: string
}

export default function VideoUploader({ courseId, chapterId }: Props) {
  const { uploadVideo } = useVideoMutations(courseId)
  const { uploadProgress } = useAppStore()
  
  const handleFilesSelected = (files: FileList) => {
    Array.from(files).forEach(file => {
      uploadVideo.mutate({ file, chapterId })
    })
  }
  
  return (
    <div>
      <input 
        type="file" 
        multiple 
        accept="video/*"
        onChange={e => e.target.files && handleFilesSelected(e.target.files)} 
      />
      
      {uploadVideo.isLoading && (
        <div>Uploading videos...</div>
      )}
      
      {Object.entries(uploadProgress).map(([videoId, progress]) => (
        <UploadProgress 
          key={videoId}
          videoId={videoId}
          progress={progress}
        />
      ))}
    </div>
  )
}
```

#### 📍 **CHECKPOINT 4A**: Component Migration
- [ ] Course edit page uses hybrid pattern
- [ ] Course create page uses hybrid pattern  
- [ ] ChapterManager uses server state
- [ ] VideoUploader uses mutations
- [ ] All components work with new architecture

---

### Phase 5: Remove Legacy Code (Day 3-4)

#### 5.1 Delete Old State Files
```bash
# Remove old state management
rm src/stores/slices/course-creation-slice.ts
rm src/stores/slices/normalized-course-slice.ts  
rm src/stores/selectors/course-selectors.ts

# Remove API routes (replaced by server actions)
rm -rf src/app/api/upload
rm -rf src/app/api/delete-video  
rm -rf src/app/api/courses

# Remove service abstractions
rm src/services/video/video-upload-service.ts
rm src/services/supabase/video-service.ts
```

#### 5.2 Update App Store
**File**: `/stores/app-store.ts`

**BEFORE**: Multiple slices
```typescript
import { CourseCreationSlice } from './slices/course-creation-slice'
import { NormalizedCourseSlice } from './slices/normalized-course-slice'

export interface AppStore extends 
  AuthSlice,
  CourseCreationSlice,      // DELETE
  NormalizedCourseSlice,    // DELETE
  UISlice
{}

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createCourseCreationSlice(...a),    // DELETE
      ...createNormalizedCourseSlice(...a),  // DELETE
      ...createUISlice(...a),
    })
  )
)
```

**AFTER**: Minimal store
```typescript
import { UISlice, createUISlice } from './slices/ui-slice'
import { AuthSlice, createAuthSlice } from './slices/auth-slice'

export interface AppStore extends 
  AuthSlice,
  UISlice
{}

export const useAppStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createUISlice(...a),
    }),
    {
      name: 'unpuzzle-app-state',
      partialize: (state) => ({
        // Only persist UI preferences and auth
        autoSave: state.autoSave,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        // Auth state persistence handled separately
      }),
    }
  )
)
```

#### 5.3 Clean Up Imports
Search and replace all imports:
```bash
# Find all files importing old slices
grep -r "course-creation-slice" src/
grep -r "normalized-course-slice" src/

# Update to use hooks instead
# BEFORE: import { VideoUpload } from '@/stores/slices/course-creation-slice'
# AFTER:  import { Video } from '@/types/database'
```

#### 5.4 Update Type Exports
```typescript
// types/course.ts - Centralized types
export interface Course {
  id: string
  title: string
  description: string
  thumbnailUrl?: string
  price?: number
  currency?: string
  category?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  status: 'draft' | 'published'
  userId: string
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export interface Video {
  id: string
  name: string
  url?: string
  thumbnailUrl?: string
  duration?: string
  size?: number
  order: number
  chapterId: string
  courseId: string
  backblazeFileId?: string
  status: 'pending' | 'uploading' | 'processing' | 'ready' | 'error'
  createdAt: Date
  updatedAt: Date
}

export interface Chapter {
  id: string
  title: string
  courseId: string
  videos: Video[]
}

// For backward compatibility during migration
export type VideoUpload = Video
```

#### 📍 **CHECKPOINT 5A**: Legacy Cleanup
- [ ] All old state files deleted
- [ ] App store contains only UI state
- [ ] All imports updated
- [ ] No TypeScript errors
- [ ] All components work

---

### Phase 6: Advanced Features & Polish (Day 4-5)

#### 6.1 Optimistic Updates Enhancement
```typescript
// hooks/use-advanced-video-mutations.ts
export function useAdvancedVideoMutations(courseId: string) {
  const queryClient = useQueryClient()
  const { setUploadProgress, clearUploadProgress } = useAppStore()
  
  const uploadVideoWithProgress = useMutation({
    mutationFn: async ({ file, chapterId }: { file: File, chapterId: string }) => {
      const tempId = `temp-${Date.now()}`
      
      // Create upload with progress tracking
      const uploadPromise = uploadVideoAction(file, courseId, chapterId)
      
      // Simulate progress (in real implementation, this would come from upload service)
      const progressInterval = setInterval(() => {
        const currentProgress = Math.min(
          (Math.random() * 20) + 10, // Simulate progress
          90
        )
        setUploadProgress(tempId, currentProgress)
      }, 500)
      
      try {
        const result = await uploadPromise
        clearInterval(progressInterval)
        setUploadProgress(tempId, 100)
        clearUploadProgress(tempId)
        return result
      } catch (error) {
        clearInterval(progressInterval)
        clearUploadProgress(tempId)
        throw error
      }
    },
    // ... optimistic update logic
  })
  
  return { uploadVideoWithProgress }
}
```

#### 6.2 Background Refetch & Sync
```typescript
// hooks/use-course-sync.ts
export function useCourseSync(courseId: string) {
  const queryClient = useQueryClient()
  
  // Refetch course data when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [courseId, queryClient])
  
  // Background sync every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
    }, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [courseId, queryClient])
}
```

#### 6.3 Error Boundaries & Recovery
```typescript
// components/ErrorBoundary.tsx
'use client'

import { useQueryErrorResetBoundary } from '@tanstack/react-query'

export function CourseErrorBoundary({ children }: { children: React.ReactNode }) {
  const { reset } = useQueryErrorResetBoundary()
  
  return (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div>
          <h2>Something went wrong with course data:</h2>
          <pre>{error.message}</pre>
          <button onClick={resetErrorBoundary}>Try again</button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
```

#### 6.4 Performance Optimizations
```typescript
// hooks/use-course-prefetch.ts
export function useCoursePrefetch() {
  const queryClient = useQueryClient()
  
  const prefetchCourse = useCallback((courseId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['course', courseId],
      queryFn: () => getCourseAction(courseId),
      staleTime: 5 * 60 * 1000,
    })
  }, [queryClient])
  
  return { prefetchCourse }
}

// In course list component
function CourseCard({ course }: { course: Course }) {
  const { prefetchCourse } = useCoursePrefetch()
  
  return (
    <Link 
      href={`/instructor/course/${course.id}`}
      onMouseEnter={() => prefetchCourse(course.id)}  // Prefetch on hover
    >
      {course.title}
    </Link>
  )
}
```

#### 📍 **CHECKPOINT 6A**: Advanced Features
- [ ] Optimistic updates working
- [ ] Background sync implemented
- [ ] Error boundaries in place
- [ ] Performance optimizations active
- [ ] User experience smooth

---

## Final Architecture Overview

### Separation of Concerns Achieved

```typescript
// 🏗️ ARCHITECTURE LAYERS

// 1. SERVER LAYER
// - app/actions/*.ts - All database operations
// - Prisma schema - Data modeling
// - Authentication - User verification

// 2. CACHING LAYER  
// - TanStack Query - Server state cache
// - Automatic invalidation
// - Optimistic updates
// - Background refetching

// 3. UI STATE LAYER
// - Zustand store - Pure UI state only
// - No server data
// - Transient state (modals, wizard steps)
// - User preferences

// 4. COMPONENT LAYER
// - React components - Pure presentation
// - Custom hooks - Business logic
// - No direct state management
// - Clean separation of concerns
```

### Data Flow

```
User Action → Component → Hook → Server Action → Database
     ↓                              ↓
  UI Update ← TanStack Query ← revalidatePath() ← Response
```

### Benefits Achieved

1. **🎯 Single Source of Truth**: Server is the authority
2. **⚡ Performance**: Automatic caching and background updates
3. **🔄 Real-time Sync**: Automatic revalidation on mutations
4. **🎨 Better UX**: Optimistic updates and loading states
5. **🐛 Fewer Bugs**: No state synchronization issues
6. **📦 Less Code**: 70% reduction in state management code
7. **🧪 Easier Testing**: Clear separation of concerns
8. **🔧 Maintainable**: Modern patterns, easy to understand

---

## Testing Strategy

### Phase Testing Checklist

After each phase, run these tests:

#### Core Functionality Tests
```typescript
// 1. Course Management
- Create new course
- Update course information  
- Load existing course
- Delete course
- Navigate between courses

// 2. Video Management
- Upload single video
- Upload multiple videos
- Delete video
- Reorder videos within chapter
- Move video between chapters

// 3. UI State
- Wizard navigation
- Modal open/close
- Upload progress display
- Form validation
- Theme switching

// 4. Error Handling
- Network errors
- Server errors  
- Validation errors
- Recovery from errors

// 5. Performance
- Page load times
- Re-render frequency
- Memory usage
- Cache hit rates
```

#### Stress Tests
```typescript
// Large Data Sets
- Course with 100+ videos
- Multiple courses editing
- Rapid consecutive uploads
- Network interruption during upload

// Edge Cases  
- Empty courses
- Corrupted video files
- Database connection loss
- Authentication expiry
```

---

## Migration Timeline & Risk Management

### Day-by-Day Breakdown

**Day 1**: Foundation (Server Actions + TanStack Query)
- Morning: Create all server actions
- Afternoon: Setup TanStack Query + basic hooks
- Risk: Medium (new patterns)
- Rollback: Keep old code, revert to previous branch

**Day 2**: State Migration (UI Slice + Component Updates)  
- Morning: Create minimal UI slice
- Afternoon: Migrate 2-3 key components
- Risk: Low (incremental changes)
- Rollback: Component-by-component rollback

**Day 3**: Component Migration (Remaining Components)
- Morning: Migrate remaining components
- Afternoon: End-to-end testing  
- Risk: Low (patterns established)
- Rollback: Keep old components as backup

**Day 4**: Legacy Cleanup + Polish
- Morning: Delete old code
- Afternoon: Performance optimizations
- Risk: Low (everything working)
- Rollback: Restore from git

**Day 5**: Final Testing + Documentation
- Morning: Comprehensive testing
- Afternoon: Update documentation
- Risk: Very Low
- Rollback: Not needed

### Success Metrics

#### Quantitative Goals
- [ ] 70% reduction in state management code
- [ ] 90% fewer state synchronization bugs
- [ ] <500ms page load times
- [ ] <2 second save operations
- [ ] Zero console errors

#### Qualitative Goals  
- [ ] Developers find code easier to understand
- [ ] New features easier to implement
- [ ] Better user experience
- [ ] More reliable video uploads
- [ ] Cleaner component architecture

---

## Conclusion

This migration transforms the codebase from complex dual-state anti-patterns to modern, maintainable architecture. The hybrid approach leverages the best of each tool:

- **TanStack Query**: Perfect for server state management
- **Server Actions**: Clean, type-safe server operations  
- **Zustand**: Minimal UI state only
- **React**: Pure presentation components

The result is a modern, performant, and maintainable course creation platform that follows 2024/2025 best practices and eliminates the state synchronization issues that have plagued the current implementation.
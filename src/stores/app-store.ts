import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { AuthSlice, createAuthSlice } from './slices/auth-slice'
import { UserSlice, createUserSlice } from './slices/user-slice'
import { AISlice, createAISlice } from './slices/ai-slice'
import { InstructorSlice, createInstructorSlice } from './slices/instructor-slice'
// DEPRECATED: import { CourseCreationSlice, createCourseCreationSlice } from './slices/course-creation-slice'
import { LessonSlice, createLessonSlice } from './slices/lesson-slice'
import { BlogSlice, createBlogSlice } from './slices/blog-slice'
// DEPRECATED: Normalized state slice (parallel to existing state)
// import { NormalizedCourseSlice, createNormalizedCourseSlice } from './slices/normalized-course-slice'
// New role-specific slices
import { StudentCourseSlice, createStudentCourseSlice } from './slices/student-course-slice'
import { StudentLearningSlice, createStudentLearningSlice } from './slices/student-learning-slice'
import { InstructorCourseSlice, createInstructorCourseSlice } from './slices/instructor-course-slice'
import { StudentVideoSlice, createStudentVideoSlice } from './slices/student-video-slice'
import { InstructorVideoSlice, createInstructorVideoSlice } from './slices/instructor-video-slice'
import { UISlice, createUISlice } from './slices/ui-slice'
import { isDevelopment } from '@/config/env'

// Clean architecture with role-specific stores
export interface AppStore extends 
  AuthSlice,
  UserSlice, 
  AISlice, 
  InstructorSlice, 
  // DEPRECATED: CourseCreationSlice,     // MIGRATED TO TanStack Query
  // DEPRECATED: NormalizedCourseSlice,   // MIGRATED TO TanStack Query
  LessonSlice, 
  BlogSlice,
  StudentCourseSlice,    // NEW - role-specific
  // StudentLearningSlice,  // NEW - enhanced with database analytics - DISABLED to avoid conflicts
  // InstructorCourseSlice, // NEW - role-specific - temporarily disabled
  StudentVideoSlice,     // NEW - role-specific
  InstructorVideoSlice,  // NEW - role-specific
  UISlice                // NEW - pure UI state following 3-layer pattern
{}

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      (...args) => ({
        ...createAuthSlice(...args),
        ...createUserSlice(...args),
        ...createAISlice(...args),
        ...createInstructorSlice(...args),
        // DEPRECATED: ...createCourseCreationSlice(...args),  // MIGRATED TO TanStack Query
        // DEPRECATED: ...createNormalizedCourseSlice(...args), // MIGRATED TO TanStack Query
        ...createLessonSlice(...args),
        ...createBlogSlice(...args),
        // New role-specific slices
        ...createStudentCourseSlice(...args),
        // TODO: Enable when ready to switch to database
        // ...createStudentLearningSlice(...args), // Enhanced with database analytics - DISABLED to avoid conflicts
        // ...createInstructorCourseSlice(...args), // Temporarily disabled to avoid publishCourse conflict
        ...createStudentVideoSlice(...args),
        ...createInstructorVideoSlice(...args),
        ...createUISlice(...args),
      })
    ),
    {
      name: 'unpuzzle-store',
      enabled: isDevelopment,
    }
  )
)

// Store subscription helpers for advanced use cases
export const subscribeToVideo = (callback: (state: any) => void) =>
  useAppStore.subscribe(
    (state) => ({
      currentTime: state.currentTime,
      duration: state.duration,
      isPlaying: state.isPlaying,
      inPoint: state.inPoint,
      outPoint: state.outPoint,
      selectedTranscript: state.selectedTranscript,
      volume: state.volume,
      playbackRate: state.playbackRate,
      isFullscreen: state.isFullscreen,
    }),
    callback,
    {
      equalityFn: (a, b) => 
        a.currentTime === b.currentTime &&
        a.isPlaying === b.isPlaying &&
        a.inPoint === b.inPoint &&
        a.outPoint === b.outPoint
    }
  )

export const subscribeToChat = (callback: (messages: any[]) => void) =>
  useAppStore.subscribe((state) => state.chatMessages, callback)

// Devtools helpers
export const logStoreState = () => {
  if (isDevelopment) {
    console.log('Current Store State:', useAppStore.getState())
  }
}

export const resetStore = () => {
  const state = useAppStore.getState()
  state.logout()
  state.resetVideo()
  state.clearChat()
  state.setCourses([])
  state.setCurrentCourse(null)
}
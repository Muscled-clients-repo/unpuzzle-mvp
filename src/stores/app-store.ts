import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { AuthSlice, createAuthSlice } from './slices/auth-slice'
import { UserSlice, createUserSlice } from './slices/user-slice'
import { AISlice, createAISlice } from './slices/ai-slice'
import { InstructorSlice, createInstructorSlice } from './slices/instructor-slice'
// DEPRECATED: import { CourseCreationSlice, createCourseCreationSlice } from './slices/course-creation-slice'
// DEPRECATED: import { LessonSlice, createLessonSlice } from './slices/lesson-slice'
// DEPRECATED: import { BlogSlice, createBlogSlice } from './slices/blog-slice'
// DEPRECATED: Normalized state slice (parallel to existing state)
// import { NormalizedCourseSlice, createNormalizedCourseSlice } from './slices/normalized-course-slice'
// New role-specific slices
import { StudentCourseSlice, createStudentCourseSlice } from './slices/student-course-slice'
import { StudentLearningSlice, createStudentLearningSlice } from './slices/student-learning-slice'
import { InstructorCourseSlice, createInstructorCourseSlice } from './slices/instructor-course-slice'
import { CourseVideoSlice, createCourseVideoSlice } from './slices/course-video-slice'
import { InstructorVideoSlice, createInstructorVideoSlice } from './slices/instructor-video-slice'
import { UISlice, createUISlice } from './slices/ui-slice'
import { StudioSlice, createStudioSlice } from './slices/studio-slice'
import { isDevelopment } from '@/config/env'

// Clean architecture with role-specific stores
export interface AppStore extends
  AuthSlice,
  UserSlice,
  AISlice,
  InstructorSlice,
  // DEPRECATED: CourseCreationSlice,     // MIGRATED TO TanStack Query
  // DEPRECATED: NormalizedCourseSlice,   // MIGRATED TO TanStack Query
  // DEPRECATED: LessonSlice,             // REMOVED - not needed for MVP
  // DEPRECATED: BlogSlice,               // REMOVED - not needed for MVP
  StudentCourseSlice,    // NEW - role-specific
  // StudentLearningSlice,  // NEW - enhanced with database analytics - DISABLED to avoid conflicts
  // InstructorCourseSlice, // NEW - role-specific - temporarily disabled
  CourseVideoSlice,      // NEW - course video playback (used by both students and instructors)
  InstructorVideoSlice,  // NEW - instructor-specific video analytics
  UISlice,               // NEW - pure UI state following 3-layer pattern
  StudioSlice            // NEW - video studio state management
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
        // DEPRECATED: ...createLessonSlice(...args),          // REMOVED - not needed for MVP
        // DEPRECATED: ...createBlogSlice(...args),            // REMOVED - not needed for MVP
        // New role-specific slices
        ...createStudentCourseSlice(...args),
        // TODO: Enable when ready to switch to database
        // ...createStudentLearningSlice(...args), // Enhanced with database analytics - DISABLED to avoid conflicts
        // ...createInstructorCourseSlice(...args), // Temporarily disabled to avoid publishCourse conflict
        ...createCourseVideoSlice(...args),
        ...createInstructorVideoSlice(...args),
        ...createUISlice(...args),
        ...createStudioSlice(...args),
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
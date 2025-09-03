import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { AuthSlice, createAuthSlice } from './slices/auth-slice'
import { UserSlice, createUserSlice } from './slices/user-slice'
import { AISlice, createAISlice } from './slices/ai-slice'
import { InstructorSlice, createInstructorSlice } from './slices/instructor-slice'
import { CourseCreationSlice, createCourseCreationSlice } from './slices/course-creation-slice'
import { LessonSlice, createLessonSlice } from './slices/lesson-slice'
import { BlogSlice, createBlogSlice } from './slices/blog-slice'
// New role-specific slices
import { StudentCourseSlice, createStudentCourseSlice } from './slices/student-course-slice'
import { InstructorCourseSlice, createInstructorCourseSlice } from './slices/instructor-course-slice'
import { StudentVideoSlice, createStudentVideoSlice } from './slices/student-video-slice'
import { InstructorVideoSlice, createInstructorVideoSlice } from './slices/instructor-video-slice'
import { isDevelopment } from '@/config/env'

// Clean architecture with role-specific stores
export interface AppStore extends 
  AuthSlice,
  UserSlice, 
  AISlice, 
  InstructorSlice, 
  CourseCreationSlice, 
  LessonSlice, 
  BlogSlice,
  StudentCourseSlice,    // NEW - role-specific
  // InstructorCourseSlice, // NEW - role-specific - temporarily disabled
  StudentVideoSlice,     // NEW - role-specific
  InstructorVideoSlice   // NEW - role-specific
{}

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      (...args) => ({
        ...createAuthSlice(...args),
        ...createUserSlice(...args),
        ...createAISlice(...args),
        ...createInstructorSlice(...args),
        ...createCourseCreationSlice(...args),
        ...createLessonSlice(...args),
        ...createBlogSlice(...args),
        // New role-specific slices
        ...createStudentCourseSlice(...args),
        // ...createInstructorCourseSlice(...args), // Temporarily disabled to avoid publishCourse conflict
        ...createStudentVideoSlice(...args),
        ...createInstructorVideoSlice(...args),
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
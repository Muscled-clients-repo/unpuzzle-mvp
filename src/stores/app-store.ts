import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { UserSlice, createUserSlice } from './slices/user-slice'
import { AISlice, createAISlice } from './slices/ai-slice'
import { InstructorSlice, createInstructorSlice } from './slices/instructor-slice'
import { ModeratorSlice, createModeratorSlice } from './slices/moderator-slice'
import { CourseCreationSlice, createCourseCreationSlice } from './slices/course-creation-slice'
import { LessonSlice, createLessonSlice } from './slices/lesson-slice'
import { BlogSlice, createBlogSlice } from './slices/blog-slice'
// New role-specific slices
import { StudentCourseSlice, createStudentCourseSlice } from './slices/student-course-slice'
import { InstructorCourseSlice, createInstructorCourseSlice } from './slices/instructor-course-slice'
import { StudentVideoSlice, createStudentVideoSlice } from './slices/student-video-slice'
import { InstructorVideoSlice, createInstructorVideoSlice } from './slices/instructor-video-slice'
import { PublicCourseSlice, createPublicCourseSlice } from './slices/public-course-slice'
import { PaymentSlice, createPaymentSlice } from './slices/payment-slice'
import { SubscriptionSlice, createSubscriptionSlice } from './slices/subscription-slice'
import { isDevelopment } from '@/config/env'

// Clean architecture with role-specific stores
export interface AppStore extends 
  UserSlice, 
  AISlice, 
  InstructorSlice, 
  ModeratorSlice, 
  CourseCreationSlice, 
  LessonSlice, 
  BlogSlice,
  StudentCourseSlice,    // NEW - role-specific
  InstructorCourseSlice, // NEW - role-specific
  StudentVideoSlice,     // NEW - role-specific
  InstructorVideoSlice,  // NEW - role-specific
  PublicCourseSlice,     // NEW - public course browsing
  PaymentSlice,          // NEW - payment and enrollment
  SubscriptionSlice      // NEW - subscription management
{}

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      (...args) => ({
        ...createUserSlice(...args),
        ...createAISlice(...args),
        ...createInstructorSlice(...args),
        ...createModeratorSlice(...args),
        ...createCourseCreationSlice(...args),
        ...createLessonSlice(...args),
        ...createBlogSlice(...args),
        // New role-specific slices
        ...createStudentCourseSlice(...args),
        ...createInstructorCourseSlice(...args),
        ...createStudentVideoSlice(...args),
        ...createInstructorVideoSlice(...args),
        ...createPublicCourseSlice(...args),
        ...createPaymentSlice(...args),
        ...createSubscriptionSlice(...args),
      })
    ),
    {
      name: 'unpuzzle-store',
      enabled: isDevelopment,
    }
  )
)

// Store subscription helpers for advanced use cases
interface VideoState {
  currentTime: number
  duration: number
  isPlaying: boolean
  inPoint?: number
  outPoint?: number
  selectedTranscript?: unknown
  volume: number
  playbackRate: number
  isFullscreen: boolean
}

export const subscribeToVideo = (callback: (state: VideoState) => void) =>
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

export const subscribeToChat = (callback: (messages: unknown[]) => void) =>
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
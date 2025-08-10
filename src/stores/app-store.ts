import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { UserSlice, createUserSlice } from './slices/user-slice'
import { CourseSlice, createCourseSlice } from './slices/course-slice'
import { VideoSlice, createVideoSlice } from './slices/video-slice'
import { AISlice, createAISlice } from './slices/ai-slice'
import { UISlice, createUISlice } from './slices/ui-slice'
import { CommunityState, createCommunitySlice } from './slices/community-slice'
import { InstructorSlice, createInstructorSlice } from './slices/instructor-slice'
import { ModeratorSlice, createModeratorSlice } from './slices/moderator-slice'
import { CourseCreationSlice, createCourseCreationSlice } from './slices/course-creation-slice'
import { LessonSlice, createLessonSlice } from './slices/lesson-slice'
import { BlogSlice, createBlogSlice } from './slices/blog-slice'
import { isDevelopment } from '@/config/env'

export interface AppStore extends UserSlice, CourseSlice, VideoSlice, AISlice, UISlice, CommunityState, InstructorSlice, ModeratorSlice, CourseCreationSlice, LessonSlice, BlogSlice {}

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      (...args) => ({
        ...createUserSlice(...args),
        ...createCourseSlice(...args),
        ...createVideoSlice(...args),
        ...createAISlice(...args),
        ...createUISlice(...args),
        ...createCommunitySlice(...args),
        ...createInstructorSlice(...args),
        ...createModeratorSlice(...args),
        ...createCourseCreationSlice(...args),
        ...createLessonSlice(...args),
        ...createBlogSlice(...args),
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
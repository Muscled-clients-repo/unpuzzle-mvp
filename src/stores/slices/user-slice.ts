import { StateCreator } from 'zustand'
import { UserState, UserActions, UserProfile, UserPreferences, CourseProgress } from '@/types/app-types'

export interface UserSlice extends UserState, UserActions {}

const initialUserPreferences: UserPreferences = {
  theme: 'light',
  autoPlay: false,
  playbackRate: 1,
  volume: 1,
  sidebarWidth: 400,
}

const initialUserState: UserState = {
  id: null,
  profile: null,
  preferences: initialUserPreferences,
  progress: {},
}

export const createUserSlice: StateCreator<UserSlice> = (set, get) => ({
  ...initialUserState,

  setUser: (profile: UserProfile) => 
    set((state) => ({
      id: profile.id,
      profile,
    })),

  updatePreferences: (preferences: Partial<UserPreferences>) =>
    set((state) => ({
      preferences: {
        ...state.preferences,
        ...preferences,
      },
    })),

  updateProgress: (courseId: string, progress: Partial<CourseProgress>) =>
    set((state) => ({
      progress: {
        ...state.progress,
        [courseId]: {
          ...state.progress[courseId],
          courseId,
          progress: 0,
          currentTimestamp: 0,
          completedVideos: [],
          lastAccessed: new Date(),
          ...progress,
        },
      },
    })),

  logout: () => set(initialUserState),
})
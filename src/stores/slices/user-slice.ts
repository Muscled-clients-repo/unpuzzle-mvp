import { StateCreator } from 'zustand'
import { UserState, UserActions, UserProfile, UserPreferences, CourseProgress } from '@/types/app-types'
import { UI, VIDEO } from '@/config/constants'

export interface UserSlice extends UserState, UserActions {}

const initialUserPreferences: UserPreferences = {
  theme: 'light',
  autoPlay: false,
  playbackRate: VIDEO.DEFAULT_PLAYBACK_RATE,
  volume: 1,
  sidebarWidth: UI.SIDEBAR.DEFAULT_WIDTH,
  showChatSidebar: true,
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

  useAiInteraction: () => {
    const state = get()
    if (!state.profile?.subscription) return false
    
    const subscription = state.profile.subscription
    const today = new Date().toDateString()
    
    // Reset daily counter if it's a new day
    if (subscription.lastResetDate !== today && subscription.plan === 'basic') {
      set((state) => ({
        profile: state.profile ? {
          ...state.profile,
          subscription: {
            ...state.profile.subscription!,
            dailyAiInteractions: 0,
            lastResetDate: today
          }
        } : null
      }))
    }
    
    // Check limits based on plan
    if (subscription.plan === 'premium') {
      // Premium has unlimited AI interactions
      return true
    } else if (subscription.plan === 'basic') {
      const dailyUsed = subscription.dailyAiInteractions || 0
      if (dailyUsed >= 3) {
        return false // Daily limit exceeded
      }
      
      // Increment counter
      set((state) => ({
        profile: state.profile ? {
          ...state.profile,
          subscription: {
            ...state.profile.subscription!,
            dailyAiInteractions: dailyUsed + 1
          }
        } : null
      }))
      
      return true
    }
    
    return false // Free or unknown plan
  },

  resetDailyAiInteractions: () =>
    set((state) => ({
      profile: state.profile ? {
        ...state.profile,
        subscription: state.profile.subscription ? {
          ...state.profile.subscription,
          dailyAiInteractions: 0,
          lastResetDate: new Date().toDateString()
        } : undefined
      } : null
    })),

  updateSubscription: (subscription) =>
    set((state) => ({
      profile: state.profile ? {
        ...state.profile,
        subscription
      } : null
    })),

  logout: () => set(initialUserState),
})
import { StateCreator } from 'zustand'
import { User, UIPreferences, CourseProgress } from '@/types/domain'
import { UI, VIDEO } from '@/config/constants'

// Local types for this slice
interface UserState {
  id: string | null
  profile: User | null  // Changed from UserProfile to User
  preferences: UIPreferences
  progress: { [courseId: string]: CourseProgress }
  dailyAiInteractions?: number  // UI-specific field
  lastResetDate?: string  // UI-specific field
}

interface UserActions {
  updatePreferences: (preferences: Partial<UIPreferences>) => void
  updateProgress: (courseId: string, progress: Partial<CourseProgress>) => void
  useAiInteraction: () => boolean
  resetDailyAiInteractions: () => void
  updateSubscription: (subscription: User['subscription']) => void
  logout: () => void
}

// Student-specific data structures
export interface WeeklyData {
  day: string
  learnRate: number
  executionRate: number
  watchTime: number
}

export interface CourseMetric {
  id: number
  title: string
  progress: number
  learnRate: number
  confusionsResolved: number
  timeSpent: number
  lastAccessed: string
}

export interface Achievement {
  id: number
  title: string
  description: string
  icon: string
  earned: boolean
}

export interface Reflection {
  id: string
  courseId: string
  courseTitle: string
  date: string
  type: 'text' | 'voice' | 'video'
  content: string
  sentiment: 'positive' | 'neutral' | 'confused'
  aiResponse?: string
  tags: string[]
}

export interface RecentActivity {
  id: string
  type: 'course' | 'achievement' | 'reflection' | 'ai-chat'
  title: string
  description: string
  timestamp: string
  icon: string
}

export interface StudentData {
  weeklyData: WeeklyData[]
  courseMetrics: CourseMetric[]
  achievements: Achievement[]
  reflections: Reflection[]
  recentActivity: RecentActivity[]
}

export interface UserSlice extends UserState, UserActions {
  studentData: StudentData
  loadStudentData: () => void
  addReflection: (reflection: Omit<Reflection, 'id'>) => void
}

const initialUserPreferences: UIPreferences = {
  theme: 'light',
  autoPlay: false,
  playbackRate: VIDEO.DEFAULT_PLAYBACK_RATE,
  volume: 1,
  sidebarWidth: UI.SIDEBAR.DEFAULT_WIDTH,
  showChatSidebar: true,
}

const initialStudentData: StudentData = {
  weeklyData: [],
  courseMetrics: [],
  achievements: [],
  reflections: [],
  recentActivity: []
}

const initialUserState: UserState = {
  id: null,
  profile: null,
  preferences: initialUserPreferences,
  progress: {},
  dailyAiInteractions: undefined,
  lastResetDate: undefined
}

export const createUserSlice: StateCreator<UserSlice> = (set, get) => ({
  ...initialUserState,
  studentData: initialStudentData,

  updatePreferences: (preferences: Partial<UIPreferences>) =>
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
          userId: state.id || '',
          videosCompleted: progress.videosCompleted || 0,
          totalVideos: progress.totalVideos || 0,
          percentComplete: progress.percentComplete || 0,
          lastAccessedAt: new Date().toISOString(),
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
    if (state.lastResetDate !== today && subscription.plan === 'basic') {
      set({
        dailyAiInteractions: 0,
        lastResetDate: today
      })
    }
    
    // Check limits based on plan
    if (subscription.plan === 'pro') {
      // Pro has unlimited AI interactions
      return true
    } else if (subscription.plan === 'basic') {
      const dailyUsed = state.dailyAiInteractions || 0
      if (dailyUsed >= 3) {
        return false // Daily limit exceeded
      }
      
      // Increment counter
      set({
        dailyAiInteractions: dailyUsed + 1
      })
      
      return true
    }
    
    return false // Free or unknown plan
  },

  resetDailyAiInteractions: () =>
    set({
      dailyAiInteractions: 0,
      lastResetDate: new Date().toDateString()
    }),

  updateSubscription: (subscription) =>
    set((state) => ({
      profile: state.profile ? {
        ...state.profile,
        subscription
      } : null
    })),

  logout: () => set({ ...initialUserState, studentData: initialStudentData }),

  loadStudentData: () => {
    // Initialize with mock data (temporary until backend)
    set({
      studentData: {
        weeklyData: [
          { day: "Mon", learnRate: 72, executionRate: 85, watchTime: 45 },
          { day: "Tue", learnRate: 68, executionRate: 82, watchTime: 38 },
          { day: "Wed", learnRate: 75, executionRate: 88, watchTime: 52 },
          { day: "Thu", learnRate: 71, executionRate: 79, watchTime: 41 },
          { day: "Fri", learnRate: 78, executionRate: 91, watchTime: 55 },
          { day: "Sat", learnRate: 82, executionRate: 93, watchTime: 62 },
          { day: "Sun", learnRate: 80, executionRate: 90, watchTime: 58 }
        ],
        courseMetrics: [
          {
            id: 1,
            title: "React Masterclass",
            progress: 67,
            learnRate: 78,
            confusionsResolved: 23,
            timeSpent: 180,
            lastAccessed: "2 hours ago"
          },
          {
            id: 2,
            title: "Python for Data Science",
            progress: 45,
            learnRate: 65,
            confusionsResolved: 15,
            timeSpent: 120,
            lastAccessed: "Yesterday"
          },
          {
            id: 3,
            title: "Advanced TypeScript",
            progress: 89,
            learnRate: 82,
            confusionsResolved: 31,
            timeSpent: 90,
            lastAccessed: "1 day ago"
          }
        ],
        achievements: [
          { id: 1, title: "First Steps", description: "Completed your first lesson", icon: "🎯", earned: true },
          { id: 2, title: "AI Explorer", description: "Used AI features 10 times", icon: "🤖", earned: true },
          { id: 3, title: "Consistent Learner", description: "7-day learning streak", icon: "🔥", earned: false },
          { id: 4, title: "Reflection Master", description: "Submitted 5 reflections", icon: "💭", earned: false }
        ],
        reflections: [
          {
            id: "1",
            courseId: "react-1",
            courseTitle: "React Masterclass",
            date: "2024-01-15",
            type: "text",
            content: "Finally understood how useEffect cleanup works. The key is thinking about it as 'undo' logic for side effects.",
            sentiment: "positive",
            aiResponse: "Great insight! Understanding cleanup is crucial for preventing memory leaks. Try applying this to subscription patterns next.",
            tags: ["hooks", "useEffect", "cleanup"]
          },
          {
            id: "2",
            courseId: "python-1",
            courseTitle: "Python for Data Science",
            date: "2024-01-14",
            type: "voice",
            content: "Struggling with numpy broadcasting rules. Need more practice with multi-dimensional arrays.",
            sentiment: "confused",
            aiResponse: "Broadcasting can be tricky! Remember: dimensions are compared from right to left. Practice with 2D arrays first.",
            tags: ["numpy", "broadcasting", "arrays"]
          }
        ],
        recentActivity: [
          {
            id: "1",
            type: "course",
            title: "Continued React Masterclass",
            description: "Completed 3 lessons on Advanced Hooks",
            timestamp: "2 hours ago",
            icon: "📚"
          },
          {
            id: "2",
            type: "achievement",
            title: "Earned 'AI Explorer' Badge",
            description: "Used AI features 10 times",
            timestamp: "5 hours ago",
            icon: "🏆"
          },
          {
            id: "3",
            type: "reflection",
            title: "Submitted Reflection",
            description: "Reflected on useEffect cleanup patterns",
            timestamp: "Yesterday",
            icon: "💭"
          }
        ]
      }
    })
  },

  addReflection: (reflection) => {
    const newReflection: Reflection = {
      ...reflection,
      id: `reflection-${Date.now()}`
    }
    set(state => ({
      studentData: {
        ...state.studentData,
        reflections: [...state.studentData.reflections, newReflection]
      }
    }))
  }
})
// Core application types for state management
export interface VideoState {
  currentTime: number
  duration: number
  isPlaying: boolean
  inPoint: number | null
  outPoint: number | null
  selectedTranscript: {
    text: string
    startTime: number
    endTime: number
  } | null
  volume: number
  playbackRate: number
  isFullscreen: boolean
}

export interface ChatMessage {
  id: string
  content: string
  timestamp: Date
  type: 'user' | 'ai'
  context?: VideoContext
}

export interface VideoContext {
  videoId: string
  timestamp: number
  transcript?: string
}

export interface TranscriptReference {
  id: string
  text: string
  startTime: number
  endTime: number
  videoId: string
  timestamp: Date
}

export interface AIState {
  chatMessages: ChatMessage[]
  transcriptReferences: TranscriptReference[]
  isProcessing: boolean
  activeInteractions: number
  error: string | null
  metrics: {
    totalInteractions: number
    hintsGenerated: number
    quizzesCompleted: number
    reflectionsSubmitted: number
  }
}

export interface UserState {
  id: string | null
  profile: UserProfile | null
  preferences: UserPreferences
  progress: { [courseId: string]: CourseProgress }
}

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'learner' | 'instructor' | 'admin' | 'moderator'
  subscription?: {
    plan: 'free' | 'basic' | 'premium'
    aiInteractionsUsed?: number
    aiInteractionsLimit?: number
    dailyAiInteractions?: number // daily counter for basic users
    lastResetDate?: string // for daily limit reset
  }
  moderatorStats?: {
    responsesProvided: number
    helpfulVotes: number
    endorsedByInstructor: number
    specialization: string[] // e.g., ['React', 'CSS', 'JavaScript']
    trustScore: number // 0-100
    promotedAt: string
    promotedBy: string
  }
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  autoPlay: boolean
  playbackRate: number
  volume: number
  sidebarWidth: number
  showChatSidebar: boolean
}

export interface CourseProgress {
  courseId: string
  progress: number
  currentVideoId?: string
  currentTimestamp: number
  completedVideos: string[]
  lastAccessed: Date
}

export interface CourseState {
  courses: Course[]
  currentCourse: Course | null
  enrolledCourses: string[]
  loading: boolean
  error: string | null
}

export interface Course {
  id: string
  title: string
  description: string
  instructor: {
    name: string
    avatar: string
  }
  thumbnail: string
  duration: string
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  videos: Video[]
  rating: number
  students: number
  price: number
}

export interface Video {
  id: string
  title: string
  description: string
  duration: string
  videoUrl: string
  thumbnailUrl: string
  transcript?: string
  timestamps?: {
    time: number
    label: string
    type: 'chapter' | 'concept' | 'quiz'
  }[]
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

// Action types for store slices
export interface VideoActions {
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setInOutPoints: (inPoint: number, outPoint: number) => void
  setSelectedTranscript: (selection: VideoState['selectedTranscript']) => void
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
  setIsFullscreen: (isFullscreen: boolean) => void
  clearSelection: () => void
  resetVideo: () => void
}

export interface AIActions {
  addChatMessage: (message: string, context?: VideoContext, type?: 'user' | 'ai') => void
  addTranscriptReference: (ref: Omit<TranscriptReference, 'id' | 'timestamp'>) => void
  setIsProcessing: (isProcessing: boolean) => void
  incrementInteractions: () => void
  clearChat: () => void
  removeTranscriptReference: (id: string) => void
}

export interface UserActions {
  setUser: (profile: UserProfile) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  updateProgress: (courseId: string, progress: Partial<CourseProgress>) => void
  useAiInteraction: () => boolean // returns false if limit exceeded
  resetDailyAiInteractions: () => void
  updateSubscription: (subscription: UserProfile['subscription']) => void
  logout: () => void
}

export interface CourseActions {
  setCourses: (courses: Course[]) => void
  setCurrentCourse: (course: Course | null) => void
  enrollInCourse: (courseId: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}
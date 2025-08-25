// src/types/domain.ts
// Single source of truth for all domain types

// ============= USER & ROLES =============
export type UserRole = 'student' | 'instructor' | 'moderator' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  subscription: Subscription
  moderatorStats?: {
    responsesProvided: number
    helpfulVotes: number
    endorsedByInstructor: number
    specialization: string[]
    trustScore: number
    promotedAt: string
    promotedBy: string
  }
  createdAt: string
  updatedAt: string
}

export interface Subscription {
  id: string
  userId: string
  plan: 'free' | 'basic' | 'pro' | 'team'
  status: 'active' | 'cancelled' | 'expired' | 'trial'
  currentPeriodEnd: string
  aiCredits: number
  aiCreditsUsed: number
  maxCourses: number
  features: string[]
}

// ============= VIDEO TYPES =============
// Course videos (part of structured courses)
export interface Video {
  id: string
  courseId: string
  title: string
  description: string
  duration: number
  order: number
  videoUrl: string
  thumbnailUrl?: string
  transcript?: TranscriptEntry[]
  createdAt: string
  updatedAt: string
}

// Student-specific course video data
export interface StudentVideoData extends Video {
  progress?: VideoProgress
  reflections?: Reflection[]
  quizzes?: Quiz[]
  aiContextEnabled: boolean
}

// Instructor-specific course video data
export interface InstructorVideoData extends Video {
  studentActivity: StudentActivity[]
  confusionHotspots: ConfusionHotspot[]
  aggregateMetrics: VideoMetrics
}

// ============= PUBLIC LESSON TYPES =============
// Public standalone lessons (anyone can view, students get AI features)
export interface Lesson {
  id: string
  title: string
  description: string
  duration: number
  videoUrl: string
  thumbnailUrl?: string
  transcript?: TranscriptEntry[]
  instructor: Instructor
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  isFree: boolean
  isPublished: boolean
  viewCount: number
  rating: number
  // No courseId or order - it's standalone
  createdAt: string
  updatedAt: string
}


// ============= STUDENT FEATURES =============
export interface Reflection {
  id: string
  userId: string
  videoId: string
  content: string
  timestamp: number
  timeInSeconds: number
  type: 'text' | 'voice' | 'screenshot' | 'loom' | 'confusion'
  sentiment?: 'positive' | 'neutral' | 'confused'
  status: 'unresponded' | 'responded'
  response?: string
  responseTime?: string
  createdAt: string
}

export interface VideoSegment {
  videoId: string
  inPoint: number
  outPoint: number
  transcript?: string
  purpose: 'ai-context' | 'quiz' | 'reflection'
  // 'ai-context' = Student sends segment to AI for questions
  // 'quiz' = Student wants to be tested on this segment  
  // 'reflection' = AI agent selected this segment and prompted student for reflection
}

export interface Quiz {
  id: string
  videoId: string
  timestamp: number
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

// ============= INSTRUCTOR FEATURES =============
export interface StudentActivity {
  studentId: string
  studentName: string
  videoId: string
  timestamp: number
  type: 'reflection' | 'confusion' | 'quiz_attempt' | 'completion'
  content?: string
  needsResponse: boolean
}
// Activity types:
// 'reflection' = Student submitted reflection (voice/loom/text) on AI-prompted segment
// 'confusion' = Student marked confusion/stuck (HIGH priority for instructor)
// 'quiz_attempt' = Student completed embedded quiz (review if failed)  
// 'completion' = Student finished video (progress tracking)

export interface ConfusionHotspot {
  timestamp: number
  studentCount: number
  topic: string
  resolved: boolean
}

export interface VideoMetrics {
  totalViews: number
  avgWatchTime: number
  completionRate: number
  confusionPoints: ConfusionHotspot[]
  quizPassRate: number
  reflectionCount: number
}

// ============= COURSE TYPES =============
export interface Course {
  id: string
  title: string
  description: string
  shortDescription?: string
  thumbnailUrl: string
  instructor: Instructor
  price: number
  currency?: string
  duration: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  language?: string
  tags: string[]
  category?: string
  videos: Video[]
  sections?: any[]
  enrollmentCount: number
  reviewCount?: number
  rating: number
  isPublished: boolean
  isFree: boolean
  createdAt: string
  updatedAt: string
}

export interface Instructor {
  id: string  // This was missing before!
  name: string
  email: string
  avatar: string
  bio?: string
  expertise?: string[]
  coursesCount?: number
  studentsCount?: number
}

// ============= AI CHAT (Student Only) =============
export interface AIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  videoContext?: VideoSegment
  intent?: 'conceptual' | 'quiz' | 'hint' | 'confusion' | 'reflection'
}
// Intent types:
// 'conceptual' = Student asking for concept explanation
// 'quiz' = Student wants to be tested on material
// 'hint' = Student wants a clue, not full answer
// 'confusion' = Student is stuck and needs clarification
// 'reflection' = Student submitting their understanding for AI feedback

export interface AIChat {
  id: string
  userId: string
  videoId: string
  messages: AIMessage[]
  contextSegments: VideoSegment[]
  createdAt: string
}

// ============= PROGRESS TRACKING =============
export interface VideoProgress {
  userId: string
  videoId: string
  watchedSeconds: number
  totalSeconds: number
  percentComplete: number
  lastWatchedAt: string
  completedAt?: string
  quizAttempts?: QuizAttempt[]
  reflectionCount: number
}

// ============= AI ENGAGEMENT METRICS =============
export interface AIEngagementMetrics {
  userId: string
  executionRate: number  // % of AI prompts student acted on (vs skipped)
  executionPace: number  // Average seconds to respond to AI prompts
  totalPromptsShown: number
  totalPromptsActedOn: number
  avgResponseTime: number
}

export interface AIPrompt {
  id: string
  userId: string
  videoId: string
  type: 'reflection' | 'quiz'
  videoSegment: VideoSegment
  promptText: string
  shownAt: string
  respondedAt?: string
  responseTimeSeconds?: number
  action: 'completed' | 'skipped' | 'pending'
}

export interface QuizAttempt {
  quizId: string
  attemptedAt: string
  correct: boolean
  timeSpent: number
}

export interface CourseProgress {
  userId: string
  courseId: string
  videosCompleted: number
  totalVideos: number
  percentComplete: number
  lastAccessedAt: string
  certificateEarnedAt?: string
}

export interface TranscriptEntry {
  id: string
  start: number
  end: number
  text: string
}

// ============= UI PREFERENCES =============
export interface UIPreferences {
  theme: 'light' | 'dark'
  autoPlay: boolean
  playbackRate: number
  volume: number
  sidebarWidth: number
  showChatSidebar: boolean
}

// ============= TRANSCRIPT REFERENCE =============
export interface TranscriptReference {
  id: string
  text: string
  startTime: number
  endTime: number
  videoId: string
  timestamp: string  // ISO string format
}

// ============= USER PREFERENCES & PROFILE =============
// These were in user-service.ts, moved here for repositories



// ============= VIDEO METADATA =============
// These were in video-service.ts, moved here for repositories

export interface TranscriptSegment {
  id: string
  videoId: string
  startTime: number
  endTime: number
  text: string
  speaker?: string
}

// ============= SERVICE RESPONSES =============
export interface ServiceResult<T> {
  data?: T
  error?: string
  loading?: boolean
}

// ============= COMMENTED OUT TYPES (UNUSED) =============
// TODO: Connect to UI - currently unused (only in service mock data)

// Enhanced lesson data for logged-in students (AI features unlocked)
// export interface StudentLessonData extends Lesson {
//   progress?: VideoProgress
//   reflections?: Reflection[]
//   quizzes?: Quiz[]
//   aiContextEnabled: boolean  // Always true for students
//   hasAccess: boolean  // Based on subscription/payment for premium lessons
// }

// Analytics data for lesson owner (instructor)
// export interface InstructorLessonData extends Lesson {
//   studentActivity: StudentActivity[]
//   confusionHotspots: ConfusionHotspot[]
//   aggregateMetrics: VideoMetrics
//   earnings?: {
//     totalRevenue: number
//     monthlyRevenue: number
//     viewsThisMonth: number
//   }
// }
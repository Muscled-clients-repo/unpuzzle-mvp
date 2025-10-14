/**
 * Instructor Activity Utilities
 *
 * Transform database records into unified activity format for instructor views
 * Reuses patterns from AIChatSidebarV2.tsx
 */

import type { QuizAttempt } from '@/app/actions/instructor-quiz-actions'
import type { Reflection } from '@/app/actions/instructor-reflections-actions'
import type { AIConversation } from '@/app/actions/instructor-ai-chat-actions'

// Unified activity type for instructor timeline
export interface InstructorActivity {
  id: string
  type: 'quiz' | 'voice' | 'loom' | 'ai-chat-session'
  timestamp: number // Unix timestamp for sorting
  createdAt: Date
  videoTimestamp: number | null // Seconds in video
  formattedVideoTime: string // "2:15"
  userId: string // Student who created it

  // Type-specific data (one will be present)
  quizData?: {
    score: number
    total: number
    percentage: number
    questions: any[]
    userAnswers: number[]
  }
  audioData?: {
    fileUrl: string
    duration: number
    reflectionId: string
  }
  videoData?: {
    url: string
    reflectionId: string
  }
  chatSessionData?: {
    sessionId: string
    messageCount: number
    conversations: AIConversation[]
    firstMessage: string // Preview
  }
}

/**
 * Transform quiz attempt to activity format
 */
export function transformQuizAttempt(attempt: QuizAttempt): InstructorActivity {
  const videoTimestamp = attempt.video_timestamp
  const mins = Math.floor(videoTimestamp / 60)
  const secs = Math.floor(videoTimestamp % 60)

  return {
    id: `quiz-${attempt.id}`,
    type: 'quiz',
    timestamp: new Date(attempt.created_at).getTime(),
    createdAt: new Date(attempt.created_at),
    videoTimestamp,
    formattedVideoTime: `${mins}:${String(secs).padStart(2, '0')}`,
    userId: attempt.user_id,
    quizData: {
      score: attempt.score,
      total: attempt.total_questions,
      percentage: attempt.percentage,
      questions: attempt.questions,
      userAnswers: attempt.user_answers
    }
  }
}

/**
 * Transform reflection to activity format
 */
export function transformReflection(reflection: Reflection): InstructorActivity {
  const videoTimestamp = reflection.video_timestamp_seconds
  const mins = Math.floor(videoTimestamp / 60)
  const secs = Math.floor(videoTimestamp % 60)

  const base = {
    id: `reflection-${reflection.id}`,
    timestamp: new Date(reflection.created_at).getTime(),
    createdAt: new Date(reflection.created_at),
    videoTimestamp,
    formattedVideoTime: `${mins}:${String(secs).padStart(2, '0')}`,
    userId: reflection.user_id,
  }

  if (reflection.reflection_type === 'voice') {
    return {
      ...base,
      type: 'voice',
      audioData: {
        fileUrl: reflection.file_url || '',
        duration: reflection.duration_seconds || 0,
        reflectionId: reflection.id
      }
    }
  } else if (reflection.reflection_type === 'loom') {
    return {
      ...base,
      type: 'loom',
      videoData: {
        url: reflection.file_url || '',
        reflectionId: reflection.id
      }
    }
  }

  // Fallback (shouldn't happen if filtered correctly)
  return {
    ...base,
    type: 'voice',
    audioData: {
      fileUrl: '',
      duration: 0,
      reflectionId: reflection.id
    }
  }
}

/**
 * Group AI conversations into sessions based on temporal proximity
 * Conversations within 5 minutes are considered part of the same session
 */
export function groupAIConversationsIntoSessions(conversations: AIConversation[]): InstructorActivity[] {
  if (conversations.length === 0) return []

  // Sort by timestamp (oldest first for proper grouping)
  const sorted = [...conversations].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const sessions: InstructorActivity[] = []
  const SESSION_GAP_MS = 5 * 60 * 1000 // 5 minutes

  let currentSession: AIConversation[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const timeDiff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()

    // Same user and within 5 minutes = same session
    if (curr.user_id === prev.user_id && timeDiff <= SESSION_GAP_MS) {
      currentSession.push(curr)
    } else {
      // Save current session and start new one
      sessions.push(createSessionActivity(currentSession))
      currentSession = [curr]
    }
  }

  // Don't forget the last session
  if (currentSession.length > 0) {
    sessions.push(createSessionActivity(currentSession))
  }

  return sessions
}

/**
 * Helper: Create a session activity from grouped conversations
 */
function createSessionActivity(conversations: AIConversation[]): InstructorActivity {
  // Use first conversation for metadata
  const first = conversations[0]
  const last = conversations[conversations.length - 1]

  const videoTimestamp = first.video_timestamp || 0
  const mins = Math.floor(videoTimestamp / 60)
  const secs = Math.floor(videoTimestamp % 60)

  return {
    id: `ai-chat-session-${first.id}`,
    type: 'ai-chat-session',
    timestamp: new Date(last.created_at).getTime(), // Use last message time for sorting
    createdAt: new Date(first.created_at),
    videoTimestamp,
    formattedVideoTime: `${mins}:${String(secs).padStart(2, '0')}`,
    userId: first.user_id,
    chatSessionData: {
      sessionId: first.id,
      messageCount: conversations.length,
      conversations: conversations,
      firstMessage: first.user_message.slice(0, 50) + (first.user_message.length > 50 ? '...' : '')
    }
  }
}

/**
 * Merge and sort activities from all sources
 */
export function mergeAndSortActivities(
  quizzes: QuizAttempt[],
  reflections: Reflection[],
  conversations: AIConversation[]
): InstructorActivity[] {
  const activities: InstructorActivity[] = [
    ...quizzes.map(transformQuizAttempt),
    ...reflections.map(transformReflection),
    ...groupAIConversationsIntoSessions(conversations) // Group conversations into sessions
  ]

  // Sort by timestamp (newest first)
  return activities.sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Group activities by date (reused from AIChatSidebarV2)
 */
export function formatDateHeader(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return "Today"
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday"
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    })
  }
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export interface GroupedActivities {
  dateKey: string
  dateHeader: string
  activities: (InstructorActivity & { formattedTime: string })[]
}

export function groupActivitiesByDate(activities: InstructorActivity[]): GroupedActivities[] {
  const groups: { [key: string]: (InstructorActivity & { formattedTime: string })[] } = {}

  activities.forEach(activity => {
    const date = new Date(activity.timestamp)
    const dateKey = date.toDateString()

    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push({
      ...activity,
      formattedTime: formatTime(date)
    })
  })

  // Sort groups by date (newest first)
  const sortedGroups = Object.keys(groups)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map(dateKey => ({
      dateKey,
      dateHeader: formatDateHeader(new Date(dateKey)),
      activities: groups[dateKey].sort((a, b) => b.timestamp - a.timestamp) // Newest first within day
    }))

  return sortedGroups
}

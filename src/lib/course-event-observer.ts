interface CourseEvent {
  type: string
  courseId?: string  // Made optional for non-course events like drafts
  userId?: string    // Added for user-specific events like drafts
  data: any
  timestamp: number
  operationId?: string
}

type EventListener = (event: CourseEvent) => void

class CourseEventObserver {
  private listeners = new Map<string, Set<EventListener>>()
  private debug = process.env.NODE_ENV === 'development'
  private metrics = {
    eventsEmitted: 0,
    listenersNotified: 0,
    errors: 0,
    averageEmitTime: 0
  }

  subscribe(eventType: string, listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    
    const eventListeners = this.listeners.get(eventType)!
    eventListeners.add(listener)
    
    // Remove noisy subscription logging

    // Return unsubscribe function
    return () => {
      eventListeners.delete(listener)
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType)
      }
      
      if (this.debug) {
        console.log(`📡 Observer: Unsubscribed from ${eventType}, remaining: ${eventListeners.size}`)
      }
    }
  }

  emit(eventType: string, courseIdOrUserId: string, data: any, operationId?: string) {
    const startTime = performance.now()

    // Determine if this is a user-specific event (like drafts/track requests) or course-specific
    const isDraftEvent = Object.values(DRAFT_EVENTS).includes(eventType as any)
    const isTrackRequestEvent = Object.values(TRACK_REQUEST_EVENTS).includes(eventType as any)
    const isUserSpecificEvent = isDraftEvent || isTrackRequestEvent

    const event: CourseEvent = {
      type: eventType,
      ...(isUserSpecificEvent ? { userId: courseIdOrUserId } : { courseId: courseIdOrUserId }),
      data,
      timestamp: Date.now(),
      operationId
    }

    const listeners = this.listeners.get(eventType)
    if (listeners && listeners.size > 0) {
      if (this.debug) {
        console.log(`📡 Observer: Emitting ${eventType} to ${listeners.size} listeners`, event)
      }
      
      let notifiedCount = 0
      listeners.forEach(listener => {
        try {
          listener(event)
          notifiedCount++
        } catch (error) {
          console.error(`📡 Observer: Error in listener for ${eventType}:`, error)
          this.metrics.errors++
        }
      })
      
      this.metrics.listenersNotified += notifiedCount
    } else if (this.debug) {
      console.warn(`📡 Observer: No listeners for ${eventType}`)
    }

    const endTime = performance.now()
    const emitTime = endTime - startTime
    this.metrics.eventsEmitted++
    this.metrics.averageEmitTime = (this.metrics.averageEmitTime + emitTime) / 2
    
    if (this.debug && emitTime > 1) {
      console.log(`📊 Observer Metrics:`, {
        emitTime,
        totalEvents: this.metrics.eventsEmitted,
        averageTime: this.metrics.averageEmitTime.toFixed(2)
      })
    }
  }

  // Utility methods for debugging and monitoring
  getListenerCount(eventType?: string): number {
    if (eventType) {
      return this.listeners.get(eventType)?.size || 0
    }
    return Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0)
  }

  getEventTypes(): string[] {
    return Array.from(this.listeners.keys())
  }

  getMetrics() {
    return { ...this.metrics }
  }

  clear() {
    this.listeners.clear()
    this.metrics = {
      eventsEmitted: 0,
      listenersNotified: 0,
      errors: 0,
      averageEmitTime: 0
    }
    if (this.debug) {
      console.log('📡 Observer: All listeners and metrics cleared')
    }
  }

  // Health check for monitoring
  isHealthy(): boolean {
    const errorRate = this.metrics.errors / Math.max(this.metrics.eventsEmitted, 1)
    return errorRate < 0.1 && this.metrics.averageEmitTime < 10 // Less than 10% errors, under 10ms average
  }
}

// Singleton instance
export const courseEventObserver = new CourseEventObserver()

// Type definitions for events
export interface ChapterUpdateEvent {
  chapterId: string
  updates: Partial<any>
}

export interface VideoUpdateEvent {
  videoId: string
  updates: Partial<any>
}

export interface ChapterDeleteEvent {
  chapterId: string
}

export interface VideoDeleteEvent {
  videoId: string
}

export interface UploadProgressEvent {
  videoId: string
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error'
  fileName?: string
}

export interface UploadCompleteEvent {
  videoId: string
  videoData: any
}

// Media event interfaces
export interface MediaUploadProgressEvent {
  mediaId: string
  filename: string
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
  operationId?: string
}

export interface MediaUploadCompleteEvent {
  mediaId: string
  filename: string
  mediaData: any
  operationId?: string
}

export interface MediaBulkOperationProgressEvent {
  operationId: string
  operationType: 'delete' | 'move' | 'tag'
  processed: number
  total: number
  progress: number
  currentItem?: string
  errors?: string[]
}

export interface MediaBulkOperationCompleteEvent {
  operationId: string
  operationType: 'delete' | 'move' | 'tag'
  processedCount: number
  failedCount: number
  results: any[]
}

// Conversation event interfaces
export interface ConversationMessageCreatedEvent {
  messageId: string
  conversationId: string
  studentId: string
  messageType: 'daily_note' | 'instructor_response' | 'activity' | 'milestone'
  senderId: string
  senderRole: 'student' | 'instructor'
  content: string
  targetDate?: string
  attachments?: any[]
}

export interface ConversationMessageUpdatedEvent {
  messageId: string
  conversationId: string
  studentId: string
  senderId: string
  updates: {
    content?: string
    metadata?: any
  }
}

export interface ConversationMessageDeletedEvent {
  messageId: string
  conversationId: string
  studentId: string
  senderId: string
}

export interface ConversationUpdatedEvent {
  conversationId: string
  studentId: string
  instructorId?: string
  updates: any
}

// Goal reassignment event interface
export interface GoalReassignmentEvent {
  studentId: string
  goalId: string | null
  goalName?: string
  trackId?: string | null
  action: 'assigned' | 'removed'
  userId: string // For filtering student-specific updates
}

// Student progress event interfaces
export interface StudentProgressUpdatedEvent {
  studentId: string
  courseId: string
  videoId: string
  watchedSeconds: number
  progressPercentage: number
  completed: boolean
  timestamp: string
}

export interface StudentVideoCompletedEvent {
  studentId: string
  courseId: string
  videoId: string
  videoTitle: string
  completedAt: string
  totalWatchTime: number
}

export interface StudentCourseProgressUpdatedEvent {
  studentId: string
  courseId: string
  progressPercentage: number
  completedLessons: number
  totalLessons: number
  estimatedTimeRemaining: string
  lastAccessedAt: string
}

// Course goal assignment event interface
export interface CourseGoalAssignmentEvent {
  courseId: string
  goalIds: string[]
  goalNames: string[]
  action: 'assigned' | 'unassigned'
}

// Course status change event interface
export interface CourseStatusChangeEvent {
  courseId: string
  status: 'published' | 'draft'
  course: any
}

// Draft event interfaces
export interface DraftSavedEvent {
  draftId: string
  type: 'bug_report' | 'feature_request'
  title?: string
  description?: string
  metadata?: any
  userId: string
  operationId?: string
}

export interface DraftDeletedEvent {
  draftId: string
  type: 'bug_report' | 'feature_request'
  userId: string
  operationId?: string
}

export interface DraftListUpdatedEvent {
  userId: string
  drafts: any[]
  operationId?: string
}

// Track request event interfaces
export interface TrackRequestSubmittedEvent {
  requestId: string
  userId: string
  trackType: 'agency' | 'saas'
  trackName: string
  status: 'pending'
  timestamp: string
}

export interface TrackRequestApprovedEvent {
  requestId: string
  userId: string
  trackType: 'agency' | 'saas'
  trackName: string
  goalId: string
  goalName?: string
  instructorId: string
  status: 'approved'
  timestamp: string
}

// Event type constants
export const COURSE_EVENTS = {
  CHAPTER_UPDATE_COMPLETE: 'chapter-update-complete',
  CHAPTER_CREATE_COMPLETE: 'chapter-create-complete',
  CHAPTER_DELETE_COMPLETE: 'chapter-delete-complete',
  VIDEO_UPDATE_COMPLETE: 'video-update-complete',
  VIDEO_DELETE_COMPLETE: 'video-delete-complete',
  UPLOAD_PROGRESS: 'upload-progress',
  UPLOAD_COMPLETE: 'upload-complete',
  STATUS_CHANGED: 'course-status-changed'
} as const

// Media events (extending the same observer system)
export const MEDIA_EVENTS = {
  MEDIA_UPLOAD_PROGRESS: 'media-upload-progress',
  MEDIA_UPLOAD_COMPLETE: 'media-upload-complete',
  MEDIA_BULK_DELETE_PROGRESS: 'media-bulk-delete-progress',
  MEDIA_BULK_DELETE_COMPLETE: 'media-bulk-delete-complete',
  MEDIA_BULK_MOVE_PROGRESS: 'media-bulk-move-progress',
  MEDIA_BULK_MOVE_COMPLETE: 'media-bulk-move-complete',
  MEDIA_LINKED: 'media-linked'
} as const

// Conversation events (real-time communication)
export const CONVERSATION_EVENTS = {
  MESSAGE_CREATED: 'conversation-message-created',
  MESSAGE_UPDATED: 'conversation-message-updated',
  MESSAGE_DELETED: 'conversation-message-deleted',
  CONVERSATION_UPDATED: 'conversation-updated'
} as const

// Student learning events (real-time progress and learning activities)
export const STUDENT_EVENTS = {
  GOAL_REASSIGNMENT: 'goal-reassignment',
  PROGRESS_UPDATED: 'student-progress-updated',
  VIDEO_COMPLETED: 'student-video-completed',
  COURSE_PROGRESS_UPDATED: 'student-course-progress-updated'
} as const

// Course goal events (real-time course-goal assignment changes)
export const COURSE_GOAL_EVENTS = {
  ASSIGNMENT_CHANGED: 'course-goal-assignment-changed'
} as const

// Draft events (real-time draft auto-save)
export const DRAFT_EVENTS = {
  DRAFT_SAVED: 'draft-saved',
  DRAFT_DELETED: 'draft-deleted',
  DRAFT_LIST_UPDATED: 'draft-list-updated'
} as const

// Track request events (real-time track assignment workflow)
export const TRACK_REQUEST_EVENTS = {
  REQUEST_SUBMITTED: 'track-request-submitted',
  REQUEST_APPROVED: 'track-request-approved'
} as const

export type CourseEventType = typeof COURSE_EVENTS[keyof typeof COURSE_EVENTS]
export type MediaEventType = typeof MEDIA_EVENTS[keyof typeof MEDIA_EVENTS]
export type ConversationEventType = typeof CONVERSATION_EVENTS[keyof typeof CONVERSATION_EVENTS]
export type StudentEventType = typeof STUDENT_EVENTS[keyof typeof STUDENT_EVENTS]
export type CourseGoalEventType = typeof COURSE_GOAL_EVENTS[keyof typeof COURSE_GOAL_EVENTS]
export type DraftEventType = typeof DRAFT_EVENTS[keyof typeof DRAFT_EVENTS]
export type TrackRequestEventType = typeof TRACK_REQUEST_EVENTS[keyof typeof TRACK_REQUEST_EVENTS]
export type AllEventType = CourseEventType | MediaEventType | ConversationEventType | StudentEventType | CourseGoalEventType | DraftEventType | TrackRequestEventType

// Development utilities
if (process.env.NODE_ENV === 'development') {
  // Expose observer to window for debugging
  ;(globalThis as any).courseEventObserver = courseEventObserver
  
  // Health check runs but doesn't log in production
  setInterval(() => {
    const metrics = courseEventObserver.getMetrics()
    // Health check running silently
  }, 30000)
}
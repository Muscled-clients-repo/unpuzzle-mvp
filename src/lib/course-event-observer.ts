interface CourseEvent {
  type: string
  courseId: string
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

  emit(eventType: string, courseId: string, data: any, operationId?: string) {
    const startTime = performance.now()
    
    const event: CourseEvent = {
      type: eventType,
      courseId,
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

// Event type constants
export const COURSE_EVENTS = {
  CHAPTER_UPDATE_COMPLETE: 'chapter-update-complete',
  CHAPTER_CREATE_COMPLETE: 'chapter-create-complete', 
  CHAPTER_DELETE_COMPLETE: 'chapter-delete-complete',
  VIDEO_UPDATE_COMPLETE: 'video-update-complete',
  VIDEO_DELETE_COMPLETE: 'video-delete-complete',
  UPLOAD_PROGRESS: 'upload-progress',
  UPLOAD_COMPLETE: 'upload-complete'
} as const

export type CourseEventType = typeof COURSE_EVENTS[keyof typeof COURSE_EVENTS]

// Development utilities
if (process.env.NODE_ENV === 'development') {
  // Expose observer to window for debugging
  ;(globalThis as any).courseEventObserver = courseEventObserver
  
  // Log observer stats every 30 seconds in development
  setInterval(() => {
    const metrics = courseEventObserver.getMetrics()
    if (metrics.eventsEmitted > 0) {
      console.log('📊 Observer Health Check:', {
        ...metrics,
        totalListeners: courseEventObserver.getListenerCount(),
        eventTypes: courseEventObserver.getEventTypes(),
        isHealthy: courseEventObserver.isHealthy()
      })
    }
  }, 30000)
}
/**
 * WebSocket Event Simulator
 * 
 * Simulates WebSocket server events for development when no real WebSocket server is available.
 * This allows us to test the Observer pattern and WebSocket-enabled features locally.
 * 
 * Architecture Compliance:
 * - Emits events through the Observer system
 * - Only used when WebSocket server is not available
 * - Can be easily replaced with real WebSocket events
 */

import { courseEventObserver, COURSE_EVENTS } from './course-event-observer'

export class WebSocketEventSimulator {
  private isEnabled = false
  private simulatedEvents = new Map<string, NodeJS.Timeout>()

  constructor() {
    // Only enable if WebSocket URL is not configured
    this.isEnabled = !process.env.NEXT_PUBLIC_WEBSOCKET_URL
    
    if (this.isEnabled) {
      console.log('🎭 WebSocket Event Simulator enabled (no WebSocket server configured)')
    }
  }

  /**
   * Simulate upload progress events
   */
  simulateUploadProgress(operationId: string, courseId: string, progressData: {
    progress: number
    loaded: number
    total: number
  }) {
    if (!this.isEnabled || typeof window === 'undefined') {
      console.log(`🎭 [SIMULATOR] Skipping upload progress - enabled: ${this.isEnabled}, window: ${typeof window !== 'undefined'}`)
      return
    }

    console.log(`🎭 [SIMULATOR] Emitting upload progress: ${progressData.progress}% for operation ${operationId}`)
    
    // Emit to Observer system immediately (no delay for progress)
    courseEventObserver.emit(
      COURSE_EVENTS.UPLOAD_PROGRESS,
      courseId,
      {
        operationId,
        courseId,
        progress: progressData.progress,
        loaded: progressData.loaded,
        total: progressData.total
      },
      operationId
    )
  }

  /**
   * Simulate upload completion event
   */
  simulateUploadComplete(operationId: string, courseId: string, data: {
    videoId: string
    chapterId: string
  }) {
    if (!this.isEnabled || typeof window === 'undefined') return

    console.log(`🎭 [SIMULATOR] Scheduling upload complete event for ${operationId}`)
    
    // Simulate network delay before completion
    const timeout = setTimeout(() => {
      console.log(`🎭 [SIMULATOR] Emitting upload complete for ${operationId}`)
      
      courseEventObserver.emit(
        COURSE_EVENTS.UPLOAD_COMPLETE,
        courseId,
        {
          operationId,
          courseId,
          videoId: data.videoId,
          chapterId: data.chapterId
        },
        operationId
      )
      
      this.simulatedEvents.delete(operationId)
    }, 200) // Small delay to simulate real server response

    this.simulatedEvents.set(operationId, timeout)
  }

  /**
   * Simulate video update completion
   */
  simulateVideoUpdateComplete(operationId: string, courseId: string, data?: any) {
    if (!this.isEnabled || typeof window === 'undefined') return

    console.log(`🎭 [SIMULATOR] Scheduling video update complete for ${operationId}`)
    
    const timeout = setTimeout(() => {
      console.log(`🎭 [SIMULATOR] Emitting video update complete for ${operationId}`)
      
      courseEventObserver.emit(
        COURSE_EVENTS.VIDEO_UPDATE_COMPLETE,
        courseId,
        {
          operationId,
          courseId,
          ...data
        },
        operationId
      )
      
      this.simulatedEvents.delete(operationId)
    }, 300)

    this.simulatedEvents.set(operationId, timeout)
  }

  /**
   * Simulate chapter update completion
   */
  simulateChapterUpdateComplete(operationId: string, courseId: string, data?: any) {
    if (!this.isEnabled || typeof window === 'undefined') return

    console.log(`🎭 [SIMULATOR] Scheduling chapter update complete for ${operationId}`)
    
    const timeout = setTimeout(() => {
      console.log(`🎭 [SIMULATOR] Emitting chapter update complete for ${operationId}`)
      
      courseEventObserver.emit(
        COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE,
        courseId,
        {
          operationId,
          courseId,
          ...data
        },
        operationId
      )
      
      this.simulatedEvents.delete(operationId)
    }, 250)

    this.simulatedEvents.set(operationId, timeout)
  }

  /**
   * Cancel all simulated events (for cleanup)
   */
  cancelAllEvents() {
    console.log(`🎭 [SIMULATOR] Cancelling ${this.simulatedEvents.size} pending events`)
    
    this.simulatedEvents.forEach((timeout, operationId) => {
      clearTimeout(timeout)
      console.log(`🎭 [SIMULATOR] Cancelled event for ${operationId}`)
    })
    
    this.simulatedEvents.clear()
  }

  /**
   * Check if simulator is active
   */
  get active() {
    return this.isEnabled
  }

  /**
   * Get count of pending simulated events
   */
  get pendingEventsCount() {
    return this.simulatedEvents.size
  }
}

// Export singleton instance
export const webSocketEventSimulator = new WebSocketEventSimulator()
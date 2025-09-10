import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useWebSocketConnection } from './use-websocket-connection'
import { useAuth } from './use-auth'
import { videoKeys } from './use-video-queries'
import { chapterKeys } from './use-chapter-queries'

interface OperationTracker {
  operationId: string
  expectedEvents: Set<string>
  receivedEvents: Set<string>
  onComplete: () => void
  timeout: NodeJS.Timeout
}

interface CourseWebSocketData {
  courseId: string
  chapterId?: string
  videoId?: string
  operationId?: string
  data?: any
  error?: string
}

export function useCourseWebSocket(courseId: string) {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  const websocket = useWebSocketConnection(userId || '')
  const operationTrackers = useRef<Map<string, OperationTracker>>(new Map())

  // Clean up operation trackers on unmount
  useEffect(() => {
    return () => {
      operationTrackers.current.forEach(tracker => {
        clearTimeout(tracker.timeout)
      })
      operationTrackers.current.clear()
    }
  }, [])

  // Complete operation tracking
  const completeOperation = useCallback((operationId: string) => {
    const tracker = operationTrackers.current.get(operationId)
    if (tracker) {
      console.log('✅ Operation completed:', operationId)
      clearTimeout(tracker.timeout)
      operationTrackers.current.delete(operationId)
      tracker.onComplete()
    }
  }, [])

  // Check if operation is complete
  const checkOperationComplete = useCallback((operationId: string) => {
    const tracker = operationTrackers.current.get(operationId)
    if (!tracker) return

    // Check if all expected events have been received
    if (tracker.expectedEvents.size === tracker.receivedEvents.size) {
      // Verify all expected events are in received events
      const allReceived = Array.from(tracker.expectedEvents).every(eventType =>
        tracker.receivedEvents.has(eventType)
      )
      
      if (allReceived) {
        completeOperation(operationId)
      }
    }
  }, [completeOperation])

  // Handle chapter update completion
  const handleChapterUpdateComplete = useCallback((data: CourseWebSocketData) => {
    if (data.courseId !== courseId) return

    console.log('📚 Chapter update completed via WebSocket:', data)
    
    // Temporarily disable invalidation to prevent infinite loops
    // queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
    
    // Track operation completion
    if (data.operationId) {
      const tracker = operationTrackers.current.get(data.operationId)
      if (tracker) {
        tracker.receivedEvents.add('chapter-update-complete')
        checkOperationComplete(data.operationId)
      } else {
        // Single operation completion
        toast.success('Chapter updated')
      }
    }
  }, [courseId, checkOperationComplete])

  // Handle video update completion
  const handleVideoUpdateComplete = useCallback((data: CourseWebSocketData) => {
    if (data.courseId !== courseId) return

    console.log('🎬 Video update completed via WebSocket:', data)
    
    // Temporarily disable invalidation to prevent infinite loops
    // queryClient.invalidateQueries({ queryKey: videoKeys.list(courseId) })
    // queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
    
    // Track operation completion
    if (data.operationId) {
      const tracker = operationTrackers.current.get(data.operationId)
      if (tracker) {
        tracker.receivedEvents.add('video-update-complete')
        checkOperationComplete(data.operationId)
      } else {
        // Single operation completion
        toast.success('Video updated')
      }
    }
  }, [courseId, checkOperationComplete])

  // Handle chapter creation completion
  const handleChapterCreateComplete = useCallback((data: CourseWebSocketData) => {
    if (data.courseId !== courseId) return

    console.log('📚 Chapter created via WebSocket:', data)
    
    // Temporarily disable invalidation to prevent infinite loops
    // queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
    
    // Track operation completion
    if (data.operationId) {
      const tracker = operationTrackers.current.get(data.operationId)
      if (tracker) {
        tracker.receivedEvents.add('chapter-create-complete')
        checkOperationComplete(data.operationId)
      } else {
        toast.success('Chapter created')
      }
    }
  }, [courseId, checkOperationComplete])

  // Handle chapter deletion completion
  const handleChapterDeleteComplete = useCallback((data: CourseWebSocketData) => {
    if (data.courseId !== courseId) return

    console.log('🗑️ Chapter deleted via WebSocket:', data)
    
    // PHASE 4: Only invalidate chapters cache - eliminate videoKeys.list() confusion
    // queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
    
    // Track operation completion
    if (data.operationId) {
      const tracker = operationTrackers.current.get(data.operationId)
      if (tracker) {
        tracker.receivedEvents.add('chapter-delete-complete')
        checkOperationComplete(data.operationId)
      } else {
        toast.success('Chapter deleted')
      }
    }
  }, [courseId, checkOperationComplete])

  // Handle video deletion completion
  const handleVideoDeleteComplete = useCallback((data: CourseWebSocketData) => {
    if (data.courseId !== courseId) return

    console.log('🗑️ Video deleted via WebSocket:', data)
    
    // Temporarily disable invalidation to prevent infinite loops
    // queryClient.invalidateQueries({ queryKey: videoKeys.list(courseId) })
    // queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
    
    // Track operation completion
    if (data.operationId) {
      const tracker = operationTrackers.current.get(data.operationId)
      if (tracker) {
        tracker.receivedEvents.add('video-delete-complete')
        checkOperationComplete(data.operationId)
      } else {
        toast.success('Video deleted')
      }
    }
  }, [courseId, checkOperationComplete])

  // Handle upload progress
  const handleUploadProgress = useCallback((data: CourseWebSocketData & { progress: number }) => {
    if (data.courseId !== courseId) return

    console.log('📈 Upload progress via WebSocket:', data.progress)
    
    // Update TanStack cache with progress data
    // This will be handled by the upload hook's cache updates
  }, [courseId])

  // Handle upload completion
  const handleUploadComplete = useCallback((data: CourseWebSocketData) => {
    if (data.courseId !== courseId) return

    console.log('📤 Upload completed via WebSocket:', data)
    
    // Temporarily disable invalidation to prevent infinite loops
    // queryClient.invalidateQueries({ queryKey: videoKeys.list(courseId) })
    // queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
    
    // Track operation completion
    if (data.operationId) {
      const tracker = operationTrackers.current.get(data.operationId)
      if (tracker) {
        tracker.receivedEvents.add('upload-complete')
        checkOperationComplete(data.operationId)
      } else {
        toast.success('Upload completed')
      }
    }
  }, [courseId, checkOperationComplete])

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!websocket.isConnected || !websocket.subscribe) return

    const unsubscribers = [
      websocket.subscribe('chapter-update-complete', handleChapterUpdateComplete),
      websocket.subscribe('video-update-complete', handleVideoUpdateComplete),
      websocket.subscribe('chapter-create-complete', handleChapterCreateComplete),
      websocket.subscribe('chapter-delete-complete', handleChapterDeleteComplete),
      websocket.subscribe('video-delete-complete', handleVideoDeleteComplete),
      websocket.subscribe('upload-progress', handleUploadProgress),
      websocket.subscribe('upload-complete', handleUploadComplete)
    ]

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [websocket.isConnected, websocket.subscribe])

  // Track single operation
  const trackOperation = useCallback((operationId: string, eventType: string, onComplete?: () => void) => {
    const tracker: OperationTracker = {
      operationId,
      expectedEvents: new Set([eventType]),
      receivedEvents: new Set(),
      onComplete: onComplete || (() => {}),
      timeout: setTimeout(() => {
        console.warn('⚠️ Operation timeout:', operationId, eventType)
        operationTrackers.current.delete(operationId)
        
        // Fallback: show success anyway (optimistic)
        onComplete?.()
      }, 10000) // 10 second timeout
    }
    
    operationTrackers.current.set(operationId, tracker)
  }, [])

  // Track multi-operation (complex save scenarios)
  const trackMultiOperation = useCallback((
    operationId: string, 
    eventTypes: string[], 
    onComplete: () => void
  ) => {
    const tracker: OperationTracker = {
      operationId,
      expectedEvents: new Set(eventTypes),
      receivedEvents: new Set(),
      onComplete,
      timeout: setTimeout(() => {
        console.warn('⚠️ Multi-operation timeout:', operationId, eventTypes)
        operationTrackers.current.delete(operationId)
        
        // Fallback: show success anyway (optimistic)
        onComplete()
      }, 15000) // 15 second timeout for complex operations
    }
    
    operationTrackers.current.set(operationId, tracker)
    console.log('🎯 Tracking multi-operation:', operationId, eventTypes)
  }, [])

  return {
    // Connection state
    isConnected: websocket.isConnected,
    isReconnecting: websocket.isReconnecting,
    error: websocket.error,
    
    // Operation tracking
    trackOperation,
    trackMultiOperation,
    
    // Manual reconnect
    reconnect: websocket.reconnect
  }
}
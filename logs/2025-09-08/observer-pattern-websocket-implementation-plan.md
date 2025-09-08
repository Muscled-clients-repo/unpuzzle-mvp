# Observer Pattern WebSocket Implementation Plan

**Date**: 2025-09-08  
**Solution**: Observer Pattern for WebSocket architectural fix  
**Goal**: Eliminate infinite loops while maintaining real-time updates and 3-layer SSOT pattern  

## Implementation Overview

The Observer Pattern creates a clean event system where:
- **WebSocket Layer**: Only publishes events, no state management
- **Observer System**: Lightweight custom event dispatcher  
- **TanStack Layer**: Subscribes to events, owns all cache management
- **Components**: Orchestrate actions, no direct WebSocket subscriptions

## Phase 1: Core Observer System

### 1.1 Create Course Event Observer

**File**: `src/lib/course-event-observer.ts`

```typescript
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

  subscribe(eventType: string, listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    
    const eventListeners = this.listeners.get(eventType)!
    eventListeners.add(listener)
    
    if (this.debug) {
      console.log(`📡 Observer: Subscribed to ${eventType}, total listeners: ${eventListeners.size}`)
    }

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
      
      listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error(`📡 Observer: Error in listener for ${eventType}:`, error)
        }
      })
    } else if (this.debug) {
      console.warn(`📡 Observer: No listeners for ${eventType}`)
    }
  }

  // Utility methods for debugging
  getListenerCount(eventType?: string): number {
    if (eventType) {
      return this.listeners.get(eventType)?.size || 0
    }
    return Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0)
  }

  getEventTypes(): string[] {
    return Array.from(this.listeners.keys())
  }

  clear() {
    this.listeners.clear()
    if (this.debug) {
      console.log('📡 Observer: All listeners cleared')
    }
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
```

### 1.2 Update WebSocket Connection Hook

**File**: `src/hooks/use-websocket-connection.ts` (Update existing)

```typescript
// Add observer integration
import { courseEventObserver, COURSE_EVENTS } from '@/lib/course-event-observer'

export function useWebSocketConnection(userId: string) {
  // ... existing connection logic ...
  
  // Update onmessage handler
  wsConnection.onmessage = (event) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      console.log('📨 WebSocket message received:', message.type, message.data)
      
      // Emit to observer system instead of direct listeners
      if (message.data?.courseId && Object.values(COURSE_EVENTS).includes(message.type as any)) {
        courseEventObserver.emit(
          message.type,
          message.data.courseId,
          message.data,
          message.data.operationId
        )
      }
      
      // Keep existing listener system for backward compatibility during migration
      const listeners = messageListeners.current.get(message.type)
      if (listeners) {
        listeners.forEach(callback => callback(message.data))
      }
      
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error)
    }
  }
  
  // ... rest of existing logic
}
```

## Phase 2: Update TanStack Hooks

### 2.1 Update Chapter Queries Hook

**File**: `src/hooks/use-chapter-queries.ts` (Update existing)

```typescript
import { courseEventObserver, COURSE_EVENTS } from '@/lib/course-event-observer'

export function useChaptersEdit(courseId: string) {
  const queryClient = useQueryClient()
  // Remove websocket dependency
  // const websocket = useCourseWebSocket(courseId) // REMOVE
  
  // ... existing query logic ...

  // NEW: Subscribe to observer events for cache management
  useEffect(() => {
    const unsubscribers = [
      // Chapter update completion
      courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, (event) => {
        if (event.courseId !== courseId) return
        
        console.log('📚 Chapter update completed via Observer:', event)
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
        
        // Handle operation completion tracking if needed
        if (event.operationId) {
          toast.success('Chapter updated')
        }
      }),

      // Chapter creation completion  
      courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_CREATE_COMPLETE, (event) => {
        if (event.courseId !== courseId) return
        
        console.log('📚 Chapter created via Observer:', event)
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
        
        if (event.operationId) {
          toast.success('Chapter created')
        }
      }),

      // Chapter deletion completion
      courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_DELETE_COMPLETE, (event) => {
        if (event.courseId !== courseId) return
        
        console.log('🗑️ Chapter deleted via Observer:', event)
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
        
        if (event.operationId) {
          toast.success('Chapter deleted')
        }
      })
    ]

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [courseId, queryClient]) // Stable dependencies only

  // Update WebSocket-enabled functions to use operation tracking without direct cache manipulation
  const updateChapterWithWebSocket = (chapterId: string, updates: Partial<Chapter>) => {
    const operationId = generateOperationId()
    console.log(`📚 Starting WebSocket chapter update: ${operationId}`)
    
    // No direct WebSocket tracking - let observer handle it
    updateMutation.mutate({ chapterId, updates, operationId })
  }

  const deleteChapterWithWebSocket = (chapterId: string) => {
    const operationId = generateOperationId()
    console.log(`🗑️ Starting WebSocket chapter delete: ${operationId}`)
    
    // No direct WebSocket tracking - let observer handle it
    deleteMutation.mutate({ chapterId, operationId })
  }

  // ... rest of existing logic
}
```

### 2.2 Update Video Queries Hook

**File**: `src/hooks/use-video-queries.ts` (Update existing)

```typescript
import { courseEventObserver, COURSE_EVENTS } from '@/lib/course-event-observer'

export function useVideoBatchOperations(courseId: string) {
  const queryClient = useQueryClient()
  
  // Subscribe to observer events
  useEffect(() => {
    const unsubscribers = [
      courseEventObserver.subscribe(COURSE_EVENTS.VIDEO_UPDATE_COMPLETE, (event) => {
        if (event.courseId !== courseId) return
        
        console.log('🎬 Video update completed via Observer:', event)
        queryClient.invalidateQueries({ queryKey: videoKeys.list(courseId) })
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
        
        if (event.operationId) {
          toast.success('Video updated')
        }
      }),

      courseEventObserver.subscribe(COURSE_EVENTS.VIDEO_DELETE_COMPLETE, (event) => {
        if (event.courseId !== courseId) return
        
        console.log('🗑️ Video deleted via Observer:', event)
        queryClient.invalidateQueries({ queryKey: videoKeys.list(courseId) })
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
        
        if (event.operationId) {
          toast.success('Video deleted')
        }
      }),

      courseEventObserver.subscribe(COURSE_EVENTS.UPLOAD_PROGRESS, (event) => {
        if (event.courseId !== courseId) return
        
        console.log('📈 Upload progress via Observer:', event.data.progress)
        // Update upload progress in cache
        // This will be handled by upload-specific cache updates
      }),

      courseEventObserver.subscribe(COURSE_EVENTS.UPLOAD_COMPLETE, (event) => {
        if (event.courseId !== courseId) return
        
        console.log('📤 Upload completed via Observer:', event)
        queryClient.invalidateQueries({ queryKey: videoKeys.list(courseId) })
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
        
        if (event.operationId) {
          toast.success('Upload completed')
        }
      })
    ]

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [courseId, queryClient])

  // ... rest of existing logic
}
```

## Phase 3: Simplify WebSocket Hook

### 3.1 Create Simplified Course WebSocket Hook

**File**: `src/hooks/use-course-websocket.ts` (Replace existing)

```typescript
import { useWebSocketConnection } from './use-websocket-connection'
import { useAuth } from './use-auth'

// Simplified WebSocket hook - only connection status and operation tracking
export function useCourseWebSocket(courseId: string) {
  const { userId } = useAuth()
  const websocket = useWebSocketConnection(userId || '')

  // No event handlers - observer system handles everything
  // This hook only provides connection status and operation utilities

  return {
    // Connection state only
    isConnected: websocket.isConnected,
    isReconnecting: websocket.isReconnecting,
    error: websocket.error,
    
    // Manual reconnect
    reconnect: websocket.reconnect,
    
    // Utility for generating operation IDs
    generateOperationId: () => `${courseId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
```

## Phase 4: Migration Strategy

### 4.1 Backward Compatibility

During migration, both systems will work simultaneously:

```typescript
// In use-chapter-queries.ts
export function useChaptersEdit(courseId: string) {
  // Old system (temporarily kept)
  const websocket = useCourseWebSocket(courseId)
  
  // New system (observer)
  useEffect(() => {
    // Observer subscriptions
  }, [courseId, queryClient])
  
  // Both systems will receive events during migration
  // Remove old system after testing new system
}
```

### 4.2 Migration Steps

1. **Phase 4.1**: Deploy observer system alongside existing WebSocket hooks
2. **Phase 4.2**: Test observer system with real WebSocket events
3. **Phase 4.3**: Remove old WebSocket event handlers from TanStack hooks
4. **Phase 4.4**: Simplify WebSocket hooks to connection status only
5. **Phase 4.5**: Remove operation tracking complexity

## Phase 5: Testing Plan

### 5.1 Unit Tests

**File**: `src/lib/__tests__/course-event-observer.test.ts`

```typescript
import { courseEventObserver, COURSE_EVENTS } from '../course-event-observer'

describe('CourseEventObserver', () => {
  beforeEach(() => {
    courseEventObserver.clear()
  })

  test('subscribes and unsubscribes correctly', () => {
    const listener = jest.fn()
    const unsubscribe = courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, listener)
    
    expect(courseEventObserver.getListenerCount(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE)).toBe(1)
    
    unsubscribe()
    
    expect(courseEventObserver.getListenerCount(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE)).toBe(0)
  })

  test('emits events to correct listeners', () => {
    const chapterListener = jest.fn()
    const videoListener = jest.fn()
    
    courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, chapterListener)
    courseEventObserver.subscribe(COURSE_EVENTS.VIDEO_UPDATE_COMPLETE, videoListener)
    
    courseEventObserver.emit(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, 'course-123', { chapterId: 'ch-1' })
    
    expect(chapterListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE,
        courseId: 'course-123',
        data: { chapterId: 'ch-1' }
      })
    )
    expect(videoListener).not.toHaveBeenCalled()
  })

  test('handles listener errors gracefully', () => {
    const errorListener = jest.fn(() => { throw new Error('Test error') })
    const goodListener = jest.fn()
    
    courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, errorListener)
    courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, goodListener)
    
    // Should not throw
    courseEventObserver.emit(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, 'course-123', {})
    
    expect(goodListener).toHaveBeenCalled()
  })
})
```

### 5.2 Integration Tests

**File**: `src/hooks/__tests__/use-chapters-edit-observer.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react'
import { courseEventObserver, COURSE_EVENTS } from '@/lib/course-event-observer'
import { useChaptersEdit } from '../use-chapter-queries'

// Mock TanStack Query
jest.mock('@tanstack/react-query')

describe('useChaptersEdit with Observer', () => {
  test('invalidates cache when chapter update event received', async () => {
    const mockInvalidateQueries = jest.fn()
    const mockQueryClient = { invalidateQueries: mockInvalidateQueries }
    
    const { result } = renderHook(() => useChaptersEdit('course-123'))
    
    // Emit event via observer
    act(() => {
      courseEventObserver.emit(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, 'course-123', {
        chapterId: 'ch-1',
        updates: { title: 'New Title' }
      })
    })
    
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: expect.arrayContaining(['chapters', 'list', 'course-123'])
    })
  })
  
  test('ignores events for different courses', async () => {
    const mockInvalidateQueries = jest.fn()
    
    const { result } = renderHook(() => useChaptersEdit('course-123'))
    
    act(() => {
      courseEventObserver.emit(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, 'course-456', {
        chapterId: 'ch-1'
      })
    })
    
    expect(mockInvalidateQueries).not.toHaveBeenCalled()
  })
})
```

## Phase 6: Performance Monitoring

### 6.1 Observer Performance Metrics

```typescript
// Add to course-event-observer.ts
class CourseEventObserver {
  private metrics = {
    eventsEmitted: 0,
    listenersNotified: 0,
    errors: 0,
    averageEmitTime: 0
  }

  emit(eventType: string, courseId: string, data: any, operationId?: string) {
    const startTime = performance.now()
    
    // ... existing emit logic ...
    
    const endTime = performance.now()
    this.metrics.eventsEmitted++
    this.metrics.averageEmitTime = (this.metrics.averageEmitTime + (endTime - startTime)) / 2
    
    if (this.debug) {
      console.log(`📊 Observer Metrics:`, {
        emitTime: endTime - startTime,
        totalEvents: this.metrics.eventsEmitted,
        averageTime: this.metrics.averageEmitTime
      })
    }
  }

  getMetrics() {
    return { ...this.metrics }
  }
}
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Create observer system (`course-event-observer.ts`)
- [ ] Add observer integration to WebSocket connection
- [ ] Write unit tests for observer

### Week 2: TanStack Integration  
- [ ] Update `use-chapter-queries.ts` with observer subscriptions
- [ ] Update `use-video-queries.ts` with observer subscriptions
- [ ] Test observer system with existing WebSocket events

### Week 3: Migration & Cleanup
- [ ] Remove old WebSocket handlers from TanStack hooks
- [ ] Simplify `use-course-websocket.ts`
- [ ] Integration testing

### Week 4: Performance & Polish
- [ ] Performance monitoring
- [ ] Error handling improvements
- [ ] Documentation updates

## Success Criteria

✅ **No infinite loops** - Observer pattern eliminates circular dependencies  
✅ **Real-time updates work** - All WebSocket events properly handled  
✅ **Clean architecture** - Perfect layer separation maintained  
✅ **No performance regression** - Observer system has minimal overhead  
✅ **Easy to test** - Each layer testable in isolation  
✅ **Backward compatible** - Migration can be done incrementally  

## Rollback Plan

If issues arise:
1. **Phase 1**: Revert to temporary fix (disabled invalidations)
2. **Phase 2**: Remove observer subscriptions, re-enable old WebSocket handlers  
3. **Phase 3**: Remove observer system entirely
4. **Phase 4**: Return to original architecture

The observer system is additive - it doesn't break existing functionality, making rollback safe and straightforward.
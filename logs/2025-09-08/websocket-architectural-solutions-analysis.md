# WebSocket Architectural Solutions Analysis

**Date**: 2025-09-08  
**Context**: Fixing infinite loop while maintaining separation of concerns  
**Goal**: Choose optimal WebSocket architecture that preserves 3-layer SSOT pattern  

## Problem Statement

Current WebSocket implementation violates architectural boundaries by directly manipulating TanStack cache from WebSocket handlers, causing infinite re-render loops. Need solution that maintains:
- ✅ TanStack Query owns server state
- ✅ Zustand owns UI state  
- ✅ Form State owns input processing
- ✅ Clear layer boundaries with no cross-contamination

## Architectural Solutions Analysis

### 1. Event Bus Pattern (Original Recommendation)

**Implementation**: WebSocket emits events to event bus, TanStack hooks subscribe to events

```typescript
// WebSocket Layer - Pure event emission
export function useCourseWebSocket(courseId: string) {
  const eventBus = useRef<EventEmitter>(new EventEmitter())
  
  useEffect(() => {
    websocket.subscribe('chapter-update-complete', (data) => {
      eventBus.current.emit('chapter-update', data)
    })
  }, [])
  
  return {
    on: eventBus.current.on.bind(eventBus.current),
    off: eventBus.current.off.bind(eventBus.current)
  }
}

// TanStack Layer - Owns cache management  
export function useChaptersEdit(courseId: string) {
  const websocket = useCourseWebSocket(courseId)
  
  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
    }
    websocket.on('chapter-update', handleUpdate)
    return () => websocket.off('chapter-update', handleUpdate)
  }, [courseId])
}
```

**Pros:**
- ✅ Perfect layer separation - WebSocket only emits, TanStack only manages cache
- ✅ No circular dependencies
- ✅ Follows established 3-layer pattern
- ✅ Event-driven architecture scales well
- ✅ Easy to test each layer independently
- ✅ Multiple consumers can subscribe to same events

**Cons:**
- ⚠️ Adds complexity with event bus abstraction layer
- ⚠️ Requires EventEmitter dependency or custom implementation
- ⚠️ More files/hooks to maintain

---

### 2. WebSocket-Free Approach (Simplification)

**Implementation**: Remove WebSockets entirely, use polling or server actions only

```typescript
// No WebSocket hooks at all
export function useChaptersEdit(courseId: string) {
  // Regular TanStack with background refetch
  const query = useQuery({
    queryKey: chapterKeys.list(courseId),
    refetchInterval: 2000, // Poll every 2 seconds
    refetchOnWindowFocus: true
  })
  
  // Mutations trigger immediate cache updates
  const updateMutation = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
    }
  })
}
```

**Pros:**
- ✅ Zero circular dependency risk
- ✅ Extremely simple - no WebSocket complexity
- ✅ Perfect layer separation maintained
- ✅ No subscription management needed
- ✅ TanStack handles all caching natively

**Cons:**
- ❌ No real-time updates (2-5 second delay)
- ❌ Higher server load from polling
- ❌ Poor user experience for collaborative editing
- ❌ Wastes the WebSocket infrastructure already built

---

### 3. Debounced/Throttled Invalidation Pattern

**Implementation**: Keep current structure but add debouncing to prevent rapid invalidations

```typescript
export function useCourseWebSocket(courseId: string) {
  const debouncedInvalidate = useMemo(
    () => debounce((queryKey) => {
      queryClient.invalidateQueries({ queryKey })
    }, 500),
    [queryClient]
  )
  
  const handleChapterUpdate = useCallback((data) => {
    // Debounced invalidation prevents rapid fire
    debouncedInvalidate(chapterKeys.list(courseId))
  }, [courseId, debouncedInvalidate])
}
```

**Pros:**
- ✅ Minimal code changes required
- ✅ Keeps existing WebSocket structure
- ✅ Reduces invalidation frequency
- ✅ Real-time updates maintained

**Cons:**
- ❌ Still violates layer boundaries (WebSocket manages TanStack)
- ❌ Band-aid solution - doesn't fix root architectural issue
- ❌ Debounce delay may feel sluggish
- ❌ Complex timing dependencies

---

### 4. Custom Hook Composition Pattern

**Implementation**: Separate WebSocket connection from cache management via hook composition

```typescript
// Pure WebSocket connection hook
export function useWebSocketConnection(userId: string) {
  // Only handles connection, returns stable subscribe function
  return { subscribe, isConnected }
}

// Pure WebSocket event hook  
export function useWebSocketEvents(subscribe: Function, courseId: string) {
  const [events, setEvents] = useState<WebSocketEvent[]>([])
  
  useEffect(() => {
    const unsubscribe = subscribe('chapter-update', (data) => {
      setEvents(prev => [...prev, { type: 'chapter-update', data }])
    })
    return unsubscribe
  }, [subscribe, courseId])
  
  return events
}

// TanStack hook composes with WebSocket events
export function useChaptersEdit(courseId: string) {
  const websocket = useWebSocketConnection()
  const events = useWebSocketEvents(websocket.subscribe, courseId)
  
  // React to events in TanStack layer
  useEffect(() => {
    const chapterEvents = events.filter(e => e.type === 'chapter-update')
    if (chapterEvents.length > 0) {
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
    }
  }, [events, courseId])
}
```

**Pros:**
- ✅ Clean separation of concerns
- ✅ Composable hooks for different use cases
- ✅ TanStack owns cache management timing
- ✅ No circular dependencies

**Cons:**
- ⚠️ More complex hook composition
- ⚠️ Event state management in hook
- ⚠️ Multiple useEffect chains to manage

---

### 5. Server-Sent Events (SSE) Alternative

**Implementation**: Replace WebSockets with Server-Sent Events for unidirectional updates

```typescript
export function useCourseSSE(courseId: string) {
  useEffect(() => {
    const eventSource = new EventSource(`/api/course/${courseId}/events`)
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      // Direct cache updates - no subscription complexity
      if (data.type === 'chapter-update') {
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
      }
    }
    
    return () => eventSource.close()
  }, [courseId])
}
```

**Pros:**
- ✅ Simpler than WebSockets (unidirectional)
- ✅ Native browser API, no library dependencies
- ✅ Automatic reconnection handling
- ✅ HTTP/2 multiplexing support

**Cons:**
- ❌ Still violates layer boundaries
- ❌ No bidirectional communication
- ❌ Requires server-side SSE implementation
- ❌ Less flexible than WebSocket events

---

### 6. TanStack Query Extensions Pattern

**Implementation**: Create custom TanStack Query extensions for WebSocket integration

```typescript
// Custom TanStack mutation with WebSocket integration
export function useWebSocketMutation(options) {
  return useMutation({
    ...options,
    onMutate: async (variables) => {
      // Start WebSocket operation tracking
      const operationId = generateOperationId()
      websocketTracker.track(operationId, options.expectedEvent)
      return { ...variables, operationId }
    },
    onSuccess: (data, variables) => {
      // WebSocket will handle completion notification
      options.onSuccess?.(data, variables)
    }
  })
}

// Usage in hooks
export function useChaptersEdit(courseId: string) {
  const updateMutation = useWebSocketMutation({
    mutationFn: updateChapterAction,
    expectedEvent: 'chapter-update-complete'
  })
}
```

**Pros:**
- ✅ Extends TanStack Query naturally
- ✅ WebSocket integration feels native to TanStack
- ✅ Maintains TanStack patterns and APIs
- ✅ No additional state management layers

**Cons:**
- ⚠️ Custom TanStack extensions may break with updates
- ⚠️ More complex integration pattern
- ⚠️ Still need WebSocket connection management

---

### 7. Observer Pattern with Custom Event System

**Implementation**: Custom observer system that mimics DOM events

```typescript
class CourseEventObserver {
  private listeners = new Map<string, Set<Function>>()
  
  subscribe(eventType: string, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback)
    
    return () => this.listeners.get(eventType)?.delete(callback)
  }
  
  emit(eventType: string, data: any) {
    this.listeners.get(eventType)?.forEach(callback => callback(data))
  }
}

// WebSocket publishes to observer
const courseEvents = new CourseEventObserver()

export function useCourseWebSocket(courseId: string) {
  useEffect(() => {
    const unsubscribe = websocket.subscribe('chapter-update', (data) => {
      courseEvents.emit('chapter-update', data)
    })
    return unsubscribe
  }, [])
}

// TanStack subscribes to observer
export function useChaptersEdit(courseId: string) {
  useEffect(() => {
    return courseEvents.subscribe('chapter-update', () => {
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
    })
  }, [courseId])
}
```

**Pros:**
- ✅ Perfect layer separation
- ✅ No external dependencies
- ✅ Very lightweight custom implementation
- ✅ Easy to extend and test

**Cons:**
- ⚠️ Custom implementation needs maintenance
- ⚠️ Less battle-tested than established libraries

---

## Recommendation Analysis

### Evaluation Criteria

| Criteria | Weight | Event Bus | No WebSocket | Debounced | Hook Composition | SSE | TanStack Ext | Observer |
|----------|--------|-----------|-------------|-----------|------------------|-----|-------------|----------|
| **Arch Compliance** | 🔥🔥🔥 | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Implementation Effort** | 🔥🔥 | ⚠️ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ⚠️ |
| **Performance** | 🔥🔥 | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Real-time UX** | 🔥🔥 | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Maintainability** | 🔥 | ✅ | ✅ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **Testability** | 🔥 | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ |

### Final Recommendation: **Observer Pattern** (#7)

**Why Observer Pattern is Best:**

1. **Perfect Architectural Compliance**: Maintains strict layer boundaries without violations
2. **Minimal Dependencies**: No external libraries, fully controlled implementation  
3. **Lightweight**: Simpler than full EventEmitter, tailored to your needs
4. **Battle-tested Pattern**: Observer is a foundational design pattern
5. **Easy Migration**: Can implement incrementally alongside current code
6. **Future-proof**: Easy to extend without breaking existing functionality

### Implementation Priority Order

1. **Phase 1**: Observer Pattern implementation (Recommended)
2. **Phase 2**: Event Bus Pattern (If Observer proves insufficient)
3. **Phase 3**: WebSocket-Free Approach (Fallback if real-time isn't critical)

### Why NOT the others:

- **Debounced**: Band-aid solution, doesn't fix architectural violation
- **Hook Composition**: Over-engineered for this use case
- **SSE**: Requires server changes and still violates boundaries  
- **TanStack Extensions**: Too tightly coupled, fragile to updates
- **No WebSocket**: Loses real-time benefits you've already invested in

## Next Steps

The Observer Pattern provides the cleanest architectural solution while maintaining your established 3-layer pattern. It's lightweight, testable, and preserves the real-time WebSocket benefits without circular dependencies.

Would you like me to create the detailed implementation plan for the Observer Pattern approach?
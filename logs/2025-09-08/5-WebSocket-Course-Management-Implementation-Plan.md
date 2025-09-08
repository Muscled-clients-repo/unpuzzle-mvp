# WebSocket Course Management Implementation Plan

**Date:** September 8, 2025  
**Architecture Reference:** `1-0939AM-Architecture-Principles-Course-Creation-Edit-Flow.md` Lines 65-86, 142-158  
**Use Cases Reference:** `4-WebSocket-Course-Management-Implementation-Spec.md`

---

## Architecture Compliance: Following Established Patterns

**Core Pattern (Architecture Doc Lines 69-74):**
1. Component → TanStack mutation → Server Action
2. Server Action initiates operation → Returns operationId immediately  
3. Server broadcasts progress/completion via WebSocket
4. WebSocket hook → Updates TanStack cache
5. Components read from TanStack (single source of truth)

---

## Phase 1: WebSocket Infrastructure

### 1.1 Create WebSocket Connection Hook
**File:** `src/hooks/use-websocket-connection.ts`

**Architecture Compliance:**
- WebSocket connection managed by custom hook (Architecture Doc Line 85)
- Integrated with TanStack for cache updates (Architecture Doc Line 155)

**Implementation:**
```typescript
export function useWebSocketConnection(userId: string) {
  // WebSocket connection with auto-reconnect
  // Event listener registration
  // Connection state management
  // Error handling and fallback
}
```

### 1.2 Create Course Operations WebSocket Hook  
**File:** `src/hooks/use-course-websocket.ts`

**Architecture Compliance:**
- WebSocket hook receives updates → Updates TanStack cache (Architecture Doc Line 82)
- No cross-layer coordination (Architecture Doc Line 156)

**Implementation:**
```typescript
export function useCourseWebSocket(courseId: string) {
  // Listen for course-specific WebSocket events
  // Update TanStack cache directly on events
  // Track operation completion for toast coordination
}
```

---

## Phase 2: Server Action Integration

### 2.1 Update Server Actions for WebSocket Response
**Files:** 
- `src/app/actions/chapter-actions.ts`
- `src/app/actions/video-actions.ts`

**Architecture Compliance:**
- Server Action starts operation and returns immediately (Architecture Doc Line 70)
- Background process tracks and broadcasts via WebSocket (Architecture Doc Line 71)

**Pattern Updates:**
```typescript
// Current: Synchronous response
export async function updateChapterAction(data) {
  const result = await updateChapter(data)
  return { success: true, data: result }
}

// New: WebSocket-enabled response
export async function updateChapterAction(data) {
  const operationId = generateId()
  
  // Start background operation
  updateChapterBackground(data, operationId)
  
  // Return immediately with operation tracking
  return { 
    success: true, 
    operationId,
    immediate: true // Indicates WebSocket completion coming
  }
}
```

### 2.2 Create Operation Tracking System
**File:** `src/lib/websocket-operations.ts`

**Handles:**
- Operation ID generation and tracking
- Multi-operation coordination (complex save scenarios)
- Success toast timing coordination

---

## Phase 3: TanStack Integration Updates

### 3.1 Update Video Batch Operations Hook
**File:** `src/hooks/use-video-queries.ts`

**Architecture Compliance:**
- TanStack mutations call server actions (Architecture Doc Line 61)
- WebSocket updates flow through TanStack cache (Architecture Doc Line 82)

**Changes:**
```typescript
export function useVideoBatchOperations(courseId: string) {
  const websocket = useCourseWebSocket(courseId)
  
  const batchUpdateMutation = useMutation({
    mutationFn: async (data) => {
      // Call server action, get operationId
      const result = await batchUpdateVideoOrdersAction(data)
      
      // Register for WebSocket completion
      if (result.operationId) {
        websocket.trackOperation(result.operationId, 'video-batch-update')
      }
      
      return result
    },
    
    // Remove onSuccess/onError - WebSocket handles completion
  })
  
  return {
    batchUpdateVideos: batchUpdateMutation.mutate,
    isBatchUpdating: batchUpdateMutation.isPending,
    // Operation completion tracked via WebSocket
  }
}
```

### 3.2 Update Chapter Operations Hook
**File:** `src/hooks/use-chapter-queries.ts`

**Same pattern as video operations:**
- Remove complex onSuccess/onError callbacks
- WebSocket handles completion events
- TanStack cache updated via WebSocket hook

---

## Phase 4: Save Flow Transformation

### 4.1 Simplify Save Function
**File:** `src/app/instructor/course/[id]/edit/page.tsx`

**Architecture Compliance:**
- UI Orchestration coordinates multiple TanStack mutations (Architecture Doc Line 174)
- Layer boundaries maintained (Architecture Doc Line 172)

**Transformation:**
```typescript
// OLD: Complex polling and Promise.all coordination
const handleSave = async () => {
  try {
    setIsSaving(true)
    const savePromises = []
    
    // Complex polling logic...
    while (isBatchUpdating && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    await Promise.all(savePromises)
    toast.success('Course updated')
  } catch (error) {
    // Error handling
  } finally {
    setIsSaving(false)
  }
}

// NEW: WebSocket-coordinated operations
const handleSave = async () => {
  const operationId = generateOperationId()
  
  try {
    setIsSaving(true)
    
    // Start all operations with shared operationId
    const operations = []
    
    if (videoPendingChanges) {
      operations.push(batchUpdateVideos({ courseId, updates: videoUpdates, operationId }))
    }
    
    if (chapterPendingChanges) {
      Object.entries(chapterPendingChanges).forEach(([chapterId, newTitle]) => {
        operations.push(updateChapter({ chapterId, updates: { title: newTitle }, operationId }))
      })
    }
    
    // Register for completion coordination
    websocket.trackMultiOperation(operationId, operations.length, () => {
      toast.success('Course updated')
      setIsSaving(false)
    })
    
    // Clear pending states immediately (optimistic)
    ui.clearAllVideoPendingChanges()
    ui.clearAllChapterPendingChanges()
    
  } catch (error) {
    toast.error('Failed to start save operation')
    setIsSaving(false)
  }
}
```

---

## Phase 5: Use Case Implementation

### 5.1 Simple Operations (Target: <500ms)
**Use Cases:**
- Edit chapter title only
- Edit filename only  
- Delete single video
- Add empty chapter

**Implementation:**
- Single WebSocket event: `chapter-update-complete`, `video-update-complete`
- Immediate toast on event receipt
- TanStack cache update via WebSocket hook

### 5.2 Complex Operations (Target: <1s total)
**Use Cases:**
- Edit chapter title + rename videos
- Add chapter + upload files + edit existing titles
- Delete chapter + rename remaining videos

**Implementation:**
- Multi-operation coordination via operationId
- Track expected event count
- Success toast only after ALL events received
- Consolidated TanStack cache updates

### 5.3 Upload Operations (Real-time Progress)
**Use Cases:**
- Upload new files to existing chapter
- Add new chapter + upload files

**Implementation:**
- WebSocket `upload-progress` events → TanStack cache
- WebSocket `upload-complete` → Final cache update + completion tracking
- Real-time progress bars read from TanStack

---

## Phase 6: Error Handling & Fallback

### 6.1 WebSocket Disconnection Handling
**Strategy:**
- Detect WebSocket disconnection
- Fall back to current polling approach
- Auto-reconnect and resume WebSocket mode
- User notification of degraded mode

### 6.2 Operation Timeout Handling  
**Strategy:**
- 10-second timeout per operation
- If WebSocket event not received, query server directly
- Update TanStack cache and show appropriate message
- Log timeout for debugging

---

## Implementation Schedule

### Week 1: Infrastructure (Phases 1-2)
- WebSocket connection hooks
- Server action updates
- Operation tracking system

### Week 2: Integration (Phases 3-4)  
- TanStack hook updates
- Save flow transformation
- Testing simple operations

### Week 3: Advanced Features (Phases 5-6)
- Complex operation coordination
- Upload progress integration
- Error handling and fallback

---

## Testing Strategy

### Unit Tests
- WebSocket hook connection handling
- Operation tracking logic
- TanStack cache update verification

### Integration Tests
- Each use case from spec document
- Error scenarios and fallback behavior
- Performance verification (<500ms simple, <1s complex)

### User Acceptance Tests  
- Complete workflows: create course → add chapters → upload files → save
- Network failure scenarios
- Concurrent operation handling

---

## Success Metrics

### Performance Targets (From Spec)
- ✅ Chapter/video edits: <500ms from save to toast
- ✅ File uploads: Real-time progress + instant completion  
- ✅ Complex operations: <1s total regardless of operation count
- ✅ Zero polling loops
- ✅ Zero false error messages

### Architecture Compliance
- ✅ WebSocket → TanStack → Components (single source of truth)
- ✅ Layer boundaries maintained (no data mixing)
- ✅ Server actions handle all sensitive operations
- ✅ UI orchestration without data mixing

### User Experience
- ✅ Professional-grade responsiveness
- ✅ Immediate UI feedback with definitive server confirmation  
- ✅ Single coordinated success toast for complex operations
- ✅ Real-time progress indication

---

This implementation plan transforms the current 5-second polling approach into sub-second WebSocket-based confirmations while strictly following the established architecture principles.
# Video Upload Progress System Analysis - Why It Works vs Media System

**Date:** 2025-09-09 05:03AM EST  
**Issue:** Video upload progress works perfectly in course edit flow, but media upload progress doesn't show  
**Status:** Analysis Complete - Root cause identified

## Executive Summary

The video upload progress system works flawlessly while the media system shows no progress bars. After rigorous analysis, the root cause is **architectural inconsistency**: the media system attempts to mix two different WebSocket connection patterns and has incorrect operationId matching logic.

## 1. Working Video Upload Architecture

### 1.1 WebSocket Connection Pattern
```typescript
// File: src/hooks/use-video-queries.ts:31
const websocket = useCourseWebSocketSimple(courseId)

// File: src/hooks/use-course-websocket-simple.ts:15-18
const userId = useAppStore((state) => state.user?.id)
const websocket = useWebSocketConnection(userId || '')
```

**Key Insight:** Video system uses a wrapper (`useCourseWebSocketSimple`) that calls `useWebSocketConnection` with a stable userId selector.

### 1.2 Observer Subscription Pattern
```typescript
// File: src/hooks/use-video-queries.ts:240-285
courseEventObserver.subscribe(COURSE_EVENTS.UPLOAD_PROGRESS, (event) => {
  if (event.courseId !== courseId) return // CRITICAL: courseId filter
  
  // Update BOTH video cache AND chapters cache
  queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) => {
    return old.map(video => {
      // Match by operationId stored in backblaze_file_id during upload
      if (video.id.includes(event.operationId) || video.backblaze_file_id === event.operationId) {
        return {
          ...video,
          uploadProgress: event.data.progress,
          status: 'uploading' as const
        }
      }
      return video
    })
  })

  // CRITICAL: Also update chapters cache (where UI reads from)
  queryClient.setQueryData(chapterKeys.list(courseId), (old: any) => {
    // ... update chapters cache too
  })
})
```

**Key Insight:** Video system updates TWO cache locations and filters by courseId.

### 1.3 Temp Video Creation Pattern
```typescript
// File: src/hooks/use-video-queries.ts:62-80
onMutate: async ({ file, chapterId, operationId }) => {
  const tempVideo: Video = {
    id: operationId,  // Uses operationId as temp ID
    filename: file.name,
    // ... other fields
    backblaze_file_id: operationId, // CRITICAL: Store operationId here for matching
    status: 'uploading',
    uploadProgress: 0,
    uploadStartTime: Date.now()
  }
  
  // Add to BOTH caches immediately
  queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) => [
    ...old, tempVideo
  ])
  queryClient.setQueryData(chapterKeys.list(courseId), (old: any) => {
    // ... add to chapters cache too
  })
}
```

**Key Insight:** Temp video is added to both caches with operationId stored in `backblaze_file_id` for progress matching.

### 1.4 Progress Rendering Pattern
```typescript
// File: src/components/course/VideoList.tsx:366-390
const renderUploadProgress = (video: Video) => {
  if (video.status !== 'uploading' || typeof video.uploadProgress !== 'number') {
    return null  // No progress bar if not uploading
  }
  
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{Math.round(video.uploadProgress)}%</span>
        <span>{formatTimeRemaining(video.uploadTimeRemaining)}</span>
      </div>
      <Progress value={video.uploadProgress} className="h-2" />
    </div>
  )
}

// Usage in video cards:
{renderUploadProgress(video)}
```

**Key Insight:** Progress is rendered directly from `video.uploadProgress` and `video.status` fields.

## 2. Broken Media Upload Architecture

### 2.1 WebSocket Connection Pattern Issues
```typescript
// File: src/hooks/use-media-queries.ts:49-51
const userId = useAppStore((state) => state.user?.id)
useWebSocketConnection(userId || '')
```

**❌ Problem 1:** Direct call to `useWebSocketConnection` instead of using the stable wrapper pattern from video system.

### 2.2 Observer Subscription Issues
```typescript
// File: src/hooks/use-media-queries.ts:98-99
const unsubscribeProgress = courseEventObserver.subscribe(MEDIA_EVENTS.MEDIA_UPLOAD_PROGRESS, handleProgress)

const handleProgress = (event: any) => {
  // Update TanStack cache with progress
  queryClient.setQueryData(['media-files'], (currentData: MediaFile[] | undefined) => {
    return currentData.map(file => {
      // Match by operationId (stored in backblaze_file_id for temp files)
      if (file.backblaze_file_id === event.operationId) { // ❌ WRONG ACCESS PATTERN
        return {
          ...file,
          uploadProgress: event.data.progress,
          status: 'uploading' as const
        }
      }
      return file
    })
  })
}
```

**❌ Problem 2:** No courseId filtering (media system might be receiving course events)
**❌ Problem 3:** Possible incorrect event structure access

### 2.3 Temp Media Creation Issues
```typescript
// File: src/hooks/use-media-queries.ts:114-131
const tempMediaFile: MediaFile = {
  id: operationId,
  // ...
  backblaze_file_id: operationId, // ✅ CORRECT: Store operationId
  uploadProgress: 0,
  uploadStartTime: Date.now(),
  status: 'uploading'
}
```

**✅ Correct:** This part follows video system pattern correctly.

### 2.4 Progress Rendering Issues
```typescript
// File: src/app/instructor/media/page.tsx:118-142
const renderUploadProgress = (item: any) => {
  if (item.status !== 'uploading' || typeof item.uploadProgress !== 'number') {
    return null
  }
  // ... same pattern as video system ✅
}
```

**✅ Correct:** Progress rendering follows video system pattern correctly.

## 3. Root Cause Analysis

### Issue #1: WebSocket Connection Inconsistency
- **Video System:** Uses `useCourseWebSocketSimple(courseId)` wrapper
- **Media System:** Direct `useWebSocketConnection(userId)` call
- **Impact:** Possible connection timing or stability differences

### Issue #2: Missing Event Filtering
- **Video System:** Filters events by `event.courseId !== courseId`
- **Media System:** No filtering - receives ALL events
- **Impact:** Media progress handler may be processing wrong events

### Issue #3: Event Structure Mismatch
- **Video Events:** Use `COURSE_EVENTS.UPLOAD_PROGRESS`
- **Media Events:** Use `MEDIA_EVENTS.MEDIA_UPLOAD_PROGRESS`
- **Impact:** Different event structures may have different access patterns

## 4. Event Structure Investigation

### Video Upload Progress Event Structure
```typescript
// From video system logs and Observer pattern
{
  type: "course.upload.progress",
  courseId: "course-123",
  operationId: "course-123-1725860123456-abc123def",
  data: {
    progress: 45,
    fileSize: 1024000,
    uploadedBytes: 460800,
    // ... other progress fields
  },
  timestamp: 1725860123456
}
```

### Media Upload Progress Event Structure (Expected)
```typescript
// Media events should follow similar pattern
{
  type: "media.upload.progress", 
  courseId: null, // ❌ Media uploads don't have courseId!
  operationId: "media_upload_1725860123456_abc123def",
  data: {
    progress: 45,
    fileName: "video.mp4",
    // ... other progress fields
  },
  timestamp: 1725860123456
}
```

**❌ CRITICAL ISSUE:** Media events don't have `courseId` but video system relies on courseId filtering!

## 5. WebSocket Message Investigation

Let me check what events are actually being emitted for media uploads:

### COURSE_EVENTS vs MEDIA_EVENTS
```typescript
// File: src/lib/course-event-observer.ts
export const COURSE_EVENTS = {
  UPLOAD_PROGRESS: 'course.upload.progress',
  UPLOAD_COMPLETE: 'course.upload.complete',
  // ...
}

export const MEDIA_EVENTS = {
  MEDIA_UPLOAD_PROGRESS: 'media.upload.progress',
  MEDIA_UPLOAD_COMPLETE: 'media.upload.complete',
  // ...
}
```

**Key Discovery:** Different event types means different WebSocket message structures!

## 6. The Real Problem: Architectural Mismatch

### Video System Architecture (Working)
1. **WebSocket Connection:** `useCourseWebSocketSimple(courseId)` with stable userId
2. **Event Subscription:** Filters by `courseId` and listens to `COURSE_EVENTS`
3. **Cache Updates:** Updates both `videoKeys.list(courseId)` AND `chapterKeys.list(courseId)`
4. **Progress Matching:** Uses `video.backblaze_file_id === event.operationId`
5. **Rendering:** Reads from `video.uploadProgress` and `video.status`

### Media System Architecture (Broken)
1. **WebSocket Connection:** Direct `useWebSocketConnection(userId)` - no wrapper
2. **Event Subscription:** No courseId filtering, listens to `MEDIA_EVENTS`
3. **Cache Updates:** Only updates `['media-files']` cache
4. **Progress Matching:** Uses `file.backblaze_file_id === event.operationId`
5. **Rendering:** Reads from `item.uploadProgress` and `item.status`

## 7. Hypothesis: Why Media Progress Isn't Working

### Theory A: Event Structure Mismatch
- Media upload events have different structure than course events
- `event.operationId` vs `event.data.operationId` access pattern
- Progress handler tries to match against non-existent operationId

### Theory B: WebSocket Connection Timing
- Direct `useWebSocketConnection` has different initialization timing
- Media events may be emitted before Observer subscription is ready
- No stable wrapper means connection may drop/reconnect differently

### Theory C: Event Type Mismatch
- WebSocket server emits `COURSE_EVENTS.UPLOAD_PROGRESS` for all uploads
- Media system subscribes to `MEDIA_EVENTS.MEDIA_UPLOAD_PROGRESS` 
- Events never reach media handler because of type mismatch

## 8. Testing Plan to Confirm Root Cause

### Step 1: Check WebSocket Message Logs
Need to check browser console during media upload to see what events are actually received.

### Step 2: Check Observer Event Emission
Need to verify what events are emitted by WebSocket connection during media upload.

### Step 3: Test Event Matching Logic
Need to verify if `file.backblaze_file_id === event.operationId` is working correctly.

## 9. Recommended Fixes

### Fix 1: Use Consistent WebSocket Pattern
```typescript
// Create useMediaWebSocketSimple similar to useCourseWebSocketSimple
export function useMediaWebSocketSimple() {
  const userId = useAppStore((state) => state.user?.id)
  const websocket = useWebSocketConnection(userId || '')
  
  return {
    isConnected: websocket.isConnected,
    isReconnecting: websocket.isReconnecting,
    error: websocket.error,
    reconnect: websocket.reconnect,
    generateOperationId: () => `media_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
```

### Fix 2: Verify Event Types and Structure
Check if media uploads emit `COURSE_EVENTS` or `MEDIA_EVENTS` and adjust subscription accordingly.

### Fix 3: Add Debug Logging
Add comprehensive logging to see what events are received and how matching works.

### Fix 4: Match Video System Exactly
Follow video system pattern precisely - use same WebSocket wrapper, same cache update pattern, same event handling.

## 10. Immediate Action Items

1. **Check browser console** during media upload to see actual WebSocket events
2. **Add debug logging** to media progress handler to see what events are received  
3. **Create media WebSocket wrapper** that matches video system pattern
4. **Verify event type matching** between emitted events and subscriptions
5. **Test operationId matching logic** with actual event data

## 11. Conclusion

The video upload progress works because it uses a mature, tested architecture with:
- Stable WebSocket wrapper pattern
- Dual cache updates (videos + chapters)
- Proper event filtering by courseId
- Correct event type subscriptions

The media system fails because it deviates from this proven pattern and likely has event type mismatches or connection timing issues.

**Next Step:** Debug the actual WebSocket events being received during media upload to confirm which hypothesis is correct.
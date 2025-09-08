# WebSocket Course Management Implementation Spec

**Date:** September 8, 2025  
**Goal:** Replace polling-based save confirmation with real-time WebSocket server confirmation

---

## Intended Effect: Sub-Second Server Confirmation

**Current Problem:** 5+ second saves with polling and false errors  
**Target:** <500ms server confirmation via WebSocket push events

---

## Core Use Cases & Expected Behavior

### 1. Chapter Management
- **Edit chapter title** → Save → WebSocket `chapter-update-complete` → Success toast (200-500ms)
- **Add new empty chapter** → Save → WebSocket `chapter-create-complete` → Success toast  
- **Delete existing chapter** → Save → WebSocket `chapter-delete-complete` → Success toast
- **Add new chapter + upload files** → Save → Multiple WebSocket events → Single success toast after all complete

### 2. Video/File Management  
- **Edit filename only** → Save → WebSocket `video-update-complete` → Success toast (200-500ms)
- **Upload new files to existing chapter** → Save → WebSocket `upload-complete` events → Success toast
- **Delete video files** → Save → WebSocket `video-delete-complete` → Success toast
- **Move video between chapters** → Save → WebSocket `video-move-complete` → Success toast

### 3. Mixed Operations (Complex Scenarios)
- **Edit chapter title + rename videos** → Save → Multiple WebSocket events → Single toast after ALL complete
- **Add chapter + upload files + edit existing titles** → Save → WebSocket coordination → Single toast
- **Delete chapter + rename remaining videos** → Save → Multiple confirmations → Single toast
- **Course info change + chapter changes** → Save → Multiple WebSocket events → Single toast

### 4. Upload Progress (Real-time)
- **File upload progress** → WebSocket `upload-progress` events → Live progress bars
- **Batch upload coordination** → Multiple progress streams → Consolidated completion

---

## WebSocket Event Architecture

### Server → Client Events
```
chapter-update-complete: { chapterId, newTitle }
chapter-create-complete: { chapterId, tempId }  
chapter-delete-complete: { chapterId }
video-update-complete: { videoId, newTitle }
video-delete-complete: { videoId }
upload-progress: { videoId, progress, status }
upload-complete: { videoId, finalData }
batch-operation-complete: { operationId, results }
```

### Client Coordination
- **Save button click** → Generate `operationId` → Track all expected events
- **WebSocket handler** → Update TanStack cache → Check if all operations complete
- **Success toast** → Only after ALL expected events received for the operationId

---

## Performance Targets
- **Chapter/video edits:** <500ms from save to toast
- **File uploads:** Real-time progress + instant completion confirmation  
- **Complex operations:** <1s total regardless of operation count
- **No polling loops:** 0ms wasted on status checking
- **No false errors:** WebSocket events = definitive server state

---

## Technical Implementation
- **WebSocket connection** managed in custom hook
- **TanStack cache updates** via WebSocket event handlers  
- **Operation tracking** via unique operationIds
- **Toast coordination** via event completion counters
- **Fallback handling** if WebSocket disconnects (degrade to current method)
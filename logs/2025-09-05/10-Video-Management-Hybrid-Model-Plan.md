# Video Management Hybrid Model - MVP Course Creation Flow

## Executive Summary
A hybrid approach combining direct upload convenience with media library flexibility, following Zustand SSOT principles and Next.js 14 server actions.

## Core Architecture Principles

### 1. Single Source of Truth (SSOT)
```typescript
// Normalized State Structure
{
  videos: {
    [videoId]: {
      id: string,
      title: string,
      url: string,
      courseId: string,
      chapterId: string | null,  // null = unassigned/library
      order: number,
      status: 'uploading' | 'processing' | 'ready' | 'error',
      metadata: {...}
    }
  },
  chapters: {
    [chapterId]: {
      id: string,
      title: string,
      courseId: string,
      videoIds: string[],  // Ordered array of video IDs
      order: number
    }
  },
  courses: {
    [courseId]: {
      id: string,
      title: string,
      chapterIds: string[],
      totalVideos: number  // Computed from all chapters
    }
  }
}
```

### 2. Zustand State Management Pattern
```typescript
// Actions follow consistent patterns
- addVideo(video)           // Adds to videos map
- updateVideo(id, updates)  // Partial updates
- removeVideo(id)           // Removes and cleans references
- moveVideo(id, toChapter)  // Updates references atomically
```

### 3. Server Actions Integration
```typescript
// All persistence through server actions
'use server'
- uploadVideoToBackblaze()  // Handles file upload
- updateVideoMetadata()     // Database updates
- deleteVideoFromStorage()  // Cleanup on deletion
- reorderVideosInChapter()  // Batch order updates
```

## Hybrid Model Architecture

### Two-View System
1. **Inline Chapter View** (Current editing context)
2. **Media Library View** (Global video management)

```
┌─────────────────────────────────────────┐
│          Course Edit Page               │
├─────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────┐ │
│ │  Chapters   │ │   Media Library     │ │
│ │             │ │                     │ │
│ │ Chapter 1   │ │  [All Videos Grid]  │ │
│ │  ├ Video A  │ │   ┌───┐ ┌───┐      │ │
│ │  └ Video B  │ │   │ A │ │ B │      │ │
│ │             │ │   └───┘ └───┘      │ │
│ │ Chapter 2   │ │   ┌───┐ ┌───┐      │ │
│ │  └ Video C  │ │   │ C │ │ D │      │ │
│ └─────────────┘ │   └───┘ └───┘      │ │
│                 └─────────────────────┘ │
└─────────────────────────────────────────┘
```

## MVP Feature List

### Phase 1: Core Video Management ✅ Priority
- [x] **Upload Videos**
  - Direct upload to chapter
  - Upload to media library
  - Progress tracking
  - Error handling & retry

- [x] **List Videos**
  - Show in chapter hierarchy
  - Show upload status
  - Display metadata (duration, size)

- [x] **Reorder Videos**
  - Drag & drop within chapter
  - Keyboard shortcuts (up/down)
  - Auto-save on reorder

- [x] **Rename Videos**
  - Inline editing
  - Auto-save on blur
  - Validation (no empty names)

- [x] **Delete Videos**
  - Soft delete (mark for deletion)
  - Hard delete on save
  - Cleanup Backblaze storage
  - Undo capability

### Phase 2: Advanced Organization
- [x] **Move Between Chapters**
  - Drag & drop between chapters
  - Context menu option
  - Maintain order integrity

- [x] **Bulk Operations**
  - Select multiple videos
  - Bulk delete
  - Bulk move to chapter

- [x] **Media Library Tab**
  - Grid view of all videos
  - Filter by chapter/unassigned
  - Search by name
  - Quick assign to chapter

### Phase 3: Enhanced UX
- [ ] **Video Preview**
  - Thumbnail generation
  - Quick preview modal
  - Playback in editor

- [ ] **Duplicate Detection**
  - Check for same file upload
  - Warn on duplicates
  - Option to replace

- [ ] **Auto-Save & Drafts**
  - Save video order changes
  - Save metadata changes
  - Conflict resolution

## Implementation Details

### 1. Fix Current Video Display Issue
```typescript
// When uploading, properly link video to chapter
const uploadVideo = async (file, chapterId) => {
  // 1. Create video with chapterId
  const video = {
    id: crypto.randomUUID(),
    chapterId,  // Set immediately
    courseId,
    ...
  }
  
  // 2. Add to normalized state
  addNormalizedVideo(video)
  
  // 3. Add ID to chapter's videoIds
  updateNormalizedChapter({
    chapterId,
    updates: {
      videoIds: [...chapter.videoIds, video.id]
    }
  })
  
  // 4. Upload to Backblaze
  await uploadVideoToBackblaze(...)
}
```

### 2. Video Operations Implementation

#### Reorder Videos
```typescript
const reorderVideosInChapter = (chapterId, newOrder) => {
  // Update chapter's videoIds array
  updateNormalizedChapter({
    chapterId,
    updates: { videoIds: newOrder }
  })
  
  // Update each video's order
  newOrder.forEach((videoId, index) => {
    updateNormalizedVideo({
      videoId,
      updates: { order: index }
    })
  })
  
  // Persist to database
  await updateVideoOrders(newOrder)
}
```

#### Rename Video
```typescript
const renameVideo = (videoId, newTitle) => {
  // Update in state
  updateNormalizedVideo({
    videoId,
    updates: { title: newTitle }
  })
  
  // Persist to database
  await updateVideoMetadata(videoId, { title: newTitle })
}
```

#### Move Video Between Chapters
```typescript
const moveVideoToChapter = (videoId, fromChapterId, toChapterId) => {
  // Remove from old chapter
  if (fromChapterId) {
    removeVideoFromChapter(fromChapterId, videoId)
  }
  
  // Add to new chapter
  addVideoToChapter(toChapterId, videoId)
  
  // Update video's chapterId
  updateNormalizedVideo({
    videoId,
    updates: { chapterId: toChapterId }
  })
  
  // Persist
  await updateVideoChapter(videoId, toChapterId)
}
```

### 3. Media Library Component
```typescript
const MediaLibrary = () => {
  const videos = getAllVideosForCourse(courseId)
  const unassignedVideos = videos.filter(v => !v.chapterId)
  
  return (
    <div className="grid grid-cols-4 gap-4">
      {videos.map(video => (
        <VideoCard
          key={video.id}
          video={video}
          onAssignToChapter={(chapterId) => moveVideoToChapter(video.id, null, chapterId)}
          onDelete={() => markVideoForDeletion(video.id)}
          onRename={(title) => renameVideo(video.id, title)}
        />
      ))}
    </div>
  )
}
```

## Database Schema Considerations

### Videos Table
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY,
  course_id UUID NOT NULL,
  chapter_id UUID,  -- Nullable for unassigned videos
  title TEXT NOT NULL,
  url TEXT,
  order INTEGER,
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE(course_id, chapter_id, order)  -- Ensure unique ordering
);
```

### Batch Operations
```sql
-- Efficient reordering
UPDATE videos 
SET order = CASE id
  WHEN 'video1' THEN 0
  WHEN 'video2' THEN 1
  WHEN 'video3' THEN 2
END
WHERE id IN ('video1', 'video2', 'video3');
```

## Error Handling & Edge Cases

1. **Upload Failures**
   - Retry mechanism with exponential backoff
   - Store partial upload state
   - Resume capability

2. **Concurrent Edits**
   - Optimistic updates with rollback
   - Conflict detection
   - Last-write-wins with user notification

3. **Large File Handling**
   - Chunked uploads
   - Progress persistence
   - Background upload support

4. **Deletion Safety**
   - Soft delete first
   - Confirmation for permanent delete
   - Cascade handling (remove from chapters)

## Performance Optimizations

1. **Lazy Loading**
   - Load video metadata first
   - Load video URLs on demand
   - Paginate large video lists

2. **Caching Strategy**
   - Cache video metadata in Zustand
   - Invalidate on updates
   - Prefetch on hover

3. **Batch Updates**
   - Group multiple operations
   - Single server action for reorder
   - Debounce auto-save

## Testing Strategy

### Unit Tests
- State mutations
- Selector functions
- Validation logic

### Integration Tests
- Upload flow
- Reorder operations
- Delete with cleanup

### E2E Tests
- Complete course creation
- Video management workflow
- Error recovery

## Migration Path

### From Current State
1. Fix video-chapter linking ✅ IMMEDIATE
2. Add missing CRUD operations
3. Implement Media Library view
4. Add advanced features

### Rollback Plan
- Keep existing state structure
- Add feature flags for new functionality
- Gradual rollout with monitoring

## Success Metrics

- **Upload Success Rate**: >95%
- **Operation Speed**: <200ms for state updates
- **User Actions**: <3 clicks for common tasks
- **Error Recovery**: 100% recoverable errors

## Next Steps

1. **Immediate** (Today)
   - Fix video display in chapters
   - Add rename functionality
   - Implement reordering

2. **Short Term** (This Week)
   - Add move between chapters
   - Implement delete with cleanup
   - Create Media Library tab

3. **Medium Term** (Next Sprint)
   - Add video preview
   - Implement bulk operations
   - Add search/filter

## Questions to Consider

1. Should videos be shareable between courses?
2. Do we need video versioning/history?
3. Should we support external video URLs (YouTube, Vimeo)?
4. Do we need collaborative editing (multiple instructors)?
5. Should we add AI-powered features (auto-chapters, transcription)?

---

*This plan prioritizes MVP functionality while maintaining extensibility for future features. The hybrid model provides flexibility without complexity, perfect for rapid iteration.*
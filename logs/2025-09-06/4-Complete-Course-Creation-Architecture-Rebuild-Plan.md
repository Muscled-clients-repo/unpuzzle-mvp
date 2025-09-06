# Complete Course Creation Architecture Rebuild Plan

**Date**: September 6, 2025, 8:30 AM EST
**Purpose**: Clean rebuild with proper SSOT, optimistic updates, and state management
**Status**: Planning Phase - REQUIRES USER CONFIRMATION BEFORE EXECUTION

## Overview

Based on the RCA analysis and current broken state, we need a complete architectural rebuild that addresses the fundamental SSOT violations and cache key mismatches. This plan preserves existing UI components while rebuilding the underlying functionality with proper state management.

## Issues to Avoid (From RCA Analysis)

1. **Cache Key Mismatch**: Updating `['course', courseId]` while UI reads from `['chapters', courseId]`
2. **Component Re-render Suppression**: React optimization blocking re-renders
3. **Data Source Disconnect**: Components reading from wrong data sources
4. **Property Mismatch**: Updating `title` while UI shows `filename/name`
5. **Query Client Instance Mismatch**: Different QueryClient instances
6. **Intermediate Caching Layers**: Components caching data and not updating
7. **Aggressive Query Caching**: `staleTime: 10 minutes` preventing updates

## Current UI Components to Preserve

### ✅ Keep These UI Components (Strip Functionality)
- `ChapterManager.tsx` - Chapter accordion with drag/drop UI
- `VideoList.tsx` - Video list with inline editing UI
- `VideoUploader.tsx` - File upload interface
- `VideoPreviewModal.tsx` - Video preview modal
- All UI primitives (Card, Input, Button, etc.)

### ❌ Rebuild These Functionalities
- State management layer
- TanStack Query integration
- Server actions
- Optimistic updates
- Cache management
- Tab navigation between editable fields

## Architecture Plan

### 1. Single Source of Truth Design

**Core Principle**: One canonical data structure, one query, one cache key.

```typescript
// Single cache key for ALL course-related data
const COURSE_CACHE_KEY = (courseId: string) => ['course-complete', courseId]

// Single data structure that contains everything
interface CourseComplete {
  // Course info
  id: string
  title: string
  description: string
  price: number
  category: string
  level: string
  status: string
  
  // Virtual chapters (computed from videos)
  chapters: Array<{
    id: string
    title: string
    order: number
    videos: Array<{
      id: string
      title: string           // ← SINGLE source for display name
      filename: string        // ← Original filename (backup only)
      url: string
      status: string
      order: number
      chapterId: string       // ← Links to chapter
      duration: number
      // ... other video props
    }>
  }>
}
```

### 2. State Management Architecture

#### A. TanStack Query as Primary Store
- Single `useCourseComplete(courseId)` hook
- All components read from this one source
- All mutations update this one cache

#### B. Zustand for Transient UI State Only
```typescript
interface UIState {
  // Edit states
  editingVideo: string | null
  editingChapter: string | null
  tempValue: string
  cursorPosition: number | null
  
  // Navigation state
  tabSequence: string[]
  currentTabIndex: number
  
  // Upload state (transient only)
  uploadProgress: Record<string, number>
  uploadQueue: File[]
}
```

#### C. No Duplicate State
- UI state never duplicates server data
- Pending changes stored separately and merged for display
- Server is always the source of truth

### 3. Optimistic Update Pattern

#### The Problem We're Solving
```typescript
// ❌ OLD WAY - Multiple cache updates
queryClient.setQueryData(['course', courseId], ...)     // Update here
queryClient.setQueryData(['chapters', courseId], ...)   // But UI reads here

// ✅ NEW WAY - Single cache update
queryClient.setQueryData(['course-complete', courseId], (old) => {
  // Update the single canonical data structure
  return updateVideoTitle(old, videoId, newTitle)
})
```

#### Optimistic Update Flow
1. User types in video title
2. Store change in `pendingChanges` map temporarily  
3. Display = `pendingChanges[videoId] || video.title`
4. On save, update single cache optimistically
5. Server action runs in background
6. Clear `pendingChanges` on success, revert on error

### 4. The New Hook Architecture

#### Primary Data Hook
```typescript
function useCourseComplete(courseId: string) {
  return useQuery({
    queryKey: ['course-complete', courseId],
    queryFn: () => getCourseCompleteAction(courseId),
    staleTime: 0,  // ← No aggressive caching
    gcTime: 5 * 60 * 1000
  })
}
```

#### Mutation Hooks
```typescript
function useVideoTitleUpdate(courseId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (updates: {videoId: string, title: string}[]) => 
      batchUpdateVideoTitlesAction(updates),
    
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['course-complete', courseId])
      
      // Snapshot for rollback
      const previous = queryClient.getQueryData(['course-complete', courseId])
      
      // Apply optimistic update to SINGLE cache
      queryClient.setQueryData(['course-complete', courseId], (old: CourseComplete) => 
        applyVideoTitleUpdates(old, updates)
      )
      
      return { previous }
    },
    
    onError: (error, updates, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['course-complete', courseId], context.previous)
      }
    },
    
    onSettled: () => {
      // Refetch after mutation completes
      queryClient.invalidateQueries(['course-complete', courseId])
    }
  })
}
```

### 5. Component Integration

#### ChapterManager - Stripped and Rebuilt
```typescript
function ChapterManager({ courseId }: { courseId: string }) {
  const { data: course } = useCourseComplete(courseId)
  const updateVideoTitles = useVideoTitleUpdate(courseId)
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({})
  
  // Get display title (pending changes override server data)
  const getDisplayTitle = (videoId: string) => {
    return pendingChanges[videoId] || course.videos.find(v => v.id === videoId)?.title
  }
  
  // Handle optimistic video rename
  const handleVideoRename = (videoId: string, newTitle: string) => {
    // Store pending change
    setPendingChanges(prev => ({ ...prev, [videoId]: newTitle }))
    
    // Trigger optimistic update
    updateVideoTitles.mutate([{ videoId, title: newTitle }], {
      onSuccess: () => {
        // Clear pending change on success
        setPendingChanges(prev => {
          const next = { ...prev }
          delete next[videoId]
          return next
        })
      }
    })
  }
  
  return (
    <div>
      {course.chapters.map(chapter => (
        <ChapterAccordion key={chapter.id} chapter={chapter}>
          <VideoList 
            videos={chapter.videos}
            getDisplayTitle={getDisplayTitle}
            onVideoRename={handleVideoRename}
          />
        </ChapterAccordion>
      ))}
    </div>
  )
}
```

### 6. Server Actions (Rebuilt)

#### Single Course Complete Action
```typescript
export async function getCourseCompleteAction(courseId: string): Promise<CourseComplete> {
  // Get course basic info
  const course = await getCourse(courseId)
  
  // Get all videos for this course
  const videos = await getVideosForCourse(courseId)
  
  // Compute virtual chapters from videos
  const chapters = computeChaptersFromVideos(videos)
  
  return {
    ...course,
    chapters
  }
}
```

#### Batch Video Updates (Fixed)
```typescript
export async function batchUpdateVideoTitlesAction(updates: Array<{videoId: string, title: string}>) {
  // Use transaction to avoid constraint violations
  const result = await db.transaction(async (tx) => {
    const results = []
    
    for (const update of updates) {
      const result = await tx
        .update(videos)
        .set({ title: update.title, updated_at: new Date() })
        .where(eq(videos.id, update.videoId))
        .returning()
      
      results.push(result[0])
    }
    
    return results
  })
  
  return result
}
```

## Features List for Course Creation Flow

### Core Features to Implement

#### 1. Video Filename Editing ⭐
- **UI**: Click-to-edit video titles inline
- **Behavior**: 
  - Multiple character typing support
  - Optimistic updates (changes appear immediately)
  - Batch saving (accumulate changes, save together)
  - Tab navigation between video fields
  - Cursor positioning at click location
- **Technical**: Single cache update, proper optimistic updates

#### 2. Chapter Name Editing ⭐
- **UI**: Click-to-edit chapter titles inline  
- **Behavior**:
  - Same editing experience as video titles
  - No component re-creation issues
  - Optimistic updates working
  - Tab navigation support
- **Technical**: Apply same pattern as video editing

#### 3. Drag & Drop Reordering ⭐
- **UI**: Drag videos within chapters and between chapters
- **Behavior**: 
  - Visual feedback during drag
  - Optimistic reordering
  - Batch order updates
- **Technical**: Update single cache with new order

#### 4. Video Upload & Processing ⭐
- **UI**: File upload with progress bars
- **Behavior**:
  - Upload queue management
  - Real-time progress updates
  - Error handling and retry
  - Auto-chapter assignment
- **Technical**: Upload state in transient Zustand store

#### 5. Chapter Management ⭐
- **UI**: Create, rename, delete, reorder chapters
- **Behavior**:
  - Virtual chapter creation (based on video assignments)
  - Chapter video reassignment
  - Bulk chapter operations
- **Technical**: Compute chapters from video.chapterId

#### 6. Batch Operations ⭐
- **UI**: Save indicator showing "X unsaved changes"
- **Behavior**:
  - Accumulate multiple edits
  - Single save action for all changes
  - Loading states during save
  - Error handling with rollback
- **Technical**: Pending changes map + batch mutations

#### 7. Tab Navigation ⭐
- **UI**: Tab key moves between editable fields
- **Behavior**:
  - Sequence: video titles → chapter titles → cycle
  - Shift+Tab for reverse navigation
  - Auto-save current field when tabbing
  - Cursor at end when tabbing into field
- **Technical**: Tab sequence state in Zustand

### Advanced Features

#### 8. Auto-Save & Draft Management
- **UI**: "Saving..." indicators
- **Behavior**: 
  - Auto-save course info changes
  - Draft status management
  - Prevent data loss
- **Technical**: Debounced mutations

#### 9. Video Preview & Management
- **UI**: Video preview modal
- **Behavior**:
  - Preview uploaded videos
  - Video metadata display
  - Delete confirmation
- **Technical**: Modal state management

#### 10. Undo/Redo System (Future)
- **UI**: Undo/redo buttons
- **Behavior**: Action history tracking
- **Technical**: Command pattern implementation

## Implementation Strategy

### Phase 1: Foundation (Day 1)
1. Create new server action: `getCourseCompleteAction`
2. Create new hook: `useCourseComplete`
3. Update type definitions: `CourseComplete` interface
4. Create new Zustand UI state store

### Phase 2: Video Editing (Day 1-2)  
1. Strip VideoList of all functionality, keep UI
2. Rebuild video title editing with proper optimistic updates
3. Add pending changes management
4. Implement batch saving

### Phase 3: Chapter Integration (Day 2)
1. Strip ChapterManager of functionality, keep UI
2. Integrate video editing into chapter structure
3. Add chapter name editing
4. Test tab navigation

### Phase 4: Advanced Features (Day 3)
1. Drag & drop reordering
2. Video upload integration
3. Chapter management
4. Auto-save system

## Testing Strategy

### Verification Checklist
- [ ] Can edit video titles (multiple characters)
- [ ] Changes appear immediately (optimistic)
- [ ] Tab navigation works between all fields
- [ ] Batch save collects all changes
- [ ] Save indicator shows accurate count
- [ ] Changes persist after page refresh
- [ ] Chapter editing works same as video editing
- [ ] No console errors or cache mismatches
- [ ] Error handling rolls back optimistic changes

### Debug Tools
1. TanStack Query DevTools integration
2. Console logging for cache state
3. Debug UI showing pending changes
4. Cache key validation tools

## Risk Mitigation

### Potential Issues
1. **Performance**: Large courses with many videos
2. **Network**: Handling offline/slow connections  
3. **Conflicts**: Multiple users editing same course
4. **Migration**: Moving from old to new architecture

### Mitigation Strategies
1. Implement virtualization for large video lists
2. Add offline support with optimistic updates
3. Add conflict resolution for concurrent edits
4. Create migration script for existing courses

---

## Decision Points Requiring User Confirmation

1. **Complete rebuild vs incremental fix**: This plan assumes complete rebuild
2. **Timeline**: Estimated 3 days vs quick patch attempts
3. **Data structure**: New `CourseComplete` format vs existing structure
4. **Breaking changes**: Will require updating all course-related components
5. **Migration strategy**: How to handle existing courses in old format

**READY FOR USER APPROVAL** - This plan requires confirmation before execution.
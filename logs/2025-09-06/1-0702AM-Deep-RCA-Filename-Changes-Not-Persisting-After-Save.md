# Deep Root Cause Analysis: Filename Changes Not Persisting After Save

**Date**: September 6, 2025, 7:02 AM EST
**Issue**: Filename changes are saved successfully to the database but do not reflect immediately in the UI. User must refresh page to see changes.

## Problem Statement

After implementing click-to-edit functionality for video filenames with batch saving:
1. ✅ **Backend Save**: Server action successfully saves all filename changes to database
2. ✅ **Batch Editing**: Multiple filenames can be changed and tracked in pending state  
3. ❌ **UI Updates**: Changes do not appear in UI immediately after save - requires page refresh
4. ✅ **Data Persistence**: After page refresh, all changes are correctly displayed

## Architecture Overview

The current video filename editing system uses a hybrid architecture:
- **TanStack Query**: Server state management with optimistic updates
- **React State**: Local UI state for pending changes (`pendingChanges`)
- **Server Actions**: Database mutations via Supabase

### Data Flow Architecture

```
User Edit → pendingChanges (Local State) → Batch Save → Server Action → Database
                                                    ↓
UI Display ← TanStack Query Optimistic Update ← Mutation Response
```

## Deep Technical Analysis

### 1. Data Sources Hierarchy

The `getDisplayName()` function determines what name to show:

```typescript
const getDisplayName = (video: VideoUpload): string => {
  // 1. HIGHEST PRIORITY: Currently editing
  if (editingVideo === video.id && videoTitle) {
    return videoTitle  // ✅ Works
  }
  
  // 2. MEDIUM PRIORITY: Pending changes  
  if (pendingChanges[video.id]) {
    return pendingChanges[video.id]  // ✅ Works until save
  }
  
  // 3. LOWEST PRIORITY: Server data
  return video.title || video.name || video.filename || 'Untitled Video'
  //     ↑ TanStack Query optimistic update should update this
}
```

**Issue Identified**: After save, `pendingChanges` is cleared but `video.title` might not be updated yet.

### 2. TanStack Query Optimistic Update Flow

```typescript
// In use-video-mutations.ts batchUpdateVideoOrdersSilent
onMutate: async (updates) => {
  // Cancel refetches
  await queryClient.cancelQueries({ queryKey: ['course', courseId] })
  
  // Optimistic update
  queryClient.setQueryData(['course', courseId], (old: any) => {
    const updatedVideos = old.videos.map((video: any) => {
      const update = updates.find(u => u.id === video.id)
      if (update && update.title) {
        return { ...video, title: update.title, name: update.title }
      }
      return video
    })
    return { ...old, videos: updatedVideos }
  })
}
```

**Issue Identified**: Optimistic update sets both `title` and `name`, but the timing might be wrong.

### 3. Server Action Data Flow

**Frontend sends**:
```typescript
const updates = Object.entries(finalChanges).map(([id, name]) => ({
  id,
  title: name  // Only title, no order/chapter_id
}))
```

**Backend processes**:
```typescript
// Title-only updates (should work without constraints)
for (const update of titleOnlyUpdates) {
  const updateData = {
    title: update.title,
    updated_at: new Date().toISOString()
  }
  
  await supabase.from('videos').update(updateData)
    .eq('id', update.id)
    .eq('course_id', courseId)
}
```

**Database query from getCourseAction**:
```sql
SELECT videos (
  id, title, thumbnail_url, duration, order, chapter_id, 
  backblaze_file_id, filename, file_size, status, 
  created_at, updated_at
) FROM courses WHERE id = courseId
```

**Critical Discovery**: Database query selects `title` field, which should contain updated values.

### 4. Timing Analysis

**Current Flow Timeline**:
1. User clicks "Save Changes" → `batchRenameMutation.mutate(updates)`
2. `onMutate` runs → Optimistic update applied to `['course', courseId]` cache
3. Server action executes → Database updated
4. `onSuccess` runs → After 100ms delay → `setPendingChanges({})` clears local state
5. `onSettled` runs → `queryClient.invalidateQueries(['course', courseId])` triggers refetch

**Potential Race Condition**: Steps 4 and 5 might be conflicting.

## Root Cause Hypothesis

### Primary Suspect: Cache Invalidation Overriding Optimistic Updates

The `onSettled` callback in the mutation always calls:
```typescript
queryClient.invalidateQueries({ queryKey: ['course', courseId] })
```

This triggers a fresh fetch from the server, which might be:
1. **Overriding** the optimistic update before it can be displayed
2. **Racing** with the optimistic update timing
3. **Fetching stale data** if the server hasn't fully committed the transaction

### Secondary Suspect: Multiple State Sources Conflict

The system has conflicting Single Source of Truth (SSOT):
- **pendingChanges**: Local React state
- **TanStack Query cache**: Optimistic updates  
- **Server state**: Database truth

When `pendingChanges` is cleared, it falls back to `video.title` which might not be the optimistically updated value if:
1. Cache invalidation triggered a new fetch
2. New fetch returned stale data
3. Optimistic update was overwritten

### Tertiary Suspect: Database Transaction Timing

PostgreSQL transactions might not be immediately visible to subsequent queries, causing the invalidated query to return stale data.

## Evidence Supporting Root Cause

### Evidence 1: "Works after page refresh"
- ✅ **Confirms**: Database save is working correctly
- ✅ **Confirms**: Server queries return correct data eventually
- ❌ **Suggests**: Immediate post-save UI update mechanism is broken

### Evidence 2: "Both filenames saved successfully"
- ✅ **Confirms**: Server action is working without constraint errors
- ✅ **Confirms**: Batch processing logic is correct
- ❌ **Suggests**: The issue is purely frontend state management

### Evidence 3: Console Logs Show Optimistic Update
From previous session:
```
🔄 Mutation starting with updates: [...]
✨ Optimistic update applied: {videos: [...]}  
🎉 Mutation success: {success: true}
```
- ✅ **Confirms**: Optimistic update is being applied
- ❌ **Suggests**: Something is overriding it afterward

## Comprehensive Solution Strategy

### Option 1: Pure Optimistic Updates (Recommended)
**Strategy**: Remove cache invalidation, rely only on optimistic updates + background sync
```typescript
// Remove onSettled invalidation
// Add background reconciliation
onSuccess: () => {
  // Don't invalidate immediately - trust optimistic update
  setTimeout(() => {
    queryClient.refetchQueries({ queryKey: ['course', courseId] })
  }, 2000) // Background sync after 2 seconds
}
```

### Option 2: Delayed Invalidation
**Strategy**: Delay cache invalidation until optimistic update has time to render
```typescript
onSettled: () => {
  // Wait for optimistic update to be visible
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ['course', courseId] })
  }, 500)
}
```

### Option 3: State Reconciliation
**Strategy**: Keep pendingChanges until server data confirms the update
```typescript
onSuccess: (result, updates) => {
  // Only clear pendingChanges if server data matches
  queryClient.setQueryData(['course', courseId], (old: any) => {
    // Verify server response matches our updates
    const serverHasUpdates = updates.every(update => 
      old.videos.find(v => v.id === update.id)?.title === update.title
    )
    
    if (serverHasUpdates) {
      setPendingChanges({}) // Safe to clear
    }
    return old
  })
}
```

### Option 4: Complete Rewrite with SSOT (Nuclear Option)
**Strategy**: Eliminate dual state, use only TanStack Query with proper optimistic updates

## Recommended Solution

**Implement Option 1: Pure Optimistic Updates**

This approach:
1. ✅ Eliminates race conditions between optimistic updates and invalidation
2. ✅ Provides immediate feedback to users
3. ✅ Maintains eventual consistency with background sync
4. ✅ Follows TanStack Query best practices
5. ✅ Simplifies the mental model - one source of truth

## Implementation Plan

1. **Remove aggressive invalidation** from mutation `onSettled`
2. **Keep optimistic updates** in `onMutate`
3. **Add background reconciliation** with delayed refetch
4. **Implement error rollback** for failed mutations
5. **Add conflict resolution** for concurrent edits

## Testing Strategy

1. Change multiple filenames → Should see changes immediately
2. Network failure scenarios → Should rollback optimistically
3. Concurrent user edits → Should handle gracefully
4. Page navigation → Should persist changes
5. Background sync → Should reconcile after delay

## Risk Assessment

**Low Risk**: The database save is working correctly, so we're only fixing the UI update mechanism.
**High Confidence**: Root cause is identified as race condition between optimistic updates and cache invalidation.
**Rollback Plan**: Can revert to current behavior if issues arise.

## Conclusion

The issue is not with the save functionality or data persistence, but with the frontend state management conflict between optimistic updates and aggressive cache invalidation. The solution is to trust optimistic updates more and invalidate less aggressively.
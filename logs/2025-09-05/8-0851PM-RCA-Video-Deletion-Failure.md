# RCA: Video Deletion Failure - Root Cause Analysis

## Executive Summary
Video deletion fails because the system is caught between two state architectures (old denormalized vs new normalized) and the deletion logic only processes videos from the NEW normalized state, but videos are being marked for deletion in the OLD state structure.

## Timeline of Events
1. **Phase 1-3 Completed**: Normalized types, parallel store, and selectors implemented
2. **Phase 4 Started**: Video reordering migrated to normalized state
3. **Video Deletion Issue**: Videos marked for deletion but not processed during save

## Root Cause Analysis

### 🎯 Primary Root Cause: State Architecture Mismatch

The system has **TWO parallel state structures** but only processes deletions from ONE:

1. **Old State** (`courseCreation.videos`): Videos marked with `markedForDeletion: true`
2. **New State** (`normalizedState.videos`): Videos marked with `markedForDeletion: true`

**BUT** the `saveDraft` function only processes deletions from the NEW normalized state:

```typescript
// In saveDraft() - ONLY checks normalized state
const hasNormalizedVideos = normalizedState && Object.keys(normalizedState.videos).length > 0

if (hasNormalizedVideos) {
  const videosToDelete = getVideosMarkedForDeletion(normalizedState) // ← ONLY NORMALIZED
  // Process deletions...
} else if (courseCreation.videos && courseCreation.videos.length > 0) {
  // Fallback to old state - BUT THIS CODE PATH IS NEVER REACHED!
  const videosToDelete = courseCreation.videos.filter(v => v.markedForDeletion === true)
}
```

### 🔍 Why the Fallback Never Executes

The condition `hasNormalizedVideos` is **ALWAYS TRUE** once normalized state exists, so the fallback to old state never runs.

### 📊 Data Flow Breakdown

#### 1. Video Marked for Deletion (OLD STATE)
```typescript
// removeVideo() in course-creation-slice.ts:328
set(state => ({
  courseCreation: state.courseCreation ? {
    ...state.courseCreation,
    videos: state.courseCreation.videos.map(v => 
      v.id === videoId ? { ...v, markedForDeletion: true } : v
    )
  } : null
}))
```

#### 2. Save Process (LOOKS IN WRONG PLACE)
```typescript
// saveDraft() only checks normalized state
const videosToDelete = getVideosMarkedForDeletion(normalizedState) // ← EMPTY!
```

#### 3. The Disconnect
- Videos marked in: **OLD state** (`courseCreation.videos`)
- System looks in: **NEW state** (`normalizedState.videos`)
- Result: **No videos found to delete**

## Technical Deep Dive

### File: `src/stores/slices/course-creation-slice.ts:328`
The `removeVideo` function marks videos for deletion in the OLD state structure:
- `courseCreation.videos[].markedForDeletion = true`
- `uploadQueue[].markedForDeletion = true` 
- `courseCreation.chapters[].videos[].markedForDeletion = true`

### File: `src/stores/slices/course-creation-slice.ts:656`
The `saveDraft` function only processes deletions from NORMALIZED state:
```typescript
const hasNormalizedVideos = normalizedState && Object.keys(normalizedState.videos).length > 0
if (hasNormalizedVideos) {
  // Only processes normalized videos
  const videosToDelete = getVideosMarkedForDeletion(normalizedState)
}
```

### The Catch-22
1. **Normalized state exists** → `hasNormalizedVideos = true`
2. **But videos marked in old state** → `getVideosMarkedForDeletion(normalizedState)` returns empty array
3. **Fallback never executes** because `hasNormalizedVideos` is true

## Impact Assessment

### ✅ What Works
- API route for deletion (`/api/delete-video/[id]`) - fixed and working
- Authentication - properly rejects unauthenticated requests (401)
- Parameter handling - Next.js 15 async params fixed
- Mark for deletion UI - shows pending deletions correctly

### ❌ What's Broken  
- Deletion processing - looks in wrong state structure
- State synchronization - old and new states out of sync
- Fallback mechanism - never executes due to boolean logic

## Solution Architecture

### Immediate Fix (Patch)
Modify `saveDraft` to check BOTH state structures:

```typescript
// Get videos marked for deletion from BOTH states
const videosFromNormalized = normalizedState ? getVideosMarkedForDeletion(normalizedState) : []
const videosFromOldState = courseCreation.videos.filter(v => v.markedForDeletion === true)
const allVideosToDelete = [...videosFromNormalized, ...videosFromOldState]
```

### Medium-Term Fix (Migration)
1. **Update `removeVideo`** to mark deletions in BOTH states during transition
2. **Add synchronization** between old and new state structures
3. **Gradual migration** of all deletion operations to normalized state

### Long-Term Fix (Completion)
1. **Complete Phase 4 migration** - move ALL video operations to normalized state
2. **Remove old state fallbacks** once migration is complete
3. **Delete old state structure** - eliminate the dual-state complexity

## Implementation Plan Update

### Phase 4A (Critical - Video Deletion Hotfix)
**Priority**: 🔴 CRITICAL - Blocking feature
**Task**: Fix deletion processing to handle both state structures
**Timeline**: 2 hours

```typescript
// In saveDraft() - FIXED VERSION
const videosFromNormalized = normalizedState ? getVideosMarkedForDeletion(normalizedState) : []
const videosFromOldState = courseCreation.videos.filter(v => v.markedForDeletion === true)
const allVideosToDelete = [...videosFromNormalized, ...videosFromOldState]

if (allVideosToDelete.length > 0) {
  // Process ALL deletions regardless of source
}
```

### Phase 4B (Synchronization)
**Priority**: 🟡 HIGH - Prevent future mismatches
**Task**: Ensure removeVideo updates both state structures
**Timeline**: 4 hours

```typescript
// In removeVideo() - SYNC BOTH STATES
removeVideo: (videoId) => {
  // Mark in OLD state (current)
  set(state => ({ /* old state update */ }))
  
  // ALSO mark in NEW state
  set(state => ({
    normalizedState: {
      ...state.normalizedState,
      videos: {
        ...state.normalizedState.videos,
        [videoId]: {
          ...state.normalizedState.videos[videoId],
          markedForDeletion: true
        }
      }
    }
  }))
}
```

### Phase 4C (Complete Migration)
**Priority**: 🟢 MEDIUM - Technical debt reduction
**Task**: Migrate all video operations to normalized state
**Timeline**: 8 hours

## Risk Assessment

### High Risk Areas
1. **Data Loss**: If deletion processes wrong videos
2. **State Corruption**: If synchronization fails between states
3. **User Experience**: Deletions not reflecting immediately

### Mitigation Strategies
1. **Backup Verification**: Test with non-critical data first
2. **Incremental Deployment**: Fix one issue at a time
3. **Comprehensive Testing**: Verify both state structures work
4. **Rollback Plan**: Ability to revert to old state if needed

## Testing Strategy

### 1. Unit Tests
- Test `getVideosMarkedForDeletion` with both state structures
- Verify deletion processing from mixed sources
- Test fallback logic edge cases

### 2. Integration Tests  
- Full save flow with mixed state deletions
- API response handling verification
- Error recovery testing

### 3. End-to-End Tests
- UI deletion → save → verification flow
- Database and storage cleanup validation
- Authentication and authorization testing

## Conclusion

The video deletion failure is a **classic migration issue** - the system is halfway between two architectures. The immediate fix is to process deletions from both state structures, followed by complete migration to the normalized architecture.

**Key Insight**: This isn't a bug in the new architecture, but a transition issue where the system hasn't fully committed to the new pattern while still relying on the old one.

## Next Steps

1. **Immediate**: Implement the dual-state processing fix in `saveDraft`
2. **Short-term**: Add synchronization to `removeVideo` 
3. **Medium-term**: Complete Phase 4 migration to normalized state
4. **Long-term**: Remove old state structure entirely

**Estimated Resolution Time**: 2-4 hours for immediate fix, 1-2 days for complete migration.
# Video System Fix - Implementation Plan

## Current Problem
Videos upload to Backblaze successfully but don't appear in the UI because:
1. Videos aren't being saved to the database (server action failing)
2. Chapter IDs are mismatched (using UUID instead of `chapter-{timestamp}`)
3. Normalized state not updating chapter.videoIds array after upload

## Immediate Fixes Required (Priority Order)

### 1. Fix Chapter ID Format ⚠️ CRITICAL
**File**: `/src/stores/slices/normalized-course-slice.ts`
**Line**: ~800
```typescript
// WRONG (current):
const dbChapterId = '00000000-0000-0000-0000-000000000001'

// CORRECT (should be):
const dbChapterId = chapterId // Use the actual chapter ID from state
// Which will be format: 'chapter-1735789456123'
```

### 2. Fix Video Database Insert
**File**: `/src/app/actions/video-actions.ts`
**Issue**: Column name mismatch
```typescript
// Check actual column names in videos table:
// Might be 'filename' not 'file_name'
// Might be missing required fields
```

### 3. Update Chapter.videoIds After Upload Success
**File**: `/src/stores/slices/normalized-course-slice.ts`
**After line**: ~828 (after successful upload)
```typescript
// Add video ID to chapter's videoIds array
const chapter = get().normalizedState.chapters[chapterId]
if (chapter && !chapter.videoIds.includes(videoUpload.id)) {
  get().updateNormalizedChapter({
    chapterId,
    updates: { videoIds: [...chapter.videoIds, videoUpload.id] }
  })
}
```

### 4. Fix loadCourseForEdit to Populate Normalized State
**File**: `/src/stores/slices/normalized-course-slice.ts`
**Function**: `loadCourseForEdit`
```typescript
// After loading videos from database:
// 1. Create normalized video entities
videos.forEach(video => {
  const normalizedVideo = {
    id: video.id,
    title: video.title,
    chapterId: video.chapter_id,
    courseId: video.course_id,
    order: video.order,
    url: video.video_url,
    status: 'ready',
    uploadProgress: 100
  }
  get().addNormalizedVideo(normalizedVideo)
})

// 2. Update chapter videoIds arrays
chapterMap.forEach((videos, chapterId) => {
  const videoIds = videos.map(v => v.id)
  if (normalizedState.chapters[chapterId]) {
    get().updateNormalizedChapter({
      chapterId,
      updates: { videoIds }
    })
  }
})
```

## Testing Checklist

### Upload Flow:
- [ ] Upload a video
- [ ] Check console for `[SERVER ACTION] Attempting to insert video with data:`
- [ ] Verify video appears in chapter immediately
- [ ] Check database: `/api/debug-videos?courseId={id}`
- [ ] Refresh page - video should persist

### Edit Flow:
- [ ] Load existing course with videos
- [ ] Videos should appear in correct chapters
- [ ] Can rename videos
- [ ] Can reorder videos within chapter
- [ ] Can delete videos

## Quick Debug Commands

```bash
# Check if videos are in database
curl http://localhost:3000/api/debug-videos?courseId=YOUR_COURSE_ID

# Check Backblaze bucket
# Visit the route that shows Backblaze file count

# Watch server logs for database errors
npm run dev
# Look for: [SERVER ACTION] Database error:
```

## Implementation Order

1. **First**: Fix chapter ID format (5 min)
2. **Second**: Add chapter.videoIds update (5 min)
3. **Third**: Test upload - check logs for database errors
4. **Fourth**: Fix any database column issues found
5. **Fifth**: Fix loadCourseForEdit if needed

## Success Criteria

✅ Videos upload and immediately appear in UI
✅ Videos persist after page refresh
✅ Videos show in correct chapters
✅ Can perform all CRUD operations on videos
✅ No console errors during upload/edit/delete

## Do NOT Change

- Video ID format (keep UUID)
- Database schema (no migrations)
- Virtual chapter system
- Visual indicators and UI components
- Backblaze upload process

## Notes

- The system was working in the last commit
- Only state management layer needs fixes
- Database and Backblaze integration are fine
- Keep all existing UI/UX patterns
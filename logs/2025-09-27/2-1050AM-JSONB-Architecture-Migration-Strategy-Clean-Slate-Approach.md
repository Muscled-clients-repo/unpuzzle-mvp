# JSONB Architecture Migration Strategy: Clean Slate Approach

**Date:** September 27, 2025
**Time:** 10:50 AM EST
**Context:** Transitioning from videos table to JSONB-based chapter architecture
**Status:** Test data in videos table, safe to clean slate migration

## Executive Summary

With only test data in the videos table, we can implement a clean slate migration to a superior JSONB-based architecture. This approach eliminates data duplication, simplifies the schema, and provides better performance for chapter-video organization.

## Current State Analysis

### Existing Architecture Issues
- **Data Duplication:** Video metadata stored in both `media_files` and `videos` tables
- **Complex Relationships:** Three-table JOIN required (course_chapters → videos → media_files)
- **Maintenance Overhead:** Need to sync data between media_files and videos
- **Test Data Pollution:** Videos table contains only test uploads and duplicates

### Current Workflow (Working)
1. Upload files → `media_files` table (with duration extraction ✅)
2. Course edit → Select media from MediaSelector
3. Link to chapter → Creates entry in `videos` table
4. Student access → Queries through videos table

## Recommended Architecture: JSONB-Based Chapters

### New Schema Design
```sql
-- Simplified two-table architecture
course_chapters:
  - id UUID PRIMARY KEY
  - title TEXT
  - course_id UUID (FK to courses)
  - chapter_order INTEGER
  - videos JSONB DEFAULT '[]'  -- Array of video references
  - created_at TIMESTAMP
  - updated_at TIMESTAMP

media_files:
  - id UUID PRIMARY KEY
  - name TEXT
  - backblaze_url TEXT
  - duration_seconds INTEGER  -- From duration extraction
  - file_type TEXT
  - mime_type TEXT
  - uploaded_by UUID
  -- (existing columns remain)
```

### JSONB Videos Structure
```json
[
  {
    "media_file_id": "abc-123-def",
    "order": 1,
    "title": "Introduction Video",
    "custom_thumbnail": null
  },
  {
    "media_file_id": "ghi-456-jkl",
    "order": 2,
    "title": "Main Content",
    "custom_thumbnail": "thumb_url"
  }
]
```

## Implementation Strategy

### Phase 1: Database Schema Updates
```sql
-- 1. Add JSONB column to course_chapters
ALTER TABLE course_chapters
ADD COLUMN videos JSONB DEFAULT '[]'::jsonb;

-- 2. Create index for performance
CREATE INDEX idx_course_chapters_videos_gin
ON course_chapters USING gin(videos);

-- 3. Drop videos table (test data only)
DROP TABLE videos CASCADE;
```

### Phase 2: Code Updates

#### Update linkMediaToChapterAction
```typescript
// OLD: Insert into videos table
await supabase.from('videos').insert({...})

// NEW: Update chapter JSONB array
export async function linkMediaToChapterAction(
  mediaId: string,
  chapterId: string,
  customTitle?: string
) {
  // Get current chapter videos
  const { data: chapter } = await supabase
    .from('course_chapters')
    .select('videos')
    .eq('id', chapterId)
    .single()

  const currentVideos = chapter?.videos || []
  const nextOrder = currentVideos.length + 1

  const newVideo = {
    media_file_id: mediaId,
    order: nextOrder,
    title: customTitle || mediaFile.name
  }

  // Update JSONB array
  await supabase
    .from('course_chapters')
    .update({
      videos: [...currentVideos, newVideo]
    })
    .eq('id', chapterId)
}
```

#### Update Course Content Queries
```typescript
// NEW: Single query with JSONB processing
export async function getCourseWithChaptersAndVideos(courseId: string) {
  // Get chapters with JSONB videos
  const { data: chapters } = await supabase
    .from('course_chapters')
    .select('*')
    .eq('course_id', courseId)
    .order('chapter_order')

  // Extract all media file IDs from JSONB
  const mediaFileIds = chapters
    .flatMap(ch => ch.videos?.map(v => v.media_file_id) || [])
    .filter(Boolean)

  // Get media file details in single query
  const { data: mediaFiles } = await supabase
    .from('media_files')
    .select('*')
    .in('id', mediaFileIds)

  // Combine in application layer
  return chapters.map(chapter => ({
    ...chapter,
    videos: chapter.videos?.map(video => ({
      ...video,
      mediaFile: mediaFiles.find(m => m.id === video.media_file_id)
    })) || []
  }))
}
```

#### Update Student Video Player
```typescript
// NEW: Navigate using chapter_id + video_order
interface VideoContext {
  courseId: string
  chapterId: string
  videoOrder: number  // Index in JSONB array
}

// Get video by position
export async function getVideoByPosition(
  courseId: string,
  chapterId: string,
  videoOrder: number
) {
  const { data: chapter } = await supabase
    .from('course_chapters')
    .select('videos')
    .eq('id', chapterId)
    .single()

  const video = chapter?.videos?.[videoOrder]
  if (!video) return null

  const { data: mediaFile } = await supabase
    .from('media_files')
    .select('*')
    .eq('id', video.media_file_id)
    .single()

  return { ...video, mediaFile }
}
```

### Phase 3: Update UI Components

#### ChapterManager Component
```typescript
// Handle JSONB video arrays
interface ChapterWithVideos {
  id: string
  title: string
  chapter_order: number
  videos: Array<{
    media_file_id: string
    order: number
    title: string
    mediaFile?: MediaFile  // Joined data
  }>
}

// Video reordering becomes simple array manipulation
const reorderVideos = (chapterId: string, reorderedVideos: VideoItem[]) => {
  const updatedVideos = reorderedVideos.map((video, index) => ({
    ...video,
    order: index + 1
  }))

  updateChapterVideos(chapterId, updatedVideos)
}
```

#### Student Course Content Page
```typescript
// Display chapters with embedded videos
{chapters.map(chapter => (
  <div key={chapter.id}>
    <h3>{chapter.title}</h3>
    {chapter.videos.map((video, index) => (
      <VideoCard
        key={video.media_file_id}
        video={video}
        href={`/student/course/${courseId}/chapter/${chapter.id}/video/${index}`}
      />
    ))}
  </div>
))}
```

## Migration Steps (Clean Slate)

### Step 1: Database Changes
1. Add JSONB column to course_chapters
2. Create performance indexes
3. Drop videos table

### Step 2: Code Updates
1. Update linkMediaToChapterAction (JSONB array manipulation)
2. Update course content queries (eliminate videos table)
3. Update ChapterManager component (handle JSONB)
4. Update student video player (use chapter + order navigation)
5. Update video reordering logic (JSONB array updates)

### Step 3: Update Duration Worker
1. Remove videos table references
2. Duration extraction stays on media_files (no changes needed)

### Step 4: Testing
1. Test media upload + duration extraction
2. Test linking media to chapters
3. Test video reordering
4. Test student video playback
5. Test course content display

## Benefits of JSONB Architecture

### Performance Improvements
- **Fewer JOINs:** Single query for chapter content instead of 3-table JOIN
- **Atomic Operations:** Video reordering = single UPDATE vs multiple UPDATEs
- **Better Caching:** Entire chapter content in single cache entry

### Maintenance Simplifications
- **No Data Duplication:** Single source of truth in media_files
- **Simpler Schema:** Two tables instead of three
- **Easier Reordering:** Array manipulation vs ORDER column management

### Development Benefits
- **Cleaner Code:** Direct chapter-video relationship
- **Flexible Structure:** Easy to add metadata per video-chapter relationship
- **Modern Approach:** JSONB is fast and well-supported in PostgreSQL

## Risks and Mitigations

### Potential Risks
- **JSONB Query Complexity:** More complex video-specific queries
- **Data Consistency:** Need application-level validation
- **Migration Effort:** Updating multiple components

### Mitigations
- **PostgreSQL JSONB Performance:** Excellent indexing and query performance
- **Test Coverage:** Comprehensive testing of new architecture
- **Clean Slate Advantage:** No legacy data to migrate

## Success Metrics

### Technical Metrics
- Query performance: < 50ms for course content loading
- Successful video reordering without errors
- Zero data duplication between tables
- Clean chapter-video relationship management

### User Experience Metrics
- Smooth course creation workflow
- Fast chapter navigation for students
- Reliable video playback and progression

## Conclusion

The JSONB-based architecture provides a cleaner, more performant, and maintainable solution for managing course content. With only test data in the current videos table, implementing a clean slate migration is the optimal approach.

**Recommendation:** Proceed with JSONB architecture implementation, starting with database schema updates and progressing through code changes systematically.
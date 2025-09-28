# Complete Junction Table CRUD Operations Design

**Date:** 2025-09-27
**Scope:** Replace videos table with chapter_media junction table
**Users:** Instructors (full CRUD) + Students (read-only access)
**Industry Standards:** Based on YouTube, Coursera, Udemy architecture patterns

---

## 1. Database Schema

### Junction Table: `chapter_media`
```sql
CREATE TABLE chapter_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id TEXT NOT NULL, -- References course_chapters.id (text format)
  media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  order_in_chapter INTEGER NOT NULL,
  title TEXT, -- Custom title per chapter (can override media_files.name)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(chapter_id, media_file_id), -- Prevent duplicate media in same chapter
  UNIQUE(chapter_id, order_in_chapter) -- Prevent order conflicts in chapter
);

-- Indexes for performance
CREATE INDEX idx_chapter_media_chapter_id ON chapter_media(chapter_id);
CREATE INDEX idx_chapter_media_media_file_id ON chapter_media(media_file_id);
CREATE INDEX idx_chapter_media_order ON chapter_media(chapter_id, order_in_chapter);
```

---

## 2. INSTRUCTOR CRUD Operations

### 2.1 CREATE Operations

#### Link Media to Chapter
```typescript
// Server Action: linkMediaToChapterAction(mediaId, chapterId, customTitle?)
async function linkMediaToChapterAction(
  mediaId: string,
  chapterId: string,
  customTitle?: string
): Promise<ActionResult> {

  // 1. Verify ownership (course + media file)
  // 2. Check for duplicates
  // 3. Calculate next order position
  // 4. Insert junction record

  const { data: nextOrder } = await supabase
    .from('chapter_media')
    .select('order_in_chapter')
    .eq('chapter_id', chapterId)
    .order('order_in_chapter', { ascending: false })
    .limit(1)

  const { data: junction } = await supabase
    .from('chapter_media')
    .insert({
      chapter_id: chapterId,
      media_file_id: mediaId,
      order_in_chapter: (nextOrder?.[0]?.order_in_chapter || 0) + 1,
      title: customTitle // Override media file name if provided
    })
    .select()
    .single()

  // 5. Update usage tracking
  // 6. Revalidate paths
  // 7. Broadcast WebSocket event
}
```

#### Bulk Link Multiple Media Files
```typescript
async function bulkLinkMediaToChapterAction(
  mediaIds: string[],
  chapterId: string
): Promise<ActionResult> {
  // Batch insert with sequential ordering
  const insertData = mediaIds.map((mediaId, index) => ({
    chapter_id: chapterId,
    media_file_id: mediaId,
    order_in_chapter: baseOrder + index
  }))

  await supabase.from('chapter_media').insert(insertData)
}
```

### 2.2 READ Operations

#### Get Chapter Content (with media details)
```typescript
async function getChapterContentAction(chapterId: string): Promise<ChapterWithMedia> {
  const { data } = await supabase
    .from('chapter_media')
    .select(`
      id,
      order_in_chapter,
      title,
      created_at,
      media_files (
        id,
        name,
        file_type,
        file_size,
        duration_seconds,
        cdn_url,
        thumbnail_url,
        backblaze_url
      )
    `)
    .eq('chapter_id', chapterId)
    .order('order_in_chapter', { ascending: true })

  return {
    chapterId,
    media: data.map(item => ({
      junctionId: item.id,
      order: item.order_in_chapter,
      customTitle: item.title,
      ...item.media_files
    }))
  }
}
```

#### Get Complete Course Structure
```typescript
async function getCourseWithContentAction(courseId: string): Promise<CourseWithChapters> {
  const { data } = await supabase
    .from('course_chapters')
    .select(`
      id,
      title,
      order,
      chapter_media (
        id,
        order_in_chapter,
        title,
        media_files (
          id,
          name,
          file_type,
          file_size,
          duration_seconds,
          cdn_url,
          thumbnail_url
        )
      )
    `)
    .eq('course_id', courseId)
    .order('order', { ascending: true })

  return {
    courseId,
    chapters: data.map(chapter => ({
      ...chapter,
      media: chapter.chapter_media
        .sort((a, b) => a.order_in_chapter - b.order_in_chapter)
        .map(item => ({
          junctionId: item.id,
          order: item.order_in_chapter,
          customTitle: item.title,
          ...item.media_files
        }))
    }))
  }
}
```

#### Check Media Usage Across Chapters
```typescript
async function getMediaUsageAction(mediaId: string): Promise<MediaUsage[]> {
  const { data } = await supabase
    .from('chapter_media')
    .select(`
      chapter_id,
      title,
      course_chapters (
        title,
        courses (
          title,
          instructor_id
        )
      )
    `)
    .eq('media_file_id', mediaId)

  return data // Shows which chapters/courses use this media
}
```

### 2.3 UPDATE Operations

#### Reorder Media Within Chapter
```typescript
async function reorderChapterMediaAction(
  chapterId: string,
  newOrder: Array<{ junctionId: string, newPosition: number }>
): Promise<ActionResult> {

  // Batch update all positions
  for (const item of newOrder) {
    await supabase
      .from('chapter_media')
      .update({
        order_in_chapter: item.newPosition,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.junctionId)
      .eq('chapter_id', chapterId) // Security check
  }
}
```

#### Move Media Between Chapters
```typescript
async function moveMediaToChapterAction(
  junctionId: string,
  newChapterId: string,
  newPosition: number
): Promise<ActionResult> {

  // 1. Verify ownership of both chapters
  // 2. Check for duplicates in target chapter
  // 3. Update junction record

  await supabase
    .from('chapter_media')
    .update({
      chapter_id: newChapterId,
      order_in_chapter: newPosition,
      updated_at: new Date().toISOString()
    })
    .eq('id', junctionId)
}
```

#### Update Custom Title
```typescript
async function updateMediaTitleAction(
  junctionId: string,
  customTitle: string
): Promise<ActionResult> {

  await supabase
    .from('chapter_media')
    .update({
      title: customTitle,
      updated_at: new Date().toISOString()
    })
    .eq('id', junctionId)
}
```

#### Bulk Update Operations
```typescript
async function batchUpdateChapterMediaAction(
  updates: Array<{
    junctionId: string
    newOrder?: number
    newChapter?: string
    customTitle?: string
  }>
): Promise<ActionResult> {
  // Handle complex multi-operation updates
  // Similar to current batchUpdateVideoOrdersAction but for junction table
}
```

### 2.4 DELETE Operations

#### Unlink Media from Chapter (Keep Media File)
```typescript
async function unlinkMediaFromChapterAction(
  junctionId: string
): Promise<ActionResult> {

  // 1. Verify ownership
  // 2. Delete junction record only
  // 3. Update usage count in media_files
  // 4. Reorder remaining media in chapter

  await supabase
    .from('chapter_media')
    .delete()
    .eq('id', junctionId)

  // Media file remains in media_files table
}
```

#### Delete Media from Library (ADMIN-ONLY Operation)
```typescript
// IMPORTANT: This should ONLY be available in media library management
// NOT in course editing flows - follows YouTube/Coursera patterns
async function deleteMediaFromLibraryAction(
  mediaId: string
): Promise<ActionResult> {

  // 1. Verify admin/library permissions (NOT course editing context)
  // 2. Check if media is used in any courses (warn user)
  // 3. Only proceed if user confirms after seeing usage
  // 4. Delete from media_files (CASCADE deletes chapter_media records)
  // 5. Delete from Backblaze storage

  const { data: usageCount } = await supabase
    .from('chapter_media')
    .select('id')
    .eq('media_file_id', mediaId)

  if (usageCount.length > 0) {
    return {
      success: false,
      error: `Media is used in ${usageCount.length} chapter(s). Unlink first or force delete.`,
      requiresConfirmation: true
    }
  }

  await supabase
    .from('media_files')
    .delete()
    .eq('id', mediaId)
}
```

**BEST PRACTICE:** Course editing should ONLY unlink, never delete from library.
This follows industry standards where content creators can't accidentally delete
media files that might be used elsewhere.

---

## 3. STUDENT READ Operations

### 3.1 View Course Content (Student Perspective)

#### Get Student Course Structure
```typescript
async function getStudentCourseContentAction(courseId: string): Promise<StudentCourseView> {
  const { data } = await supabase
    .from('course_chapters')
    .select(`
      id,
      title,
      order,
      chapter_media (
        id,
        order_in_chapter,
        title,
        media_files (
          id,
          name,
          file_type,
          duration_seconds,
          cdn_url,
          thumbnail_url
        )
      )
    `)
    .eq('course_id', courseId)
    .eq('courses.status', 'published') // Only published courses
    .order('order', { ascending: true })

  return {
    courseId,
    chapters: data.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      videos: chapter.chapter_media
        .sort((a, b) => a.order_in_chapter - b.order_in_chapter)
        .map(item => ({
          id: item.media_files.id,
          title: item.title || item.media_files.name, // Use custom title if available
          duration_seconds: item.media_files.duration_seconds,
          cdn_url: item.media_files.cdn_url,
          thumbnail_url: item.media_files.thumbnail_url,
          order: item.order_in_chapter
        }))
    }))
  }
}
```

#### Get Single Video for Playback
```typescript
async function getVideoForPlaybackAction(
  courseId: string,
  videoId: string
): Promise<VideoPlaybackData> {

  // 1. Verify student enrollment
  // 2. Get video details from junction + media_files
  // 3. Generate signed URL for secure playback

  const { data } = await supabase
    .from('chapter_media')
    .select(`
      id,
      title,
      media_files (
        id,
        name,
        cdn_url,
        duration_seconds,
        file_size,
        backblaze_file_id
      ),
      course_chapters (
        courses (
          id,
          title
        )
      )
    `)
    .eq('media_files.id', videoId)
    .eq('course_chapters.courses.id', courseId)
    .single()

  return {
    videoId: data.media_files.id,
    title: data.title || data.media_files.name,
    playbackUrl: await generateSignedUrl(data.media_files.backblaze_file_id),
    duration: data.media_files.duration_seconds,
    courseTitle: data.course_chapters.courses.title
  }
}
```

#### Get Chapter Progress/Navigation
```typescript
async function getChapterNavigationAction(
  courseId: string,
  currentVideoId: string
): Promise<NavigationData> {

  // Get current video's chapter and position
  // Calculate next/previous videos
  // Return navigation context for student player

  const { data: currentVideo } = await supabase
    .from('chapter_media')
    .select(`
      order_in_chapter,
      chapter_id,
      course_chapters (
        order,
        course_id
      )
    `)
    .eq('media_file_id', currentVideoId)
    .eq('course_chapters.course_id', courseId)
    .single()

  // Find next/previous videos in same chapter or adjacent chapters
  // Return structured navigation data
}
```

---

## 4. TanStack Query Integration

### 4.1 Query Keys Structure
```typescript
export const mediaContentKeys = {
  all: ['media-content'] as const,
  courses: () => [...mediaContentKeys.all, 'course'] as const,
  course: (courseId: string) => [...mediaContentKeys.courses(), courseId] as const,
  chapters: () => [...mediaContentKeys.all, 'chapter'] as const,
  chapter: (chapterId: string) => [...mediaContentKeys.chapters(), chapterId] as const,
  media: () => [...mediaContentKeys.all, 'media'] as const,
  mediaUsage: (mediaId: string) => [...mediaContentKeys.media(), 'usage', mediaId] as const,
}
```

### 4.2 Instructor Hooks
```typescript
// Replace use-video-queries.ts with use-chapter-media-queries.ts
export function useChapterMedia(chapterId: string) {
  return useQuery({
    queryKey: mediaContentKeys.chapter(chapterId),
    queryFn: () => getChapterContentAction(chapterId)
  })
}

export function useLinkMediaToChapter(chapterId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ mediaId, customTitle }: { mediaId: string, customTitle?: string }) =>
      linkMediaToChapterAction(mediaId, chapterId, customTitle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaContentKeys.chapter(chapterId) })
    }
  })
}
```

### 4.3 Student Hooks
```typescript
export function useStudentCourseContent(courseId: string) {
  return useQuery({
    queryKey: mediaContentKeys.course(courseId),
    queryFn: () => getStudentCourseContentAction(courseId),
    staleTime: 1000 * 60 * 5 // 5 minutes cache
  })
}

export function useVideoPlayback(courseId: string, videoId: string) {
  return useQuery({
    queryKey: ['video-playback', courseId, videoId],
    queryFn: () => getVideoForPlaybackAction(courseId, videoId),
    enabled: !!(courseId && videoId)
  })
}
```

---

## 5. Migration Strategy

### 5.1 Single Migration File
```sql
-- File: 095_implement_junction_table_architecture.sql

-- Remove JSONB column from previous attempts
ALTER TABLE course_chapters DROP COLUMN IF EXISTS videos;

-- Create junction table
CREATE TABLE chapter_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id TEXT NOT NULL,
  media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  order_in_chapter INTEGER NOT NULL,
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chapter_id, media_file_id),
  UNIQUE(chapter_id, order_in_chapter)
);

-- Create indexes
CREATE INDEX idx_chapter_media_chapter_id ON chapter_media(chapter_id);
CREATE INDEX idx_chapter_media_media_file_id ON chapter_media(media_file_id);
CREATE INDEX idx_chapter_media_order ON chapter_media(chapter_id, order_in_chapter);

-- Drop videos table entirely (clean slate approach)
DROP TABLE IF EXISTS videos CASCADE;

-- Update media_usage table to work with junction table
-- (Optional: may need to update resource_id references)
```

### 5.2 Code Updates Required

1. **Replace files:**
   - `use-video-queries.ts` → `use-chapter-media-queries.ts`
   - `video-actions.ts` → `chapter-media-actions.ts`

2. **Update components:**
   - `VideoList.tsx` → Use junction table data structure
   - Student course pages → Use new student queries

3. **Update type definitions:**
   - Remove `Video` interface
   - Add `ChapterMedia` and `MediaContent` interfaces

---

## 6. Industry Best Practices Implemented

### 6.1 YouTube Creator Studio Pattern
- **Separate content library** from course organization
- **Unlink vs Delete** distinction in UI flows
- **Usage tracking** before allowing deletions
- **Bulk operations** for efficiency

### 6.2 Coursera Architecture Principles
- **Junction tables** for course-content relationships
- **Flexible content reuse** across multiple courses
- **Custom titles** per course context
- **Atomic batch operations**

### 6.3 Udemy Content Management
- **Media library** as single source of truth
- **Course-specific organization** via relationships
- **Permission-based operations** (instructor vs admin)
- **Usage analytics** and tracking

## 7. Benefits of Junction Table Approach

### 7.1 Data Integrity
- Single source of truth for media files
- Proper foreign key constraints
- No duplicate data synchronization issues

### 7.2 Flexibility
- Same media file can be used in multiple chapters/courses
- Custom titles per chapter without affecting original file
- Easy to track usage across the platform

### 7.3 Performance
- Cleaner queries with proper JOIN operations
- Better indexing strategy
- Reduced storage overhead

### 7.4 Maintainability
- Clear separation of concerns
- Standard relational database patterns
- Easier to extend for future features

---

## 8. Next Steps

1. **Execute migration 094** (remove JSONB column)
2. **Create migration 095** (implement junction table)
3. **Update server actions** (chapter-media-actions.ts)
4. **Update query hooks** (use-chapter-media-queries.ts)
5. **Update UI components** (VideoList.tsx, student pages)
6. **Test end-to-end workflow**
7. **Deploy and verify**

This junction table approach provides a clean, scalable foundation for media management across the platform while supporting both instructor editing and student viewing use cases.
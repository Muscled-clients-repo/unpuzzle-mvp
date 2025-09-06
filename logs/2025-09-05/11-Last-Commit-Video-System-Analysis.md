# Video System Analysis - Last Commit Implementation

## Overview
This document analyzes how video upload, reorder, and delete were working in the last commit before the normalized state migration.

## 1. Video Upload System

### Architecture
The system used a **hybrid approach** with both API routes and server actions:

#### Client-Side Flow
1. User selects files via `VideoUploader` component (drag & drop or click to browse)
2. Files are added to `uploadQueue` in Zustand store via `addVideosToQueue`
3. Each video gets a UUID: `crypto.randomUUID()`
4. **Default Chapter Logic**:
   - If no chapters exist, automatically creates "Chapter 1"
   - Videos are automatically assigned to the first chapter
   - Chapter ID format: `chapter-{Date.now()}` (e.g., "chapter-1735789456123")

#### Visual Upload Indicators
```typescript
// VideoUploader component showed:
- Drag & drop zone with dashed border
- Upload progress bar for each file
- Status indicators:
  - 'pending': File in queue, gray color
  - 'uploading': Spinner icon + progress percentage
  - 'complete': Green checkmark
  - 'error': Red X with error message
- Real-time progress updates (simulated 0-90%, then 100% on completion)

#### Server-Side Upload Path
```typescript
// /api/upload/route.ts - Main upload endpoint
POST /api/upload
├── Authentication (instructor role required)
├── Rate limiting check
├── Ownership verification (user must own the course)
├── Upload to Backblaze B2
├── Save to Supabase `videos` table
└── Return URL and metadata
```

### Key Implementation Details

#### 1. Video Storage in Database
Videos were stored in a **dedicated `videos` table**, NOT as JSON in the courses table:

```sql
-- videos table structure
videos (
  id: uuid PRIMARY KEY,
  course_id: uuid REFERENCES courses(id),
  chapter_id: text, -- Virtual chapters, not a foreign key!
  title: text,
  filename: text,
  file_size: bigint,
  video_url: text,
  backblaze_file_id: text, -- For deletion
  backblaze_url: text,
  status: enum ('pending', 'uploading', 'processing', 'complete', 'error'),
  progress: integer,
  order: integer,
  duration: text, -- Format: "MM:SS" or "H:MM:SS"
  duration_seconds: integer,
  created_at: timestamp,
  updated_at: timestamp
)

-- Unique constraint on (course_id, chapter_id, order)
```

#### 2. Chapter System - Virtual Chapters
**CRITICAL**: Chapters were NOT stored in a separate table. They were:
- Virtual groupings created via `chapter_id` strings in the videos table
- Stored as JSON in the `courses.chapters` column for UI metadata
- The `chapter_id` was a string with format: `chapter-{timestamp}` (e.g., "chapter-1735789456123")

#### 3. Upload Process
```typescript
// course-creation-slice.ts
addVideosToQueue: async (files) => {
  // 1. Check if course exists, auto-save if needed
  if (!courseId) {
    await saveDraft() // Creates course in DB first
  }
  
  // 2. Create Chapter 1 if none exist
  if (!chapters.length) {
    createChapter('Chapter 1')
  }
  
  // 3. For each file:
  const videoId = crypto.randomUUID()
  
  // 4. Upload via API route
  const formData = new FormData()
  formData.append('file', file)
  formData.append('courseId', courseId)
  formData.append('chapterId', chapterId)
  formData.append('videoId', videoId) // Pre-generated UUID
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
}
```

#### 4. Database Integration via SupabaseVideoService
```typescript
// services/supabase/video-service.ts
class SupabaseVideoService {
  async createVideoFromUpload(courseId, chapterId, videoUpload) {
    const insertData = {
      id: videoUpload.id, // Use provided UUID
      course_id: courseId,
      chapter_id: chapterId, // Just a string, not FK
      title: videoUpload.name,
      filename: backblazeFileName,
      file_size: videoUpload.size,
      video_url: videoUpload.url,
      backblaze_file_id: videoUpload.backblazeFileId,
      order: calculateNextOrder(), // Auto-increment within chapter
      status: 'complete'
    }
    
    await supabase.from('videos').insert(insertData)
  }
}
```

## 2. Video Reordering System

### Implementation
Used a **normalized state approach** with a migration path:

#### Hook: useNormalizedVideoReorder
```typescript
// hooks/useNormalizedVideoReorder.ts
function useNormalizedVideoReorder() {
  const handleReorderWithNormalized = (chapterId, videos) => {
    // 1. Update order in normalized state
    videos.forEach((video, index) => {
      reorderVideoNormalized({
        videoId: video.id,
        newOrder: index, // Position = order
        chapterId: chapterId
      })
    })
    
    // 2. Also update old state for UI sync
    const videosWithOrder = videos.map((v, i) => ({
      ...v,
      order: i
    }))
    oldReorderFunction(chapterId, videosWithOrder)
  }
}
```

### Database Update
Reordering updated the `order` field in the videos table:
```sql
UPDATE videos 
SET order = $1, updated_at = NOW()
WHERE id = $2
```

## 3. Video Deletion System

### Architecture
**Two-step deletion process**:

#### API Route: DELETE /api/delete-video/[id]
```typescript
// /api/delete-video/[id]/route.ts
async function DELETE(request, { params }) {
  const videoId = params.id
  
  // 1. Authenticate user
  const authResult = await authenticateApiRequest(request)
  
  // 2. Get video details from DB
  const video = await supabase
    .from('videos')
    .select('id, backblaze_file_id, filename, course_id')
    .eq('id', videoId)
    .single()
  
  // 3. Verify ownership via course
  const course = await supabase
    .from('courses')
    .select('instructor_id')
    .eq('id', video.course_id)
    .single()
  
  if (course.instructor_id !== user.id) {
    return { error: 'Access denied' }
  }
  
  // 4. Delete from database first
  await supabase.from('videos').delete().eq('id', videoId)
  
  // 5. Delete from Backblaze (if file info exists)
  if (video.backblaze_file_id && video.filename) {
    await backblazeService.deleteVideo(
      video.backblaze_file_id,
      video.filename
    )
  }
}
```

#### Client-Side: Optimistic Updates
```typescript
// course-creation-slice.ts
removeVideo: async (videoId) => {
  // 1. Optimistically remove from UI
  set(state => ({
    videos: state.videos.filter(v => v.id !== videoId),
    chapters: state.chapters.map(ch => ({
      ...ch,
      videos: ch.videos.filter(v => v.id !== videoId)
    }))
  }))
  
  // 2. Call delete API
  await fetch(`/api/delete-video/${videoId}`, {
    method: 'DELETE'
  })
}
```

## 4. Key Problems in Current Implementation

### 1. Videos Not Showing in UI
**Root Cause**: Mismatch between database storage and UI expectations
- Videos are saved to database successfully
- But the UI expects videos to be in `normalizedState.chapters[chapterId].videoIds`
- The normalized state is not being updated after successful upload

### 2. Chapter ID Mismatch
**Problem**: Using different chapter IDs for database vs UI
```typescript
// Current broken code:
const dbChapterId = '00000000-0000-0000-0000-000000000001' // Fixed UUID
// But UI uses: 'chapter-123456789' format
```

### 3. Missing Video-Chapter Relationship Updates
After upload, the system needs to:
1. Add video ID to `chapter.videoIds` array in normalized state
2. Update the `chapterId` field in the video normalized entity
3. Sync with the database videos table

## 5. Solution Requirements

### What Needs to be Fixed:

1. **After Upload Success**: Update normalized state properly
```typescript
// After successful upload:
// 1. Add video to chapter's videoIds array
const chapter = normalizedState.chapters[chapterId]
chapter.videoIds.push(videoId)

// 2. Update video entity with proper chapterId
normalizedState.videos[videoId].chapterId = chapterId
```

2. **Chapter ID Consistency**: Use same format everywhere
```typescript
// Use consistent chapter IDs:
const chapterId = `chapter-${Date.now()}` // For new chapters
// OR use the existing chapter.id from normalized state
```

3. **Load Videos from Database**: When loading course for edit
```typescript
// Load videos from videos table
const { data: videos } = await supabase
  .from('videos')
  .select('*')
  .eq('course_id', courseId)

// Group by chapter_id to reconstruct chapters
const chapterMap = new Map()
videos.forEach(video => {
  if (!chapterMap.has(video.chapter_id)) {
    chapterMap.set(video.chapter_id, [])
  }
  chapterMap.get(video.chapter_id).push(video)
})
```

## 6. Server Action Pattern (New Approach)

The migration introduced server actions to replace API routes:

### Benefits:
- Type safety across client-server boundary
- Simpler authentication flow
- Direct access to server environment variables
- Better error handling

### Example:
```typescript
// app/actions/video-actions.ts
'use server'

export async function uploadVideoToBackblaze(
  metadata: VideoMetadata,
  formData: FormData
) {
  // Direct access to BACKBLAZE_ env vars
  // No need for API route authentication
  // Type-safe parameters and return values
}
```

## 7. UI Components and Visual Indicators

### ChapterManager Component
- **Expandable/Collapsible chapters**: Chevron icons to show/hide chapter contents
- **Drag handles**: GripVertical icon for reordering chapters and videos
- **Edit mode**: Inline editing for chapter titles with Edit2 icon
- **Delete confirmation**: Trash2 icon with warning about video reassignment
- **Video count badges**: Shows number of videos per chapter
- **Empty state**: "No chapters yet" with "Create First Chapter" button

### VideoList Component
Visual status indicators for each video:
```typescript
// Status Icons and Colors:
- 'pending': Gray badge, no icon
- 'uploading': Loader2 spinner animation + progress bar
- 'complete': CheckCircle green icon
- 'error': AlertCircle red icon with error message
- 'processing': Loader2 with "Processing..." text
```

### Default Chapter Behavior
```typescript
// Automatic Chapter Creation:
1. When uploading videos with no chapters:
   - Automatically creates "Chapter 1"
   - ID: `chapter-${Date.now()}`
   
2. When deleting last chapter with videos:
   - Creates new "Chapter 1" to hold orphaned videos
   - Prevents video loss

3. When course is first created:
   - No chapters exist initially
   - First upload triggers Chapter 1 creation
```

## 8. Edit Mode Loading

### loadCourseForEdit Implementation
```typescript
async loadCourseForEdit(courseId) {
  // 1. Fetch course from database
  const course = await getCourse(courseId)
  
  // 2. Fetch videos from videos table
  const videos = await supabase
    .from('videos')
    .select('*')
    .eq('course_id', courseId)
    .order('order')
  
  // 3. Group videos by chapter_id
  const chapterMap = new Map()
  videos.forEach(video => {
    if (!chapterMap.has(video.chapter_id)) {
      chapterMap.set(video.chapter_id, [])
    }
    chapterMap.get(video.chapter_id).push(video)
  })
  
  // 4. Reconstruct chapters from JSON + videos
  const chapters = course.chapters.map(ch => ({
    ...ch,
    videos: chapterMap.get(ch.id) || []
  }))
  
  // 5. Set courseCreation state
  set({ courseCreation: { ...course, chapters, videos } })
}
```

## 9. Pattern Compatibility with Normalized State

### ✅ **COMPATIBLE PATTERNS** (Should Continue):

1. **Virtual Chapters** (`chapter-{timestamp}` IDs)
   - Works perfectly with normalized state
   - No database migration needed
   - Keep as-is

2. **Videos Table Storage**
   - Already normalized in database
   - Maps directly to normalized state entities
   - Continue using

3. **UUID for Videos**
   - `crypto.randomUUID()` for video IDs
   - Required by database schema
   - Essential for normalized state keys

4. **Visual Status Indicators**
   - Status/progress tracking works with normalized
   - Keep all UI feedback patterns
   - Just update state access paths

5. **Default Chapter Creation**
   - Auto-create Chapter 1 logic is good
   - Prevents orphaned videos
   - Works with normalized state

6. **Drag & Drop Reordering**
   - Already uses order field updates
   - Compatible with normalized approach
   - Just needs state path updates

### ❌ **INCOMPATIBLE PATTERNS** (Need Changes):

1. **Dual State Updates**
   ```typescript
   // OLD: Updates both old and normalized
   reorderVideosInChapter(chapterId, videos) // Bad
   
   // NEW: Only update normalized
   updateNormalizedVideo({ videoId, updates }) // Good
   ```

2. **Direct Array Manipulation**
   ```typescript
   // OLD: Mutating arrays
   chapter.videos = [...videos] // Bad
   
   // NEW: Update videoIds references
   chapter.videoIds = [...videoIds] // Good
   ```

3. **API Routes vs Server Actions**
   ```typescript
   // OLD: /api/upload, /api/delete-video
   // NEW: Server actions are better for type safety
   ```

### 🔄 **PATTERNS NEEDING ADAPTATION**:

1. **Chapter-Video Relationship**
   ```typescript
   // After upload, must update both:
   normalizedState.videos[videoId].chapterId = chapterId
   normalizedState.chapters[chapterId].videoIds.push(videoId)
   ```

2. **Loading Course for Edit**
   ```typescript
   // Must populate normalized state correctly:
   - Create normalized video entities
   - Create normalized chapter entities  
   - Set proper videoIds arrays in chapters
   - Maintain order field for sorting
   ```

3. **Save/Sync Logic**
   ```typescript
   // Must denormalize for database save:
   const videosArray = Object.values(normalizedState.videos)
   const chaptersArray = Object.values(normalizedState.chapters)
   ```

## 10. Recommended Implementation Strategy

### Keep These Patterns:
1. Virtual chapters with `chapter-{timestamp}` IDs
2. Videos table as source of truth
3. UUID generation for videos
4. All visual indicators and UI feedback
5. Default chapter creation logic
6. Drag & drop with order field updates

### Change These Patterns:
1. Remove dual state updates (old + normalized)
2. Use only normalized state for UI
3. Migrate from API routes to server actions
4. Update chapter.videos to chapter.videoIds

### Fix These Issues:
1. **After Upload**: Update chapter.videoIds array
2. **After Delete**: Remove from chapter.videoIds
3. **On Load**: Properly populate normalized entities
4. **On Save**: Denormalize for database

## Summary

The last commit patterns are **mostly compatible** with normalized state. The core concepts (virtual chapters, videos table, visual indicators) should be retained. Only the state management layer needs updating to:

1. ✅ Use normalized state exclusively
2. ✅ Maintain video-chapter relationships via videoIds arrays
3. ✅ Keep all UI/UX patterns unchanged
4. ✅ Preserve database schema (no migrations needed)

The main issue is not with the patterns themselves, but with incomplete migration to normalized state. The patterns complement normalized state well once properly implemented.
# Course Edit Flow Architecture - Implementation Guide

**Date**: 2025-09-28
**Purpose**: Complete implementation guide for course editing architecture
**Scope**: Instructor course management, chapter CRUD, media linking via junction table

## Database Architecture

### Core Tables

**Courses Table** (`courses`)
- `id` (UUID) - Primary key
- `title` (TEXT) - Course name
- `description` (TEXT) - Course description
- `instructor_id` (UUID) - Foreign key to instructor profile
- `status` (TEXT) - 'draft' or 'published'
- `price` (NUMERIC) - Course pricing
- `thumbnail_url` (TEXT) - Course cover image

**Chapters Table** (`course_chapters`)
- `id` (TEXT) - Chapter identifier (format: "chapter-{timestamp}")
- `course_id` (UUID) - Foreign key to courses table
- `title` (TEXT) - Chapter name
- `description` (TEXT) - Chapter description
- `order_position` (INTEGER) - Chapter sequence (renamed from 'order')
- `is_published` (BOOLEAN) - Chapter visibility
- `is_preview` (BOOLEAN) - Free preview access
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Media Files Table** (`media_files`)
- `id` (UUID) - Primary key
- `name` (TEXT) - Original filename
- `file_type` (TEXT) - MIME type
- `file_size` (BIGINT) - File size in bytes
- `duration_seconds` (INTEGER) - Video/audio duration
- `cdn_url` (TEXT) - Backblaze CDN URL
- `thumbnail_url` (TEXT) - Video thumbnail
- `instructor_id` (UUID) - Owner reference

**Junction Table** (`course_chapter_media`)
- `id` (UUID) - Primary key
- `chapter_id` (TEXT) - References course_chapters.id
- `media_file_id` (UUID) - References media_files.id
- `order_in_chapter` (INTEGER) - Media sequence within chapter
- `title` (TEXT) - Custom title override per chapter context
- `transcript_text` (TEXT) - Full transcript content
- `transcript_file_path` (TEXT) - Original transcript file path
- `transcript_status` (VARCHAR) - 'pending', 'completed', 'failed'
- `transcript_uploaded_at` (TIMESTAMPTZ)

### Database Constraints

**Foreign Key Constraints**:
- `course_chapter_media.chapter_id` → `course_chapters.id` (CASCADE DELETE)
- `course_chapter_media.media_file_id` → `media_files.id` (CASCADE DELETE)

**Unique Constraints**:
- `UNIQUE(chapter_id, media_file_id)` - Prevents duplicate media in same chapter
- `UNIQUE(chapter_id, order_in_chapter)` - Ensures unique ordering per chapter
- `UNIQUE(course_id, order_position)` - Unique chapter ordering per course

**Migration Files**:
- `089_implement_junction_table_architecture.sql` - Core junction table
- `096_refine_chapters_table_industry_standards.sql` - Chapter table refinements
- `098_add_transcript_to_junction_table.sql` - Transcript functionality
- `100_add_chapter_cascade_delete_constraints.sql` - Cascade delete setup

## Row Level Security (RLS) Policies

### Instructor Course Access

**Course Level Policies** (`courses` table):
- Instructors can only access courses where `instructor_id = auth.uid()`
- Service role has full access for system operations

**Chapter Level Policies** (`course_chapters` table):
- Policy Name: "Instructors can manage their course chapters"
- Logic: Chapter access verified through course ownership chain
- Implementation: `course_id IN (SELECT id FROM courses WHERE instructor_id = auth.uid())`

**Junction Table Policies** (`course_chapter_media` table):
- Policy: "Instructors can insert course chapter media for their courses"
- Policy: "Instructors can read course chapter media for their courses"
- Policy: "Instructors can update course chapter media for their courses"
- Policy: "Instructors can delete course chapter media for their courses"
- Security Chain: `chapter_id → course_chapters → courses → instructor_id = auth.uid()`

**Migration Files**:
- `097_add_student_rls_policies_for_junction_table.sql` - Student access policies
- `099_add_instructor_rls_policies_for_junction_table.sql` - Instructor CRUD policies

## Server Actions Architecture

### Core Action Files

**Chapter Media Actions** (`/src/app/actions/chapter-media-actions.ts`):
- `getCourseWithMediaAction` - Fetches complete course structure with nested chapters and media
- `linkMediaToChapterAction` - Creates junction record linking existing media to chapter
- `unlinkMediaFromChapterAction` - Removes junction record (preserves media in library)
- `updateMediaTitleAction` - Updates custom title for media in specific chapter context
- `reorderChapterMediaAction` - Updates order_in_chapter for drag-and-drop reordering

**Chapter CRUD Actions** (`/src/app/actions/chapter-crud-actions.ts`):
- `createChapterAction` - Creates new chapter with auto-generated ID
- `updateChapterAction` - Updates chapter title, description, published status
- `deleteChapterAction` - Deletes chapter (cascade deletes all media links)
- `getChaptersForCourseAction` - Fetches chapters with media counts
- `reorderChaptersAction` - Updates chapter order_position

**Course Actions** (`/src/app/actions/course-actions.ts`):
- `publishCourseAction` - Sets course status to 'published'
- `unpublishCourseAction` - Sets course status to 'draft'

### Security Pattern in Server Actions

**Authentication Flow**:
1. `requireAuth()` - Validates user session
2. `verifyCourseOwnership()` - Checks instructor_id ownership
3. Database operation with RLS policy enforcement
4. `revalidatePath()` - Clears Next.js cache for updated routes

## Frontend Architecture

### Primary Route

**Course Edit Page** (`/src/app/instructor/course/[id]/edit/page.tsx`):
- Main container for course editing interface
- Two-column layout: Course details (33%) + Course content (67%)
- State management for inline editing (titles, descriptions)
- Integrates all child components for media management

### Data Fetching Hooks

**Primary Hook** (`/src/hooks/use-chapter-media-queries.ts`):
- `useCourseWithMedia(courseId)` - Main data fetching hook
- Returns: `{ courseData, isLoading, error, refetch, isWebSocketConnected }`
- TanStack Query with 2-minute stale time
- Query key: `['chapter-media', 'course', courseId]`

**Query Key Structure**:
```typescript
chapterMediaKeys = {
  all: ['chapter-media'],
  courses: () => ['chapter-media', 'course'],
  course: (courseId) => ['chapter-media', 'course', courseId],
  chapters: () => ['chapter-media', 'chapter'],
  chapter: (chapterId) => ['chapter-media', 'chapter', chapterId]
}
```

### UI Components

**Core Components**:
- `ChapterMediaList` (`/src/components/course/ChapterMediaList.tsx`) - Per-chapter media management
- `MediaSelector` (`/src/components/media/media-selector.tsx`) - Library browsing modal
- `SimpleVideoPreview` (`/src/components/ui/SimpleVideoPreview.tsx`) - Video playback
- `TranscriptUploadModal` (`/src/components/course/TranscriptUploadModal.tsx`) - Transcript management
- `CourseTrackGoalSelector` (`/src/components/course/CourseTrackGoalSelector.tsx`) - Goal assignment

**State Management Patterns**:
- Local state via `useState` for inline editing and UI interactions
- Server state via TanStack Query for course data
- Zustand store (`/src/stores/course-creation-ui.ts`) for pending changes tracking

### Optimistic Updates Implementation

**TanStack Query Mutations**:
- `onMutate` - Cancel queries, snapshot current state, update cache optimistically
- `onError` - Rollback to previous state, show error toast
- `onSuccess` - Show success toast
- `onSettled` - Invalidate queries for fresh server data

**Implementation Example** (from course edit page):
```typescript
const linkMediaMutation = useMutation({
  mutationFn: async ({ mediaFiles, chapterId }) => {
    // Server action call
  },
  onMutate: async ({ mediaFiles, chapterId }) => {
    // Cancel queries and snapshot state
    // Update cache optimistically
  },
  onError: (err, variables, context) => {
    // Rollback optimistic update
  },
  onSettled: () => {
    // Refresh from server
  }
})
```

## Chapter Management Features

### Chapter Title Editing

**Implementation** (inline editing):
- Click chapter title to enter edit mode
- Raw HTML input with transparent styling matching title appearance
- Keyboard shortcuts: Enter (save), Escape (cancel)
- Auto-save on blur
- Change detection prevents unnecessary success toasts
- Small edit icon indicates editability

### Chapter CRUD Operations

**Create Chapter**:
- Auto-generated ID format: `chapter-{timestamp}`
- Auto-incrementing order_position
- Default to published state

**Update Chapter**:
- Inline title editing with optimistic updates
- Description editing support
- Published status toggles

**Delete Chapter**:
- Cascade deletion removes all media links automatically
- Database foreign key constraint handles cleanup
- No orphaned junction records

## Media Management Features

### Media Linking Process

**Browse Library Flow**:
1. Click "Browse Library" button on chapter
2. `MediaSelector` modal opens with instructor's media files
3. Multi-select media files
4. `linkMediaToChapterAction` creates junction records
5. Optimistic UI update with rollback on error
6. Auto-incrementing `order_in_chapter` values

**Media Display**:
- Drag-and-drop reordering within chapters
- File metadata display (size, duration, type)
- Custom title overrides per chapter context
- Status indicators for pending operations

### Media Actions

**Preview**: Opens `SimpleVideoPreview` modal for video playback
**Transcript Upload**: Opens `TranscriptUploadModal` for .txt/.json file upload
**Unlink**: Removes from chapter (preserves in media library)

### Transcript Management

**Upload Process**:
1. Click upload icon on video media item
2. `TranscriptUploadModal` supports file upload or text paste
3. Supports .txt and .json formats (with segment parsing)
4. Updates `transcript_text` and `transcript_file_path` in junction table
5. API route: `/api/transcription/[videoId]` (PUT method)

## Cache Management Strategy

### TanStack Query Integration

**Cache Invalidation Patterns**:
- Surgical invalidation: Specific query keys for targeted updates
- Cascade invalidation: Related queries updated together
- Manual invalidation: `queryClient.invalidateQueries()`

**Cache Keys Used**:
- `chapterMediaKeys.course(courseId)` - Full course structure
- `chapterMediaKeys.chapter(chapterId)` - Single chapter data
- `chapterMediaKeys.all` - All chapter-media related queries

### WebSocket Integration (Temporarily Disabled)

**Real-time Updates** (`/src/hooks/use-course-websocket.ts`):
- Currently disabled to prevent infinite render loops
- Event-driven cache invalidation
- Operation tracking with timeout fallbacks
- Observer pattern for cross-component communication

**Event Types**:
- `chapter-update-complete`
- `video-update-complete`
- `chapter-create-complete`
- `chapter-delete-complete`
- `upload-complete`

## Performance Optimizations

### Database Optimizations

**Indexes Created**:
- `idx_course_chapters_course_id` - Chapter lookups by course
- `idx_course_chapters_order` - Chapter ordering queries
- `idx_course_chapter_media_chapter_id` - Media lookups by chapter
- `idx_course_chapter_media_order` - Media ordering within chapters

### Frontend Optimizations

**Query Optimizations**:
- 2-minute stale time reduces unnecessary refetches
- Parallel data fetching for course and chapter data
- Optimistic updates provide immediate feedback

**Bundle Optimizations**:
- Component lazy loading for modals
- Tree shaking of unused icons
- Minimal dependencies in server actions

## Error Handling & Recovery

### Frontend Error Handling

**Optimistic Update Rollback**:
- Automatic state restoration on server action failures
- User-friendly error messages via toast notifications
- Graceful degradation when WebSocket unavailable

**Loading States**:
- Skeleton components during initial load
- Button loading states during mutations
- Progress indicators for file uploads

### Backend Error Handling

**Server Action Error Patterns**:
- Consistent `ActionResult<T>` return type
- Authentication errors bubble up with 401-equivalent messages
- Database constraint violations return user-friendly messages
- Automatic error logging for debugging

## Migration History & Evolution

### Architecture Evolution

**Phase 1**: Direct videos table with chapter_id foreign key
**Phase 2**: Junction table implementation (migration 089)
**Phase 3**: Chapter table refinements (migration 096)
**Phase 4**: Transcript integration (migration 098)
**Phase 5**: Cascade delete constraints (migration 100)

### Current State

**Stable Components**:
- Junction table architecture with proven industry patterns
- RLS policies providing secure multi-tenant access
- TanStack Query for robust client-side state management
- Server actions following Next.js 13+ best practices

**In Progress**:
- WebSocket real-time updates (temporarily disabled)
- Performance monitoring and optimization
- Enhanced error tracking and recovery

This architecture provides a robust, scalable foundation for course content management with strong security guarantees and excellent user experience through optimistic updates and real-time synchronization capabilities.
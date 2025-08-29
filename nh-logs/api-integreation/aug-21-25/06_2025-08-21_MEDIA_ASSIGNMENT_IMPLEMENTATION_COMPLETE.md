# Media File Assignment API Implementation Summary

## Date: August 21, 2025
## Feature: Media File Assignment to Course Sections
## Status: ✅ IMPLEMENTED

---

## Implementation Overview

This document tracks the implementation of Media File Assignment API integration for organizing course content.

### Completed Changes

#### 1. API Client Enhancement
**File**: `src/lib/api-client.ts`
- ✅ Add `assignMediaToSection` method - POST media to section
- ✅ Add `unassignMediaFromSection` method - POST unassign media
- ✅ Add `reorderMediaInSection` method - PUT reorder media
- ✅ Add `getCourseMedia` method - GET all course media
- ✅ Add TypeScript interfaces for media objects
- ✅ Handle nested response structures

#### 2. Store Updates
**File**: `src/stores/slices/course-creation-slice.ts`
- ✅ Add `loadCourseMedia` to fetch media organization
- ✅ Add `assignMediaToSection` function with API
- ✅ Add `unassignMediaFromSection` function with API
- ✅ Update `moveVideoToChapter` to use API
- ✅ Update `reorderVideosInChapter` to persist via API
- ✅ Update `moveVideoBetweenChapters` with API
- ✅ Track unassigned media pool with `unassignedMedia` field
- ✅ Add optimistic updates for all operations
- ✅ Handle assignment errors gracefully
- ✅ Auto-load media when loading course for edit

#### 3. UI Component Updates
**File**: `src/app/instructor/course/[id]/edit/page.tsx`
- ✅ Add chapter selection dropdown for auto-assignment
- ✅ Display videos within each chapter
- ✅ Add unassign button for each video
- ✅ Show assignment status indicators
- ✅ Display video count per chapter
- ✅ Add handleUploadComplete for auto-assignment
- ✅ Add handleUnassignMedia function
- ✅ Handle loading states with assigningMediaId

#### 4. Upload Integration
- ✅ Auto-assign media after successful upload to selected chapter
- ✅ Update UI to show assignment in progress
- ✅ Pass selected chapter context during upload
- ✅ Handle assignment failures with error logging

---

## Implementation Steps

### Step 1: API Client Methods
```typescript
// To be added to src/lib/api-client.ts

// POST - Assign media to section
async assignMediaToSection(sectionId: string, data: MediaAssignmentData) {
  return this.post(`/api/v1/content/sections/${sectionId}/media`, data);
}

// POST - Unassign media
async unassignMediaFromSection(mediaFileId: string) {
  return this.post(`/api/v1/content/media/${mediaFileId}/unassign`);
}

// PUT - Reorder media in section
async reorderMediaInSection(sectionId: string, mediaOrder: string[]) {
  return this.put(`/api/v1/content/sections/${sectionId}/media/reorder`, {
    mediaOrder
  });
}

// GET - Get all course media
async getCourseMedia(courseId: string) {
  return this.get(`/api/v1/content/courses/${courseId}/media`);
}
```

### Step 2: Store Integration
```typescript
// To be updated in src/stores/slices/course-creation-slice.ts

// Load and organize media
loadCourseMedia: async (courseId: string) => {
  const response = await apiClient.getCourseMedia(courseId);
  // Map sections and unassigned media
}

// Assign with API
assignMediaToChapter: async (mediaFileId: string, chapterId: string) => {
  const response = await apiClient.assignMediaToSection(chapterId, data);
  // Update local state
}

// Unassign with API
unassignMedia: async (mediaFileId: string) => {
  await apiClient.unassignMediaFromSection(mediaFileId);
  // Move to unassigned pool
}

// Reorder with API
reorderMediaInChapter: async (chapterId: string, mediaOrder: string[]) => {
  await apiClient.reorderMediaInSection(chapterId, mediaOrder);
  // Update local order
}
```

### Step 3: UI Updates
```typescript
// To be updated in edit/page.tsx
const [assigningMedia, setAssigningMedia] = useState<Set<string>>(new Set());
const [reorderingSection, setReorderingSection] = useState<string | null>(null);

const handleMediaAssignment = async (mediaId: string, sectionId: string) => {
  setAssigningMedia(prev => new Set(prev).add(mediaId));
  try {
    await assignMediaToChapter(mediaId, sectionId);
  } finally {
    setAssigningMedia(prev => {
      const next = new Set(prev);
      next.delete(mediaId);
      return next;
    });
  }
}

const handleDragEnd = async (result: DropResult) => {
  // Handle drag-drop reordering
}
```

---

## Testing Checklist

### Assignment Operations
- [ ] Test assigning uploaded media to section
- [ ] Test custom title and description
- [ ] Test order assignment
- [ ] Test preview/published flags
- [ ] Verify media appears in correct section

### Unassignment Operations
- [ ] Test removing media from section
- [ ] Verify media moves to unassigned pool
- [ ] Test reassignment to different section
- [ ] Verify custom data is reset

### Reorder Operations
- [ ] Test drag-drop within section
- [ ] Test manual order input
- [ ] Verify order persists after refresh
- [ ] Test moving between sections

### Bulk Operations
- [ ] Test selecting multiple media
- [ ] Test bulk assignment
- [ ] Test bulk publish/unpublish
- [ ] Test bulk deletion

### Error Handling
- [ ] Test 403 permission errors
- [ ] Test 404 not found errors
- [ ] Test network failures
- [ ] Test rate limiting
- [ ] Verify error messages display

### UI/UX
- [ ] Test loading states during operations
- [ ] Test optimistic updates
- [ ] Test rollback on errors
- [ ] Test visual feedback
- [ ] Test keyboard navigation
- [ ] Test mobile responsiveness

---

## Type Definitions

### Media Types
```typescript
interface MediaFile {
  id: string;
  userId: string;
  courseId?: string;
  courseSectionId?: string;
  title: string;
  description?: string;
  filename: string;
  originalFilename: string;
  fileType: 'video' | 'audio' | 'document' | 'image';
  mimeType: string;
  fileSize: number;
  fileSizeFormatted: string;
  durationSeconds?: number;
  durationFormatted?: string;
  width?: number;
  height?: number;
  resolution?: string;
  orderInSection?: number;
  isPreview: boolean;
  isPublished: boolean;
  processingStatus: ProcessingStatus;
  storageUrl: string;
  cdnUrl?: string;
  bestUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface MediaAssignmentData {
  mediaFileId: string;
  title?: string;
  description?: string;
  order?: number;
  isPreview?: boolean;
  isPublished?: boolean;
}

interface CourseMediaResponse {
  courseId: string;
  courseTitle: string;
  sections: SectionWithMedia[];
  unsectionedMedia: MediaFile[];
}

interface SectionWithMedia {
  sectionId: string;
  sectionTitle: string;
  order: number;
  mediaFiles: MediaFile[];
}
```

---

## Error Handling

### Error Handler
```typescript
const handleMediaError = (operation: string, error: any) => {
  const errorMessages = {
    assign: {
      400: 'Invalid media file or missing data',
      403: 'You don\'t have permission to manage this course',
      404: 'Section or media file not found'
    },
    unassign: {
      403: 'You don\'t own this media file',
      404: 'Media file not found'
    },
    reorder: {
      400: 'Invalid order data',
      403: 'Permission denied',
      404: 'Section not found'
    },
    load: {
      404: 'Course not found',
      403: 'Access denied'
    }
  };

  const messages = errorMessages[operation];
  if (messages && messages[error.status]) {
    return messages[error.status];
  }
  
  return `Failed to ${operation} media. Please try again.`;
}
```

### Retry Logic
```typescript
const retryOperation = async (
  operation: () => Promise<any>,
  maxRetries = 3,
  delay = 1000
) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}
```

---

## UI Components

### Media Card Component
```typescript
const MediaCard = ({ media, sectionId, onUnassign, onEdit }) => (
  <div className="border rounded-lg p-4">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <FileTypeIcon type={media.fileType} />
        <div>
          <h4 className="font-medium">{media.title}</h4>
          <p className="text-sm text-gray-500">
            {media.fileSizeFormatted} • {media.durationFormatted}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {media.isPreview && <Badge>Preview</Badge>}
        {!media.isPublished && <Badge variant="outline">Draft</Badge>}
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onUnassign}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
);
```

### Drag Handle Component
```typescript
const DragHandle = ({ ...props }) => (
  <div className="cursor-move p-1" {...props}>
    <GripVertical className="h-5 w-5 text-gray-400" />
  </div>
);
```

---

## Performance Optimizations

1. **Optimistic Updates**
   - Update UI immediately on user action
   - Rollback if API call fails
   - Show sync status indicator

2. **Caching Strategy**
   - Cache media metadata locally
   - Invalidate on mutations
   - Prefetch thumbnails

3. **Lazy Loading**
   - Load thumbnails on scroll
   - Paginate large media lists
   - Virtual scrolling for performance

---

## Next Steps

1. Review plan with team
2. Set up development environment
3. Implement API client methods
4. Update store with API integration
5. Build UI components
6. Add drag-drop functionality
7. Integrate with upload flow
8. Test all operations
9. Handle edge cases
10. Update this document with results

---

## Notes for Implementation

- **Media Ownership**: Users can only assign their own media
- **Section Context**: Media assignment requires course ownership
- **Processing Status**: Check status before allowing operations
- **URL Priority**: Use `bestUrl` for playback (CDN > storage)
- **Rate Limits**: Respect API rate limits (30-100 req/min)
- **File Types**: Support video, audio, document, image
- **Bulk Operations**: Optimize for multiple selections
- **Offline Support**: Queue operations when offline
- **Progress Tracking**: Show upload and processing progress
- **Update Document**: Mark completed items with ✅ after implementation
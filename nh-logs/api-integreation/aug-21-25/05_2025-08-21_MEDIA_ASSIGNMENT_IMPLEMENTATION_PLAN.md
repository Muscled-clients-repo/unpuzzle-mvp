# Media File Assignment API Implementation Plan

## Date: August 21, 2025
## Feature: Media File Assignment to Course Sections

---

## 1. API Specification

### All Media Assignment Endpoints

#### 1.1 Assign Media to Section
```
POST /api/v1/content/sections/{section_id}/media
```
Assigns an existing media file to a specific course section.

#### 1.2 Unassign Media from Section
```
POST /api/v1/content/media/{media_file_id}/unassign
```
Removes media file from its current section.

#### 1.3 Reorder Media in Section
```
PUT /api/v1/content/sections/{section_id}/media/reorder
```
Updates the order of media files within a section.

#### 1.4 Get Course Media
```
GET /api/v1/content/courses/{course_id}/media
```
Retrieves all media files organized by sections.

---

## 2. Current Implementation Analysis

### Existing Video/Media Functionality
The application currently has video upload and management, but media-section assignment needs API integration:

#### Current Implementation
```typescript
// In course-creation-slice.ts
moveVideoToChapter: (videoId: string, chapterId: string | null) => {
  // Currently moves videos locally without API
}

reorderVideosInChapter: (chapterId: string, videos: VideoUpload[]) => {
  // Local reordering without persistence
}
```

#### Existing Upload Flow
1. Videos uploaded via B2 proxy service
2. Upload tracking in `uploadQueue`
3. Videos stored with metadata
4. Need to integrate assignment to sections

#### Files to Modify
1. `src/lib/api-client.ts` - Add media assignment methods
2. `src/stores/slices/course-creation-slice.ts` - Integrate API calls
3. `src/app/instructor/course/[id]/edit/page.tsx` - UI for assignment
4. `src/services/video-upload-service.ts` - Post-upload assignment

---

## 3. Implementation Tasks

### Task 1: Update API Client
**File**: `src/lib/api-client.ts`

Add media assignment methods:
```typescript
// Assign media to section
async assignMediaToSection(sectionId: string, data: {
  mediaFileId: string;
  title?: string;
  description?: string;
  order?: number;
  isPreview?: boolean;
  isPublished?: boolean;
}) {
  return this.post(`/api/v1/content/sections/${sectionId}/media`, data);
}

// Unassign media from section
async unassignMediaFromSection(mediaFileId: string) {
  return this.post(`/api/v1/content/media/${mediaFileId}/unassign`);
}

// Reorder media in section
async reorderMediaInSection(sectionId: string, mediaOrder: string[]) {
  return this.put(`/api/v1/content/sections/${sectionId}/media/reorder`, {
    mediaOrder
  });
}

// Get all course media
async getCourseMedia(courseId: string) {
  return this.get(`/api/v1/content/courses/${courseId}/media`);
}
```

### Task 2: Update Store - Media Assignment
**File**: `src/stores/slices/course-creation-slice.ts`

Modify video/media management functions:

```typescript
// Load course media from API
loadCourseMedia: async (courseId: string) => {
  try {
    const response = await apiClient.getCourseMedia(courseId);
    if (!response.error && response.data) {
      // Update chapters with media files
      const sections = response.data.data?.sections || [];
      set(state => ({
        courseCreation: {
          ...state.courseCreation,
          chapters: sections.map(section => ({
            id: section.sectionId,
            title: section.sectionTitle,
            order: section.order,
            videos: section.mediaFiles || []
          })),
          unassignedMedia: response.data.data?.unsectionedMedia || []
        }
      }));
    }
  } catch (error) {
    console.error('Failed to load course media:', error);
  }
},

// Assign media to chapter/section
assignMediaToChapter: async (mediaFileId: string, chapterId: string, customData?: any) => {
  try {
    const response = await apiClient.assignMediaToSection(chapterId, {
      mediaFileId,
      title: customData?.title,
      description: customData?.description,
      order: customData?.order,
      isPreview: customData?.isPreview || false,
      isPublished: customData?.isPublished ?? true
    });
    
    if (!response.error) {
      // Update local state
      set(state => ({
        courseCreation: {
          ...state.courseCreation,
          chapters: state.courseCreation.chapters.map(ch =>
            ch.id === chapterId
              ? { ...ch, videos: [...ch.videos, response.data.data.mediaFile] }
              : ch
          )
        }
      }));
    }
  } catch (error) {
    console.error('Failed to assign media:', error);
    throw error;
  }
},

// Unassign media from section
unassignMedia: async (mediaFileId: string) => {
  try {
    const response = await apiClient.unassignMediaFromSection(mediaFileId);
    
    if (!response.error) {
      // Remove from all chapters
      set(state => ({
        courseCreation: {
          ...state.courseCreation,
          chapters: state.courseCreation.chapters.map(ch => ({
            ...ch,
            videos: ch.videos.filter(v => v.id !== mediaFileId)
          })),
          unassignedMedia: [
            ...(state.courseCreation.unassignedMedia || []),
            response.data.data.mediaFile
          ]
        }
      }));
    }
  } catch (error) {
    console.error('Failed to unassign media:', error);
    throw error;
  }
},

// Reorder media within chapter
reorderMediaInChapter: async (chapterId: string, mediaOrder: string[]) => {
  try {
    const response = await apiClient.reorderMediaInSection(chapterId, mediaOrder);
    
    if (!response.error) {
      // Update local state with new order
      set(state => ({
        courseCreation: {
          ...state.courseCreation,
          chapters: state.courseCreation.chapters.map(ch =>
            ch.id === chapterId
              ? { ...ch, videos: response.data.data.mediaFiles }
              : ch
          )
        }
      }));
    }
  } catch (error) {
    console.error('Failed to reorder media:', error);
    throw error;
  }
}
```

### Task 3: Update UI Components
**File**: `src/app/instructor/course/[id]/edit/page.tsx`

Add media assignment UI:

```typescript
// State for media assignment
const [assigningMediaId, setAssigningMediaId] = useState<string | null>(null);
const [reorderingChapterId, setReorderingChapterId] = useState<string | null>(null);

// Handle completed upload assignment
const handleUploadComplete = async (videoId: string, mediaFile: MediaFile) => {
  // Auto-assign to first chapter or selected chapter
  const targetChapterId = selectedChapterId || courseCreation.chapters[0]?.id;
  
  if (targetChapterId) {
    setAssigningMediaId(videoId);
    try {
      await assignMediaToChapter(mediaFile.id, targetChapterId, {
        title: mediaFile.title,
        isPublished: true
      });
    } finally {
      setAssigningMediaId(null);
    }
  }
};

// Handle drag and drop reordering
const handleMediaReorder = async (chapterId: string, newOrder: string[]) => {
  setReorderingChapterId(chapterId);
  try {
    await reorderMediaInChapter(chapterId, newOrder);
  } finally {
    setReorderingChapterId(null);
  }
};

// Handle unassign
const handleUnassignMedia = async (mediaId: string) => {
  if (confirm('Remove this media from the section?')) {
    await unassignMedia(mediaId);
  }
};
```

### Task 4: Post-Upload Integration
**File**: `src/services/video-upload-service.ts`

Integrate assignment after successful upload:

```typescript
// After successful upload
const handleUploadSuccess = async (uploadSession: UploadSession, mediaFile: MediaFile) => {
  // Mark upload as complete
  completeVideoUpload(uploadSession.id, mediaFile);
  
  // If course and section specified, auto-assign
  if (uploadSession.courseId && uploadSession.sectionId) {
    await assignMediaToSection(uploadSession.sectionId, {
      mediaFileId: mediaFile.id,
      title: uploadSession.customTitle || mediaFile.originalFilename,
      order: uploadSession.order,
      isPublished: true
    });
  }
};
```

### Task 5: Handle Media File Types

#### Type Definitions
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
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  storageUrl: string;
  cdnUrl?: string;
  bestUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

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
  sections: Array<{
    sectionId: string;
    sectionTitle: string;
    order: number;
    mediaFiles: MediaFile[];
  }>;
  unsectionedMedia: MediaFile[];
}
```

---

## 4. UI/UX Enhancements

### Drag and Drop Support
```typescript
// Implement react-beautiful-dnd or similar
<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId={chapter.id}>
    {(provided) => (
      <div ref={provided.innerRef} {...provided.droppableProps}>
        {chapter.videos.map((video, index) => (
          <Draggable key={video.id} draggableId={video.id} index={index}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                <VideoCard video={video} />
              </div>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
</DragDropContext>
```

### Visual Indicators
- Show assignment status during upload
- Display processing status badges
- Indicate preview/published status
- Show file type icons

### Bulk Operations
- Select multiple media files
- Bulk assign to section
- Bulk publish/unpublish
- Bulk delete

---

## 5. Testing Plan

### Manual Testing Scenarios

1. **Media Assignment Flow**
   - Upload new video
   - Assign to section
   - Verify appears in correct section
   - Check order position

2. **Unassign Flow**
   - Select assigned media
   - Unassign from section
   - Verify moves to unassigned pool
   - Check can reassign

3. **Reorder Flow**
   - Drag media within section
   - Verify new order persists
   - Check order numbers update

4. **Cross-Section Movement**
   - Move media between sections
   - Verify removal from source
   - Verify addition to target

5. **Error Scenarios**
   - Assign non-existent media
   - Assign to non-owned course
   - Network failures
   - Processing failures

### API Testing
- Test all endpoints with Postman
- Verify response structures
- Test error conditions
- Check rate limits

---

## 6. Implementation Order

1. **Phase 1: API Client** (20 minutes)
   - Add all 4 media assignment methods
   - Add TypeScript types
   - Test with API directly

2. **Phase 2: Store Integration** (40 minutes)
   - Update media management functions
   - Add API calls to existing functions
   - Handle response data mapping
   - Add error handling

3. **Phase 3: Basic UI** (30 minutes)
   - Add assignment buttons
   - Show media in sections
   - Add unassign functionality
   - Display media metadata

4. **Phase 4: Drag & Drop** (30 minutes)
   - Implement drag-drop library
   - Add reorder functionality
   - Update visual feedback
   - Test reordering

5. **Phase 5: Upload Integration** (20 minutes)
   - Auto-assign after upload
   - Handle upload completion
   - Update progress indicators

---

## 7. Error Handling

### Error Messages
```typescript
const mediaErrorMessages = {
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
    403: 'You don\'t have permission to manage this course',
    404: 'Section not found'
  }
};
```

### Retry Logic
- Implement exponential backoff
- Retry failed assignments
- Queue operations for offline mode

---

## 8. Performance Considerations

1. **Optimistic Updates**
   - Update UI immediately
   - Rollback on error
   - Show sync indicators

2. **Caching**
   - Cache media metadata
   - Avoid redundant API calls
   - Invalidate on changes

3. **Lazy Loading**
   - Load media thumbnails on demand
   - Paginate large media lists
   - Virtual scrolling for long lists

---

## 9. Success Criteria

- ✅ Media files can be assigned to sections via API
- ✅ Unassignment works correctly
- ✅ Drag-drop reordering persists to backend
- ✅ All media organized by sections display correctly
- ✅ Upload completion triggers auto-assignment
- ✅ Error handling provides clear feedback
- ✅ UI shows real-time status updates
- ✅ Preview/publish flags work correctly
- ✅ Custom titles and descriptions save
- ✅ Bulk operations work efficiently

---

## 10. Notes

- Media files can exist without section assignment
- Deleted sections set media section_id to NULL
- Use `bestUrl` for playback (CDN preferred)
- Processing status affects availability
- Consider bandwidth for video previews
- Rate limits: POST/PUT (30/min), GET (100/min)
- File types: video, audio, document, image
- Max file sizes vary by type
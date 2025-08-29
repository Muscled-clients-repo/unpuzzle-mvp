# 🎥 Video Upload API Integration Implementation Plan

**Document:** Video Upload Implementation Strategy  
**Created:** 2025-08-20  
**Updated:** 2025-08-20  
**Version:** 1.0  

## 🔍 Analysis Summary

### Current Architecture Analysis

**Existing Video Upload Infrastructure:**
- ✅ `VideoUpload` interface in course-creation-slice.ts with upload states
- ✅ Chapter-based video organization system
- ✅ Zustand state management with video queue
- ✅ Basic video management methods in instructor-course-service.ts
- ✅ Course edit page with chapters & videos tab

**Current Gaps:**
- ❌ No actual video upload API integration
- ❌ Missing video upload service implementation
- ❌ No progress tracking for uploads
- ❌ No file validation or error handling
- ❌ Missing video upload UI components

### API Documentation Reference
- Base URL: `/api/v1/media/`
- User-owned upload system with authentication
- Three-step upload process: initiate → upload → complete
- Progress tracking and metadata processing

## 📋 Implementation Plan

### Phase 1: Service Layer Implementation
**Priority:** High  
**Files to Create/Modify:**
- `src/services/video-upload-service.ts` (NEW)
- `src/lib/api-client.ts` (MODIFY - add media endpoints)
- `src/stores/slices/course-creation-slice.ts` (MODIFY - integrate upload service)

### Phase 2: Zustand Integration
**Priority:** High  
**Files to Modify:**
- Enhance existing course-creation-slice video upload methods
- Add upload session management
- Implement progress tracking state

### Phase 3: UI Components Enhancement
**Priority:** Medium  
**Files to Modify:**
- `src/app/instructor/course/[id]/edit/page.tsx` (ADD upload UI)
- Create video upload components (drag & drop, progress bars)

### Phase 4: Error Handling & Validation
**Priority:** Medium  
**Files to Create:**
- File validation utilities
- Upload retry mechanisms
- Error state management

## 🏗️ Detailed Implementation Strategy

### 1. Video Upload Service (`/src/services/video-upload-service.ts`)

```typescript
interface UploadSession {
  sessionKey: string
  uploadUrl: string
  fields: Record<string, string>
  storageKey: string
  expiresIn: number
}

class VideoUploadService {
  // Three-step upload process
  async initiateUpload(file: File, courseId?: string): Promise<UploadSession>
  async uploadFile(session: UploadSession, file: File, onProgress?: (progress: number) => void): Promise<void>
  async completeUpload(sessionKey: string, storageKey: string): Promise<MediaFile>
  
  // Progress and session management
  async getUploadProgress(sessionKey: string): Promise<UploadProgress>
  async listUserMedia(filters?: MediaFilters): Promise<MediaFile[]>
  async attachVideoToCourse(mediaFileId: string, videoId: string): Promise<void>
}
```

### 2. Enhanced Zustand Store Integration

**Extend existing CourseCreationSlice with:**
```typescript
interface CourseCreationSlice {
  // Existing properties...
  uploadSessions: Map<string, UploadSession>
  
  // New upload methods
  initiateVideoUpload: (files: FileList, chapterId?: string) => Promise<void>
  handleUploadProgress: (videoId: string, progress: number) => void
  completeVideoUpload: (videoId: string, mediaFile: MediaFile) => void
  retryFailedUpload: (videoId: string) => Promise<void>
}
```

### 3. API Client Extensions (`/src/lib/api-client.ts`)

**Add media endpoints support:**
```typescript
class ApiClient {
  // Upload workflow
  async initiateMediaUpload(payload: InitiateUploadPayload): Promise<ApiResponse<UploadSession>>
  async completeMediaUpload(payload: CompleteUploadPayload): Promise<ApiResponse<MediaFile>>
  async getUploadProgress(sessionKey: string): Promise<ApiResponse<UploadProgress>>
  
  // Media management
  async listUserMedia(filters?: MediaFilters): Promise<ApiResponse<MediaFile[]>>
  async attachMediaToVideo(mediaFileId: string, videoId: string): Promise<ApiResponse<void>>
}
```

### 4. UI Component Enhancements

**Course Edit Page - Video Upload Section:**
```typescript
// Add to existing chapters & videos tab
function VideoUploadSection() {
  return (
    <div className="space-y-4">
      <VideoUploadDropzone onFilesSelected={handleFilesSelected} />
      <VideoUploadQueue videos={uploadQueue} />
      <VideoProgressTracker sessions={uploadSessions} />
    </div>
  )
}
```

## 🔧 Technical Implementation Details

### Step 1: Create Video Upload Service

**File:** `src/services/video-upload-service.ts`

```typescript
import { apiClient } from '@/lib/api-client'

export interface MediaFile {
  id: string
  userId: string
  filename: string
  fileSize: number
  contentType: string
  storageKey: string
  cdnUrl?: string
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  metadata?: {
    duration?: number
    resolution?: string
    codec?: string
  }
}

export interface UploadSession {
  sessionKey: string
  uploadUrl: string
  fields: Record<string, string>
  storageKey: string
  expiresIn: number
}

export class VideoUploadService {
  async initiateUpload(file: File, courseId?: string): Promise<ServiceResult<UploadSession>> {
    const payload = {
      filename: file.name,
      fileSize: file.size,
      contentType: file.type,
      courseId
    }
    
    return await apiClient.post<UploadSession>('/api/v1/media/upload/initiate', payload)
  }

  async uploadFile(
    session: UploadSession, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const formData = new FormData()
    Object.entries(session.fields).forEach(([key, value]) => {
      formData.append(key, value)
    })
    formData.append('file', file)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      }
      
      xhr.onload = () => xhr.status === 200 ? resolve() : reject(new Error('Upload failed'))
      xhr.onerror = () => reject(new Error('Upload error'))
      
      xhr.open('POST', session.uploadUrl)
      xhr.send(formData)
    })
  }

  async completeUpload(sessionKey: string, storageKey: string): Promise<ServiceResult<MediaFile>> {
    return await apiClient.post<MediaFile>('/api/v1/media/upload/complete', {
      sessionKey,
      storageKey
    })
  }
}

export const videoUploadService = new VideoUploadService()
```

### Step 2: Enhance Course Creation Slice

**Modify:** `src/stores/slices/course-creation-slice.ts`

```typescript
// Add to existing interface
interface CourseCreationSlice {
  uploadSessions: Map<string, UploadSession>
  
  // New upload methods
  initiateVideoUpload: (files: FileList, chapterId?: string) => Promise<void>
  handleUploadProgress: (videoId: string, progress: number) => void
  completeVideoUpload: (videoId: string, mediaFile: MediaFile) => void
}

// Implementation in slice
initiateVideoUpload: async (files: FileList, chapterId?: string) => {
  const videoPromises = Array.from(files).map(async (file) => {
    const videoId = generateId()
    
    // Add to upload queue immediately
    set((state) => ({
      uploadQueue: [...state.uploadQueue, {
        id: videoId,
        file,
        name: file.name,
        size: file.size,
        status: 'pending',
        progress: 0,
        chapterId,
        order: state.uploadQueue.length
      }]
    }))

    try {
      // Initiate upload
      const sessionResult = await videoUploadService.initiateUpload(file, state.courseCreation?.id)
      if (sessionResult.error) throw new Error(sessionResult.error)

      const session = sessionResult.data!
      set((state) => ({ 
        uploadSessions: new Map(state.uploadSessions.set(videoId, session)) 
      }))

      // Update status to uploading
      get().updateVideoStatus(videoId, 'uploading')

      // Start upload with progress tracking
      await videoUploadService.uploadFile(
        session,
        file,
        (progress) => get().handleUploadProgress(videoId, progress)
      )

      // Complete upload
      const mediaResult = await videoUploadService.completeUpload(session.sessionKey, session.storageKey)
      if (mediaResult.error) throw new Error(mediaResult.error)

      get().completeVideoUpload(videoId, mediaResult.data!)

    } catch (error) {
      get().updateVideoStatus(videoId, 'error')
      console.error('Upload failed:', error)
    }
  })

  await Promise.allSettled(videoPromises)
}
```

### Step 3: API Client Enhancement

**Modify:** `src/lib/api-client.ts`

```typescript
// Add media-specific methods to existing ApiClient class
class ApiClient {
  // ... existing methods

  async initiateMediaUpload(payload: any): Promise<ApiResponse<UploadSession>> {
    return this.post<UploadSession>('/api/v1/media/upload/initiate', payload)
  }

  async completeMediaUpload(payload: any): Promise<ApiResponse<MediaFile>> {
    return this.post<MediaFile>('/api/v1/media/upload/complete', payload)
  }

  async getUploadProgress(sessionKey: string): Promise<ApiResponse<any>> {
    return this.get<any>(`/api/v1/media/upload/progress/${sessionKey}`)
  }

  async listUserMedia(filters?: any): Promise<ApiResponse<MediaFile[]>> {
    const queryParams = filters ? `?${new URLSearchParams(filters)}` : ''
    return this.get<MediaFile[]>(`/api/v1/media/user/media${queryParams}`)
  }

  async attachMediaToVideo(mediaFileId: string, videoId: string): Promise<ApiResponse<void>> {
    return this.post<void>(`/api/v1/media/media/${mediaFileId}/attach-video`, { videoId })
  }
}
```

### Step 4: UI Component Integration

**Enhance:** `src/app/instructor/course/[id]/edit/page.tsx`

```typescript
// Add video upload section to chapters tab
function renderVideoUploadSection() {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Upload Videos
        </CardTitle>
        <CardDescription>
          Drag and drop video files or click to browse
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          <Video className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">Drop video files here</p>
          <p className="text-sm text-gray-600 mb-4">or click to browse</p>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Select Videos
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        
        {/* Upload Queue */}
        {uploadQueue.length > 0 && (
          <div className="mt-6 space-y-4">
            <h4 className="font-medium">Upload Queue</h4>
            {uploadQueue.map((video) => (
              <VideoUploadProgress key={video.id} video={video} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

## 🔄 Integration Workflow

### Upload Process Flow
1. **User Selection**: Files selected via drag-drop or file input
2. **Queue Addition**: Files added to Zustand upload queue
3. **Initiate Upload**: API call to `/api/v1/media/upload/initiate`
4. **Direct Upload**: Files uploaded directly to Backblaze with progress tracking
5. **Complete Upload**: API call to `/api/v1/media/upload/complete`
6. **Video Association**: Attach media files to course videos
7. **State Update**: Update Zustand store with completed upload data

### Error Handling Strategy
- **Network Errors**: Retry mechanism with exponential backoff
- **Validation Errors**: Clear user feedback with correction guidance
- **Upload Failures**: Resume capability where possible
- **API Errors**: Graceful degradation with error logging

## 📊 Testing Strategy

### Unit Tests
- Video upload service methods
- Zustand store state transitions
- API client integration
- File validation utilities

### Integration Tests
- End-to-end upload workflow
- Error scenario handling
- Progress tracking accuracy
- State synchronization

### User Testing
- Drag & drop functionality
- Upload progress visualization
- Error message clarity
- Performance with large files

## 🚀 Implementation Timeline

**Week 1:**
- ✅ Analysis complete
- 🔄 Video upload service implementation
- 🔄 API client enhancement

**Week 2:**
- Zustand store integration
- Basic UI components
- Error handling implementation

**Week 3:**
- Progress tracking enhancement
- File validation
- Testing and bug fixes

**Week 4:**
- Performance optimization
- User testing feedback
- Production deployment

## 📝 Key Considerations

### Performance
- **Large File Handling**: Chunked uploads for files > 100MB
- **Concurrent Uploads**: Limit to 3 simultaneous uploads
- **Progress Accuracy**: Real-time upload progress tracking

### Security
- **File Validation**: MIME type and size validation
- **Authentication**: All requests use authenticated API client
- **Access Control**: User-scoped media file access

### User Experience
- **Visual Feedback**: Clear upload progress and status
- **Error Recovery**: Retry failed uploads
- **Responsive Design**: Mobile-friendly upload interface

### Scalability
- **Queue Management**: Handle multiple file uploads efficiently
- **State Management**: Optimize Zustand store for large upload queues
- **Memory Usage**: Clean up completed/failed upload sessions

---

## 🎯 Success Criteria

- [ ] Video files can be uploaded via drag & drop or file selection
- [ ] Upload progress is tracked and displayed in real-time  
- [ ] Failed uploads can be retried automatically
- [ ] Videos are properly associated with course chapters
- [ ] Upload state persists across page refreshes (where appropriate)
- [ ] Error messages are clear and actionable
- [ ] Performance is acceptable for files up to 500MB
- [ ] Integration works seamlessly with existing course edit workflow

---

**🔥 STATUS: Ready for Implementation** ✅
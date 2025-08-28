# PuzzleReflect Frontend Integration Plan

**Date:** 2025-08-28  
**Purpose:** Complete integration plan for PuzzleReflect functionality in Unpuzzle MVP  
**Status:** Ready for Implementation

---

## 📋 Table of Contents
1. [Current Implementation Status](#current-implementation-status)
2. [Integration Architecture](#integration-architecture)
3. [Implementation Plan](#implementation-plan)
4. [API Documentation](#api-documentation)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Plan](#deployment-plan)

---

## 🚀 Current Implementation Status

### ✅ Completed Components
1. **UI Layer** (`/src/components/student/ai/AIChatSidebarV2.tsx`)
   - Voice recording with duration tracking
   - Screenshot file upload interface
   - Loom URL input field
   - Visual feedback and states

2. **State Management** (`/src/lib/video-agent-system/core/StateMachine.ts`)
   - Reflection flow handlers
   - Message state management
   - Video pause/resume coordination

3. **Service Layer** (`/src/services/reflection-service.ts`)
   - API client wrapper
   - FormData handling for file uploads
   - Error handling with ServiceResult pattern

4. **Learn Page Integration** (`/src/app/student/courses/learn/[id]/page.tsx`)
   - Video context passing
   - Reflection callbacks
   - Video ID management

### 🔄 In Progress
- API endpoint testing with backend
- Error recovery mechanisms
- Reflection list view component

### ⏳ Pending
- Reflection playback functionality
- Analytics dashboard integration
- Batch export feature

---

## 🏗️ Integration Architecture

### Data Flow
```
User Action (UI) → Learn Page → StateMachine → ReflectionService → Backend API
       ↓               ↓             ↓                ↓                 ↓
   Capture Data → Validate → Process → Format Request → Save to DB
```

### Component Responsibilities
| Component | Responsibility |
|-----------|---------------|
| AIChatSidebarV2 | UI interactions, media capture |
| Learn Page | Video context, event handling |
| StateMachine | Flow control, state management |
| ReflectionService | API communication, data formatting |

---

## 📝 Implementation Plan

### Phase 1: Core API Integration (Current)
**Status:** 90% Complete  
**Remaining Tasks:**
1. Fix video ID passing issue ✅
2. Test file upload with backend
3. Handle API error responses

### Phase 2: Reflection Display (Next Week)
**Components to Build:**
1. **ReflectionsList Component**
```typescript
interface ReflectionsListProps {
  videoId: string
  onSeek: (timestamp: number) => void
}

// Features:
// - Display saved reflections
// - Click to seek video
// - Playback voice/view screenshots
// - Delete functionality
```

2. **ReflectionTimeline Component**
```typescript
// Visual timeline showing reflection points
// Integrated with video player progress bar
```

### Phase 3: Advanced Features (2 Weeks)
1. **Reflection Analytics**
   - Total reflections per video
   - Reflection type breakdown
   - Learning progress tracking

2. **Export Functionality**
   - Download all reflections
   - Generate study notes
   - Create summary reports

### Phase 4: Instructor Features (3 Weeks)
1. **Student Reflection View**
   - View student reflections
   - Provide feedback
   - Track engagement

2. **Class Analytics**
   - Aggregate reflection data
   - Identify confusion points
   - Generate insights

---

## 💻 Integration Code Examples

### 1. Complete Reflection Submission Flow
```typescript
// In StateMachine.ts
private async handleReflectionSubmit(payload: { type: string, data: any }) {
  const videoId = payload.data?.videoId
  const courseId = payload.data?.courseId
  const timestamp = this.videoController.getCurrentTime()
  
  // Validate video ID
  if (!videoId) {
    throw new Error('Video ID required for reflection')
  }
  
  // Save to API
  const reflection = await this.saveReflectionToAPI(payload, {
    videoId,
    courseId, 
    timestamp
  })
  
  // Update UI with success
  this.showReflectionSuccess(reflection)
}

private async saveReflectionToAPI(payload, context) {
  const { reflectionService } = await import('@/services/reflection-service')
  
  const data = {
    video_id: context.videoId,
    course_id: context.courseId,
    video_timestamp: context.timestamp,
    reflection_type: payload.type,
    title: `${payload.type} at ${context.timestamp}s`
  }
  
  // Add media based on type
  if (payload.type === 'voice') {
    data.media_file = new File([payload.data.audioBlob], 'voice.wav')
    data.duration = payload.data.duration
  } else if (payload.type === 'screenshot') {
    data.media_file = payload.data.imageFile
  } else if (payload.type === 'loom') {
    data.external_url = payload.data.loomUrl
  }
  
  return await reflectionService.createReflection(data)
}
```

### 2. Load and Display Reflections
```typescript
// In learn page or component
const loadReflections = async () => {
  const result = await reflectionService.getReflectionsByVideo(currentVideo.id)
  
  if (result.data) {
    setReflections(result.data)
    // Add markers to video timeline
    addReflectionMarkers(result.data)
  }
}

// Display in UI
<ReflectionsList 
  reflections={reflections}
  onPlay={(reflection) => {
    if (reflection.media_url) {
      playMedia(reflection.media_url)
    }
  }}
  onSeek={(timestamp) => {
    videoPlayerRef.current?.seekTo(timestamp)
  }}
  onDelete={async (id) => {
    await reflectionService.deleteReflection(id)
    loadReflections()
  }}
/>
```

### 3. Error Handling Pattern
```typescript
const submitReflection = async (type: string, data: any) => {
  try {
    setLoading(true)
    setError(null)
    
    const result = await reflectionService.createReflection({
      video_id: currentVideo.id,
      reflection_type: type,
      ...data
    })
    
    if (result.error) {
      throw new Error(result.error)
    }
    
    showToast('Reflection saved successfully!')
    return result.data
    
  } catch (error) {
    console.error('Reflection error:', error)
    setError(error.message)
    showToast('Failed to save reflection', 'error')
  } finally {
    setLoading(false)
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// reflection-service.test.ts
describe('ReflectionService', () => {
  it('should format FormData correctly for file upload', async () => {
    const file = new File(['test'], 'test.wav')
    const data = {
      video_id: 'test-123',
      reflection_type: 'voice',
      media_file: file
    }
    
    const result = await reflectionService.createReflection(data)
    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/api/v1/reflections/',
      expect.any(FormData)
    )
  })
})
```

### Integration Tests
1. **Complete Flow Test**
   - Start video → Pause → Record voice → Submit → Verify saved
   
2. **File Upload Test**
   - Upload different file types
   - Test size limits
   - Verify CDN URLs

3. **Error Recovery Test**
   - Network failure → Retry → Success
   - Invalid file → Show error → Allow retry

### E2E Test Scenarios
```typescript
// e2e/puzzlereflect.spec.ts
test('Complete reflection flow', async ({ page }) => {
  // Navigate to learn page
  await page.goto('/student/courses/learn/test-course')
  
  // Play video
  await page.click('[data-testid="play-button"]')
  await page.waitForTimeout(3000)
  
  // Open AI assistant
  await page.click('[data-testid="ai-assistant-button"]')
  
  // Choose reflect
  await page.click('[data-testid="reflect-button"]')
  
  // Record voice
  await page.click('[data-testid="voice-option"]')
  await page.click('[data-testid="start-recording"]')
  await page.waitForTimeout(2000)
  await page.click('[data-testid="stop-recording"]')
  
  // Submit
  await page.click('[data-testid="submit-reflection"]')
  
  // Verify success
  await expect(page.locator('[data-testid="reflection-success"]')).toBeVisible()
})
```

---

## 🚀 Deployment Plan

### Pre-Deployment Checklist
- [ ] Backend API endpoints deployed and tested
- [ ] Media storage (S3/CDN) configured
- [ ] Database migrations complete
- [ ] Environment variables set
- [ ] Error tracking (Sentry) configured

### Deployment Steps
1. **Stage 1: Backend**
   ```bash
   # Deploy API
   kubectl apply -f k8s/reflections-api.yaml
   
   # Run migrations
   python manage.py migrate reflections
   
   # Test endpoints
   curl https://api.unpuzzle.com/v1/reflections/health
   ```

2. **Stage 2: Frontend**
   ```bash
   # Build and test
   npm run build
   npm run test:e2e
   
   # Deploy to staging
   npm run deploy:staging
   
   # Smoke test
   npm run test:smoke
   
   # Deploy to production
   npm run deploy:production
   ```

3. **Stage 3: Monitoring**
   - Monitor API response times
   - Track error rates
   - Check file upload success rate
   - Monitor storage usage

### Rollback Plan
```bash
# If issues detected
npm run deploy:rollback
kubectl rollout undo deployment/reflections-api
```

---

## 📊 Success Metrics

### Technical Metrics
- API response time < 500ms
- File upload success rate > 95%
- Error rate < 1%
- Availability > 99.9%

### User Metrics
- Reflections per active user
- Reflection completion rate
- Time to first reflection
- Retention after reflection

### Business Metrics
- User engagement increase
- Learning outcome improvement
- Course completion rate
- User satisfaction score

---

## 🔐 **Authentication**

All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer your-jwt-token-here
```

---

## 📋 **API Endpoints**

### **1. List Reflections**

**Endpoint:** `GET /api/v1/reflections/`  
**Description:** Retrieve a paginated list of user's reflections

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `video_id` | String | Filter by video ID |
| `reflection_type` | String | Filter by type (completion, learning, challenge, summary, other) |
| `search` | String | Search in title, description, and text_content |
| `date_from` | Date | Filter reflections created after this date (YYYY-MM-DD) |
| `date_to` | Date | Filter reflections created before this date (YYYY-MM-DD) |
| `has_media_file` | Boolean | Filter reflections with/without media files |
| `page` | Integer | Page number for pagination |
| `page_size` | Integer | Number of items per page (default: 20) |

**Response (200 OK):**
```json
{
  "count": 15,
  "next": "https://yourdomain.com/api/v1/reflections/?page=2",
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "video_id": "css-flexbox-101",
      "reflection_type": "completion",
      "title": "My CSS Learning Journey",
      "media_url": "https://cdn.yourdomain.com/reflections/video.mp4",
      "media_thumbnail": "https://cdn.yourdomain.com/reflections/thumbnail.jpg",
      "has_media": true,
      "loom_link": null,
      "user_name": "John Doe",
      "created_at": "2025-08-28T10:30:00Z"
    }
  ]
}
```

---

### **2. Create Reflection**

**Endpoint:** `POST /api/v1/reflections/`  
**Description:** Create a new reflection with optional file upload

#### **Option A: JSON Request (with existing MediaFile UUID)**

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "video_id": "string (required)",
  "reflection_type": "completion|learning|challenge|summary|other",
  "title": "string (optional)",
  "description": "string (optional)",
  "media_file": "UUID of existing MediaFile (optional)",
  "loom_link": "URL string (optional)",
  "text_content": "string (optional)",
  "course": "UUID (optional)"
}
```

#### **Option B: Multipart Form Data (with direct file upload)**

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | No | Binary file data (video/audio/document) |
| `video_id` | String | Yes | Video identifier |
| `reflection_type` | String | No | Default: "completion" |
| `title` | String | No | Reflection title |
| `description` | String | No | Reflection description |
| `loom_link` | String | No | Loom video URL |
| `text_content` | String | No | Text reflection content |
| `course` | UUID | No | Associated course ID |

**Validation Rules:**
- At least one of `file`, `media_file`, `loom_link`, or `text_content` must be provided
- File size limits: Video (100MB), Audio (50MB), Image (10MB), Document (10MB)
- Supported file types:
  - Video: mp4, mov, avi, webm
  - Audio: mp3, wav, m4a, ogg
  - Image: jpg, jpeg, png, gif
  - Document: pdf, doc, docx, txt

**cURL Example:**
```bash
curl -X POST https://yourdomain.com/api/v1/reflections/ \
  -H "Authorization: Bearer your-jwt-token" \
  -F "file=@/path/to/video.mp4" \
  -F "video_id=css-flexbox-101" \
  -F "reflection_type=completion" \
  -F "title=My Reflection Title"
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "video_id": "css-flexbox-101",
  "reflection_type": "completion",
  "title": "My Reflection Title",
  "description": "Completed all flexbox puzzles",
  "media_file": "media-file-uuid",
  "media_url": "https://cdn.yourdomain.com/reflections/video.mp4",
  "media_thumbnail": "https://cdn.yourdomain.com/reflections/thumbnail.jpg",
  "has_media": true,
  "loom_link": null,
  "text_content": "Additional notes",
  "course": null,
  "created_at": "2025-08-28T10:30:00Z",
  "updated_at": "2025-08-28T10:30:00Z"
}
```

**Error Responses:**
- **400 Bad Request:** Missing required fields or validation errors
- **401 Unauthorized:** Invalid or missing authentication token
- **413 Payload Too Large:** File size exceeds limit
- **500 Internal Server Error:** File upload or processing failed

---

### **3. Get Reflection Details**

**Endpoint:** `GET /api/v1/reflections/{id}/`  
**Description:** Retrieve detailed information about a specific reflection

**Path Parameters:**
- `id`: UUID of the reflection

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "video_id": "css-flexbox-101",
  "reflection_type": "completion",
  "title": "My CSS Learning Journey",
  "description": "Reflection on completing all flexbox puzzles",
  "media_file": "media-file-uuid",
  "media_file_details": {
    "id": "media-file-uuid",
    "filename": "reflection_video.mp4",
    "file_type": "video",
    "file_size": 15728640,
    "storage_url": "https://storage-url.com/file.mp4",
    "cdn_url": "https://cdn-url.com/file.mp4",
    "thumbnail_url": "https://cdn-url.com/thumbnail.jpg",
    "duration": 180,
    "width": 1920,
    "height": 1080,
    "processing_status": "completed"
  },
  "media_url": "https://cdn-url.com/file.mp4",
  "media_thumbnail": "https://cdn-url.com/thumbnail.jpg",
  "has_media": true,
  "file_type": "video",
  "file_size": 15728640,
  "duration": 180,
  "loom_link": null,
  "text_content": "Detailed reflection text...",
  "course": "course-uuid",
  "course_title": "CSS Mastery Course",
  "user_name": "John Doe",
  "created_at": "2025-08-28T10:30:00Z",
  "updated_at": "2025-08-28T10:30:00Z"
}
```

**Error Responses:**
- **404 Not Found:** Reflection does not exist or user doesn't have access
- **401 Unauthorized:** Invalid or missing authentication token

---

### **4. Update Reflection**

**Endpoint:** `PUT /api/v1/reflections/{id}/`  
**Description:** Completely update a reflection

**Endpoint:** `PATCH /api/v1/reflections/{id}/`  
**Description:** Partially update a reflection

**Path Parameters:**
- `id`: UUID of the reflection

**Request Body (same as create, all fields optional for PATCH):**
```json
{
  "video_id": "string",
  "reflection_type": "completion|learning|challenge|summary|other",
  "title": "string",
  "description": "string",
  "media_file": "UUID",
  "loom_link": "URL string",
  "text_content": "string",
  "course": "UUID"
}
```

**Response (200 OK):**
Returns the updated reflection object (same format as Get Reflection Details)

**Error Responses:**
- **400 Bad Request:** Validation errors
- **404 Not Found:** Reflection does not exist
- **401 Unauthorized:** Invalid or missing authentication token

---

### **5. Delete Reflection**

**Endpoint:** `DELETE /api/v1/reflections/{id}/`  
**Description:** Soft delete a reflection (can be recovered)

**Path Parameters:**
- `id`: UUID of the reflection

**Response (204 No Content):**
No response body on successful deletion

**Error Responses:**
- **404 Not Found:** Reflection does not exist
- **401 Unauthorized:** Invalid or missing authentication token

---

### **6. Get Reflections by Video**

**Endpoint:** `GET /api/v1/reflections/by_video/`  
**Description:** Retrieve all reflections for a specific video

**Query Parameters:**
- `video_id`: String (required) - The video identifier

**Response (200 OK):**
```json
{
  "video_id": "css-flexbox-101",
  "total_reflections": 3,
  "reflections": [
    {
      "id": "reflection-uuid-1",
      "video_id": "css-flexbox-101",
      "reflection_type": "completion",
      "title": "Puzzle Completion",
      "media_url": "https://cdn.yourdomain.com/reflection.mp4",
      "media_thumbnail": "https://cdn.yourdomain.com/thumbnail.jpg",
      "has_media": true,
      "loom_link": null,
      "user_name": "John Doe",
      "created_at": "2025-08-28T10:30:00Z"
    }
  ]
}
```

**Error Responses:**
- **400 Bad Request:** Missing video_id parameter
- **401 Unauthorized:** Invalid or missing authentication token

---

### **7. Get Reflection Summary**

**Endpoint:** `GET /api/v1/reflections/summary/`  
**Description:** Get statistics and summary of user's reflections

**Response (200 OK):**
```json
{
  "total_reflections": 25,
  "by_type": [
    { "reflection_type": "completion", "count": 10 },
    { "reflection_type": "learning", "count": 8 },
    { "reflection_type": "summary", "count": 5 },
    { "reflection_type": "challenge", "count": 2 }
  ],
  "top_videos": [
    { "video_id": "css-flexbox-101", "count": 5 },
    { "video_id": "js-basics-202", "count": 3 }
  ],
  "recent_reflections": [
    {
      "id": "recent-reflection-uuid",
      "video_id": "css-grid-301",
      "reflection_type": "learning",
      "title": "Latest Reflection",
      "media_url": null,
      "media_thumbnail": null,
      "has_media": false,
      "loom_link": "https://loom.com/share/abc123",
      "user_name": "John Doe",
      "created_at": "2025-08-28T15:30:00Z"
    }
  ]
}
```

**Error Responses:**
- **401 Unauthorized:** Invalid or missing authentication token

---

## 🔍 **Common Response Codes**

| Code | Description |
|------|-------------|
| 200 | Success - Request completed successfully |
| 201 | Created - Resource created successfully |
| 204 | No Content - Successful deletion |
| 400 | Bad Request - Invalid request parameters or validation errors |
| 401 | Unauthorized - Authentication required or invalid token |
| 403 | Forbidden - User doesn't have permission |
| 404 | Not Found - Resource doesn't exist |
| 413 | Payload Too Large - File size exceeds limit |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error occurred |

---

## 📝 **Notes for Frontend Developers**

1. **File Upload**: When uploading files, use `multipart/form-data` content type
2. **Pagination**: List endpoints return paginated results with `next` and `previous` URLs
3. **Filtering**: Use query parameters to filter and search reflections
4. **Media URLs**: The `media_url` and `media_thumbnail` fields provide direct CDN links
5. **Soft Delete**: Deleted reflections are not permanently removed and can be recovered
6. **User Isolation**: Each user can only access their own reflections
7. **Required Fields**: Always provide `video_id` and at least one content field
8. **Date Format**: Use ISO 8601 format for dates (YYYY-MM-DDTHH:MM:SSZ)

---

This documentation provides all necessary information for integrating the puzzle reflection API into your frontend application.
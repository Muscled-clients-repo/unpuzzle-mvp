# Zustand & Backblaze Best Practices - Single Source of Truth Architecture

## Date: September 4, 2025

## Executive Summary
This document outlines the proper implementation of Zustand state management with server-side Backblaze operations, ensuring a Single Source of Truth (SSOT) architecture and secure file handling.

## Core Principles

### 1. Single Source of Truth (SSOT)
- **Database is the SSOT**: All data persists in Supabase
- **Zustand is the runtime state**: Reflects database state during user session
- **No duplicate state**: Avoid storing same data in multiple places
- **Optimistic updates**: Update UI immediately, sync with database async

### 2. Security Boundaries
- **Server-side only**: Backblaze credentials NEVER exposed to client
- **API routes**: All Backblaze operations through Next.js API routes
- **Authentication**: All API routes must verify user auth and ownership

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│  Zustand     │────▶│  Supabase   │
│     UI      │◀────│    Store     │◀────│  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                     ▲
       │                    │                     │
       ▼                    ▼                     │
┌─────────────┐     ┌──────────────┐            │
│  API Routes │────▶│  Backblaze   │            │
│  (Server)   │     │   Storage    │────────────┘
└─────────────┘     └──────────────┘  (file_id stored)
```

## Zustand Best Practices

### Store Structure
```typescript
interface CourseCreationSlice {
  // State (mirrors database)
  courseCreation: {
    id: string
    title: string
    chapters: Chapter[]
    videos: Video[]
  } | null
  
  // UI State (temporary, not persisted)
  uploadQueue: VideoUpload[]
  isLoading: boolean
  error: string | null
  
  // Actions (all async, interact with database)
  loadCourseForEdit: (courseId: string) => Promise<void>
  updateCourse: (updates: Partial<Course>) => Promise<void>
  uploadVideo: (file: File, chapterId: string) => Promise<void>
  removeVideo: (videoId: string) => Promise<void>
}
```

### Action Pattern
```typescript
// CORRECT: Zustand action pattern
removeVideo: async (videoId) => {
  // 1. Optimistic UI update
  set(state => ({
    videos: state.videos.filter(v => v.id !== videoId)
  }))
  
  // 2. Database operation (direct Supabase)
  const supabase = createClient()
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId)
  
  if (error) {
    // 3. Revert on failure
    await get().loadCourseForEdit(courseId)
  }
  
  // 4. Server-side operations via API
  await fetch('/api/delete-video-file', {
    method: 'DELETE',
    body: JSON.stringify({ videoId })
  })
}
```

### What NOT to Do
```typescript
// WRONG: Singleton services with auth issues
const videoService = new VideoService() // ❌ No auth context

// WRONG: Server operations in browser
import { backblazeService } from '@/services/backblaze' // ❌ Exposes credentials

// WRONG: Multiple sources of truth
localStorage.setItem('videos', ...) // ❌ Duplicate state
```

## Backblaze Integration

### Upload Flow
```typescript
// 1. Client-side: Prepare upload
const handleUpload = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('courseId', courseId)
  formData.append('chapterId', chapterId)
  
  // 2. API Route: Handle upload
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
}

// 3. API Route (server-side only)
// /api/upload/route.ts
export async function POST(request) {
  // Authenticate user
  const authResult = await authenticateApiRequest(request, 'instructor')
  
  // Verify ownership
  const ownsResource = await verifyResourceOwnership(userId, courseId)
  
  // Upload to Backblaze (server-side)
  const uploadResult = await backblazeService.uploadVideo(file, fileName)
  
  // Store in database with file_id
  const videoData = {
    ...videoInfo,
    backblaze_file_id: uploadResult.fileId,  // Critical for deletion
    video_url: uploadResult.fileUrl
  }
  
  await supabase.from('videos').insert(videoData)
}
```

### Deletion Flow
```typescript
// 1. Zustand Store
removeVideo: async (videoId) => {
  // Optimistic update
  set(state => ({ 
    videos: state.videos.filter(v => v.id !== videoId) 
  }))
  
  // Get file info before deletion
  const { data: video } = await supabase
    .from('videos')
    .select('backblaze_file_id, filename')
    .eq('id', videoId)
    .single()
  
  // Delete from database
  await supabase.from('videos').delete().eq('id', videoId)
  
  // Delete from storage via API
  if (video?.backblaze_file_id) {
    await fetch('/api/delete-video-file', {
      method: 'DELETE',
      body: JSON.stringify({
        fileId: video.backblaze_file_id,
        filename: video.filename
      })
    })
  }
}

// 2. API Route (server-side)
// /api/delete-video-file/route.ts
export async function DELETE(request) {
  const { fileId, filename } = await request.json()
  
  // Delete from Backblaze (server-side only)
  await backblazeService.deleteVideo(fileId, filename)
  
  return NextResponse.json({ success: true })
}
```

## Database Schema Requirements

### Videos Table
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  chapter_id UUID REFERENCES chapters(id),
  title TEXT,
  filename TEXT,
  video_url TEXT,
  backblaze_file_id TEXT, -- Critical: Store for deletion
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Implementation Checklist

### Immediate Fixes Needed
- [x] Store `backblaze_file_id` during upload
- [x] Move Backblaze operations to API routes only
- [ ] Fix upload to use FormData properly
- [ ] Add proper error handling and retry logic
- [ ] Implement progress tracking via WebSocket or SSE

### Current Issues to Fix
1. **Upload not working**: Check FormData handling in API route
2. **Client-side Backblaze imports**: Remove all client-side imports
3. **Missing file IDs**: Ensure all new uploads store file_id

### Proper File Structure
```
/src
  /app
    /api
      /upload/route.ts         # Server-side upload
      /delete-video-file/route.ts  # Server-side deletion
  /stores
    /slices
      /course-creation-slice.ts  # Zustand store (client)
  /services
    /video
      /backblaze-service.ts    # Server-side only
    /supabase
      /video-service.ts        # Can be used both sides
```

## Security Considerations

### API Route Protection
```typescript
export async function POST(request) {
  // 1. Rate limiting
  const rateLimit = checkRateLimit(request)
  if (!rateLimit.allowed) return new Response('Too many requests', { status: 429 })
  
  // 2. Authentication
  const authResult = await authenticateApiRequest(request, 'instructor')
  if (!authResult.success) return new Response('Unauthorized', { status: 401 })
  
  // 3. Resource ownership
  const ownsResource = await verifyResourceOwnership(userId, courseId)
  if (!ownsResource) return new Response('Forbidden', { status: 403 })
  
  // 4. Input validation
  const validationResult = validateUploadRequest(formData)
  if (!validationResult.valid) return new Response('Bad request', { status: 400 })
  
  // Proceed with operation...
}
```

## Testing Strategy

### Test Upload Flow
```bash
# 1. Check database for file_id storage
node check-videos.mjs

# 2. Monitor server logs during upload
npm run dev

# 3. Verify Backblaze storage
# Check Backblaze dashboard or use B2 CLI
```

### Test Deletion Flow
```bash
# 1. Delete video from UI
# 2. Check database is clean
node check-videos.mjs
# 3. Verify Backblaze file removed
# Check Backblaze dashboard
```

## Migration Plan

### Phase 1: Fix Critical Issues (Immediate)
1. Fix upload FormData handling
2. Ensure backblaze_file_id is stored
3. Remove client-side Backblaze imports

### Phase 2: Improve Architecture (This Week)
1. Implement proper progress tracking
2. Add retry logic for failed uploads
3. Implement batch operations

### Phase 3: Optimize (Next Sprint)
1. Implement chunked uploads for large files
2. Add CDN cache invalidation
3. Implement video processing pipeline

## Conclusion

The key to a robust system is maintaining clear boundaries:
- **Zustand**: Manages UI state, mirrors database
- **Supabase**: Single source of truth for all data
- **API Routes**: Only place for server-side operations
- **Backblaze**: Accessed only through secure API routes

Following these practices ensures security, maintainability, and a consistent user experience.
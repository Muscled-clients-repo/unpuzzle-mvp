# Video Upload & Delete Pattern (YouTube/Udemy Style)

## Overview
Professional video platforms like YouTube and Udemy follow a clean architectural pattern where the client works only with entity IDs, while the server handles all storage operations. This pattern ensures security, maintainability, and a clean separation of concerns.

## Architecture Principles

### 1. Client Knows Only IDs
The client should never know about:
- Storage paths or file structures
- Backblaze file IDs or bucket names
- CDN URLs construction logic
- Storage provider details

### 2. Server Owns Storage Logic
All storage operations happen server-side:
- File path generation
- Storage provider interactions
- CDN URL management
- Cleanup operations

## Implementation

### Upload Pattern

#### Client Side (Zustand Store)
```typescript
// course-creation-slice.ts
uploadVideo: async (file: File, courseId: string, chapterId: string) => {
  const videoId = `video-${Date.now()}`
  
  // Add to upload queue with optimistic UI
  set(state => ({
    uploadQueue: [...state.uploadQueue, {
      id: videoId,
      name: file.name,
      status: 'uploading',
      progress: 0
    }]
  }))
  
  // Create form data with just IDs
  const formData = new FormData()
  formData.append('file', file)
  formData.append('courseId', courseId)
  formData.append('chapterId', chapterId)
  formData.append('videoId', videoId)
  
  // Upload via API
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
  
  const result = await response.json()
  
  // Update UI with server response
  set(state => ({
    uploadQueue: state.uploadQueue.map(v =>
      v.id === videoId
        ? { ...v, status: 'complete', url: result.url }
        : v
    )
  }))
}
```

#### Server Side (API Route)
```typescript
// app/api/upload/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const courseId = formData.get('courseId') as string
  const chapterId = formData.get('chapterId') as string
  const videoId = formData.get('videoId') as string
  
  // Server generates storage path
  const fileName = `courses/${courseId}/chapters/${chapterId}/${videoId}_${file.name}`
  
  // Upload to storage (Backblaze B2)
  const uploadResult = await backblazeService.uploadVideo(file, fileName)
  
  // Save to database with all storage details
  await supabase.from('videos').insert({
    id: videoId,
    course_id: courseId,
    chapter_id: chapterId,
    filename: fileName,
    backblaze_file_id: uploadResult.fileId,
    video_url: uploadResult.cdnUrl
  })
  
  // Return only what client needs
  return NextResponse.json({
    success: true,
    url: uploadResult.cdnUrl,
    videoId
  })
}
```

### Delete Pattern

#### Client Side - Clean & Simple
```typescript
// course-creation-slice.ts
removeVideo: async (videoId: string) => {
  // Optimistic UI update
  set(state => ({
    videos: state.videos.filter(v => v.id !== videoId)
  }))
  
  // Simple API call with just the ID
  const response = await fetch(`/api/delete-video/${videoId}`, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    // Handle error, possibly revert UI
    console.error('Delete failed')
  }
}
```

#### Server Side - Handles Everything
```typescript
// app/api/delete-video/[id]/route.ts
export async function DELETE(request: NextRequest, { params }) {
  const videoId = params.id
  
  // 1. Get video details from database (server-side only)
  const { data: video } = await supabase
    .from('videos')
    .select('backblaze_file_id, filename')
    .eq('id', videoId)
    .single()
  
  // 2. Delete from database
  await supabase
    .from('videos')
    .delete()
    .eq('id', videoId)
  
  // 3. Delete from storage (server knows the details)
  if (video?.backblaze_file_id) {
    await backblazeService.deleteVideo(
      video.backblaze_file_id,
      video.filename
    )
  }
  
  return NextResponse.json({
    success: true,
    message: 'Video deleted successfully'
  })
}
```

## Benefits of This Pattern

### 1. Security
- Storage credentials never exposed to client
- File paths and IDs remain server-side
- No risk of client-side manipulation

### 2. Maintainability
- Storage provider can be changed without client updates
- File structure can be reorganized server-side
- Business logic centralized in one place

### 3. Performance
- No page refresh needed
- Optimistic updates provide instant feedback
- Background operations don't block UI

### 4. Scalability
- Easy to add new storage providers
- Can implement complex storage strategies
- Simple to add caching layers

## Data Flow Diagrams

### Upload Flow
```
Client                  Server                  Storage (B2)         Database
  |                       |                         |                   |
  |--POST /api/upload---->|                         |                   |
  |  (file, IDs only)     |                         |                   |
  |                       |--Generate path--------->|                   |
  |                       |--Upload file----------->|                   |
  |                       |<--File ID, URL----------|                   |
  |                       |--Save metadata-------------------------->|
  |<--{url, videoId}------|                         |                   |
  |                       |                         |                   |
```

### Delete Flow
```
Client              Server              Database            Storage (B2)
  |                   |                    |                    |
  |--DELETE /api/---->|                    |                    |
  |  delete-video/123 |                    |                    |
  |                   |--Get video data--->|                    |
  |                   |<--file details-----|                    |
  |                   |--Delete record---->|                    |
  |                   |--Delete file------------------------>|
  |<--{success}-------|                    |                    |
```

## Common Mistakes to Avoid

### ❌ Don't: Client-Side Storage Operations
```typescript
// Bad - Client shouldn't know storage details
const backblaze = new BackblazeClient(API_KEY) // Never!
await backblaze.deleteFile(fileId)
```

### ✅ Do: Server-Side Storage Operations
```typescript
// Good - Client just sends ID
await fetch(`/api/delete-video/${videoId}`, { method: 'DELETE' })
```

### ❌ Don't: Expose Storage Paths
```typescript
// Bad - Exposes internal structure
return { 
  filePath: 'courses/123/chapters/456/video.mp4',
  bucketName: 'my-bucket'
}
```

### ✅ Do: Return Only Necessary Data
```typescript
// Good - Clean response
return { 
  url: 'https://cdn.example.com/video.mp4',
  videoId: '123'
}
```

## Testing Strategy

### 1. Upload Test
```typescript
it('should upload video without refresh', async () => {
  // Upload video
  const file = new File(['content'], 'test.mp4')
  await store.uploadVideo(file, 'course-1', 'chapter-1')
  
  // Check optimistic update
  expect(store.uploadQueue).toHaveLength(1)
  expect(store.uploadQueue[0].status).toBe('uploading')
  
  // Wait for completion
  await waitFor(() => {
    expect(store.uploadQueue[0].status).toBe('complete')
  })
})
```

### 2. Delete Test
```typescript
it('should delete video immediately from UI', async () => {
  // Setup
  store.videos = [{ id: '123', name: 'test.mp4' }]
  
  // Delete
  await store.removeVideo('123')
  
  // Check immediate UI update
  expect(store.videos).toHaveLength(0)
  
  // Verify server call was made
  expect(fetch).toHaveBeenCalledWith(
    '/api/delete-video/123',
    { method: 'DELETE' }
  )
})
```

## Migration Guide

If you're migrating from client-side storage operations:

1. **Create API routes** for all storage operations
2. **Move storage logic** to server-side services
3. **Update client** to use simple API calls
4. **Remove client-side** storage SDKs and credentials
5. **Test thoroughly** with upload/delete cycles

## Conclusion

This pattern creates a clean, secure, and maintainable architecture for video management. By keeping storage details server-side and using optimistic updates client-side, you get the best of both worlds: a responsive UI and secure storage operations. This is how professional platforms handle file management at scale.
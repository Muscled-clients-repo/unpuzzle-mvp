# PuzzleReflect API Integration Guide
*Date: August 28, 2025*  
*Focus: File Upload & API Integration for Audio/Image Reflections*

## 📁 File Upload Requirements

### Supported File Types
| Type | Extensions | Max Size | MIME Types |
|------|------------|----------|------------|
| **Audio** | .wav, .mp3, .m4a, .webm | 50MB | audio/wav, audio/mpeg, audio/mp4, audio/webm |
| **Image** | .jpg, .jpeg, .png, .gif | 10MB | image/jpeg, image/png, image/gif |
| **Video** | .mp4, .mov, .webm | 100MB | video/mp4, video/quicktime, video/webm |

### File Validation
```typescript
const validateFile = (file: File, type: 'audio' | 'image' | 'video'): boolean => {
  const limits = {
    audio: 50 * 1024 * 1024,  // 50MB
    image: 10 * 1024 * 1024,  // 10MB
    video: 100 * 1024 * 1024  // 100MB
  }
  
  const allowedTypes = {
    audio: ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/webm'],
    image: ['image/jpeg', 'image/png', 'image/gif'],
    video: ['video/mp4', 'video/quicktime', 'video/webm']
  }
  
  if (file.size > limits[type]) {
    throw new Error(`File too large. Max size: ${limits[type] / 1024 / 1024}MB`)
  }
  
  if (!allowedTypes[type].includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes[type].join(', ')}`)
  }
  
  return true
}
```

## 🔌 API Integration Implementation

### 1. ReflectionService with File Upload

```typescript
// src/services/reflection-service.ts
import { apiClient } from '@/lib/api-client'
import { ServiceResult } from './types'

export interface ReflectionCreateRequest {
  video_id: string
  course_id?: string
  video_timestamp: number
  reflection_type: 'voice' | 'screenshot' | 'loom'
  title?: string
  notes?: string
  duration?: number
  external_url?: string  // For Loom
  media_file?: File      // For audio/image upload
}

class ReflectionService {
  private readonly baseUrl = '/api/v1/reflections'
  
  /**
   * Create reflection with file upload support
   * Automatically detects if FormData is needed based on media_file presence
   */
  async createReflection(data: ReflectionCreateRequest): Promise<ServiceResult<any>> {
    try {
      let requestData: FormData | any = data
      let headers: any = {}
      
      // Check if we need FormData for file upload
      if (data.media_file instanceof File) {
        // Create FormData for file upload
        const formData = new FormData()
        
        // IMPORTANT: Use 'file' as field name (backend expectation)
        formData.append('file', data.media_file)
        
        // Add all other fields
        formData.append('video_id', data.video_id)
        formData.append('reflection_type', data.reflection_type)
        formData.append('title', data.title || `${data.reflection_type} reflection`)
        formData.append('video_timestamp', data.video_timestamp.toString())
        
        // Add optional fields
        if (data.course_id) formData.append('course_id', data.course_id)
        if (data.notes) formData.append('notes', data.notes)
        if (data.duration) formData.append('duration', data.duration.toString())
        
        requestData = formData
        // Browser will set Content-Type with boundary automatically
      } else {
        // Regular JSON request (for Loom or text-only)
        const { media_file, ...jsonData } = data
        requestData = jsonData
      }
      
      console.log('[ReflectionService] Creating reflection:', {
        type: data.reflection_type,
        hasFile: !!data.media_file,
        videoId: data.video_id
      })
      
      const response = await apiClient.post(`${this.baseUrl}/`, requestData, { headers })
      
      if (response.error) {
        console.error('[ReflectionService] Creation failed:', response.error)
        return { error: response.error }
      }
      
      console.log('[ReflectionService] Reflection created:', response.data)
      return { data: response.data }
      
    } catch (error) {
      console.error('[ReflectionService] Error:', error)
      return { 
        error: error instanceof Error ? error.message : 'Failed to create reflection' 
      }
    }
  }
  
  /**
   * Get reflections for a specific video
   */
  async getReflectionsByVideo(videoId: string): Promise<ServiceResult<any[]>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/by_video/?video_id=${videoId}`)
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: response.data?.reflections || [] }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to get reflections' 
      }
    }
  }
  
  /**
   * Delete a reflection
   */
  async deleteReflection(id: string): Promise<ServiceResult<void>> {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/${id}/`)
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: undefined }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to delete reflection' 
      }
    }
  }
}

export const reflectionService = new ReflectionService()
```

### 2. Voice Recording Integration

```typescript
// Voice recording with audio blob creation
const handleVoiceReflection = async () => {
  // 1. Record audio using MediaRecorder API
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm'
  })
  
  const audioChunks: BlobPart[] = []
  
  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data)
  }
  
  mediaRecorder.onstop = async () => {
    // 2. Create audio blob
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
    
    // 3. Convert to File for upload
    const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
      type: 'audio/webm',
      lastModified: Date.now()
    })
    
    // 4. Validate file
    try {
      validateFile(audioFile, 'audio')
    } catch (error) {
      showError(error.message)
      return
    }
    
    // 5. Submit reflection with file
    const result = await reflectionService.createReflection({
      video_id: currentVideo.id,
      course_id: courseId,
      video_timestamp: videoPlayer.getCurrentTime(),
      reflection_type: 'voice',
      title: 'Voice memo',
      media_file: audioFile,
      duration: recordingDuration,
      notes: userNotes
    })
    
    if (result.data) {
      showSuccess('Voice reflection saved!')
    }
  }
  
  // Start recording
  mediaRecorder.start()
}
```

### 3. Screenshot/Image Upload Integration

```typescript
// Screenshot file upload handling
const handleScreenshotReflection = async (file: File) => {
  // 1. Validate image file
  try {
    validateFile(file, 'image')
  } catch (error) {
    showError(error.message)
    return
  }
  
  // 2. Optional: Compress image if needed
  const compressedFile = await compressImage(file)
  
  // 3. Submit reflection with image
  const result = await reflectionService.createReflection({
    video_id: currentVideo.id,
    course_id: courseId,
    video_timestamp: videoPlayer.getCurrentTime(),
    reflection_type: 'screenshot',
    title: 'Screenshot reflection',
    media_file: compressedFile || file,
    notes: userNotes
  })
  
  if (result.data) {
    showSuccess('Screenshot saved!')
    // Display thumbnail
    displayThumbnail(result.data.media_thumbnail)
  }
}

// Image compression utility
const compressImage = async (file: File): Promise<File> => {
  if (file.size <= 2 * 1024 * 1024) { // If less than 2MB, don't compress
    return file
  }
  
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        // Calculate new dimensions (max 1920px width)
        const maxWidth = 1920
        const scale = Math.min(1, maxWidth / img.width)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob!], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(compressedFile)
        }, 'image/jpeg', 0.85) // 85% quality
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}
```

### 4. Complete StateMachine Integration

```typescript
// In StateMachine.ts - Full integration with API
private async handleReflectionSubmit(payload: { type: string, data: any }) {
  const videoId = payload.data?.videoId
  const courseId = payload.data?.courseId
  const timestamp = this.videoController.getCurrentTime()
  
  // Show loading state
  this.showLoadingMessage('Saving your reflection...')
  
  try {
    // Import service dynamically
    const { reflectionService } = await import('@/services/reflection-service')
    
    // Prepare base data
    const reflectionData: any = {
      video_id: videoId,
      course_id: courseId,
      video_timestamp: timestamp,
      reflection_type: payload.type as 'voice' | 'screenshot' | 'loom',
      notes: payload.data.notes
    }
    
    // Handle type-specific data
    switch (payload.type) {
      case 'voice':
        if (payload.data.audioBlob) {
          // Convert blob to File
          reflectionData.media_file = new File(
            [payload.data.audioBlob], 
            `voice_${Date.now()}.webm`,
            { type: 'audio/webm' }
          )
          reflectionData.duration = payload.data.duration
          reflectionData.title = `Voice memo (${payload.data.duration}s)`
        }
        break
        
      case 'screenshot':
        if (payload.data.imageFile) {
          reflectionData.media_file = payload.data.imageFile
          reflectionData.title = 'Screenshot reflection'
        }
        break
        
      case 'loom':
        reflectionData.external_url = payload.data.loomUrl
        reflectionData.title = 'Loom video reflection'
        break
    }
    
    // Submit to API
    const result = await reflectionService.createReflection(reflectionData)
    
    if (result.error) {
      throw new Error(result.error)
    }
    
    // Success handling
    this.showSuccessMessage(
      `✅ ${payload.type} reflection saved successfully!`
    )
    
    // Store reflection ID for future reference
    this.lastReflectionId = result.data.id
    
    // Resume video after countdown
    this.startVideoCountdown()
    
  } catch (error) {
    console.error('[StateMachine] Reflection submission failed:', error)
    this.showErrorMessage(
      `Failed to save reflection: ${error.message}. Please try again.`
    )
  }
}
```

## 🔍 Error Handling

### Network & Upload Errors
```typescript
const handleReflectionError = (error: any) => {
  const errorMessages = {
    'Network Error': 'Connection failed. Please check your internet.',
    'Request failed with status code 413': 'File too large. Please use a smaller file.',
    'Request failed with status code 401': 'Session expired. Please login again.',
    'Request failed with status code 400': 'Invalid data. Please check your input.',
  }
  
  // Match error message
  for (const [key, message] of Object.entries(errorMessages)) {
    if (error.message?.includes(key)) {
      return message
    }
  }
  
  // Default message
  return 'Something went wrong. Please try again.'
}
```

### Retry Logic
```typescript
const submitWithRetry = async (data: any, maxRetries = 3) => {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await reflectionService.createReflection(data)
      if (result.data) {
        return result
      }
      lastError = new Error(result.error)
    } catch (error) {
      lastError = error as Error
      console.log(`Retry ${i + 1}/${maxRetries} failed:`, error)
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
  
  throw lastError
}
```

## 📊 Progress Tracking

### Upload Progress for Large Files
```typescript
// Track upload progress
const uploadWithProgress = async (file: File, onProgress: (percent: number) => void) => {
  const formData = new FormData()
  formData.append('file', file)
  // ... other fields
  
  const config = {
    onUploadProgress: (progressEvent: any) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      )
      onProgress(percentCompleted)
    }
  }
  
  return await apiClient.post('/api/v1/reflections/', formData, config)
}

// Usage
const [uploadProgress, setUploadProgress] = useState(0)

await uploadWithProgress(audioFile, (percent) => {
  setUploadProgress(percent)
  if (percent === 100) {
    setUploadMessage('Processing...')
  }
})
```

## 🧪 Testing File Uploads

### Mock File Creation for Tests
```typescript
// Create mock files for testing
const createMockFile = (type: 'audio' | 'image', sizeInKB = 100): File => {
  const content = new Uint8Array(sizeInKB * 1024)
  const mimeTypes = {
    audio: 'audio/webm',
    image: 'image/jpeg'
  }
  const extensions = {
    audio: 'webm',
    image: 'jpg'
  }
  
  return new File([content], `test.${extensions[type]}`, {
    type: mimeTypes[type],
    lastModified: Date.now()
  })
}

// Test file upload
describe('Reflection File Upload', () => {
  it('should upload audio file successfully', async () => {
    const mockAudioFile = createMockFile('audio', 500) // 500KB file
    
    const result = await reflectionService.createReflection({
      video_id: 'test-video',
      video_timestamp: 120,
      reflection_type: 'voice',
      media_file: mockAudioFile
    })
    
    expect(result.data).toBeDefined()
    expect(result.data.media_url).toContain('cdn')
  })
  
  it('should reject oversized files', async () => {
    const largeFile = createMockFile('audio', 51000) // 51MB file
    
    expect(() => validateFile(largeFile, 'audio')).toThrow('File too large')
  })
})
```

## 🚀 Production Considerations

### 1. CDN Configuration
```typescript
// Handle CDN URLs in response
interface ReflectionResponse {
  id: string
  media_url?: string      // CDN URL for playback
  media_thumbnail?: string // Thumbnail for images/videos
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
}

// Poll for processing completion
const waitForProcessing = async (reflectionId: string): Promise<void> => {
  const maxAttempts = 30 // 30 seconds timeout
  
  for (let i = 0; i < maxAttempts; i++) {
    const result = await reflectionService.getReflection(reflectionId)
    
    if (result.data?.processing_status === 'completed') {
      return
    }
    
    if (result.data?.processing_status === 'failed') {
      throw new Error('Media processing failed')
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  throw new Error('Processing timeout')
}
```

### 2. Offline Support
```typescript
// Queue reflections for offline upload
const offlineQueue: ReflectionCreateRequest[] = []

const submitReflection = async (data: ReflectionCreateRequest) => {
  if (!navigator.onLine) {
    offlineQueue.push(data)
    localStorage.setItem('reflection_queue', JSON.stringify(offlineQueue))
    showInfo('Reflection saved offline. Will upload when connected.')
    return
  }
  
  // Try to upload
  const result = await reflectionService.createReflection(data)
  
  // Process offline queue if back online
  if (result.data && offlineQueue.length > 0) {
    processOfflineQueue()
  }
  
  return result
}

// Process queued reflections when back online
window.addEventListener('online', processOfflineQueue)
```

### 3. Memory Management
```typescript
// Clean up blob URLs to prevent memory leaks
const cleanup = () => {
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl)
  }
  if (imageUrl) {
    URL.revokeObjectURL(imageUrl)
  }
}

// Use cleanup in useEffect
useEffect(() => {
  return cleanup
}, [])
```

## 📝 API Response Formats

### Success Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "video_id": "video-123",
  "reflection_type": "voice",
  "title": "Voice memo (15s)",
  "media_file": "file-uuid",
  "media_url": "https://cdn.unpuzzle.com/reflections/audio.webm",
  "media_thumbnail": null,
  "duration": 15,
  "video_timestamp": 120,
  "created_at": "2025-08-28T10:30:00Z"
}
```

### Error Response
```json
{
  "error": "File size exceeds maximum allowed size of 50MB",
  "field_errors": {
    "file": ["File too large"]
  }
}
```

## ✅ Integration Checklist

- [ ] File type validation implemented
- [ ] File size validation implemented
- [ ] FormData creation for uploads
- [ ] Progress tracking for large files
- [ ] Error handling for network failures
- [ ] Retry logic for failed uploads
- [ ] Memory cleanup for blob URLs
- [ ] CDN URL handling
- [ ] Offline queue support
- [ ] Unit tests for file uploads
- [ ] Integration tests with backend
- [ ] Performance testing with large files

---
*Last Updated: August 28, 2025*
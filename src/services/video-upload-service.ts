// src/services/video-upload-service.ts
import { apiClient, useMockData } from '@/lib/api-client'

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
    width?: number
    height?: number
    bitrate?: number
    frameRate?: number
  }
  createdAt: string
  updatedAt: string
}

export interface UploadSession {
  sessionKey: string
  uploadUrl?: string  // Optional when using proxy
  fields?: Record<string, string>  // Optional for B2 native
  headers?: Record<string, string>  // Headers for B2 native upload
  b2_native?: boolean  // Flag to indicate B2 native upload
  storageKey: string
  expiresIn?: number  // Optional
  useProxy?: boolean  // Flag to use proxy upload
  use_proxy?: boolean  // Alternative flag name from backend
  proxyUrl?: string  // Proxy endpoint URL
  cdnUrl?: string  // CDN URL for the uploaded file
  method?: string  // HTTP method for upload (PUT, POST, etc.)
  use_signed_url?: boolean  // Flag to indicate signed URL upload
  // Backend field names
  session_id?: string
  upload_id?: string
  upload_url?: string
  storage_url?: string
  cdn_url?: string
  original_session_id?: string
  original_upload_url?: string
}

export interface UploadProgress {
  uploadProgress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'
  etaSeconds?: number
  uploadSpeedMbps?: number
}

export interface ServiceResult<T> {
  data?: T
  error?: string
  mediaInfo?: {
    id: string
    uploadId: string
    cdnUrl: string
    processingStatus: string
  }
}

export interface MediaFilters {
  page?: number
  limit?: number
  type?: 'video' | 'image' | 'document'
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed'
}

export class VideoUploadService {
  private cache = new Map<string, { data: unknown, timestamp: number }>()
  private CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  // Calculate SHA1 hash of file for B2 native upload
  private async calculateSHA1(file: File): Promise<string> {
    console.log('🔐 Calculating SHA1 hash for file:', file.name)
    
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    console.log('✅ SHA1 hash calculated:', hashHex)
    return hashHex
  }

  async initiateUpload(file: File, courseId?: string): Promise<ServiceResult<UploadSession>> {
    console.log('🚀 Initiating video upload:', { filename: file.name, size: file.size, courseId })
    
    // Mock data support
    if (useMockData) {
      console.log('🎭 Using mock data for upload initiation')
      const mockSession: UploadSession = {
        sessionKey: `mock-session-${Date.now()}`,
        uploadUrl: `https://mock-storage.example.com/upload`,
        fields: {
          'key': `videos/mock-user/mock_${file.name}`,
          'Content-Type': file.type,
          'x-amz-algorithm': 'AWS4-HMAC-SHA256'
        },
        storageKey: `videos/mock-user/mock_${file.name}`,
        expiresIn: 3600
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      return { data: mockSession }
    }
    
    const payload = {
      filename: file.name,
      fileSize: file.size,
      contentType: file.type,
      courseId,
      // Add fields that backend might expect
      storage_url: `videos/${courseId || 'default'}/${Date.now()}_${file.name}`,
      use_proxy: true  // Enable proxy upload to avoid CORS issues
    }
    
    console.log('📦 Upload initiation payload:', JSON.stringify(payload, null, 2))
    
    try {
      const response = await apiClient.post<UploadSession>('/api/v1/media/upload/initiate', payload)
      
      console.log('📡 API Response:', response)
      
      if (response.error) {
        console.error('❌ Upload initiation failed:', response.error)
        console.error('Response status:', response.status)
        
        // Check for authentication error
        if (response.status === 401) {
          return { error: 'Please login first to upload videos' }
        }
        
        return { error: response.error }
      }

      if (!response.data) {
        console.error('❌ No data in response')
        return { error: 'Invalid response from server' }
      }

      // Handle nested response structure
      let sessionData = response.data
      
      // Check if the data is nested (backend returns {data: {...}, ok: true} or {data: {...}, success: true})
      if (sessionData && 'data' in sessionData && ('ok' in sessionData || 'success' in sessionData)) {
        console.log('📦 Detected nested response structure with success/ok wrapper')
        sessionData = sessionData.data
      }
      
      // Map backend field names to frontend expectations
      if (sessionData && sessionData.session_id && !sessionData.sessionKey) {
        console.log('🔧 Mapping backend field names to frontend format')
        sessionData = {
          ...sessionData,
          sessionKey: sessionData.session_id,
          uploadUrl: sessionData.upload_url,
          cdnUrl: sessionData.cdn_url,
          storageKey: sessionData.storage_url || `videos/user/${sessionData.session_id}`, // fallback storage key
          // Keep original fields for reference
          original_session_id: sessionData.session_id,
          original_upload_url: sessionData.upload_url
        } as UploadSession
        console.log('🔧 Mapped sessionKey:', sessionData.sessionKey)
        console.log('🔧 Mapped uploadUrl:', sessionData.uploadUrl)
        console.log('🔧 Mapped storageKey:', sessionData.storageKey)
      }
      
      // Auto-detect proxy upload if useProxy flag is present or if we requested it
      if (sessionData && (sessionData.useProxy || sessionData.use_proxy)) {
        console.log('🔄 Backend configured for proxy upload (CORS workaround)')
        sessionData.useProxy = true
        sessionData.proxyUrl = sessionData.proxyUrl || '/api/v1/media/upload/proxy'
        console.log('🌐 Proxy endpoint:', sessionData.proxyUrl)
      }
      // Auto-detect upload method based on the response structure
      else if (sessionData && sessionData.headers && sessionData.method === 'PUT' && sessionData.uploadUrl) {
        console.log('🔄 Auto-detected signed URL upload (PUT method with headers)')
        sessionData.use_signed_url = true
      }
      // Auto-detect B2 native if headers are present but no uploadUrl (direct B2 upload)
      else if (sessionData && sessionData.headers && !sessionData.uploadUrl && !sessionData.b2_native) {
        console.log('🔄 Auto-detected B2 native upload (headers present, no uploadUrl)')
        sessionData.b2_native = true
      }
      
      console.log('✅ Upload session created:', sessionData.sessionKey)
      if (sessionData.uploadUrl) {
        console.log('📌 Upload URL received:', sessionData.uploadUrl)
      }
      if (sessionData.cdnUrl) {
        console.log('🌐 CDN URL:', sessionData.cdnUrl)
      }
      console.log('🔍 Full session data:', JSON.stringify(sessionData, null, 2))
      return { data: sessionData }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate upload'
      console.error('❌ Upload initiation error:', errorMessage)
      return { error: errorMessage }
    }
  }

  async uploadFile(
    session: UploadSession, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<ServiceResult<void>> {
    console.log('📤 Starting file upload to storage:', session.storageKey)
    console.log('📦 Session data:', session)
    
    // Mock data support
    if (useMockData) {
      console.log('🎭 Simulating file upload with progress')
      
      // Simulate upload progress
      return new Promise((resolve) => {
        let progress = 0
        const interval = setInterval(() => {
          progress += Math.random() * 20
          if (progress >= 100) {
            progress = 100
            clearInterval(interval)
            console.log('✅ Mock upload completed')
            if (onProgress) onProgress(progress)
            setTimeout(() => resolve({ data: undefined }), 300)
          } else {
            if (onProgress) onProgress(Math.round(progress))
          }
        }, 200)
      })
    }
    
    // Check if we should use proxy upload
    if (session.useProxy && session.proxyUrl) {
      console.log('🔄 Using proxy upload method')
      return this.uploadFileViaProxy(session, file, onProgress)
    }
    // Check if this is a signed URL upload (PUT method with headers)
    else if (session.use_signed_url && session.uploadUrl && session.method === 'PUT') {
      console.log('🔗 Using signed URL upload method (PUT)')
      return this.uploadFileSignedUrl(session, file, onProgress)
    }
    // Check if this is a B2 native upload
    else if (session.b2_native && session.headers) {
      console.log('🚀 Using B2 native upload method')
      return this.uploadFileB2Native(session, file, onProgress)
    } else {
      console.log('📦 Using S3-style FormData upload method')
      console.log('📍 Upload URL:', session.uploadUrl)
      return this.uploadFileS3Style(session, file, onProgress)
    }
  }

  // Proxy upload method for B2 (avoids CORS issues)
  private async uploadFileViaProxy(
    session: UploadSession,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ServiceResult<void>> {
    return new Promise((resolve) => {
      try {
        console.log('🔒 Uploading via proxy to avoid CORS issues')
        console.log('📍 Proxy URL:', session.proxyUrl)
        console.log('📁 Storage Key:', session.storageKey)
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('storageKey', session.storageKey)
        
        const xhr = new XMLHttpRequest()
        
        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100)
            console.log(`📊 Proxy upload progress: ${progress}%`)
            onProgress(progress)
          }
        }
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('✅ Proxy upload successful')
            try {
              const response = JSON.parse(xhr.responseText)
              console.log('📋 Proxy upload response:', response)
              
              if (response.success || (response.ok && response.data)) {
                console.log('✅ File uploaded successfully via proxy')
                console.log('📁 Media File ID:', response.media_file_id || response.data?.fileId)
                console.log('📁 Upload ID:', response.upload_id)
                console.log('🌐 CDN URL:', response.cdn_url)
                console.log('⚙️ Processing Status:', response.processing_status)
                
                // Store the media file info for later use
                if (response.media_file_id) {
                  // Create a temporary property to pass media info to the complete upload step
                  resolve({ 
                    data: undefined,
                    mediaInfo: {
                      id: response.media_file_id,
                      uploadId: response.upload_id,
                      cdnUrl: response.cdn_url,
                      processingStatus: response.processing_status
                    }
                  })
                } else {
                  resolve({ data: undefined })
                }
              } else {
                console.error('❌ Proxy upload returned error:', response)
                resolve({ error: response.error || response.message || 'Proxy upload failed' })
              }
            } catch (e) {
              console.log('📝 Proxy upload response (non-JSON):', xhr.responseText)
              // If response is not JSON but status is OK, consider it successful
              resolve({ data: undefined })
            }
          } else {
            console.error('❌ Proxy upload failed:', xhr.status, xhr.statusText)
            console.error('Response:', xhr.responseText)
            
            // Check for specific error messages
            if (xhr.status === 401) {
              resolve({ error: 'Authentication required. Please login first.' })
            } else if (xhr.status === 413) {
              resolve({ error: 'File too large. Please upload a smaller file.' })
            } else {
              resolve({ error: `Upload failed with status ${xhr.status}` })
            }
          }
        }
        
        xhr.onerror = () => {
          console.error('❌ Proxy upload network error')
          resolve({ error: 'Network error during upload. Please check your connection.' })
        }
        
        xhr.ontimeout = () => {
          console.error('❌ Proxy upload timeout')
          resolve({ error: 'Upload timeout. The file may be too large or your connection too slow.' })
        }
        
        // Build the full proxy URL
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
        const proxyPath = session.proxyUrl || '/api/v1/media/upload/proxy'
        const fullProxyUrl = proxyPath.startsWith('http') 
          ? proxyPath 
          : `${baseUrl}${proxyPath}`
        
        console.log('🌐 Full proxy URL:', fullProxyUrl)
        
        // Open connection to proxy endpoint
        xhr.open('POST', fullProxyUrl)
        
        // Include credentials for authentication
        xhr.withCredentials = true
        
        // Set timeout (30 minutes for large files)
        xhr.timeout = 30 * 60 * 1000
        
        // Send the form data
        console.log('📤 Sending file via proxy...')
        xhr.send(formData)
        
      } catch (error) {
        console.error('❌ Proxy upload preparation error:', error)
        resolve({ error: error instanceof Error ? error.message : 'Failed to prepare proxy upload' })
      }
    })
  }

  // B2 Native upload with headers and SHA1
  private async uploadFileB2Native(
    session: UploadSession,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ServiceResult<void>> {
    return new Promise(async (resolve) => {
      try {
        // Calculate SHA1 hash
        const sha1Hash = await this.calculateSHA1(file)
        
        // Read file as ArrayBuffer for raw binary upload
        const arrayBuffer = await file.arrayBuffer()
        
        const xhr = new XMLHttpRequest()
        
        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100)
            console.log(`📊 B2 Upload progress: ${progress}%`)
            onProgress(progress)
          }
        }
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('✅ B2 native file upload successful')
            try {
              const response = JSON.parse(xhr.responseText)
              console.log('📋 B2 Upload response:', response)
            } catch (e) {
              console.log('📝 B2 Upload response (non-JSON):', xhr.responseText)
            }
            resolve({ data: undefined })
          } else {
            console.error('❌ B2 upload failed:', xhr.status, xhr.statusText)
            console.error('Response:', xhr.responseText)
            resolve({ error: `B2 upload failed with status ${xhr.status}` })
          }
        }
        
        xhr.onerror = () => {
          console.error('❌ B2 upload network error')
          resolve({ error: 'Network error during B2 upload' })
        }
        
        xhr.ontimeout = () => {
          console.error('❌ B2 upload timeout')
          resolve({ error: 'B2 upload timeout' })
        }
        
        // Open connection
        xhr.open('POST', session.uploadUrl || '')
        
        // Set all headers from the session
        if (session.headers) {
          Object.entries(session.headers).forEach(([key, value]) => {
            // Replace SHA1 placeholder with actual hash
            if (key === 'X-Bz-Content-Sha1') {
              xhr.setRequestHeader(key, sha1Hash)
              console.log(`📝 Set header ${key}: ${sha1Hash}`)
            } else {
              xhr.setRequestHeader(key, value)
              console.log(`📝 Set header ${key}: ${value}`)
            }
          })
        }
        
        // Add Content-Length header
        xhr.setRequestHeader('Content-Length', file.size.toString())
        console.log(`📝 Set header Content-Length: ${file.size}`)
        
        xhr.timeout = 30 * 60 * 1000 // 30 minutes timeout
        
        // Send raw binary data
        console.log('📤 Sending raw binary data to B2...')
        xhr.send(arrayBuffer)
        
      } catch (error) {
        console.error('❌ B2 upload preparation error:', error)
        resolve({ error: error instanceof Error ? error.message : 'Failed to prepare B2 upload' })
      }
    })
  }

  // Signed URL upload method (PUT request with headers)
  private async uploadFileSignedUrl(
    session: UploadSession,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ServiceResult<void>> {
    console.log('🔗 Signed URL upload to:', session.uploadUrl)
    console.log('🔗 Method:', session.method)
    console.log('📝 Headers:', session.headers)
    
    return new Promise((resolve) => {
      try {
        const xhr = new XMLHttpRequest()
        
        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100)
            console.log(`📊 Signed URL Upload progress: ${progress}%`)
            onProgress(progress)
          }
        }
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('✅ Signed URL file upload successful')
            resolve({ data: undefined })
          } else {
            console.error('❌ Signed URL upload failed:', xhr.status, xhr.statusText)
            console.error('Response:', xhr.responseText)
            resolve({ error: `Signed URL upload failed with status ${xhr.status}` })
          }
        }
        
        xhr.onerror = () => {
          console.error('❌ Signed URL upload network error')
          resolve({ error: 'Network error during signed URL upload' })
        }
        
        xhr.ontimeout = () => {
          console.error('❌ Signed URL upload timeout')
          resolve({ error: 'Signed URL upload timeout' })
        }
        
        // Open connection with the specified method (usually PUT)
        xhr.open(session.method || 'PUT', session.uploadUrl || '')
        
        // Set headers from the session
        if (session.headers) {
          Object.entries(session.headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value)
            console.log(`📝 Set header ${key}: ${value}`)
          })
        }
        
        xhr.timeout = 30 * 60 * 1000 // 30 minutes timeout
        
        // Send the raw file data (not FormData for signed URL uploads)
        console.log('📤 Sending raw file data via signed URL...')
        xhr.send(file)
        
      } catch (error) {
        console.error('❌ Signed URL upload preparation error:', error)
        resolve({ error: error instanceof Error ? error.message : 'Failed to prepare signed URL upload' })
      }
    })
  }

  // S3-style FormData upload (original method)
  private uploadFileS3Style(
    session: UploadSession,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ServiceResult<void>> {
    console.log('🎯 S3-style upload to URL:', session.uploadUrl)
    console.log('📝 S3-style fields:', session.fields)
    
    return new Promise((resolve) => {
      const formData = new FormData()
      
      // Add all presigned fields first
      if (session.fields && typeof session.fields === 'object') {
        Object.entries(session.fields).forEach(([key, value]) => {
          formData.append(key, value)
        })
      }
      
      // Add the actual file last
      formData.append('file', file)

      const xhr = new XMLHttpRequest()
      
      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100)
          console.log(`📊 S3 Upload progress: ${progress}%`)
          onProgress(progress)
        }
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('✅ S3-style file upload successful')
          resolve({ data: undefined })
        } else {
          console.error('❌ S3 upload failed:', xhr.status, xhr.statusText)
          resolve({ error: `S3 upload failed with status ${xhr.status}` })
        }
      }
      
      xhr.onerror = () => {
        console.error('❌ S3 upload network error')
        resolve({ error: 'Network error during S3 upload' })
      }
      
      xhr.ontimeout = () => {
        console.error('❌ S3 upload timeout')
        resolve({ error: 'S3 upload timeout' })
      }
      
      xhr.open('POST', session.uploadUrl || '')
      xhr.timeout = 30 * 60 * 1000 // 30 minutes timeout
      xhr.send(formData)
    })
  }

  async completeUpload(sessionKey: string, storageKey: string): Promise<ServiceResult<MediaFile>> {
    console.log('🏁 Completing upload:', { sessionKey, storageKey })
    console.log('🔍 sessionKey type:', typeof sessionKey, 'value:', sessionKey)
    console.log('🔍 storageKey type:', typeof storageKey, 'value:', storageKey)
    
    // Validate inputs
    if (!sessionKey || typeof sessionKey !== 'string') {
      const error = 'Invalid sessionKey: ' + JSON.stringify(sessionKey)
      console.error('❌ ' + error)
      return { error }
    }
    
    if (!storageKey || typeof storageKey !== 'string') {
      const error = 'Invalid storageKey: ' + JSON.stringify(storageKey)
      console.error('❌ ' + error)
      return { error }
    }
    
    // Mock data support
    if (useMockData) {
      console.log('🎭 Creating mock MediaFile')
      const mockMediaFile: MediaFile = {
        id: `media-${Date.now()}`,
        userId: 'mock-user-123',
        filename: storageKey.split('/').pop() || 'video.mp4',
        fileSize: 1024 * 1024 * 50, // 50MB
        contentType: 'video/mp4',
        storageKey,
        cdnUrl: `https://mock-cdn.example.com/${storageKey}`,
        processingStatus: 'completed',
        metadata: {
          duration: 300, // 5 minutes
          resolution: '1920x1080',
          codec: 'H.264',
          width: 1920,
          height: 1080,
          bitrate: 2000,
          frameRate: 30
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      return { data: mockMediaFile }
    }
    
    // Map frontend field names back to backend expectations
    const payload = {
      sessionKey,  // Keep frontend name for now
      storageKey,  // Keep frontend name for now
      session_id: sessionKey, // Add backend expected name
      upload_id: sessionKey   // Also try upload_id in case backend expects it
    }
    
    console.log('📦 Request payload:', JSON.stringify(payload, null, 2))
    console.log('📦 Payload stringified length:', JSON.stringify(payload).length)
    
    try {
      const response = await apiClient.post<MediaFile>('/api/v1/media/upload/complete', payload)
      
      console.log('📡 Complete upload response:', response)
      
      if (response.error) {
        console.error('❌ Upload completion failed:', response.error)
        return { error: response.error }
      }

      console.log('✅ Upload completed successfully:', response.data?.id)
      return { data: response.data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete upload'
      console.error('❌ Upload completion error:', errorMessage)
      return { error: errorMessage }
    }
  }

  async getUploadProgress(sessionKey: string): Promise<ServiceResult<UploadProgress>> {
    console.log('📊 Getting upload progress:', sessionKey)
    
    try {
      const response = await apiClient.get<UploadProgress>(`/api/v1/media/upload/progress/${sessionKey}`)
      
      if (response.error) {
        return { error: response.error }
      }

      return { data: response.data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get upload progress'
      return { error: errorMessage }
    }
  }

  async listUserMedia(filters?: MediaFilters): Promise<ServiceResult<MediaFile[]>> {
    const cacheKey = `user-media-${JSON.stringify(filters || {})}`
    
    // Check cache first
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('💾 Returning cached media list')
      return { data: cached.data }
    }

    console.log('📂 Fetching user media files:', filters)
    
    try {
      const queryParams = filters ? `?${new URLSearchParams(filters as any)}` : ''
      const response = await apiClient.get<MediaFile[]>(`/api/v1/media/user/media${queryParams}`)
      
      if (response.error) {
        return { error: response.error }
      }

      // Cache successful response
      if (response.data) {
        this.cache.set(cacheKey, { data: response.data, timestamp: Date.now() })
      }

      return { data: response.data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch media files'
      return { error: errorMessage }
    }
  }

  async attachMediaToVideo(mediaFileId: string, videoId: string): Promise<ServiceResult<void>> {
    console.log('🔗 Attaching media to video:', { mediaFileId, videoId })
    
    try {
      const response = await apiClient.post<void>(`/api/v1/media/media/${mediaFileId}/attach-video`, { 
        videoId 
      })
      
      if (response.error) {
        console.error('❌ Media attachment failed:', response.error)
        return { error: response.error }
      }

      console.log('✅ Media attached to video successfully')
      
      // Clear cache to force refresh
      this.clearMediaCache()
      
      return { data: undefined }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to attach media to video'
      console.error('❌ Media attachment error:', errorMessage)
      return { error: errorMessage }
    }
  }

  async deleteMediaFile(mediaFileId: string): Promise<ServiceResult<void>> {
    console.log('🗑️ Deleting media file:', mediaFileId)
    
    try {
      const response = await apiClient.delete<void>(`/api/v1/media/media/${mediaFileId}`)
      
      if (response.error) {
        console.error('❌ Media deletion failed:', response.error)
        return { error: response.error }
      }

      console.log('✅ Media file deleted successfully')
      
      // Clear cache to force refresh
      this.clearMediaCache()
      
      return { data: undefined }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete media file'
      console.error('❌ Media deletion error:', errorMessage)
      return { error: errorMessage }
    }
  }

  async processVideoMetadata(mediaFileId: string): Promise<ServiceResult<MediaFile>> {
    console.log('🔄 Processing video metadata:', mediaFileId)
    
    try {
      const response = await apiClient.post<MediaFile>(`/api/v1/media/media/${mediaFileId}/process`)
      
      if (response.error) {
        console.error('❌ Video processing failed:', response.error)
        return { error: response.error }
      }

      console.log('✅ Video metadata processed successfully')
      
      // Clear cache to force refresh
      this.clearMediaCache()
      
      return { data: response.data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process video metadata'
      console.error('❌ Video processing error:', errorMessage)
      return { error: errorMessage }
    }
  }

  // Utility methods
  private clearMediaCache() {
    for (const key of this.cache.keys()) {
      if (key.startsWith('user-media-')) {
        this.cache.delete(key)
      }
    }
  }

  // File validation helpers
  validateVideoFile(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 500 * 1024 * 1024 // 500MB
    const ALLOWED_TYPES = [
      'video/mp4',
      'video/webm',
      'video/avi',
      'video/mov',
      'video/quicktime'
    ]

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Please upload MP4, WebM, AVI, or MOV files.' }
    }

    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'File size too large. Please upload files smaller than 500MB.' }
    }

    return { valid: true }
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format duration for display
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}

export const videoUploadService = new VideoUploadService()
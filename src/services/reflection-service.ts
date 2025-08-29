import { apiClient } from '@/lib/api-client'
import { ServiceResult } from './types'

// Reflection service types
export interface ReflectionCreateRequest {
  video_id: string
  course_id?: string
  video_timestamp: number
  reflection_type: 'voice' | 'screenshot' | 'loom'
  title?: string
  notes?: string
  duration?: number
  loom_link?: string     // For Loom URLs (backend expects this field name)
  text_content?: string  // For text reflections (backend requirement)  
  media_file?: File      // For audio/image upload
}

export interface ReflectionResponse {
  id: string
  user_id: string
  video_id: string
  course_id?: string
  video_timestamp: number
  reflection_type: 'voice' | 'screenshot' | 'loom'
  title?: string
  media_file_id?: string
  media_url?: string
  media_thumbnail?: string
  loom_link?: string     // Backend uses this field name
  text_content?: string  // Backend requires this field
  notes?: string
  duration?: number
  created_at: string
  updated_at: string
  // Populated media file details
  media_file?: {
    id: string
    file_url: string
    file_size: number
    mime_type: string
    original_filename: string
  }
}

export interface ReflectionListResponse {
  count: number
  next?: string
  previous?: string
  results: ReflectionResponse[]
}

export interface ReflectionFilters {
  video_id?: string
  course_id?: string
  reflection_type?: string
  date_from?: string
  date_to?: string
  has_media_file?: boolean
  search?: string
  limit?: number
  offset?: number
}

// File validation utility
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

// Reflection service implementation
class ReflectionService {
  private readonly baseUrl = '/api/v1/reflections'
  
  /**
   * Create a new reflection with file upload support
   * Automatically detects if FormData is needed based on media_file presence
   */
  async createReflection(data: ReflectionCreateRequest): Promise<ServiceResult<ReflectionResponse>> {
    try {
      console.log('[ReflectionService] Creating reflection:', {
        type: data.reflection_type,
        hasFile: !!data.media_file,
        videoId: data.video_id
      })
      
      let requestData: FormData | any = data
      let headers: Record<string, string> = {}
      
      // Validate file if present
      if (data.media_file instanceof File) {
        // Determine file type for validation
        let fileType: 'audio' | 'image' | 'video' = 'image'
        if (data.media_file.type.startsWith('audio/')) {
          fileType = 'audio'
        } else if (data.media_file.type.startsWith('video/')) {
          fileType = 'video'
        }
        
        // Validate the file
        validateFile(data.media_file, fileType)
        
        // Create FormData for file upload
        const formData = new FormData()
        
        // IMPORTANT: Use 'file' as field name (backend expectation)
        formData.append('file', data.media_file)
        
        // Add required fields
        formData.append('video_id', data.video_id)
        formData.append('reflection_type', data.reflection_type)
        
        // Add title (auto-generated if not provided)
        const title = data.title || `${data.reflection_type} reflection at ${data.video_timestamp}s`
        formData.append('title', title)
        
        // Add video timestamp
        formData.append('video_timestamp', data.video_timestamp.toString())
        
        // Add optional fields
        if (data.course_id) formData.append('course_id', data.course_id)
        if (data.course) formData.append('course', data.course)  // Support both course and course_id
        if (data.notes) formData.append('notes', data.notes)
        if (data.duration) formData.append('duration', data.duration.toString())
        if (data.loom_link) formData.append('loom_link', data.loom_link)
        if (data.text_content) formData.append('text_content', data.text_content)
        
        
        // Debug FormData contents
        console.log('[ReflectionService] FormData fields:')
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`- ${key}: [File] ${value.name}`)
          } else {
            console.log(`- ${key}: ${value}`)
          }
        }
        
        requestData = formData
        // Browser will set Content-Type with boundary automatically for FormData
      } else {
        // Regular JSON request (for Loom URLs or text-only reflections)
        const { media_file, ...jsonData } = data
        // Add title if not present
        if (!jsonData.title) {
          jsonData.title = `${jsonData.reflection_type} reflection at ${jsonData.video_timestamp}s`
        }
        requestData = jsonData
      }
      
      // Simple debug log before API request
      console.log('[ReflectionService] Submitting reflection:', data.reflection_type, data.video_id)
      
      const response = await apiClient.post(`${this.baseUrl}/`, requestData, { headers })
      
      if (response.error) {
        console.error('[ReflectionService] Create failed:', response.error)
        return { error: response.error }
      }
      
      console.log('[ReflectionService] Reflection created successfully:', response.data.id)
      return { data: response.data }
    } catch (error) {
      console.error('[ReflectionService] Create error:', error)
      
      // Enhanced error messages
      let errorMessage = 'Failed to create reflection'
      if (error instanceof Error) {
        if (error.message.includes('File too large')) {
          errorMessage = error.message
        } else if (error.message.includes('Invalid file type')) {
          errorMessage = error.message
        } else if (error.message.includes('Network Error')) {
          errorMessage = 'Connection failed. Please check your internet connection.'
        } else {
          errorMessage = error.message
        }
      }
      
      return { error: errorMessage }
    }
  }
  
  /**
   * Get reflections with optional filtering
   */
  async getReflections(filters: ReflectionFilters = {}): Promise<ServiceResult<ReflectionListResponse>> {
    try {
      console.log('[ReflectionService] Getting reflections with filters:', filters)
      
      const queryParams = new URLSearchParams()
      
      // Add filter parameters
      if (filters.video_id) queryParams.append('video_id', filters.video_id)
      if (filters.course_id) queryParams.append('course_id', filters.course_id)
      if (filters.reflection_type) queryParams.append('reflection_type', filters.reflection_type)
      if (filters.date_from) queryParams.append('date_from', filters.date_from)
      if (filters.date_to) queryParams.append('date_to', filters.date_to)
      if (filters.has_media_file !== undefined) queryParams.append('has_media_file', filters.has_media_file.toString())
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.limit) queryParams.append('limit', filters.limit.toString())
      if (filters.offset) queryParams.append('offset', filters.offset.toString())
      
      const url = `${this.baseUrl}/${queryParams.toString() ? '?' + queryParams.toString() : ''}`
      const response = await apiClient.get(url)
      
      if (response.error) {
        console.error('[ReflectionService] Get reflections failed:', response.error)
        return { error: response.error }
      }
      
      console.log('[ReflectionService] Reflections retrieved:', response.data?.count || 0, 'results')
      return { data: response.data }
    } catch (error) {
      console.error('[ReflectionService] Get reflections error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to get reflections' }
    }
  }
  
  /**
   * Get reflections for a specific video
   */
  async getReflectionsByVideo(videoId: string): Promise<ServiceResult<ReflectionResponse[]>> {
    try {
      console.log('[ReflectionService] Getting reflections for video:', videoId)
      
      const response = await apiClient.get(`${this.baseUrl}/by_video/?video_id=${videoId}`)
      
      if (response.error) {
        console.error('[ReflectionService] Get video reflections failed:', response.error)
        return { error: response.error }
      }
      
      // Extract reflections array from response
      const reflections = response.data?.reflections || []
      console.log('[ReflectionService] Video reflections retrieved:', reflections.length)
      return { data: reflections }
    } catch (error) {
      console.error('[ReflectionService] Get video reflections error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to get video reflections' }
    }
  }
  
  /**
   * Get a specific reflection by ID
   */
  async getReflection(reflectionId: string): Promise<ServiceResult<ReflectionResponse>> {
    try {
      console.log('[ReflectionService] Getting reflection:', reflectionId)
      
      const response = await apiClient.get(`${this.baseUrl}/${reflectionId}/`)
      
      if (response.error) {
        console.error('[ReflectionService] Get reflection failed:', response.error)
        return { error: response.error }
      }
      
      console.log('[ReflectionService] Reflection retrieved:', response.data.id)
      return { data: response.data }
    } catch (error) {
      console.error('[ReflectionService] Get reflection error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to get reflection' }
    }
  }
  
  /**
   * Update a reflection
   */
  async updateReflection(reflectionId: string, data: Partial<ReflectionCreateRequest>): Promise<ServiceResult<ReflectionResponse>> {
    try {
      console.log('[ReflectionService] Updating reflection:', reflectionId, data)
      
      const response = await apiClient.patch(`${this.baseUrl}/${reflectionId}/`, data)
      
      if (response.error) {
        console.error('[ReflectionService] Update failed:', response.error)
        return { error: response.error }
      }
      
      console.log('[ReflectionService] Reflection updated:', response.data.id)
      return { data: response.data }
    } catch (error) {
      console.error('[ReflectionService] Update error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to update reflection' }
    }
  }
  
  /**
   * Delete a reflection
   */
  async deleteReflection(reflectionId: string): Promise<ServiceResult<void>> {
    try {
      console.log('[ReflectionService] Deleting reflection:', reflectionId)
      
      const response = await apiClient.delete(`${this.baseUrl}/${reflectionId}/`)
      
      if (response.error) {
        console.error('[ReflectionService] Delete failed:', response.error)
        return { error: response.error }
      }
      
      console.log('[ReflectionService] Reflection deleted:', reflectionId)
      return { data: undefined }
    } catch (error) {
      console.error('[ReflectionService] Delete error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to delete reflection' }
    }
  }
  
  /**
   * Get user's reflection summary/statistics
   */
  async getReflectionSummary(): Promise<ServiceResult<any>> {
    try {
      console.log('[ReflectionService] Getting reflection summary')
      
      const response = await apiClient.get(`${this.baseUrl}/summary/`)
      
      if (response.error) {
        console.error('[ReflectionService] Get summary failed:', response.error)
        return { error: response.error }
      }
      
      console.log('[ReflectionService] Summary retrieved')
      return { data: response.data }
    } catch (error) {
      console.error('[ReflectionService] Get summary error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to get reflection summary' }
    }
  }
  
  /**
   * Submit reflection with retry logic
   */
  async submitWithRetry(data: ReflectionCreateRequest, maxRetries: number = 3): Promise<ServiceResult<ReflectionResponse>> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ReflectionService] Attempt ${attempt}/${maxRetries}`)
        const result = await this.createReflection(data)
        
        if (result.data) {
          return result
        }
        
        lastError = new Error(result.error)
      } catch (error) {
        lastError = error as Error
        console.log(`[ReflectionService] Retry ${attempt}/${maxRetries} failed:`, error)
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }
    
    return { 
      error: lastError?.message || 'Failed after multiple attempts' 
    }
  }
}

// Export singleton instance
export const reflectionService = new ReflectionService()
export default reflectionService
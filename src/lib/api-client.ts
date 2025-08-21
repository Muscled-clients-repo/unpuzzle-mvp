// src/lib/api-client.ts
// Centralized API client with mock data support

export const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || false // Default to real API

interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

class ApiClient {
  private baseUrl: string
  
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
  }
  
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    if (useMockData) {
      // Mock response - will be handled by service layer
      return { status: 200 } as ApiResponse<T>
    }
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        mode: 'cors', // Explicitly set CORS mode
      })
      
      if (!response.ok) {
        const error = await response.text()
        return { error, status: response.status }
      }
      
      const data = await response.json()
      return { data, status: response.status }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Network error', 
        status: 500 
      }
    }
  }
  
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    if (useMockData) {
      // Mock response - will be handled by service layer
      return { status: 200 } as ApiResponse<T>
    }
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        mode: 'cors', // Explicitly set CORS mode
        body: body ? JSON.stringify(body) : undefined,
      })
      
      if (!response.ok) {
        const error = await response.text()
        return { error, status: response.status }
      }
      
      const data = await response.json()
      return { data, status: response.status }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Network error', 
        status: 500 
      }
    }
  }
  
  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    if (useMockData) {
      return { status: 200 } as ApiResponse<T>
    }
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        mode: 'cors', // Explicitly set CORS mode
        body: body ? JSON.stringify(body) : undefined,
      })
      
      if (!response.ok) {
        const error = await response.text()
        return { error, status: response.status }
      }
      
      const data = await response.json()
      return { data, status: response.status }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Network error', 
        status: 500 
      }
    }
  }
  
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    if (useMockData) {
      return { status: 200 } as ApiResponse<T>
    }
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        mode: 'cors', // Explicitly set CORS mode
      })
      
      if (!response.ok) {
        const error = await response.text()
        return { error, status: response.status }
      }
      
      const data = await response.json()
      return { data, status: response.status }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Network error', 
        status: 500 
      }
    }
  }

  // Course Section CRUD Methods
  async getCourseSections(courseId: string) {
    return this.get(`/api/v1/content/courses/${courseId}/sections`)
  }

  async createCourseSection(courseId: string, data: {
    title: string
    description?: string
    order?: number
    isPublished?: boolean
    isPreview?: boolean
  }) {
    return this.post(`/api/v1/content/courses/${courseId}/sections`, data)
  }

  async updateCourseSection(sectionId: string, data: {
    title?: string
    description?: string
    order?: number
    isPublished?: boolean
    isPreview?: boolean
  }) {
    return this.put(`/api/v1/content/sections/${sectionId}`, data)
  }

  async deleteCourseSection(sectionId: string) {
    return this.delete(`/api/v1/content/sections/${sectionId}`)
  }

  // Media File Assignment Methods
  async assignMediaToSection(sectionId: string, data: {
    mediaFileId: string
    title?: string
    description?: string
    order?: number
    isPreview?: boolean
    isPublished?: boolean
  }) {
    return this.post(`/api/v1/content/sections/${sectionId}/media`, data)
  }

  async unassignMediaFromSection(mediaFileId: string) {
    return this.post(`/api/v1/content/media/${mediaFileId}/unassign`)
  }

  async reorderMediaInSection(sectionId: string, mediaOrder: string[]) {
    return this.put(`/api/v1/content/sections/${sectionId}/media/reorder`, {
      mediaOrder
    })
  }

  async getCourseMedia(courseId: string) {
    return this.get(`/api/v1/content/courses/${courseId}/media`)
  }

  // Media Library Methods
  async getUserUnassignedVideos(params?: {
    page?: number
    limit?: number
  }) {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    
    return this.get(`/api/v1/media/user/unassigned-videos?${query}`)
  }

  async getUserMedia(params?: {
    page?: number
    limit?: number
    type?: 'video' | 'audio' | 'document' | 'image'
  }) {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.type) query.append('type', params.type)
    
    return this.get(`/api/v1/media/user/media?${query}`)
  }
}

export const apiClient = new ApiClient()
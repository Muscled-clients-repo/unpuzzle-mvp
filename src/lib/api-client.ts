// src/lib/api-client.ts
// Centralized API client with mock data support

import { handle401Error } from '@/utils/auth-redirect'

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
        // Handle 401 Unauthorized errors
        if (response.status === 401) {
          handle401Error({ status: 401 }, 'Your session has expired. Please login again.')
          // Return error response so UI can handle it gracefully
          return { error: 'Unauthorized', status: 401 }
        }
        
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
    
    // Add debugging for upload completion endpoint
    if (endpoint.includes('/media/upload/complete')) {
      console.log('🌐 API Client - POST to:', endpoint)
      console.log('🌐 API Client - Body type:', typeof body)
      console.log('🌐 API Client - Body value:', body)
      console.log('🌐 API Client - Body stringified:', JSON.stringify(body))
      console.log('🌐 API Client - Body stringified length:', JSON.stringify(body).length)
    }
    
    try {
      const requestBody = body ? JSON.stringify(body) : undefined
      
      // More debugging for the specific endpoint
      if (endpoint.includes('/media/upload/complete')) {
        console.log('🌐 API Client - Final request body:', requestBody)
        console.log('🌐 API Client - Request body length:', requestBody?.length || 0)
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        mode: 'cors', // Explicitly set CORS mode
        body: requestBody,
      })
      
      if (endpoint.includes('/media/upload/complete')) {
        console.log('🌐 API Client - Response status:', response.status)
        console.log('🌐 API Client - Response headers:', Object.fromEntries(response.headers.entries()))
      }
      
      if (!response.ok) {
        // Handle 401 Unauthorized errors
        if (response.status === 401) {
          handle401Error({ status: 401 }, 'Your session has expired. Please login again.')
          // Return error response so UI can handle it gracefully
          return { error: 'Unauthorized', status: 401 }
        }
        
        const error = await response.text()
        
        if (endpoint.includes('/media/upload/complete')) {
          console.log('🌐 API Client - Error response text:', error)
        }
        
        return { error, status: response.status }
      }
      
      const data = await response.json()
      return { data, status: response.status }
    } catch (error) {
      if (endpoint.includes('/media/upload/complete')) {
        console.error('🌐 API Client - Fetch error:', error)
      }
      
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
        // Handle 401 Unauthorized errors
        if (response.status === 401) {
          handle401Error({ status: 401 }, 'Your session has expired. Please login again.')
          // Return error response so UI can handle it gracefully
          return { error: 'Unauthorized', status: 401 }
        }
        
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
        // Handle 401 Unauthorized errors
        if (response.status === 401) {
          handle401Error({ status: 401 }, 'Your session has expired. Please login again.')
          // Return error response so UI can handle it gracefully
          return { error: 'Unauthorized', status: 401 }
        }
        
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

  // Student Course Methods
  async getStudentCourses() {
    return this.get('/api/v1/student/courses')
  }
  
  async enrollInCourse(courseId: string, data?: { 
    paymentMethod?: string
    couponCode?: string 
  }) {
    return this.post(`/api/v1/student/courses/${courseId}/enroll`, data)
  }
  
  async unenrollFromCourse(courseId: string) {
    return this.post(`/api/v1/student/courses/${courseId}/unenroll`)
  }
  
  async getStudentCourseProgress(courseId: string) {
    return this.get(`/api/v1/student/courses/${courseId}/progress`)
  }
  
  async submitCourseReview(courseId: string, review: {
    rating: number
    comment: string
  }) {
    return this.post(`/api/v1/student/courses/${courseId}/review`, review)
  }

  // Public Course Methods (No Auth Required)
  async getPublicCourses(params?: {
    search?: string
    difficulty?: 'all' | 'beginner' | 'intermediate' | 'advanced'
    category?: string
    priceRange?: 'all' | 'free' | 'paid'
    minRating?: number
    instructor?: string
    sortBy?: 'popular' | 'newest' | 'price-asc' | 'price-desc' | 'rating'
    page?: number
    limit?: number
  }) {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          queryParams.append(key, value.toString())
        }
      })
    }
    
    const url = `/api/v1/courses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return this.get(url)
  }

  async getPublicCourseById(courseId: string) {
    return this.get(`/api/v1/courses/${courseId}`)
  }

  async getCourseReviews(courseId: string, params?: {
    page?: number
    limit?: number
  }) {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }
    
    const url = `/api/v1/courses/${courseId}/reviews${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return this.get(url)
  }

  // Authenticated Public Course Methods
  async getRecommendedCourses() {
    return this.get('/api/v1/courses/recommended')
  }
}

export const apiClient = new ApiClient()
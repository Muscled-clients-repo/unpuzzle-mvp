// src/lib/api-client.ts
// Centralized API client with mock data support

import { handle401Error } from '@/utils/auth-redirect'

export const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || false // Default to real API

interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

interface ApiOptions {
  protected?: boolean  // If true, will redirect to login on 401
  headers?: Record<string, string>
}

class ApiClient {
  private baseUrl: string
  
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
  }
  
  async get<T>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    if (useMockData) {
      console.log('🎭 Using mock data for:', endpoint)
      return { status: 200 } as ApiResponse<T>
    }
    
    try {
      console.log('🌐 API GET:', `${this.baseUrl}${endpoint}`)
      
      // Get auth token if available
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      }
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
        credentials: 'include',
        mode: 'cors',
      })
      
      console.log('📡 Response status:', response.status)
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        
        try {
          const errorResponse = await response.text()
          if (errorResponse) {
            errorMessage = errorResponse
          }
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError)
        }
        
        // Handle different error types
        switch (response.status) {
          case 401:
            console.warn('🚫 Unauthorized access - no auth token or expired')
            // Only redirect if this endpoint is explicitly marked as protected
            if (options?.protected) {
              handle401Error({ status: 401 }, 'Authentication required. Please login.')
            }
            return { error: 'Authentication required', status: 401 }
          
          case 403:
            console.warn('🚫 Forbidden - insufficient permissions')
            return { error: 'Access denied. Insufficient permissions.', status: 403 }
          
          case 404:
            console.warn('🔍 Resource not found:', endpoint)
            return { error: 'Resource not found', status: 404 }
          
          case 429:
            console.warn('🚫🚫🚫 NEW CODE: Rate limit exceeded - fixed version running! 🚫🚫🚫')
            try {
              const rateLimitData = JSON.parse(errorMessage)
              return { 
                error: 'rate_limit_exceeded', 
                status: 429,
                data: rateLimitData
              }
            } catch {
              return { error: 'Rate limit exceeded', status: 429 }
            }
          
          case 500:
            console.error('🔥 Server error:', errorMessage)
            return { error: 'Internal server error. Please try again later.', status: 500 }
          
          default:
            console.error('❌ API Error:', errorMessage)
            return { error: errorMessage, status: response.status }
        }
      }
      
      try {
        const data = await response.json()
        console.log('✅ API Success:', endpoint)
        return { data, status: response.status }
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError)
        return { error: 'Invalid response format', status: 500 }
      }
      
    } catch (error) {
      console.error('🌐 Network Error:', error)
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { 
          error: 'Network connection failed. Please check your internet connection.', 
          status: 0 
        }
      }
      
      return { 
        error: error instanceof Error ? error.message : 'Unexpected network error', 
        status: 500 
      }
    }
  }
  
  async post<T>(endpoint: string, body?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
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
      // Handle FormData vs JSON body
      let requestBody: string | FormData | undefined
      const isFormData = body instanceof FormData
      
      if (isFormData) {
        requestBody = body as FormData
      } else {
        requestBody = body ? JSON.stringify(body) : undefined
      }
      
      // More debugging for the specific endpoint
      if (endpoint.includes('/media/upload/complete')) {
        console.log('🌐 API Client - Final request body:', requestBody)
        console.log('🌐 API Client - Request body length:', requestBody?.toString().length || 0)
      }
      
      // Get auth token if available
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
      
      const headers: HeadersInit = {
        'Accept': 'application/json',
        ...options?.headers,
      }
      
      // Only set Content-Type for JSON, let browser set it for FormData
      if (!isFormData) {
        headers['Content-Type'] = 'application/json'
      }
      
      // Add authorization header if token exists (except for login/signup)
      if (token && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        mode: 'cors',
        body: requestBody,
      })
      
      if (endpoint.includes('/media/upload/complete')) {
        console.log('🌐 API Client - Response status:', response.status)
        console.log('🌐 API Client - Response headers:', Object.fromEntries(response.headers.entries()))
      }
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        
        try {
          const errorResponse = await response.text()
          if (errorResponse) {
            errorMessage = errorResponse
          }
          
          if (endpoint.includes('/media/upload/complete')) {
            console.log('🌐 API Client - Error response text:', errorResponse)
          }
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError)
        }
        
        // Handle different error types
        switch (response.status) {
          case 401:
            console.warn('🚫 Unauthorized POST - no auth token or expired')
            // Only redirect if this endpoint is explicitly marked as protected
            if (options?.protected) {
              handle401Error({ status: 401 }, 'Authentication required. Please login.')
            }
            return { error: 'Authentication required', status: 401 }
          
          case 403:
            console.warn('🚫 Forbidden POST - insufficient permissions')
            return { error: 'Access denied. Insufficient permissions.', status: 403 }
          
          case 404:
            console.warn('🔍 POST endpoint not found:', endpoint)
            return { error: 'Endpoint not found', status: 404 }
          
          case 400:
            console.warn('📋 Bad request:', errorMessage)
            return { error: errorMessage || 'Invalid request data', status: 400 }
          
          case 500:
            console.error('🔥 Server error on POST:', errorMessage)
            return { error: 'Internal server error. Please try again later.', status: 500 }
          
          default:
            console.error('❌ POST Error:', errorMessage)
            return { error: errorMessage, status: response.status }
        }
      }
      
      try {
        const data = await response.json()
        console.log('✅ POST Success:', endpoint)
        return { data, status: response.status }
      } catch (parseError) {
        console.error('❌ POST JSON Parse Error:', parseError)
        return { error: 'Invalid response format', status: 500 }
      }
      
    } catch (error) {
      console.error('🌐 POST Network Error:', error)
      
      if (endpoint.includes('/media/upload/complete')) {
        console.error('🌐 API Client - Fetch error:', error)
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { 
          error: 'Network connection failed. Please check your internet connection.', 
          status: 0 
        }
      }
      
      return { 
        error: error instanceof Error ? error.message : 'Unexpected network error', 
        status: 500 
      }
    }
  }
  
  async put<T>(endpoint: string, body?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    if (useMockData) {
      return { status: 200 } as ApiResponse<T>
    }
    
    try {
      // Get auth token if available
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      }
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        mode: 'cors', // Explicitly set CORS mode
        body: body ? JSON.stringify(body) : undefined,
      })
      
      if (!response.ok) {
        // Handle 401 Unauthorized errors
        if (response.status === 401) {
          // Only redirect if this endpoint is explicitly marked as protected
          if (options?.protected) {
            handle401Error({ status: 401 }, 'Your session has expired. Please login again.')
          }
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
  
  async delete<T>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    if (useMockData) {
      return { status: 200 } as ApiResponse<T>
    }
    
    try {
      // Get auth token if available
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      }
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
        mode: 'cors', // Explicitly set CORS mode
      })
      
      if (!response.ok) {
        // Handle 401 Unauthorized errors
        if (response.status === 401) {
          // Only redirect if this endpoint is explicitly marked as protected
          if (options?.protected) {
            handle401Error({ status: 401 }, 'Your session has expired. Please login again.')
          }
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

  // Course Section CRUD Methods (Protected - Instructor only)
  async getCourseSections(courseId: string) {
    return this.get(`/api/v1/content/courses/${courseId}/sections`, { protected: true })
  }

  async createCourseSection(courseId: string, data: {
    title: string
    description?: string
    order?: number
    isPublished?: boolean
    isPreview?: boolean
  }) {
    return this.post(`/api/v1/content/courses/${courseId}/sections`, data, { protected: true })
  }

  async updateCourseSection(sectionId: string, data: {
    title?: string
    description?: string
    order?: number
    isPublished?: boolean
    isPreview?: boolean
  }) {
    return this.put(`/api/v1/content/sections/${sectionId}`, data, { protected: true })
  }

  async deleteCourseSection(sectionId: string) {
    return this.delete(`/api/v1/content/sections/${sectionId}`, { protected: true })
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
    return this.post(`/api/v1/content/sections/${sectionId}/media`, data, { protected: true })
  }

  async unassignMediaFromSection(mediaFileId: string) {
    return this.post(`/api/v1/content/media/${mediaFileId}/unassign`, undefined, { protected: true })
  }

  async reorderMediaInSection(sectionId: string, mediaOrder: string[]) {
    return this.put(`/api/v1/content/sections/${sectionId}/media/reorder`, {
      mediaOrder
    }, { protected: true })
  }

  async getCourseMedia(courseId: string) {
    return this.get(`/api/v1/content/courses/${courseId}/media`, { protected: true })
  }
  
  async getSectionMedia(courseId: string, sectionId: string) {
    return this.get(`/api/v1/content/courses/${courseId}/sections/${sectionId}/media/`, { protected: true })
  }

  // Media Library Methods (Protected - User must be authenticated)
  async getUserUnassignedVideos(params?: {
    page?: number
    limit?: number
  }) {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.limit) query.append('limit', params.limit.toString())
    
    return this.get(`/api/v1/media/user/unassigned-videos?${query}`, { protected: true })
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
    
    return this.get(`/api/v1/media/user/media?${query}`, { protected: true })
  }

  // Student Course Methods (Protected - Student must be authenticated)
  async getStudentCourses() {
    return this.get('/api/v1/student/courses', { protected: true })
  }
  
  async enrollInCourse(courseId: string, data?: { 
    paymentMethod?: string
    couponCode?: string 
  }) {
    return this.post(`/api/v1/student/courses/${courseId}/enroll`, data, { protected: true })
  }
  
  async unenrollFromCourse(courseId: string) {
    return this.post(`/api/v1/student/courses/${courseId}/unenroll`, undefined, { protected: true })
  }
  
  async getStudentCourseProgress(courseId: string) {
    return this.get(`/api/v1/student/courses/${courseId}/progress`, { protected: true })
  }
  
  async submitCourseReview(courseId: string, review: {
    rating: number
    comment: string
  }) {
    return this.post(`/api/v1/student/courses/${courseId}/review`, review, { protected: true })
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

  // Authentication endpoints
  async login(email: string, password: string) {
    const response = await this.post('/api/v1/auth/login', { email, password })
    
    // Store token if login successful
    if (response.data && response.status === 200) {
      const data = response.data as any
      if (data.token) {
        // Store token in localStorage for persistent auth
        localStorage.setItem('authToken', data.token)
        // Also store in sessionStorage for current session
        sessionStorage.setItem('authToken', data.token)
      }
    }
    
    return response
  }

  async logout() {
    // Clear tokens
    localStorage.removeItem('authToken')
    sessionStorage.removeItem('authToken')
    
    // Call logout endpoint if it exists
    try {
      await this.post('/api/v1/auth/logout')
    } catch (error) {
      // Ignore logout API errors - just clear local state
      console.log('Logout API call failed, but local session cleared')
    }
    
    return { success: true }
  }

  async getCurrentUser() {
    // Server uses httpOnly cookies for authentication - no token check needed
    return this.get('/api/v1/auth/profile/')
  }

  async signup(data: {
    firstName: string
    lastName: string
    email: string
    password: string
  }) {
    return this.post('/api/v1/auth/signup', data)
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

  // Authenticated Public Course Methods (Protected - requires login for personalized recommendations)
  async getRecommendedCourses() {
    return this.get('/api/v1/courses/recommended', { protected: true })
  }

}

export const apiClient = new ApiClient()
// src/lib/api-client.ts
// Centralized API client with mock data support

export const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || true // Default to mock for now

interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

class ApiClient {
  private baseUrl: string
  
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
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
        },
        credentials: 'include',
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
  
  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    if (useMockData) {
      // Mock response - will be handled by service layer
      return { status: 200 } as ApiResponse<T>
    }
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
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
  
  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    if (useMockData) {
      return { status: 200 } as ApiResponse<T>
    }
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
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
        },
        credentials: 'include',
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
}

export const apiClient = new ApiClient()
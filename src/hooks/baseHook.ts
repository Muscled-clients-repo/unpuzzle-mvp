import { useCallback } from 'react'

// API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
export const API_VERSION = '/api/v1'

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: {
    message: string
    code?: string
  }
  status?: string
}

// Base hook for API requests
export const useApiRequest = () => {
  // Helper function to make API requests
  const apiRequest = useCallback(async <T = unknown>(
    endpoint: string,
    options: RequestInit = {},
    csrfToken?: string | null
  ): Promise<ApiResponse<T>> => {
    const url = `${API_BASE_URL}${API_VERSION}${endpoint}`
    
    const defaultOptions: RequestInit = {
      credentials: 'include', // Important for cookies
      mode: 'cors', // Explicitly set CORS mode
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        ...options.headers,
      },
      ...options,
    }
    
    try {
      const response = await fetch(url, defaultOptions)
      
      if (!response.ok) {
        let errorData
        const contentType = response.headers.get('content-type')
        
        if (contentType && contentType.includes('application/json')) {
          try {
            errorData = await response.json()
          } catch {
            errorData = { message: 'Failed to parse error response' }
          }
        } else {
          // If not JSON, try to read as text
          try {
            const text = await response.text()
            errorData = { message: text || `HTTP error! status: ${response.status}` }
          } catch {
            errorData = { message: `HTTP error! status: ${response.status}` }
          }
        }
        
        // Include more details in the error
        const errorMessage = errorData.message || errorData.error || errorData.detail || `HTTP error! status: ${response.status}`
        throw new Error(errorMessage)
      }
      
      return response.json() as Promise<ApiResponse<T>>
    } catch (error) {
      // Handle network errors (backend not running, etc.)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(`Cannot connect to backend at ${url}. Please ensure the backend server is running on ${API_BASE_URL}`)
      }
      // Re-throw other errors
      throw error
    }
  }, [])
  
  return { apiRequest }
}
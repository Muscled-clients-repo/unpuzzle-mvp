/**
 * Authentication redirect utility
 * Handles 401 errors and redirects to login/signup
 */

import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

// Check if we're in the browser
const isBrowser = typeof window !== 'undefined'

/**
 * Redirect to login page with return URL
 */
export function redirectToLogin(returnUrl?: string) {
  if (!isBrowser) return
  
  // Don't redirect if we're already on the login page
  if (window.location.pathname === '/login') {
    return
  }
  
  const currentPath = returnUrl || window.location.pathname + window.location.search
  const loginUrl = `/login?returnUrl=${encodeURIComponent(currentPath)}`
  
  // Use window.location for full page redirect to clear any auth state
  window.location.href = loginUrl
}

/**
 * Redirect to signup page with return URL
 */
export function redirectToSignup(returnUrl?: string) {
  if (!isBrowser) return
  
  const currentPath = returnUrl || window.location.pathname + window.location.search
  const signupUrl = `/signup?returnUrl=${encodeURIComponent(currentPath)}`
  
  // Use window.location for full page redirect
  window.location.href = signupUrl
}

/**
 * Handle 401 Unauthorized errors
 * @param error - The error object or response
 * @param customMessage - Optional custom message to show
 */
export function handle401Error(error: { status?: number; response?: { status?: number }; code?: number; message?: string }, customMessage?: string) {
  if (!isBrowser) return
  
  // Check if it's a 401 error
  const is401 = 
    error?.status === 401 || 
    error?.response?.status === 401 ||
    error?.code === 401
  
  if (is401) {
    // Don't handle 401 if we're already on login/signup page
    if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
      return true
    }
    
    // Clear any stored auth tokens
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    sessionStorage.removeItem('token')
    
    // Store the error message for display on login page
    if (customMessage || error?.message) {
      sessionStorage.setItem('authError', customMessage || 'Your session has expired. Please login again.')
    }
    
    // Redirect to login
    redirectToLogin()
    return true
  }
  
  return false
}

/**
 * Check if user is authenticated (basic check)
 */
export function isAuthenticated(): boolean {
  if (!isBrowser) return false
  
  // Check for auth token in localStorage or cookies
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  
  // You can also check cookies if using cookie-based auth
  const hasAuthCookie = document.cookie.includes('auth-token') || 
                        document.cookie.includes('session') ||
                        document.cookie.includes('token')
  
  return !!(token || hasAuthCookie)
}

/**
 * Protected route wrapper
 * Use this to protect pages that require authentication
 */
export function requireAuth(router: AppRouterInstance) {
  if (!isBrowser) return
  
  if (!isAuthenticated()) {
    const returnUrl = window.location.pathname + window.location.search
    router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
    return false
  }
  
  return true
}

/**
 * Clear authentication data
 */
export function clearAuthData() {
  if (!isBrowser) return
  
  // Clear all possible auth storage
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
  
  // Clear auth cookies by setting them to expire
  document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
}

/**
 * Global 401 handler for API responses
 * This can be called from anywhere in the app
 */
export function setupGlobal401Handler() {
  if (!isBrowser) return
  
  // Listen for custom 401 events
  window.addEventListener('unauthorized', () => {
    handle401Error({ status: 401 }, 'Your session has expired. Please login again.')
  })
  
  // Intercept fetch to handle 401s globally (optional)
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    const response = await originalFetch(...args)
    
    if (response.status === 401) {
      // Trigger 401 handling
      window.dispatchEvent(new Event('unauthorized'))
    }
    
    return response
  }
}
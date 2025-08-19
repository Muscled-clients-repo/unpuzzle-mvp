import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/stores/app-store'
import { useApiRequest } from './baseHook'
import { isDevelopment } from '@/config/env'
import { 
  User, 
  UserRole, 
  AuthStatus, 
  LoginCredentials,
  SignupData,
  AuthError,
  AuthUserData,
  AuthResponse,
  CsrfTokenResponse,
  UseAuthReturn
} from '@/types'

/**
 * Custom hook for authentication that adapts to the current Zustand store strategy
 * Provides a clean interface for auth operations while leveraging existing store patterns
 */
export const useAuth = (): UseAuthReturn => {
  const router = useRouter()
  const { apiRequest } = useApiRequest()
  
  // Get auth state from the store
  const { 
    profile: user, 
    setUser, 
    logout: storeLogout
  } = useAppStore()
  
  // Local loading and error state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  
  // Determine auth status
  const status: AuthStatus = user ? 'authenticated' : 'unauthenticated'
  
  // Role helper functions
  const isStudent = user?.role === 'student'
  const isInstructor = user?.role === 'instructor'
  const isModerator = user?.role === 'moderator'
  const isAdmin = user?.role === 'admin'
  
  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.role === role
  }, [user?.role])
  
  // Subscription helpers
  const canUseAI = user?.subscription ? 
    user.subscription.plan !== 'free' && user.subscription.status === 'active' : false
    
  const aiCreditsRemaining = user?.subscription ? 
    user.subscription.aiCredits - user.subscription.aiCreditsUsed : 0
    
  const subscriptionPlan = user?.subscription?.plan || 'free'
  
  // Fetch CSRF token
  const fetchCsrfToken = useCallback(async () => {
    try {
      const response = await apiRequest<CsrfTokenResponse>('/auth/csrf-token', { method: 'GET' }, csrfToken)
      if (response.data?.csrf_token) {
        setCsrfToken(response.data.csrf_token)
        return response.data.csrf_token
      }
    } catch (err) {
      console.error('Failed to fetch CSRF token:', err)
    }
    return null
  }, [apiRequest, csrfToken])
  
  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const loginBody = {
        email: credentials.email,
        password: credentials.password,
      }
      
      console.log('Attempting login:')
      console.log('- Email:', credentials.email)
      console.log('- Password length:', credentials.password.length)
      
      // Make login API call
      const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginBody),
      }, csrfToken)
      
      console.log('Login response:', response)
      
      // Extract user data and CSRF token from response
      if (response.data?.user) {
        const userData = response.data.user
        
        // Map API response to User type
        const user: User = {
          id: userData.id,
          email: userData.email,
          name: userData.user_metadata?.full_name || userData.email.split('@')[0],
          avatar: userData.user_metadata?.avatar_url || '',
          role: (userData.user_metadata?.role || 'student') as UserRole,
          subscription: userData.subscription || {
            id: 'default-sub',
            userId: userData.id,
            plan: 'free' as const,
            status: 'active' as const,
            currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            aiCredits: 5,
            aiCreditsUsed: 0,
            maxCourses: 1,
            features: ['basic-access']
          },
          createdAt: userData.created_at || new Date().toISOString(),
          updatedAt: userData.updated_at || new Date().toISOString(),
        }
        
        setUser(user)
        
        // Store CSRF token if provided
        if (response.data.csrf_token) {
          setCsrfToken(response.data.csrf_token)
        }
        
        // Store remember me preference
        if (credentials.rememberMe) {
          localStorage.setItem('remember_me', 'true')
        } else {
          localStorage.removeItem('remember_me')
        }
        
        return { success: true }
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (err) {
      console.error('Login error:', err)
      
      let errorMessage = 'Login failed'
      let errorCode = 'LOGIN_FAILED'
      
      if (err instanceof Error) {
        // Use the actual error message from backend
        errorMessage = err.message
        
        // Set appropriate error code
        if (err.message.toLowerCase().includes('invalid') || 
            err.message.toLowerCase().includes('credentials')) {
          errorCode = 'INVALID_CREDENTIALS'
        } else if (err.message.includes('Failed to fetch') || 
                   err.message.includes('NetworkError')) {
          errorMessage = 'Cannot connect to server. Please check if the backend is running.'
          errorCode = 'NETWORK_ERROR'
        }
      }
      
      const authError: AuthError = {
        message: errorMessage,
        code: errorCode
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }, [setUser, apiRequest, csrfToken])
  
  // Signup function
  const signup = useCallback(async (data: SignupData) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Prepare the request body
      // Try different formats based on what the backend might expect
      const requestBody = {
        email: data.email,
        password: data.password,
        metadata: {
          full_name: `${data.firstName} ${data.lastName}`.trim(),
          phone: data.phone || ''
        }
      }
      
      // Make signup API call
      const response = await apiRequest<AuthResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }, csrfToken)
      
      console.log('Signup response - Full data:', JSON.stringify(response, null, 2))
      
      // Extract user data from response
      if (response.data?.user) {
        return { success: true }
      } else {
        // Some backends return 201 with minimal data after signup
        // User needs to login separately after successful signup
        console.log('Signup successful but no user data returned')
        return { success: true }
      }
    } catch (err) {
      let errorMessage = 'Signup failed'
      let errorCode = 'SIGNUP_FAILED'
      
      if (err instanceof Error) {
        // Use the actual error message from the backend
        errorMessage = err.message
        
        // Determine error code based on message content
        if (err.message.toLowerCase().includes('password')) {
          errorCode = 'INVALID_PASSWORD'
        } else if (err.message.toLowerCase().includes('email') && err.message.toLowerCase().includes('exists')) {
          errorCode = 'EMAIL_EXISTS'
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Cannot connect to server. Please check if the backend is running on http://localhost:5000'
          errorCode = 'NETWORK_ERROR'
        }
      }
      
      const authError: AuthError = {
        message: errorMessage,
        code: errorCode
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }, [apiRequest, csrfToken])
  
  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Make logout API call
      await apiRequest('/auth/logout', {
        method: 'POST',
      }, csrfToken)
      
      // Clear local storage
      localStorage.removeItem('remember_me')
      
      // Clear CSRF token
      setCsrfToken(null)
      
      // Clear store state
      storeLogout()
      
      // Redirect to home or login
      router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
      // Even if logout fails, clear local state
      storeLogout()
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }, [storeLogout, router, apiRequest, csrfToken])
  
  // Navigation helpers
  const redirectToDashboard = useCallback(() => {
    if (!user) return
    
    switch (user.role) {
      case 'student':
        router.push('/student')
        break
      case 'instructor':
        router.push('/instructor')
        break
      case 'moderator':
        router.push('/moderator')
        break
      case 'admin':
        router.push('/admin')
        break
      default:
        router.push('/')
    }
  }, [user, router])
  
  const redirectToRole = useCallback((role: UserRole) => {
    switch (role) {
      case 'student':
        router.push('/student')
        break
      case 'instructor':
        router.push('/instructor')
        break
      case 'moderator':
        router.push('/moderator')
        break
      case 'admin':
        router.push('/admin')
        break
    }
  }, [router])
  
  // Refresh token function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiRequest<AuthResponse>('/auth/refresh', {
        method: 'POST',
      }, csrfToken)
      
      if (response.data?.user) {
        // Update CSRF token if provided
        if (response.data?.csrf_token) {
          setCsrfToken(response.data.csrf_token)
        }
        return true
      }
      return false
    } catch (err) {
      console.error('Token refresh failed:', err)
      return false
    }
  }, [apiRequest, csrfToken])
  
  // Get user profile function
  const getUserProfile = useCallback(async () => {
    try {
      const response = await apiRequest<AuthUserData>('/user/profile', {
        method: 'GET',
      }, csrfToken)
      
      if (response.data) {
        const userData = response.data
        
        // Map API response to User type
        const user: User = {
          id: userData.id,
          email: userData.email,
          name: userData.user_metadata?.full_name || userData.email.split('@')[0],
          avatar: userData.user_metadata?.avatar_url || '',
          role: (userData.user_metadata?.role || 'student') as UserRole,
          subscription: userData.subscription || {
            id: 'default-sub',
            userId: userData.id,
            plan: 'free' as const,
            status: 'active' as const,
            currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            aiCredits: 5,
            aiCreditsUsed: 0,
            maxCourses: 1,
            features: ['basic-access']
          },
          createdAt: userData.created_at || new Date().toISOString(),
          updatedAt: userData.updated_at || new Date().toISOString(),
        }
        
        setUser(user)
        return user
      }
      return null
    } catch (err) {
      // Don't log 401 or authentication errors - they're expected when not authenticated
      if (err instanceof Error && 
          !err.message.includes('401') && 
          !err.message.toLowerCase().includes('authentication')) {
        console.error('Failed to get user profile:', err)
      }
      // Re-throw the error so the calling code can handle it
      throw err
    }
  }, [setUser, apiRequest, csrfToken])
  
  // Update profile function
  const updateProfile = useCallback(async (data: Partial<User> & { phone?: string; bio?: string; location?: string }) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Ensure we have a CSRF token
      let token = csrfToken
      if (!token) {
        token = await fetchCsrfToken()
      }
      
      const response = await apiRequest<AuthUserData>('/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: data.name,
          phone: data.phone,
          metadata: {
            bio: data.bio,
            location: data.location,
            avatar_url: data.avatar,
          },
        }),
      }, token)
      
      if (response.data) {
        // Update user in store
        const updatedUser = { ...user, ...data } as User
        setUser(updatedUser)
        return { success: true }
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (err) {
      const authError: AuthError = {
        message: err instanceof Error ? err.message : 'Update failed',
        code: 'UPDATE_FAILED'
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }, [user, setUser, csrfToken, fetchCsrfToken, apiRequest])
  
  // Delete account function
  const deleteAccount = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Ensure we have a CSRF token
      let token = csrfToken
      if (!token) {
        token = await fetchCsrfToken()
      }
      
      await apiRequest('/user/profile', {
        method: 'DELETE',
      }, token)
      
      // Clear local storage
      localStorage.removeItem('remember_me')
      
      // Clear CSRF token
      setCsrfToken(null)
      
      // Clear store state
      storeLogout()
      
      // Redirect to home
      router.push('/')
      
      return { success: true }
    } catch (err) {
      const authError: AuthError = {
        message: err instanceof Error ? err.message : 'Delete failed',
        code: 'DELETE_FAILED'
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }, [storeLogout, router, csrfToken, fetchCsrfToken, apiRequest])
  
  // Auto-login on app load by checking session
  useEffect(() => {
    let mounted = true
    
    const initAuth = async () => {
      // Only run if no user is set and component is mounted
      if (!user && mounted) {
        setIsLoading(true)
        
        try {
          // Try to get user profile (will work if cookies are valid)
          const profile = await getUserProfile()
          
          if (profile && mounted) {
            // Fetch CSRF token for future requests
            await fetchCsrfToken()
          }
        } catch (err) {
          // Handle different types of authentication errors
          if (err instanceof Error) {
            const isAuthError = err.message.includes('401') || 
                               err.message.toLowerCase().includes('authentication required') ||
                               err.message.toLowerCase().includes('session expired')
            
            const isNetworkError = err.message.toLowerCase().includes('cannot connect to backend') ||
                                 err.message.toLowerCase().includes('failed to fetch')
            
            if (isDevelopment && isNetworkError) {
              console.info('🔧 Backend server not available - this is normal for development. Authentication will be skipped.')
            } else if (isDevelopment && isAuthError) {
              console.info('🔐 No valid session found - this is normal for development.')
            } else if (!isAuthError && !isNetworkError) {
              console.error('Auto-login failed:', err)
            }
          }
          // For auth errors and network errors, user is simply not logged in - this is normal
        } finally {
          if (mounted) {
            setIsLoading(false)
          }
        }
      }
    }
    
    initAuth()
    
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount
  
  // Set up token refresh interval
  useEffect(() => {
    if (user) {
      // Refresh token every 45 minutes (tokens typically expire in 60 minutes)
      const refreshInterval = setInterval(() => {
        refreshToken()
      }, 45 * 60 * 1000)
      
      return () => clearInterval(refreshInterval)
    }
  }, [user, refreshToken])
  
  return {
    // Auth state
    user,
    status,
    isLoading,
    error,
    csrfToken,
    
    // Auth actions
    login,
    signup,
    logout,
    refreshToken,
    updateProfile,
    deleteAccount,
    
    // Role helpers
    isStudent,
    isInstructor,
    isModerator,
    isAdmin,
    hasRole,
    
    // Subscription helpers
    canUseAI,
    aiCreditsRemaining,
    subscriptionPlan,
    
    // Navigation helpers
    redirectToDashboard,
    redirectToRole
  }
}

// Helper hook for protected routes
export const useRequireAuth = (requiredRole?: UserRole) => {
  const auth = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      router.push('/login')
      return
    }
    
    if (requiredRole && auth.user && !auth.hasRole(requiredRole)) {
      // Redirect to appropriate dashboard if user doesn't have required role
      auth.redirectToDashboard()
      return
    }
  }, [auth.status, auth.user, requiredRole, router, auth])
  
  return auth
}

// Helper hook for guest routes (login/signup pages)
export const useGuestRoute = () => {
  const auth = useAuth()
  
  useEffect(() => {
    if (auth.status === 'authenticated' && auth.user) {
      auth.redirectToDashboard()
    }
  }, [auth])
  
  return auth
}
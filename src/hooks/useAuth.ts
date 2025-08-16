import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/stores/app-store'
import { User, UserRole } from '@/types/domain'

// Auth status types
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

// Login credentials interface
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

// Signup data interface
export interface SignupData {
  firstName: string
  lastName: string
  email: string
  password: string
  agreeToTerms: boolean
}

// Auth error types
export interface AuthError {
  message: string
  code?: string
  field?: string
}

// Auth hook return type
export interface UseAuthReturn {
  // Auth state
  user: User | null
  status: AuthStatus
  isLoading: boolean
  error: AuthError | null
  
  // Auth actions
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: AuthError }>
  signup: (data: SignupData) => Promise<{ success: boolean; error?: AuthError }>
  logout: () => Promise<void>
  
  // Role helpers
  isStudent: boolean
  isInstructor: boolean
  isModerator: boolean
  isAdmin: boolean
  hasRole: (role: UserRole) => boolean
  
  // Subscription helpers
  canUseAI: boolean
  aiCreditsRemaining: number
  subscriptionPlan: string
  
  // Navigation helpers
  redirectToDashboard: () => void
  redirectToRole: (role: UserRole) => void
}

/**
 * Custom hook for authentication that adapts to the current Zustand store strategy
 * Provides a clean interface for auth operations while leveraging existing store patterns
 */
export const useAuth = (): UseAuthReturn => {
  const router = useRouter()
  
  // Get auth state from the store
  const { 
    profile: user, 
    setUser, 
    logout: storeLogout
  } = useAppStore()
  
  // Local loading and error state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  
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
  
  // Mock API simulation - In production, replace with actual API calls
  const simulateApiCall = <T>(
    mockResponse: T, 
    delay: number = 1500,
    shouldFail: boolean = false
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail) {
          reject(new Error('API request failed'))
        } else {
          resolve(mockResponse)
        }
      }, delay)
    })
  }
  
  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Mock authentication - replace with actual API call
      const shouldSucceed = credentials.email === 'student@example.com' && credentials.password === 'password'
      
      if (shouldSucceed) {
        const mockUser: User = await simulateApiCall({
          id: 'user-1',
          email: credentials.email,
          name: credentials.email === 'student@example.com' ? 'John Doe' : 'Jane Smith',
          avatar: '',
          role: credentials.email.includes('instructor') ? 'instructor' as UserRole : 
                credentials.email.includes('moderator') ? 'moderator' as UserRole :
                'student' as UserRole,
          subscription: {
            id: 'sub-1',
            userId: 'user-1',
            plan: 'basic',
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            aiCredits: 100,
            aiCreditsUsed: 25,
            maxCourses: 10,
            features: ['ai-hints', 'progress-tracking', 'certificates']
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        
        setUser(mockUser)
        
        // Store auth token if rememberMe is true (mock implementation)
        if (credentials.rememberMe) {
          localStorage.setItem('auth_token', 'mock_token_' + mockUser.id)
        }
        
        return { success: true }
      } else {
        throw new Error('Invalid credentials')
      }
    } catch {
      const authError: AuthError = {
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }, [setUser])
  
  // Signup function
  const signup = useCallback(async (data: SignupData) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Mock signup validation
      if (data.email === 'taken@example.com') {
        throw new Error('Email already exists')
      }
      
      const mockUser: User = await simulateApiCall({
        id: 'user-' + Date.now(),
        email: data.email,
        name: `${data.firstName} ${data.lastName}`,
        avatar: '',
        role: 'student' as UserRole,
        subscription: {
          id: 'sub-' + Date.now(),
          userId: 'user-' + Date.now(),
          plan: 'free',
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          aiCredits: 5,
          aiCreditsUsed: 0,
          maxCourses: 1,
          features: ['basic-access']
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      setUser(mockUser)
      
      return { success: true }
    } catch (err) {
      const authError: AuthError = {
        message: err instanceof Error ? err.message : 'Signup failed',
        code: 'SIGNUP_FAILED'
      }
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setIsLoading(false)
    }
  }, [setUser])
  
  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Clear auth token
      localStorage.removeItem('auth_token')
      
      // Clear store state
      storeLogout()
      
      // Redirect to home or login
      router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [storeLogout, router])
  
  // Navigation helpers
  const redirectToDashboard = useCallback(() => {
    if (!user) return
    
    switch (user.role) {
      case 'student':
        router.push('/student/dashboard')
        break
      case 'instructor':
        router.push('/instructor/dashboard')
        break
      case 'moderator':
        router.push('/moderator/dashboard')
        break
      case 'admin':
        router.push('/admin/dashboard')
        break
      default:
        router.push('/')
    }
  }, [user, router])
  
  const redirectToRole = useCallback((role: UserRole) => {
    switch (role) {
      case 'student':
        router.push('/student/dashboard')
        break
      case 'instructor':
        router.push('/instructor/dashboard')
        break
      case 'moderator':
        router.push('/moderator/dashboard')
        break
      case 'admin':
        router.push('/admin/dashboard')
        break
    }
  }, [router])
  
  // Auto-login on app load if token exists
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token')
      if (token && !user) {
        setIsLoading(true)
        
        try {
          // Mock token validation - replace with actual API call
          const mockUser: User = await simulateApiCall({
            id: token.replace('mock_token_', ''),
            email: 'student@example.com',
            name: 'John Doe',
            avatar: '',
            role: 'student' as UserRole,
            subscription: {
              id: 'sub-1',
              userId: 'user-1',
              plan: 'basic',
              status: 'active',
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              aiCredits: 100,
              aiCreditsUsed: 25,
              maxCourses: 10,
              features: ['ai-hints', 'progress-tracking', 'certificates']
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, 500)
          
          setUser(mockUser)
        } catch {
          // Token invalid, remove it
          localStorage.removeItem('auth_token')
        } finally {
          setIsLoading(false)
        }
      }
    }
    
    initAuth()
  }, [user, setUser])
  
  return {
    // Auth state
    user,
    status,
    isLoading,
    error,
    
    // Auth actions
    login,
    signup,
    logout,
    
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
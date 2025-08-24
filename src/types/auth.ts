import { 
  User, 
  UserRole,
} from './domain'

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
  phone?: string
  agreeToTerms: boolean
}

// Auth error types
export interface AuthError {
  message: string
  code?: string
  field?: string
}

// Auth API response interfaces
export interface AuthUserData {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
    role?: string
    phone?: string
    bio?: string
    location?: string
  }
  subscription?: {
    id: string
    userId: string
    plan: 'free' | 'basic' | 'pro' | 'team'
    status: 'active' | 'cancelled' | 'expired' | 'trial'
    currentPeriodEnd: string
    aiCredits: number
    aiCreditsUsed: number
    maxCourses: number
    features: string[]
  }
  created_at?: string
  updated_at?: string
}

export interface AuthResponse {
  user?: AuthUserData
  csrf_token?: string
  access_token?: string
}

export interface CsrfTokenResponse {
  csrf_token?: string
}

// Auth hook return type
export interface UseAuthReturn {
  // Auth state
  user: User | null
  status: AuthStatus
  isLoading: boolean
  error: AuthError | null
  csrfToken: string | null
  
  // Auth actions
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: AuthError }>
  signup: (data: SignupData) => Promise<{ success: boolean; error?: AuthError }>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  updateProfile: (data: Partial<User> & { phone?: string; bio?: string; location?: string }) => Promise<{ success: boolean; error?: AuthError }>
  deleteAccount: () => Promise<{ success: boolean; error?: AuthError }>
  
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
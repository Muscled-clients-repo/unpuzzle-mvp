import { StateCreator } from 'zustand'

interface User {
  id: string
  email?: string
  user_metadata?: any
}

interface AuthState {
  user: User | null
  profile: any | null
  loading: boolean
}

interface AuthActions {
  signUp: (email: string, password: string, fullName: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGitHub: () => Promise<void>
  initializeAuth: () => Promise<void>
  fetchProfile: (userId: string) => Promise<any>
  setUser: (user: User | null) => void
  setProfile: (profile: any | null) => void
  setLoading: (loading: boolean) => void
}

export interface AuthSlice extends AuthState, AuthActions {}

// Get initial auth state from localStorage if available
const getInitialAuthState = () => {
  if (typeof window === 'undefined') {
    return { user: null, profile: null, loading: false }
  }
  
  try {
    const storedUser = localStorage.getItem('unpuzzle-user')
    const storedProfile = localStorage.getItem('unpuzzle-profile')
    
    // Always start with loading true on client to verify with server
    return {
      user: storedUser ? JSON.parse(storedUser) : null,
      profile: storedProfile ? JSON.parse(storedProfile) : null,
      loading: true
    }
  } catch {
    return { user: null, profile: null, loading: true }
  }
}

const initialState = getInitialAuthState()

export const createAuthSlice: StateCreator<AuthSlice> = (set, get) => ({
  user: initialState.user,
  profile: initialState.profile,
  loading: initialState.loading,

  setUser: (user: User | null) => {
    set({ user })
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('unpuzzle-user', JSON.stringify(user))
      } else {
        localStorage.removeItem('unpuzzle-user')
      }
    }
  },

  setProfile: (profile: any | null) => {
    set({ profile })
    if (typeof window !== 'undefined') {
      if (profile) {
        localStorage.setItem('unpuzzle-profile', JSON.stringify(profile))
      } else {
        localStorage.removeItem('unpuzzle-profile')
      }
    }
  },

  setLoading: (loading: boolean) => set({ loading }),

  fetchProfile: async (userId: string) => {
    // Profile is now fetched via server-side session API
    // This method is kept for compatibility but delegates to initializeAuth
    await get().initializeAuth()
    return get().profile
  },

  initializeAuth: async () => {
    if (typeof window === 'undefined') {
      // On server, immediately set loading to false
      set({ loading: false })
      return
    }

    try {
      // Get session from server-side auth API instead of client-side Supabase
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      
      if (data.user) {
        get().setUser(data.user)
        get().setProfile(data.profile)
      } else {
        // No authenticated user
        get().setUser(null)
        get().setProfile(null)
      }
    } catch (error) {
      console.error('[AUTH] Failed to fetch session from server:', error)
      // Clear state on error
      get().setUser(null)
      get().setProfile(null)
    } finally {
      set({ loading: false })
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    // TODO: Implement server-side signup
    throw new Error('Signup not yet implemented with server-side auth')
  },

  signIn: async (email: string, password: string) => {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to sign in')
    }
    
    // Set user and profile in store
    if (data.user) {
      get().setUser(data.user)
      get().setProfile(data.profile)
    }
    
    // Redirect based on user role
    const redirectPath = data.profile?.role === 'instructor' ? '/instructor' : '/student'
    window.location.href = redirectPath
  },

  signOut: async () => {
    try {
      const response = await fetch('/api/auth/signout', { method: 'POST' })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign out')
      }
      
      // Clear local state and storage
      get().setUser(null)
      get().setProfile(null)
      
      // Redirect to login
      window.location.href = '/login'
    } catch (error) {
      console.error('[AUTH] Sign out error:', error)
      throw error
    }
  },

  signInWithGoogle: async () => {
    // TODO: Implement server-side OAuth
    window.location.href = '/api/auth/google'
  },

  signInWithGitHub: async () => {
    // TODO: Implement server-side OAuth
    window.location.href = '/api/auth/github'
  },
})
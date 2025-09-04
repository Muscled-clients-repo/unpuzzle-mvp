import { StateCreator } from 'zustand'

interface User {
  id: string
  email?: string
  user_metadata?: any
}

interface AuthState {
  user: User | null
  profile: any | null
  authLoading: boolean
  authError: string | null
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
  setAuthLoading: (loading: boolean) => void
  setAuthError: (error: string | null) => void
}

export interface AuthSlice extends AuthState, AuthActions {}

// Server-side first approach - no localStorage persistence
// Start with clean state and let server-side auth hydrate
const initialState = {
  user: null,
  profile: null,
  authLoading: true, // Always start loading to fetch from server
  authError: null
}

export const createAuthSlice: StateCreator<AuthSlice> = (set, get) => ({
  user: initialState.user,
  profile: initialState.profile,
  authLoading: initialState.authLoading,
  authError: initialState.authError,

  setUser: (user: User | null) => {
    set({ user })
    // No localStorage persistence - server-side state is the source of truth
  },

  setProfile: (profile: any | null) => {
    set({ profile })
    // No localStorage persistence - server-side state is the source of truth
  },

  setAuthLoading: (authLoading: boolean) => set({ authLoading }),

  setAuthError: (authError: string | null) => set({ authError }),

  fetchProfile: async (userId: string) => {
    // Profile is now fetched via server-side session API
    // This method is kept for compatibility but delegates to initializeAuth
    await get().initializeAuth()
    return get().profile
  },

  initializeAuth: async () => {
    if (typeof window === 'undefined') {
      // On server, immediately set loading to false
      set({ authLoading: false, authError: null })
      return
    }

    // Clear any previous errors and ensure loading state
    set({ authLoading: true, authError: null })

    try {
      // Get session from server-side auth API instead of client-side Supabase
      const response = await fetch('/api/auth/session')
      
      if (!response.ok) {
        throw new Error(`Session fetch failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.user) {
        get().setUser(data.user)
        get().setProfile(data.profile)
      } else {
        // No authenticated user - this is normal, not an error
        get().setUser(null)
        get().setProfile(null)
      }
      
      // Clear any previous errors on successful auth check
      set({ authError: null })
    } catch (error) {
      console.error('[AUTH] Failed to fetch session from server:', error)
      
      // Set error state but don't clear user/profile immediately
      // This allows the UI to show error while maintaining any existing state
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      set({ authError: errorMessage })
      
      // Only clear user state if we can't reach the server at all
      if (error instanceof TypeError && error.message.includes('fetch')) {
        get().setUser(null)
        get().setProfile(null)
      }
    } finally {
      set({ authLoading: false })
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
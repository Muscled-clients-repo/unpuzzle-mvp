import { StateCreator } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

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

const supabase = createClient()

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
    if (typeof window === 'undefined') return null

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        get().setProfile(data)
        return data
      } else if (error) {
        console.error('Error fetching profile:', error)
        get().setProfile(null)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      get().setProfile(null)
    }
    return null
  },

  initializeAuth: async () => {
    if (typeof window === 'undefined') {
      // On server, immediately set loading to false
      set({ loading: false })
      return
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      get().setUser(session?.user ?? null)
      
      if (session?.user) {
        await get().fetchProfile(session.user.id)
      } else {
        // Clear profile if no user - this handles expired sessions
        get().setProfile(null)
        get().setUser(null)
      }
    } catch (error) {
      console.error('Error getting session:', error)
    } finally {
      set({ loading: false })
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    
    if (error) throw error
    
    // If signup successful and user is confirmed, sign them in
    if (data?.user && !data.session) {
      // User needs to confirm email
      return { needsEmailConfirmation: true }
    }
    
    // If we have a session, they're already signed in
    if (data?.session) {
      get().setUser(data.session.user)
    }
    
    return { needsEmailConfirmation: false }
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // Clear local state and storage
    get().setUser(null)
    get().setProfile(null)
    
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (error) throw error
  },

  signInWithGitHub: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (error) throw error
  },
})
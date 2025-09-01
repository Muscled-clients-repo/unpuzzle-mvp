import { apiClient } from '@/lib/api-client'

export interface OAuthProvider {
  id: string
  name: string
  enabled: boolean
  icon: string
}

export interface SignUpRequest {
  email: string
  password: string
  full_name: string
  metadata?: {
    source?: string
    referral_code?: string
  }
}

export interface SignInRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    full_name: string
    created_at: string
    roles?: string[]
    subscription?: {
      plan: string
      ai_limit: number
      ai_used: number
    }
  }
  access_token: string
  refresh_token: string
  expires_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  bio?: string
  roles: string[]
  subscription: {
    plan: string
    ai_limit: number
    ai_used: number
    valid_until?: string
  }
  created_at: string
  updated_at: string
}

export interface ProfileUpdateData {
  full_name?: string
  bio?: string
  avatar_url?: string
  preferences?: {
    email_notifications?: boolean
    learning_reminders?: boolean
  }
}

export interface OAuthResponse {
  success: boolean
  url: string
  provider: string
  action?: 'signin' | 'link'
}

export interface OAuthCallbackResponse {
  success: boolean
  user: {
    supabase_user_id: string
    email: string
    username: string
    full_name: string
    display_name: string
    avatar_url: string
    bio: string | null
    status: string
    phone_number: string | null
    timezone: string
    language: string
    last_login: string
    email_verified: boolean
    created_at: string
    updated_at: string
    roles: string[]
  }
  session: {
    access_token: string
    refresh_token: string
    expires_in: number
    expires_at: number
    token_type: string
  }
}

export interface Identity {
  id: string
  provider: string
  created_at: string
  updated_at: string
  email: string
  identity_data: {
    email: string
    name: string
    avatar_url: string
    provider_id: string
  }
}

class OAuthService {
  private baseUrl = '/api/v1/auth/oauth'
  private authBaseUrl = '/api/v1/auth'

  // Email/Password Authentication
  async signUp(signUpData: SignUpRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(`${this.authBaseUrl}/signup/`, signUpData)
      
      const data = response.data as any
      if (!data?.user || !data?.access_token) {
        throw new Error('Invalid signup response')
      }
      
      // Store tokens
      this.storeTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at
      })
      
      return data as AuthResponse
    } catch (error: any) {
      console.error('Signup failed:', error)
      throw new Error(error.response?.data?.error || 'Signup failed. Please try again.')
    }
  }

  async signIn(signInData: SignInRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(`${this.authBaseUrl}/signin/`, signInData)
      
      const data = response.data as any
      if (!data?.user || !data?.access_token) {
        throw new Error('Invalid signin response')
      }
      
      // Store tokens
      this.storeTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at
      })
      
      return data as AuthResponse
    } catch (error: any) {
      console.error('Signin failed:', error)
      throw new Error(error.response?.data?.error || 'Invalid email or password.')
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(`${this.authBaseUrl}/refresh/`, {
        refresh_token: refreshToken
      })
      
      const data = response.data as any
      if (!data?.access_token) {
        throw new Error('Invalid refresh response')
      }
      
      // Store new tokens
      this.storeTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at
      })
      
      return data as AuthResponse
    } catch (error: any) {
      console.error('Token refresh failed:', error)
      throw new Error(error.response?.data?.error || 'Session expired. Please sign in again.')
    }
  }

  async getUserProfile(): Promise<UserProfile> {
    try {
      const response = await apiClient.get(`${this.authBaseUrl}/profile/`)
      
      const data = response.data as any
      if (!data?.id) {
        throw new Error('Invalid profile response')
      }
      
      return data as UserProfile
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error)
      throw new Error(error.response?.data?.error || 'Failed to load profile.')
    }
  }

  async updateUserProfile(profileData: ProfileUpdateData): Promise<UserProfile> {
    try {
      const response = await apiClient.put(`${this.authBaseUrl}/profile/update/`, profileData)
      
      const data = response.data as any
      if (!data?.profile) {
        throw new Error('Invalid profile update response')
      }
      
      return data.profile as UserProfile
    } catch (error: any) {
      console.error('Failed to update user profile:', error)
      throw new Error(error.response?.data?.error || 'Failed to update profile.')
    }
  }

  // OAuth Methods
  async getProviders(): Promise<OAuthProvider[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/providers/`)
      return (response.data as any)?.providers || []
    } catch (error) {
      console.error('Failed to fetch OAuth providers:', error)
      return []
    }
  }

  async initiateSignIn(provider: string, redirectUrl?: string): Promise<OAuthResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/signin/`, {
        provider,
        redirect_url: redirectUrl || `${window.location.origin}/auth/callback`
      })
      
      const data = response.data as any
      if (!data?.success || !data?.url) {
        throw new Error(`Failed to initiate OAuth sign-in with ${provider}`)
      }
      
      return data as OAuthResponse
    } catch (error: any) {
      console.error('OAuth sign-in initiation failed:', error)
      throw new Error(error.response?.data?.error || `Failed to sign in with ${provider}`)
    }
  }

  async handleCallback(code: string, state?: string): Promise<OAuthCallbackResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/callback/`, {
        code,
        state
      })
      
      const data = response.data as any
      if (!data?.success) {
        throw new Error('OAuth callback failed')
      }
      
      // Store tokens if provided
      if (data.session?.access_token) {
        this.storeTokens(data.session)
      }
      
      return data as OAuthCallbackResponse
    } catch (error: any) {
      console.error('OAuth callback failed:', error)
      throw new Error(error.response?.data?.error || 'Authentication failed. Please try again.')
    }
  }

  async getLinkedIdentities(): Promise<Identity[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/identities/`)
      return (response.data as any)?.identities || []
    } catch (error) {
      console.error('Failed to fetch linked identities:', error)
      return []
    }
  }

  async linkIdentity(provider: string, redirectUrl?: string): Promise<OAuthResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/identities/link/`, {
        provider,
        redirect_url: redirectUrl || `${window.location.origin}/settings/linked-accounts`
      })
      
      const data = response.data as any
      if (!data?.success || !data?.url) {
        throw new Error(`Failed to link ${provider} account`)
      }
      
      return data as OAuthResponse
    } catch (error: any) {
      console.error('Failed to link identity:', error)
      throw new Error(error.response?.data?.error || `Failed to link ${provider} account`)
    }
  }

  async unlinkIdentity(identityId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/identities/${identityId}/unlink/`)
    } catch (error: any) {
      console.error('Failed to unlink identity:', error)
      throw new Error(error.response?.data?.error || 'Failed to unlink account')
    }
  }

  private storeTokens(session: any): void {
    // Store tokens in localStorage for persistence
    if (session.access_token) {
      localStorage.setItem('access_token', session.access_token)
    }
    if (session.refresh_token) {
      localStorage.setItem('refresh_token', session.refresh_token)
    }
    if (session.expires_at) {
      localStorage.setItem('token_expires_at', session.expires_at.toString())
    }
  }

  generateState(): string {
    // Generate a random state parameter for CSRF protection
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    sessionStorage.setItem('oauth_state', state)
    return state
  }

  validateState(state: string): boolean {
    const savedState = sessionStorage.getItem('oauth_state')
    sessionStorage.removeItem('oauth_state')
    return state === savedState
  }

  clearOAuthSession(): void {
    sessionStorage.removeItem('oauth_state')
    sessionStorage.removeItem('oauth_provider')
    sessionStorage.removeItem('oauth_return_url')
  }
}

export const oauthService = new OAuthService()
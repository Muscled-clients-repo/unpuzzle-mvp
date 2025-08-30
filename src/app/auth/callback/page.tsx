'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppStore } from '@/stores/app-store'
import { oauthService } from '@/services/oauth.service'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/types/domain'

function OAuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser } = useAppStore()
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for OAuth error
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        if (errorParam) {
          const errorMessage = errorDescription || 'Authentication was cancelled or failed'
          setError(errorMessage)
          setProcessing(false)
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login')
          }, 3000)
          return
        }

        // Get authorization code
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        
        if (!code) {
          setError('No authorization code received. Please try signing in again.')
          setProcessing(false)
          
          setTimeout(() => {
            router.push('/login')
          }, 3000)
          return
        }

        // Validate state parameter if present
        if (state && !oauthService.validateState(state)) {
          setError('Security validation failed. Please try signing in again.')
          setProcessing(false)
          
          setTimeout(() => {
            router.push('/login')
          }, 3000)
          return
        }

        // Exchange code for tokens
        const response = await oauthService.handleCallback(code, state)
        
        if (response.success && response.user) {
          // Transform OAuth user data to match app's User type structure
          const userData: any = {
            id: response.user.supabase_user_id,
            name: response.user.full_name || response.user.display_name || response.user.username || 'User',
            email: response.user.email,
            role: (response.user.roles?.[0] || 'student') as UserRole,
            avatar: response.user.avatar_url || `https://api.dicebear.com/7.x/avataaars/png?seed=${response.user.email}`,
            createdAt: response.user.created_at || new Date().toISOString(),
            updatedAt: response.user.updated_at || new Date().toISOString(),
            subscription: {
              id: `sub_${response.user.supabase_user_id}`,
              userId: response.user.supabase_user_id,
              plan: 'basic' as const,
              status: 'active' as const,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              aiCredits: 100,
              aiCreditsUsed: 0,
              maxCourses: 5,
              features: ['ai-chat', 'course-access', 'certificates']
            }
          }

          // Update user store
          setUser(userData)
          
          // Store tokens
          if (response.session) {
            if (response.session.access_token) {
              localStorage.setItem('access_token', response.session.access_token)
              localStorage.setItem('token', response.session.access_token) // For backward compatibility
            }
            if (response.session.refresh_token) {
              localStorage.setItem('refresh_token', response.session.refresh_token)
            }
            if (response.session.expires_at) {
              localStorage.setItem('token_expires_at', response.session.expires_at.toString())
            }
          }

          // Clear OAuth session data
          oauthService.clearOAuthSession()
          
          // Get return URL or default to dashboard
          const returnUrl = sessionStorage.getItem('oauth_return_url')
          sessionStorage.removeItem('oauth_return_url')
          
          // Show success message briefly
          setProcessing(false)
          
          // Redirect to appropriate page
          setTimeout(() => {
            if (returnUrl && !returnUrl.includes('/login')) {
              router.push(returnUrl)
            } else {
              // Check if user has instructor role
              const isInstructor = userData.role === 'instructor'
              router.push(isInstructor ? '/instructor' : '/student')
            }
          }, 1500)
        } else {
          throw new Error('Failed to complete authentication')
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err)
        setError(err.message || 'Authentication failed. Please try again.')
        setProcessing(false)
        
        // Redirect to login after showing error
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    }

    handleCallback()
  }, [searchParams, router, setUser])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Authentication Failed</h2>
            <p className="text-muted-foreground">
              We couldn&apos;t complete your sign-in
            </p>
          </div>
          
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <Button 
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Back to Sign In
            </Button>
            
            <p className="text-center text-sm text-muted-foreground">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!processing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome to Unpuzzle!</h2>
            <p className="text-muted-foreground">
              Sign in successful. Redirecting you now...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Completing sign in...</h2>
          <p className="text-muted-foreground">
            Please wait while we authenticate your account
          </p>
        </div>
      </div>
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  )
}
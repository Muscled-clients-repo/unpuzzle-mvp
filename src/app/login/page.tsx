'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { oauthService } from '@/services/oauth.service'
import { 
  Brain, 
  Sparkles, 
  Zap, 
  ArrowRight, 
  CheckCircle,
  Play,
  BarChart3,
  Users,
  Star,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  
  // Get auth functions from Zustand store
  const { login, signup, profile, isAuthenticated } = useAppStore()
  
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState('')
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      let result
      
      if (mode === 'signup') {
        // Validate signup fields
        if (!firstName || !lastName) {
          setError("Please enter your full name")
          setLoading(false)
          return
        }
        
        result = await signup(email, password, firstName, lastName)
        
        if (result.success) {
          // Show email confirmation message instead of redirecting
          setShowEmailConfirmation(true)
          setSuccess("")
          setError("")
        } else {
          setError(result.error || "Failed to create account. Please try again.")
        }
      } else {
        // Login flow
        result = await login(email, password)
        
        if (result.success) {
          setSuccess("Login successful! Redirecting...")
          
          // Only redirect for login, not signup
          setTimeout(() => {
            // If we have a return URL, go there instead of home
            if (returnUrl) {
              const decodedUrl = decodeURIComponent(returnUrl)
              // Prevent redirect loops - if return URL is login, go to home instead
              if (decodedUrl.includes('/login')) {
                router.push('/')
              } else {
                router.push(decodedUrl)
              }
            } else {
              // No return URL - redirect to home page
              router.push('/')
            }
          }, 1500)
        } else {
          setError(result.error || "Invalid email or password. Please try again.")
        }
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'linkedin') => {
    setOauthLoading(provider)
    setError('')
    setSuccess('')
    
    try {
      // Store return URL if present
      if (returnUrl) {
        sessionStorage.setItem('oauth_return_url', returnUrl)
      }
      
      // Store provider for callback
      sessionStorage.setItem('oauth_provider', provider)
      
      // Initiate OAuth sign-in
      const response = await oauthService.initiateSignIn(provider)
      
      if (response.success && response.url) {
        // Redirect to OAuth provider
        window.location.href = response.url
      } else {
        throw new Error(`Failed to initiate sign-in with ${provider}`)
      }
    } catch (err: any) {
      console.error(`OAuth sign-in error for ${provider}:`, err)
      setError(err.message || `Failed to sign in with ${provider}. Please try again.`)
      setOauthLoading(null)
    }
  }

  const features = [
    'AI-powered learning assistance',
    'Personalized learning paths',
    'Real-time progress tracking',
    'Interactive quizzes & assessments'
  ]

  const stats = [
    { label: 'Active Learners', value: '10,000+' },
    { label: 'Courses Available', value: '500+' },
    { label: 'Completion Rate', value: '94%' }
  ]

  // Check for session expired message in sessionStorage
  useEffect(() => {
    const authError = sessionStorage.getItem('authError')
    if (authError) {
      setSessionExpiredMessage(authError)
      sessionStorage.removeItem('authError')
    }
  }, [])

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      if (returnUrl) {
        const decodedUrl = decodeURIComponent(returnUrl)
        // Prevent redirect loops - if return URL is login, go to home instead
        if (decodedUrl.includes('/login')) {
          router.push('/')
        } else {
          router.push(decodedUrl)
        }
      } else {
        // No return URL - redirect to home page
        router.push('/')
      }
    }
  }, [isAuthenticated, profile, returnUrl, router])

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Marketing */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:30px_30px]" />
        
        {/* Floating Elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center space-x-2 text-white mb-16">
            <Brain className="h-8 w-8" />
            <span className="text-2xl font-bold">Unpuzzle</span>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
                Learn Faster with
                <span className="block text-yellow-300">AI-Powered Guidance</span>
              </h1>
              <p className="text-xl text-white/80">
                Transform your learning experience with contextual AI assistance that adapts to your pace and style.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center space-x-3 text-white/90">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/20">
              {stats.map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-start space-x-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="text-white/90 italic mb-3">
            &quot;Unpuzzle completely changed how I learn. The AI assistance feels like having a personal tutor available 24/7.&quot;
          </p>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-400" />
            <div>
              <div className="text-white font-semibold">Sarah Chen</div>
              <div className="text-white/60 text-sm">Software Developer</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="flex items-center space-x-2 lg:hidden justify-center">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Unpuzzle</span>
          </div>

          {/* Email Confirmation Message */}
          {showEmailConfirmation ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Check your email</h2>
                <p className="text-muted-foreground">
                  We've sent a confirmation email to <strong>{email}</strong>
                </p>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Please check your email and click the confirmation link to activate your account. 
                  You may need to check your spam folder.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button 
                  className="w-full"
                  onClick={() => {
                    // Open email client or redirect to email provider
                    window.open('https://mail.google.com', '_blank')
                  }}
                >
                  Open Gmail
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowEmailConfirmation(false)
                    setMode('signin')
                    setPassword('')
                  }}
                >
                  Back to Sign In
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Didn't receive the email?{' '}
                <button 
                  className="text-primary hover:underline"
                  onClick={() => {
                    // TODO: Implement resend confirmation email
                    setSuccess("Confirmation email resent!")
                  }}
                >
                  Resend confirmation email
                </button>
              </p>
            </div>
          ) : (
            <>
              {/* Form Header */}
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">
                  {mode === 'signin' ? 'Welcome back' : 'Get started'}
                </h2>
                <p className="text-muted-foreground">
                  {mode === 'signin' 
                    ? 'Enter your credentials to access your account' 
                    : 'Create an account to start learning'}
                </p>
              </div>

              {/* Auth Toggle */}
              <div className="flex rounded-lg bg-muted p-1">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'signin' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'signup' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Session expired message */}
          {sessionExpiredMessage && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {sessionExpiredMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Error message */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required={mode === 'signup'}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required={mode === 'signup'}
                    className="h-11"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === 'signin' && (
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Auth */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-11"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading || oauthLoading !== null}
              type="button"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {oauthLoading === 'google' ? 'Connecting...' : 'Google'}
            </Button>
            <Button 
              variant="outline" 
              className="h-11"
              onClick={() => handleOAuthSignIn('linkedin')}
              disabled={loading || oauthLoading !== null}
              type="button"
            >
              {oauthLoading === 'linkedin' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              )}
              {oauthLoading === 'linkedin' ? 'Connecting...' : 'LinkedIn'}
            </Button>
          </div>

              {/* Footer */}
              <p className="text-center text-sm text-muted-foreground">
                By continuing, you agree to our{' '}
                <Link href="/terms" className="underline hover:text-primary">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-primary">
                  Privacy Policy
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
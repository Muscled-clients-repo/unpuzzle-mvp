"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Brain, 
  Sparkles, 
  GraduationCap, 
  Target,
  TrendingUp,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  
  // Get auth functions from Zustand store
  const { login, profile, isAuthenticated } = useAppStore()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const result = await login(email, password)

      if (result.success) {
        setSuccess("Login successful! Redirecting...")
        
        // Get the user's role to determine redirect
        const userRole = profile?.role
        
        setTimeout(() => {
          // If we have a return URL, go there instead of dashboard
          if (returnUrl) {
            router.push(decodeURIComponent(returnUrl))
          } else {
            // Redirect based on role
            if (userRole === 'instructor') {
              router.push('/instructor')
            } else if (userRole === 'admin') {
              router.push('/admin')
            } else {
              router.push('/student')
            }
          }
        }, 1500)
      } else {
        setError(result.error || "Invalid email or password. Please try again.")
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

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
        router.push(decodeURIComponent(returnUrl))
      } else {
        // Redirect based on role
        if (profile?.role === 'instructor') {
          router.push('/instructor')
        } else if (profile?.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/student')
        }
      }
    }
  }, [isAuthenticated, profile, returnUrl, router])


  const features = [
    {
      icon: <Brain className="h-5 w-5 text-blue-500" />,
      title: "AI-Powered Learning",
      description: "Get personalized hints and feedback"
    },
    {
      icon: <Target className="h-5 w-5 text-purple-500" />,
      title: "Track Progress",
      description: "Monitor your learning journey"
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
      title: "Adaptive Paths",
      description: "Content that adapts to your pace"
    },
    {
      icon: <Sparkles className="h-5 w-5 text-yellow-500" />,
      title: "Smart Quizzes",
      description: "Context-aware assessments"
    }
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-75 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
                  <GraduationCap className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome Back!</h1>
            <p className="text-muted-foreground mt-2">
              Continue your learning journey with UnPuzzle
            </p>
          </div>

          {/* Login Card */}
          <Card className="border-muted/50 shadow-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Sign in to your account</CardTitle>
              <CardDescription>
                Enter your email and password to access your courses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Alerts */}
              {sessionExpiredMessage && (
                <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{sessionExpiredMessage}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

            </CardContent>
            <CardFooter>
              <p className="text-center text-sm text-muted-foreground w-full">
                Don&apos;t have an account?{" "}
                <Link 
                  href={returnUrl ? `/signup?returnUrl=${encodeURIComponent(returnUrl)}` : "/signup"} 
                  className="text-primary hover:underline font-medium"
                >
                  Sign up for free
                </Link>
              </p>
            </CardFooter>
          </Card>

          {/* Demo Credentials - Remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Demo: Use your actual credentials to login
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Features Showcase */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center text-white max-w-xl">
          <div className="mb-8">
            <h2 className="text-4xl font-bold mb-4">
              Unlock Your Learning Potential
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Join thousands of students who are learning faster and more effectively with our AI-powered platform.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="flex items-start space-x-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-white/80">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="flex items-center space-x-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="h-5 w-5 text-yellow-400 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-white/90 mb-3">
              &ldquo;UnPuzzle transformed how I learn. The AI hints are like having a personal tutor available 24/7!&rdquo;
            </p>
            <p className="text-sm font-semibold">- Sarah Chen, Computer Science Student</p>
          </div>

          {/* Stats */}
          <div className="mt-8 flex space-x-8">
            <div>
              <p className="text-3xl font-bold">50K+</p>
              <p className="text-sm text-white/80">Active Learners</p>
            </div>
            <div>
              <p className="text-3xl font-bold">500+</p>
              <p className="text-sm text-white/80">Expert Courses</p>
            </div>
            <div>
              <p className="text-3xl font-bold">4.9/5</p>
              <p className="text-sm text-white/80">Student Rating</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
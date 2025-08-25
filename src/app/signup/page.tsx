"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  Brain, 
  Sparkles, 
  GraduationCap, 
  Target,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  User,
  Users,
  Zap,
  Award
} from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const { setUser, profile, isAuthenticated } = useAppStore()
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [registeredEmail, setRegisteredEmail] = useState("") // Store the email after successful signup
  const [isLoading, setIsLoading] = useState(false)

  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 25
    if (password.match(/[0-9]/)) strength += 25
    if (password.match(/[^a-zA-Z0-9]/)) strength += 25
    setPasswordStrength(strength)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (name === "password") {
      calculatePasswordStrength(value)
    }
  }

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      return false
    }
    if (!agreeToTerms) {
      setError("Please agree to the terms and conditions")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    
    if (!validateForm()) return
    
    setIsLoading(true)
    
    try {
      // Call the real signup API
      console.log('🔐 Attempting signup for:', formData.email)
      
      const response = await apiClient.signup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      })
      
      console.log('🔐 Signup response:', { 
        status: response.status, 
        hasData: !!response.data,
        error: response.error 
      })
      
      if (response.error) {
        // Handle specific error cases
        if (response.status === 409) {
          setError("An account with this email already exists. Please login instead.")
        } else if (response.status === 400) {
          setError(response.error || "Invalid data provided. Please check your information.")
        } else {
          setError(response.error || "Failed to create account. Please try again.")
        }
        return
      }
      
      if (response.data && (response.status === 200 || response.status === 201)) {
        setSuccess("Account created successfully! Please check your email to verify your account.")
        
        // Store the email before clearing the form
        setRegisteredEmail(formData.email)
      
        // Clear the form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: ""
        })
        setPasswordStrength(0)
        setAgreeToTerms(false)
        
        // Don't redirect automatically - let user see the email verification message
      } else {
        // If we get here, something unexpected happened
        setError("Unexpected response from server. Please try again.")
      }
    } catch (err) {
      console.error('❌ Signup error:', err)
      
      // Check if it's a network error
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError("Network error. Please check your connection.")
      } else {
        setError("An error occurred during signup. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      // Redirect based on role
      if (profile?.role === 'instructor') {
        router.push('/instructor')
      } else if (profile?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/student')
      }
    }
  }, [isAuthenticated, profile, router])

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 25) return "Weak"
    if (passwordStrength <= 50) return "Fair"
    if (passwordStrength <= 75) return "Good"
    return "Strong"
  }

  const getEmailProviderInfo = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase()
    
    const emailProviders: { [key: string]: string } = {
      'gmail.com': 'https://mail.google.com',
      'yahoo.com': 'https://mail.yahoo.com',
      'outlook.com': 'https://outlook.live.com',
      'hotmail.com': 'https://outlook.live.com',
      'icloud.com': 'https://www.icloud.com/mail',
      'protonmail.com': 'https://mail.protonmail.com',
    }
    
    // Check if it's a known provider
    for (const [provider, url] of Object.entries(emailProviders)) {
      if (domain?.includes(provider)) {
        return { isBusinessEmail: false, url }
      }
    }
    
    // It's a business/custom domain email
    return { isBusinessEmail: true, url: null }
  }

  const openEmailProvider = () => {
    const { url } = getEmailProviderInfo(registeredEmail || formData.email)
    if (url) {
      window.open(url, '_blank')
    }
  }
  
  const isBusinessEmail = () => {
    const emailToCheck = registeredEmail || formData.email
    if (!emailToCheck) return false // No email to check
    const { isBusinessEmail } = getEmailProviderInfo(emailToCheck)
    return isBusinessEmail
  }

  const benefits = [
    {
      icon: <Zap className="h-5 w-5 text-yellow-500" />,
      title: "Instant Access",
      description: "Start learning immediately"
    },
    {
      icon: <Brain className="h-5 w-5 text-blue-500" />,
      title: "AI Tutor",
      description: "24/7 personalized assistance"
    },
    {
      icon: <Award className="h-5 w-5 text-purple-500" />,
      title: "Certificates",
      description: "Earn recognized credentials"
    },
    {
      icon: <Users className="h-5 w-5 text-green-500" />,
      title: "Community",
      description: "Join 50K+ learners"
    }
  ]

  if(success) {
    return (
      <div className="w-screen h-screen flex justify-center items-center">
        <Alert className="border-green-200 bg-green-50 w-full max-w-md space-y-8 ">
          <Mail className="h-4 w-4 text-green-600" />
          <div className="flex-1">
            <AlertDescription className="text-green-800">
              <strong>Success!</strong> {success}
              {isBusinessEmail() && (
                <div className="mt-2 text-sm">
                  <span className="text-amber-700">
                    Looks like you&apos;re using a business email. Please login to your business email provider to verify your account.
                  </span>
                </div>
              )}
            </AlertDescription>
            <div className="mt-3 flex gap-3">
              {!isBusinessEmail() && (
                <Button
                  type="button"
                  size="sm"
                  onClick={openEmailProvider}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Check Email
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => window.location.href = '/login'}
                className={isBusinessEmail() ? "border-green-600 text-green-600 hover:bg-green-50" : "border-green-600 text-green-600 hover:bg-green-50"}
              >
                Go to Login
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-xl opacity-75 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-full">
                  <GraduationCap className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Create Your Account</h1>
            <p className="text-muted-foreground mt-2">
              Start learning smarter with AI-powered education
            </p>
          </div>

          {/* Signup Card */}
          <Card className="border-muted/50 shadow-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Sign up for UnPuzzle</CardTitle>
              <CardDescription>
                Join 50,000+ learners already transforming their education
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Alerts */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="pl-10"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john.doe@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
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
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleInputChange}
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
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Password strength:</span>
                        <span className={`font-medium ${passwordStrength >= 75 ? 'text-green-600' : passwordStrength >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {getPasswordStrengthText()}
                        </span>
                      </div>
                      <Progress value={passwordStrength} className="h-1.5" />
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p className={formData.password.length >= 8 ? 'text-green-600' : ''}>
                          ✓ At least 8 characters
                        </p>
                        <p className={formData.password.match(/[A-Z]/) ? 'text-green-600' : ''}>
                          ✓ At least one uppercase letter
                        </p>
                        <p className={formData.password.match(/[a-z]/) ? 'text-green-600' : ''}>
                          ✓ At least one lowercase letter
                        </p>
                        <p className={formData.password.match(/[0-9]/) ? 'text-green-600' : ''}>
                          ✓ At least one number
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="pl-10 pr-10"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={agreeToTerms}
                      onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                      disabled={isLoading}
                      className="mt-0.5"
                    />
                    <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-relaxed">
                      I agree to the{" "}
                      <Link href="/terms" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    disabled={isLoading || !agreeToTerms}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <p className="text-center text-sm text-muted-foreground w-full">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>

          {/* Additional Info */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              By signing up, you&apos;ll get access to free courses and AI-powered learning tools
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
              <div className="flex items-center">
                <Sparkles className="h-3 w-3 mr-1" />
                <span>Free tier available</span>
              </div>
              <div className="flex items-center">
                <Target className="h-3 w-3 mr-1" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Feature Showcase */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center text-white max-w-xl">
          <div className="mb-8">
            <h2 className="text-4xl font-bold mb-4">
              Start Your Learning Journey Today
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Join thousands of students achieving their goals with AI-powered personalized learning.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="flex items-start space-x-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    {benefit.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{benefit.title}</h3>
                    <p className="text-sm text-white/80">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Success Stories */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 mb-8">
            <h3 className="font-semibold mb-4 text-lg">Success Stories</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-white/20 rounded-full p-1">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm">&ldquo;Improved my coding skills by 3x in just 2 months&rdquo;</p>
                  <p className="text-xs text-white/60 mt-1">- Alex, Software Developer</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-white/20 rounded-full p-1">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm">&ldquo;Got my dream job after completing the AI course&rdquo;</p>
                  <p className="text-xs text-white/60 mt-1">- Maria, Data Scientist</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-white/20 rounded-full p-1">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm">&ldquo;The AI hints helped me understand complex topics easily&rdquo;</p>
                  <p className="text-xs text-white/60 mt-1">- John, CS Student</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex space-x-8 text-center">
            <div>
              <p className="text-2xl font-bold">500+</p>
              <p className="text-xs text-white/80">Expert Courses</p>
            </div>
            <div>
              <p className="text-2xl font-bold">98%</p>
              <p className="text-xs text-white/80">Satisfaction Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold">24/7</p>
              <p className="text-xs text-white/80">AI Support</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
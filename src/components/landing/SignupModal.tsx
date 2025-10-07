'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, Loader2, CheckCircle, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface SignupModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'email' | 'details' | 'success' | 'verify-email'

export function SignupModal({ isOpen, onClose }: SignupModalProps) {
  const [step, setStep] = useState<Step>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setStep('details')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!fullName.trim()) {
      setError('Please enter your full name')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      // If email verification is required, show verify-email step
      if (data.needsEmailVerification) {
        setStep('verify-email')
      } else {
        // If no verification needed, show success and redirect
        setStep('success')
        setTimeout(() => {
          window.location.href = '/student/courses'
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep('email')
    setError('')
  }

  const handleClose = () => {
    if (!loading) {
      setStep('email')
      setEmail('')
      setFullName('')
      setPassword('')
      setConfirmPassword('')
      setError('')
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative"
            >
              {/* Close Button */}
              {step !== 'success' && (
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <X className="h-6 w-6" />
                </button>
              )}

              <div className="p-8">
                {/* Step 1: Email */}
                {step === 'email' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h2 className="text-3xl font-bold text-white mb-2">
                      Get Started Free
                    </h2>
                    <p className="text-slate-400 mb-6">
                      Join the Agency Track and start earning your first $1,000
                    </p>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-white">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                          autoFocus
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
                      >
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </form>

                    <p className="text-xs text-slate-500 mt-4 text-center">
                      By continuing, you agree to our Terms and Privacy Policy
                    </p>
                  </motion.div>
                )}

                {/* Step 2: Details */}
                {step === 'details' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <button
                      onClick={handleBack}
                      disabled={loading}
                      className="flex items-center text-slate-400 hover:text-white transition-colors mb-4 disabled:opacity-50"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </button>

                    <h2 className="text-3xl font-bold text-white mb-2">
                      Create Your Account
                    </h2>
                    <p className="text-slate-400 mb-6">
                      You're joining the <span className="text-green-400 font-semibold">Agency Track</span> with a $1,000 goal
                    </p>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-white">Full Name</Label>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                          autoFocus
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-white">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        />
                        <p className="text-xs text-slate-500">
                          Must be at least 8 characters
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </div>

                      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mt-4">
                        <p className="text-sm text-slate-300">
                          <span className="text-green-400 font-semibold">Note:</span> You'll receive a verification email. Please verify your email to access the dashboard.
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          <>
                            Start Learning
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>

                    <p className="text-xs text-slate-500 mt-4 text-center">
                      SaaS Track is currently closed. Start with Agency to build capital.
                    </p>
                  </motion.div>
                )}

                {/* Step 3: Verify Email */}
                {step === 'verify-email' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring' }}
                      className="inline-block mb-6"
                    >
                      <Mail className="h-20 w-20 text-yellow-500" />
                    </motion.div>

                    <h2 className="text-3xl font-bold text-white mb-2">
                      Check Your Email
                    </h2>
                    <p className="text-slate-400 mb-4">
                      We've sent a verification link to:
                    </p>
                    <p className="text-white font-semibold mb-6">{email}</p>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                      <p className="text-sm text-slate-300">
                        Click the link in your email to verify your account and access the dashboard.
                      </p>
                    </div>

                    <Button
                      onClick={handleClose}
                      variant="outline"
                      className="w-full"
                    >
                      Close
                    </Button>

                    <p className="text-xs text-slate-500 mt-4">
                      Didn't receive the email? Check your spam folder.
                    </p>
                  </motion.div>
                )}

                {/* Step 4: Success */}
                {step === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring' }}
                      className="inline-block mb-6"
                    >
                      <CheckCircle className="h-20 w-20 text-green-500" />
                    </motion.div>

                    <h2 className="text-3xl font-bold text-white mb-2">
                      Account Created!
                    </h2>
                    <p className="text-slate-400 mb-6">
                      Redirecting to your courses...
                    </p>

                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-green-500 animate-spin" />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

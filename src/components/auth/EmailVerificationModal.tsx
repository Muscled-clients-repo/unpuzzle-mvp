'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmailVerificationModalProps {
  isOpen: boolean
  email?: string
  onResendEmail?: () => Promise<void>
}

export function EmailVerificationModal({
  isOpen,
  email,
  onResendEmail
}: EmailVerificationModalProps) {
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleResend = async () => {
    if (!onResendEmail) return

    setResending(true)
    try {
      await onResendEmail()
      setResent(true)
      setTimeout(() => setResent(false), 3000)
    } catch (error) {
      console.error('Failed to resend email:', error)
    } finally {
      setResending(false)
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8"
            >
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl"></div>
                  <div className="relative bg-yellow-500/10 p-4 rounded-full">
                    <Mail className="h-12 w-12 text-yellow-500" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Verify Your Email
                </h2>
                <p className="text-slate-400 mb-4">
                  We've sent a verification email to:
                </p>
                <p className="text-white font-semibold mb-4">
                  {email || 'your email address'}
                </p>
                <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-left">
                  <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">
                    You won't be able to access courses until you verify your email. Please check your inbox and click the verification link.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {onResendEmail && (
                  <Button
                    onClick={handleResend}
                    disabled={resending || resent}
                    variant="outline"
                    className="w-full"
                  >
                    {resending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : resent ? (
                      <>
                        Email Sent! Check your inbox
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                )}

                <p className="text-xs text-slate-500 text-center">
                  Already verified? Refresh this page to continue.
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

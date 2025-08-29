"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Course } from '@/types/domain'
import { useAppStore } from '@/stores/app-store'
import { PaymentMethodSelector } from './PaymentMethodSelector'
import { CouponInput } from './CouponInput'
import { LoadingSpinner } from '@/components/common'
import { StripePaymentForm } from '@/components/payment/StripePaymentForm'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  ShoppingCart, 
  Check, 
  AlertCircle, 
  Star,
  Clock,
  Users,
  Award,
  CreditCard
} from 'lucide-react'

interface EnrollmentDialogProps {
  course: Course
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function EnrollmentDialog({ course, isOpen, onClose, onSuccess }: EnrollmentDialogProps) {
  const router = useRouter()
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'paypal' | 'stripe'>('credit_card')
  const [couponCode, setCouponCode] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [appliedDiscount, setAppliedDiscount] = useState(0)
  const [paymentStep, setPaymentStep] = useState<'enrollment' | 'payment'>('enrollment')

  const {
    enrollInCourse,
    enrollingCourseId,
    enrolledCourses,
    error,
    // New payment system
    initiateEnrollment,
    loadStripeConfig,
    stripeConfig,
    isProcessing,
    processingCourseId,
    currentEnrollment,
    paymentStatus,
    paymentError,
    clearPaymentState
  } = useAppStore()

  // Mock user ID - in production, get from auth context
  const userId = 'user-1'

  // Check if already enrolled
  const isAlreadyEnrolled = enrolledCourses?.some(c => c.id === course.id) || false
  const isEnrolling = isProcessing && processingCourseId === course.id
  const isFree = !course.price || course.price === 0
  
  // Calculate final price with discount
  const originalPrice = course.price || 0
  const discountAmount = (originalPrice * appliedDiscount) / 100
  const finalPrice = Math.max(0, originalPrice - discountAmount)

  const handleEnroll = async () => {
    if (!termsAccepted) {
      return
    }

    try {
      // Use the new universal enrollment system
      const result = await initiateEnrollment(course.id)
      
      if (result.is_free && result.success) {
        // Free course - enrollment success (no redirect)
        onSuccess?.()
        onClose()
        console.log('✅ Free course enrollment successful:', course.title)
        // Redirect disabled - user stays on current page
      } else if (!result.is_free && result.client_secret) {
        // Paid course - transition to payment step
        console.log('🔄 Payment required for course:', course.title)
        console.log('💳 Client Secret:', result.client_secret)
        
        // Load Stripe configuration if not already loaded
        if (!stripeConfig) {
          console.log('🔧 Loading Stripe configuration...')
          await loadStripeConfig()
        }
        
        // Transition to payment step
        setPaymentStep('payment')
      } else {
        // Unexpected response state
        console.warn('Unexpected enrollment response:', result)
        throw new Error('Unexpected enrollment response')
      }
    } catch (err) {
      // Error handling is done by the payment slice
      console.error('Enrollment failed:', err)
    }
  }

  const handlePaymentSuccess = () => {
    console.log('✅ Payment successful!')
    onSuccess?.()
    onClose()
    // Redirect to student courses page after successful payment
    router.push('/student/courses')
  }

  const handlePaymentError = (error: string) => {
    console.error('❌ Payment failed:', error)
    // Error is already shown in the Stripe form
  }

  const handleCouponApply = async (coupon: string) => {
    // Mock coupon validation - in production, call API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const mockCoupons: Record<string, number> = {
      'DISCOUNT20': 20,
      'SAVE10': 10,
      'STUDENT50': 50,
      'WELCOME15': 15
    }

    const discount = mockCoupons[coupon.toUpperCase()]
    
    if (discount) {
      setAppliedDiscount(discount)
      return { valid: true, discount, message: `${discount}% discount applied!` }
    } else {
      setAppliedDiscount(0)
      return { valid: false, message: 'Invalid coupon code' }
    }
  }

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCouponCode('')
      setAppliedDiscount(0)
      setTermsAccepted(false)
      setPaymentMethod('credit_card')
      setPaymentStep('enrollment')
      // Clear payment state when closing dialog
      clearPaymentState()
    }
  }, [isOpen, clearPaymentState])

  // Handle already enrolled
  useEffect(() => {
    if (isAlreadyEnrolled && isOpen) {
      onClose()
      router.push(`/student/course/${course.id}`)
    }
  }, [isAlreadyEnrolled, isOpen, course.id, router, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            <ShoppingCart className="inline-block mr-2 h-5 w-5" />
            {paymentStep === 'enrollment' ? 'Enroll in Course' : 'Complete Payment'}
          </DialogTitle>
          <DialogDescription>
            {paymentStep === 'enrollment' 
              ? 'Join thousands of students learning with AI assistance'
              : 'Enter your payment details to complete enrollment'
            }
          </DialogDescription>
        </DialogHeader>

        {paymentStep === 'enrollment' ? (
          /* Enrollment Step */
          <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg flex items-center justify-center">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg line-clamp-2">{course.title}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {course.rating || 4.5}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {course.enrollmentCount || 0} students
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {course.duration || 0}h
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Course Price:</span>
              {isFree ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-lg px-3 py-1">
                  FREE
                </Badge>
              ) : (
                <div className="text-right">
                  {appliedDiscount > 0 && (
                    <div className="text-sm text-gray-500 line-through">
                      ${originalPrice}
                    </div>
                  )}
                  <div className="text-2xl font-bold">
                    ${finalPrice.toFixed(2)}
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="text-sm text-green-600">
                      Save ${discountAmount.toFixed(2)} ({appliedDiscount}% off)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Coupon Input */}
            <CouponInput
              value={couponCode}
              onChange={setCouponCode}
              onApply={handleCouponApply}
              disabled={isEnrolling || isFree}
            />
          </div>

          <Separator />

          {/* Payment Method (only for paid courses) */}
          {!isFree && (
            <>
              <PaymentMethodSelector
                value={paymentMethod}
                onChange={setPaymentMethod}
                disabled={isEnrolling}
              />
              <Separator />
            </>
          )}

          {/* Terms and Conditions */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={setTermsAccepted}
              disabled={isEnrolling}
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
              I agree to the{' '}
              <a href="/terms" className="text-primary hover:underline" target="_blank">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-primary hover:underline" target="_blank">
                Privacy Policy
              </a>
            </Label>
          </div>

          {/* Error Display */}
          {(error || paymentError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || paymentError}</AlertDescription>
            </Alert>
          )}

          {/* What's Included */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm text-gray-900">What&apos;s included:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Full lifetime access
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                AI-powered learning assistance
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Interactive quizzes and exercises
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Certificate of completion
              </li>
            </ul>
          </div>
        </div>
        ) : (
          /* Payment Step */
          <div className="space-y-4">
            {/* Course Summary - Compact */}
            <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg line-clamp-1">{course.title}</h3>
                <div className="text-2xl font-bold text-primary">
                  ${finalPrice.toFixed(2)}
                  {appliedDiscount > 0 && (
                    <span className="text-sm text-gray-500 line-through ml-2">
                      ${originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stripe Payment Form */}
            {currentEnrollment?.client_secret && (
              <StripePaymentForm
                clientSecret={currentEnrollment.client_secret}
                amount={Math.round(finalPrice * 100)} // Convert to cents
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                loading={isEnrolling}
              />
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {paymentStep === 'enrollment' ? (
            <>
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={isEnrolling}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEnroll}
                disabled={isEnrolling || !termsAccepted}
                className="flex-1"
              >
                {isEnrolling ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {isFree ? 'Enroll for Free' : `Enroll Now - $${finalPrice.toFixed(2)}`}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setPaymentStep('enrollment')}
                disabled={isEnrolling}
                className="flex-1"
              >
                Back to Course Details
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
// src/stores/slices/payment-slice.ts
import { StateCreator } from 'zustand'
import { paymentService, EnrollmentResponse, StripeConfig } from '@/services/payment-service'

export type PaymentStatus = 'idle' | 'processing' | 'succeeded' | 'failed'

export interface PaymentState {
  // Stripe configuration
  stripeConfig: StripeConfig | null
  isStripeConfigLoaded: boolean
  
  // Enrollment state
  currentEnrollment: EnrollmentResponse | null
  isProcessing: boolean
  
  // Payment status
  paymentStatus: PaymentStatus
  paymentError: string | null
  
  // UI state
  showPaymentDialog: boolean
  processingCourseId: string | null
  
  // General error state
  error: string | null
}

export interface PaymentActions {
  // Stripe configuration
  loadStripeConfig: () => Promise<void>
  
  // Universal enrollment
  initiateEnrollment: (courseId: string) => Promise<EnrollmentResponse>
  
  // Payment processing
  processPayment: (clientSecret: string, stripe: unknown) => Promise<boolean>
  
  // State management
  setPaymentStatus: (status: PaymentStatus) => void
  setPaymentError: (error: string | null) => void
  clearPaymentState: () => void
  
  // UI management
  setShowPaymentDialog: (show: boolean) => void
  setProcessingCourse: (courseId: string | null) => void
  
  // Error handling
  clearError: () => void
}

export interface PaymentSlice extends PaymentState, PaymentActions {}

const initialState: PaymentState = {
  stripeConfig: null,
  isStripeConfigLoaded: false,
  currentEnrollment: null,
  isProcessing: false,
  paymentStatus: 'idle',
  paymentError: null,
  showPaymentDialog: false,
  processingCourseId: null,
  error: null,
}

export const createPaymentSlice: StateCreator<PaymentSlice> = (set) => ({
  ...initialState,

  // Load Stripe configuration from backend
  loadStripeConfig: async () => {
    try {
      const config = await paymentService.getStripeConfig()
      set({ 
        stripeConfig: config, 
        isStripeConfigLoaded: true,
        error: null 
      })
    } catch (error) {
      console.error('❌ Failed to load Stripe config:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load payment configuration',
        isStripeConfigLoaded: false 
      })
    }
  },

  // Initiate enrollment - handles both free and paid courses
  initiateEnrollment: async (courseId: string) => {
    set({ 
      isProcessing: true, 
      processingCourseId: courseId,
      error: null,
      paymentError: null,
      paymentStatus: 'processing'
    })

    try {
      const result = await paymentService.enrollInCourse(courseId)
      
      if (result.is_free && result.success) {
        // Free course - enrollment completed
        set({ 
          currentEnrollment: result,
          isProcessing: false,
          processingCourseId: null,
          paymentStatus: 'succeeded',
          error: null
        })
      } else if (!result.is_free && result.client_secret) {
        // Paid course - payment required
        set({ 
          currentEnrollment: result,
          isProcessing: false,
          processingCourseId: null,
          paymentStatus: 'idle', // Ready for payment
          error: null
        })
      } else {
        // Unexpected state
        throw new Error('Invalid enrollment response')
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Enrollment failed'
      
      set({ 
        isProcessing: false,
        processingCourseId: null,
        error: errorMessage,
        paymentStatus: 'failed'
      })
      
      throw error
    }
  },

  // Process Stripe payment
  processPayment: async (clientSecret: string, stripe: unknown) => {
    set({ 
      paymentStatus: 'processing',
      paymentError: null 
    })

    try {
      const result = await paymentService.confirmPayment(clientSecret, stripe)
      
      if (result.success) {
        set({ 
          paymentStatus: 'succeeded',
          paymentError: null 
        })
        return true
      } else {
        set({ 
          paymentStatus: 'failed',
          paymentError: result.error || 'Payment failed' 
        })
        return false
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed'
      
      set({ 
        paymentStatus: 'failed',
        paymentError: errorMessage 
      })
      
      return false
    }
  },

  // State management actions
  setPaymentStatus: (status: PaymentStatus) => {
    set({ paymentStatus: status })
  },

  setPaymentError: (error: string | null) => {
    set({ paymentError: error })
  },

  clearPaymentState: () => {
    set({
      currentEnrollment: null,
      paymentStatus: 'idle',
      paymentError: null,
      isProcessing: false,
      processingCourseId: null,
      showPaymentDialog: false,
      error: null
    })
  },

  // UI management
  setShowPaymentDialog: (show: boolean) => {
    set({ showPaymentDialog: show })
  },

  setProcessingCourse: (courseId: string | null) => {
    set({ processingCourseId: courseId })
  },

  // Error handling
  clearError: () => {
    set({ error: null, paymentError: null })
  },
})
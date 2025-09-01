// Payment Service - Universal enrollment and Stripe integration
import { apiClient } from '@/lib/api-client'

// Response interfaces based on backend API
export interface EnrollmentResponse {
  success: boolean
  is_free: boolean
  client_secret?: string
  enrollment_id?: string
  message: string
}

export interface StripeConfig {
  publishable_key: string
  currency?: string
}

export interface EnrollmentRequest {
  course_id: string
}

export interface PaymentIntent {
  payment_intent_id: string
  client_secret: string
  amount: number
  currency: string
  discount?: {
    coupon_code: string
    discount_amount: number
    discount_percentage: number
  }
  status: string
  created_at: string
}

export interface PaymentConfirmation {
  status: string
  payment_id: string
  stripe_payment_intent: string
  enrollment?: {
    enrollment_id: string
    course_id: string
    enrolled_at: string
  }
  receipt_url?: string
  message: string
}

export interface PaymentHistoryItem {
  payment_id: string
  amount: number
  currency: string
  status: 'succeeded' | 'failed' | 'refunded'
  description: string
  course?: {
    id: string
    title: string
    instructor: string
  }
  receipt_url?: string
  created_at: string
}

export interface PaymentHistoryResponse {
  count: number
  total_spent: number
  results: PaymentHistoryItem[]
}

export class PaymentService {
  /**
   * Universal enrollment endpoint - handles both free and paid courses
   * Backend determines if course is free or requires payment
   */
  async enrollInCourse(courseId: string): Promise<EnrollmentResponse> {
    try {
      // Use existing working enrollment endpoint
      const response = await apiClient.enrollInCourse(courseId)

      if (response.status === 200 && response.data) {
        // Check if response contains payment intent (client_secret)
        const responseData = response.data as Record<string, unknown>
        
        if (responseData.client_secret) {
          // Payment required - course is paid
          return {
            success: false, // Not yet successful until payment is completed
            is_free: false,
            client_secret: responseData.client_secret,
            enrollment_id: responseData.enrollment_id,
            message: responseData.message || 'Payment required to complete enrollment'
          }
        } else {
          // Free course - immediate enrollment success
          return {
            success: true,
            is_free: true,
            enrollment_id: responseData.enrollmentId || responseData.enrollment_id,
            message: responseData.message || 'Enrollment successful'
          }
        }
      }

      // Handle error responses
      throw new Error(response.error || 'Enrollment failed')
    } catch (error) {
      console.error('❌ Enrollment error:', error)
      throw error
    }
  }

  /**
   * Get Stripe configuration from backend
   */
  async getStripeConfig(): Promise<StripeConfig> {
    try {
      const response = await apiClient.get<StripeConfig>('/api/v1/payments/config/stripe/')

      if (response.status === 200 && response.data) {
        return response.data
      }

      throw new Error(response.error || 'Failed to get Stripe configuration')
    } catch (error) {
      console.error('❌ Stripe config error:', error)
      throw error
    }
  }

  /**
   * Create payment intent for course purchase
   */
  async createPaymentIntent(
    courseId: string, 
    amount: number, 
    currency: string = 'USD', 
    paymentMethod: string = 'card', 
    couponCode?: string,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> {
    try {
      const response = await apiClient.post('/api/v1/payments/intents/', {
        course_id: courseId,
        amount,
        currency,
        payment_method: paymentMethod,
        coupon_code: couponCode,
        metadata
      })

      if (response.status === 200 && response.data) {
        return response.data as PaymentIntent
      }

      throw new Error(response.error || 'Failed to create payment intent')
    } catch (error: any) {
      console.error('❌ Payment intent creation error:', error)
      throw new Error(error.response?.data?.error || 'Failed to create payment intent')
    }
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(paymentId: string, paymentMethodId: string): Promise<PaymentConfirmation> {
    try {
      const response = await apiClient.post(`/api/v1/payments/intents/${paymentId}/confirm/`, {
        payment_method_id: paymentMethodId
      })

      if (response.status === 200 && response.data) {
        return response.data as PaymentConfirmation
      }

      throw new Error(response.error || 'Payment confirmation failed')
    } catch (error: any) {
      console.error('❌ Payment confirmation error:', error)
      throw new Error(error.response?.data?.error || 'Payment confirmation failed')
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(
    startDate?: string, 
    endDate?: string, 
    status?: 'succeeded' | 'failed' | 'refunded'
  ): Promise<PaymentHistoryResponse> {
    try {
      let endpoint = '/api/v1/payments/history/'
      const params: string[] = []
      
      if (startDate) params.push(`start_date=${startDate}`)
      if (endDate) params.push(`end_date=${endDate}`)
      if (status) params.push(`status=${status}`)
      
      if (params.length > 0) {
        endpoint += `?${params.join('&')}`
      }

      const response = await apiClient.get(endpoint)

      if (response.status === 200 && response.data) {
        return response.data as PaymentHistoryResponse
      }

      throw new Error(response.error || 'Failed to get payment history')
    } catch (error: any) {
      console.error('❌ Payment history error:', error)
      throw new Error(error.response?.data?.error || 'Failed to load payment history')
    }
  }

  /**
   * Confirm Stripe payment using client secret
   * This would typically be handled by Stripe SDK directly,
   * but we can wrap it for additional error handling
   */
  async confirmPayment(clientSecret: string, stripe: { confirmCardPayment: (secret: string) => Promise<{ error?: { message?: string } }> }): Promise<{success: boolean, error?: string}> {
    try {
      const result = await stripe.confirmCardPayment(clientSecret)
      
      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Payment failed'
        }
      }
      
      return { success: true }
    } catch (error) {
      console.error('❌ Payment confirmation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      }
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService()
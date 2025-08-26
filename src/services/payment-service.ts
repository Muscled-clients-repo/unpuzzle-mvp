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
   * Confirm Stripe payment using client secret
   * This would typically be handled by Stripe SDK directly,
   * but we can wrap it for additional error handling
   */
  async confirmPayment(clientSecret: string, stripe: any): Promise<{success: boolean, error?: string}> {
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
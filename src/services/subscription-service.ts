import { ServiceResult } from './types'

// Subscription types
export interface Subscription {
  plan_id: string
  plan_name: string
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'none'
  billing_period: 'monthly' | 'yearly'
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  trial_end?: string
  is_trial?: boolean
  days_until_renewal?: number
  features: SubscriptionFeatures
}

export interface SubscriptionFeatures {
  ai_chat: boolean
  ai_hints: boolean
  ai_quiz: boolean
  ai_reflection: boolean
  ai_path: boolean
  priority_support: boolean
  unlimited_courses?: boolean
  advanced_analytics?: boolean
  custom_models?: boolean
  api_access?: boolean
  white_label?: boolean
  dedicated_support?: boolean
}

export interface Plan {
  id: string
  name: string
  display_name: string
  description: string
  price_monthly: number
  price_yearly: number
  ai_daily_limit: number
  ai_monthly_limit: number
  trial_days: number
  features: SubscriptionFeatures
  is_featured: boolean
}

export interface AIUsageStats {
  subscription_plan: string
  subscription_status?: string
  usage_today: number
  usage_this_period: number
  daily_limit: number
  monthly_limit: number
  remaining_today: number
  remaining_this_period: number
  daily_usage_percentage?: number
  monthly_usage_percentage?: number
  daily_breakdown?: Array<{
    agent_type: string
    count: number
    tokens: number
  }>
  period_breakdown?: Array<{
    agent_type: string
    count: number
    tokens: number
    cost?: string
  }>
  features: SubscriptionFeatures
  current_period_start?: string
  current_period_end?: string
  days_until_renewal?: number
  reset_time?: string
}

export interface LimitCheckResult {
  can_use_ai: boolean
  remaining_interactions: number
  daily_limit: number
  monthly_limit: number
  subscription_plan: string
  reset_time?: string
  cost_estimate?: number
  upgrade_required: boolean
  upgrade_message?: string
}

export interface PaymentMethod {
  id: string
  type: 'card'
  card?: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
  is_default: boolean
  created_at: string
}

export interface Invoice {
  id: string
  number: string
  status: 'paid' | 'open' | 'void' | 'draft'
  amount: number
  currency: string
  period_start: string
  period_end: string
  paid_at?: string
  pdf_url?: string
  items: Array<{
    description: string
    amount: number
  }>
}

// Subscription service interface
export interface ISubscriptionService {
  getCurrentSubscription(): Promise<ServiceResult<Subscription>>
  getAvailablePlans(): Promise<ServiceResult<Plan[]>>
  createSubscription(planId: string, billingPeriod: 'monthly' | 'yearly', paymentMethodId?: string): Promise<ServiceResult<Subscription>>
  updateSubscription(newPlanId: string, billingPeriod?: 'monthly' | 'yearly'): Promise<ServiceResult<Subscription>>
  cancelSubscription(immediate?: boolean, reason?: string): Promise<ServiceResult<void>>
  resumeSubscription(): Promise<ServiceResult<Subscription>>
  getAIUsageStats(): Promise<ServiceResult<AIUsageStats>>
  checkAILimits(agentType: string): Promise<ServiceResult<LimitCheckResult>>
  getPaymentMethods(): Promise<ServiceResult<PaymentMethod[]>>
  addPaymentMethod(paymentMethodId: string, setDefault?: boolean): Promise<ServiceResult<PaymentMethod>>
  getInvoices(): Promise<ServiceResult<Invoice[]>>
  getUpcomingInvoice(): Promise<ServiceResult<Invoice>>
}

// Real implementation
class RealSubscriptionService implements ISubscriptionService {
  private readonly baseUrl = '/api/v1/accounts/subscriptions'
  private readonly billingUrl = '/api/v1/accounts/billing'
  private readonly aiStatsUrl = '/api/v1/ai-assistant/user'
  
  private mapSubscriptionResponse(data: {
    subscription?: {
      plan_id?: string
      plan_name?: string
      status?: string
      billing_period?: string
      current_period_end?: string
      created_at?: string
    }
    plan?: string
    status?: string
    ai_credits?: number
    ai_credits_used?: number
  }): Subscription {
    return {
      plan_id: data.subscription?.plan_id || data.plan || 'free',
      plan_name: data.subscription?.plan_name || 'Free Plan',
      status: data.subscription?.status || data.status || 'none',
      billing_period: data.subscription?.billing_period || 'monthly',
      current_period_start: data.subscription?.current_period_start || new Date().toISOString(),
      current_period_end: data.subscription?.current_period_end || new Date().toISOString(),
      cancel_at_period_end: data.subscription?.cancel_at_period_end || false,
      trial_end: data.subscription?.trial_end,
      is_trial: data.subscription?.is_trial || false,
      days_until_renewal: data.subscription?.days_until_renewal,
      features: data.features || {
        ai_chat: true,
        ai_hints: false,
        ai_quiz: false,
        ai_reflection: false,
        ai_path: false,
        priority_support: false
      }
    }
  }
  
  async getCurrentSubscription(): Promise<ServiceResult<Subscription>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.get(`${this.baseUrl}/current/`)
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: this.mapSubscriptionResponse(response.data) }
    } catch (error: unknown) {
      return { error: error.message || 'Failed to fetch subscription' }
    }
  }
  
  async getAvailablePlans(): Promise<ServiceResult<Plan[]>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.get(`${this.baseUrl}/plans/`)
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: (response.data as any).plans || [] }
    } catch (error: unknown) {
      return { error: error.message || 'Failed to fetch plans' }
    }
  }
  
  async createSubscription(
    planId: string,
    billingPeriod: 'monthly' | 'yearly',
    paymentMethodId?: string
  ): Promise<ServiceResult<Subscription>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.post(`${this.baseUrl}/create/`, {
        plan_id: planId,
        billing_period: billingPeriod,
        payment_method_id: paymentMethodId,
        trial: true
      })
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: this.mapSubscriptionResponse(response.data) }
    } catch (error: unknown) {
      return { error: error.message || 'Failed to create subscription' }
    }
  }
  
  async updateSubscription(
    newPlanId: string,
    billingPeriod?: 'monthly' | 'yearly'
  ): Promise<ServiceResult<Subscription>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const payload = { new_plan_id: newPlanId }
      if (billingPeriod) {
        payload.billing_period = billingPeriod
      }
      
      const response = await apiClient.put(`${this.baseUrl}/update/`, payload)
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: this.mapSubscriptionResponse(response.data) }
    } catch (error: unknown) {
      return { error: error.message || 'Failed to update subscription' }
    }
  }
  
  async cancelSubscription(immediate: boolean = false, reason?: string): Promise<ServiceResult<void>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.post(`${this.baseUrl}/cancel/`, {
        immediate,
        reason
      })
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: undefined }
    } catch (error: unknown) {
      return { error: error.message || 'Failed to cancel subscription' }
    }
  }
  
  async resumeSubscription(): Promise<ServiceResult<Subscription>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.post(`${this.baseUrl}/resume/`)
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: this.mapSubscriptionResponse(response.data) }
    } catch (error: unknown) {
      return { error: error.message || 'Failed to resume subscription' }
    }
  }
  
  async getAIUsageStats(): Promise<ServiceResult<AIUsageStats>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.get(`${this.aiStatsUrl}/ai-stats/`)
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: response.data as AIUsageStats }
    } catch (error: unknown) {
      return { error: error.message || 'Failed to fetch AI usage stats' }
    }
  }
  
  async checkAILimits(agentType: string): Promise<ServiceResult<LimitCheckResult>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.post(`${this.aiStatsUrl}/check-limits/`, {
        agent_type: agentType
      })
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: response.data as LimitCheckResult }
    } catch (error: unknown) {
      return { error: error.message || 'Failed to check AI limits' }
    }
  }
  
  async getPaymentMethods(): Promise<ServiceResult<PaymentMethod[]>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.get(`${this.billingUrl}/payment-methods/`)
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: (response.data as any).payment_methods || [] }
    } catch (error: unknown) {
      return { error: error.message || 'Failed to fetch payment methods' }
    }
  }
  
  async addPaymentMethod(
    paymentMethodId: string,
    setDefault: boolean = false
  ): Promise<ServiceResult<PaymentMethod>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.post(`${this.billingUrl}/add-payment-method/`, {
        payment_method_id: paymentMethodId,
        set_default: setDefault
      })
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: (response.data as any).payment_method }
    } catch (error: unknown) {
      return { error: error.message || 'Failed to add payment method' }
    }
  }
  
  async getInvoices(): Promise<ServiceResult<Invoice[]>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.get(`${this.billingUrl}/invoices/`)
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: (response.data as any).invoices || [] }
    } catch (error: unknown) {
      return { error: error.message || 'Failed to fetch invoices' }
    }
  }
  
  async getUpcomingInvoice(): Promise<ServiceResult<Invoice>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.get(`${this.billingUrl}/upcoming-invoice/`)
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: (response.data as any).upcoming_invoice }
    } catch (error: unknown) {
      return { error: error.message || 'Failed to fetch upcoming invoice' }
    }
  }
}

// Mock implementation for development
class MockSubscriptionService implements ISubscriptionService {
  async getCurrentSubscription(): Promise<ServiceResult<Subscription>> {
    return {
      data: {
        plan_id: 'premium',
        plan_name: 'Premium Plan',
        status: 'active',
        billing_period: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
        days_until_renewal: 30,
        features: {
          ai_chat: true,
          ai_hints: true,
          ai_quiz: true,
          ai_reflection: true,
          ai_path: false,
          priority_support: true
        }
      }
    }
  }
  
  async getAvailablePlans(): Promise<ServiceResult<Plan[]>> {
    return {
      data: [
        {
          id: 'free',
          name: 'Free',
          display_name: 'Free Plan',
          description: 'Get started with basic AI features',
          price_monthly: 0,
          price_yearly: 0,
          ai_daily_limit: 3,
          ai_monthly_limit: 50,
          trial_days: 0,
          features: {
            ai_chat: true,
            ai_hints: false,
            ai_quiz: false,
            ai_reflection: false,
            ai_path: false,
            priority_support: false
          },
          is_featured: false
        },
        {
          id: 'premium',
          name: 'Premium',
          display_name: 'Premium Plan',
          description: 'Unlock advanced AI features',
          price_monthly: 19.99,
          price_yearly: 199.99,
          ai_daily_limit: 50,
          ai_monthly_limit: 1000,
          trial_days: 14,
          features: {
            ai_chat: true,
            ai_hints: true,
            ai_quiz: true,
            ai_reflection: true,
            ai_path: false,
            priority_support: true
          },
          is_featured: true
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          display_name: 'Enterprise Plan',
          description: 'Maximum AI capabilities',
          price_monthly: 49.99,
          price_yearly: 499.99,
          ai_daily_limit: 200,
          ai_monthly_limit: 5000,
          trial_days: 14,
          features: {
            ai_chat: true,
            ai_hints: true,
            ai_quiz: true,
            ai_reflection: true,
            ai_path: true,
            priority_support: true,
            custom_models: true
          },
          is_featured: false
        }
      ]
    }
  }
  
  async createSubscription(): Promise<ServiceResult<Subscription>> {
    return this.getCurrentSubscription()
  }
  
  async updateSubscription(): Promise<ServiceResult<Subscription>> {
    return this.getCurrentSubscription()
  }
  
  async cancelSubscription(): Promise<ServiceResult<void>> {
    return { data: undefined }
  }
  
  async resumeSubscription(): Promise<ServiceResult<Subscription>> {
    return this.getCurrentSubscription()
  }
  
  async getAIUsageStats(): Promise<ServiceResult<AIUsageStats>> {
    return {
      data: {
        subscription_plan: 'premium',
        subscription_status: 'active',
        usage_today: 15,
        usage_this_period: 345,
        daily_limit: 50,
        monthly_limit: 1000,
        remaining_today: 35,
        remaining_this_period: 655,
        daily_usage_percentage: 30,
        monthly_usage_percentage: 34.5,
        features: {
          ai_chat: true,
          ai_hints: true,
          ai_quiz: true,
          ai_reflection: true,
          ai_path: false,
          priority_support: true
        },
        days_until_renewal: 30
      }
    }
  }
  
  async checkAILimits(): Promise<ServiceResult<LimitCheckResult>> {
    return {
      data: {
        can_use_ai: true,
        remaining_interactions: 35,
        daily_limit: 50,
        monthly_limit: 1000,
        subscription_plan: 'premium',
        upgrade_required: false
      }
    }
  }
  
  async getPaymentMethods(): Promise<ServiceResult<PaymentMethod[]>> {
    return {
      data: [
        {
          id: 'pm_mock',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2027
          },
          is_default: true,
          created_at: new Date().toISOString()
        }
      ]
    }
  }
  
  async addPaymentMethod(): Promise<ServiceResult<PaymentMethod>> {
    return {
      data: {
        id: 'pm_new_mock',
        type: 'card',
        card: {
          brand: 'mastercard',
          last4: '5555',
          exp_month: 6,
          exp_year: 2028
        },
        is_default: true,
        created_at: new Date().toISOString()
      }
    }
  }
  
  async getInvoices(): Promise<ServiceResult<Invoice[]>> {
    return {
      data: [
        {
          id: 'inv_mock',
          number: 'INV-2025-001',
          status: 'paid',
          amount: 19.99,
          currency: 'USD',
          period_start: new Date().toISOString(),
          period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          paid_at: new Date().toISOString(),
          items: [
            {
              description: 'Premium Plan (Monthly)',
              amount: 19.99
            }
          ]
        }
      ]
    }
  }
  
  async getUpcomingInvoice(): Promise<ServiceResult<Invoice>> {
    return {
      data: {
        id: 'inv_upcoming_mock',
        number: 'UPCOMING',
        status: 'draft',
        amount: 19.99,
        currency: 'USD',
        period_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            description: 'Premium Plan (Monthly)',
            amount: 19.99
          }
        ]
      }
    }
  }
}

// Export with feature flag - subscription service works independently of AI service
const useRealSubscriptions = process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS === 'true' && 
                             process.env.NEXT_PUBLIC_USE_REAL_BACKEND === 'true'

export const subscriptionService: ISubscriptionService = useRealSubscriptions
  ? new RealSubscriptionService()
  : new MockSubscriptionService()

// Export for testing
export { MockSubscriptionService, RealSubscriptionService }
import { StateCreator } from 'zustand'
import { 
  subscriptionService, 
  type Subscription, 
  type Plan, 
  type AIUsageStats, 
  type PaymentMethod, 
  type Invoice 
} from '@/services/subscription-service'

// Subscription state interface
export interface SubscriptionState {
  currentSubscription: Subscription | null
  availablePlans: Plan[]
  usageStats: AIUsageStats | null
  paymentMethods: PaymentMethod[]
  invoices: Invoice[]
  upcomingInvoice: Invoice | null
  loading: boolean
  error: string | null
  // UI state
  showUpgradeModal: boolean
  selectedPlan: Plan | null
  billingPeriod: 'monthly' | 'yearly'
}

// Subscription actions interface
export interface SubscriptionActions {
  // Subscription management
  loadCurrentSubscription: () => Promise<void>
  loadAvailablePlans: () => Promise<void>
  createSubscription: (planId: string, billingPeriod: 'monthly' | 'yearly', paymentMethodId?: string) => Promise<boolean>
  updateSubscription: (newPlanId: string, billingPeriod?: 'monthly' | 'yearly') => Promise<boolean>
  cancelSubscription: (immediate?: boolean, reason?: string) => Promise<boolean>
  resumeSubscription: () => Promise<boolean>
  
  // Usage and stats
  refreshUsageStats: () => Promise<void>
  checkCanUseFeature: (feature: keyof Subscription['features']) => boolean
  
  // Billing management
  loadPaymentMethods: () => Promise<void>
  addPaymentMethod: (paymentMethodId: string, setDefault?: boolean) => Promise<boolean>
  loadInvoices: () => Promise<void>
  loadUpcomingInvoice: () => Promise<void>
  
  // UI actions
  showUpgradePrompt: (plan?: Plan) => void
  hideUpgradeModal: () => void
  setBillingPeriod: (period: 'monthly' | 'yearly') => void
  
  // Utility actions
  clearError: () => void
  resetSubscriptionState: () => void
}

export interface SubscriptionSlice extends SubscriptionState, SubscriptionActions {}

const initialState: SubscriptionState = {
  currentSubscription: null,
  availablePlans: [],
  usageStats: null,
  paymentMethods: [],
  invoices: [],
  upcomingInvoice: null,
  loading: false,
  error: null,
  showUpgradeModal: false,
  selectedPlan: null,
  billingPeriod: 'monthly',
}

export const createSubscriptionSlice: StateCreator<SubscriptionSlice> = (set, get) => ({
  ...initialState,

  // Subscription management
  loadCurrentSubscription: async () => {
    set({ loading: true, error: null })
    
    try {
      const result = await subscriptionService.getCurrentSubscription()
      
      if (result.error) {
        set({ loading: false, error: result.error })
        return
      }
      
      set({ 
        currentSubscription: result.data || null,
        loading: false 
      })
      
      // Also refresh usage stats when loading subscription
      await get().refreshUsageStats()
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load subscription' 
      })
    }
  },

  loadAvailablePlans: async () => {
    set({ loading: true, error: null })
    
    try {
      const result = await subscriptionService.getAvailablePlans()
      
      if (result.error) {
        set({ loading: false, error: result.error })
        return
      }
      
      set({ 
        availablePlans: result.data || [],
        loading: false 
      })
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load plans' 
      })
    }
  },

  createSubscription: async (planId: string, billingPeriod: 'monthly' | 'yearly', paymentMethodId?: string) => {
    set({ loading: true, error: null })
    
    try {
      const result = await subscriptionService.createSubscription(planId, billingPeriod, paymentMethodId)
      
      if (result.error) {
        set({ loading: false, error: result.error })
        return false
      }
      
      set({ 
        currentSubscription: result.data || null,
        loading: false,
        showUpgradeModal: false 
      })
      
      // Refresh usage stats after subscription creation
      await get().refreshUsageStats()
      
      return true
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to create subscription' 
      })
      return false
    }
  },

  updateSubscription: async (newPlanId: string, billingPeriod?: 'monthly' | 'yearly') => {
    set({ loading: true, error: null })
    
    try {
      const result = await subscriptionService.updateSubscription(newPlanId, billingPeriod)
      
      if (result.error) {
        set({ loading: false, error: result.error })
        return false
      }
      
      set({ 
        currentSubscription: result.data || null,
        loading: false,
        showUpgradeModal: false 
      })
      
      // Refresh usage stats after subscription update
      await get().refreshUsageStats()
      
      return true
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to update subscription' 
      })
      return false
    }
  },

  cancelSubscription: async (immediate: boolean = false, reason?: string) => {
    set({ loading: true, error: null })
    
    try {
      const result = await subscriptionService.cancelSubscription(immediate, reason)
      
      if (result.error) {
        set({ loading: false, error: result.error })
        return false
      }
      
      // Update current subscription status
      set((state) => ({
        currentSubscription: state.currentSubscription 
          ? { ...state.currentSubscription, cancel_at_period_end: true }
          : null,
        loading: false 
      }))
      
      return true
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to cancel subscription' 
      })
      return false
    }
  },

  resumeSubscription: async () => {
    set({ loading: true, error: null })
    
    try {
      const result = await subscriptionService.resumeSubscription()
      
      if (result.error) {
        set({ loading: false, error: result.error })
        return false
      }
      
      set({ 
        currentSubscription: result.data || null,
        loading: false 
      })
      
      return true
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to resume subscription' 
      })
      return false
    }
  },

  // Usage and stats
  refreshUsageStats: async () => {
    try {
      const result = await subscriptionService.getAIUsageStats()
      
      if (result.data) {
        set({ usageStats: result.data })
      }
    } catch (error) {
      console.error('Failed to refresh usage stats:', error)
    }
  },

  checkCanUseFeature: (feature: keyof Subscription['features']) => {
    const { currentSubscription } = get()
    
    if (!currentSubscription) {
      // Check free tier features
      const freeFeatures = {
        ai_chat: true,
        ai_hints: false,
        ai_quiz: false,
        ai_reflection: false,
        ai_path: false,
        priority_support: false,
      }
      return freeFeatures[feature] || false
    }
    
    return currentSubscription.features[feature] || false
  },

  // Billing management
  loadPaymentMethods: async () => {
    set({ loading: true, error: null })
    
    try {
      const result = await subscriptionService.getPaymentMethods()
      
      if (result.error) {
        set({ loading: false, error: result.error })
        return
      }
      
      set({ 
        paymentMethods: result.data || [],
        loading: false 
      })
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load payment methods' 
      })
    }
  },

  addPaymentMethod: async (paymentMethodId: string, setDefault: boolean = false) => {
    set({ loading: true, error: null })
    
    try {
      const result = await subscriptionService.addPaymentMethod(paymentMethodId, setDefault)
      
      if (result.error) {
        set({ loading: false, error: result.error })
        return false
      }
      
      // Add to payment methods list
      set((state) => ({
        paymentMethods: [...state.paymentMethods, result.data!],
        loading: false 
      }))
      
      return true
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to add payment method' 
      })
      return false
    }
  },

  loadInvoices: async () => {
    set({ loading: true, error: null })
    
    try {
      const result = await subscriptionService.getInvoices()
      
      if (result.error) {
        set({ loading: false, error: result.error })
        return
      }
      
      set({ 
        invoices: result.data || [],
        loading: false 
      })
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load invoices' 
      })
    }
  },

  loadUpcomingInvoice: async () => {
    try {
      const result = await subscriptionService.getUpcomingInvoice()
      
      if (result.data) {
        set({ upcomingInvoice: result.data })
      }
    } catch (error) {
      console.error('Failed to load upcoming invoice:', error)
    }
  },

  // UI actions
  showUpgradePrompt: (plan?: Plan) => {
    set({ 
      showUpgradeModal: true,
      selectedPlan: plan || null 
    })
    
    // Load plans if not already loaded
    const { availablePlans } = get()
    if (availablePlans.length === 0) {
      get().loadAvailablePlans()
    }
  },

  hideUpgradeModal: () => {
    set({ 
      showUpgradeModal: false,
      selectedPlan: null 
    })
  },

  setBillingPeriod: (period: 'monthly' | 'yearly') => {
    set({ billingPeriod: period })
  },

  // Utility actions
  clearError: () => {
    set({ error: null })
  },

  resetSubscriptionState: () => {
    set(initialState)
  },
})
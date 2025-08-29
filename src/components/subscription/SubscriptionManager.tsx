"use client"

import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Sparkles, 
  CreditCard, 
  Calendar,
  ArrowUpRight,
  AlertCircle,
  Loader2
} from 'lucide-react'
import type { Plan } from '@/services/subscription-service'

// Helper function to format feature names
const formatFeatureName = (key: string): string => {
  const featureNames: Record<string, string> = {
    ai_chat: 'AI Chat',
    ai_hints: 'Smart Hints',
    ai_quiz: 'AI Quizzes',
    ai_reflection: 'Reflection Prompts',
    ai_path: 'Learning Paths',
    priority_support: 'Priority Support',
    unlimited_courses: 'Unlimited Courses',
    advanced_analytics: 'Advanced Analytics',
    custom_models: 'Custom AI Models',
    api_access: 'API Access',
    white_label: 'White Label',
    dedicated_support: 'Dedicated Support'
  }
  return featureNames[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Plan card component
const PlanCard: React.FC<{
  plan: Plan
  billingPeriod: 'monthly' | 'yearly'
  currentPlan?: string
  onSelect: (planId: string) => void
  loading: boolean
}> = ({ plan, billingPeriod, currentPlan, onSelect, loading }) => {
  const isCurrentPlan = currentPlan === plan.id
  const price = billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly
  const yearlyDiscount = billingPeriod === 'yearly' && plan.price_monthly > 0 
    ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
    : 0
    
  return (
    <Card className={`relative ${plan.is_featured ? 'border-primary shadow-lg' : ''} ${isCurrentPlan ? 'bg-muted/50' : ''}`}>
      {plan.is_featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary">Most Popular</Badge>
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{plan.display_name}</CardTitle>
          {isCurrentPlan && <Badge variant="outline">Current</Badge>}
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Pricing */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">${price}</span>
            <span className="text-muted-foreground">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
          {yearlyDiscount > 0 && (
            <Badge variant="secondary" className="text-xs">
              Save {yearlyDiscount}% yearly
            </Badge>
          )}
        </div>
        
        {/* AI Limits */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Daily AI Limit</span>
            <span className="font-medium">{plan.ai_daily_limit}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Monthly AI Limit</span>
            <span className="font-medium">{plan.ai_monthly_limit.toLocaleString()}</span>
          </div>
        </div>
        
        <Separator />
        
        {/* Features */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Features</h4>
          <div className="space-y-1">
            {Object.entries(plan.features).slice(0, 6).map(([key, enabled]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                {enabled ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={enabled ? '' : 'text-muted-foreground'}>
                  {formatFeatureName(key)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Action Button */}
        <Button
          className="w-full"
          variant={isCurrentPlan ? 'outline' : plan.is_featured ? 'default' : 'secondary'}
          disabled={isCurrentPlan || loading}
          onClick={() => onSelect(plan.id)}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : plan.trial_days > 0 ? (
            `Start ${plan.trial_days}-day Free Trial`
          ) : (
            'Select Plan'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export function SubscriptionManager() {
  const { 
    currentSubscription,
    availablePlans,
    usageStats,
    billingPeriod,
    loading,
    error,
    loadCurrentSubscription,
    loadAvailablePlans,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    resumeSubscription,
    setBillingPeriod,
    clearError,
    refreshUsageStats
  } = useAppStore()
  
  const [selectedTab, setSelectedTab] = useState('overview')
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  
  useEffect(() => {
    // Load data on mount
    loadCurrentSubscription()
    loadAvailablePlans()
    refreshUsageStats()
    
    // Refresh usage stats every minute
    const interval = setInterval(refreshUsageStats, 60000)
    return () => clearInterval(interval)
  }, [loadCurrentSubscription, loadAvailablePlans, refreshUsageStats])
  
  const handleSelectPlan = async (planId: string) => {
    if (currentSubscription) {
      // Update existing subscription
      await updateSubscription(planId, billingPeriod)
    } else {
      // Create new subscription
      await createSubscription(planId, billingPeriod)
    }
  }
  
  const handleCancelSubscription = async () => {
    if (!showCancelConfirm) {
      setShowCancelConfirm(true)
      return
    }
    
    const success = await cancelSubscription(false, cancelReason)
    if (success) {
      setShowCancelConfirm(false)
      setCancelReason('')
    }
  }
  
  const handleResumeSubscription = async () => {
    await resumeSubscription()
  }
  
  const usagePercentage = usageStats 
    ? (usageStats.usage_today / usageStats.daily_limit) * 100
    : 0
    
  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center justify-between pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Current Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              {currentSubscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{currentSubscription.plan_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={currentSubscription.status === 'active' ? 'default' : 'secondary'}>
                          {currentSubscription.status}
                        </Badge>
                        {currentSubscription.is_trial && (
                          <Badge variant="outline">Trial</Badge>
                        )}
                        {currentSubscription.cancel_at_period_end && (
                          <Badge variant="destructive">Canceling</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {currentSubscription.cancel_at_period_end ? 'Ends on' : 'Renews on'}
                      </p>
                      <p className="font-medium">
                        {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Usage Stats */}
                  {usageStats && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>AI Interactions Today</span>
                          <span className="font-medium">
                            {usageStats.usage_today}/{usageStats.daily_limit}
                          </span>
                        </div>
                        <Progress value={usagePercentage} className="h-2" />
                        {usagePercentage >= 80 && (
                          <p className="text-xs text-warning mt-1">
                            {usageStats.remaining_today} interactions remaining today
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Monthly Usage</span>
                          <span className="font-medium">
                            {usageStats.usage_this_period}/{usageStats.monthly_limit}
                          </span>
                        </div>
                        <Progress 
                          value={(usageStats.usage_this_period / usageStats.monthly_limit) * 100} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* Features */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Active Features</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(currentSubscription.features).map(([key, enabled]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          {enabled ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={enabled ? '' : 'text-muted-foreground line-through'}>
                            {formatFeatureName(key)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    {currentSubscription.cancel_at_period_end ? (
                      <Button onClick={handleResumeSubscription} className="flex-1">
                        Resume Subscription
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedTab('plans')}
                          className="flex-1"
                        >
                          Change Plan
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleCancelSubscription}
                          className="flex-1"
                        >
                          {showCancelConfirm ? 'Confirm Cancel' : 'Cancel Subscription'}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {showCancelConfirm && (
                    <div className="space-y-2 p-4 bg-destructive/10 rounded-lg">
                      <p className="text-sm font-medium">Are you sure you want to cancel?</p>
                      <p className="text-xs text-muted-foreground">
                        You&apos;ll retain access until {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleCancelSubscription}
                      >
                        Yes, Cancel Subscription
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCancelConfirm(false)}
                        className="ml-2"
                      >
                        Keep Subscription
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">You&apos;re on the Free plan</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upgrade to unlock advanced AI features and higher limits
                  </p>
                  <Button onClick={() => setSelectedTab('plans')}>
                    View Upgrade Options
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          {/* Billing Period Toggle */}
          <Card>
            <CardContent className="pt-6">
              <RadioGroup 
                value={billingPeriod} 
                onValueChange={(v) => setBillingPeriod(v as 'monthly' | 'yearly')}
                className="flex items-center justify-center gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly">Monthly Billing</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly" className="flex items-center gap-2">
                    Yearly Billing
                    <Badge variant="secondary">Save 20%</Badge>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
          
          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {availablePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingPeriod={billingPeriod}
                currentPlan={currentSubscription?.plan_id}
                onSelect={handleSelectPlan}
                loading={loading}
              />
            ))}
          </div>
        </TabsContent>
        
        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5" />
                  <div>
                    <p className="font-medium">•••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2027</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No invoices yet. Your first invoice will appear here after your first payment.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
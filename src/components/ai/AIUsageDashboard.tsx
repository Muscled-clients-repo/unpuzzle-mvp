"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  Zap, 
  MessageSquare,
  Lightbulb,
  HelpCircle,
  Brain,
  Route,
  DollarSign,
  Calendar,
  RefreshCw
} from 'lucide-react'
import type { AIUsageStats } from '@/services/subscription-service'

// Helper to format agent type names
const formatAgentType = (type: string): string => {
  const typeNames: Record<string, string> = {
    chat: 'AI Chat',
    hint: 'Smart Hints',
    quiz: 'Quizzes',
    reflection: 'Reflections',
    path: 'Learning Paths'
  }
  return typeNames[type] || type
}

// Helper to get agent icon
const getAgentIcon = (type: string) => {
  switch (type) {
    case 'chat':
      return <MessageSquare className="h-4 w-4" />
    case 'hint':
      return <Lightbulb className="h-4 w-4" />
    case 'quiz':
      return <HelpCircle className="h-4 w-4" />
    case 'reflection':
      return <Brain className="h-4 w-4" />
    case 'path':
      return <Route className="h-4 w-4" />
    default:
      return <Zap className="h-4 w-4" />
  }
}

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-2 w-full mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      {[...Array(2)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)

// Simple bar chart component
const SimpleBarChart: React.FC<{
  data: Array<{ label: string; value: number; icon?: React.ReactNode }>
  maxValue?: number
  showValues?: boolean
  color?: string
}> = ({ data, maxValue, showValues = true, color = 'hsl(var(--primary))' }) => {
  const max = maxValue || Math.max(...data.map(d => d.value))
  
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {item.icon}
              <span>{item.label}</span>
            </div>
            {showValues && (
              <span className="font-medium">{item.value}</span>
            )}
          </div>
          <div className="h-6 bg-muted rounded-md overflow-hidden">
            <div 
              className="h-full transition-all duration-500 ease-out rounded-md"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: color
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AIUsageDashboard() {
  const { 
    usageStats,
    refreshUsageStats,
    currentSubscription,
    showUpgradePrompt
  } = useAppStore()
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  const loadStats = useCallback(async () => {
    if (!refreshing) {
      await refreshUsageStats()
      setLoading(false)
    }
  }, [refreshing, refreshUsageStats])
  
  useEffect(() => {
    loadStats()
    // Refresh every minute
    const interval = setInterval(loadStats, 60000)
    return () => clearInterval(interval)
  }, [loadStats])
  
  const handleManualRefresh = async () => {
    setRefreshing(true)
    await refreshUsageStats()
    setRefreshing(false)
  }
  
  if (loading && !usageStats) return <LoadingSkeleton />
  if (!usageStats) return null
  
  const dailyUsagePercent = (usageStats.usage_today / usageStats.daily_limit) * 100
  const monthlyUsagePercent = (usageStats.usage_this_period / usageStats.monthly_limit) * 100
  const isNearDailyLimit = dailyUsagePercent >= 80
  const isNearMonthlyLimit = monthlyUsagePercent >= 80
  
  // Prepare chart data
  const dailyBreakdownData = usageStats.daily_breakdown?.map(item => ({
    label: formatAgentType(item.agent_type),
    value: item.count,
    icon: getAgentIcon(item.agent_type)
  })) || []
  
  const costBreakdownData = usageStats.period_breakdown?.map(item => ({
    label: formatAgentType(item.agent_type),
    value: parseFloat(item.cost || '0'),
    icon: getAgentIcon(item.agent_type)
  })) || []
  
  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Usage Analytics</h2>
          <p className="text-muted-foreground">
            Monitor your AI interactions and usage limits
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Today's Usage */}
        <Card className={isNearDailyLimit ? 'border-warning' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Today&apos;s Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.usage_today}</div>
            <Progress value={dailyUsagePercent} className="h-1 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {usageStats.remaining_today} of {usageStats.daily_limit} remaining
            </p>
            {isNearDailyLimit && (
              <p className="text-xs text-warning mt-1 font-medium">
                Approaching daily limit!
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Monthly Usage */}
        <Card className={isNearMonthlyLimit ? 'border-warning' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Monthly Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.usage_this_period}</div>
            <Progress value={monthlyUsagePercent} className="h-1 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {usageStats.remaining_this_period} of {usageStats.monthly_limit} remaining
            </p>
            {isNearMonthlyLimit && (
              <p className="text-xs text-warning mt-1 font-medium">
                80% of monthly limit used
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Current Plan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="text-lg mb-2" variant="default">
              {usageStats.subscription_plan}
            </Badge>
            <p className="text-xs text-muted-foreground">
              Status: {usageStats.subscription_status || 'Active'}
            </p>
            {usageStats.days_until_renewal && (
              <p className="text-xs text-muted-foreground mt-1">
                Renews in {usageStats.days_until_renewal} days
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Reset Timer */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Daily Reset
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageStats.reset_time ? (
                (() => {
                  const resetDate = new Date(usageStats.reset_time)
                  const now = new Date()
                  const diff = resetDate.getTime() - now.getTime()
                  const hours = Math.floor(diff / (1000 * 60 * 60))
                  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                  return `${hours}h ${minutes}m`
                })()
              ) : (
                '24h'
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Until daily limit resets
            </p>
            <p className="text-xs text-muted-foreground">
              Midnight UTC daily
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Usage Breakdown Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Daily Usage by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Usage by AI Agent Type</span>
              <Badge variant="outline">Today</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyBreakdownData.length > 0 ? (
              <SimpleBarChart 
                data={dailyBreakdownData}
                color="hsl(var(--primary))"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No AI usage today</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Monthly Cost Analysis</span>
              <Badge variant="outline">
                ${costBreakdownData.reduce((sum, item) => sum + item.value, 0).toFixed(2)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {costBreakdownData.length > 0 ? (
              <div className="space-y-3">
                {costBreakdownData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      {item.icon}
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">${item.value.toFixed(2)}</span>
                      {usageStats.period_breakdown?.[i]?.count && (
                        <p className="text-xs text-muted-foreground">
                          {usageStats.period_breakdown[i].count} uses
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No costs this period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Features Grid */}
      <Card>
        <CardHeader>
          <CardTitle>AI Features Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(usageStats.features).map(([key, enabled]) => (
              <div 
                key={key}
                className={`p-3 rounded-lg border text-center ${
                  enabled ? 'bg-primary/5 border-primary/20' : 'bg-muted border-muted-foreground/20'
                }`}
              >
                <div className={`text-2xl mb-1 ${enabled ? 'text-primary' : 'text-muted-foreground'}`}>
                  {enabled ? '✓' : '✗'}
                </div>
                <p className={`text-xs ${enabled ? '' : 'text-muted-foreground'}`}>
                  {key.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Upgrade Prompt */}
      {(isNearDailyLimit || isNearMonthlyLimit) && currentSubscription?.plan_id === 'free' && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Need More AI Interactions?</h3>
                <p className="text-sm text-muted-foreground">
                  Upgrade to Premium for 50 daily interactions and advanced features
                </p>
              </div>
              <Button onClick={() => showUpgradePrompt()}>
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
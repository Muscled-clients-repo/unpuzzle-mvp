'use client'

import React from 'react'
import { ConversationIntegrationV2 } from '@/components/conversation/ConversationIntegrationV2'
import { useAppStore } from '@/stores/app-store'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function StudentGoalDashboard() {
  const { user } = useAppStore()

  // Fetch student's assigned goal from their profile
  const { data: goalData, isLoading: goalLoading } = useQuery({
    queryKey: ['student-goal', user?.id],
    staleTime: 0, // Force fresh data
    cacheTime: 0, // Don't cache
    queryFn: async () => {
      if (!user?.id) return null

      const supabase = createClient()

      // Get student's current goal assignment
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          current_goal_id,
          goal_assigned_at,
          track_goals (
            id,
            name,
            description,
            target_amount,
            currency,
            goal_type,
            tracks (
              name
            )
          )
        `)
        .eq('id', user.id)
        .single()

      console.log('🔍 DEBUG StudentGoalDashboard query result:', { profile, profileError })

      if (profileError || !profile?.current_goal_id) {
        console.log('🔍 DEBUG No goal assigned or error:', { profileError, hasGoal: !!profile?.current_goal_id })
        return null
      }

      // Transform to goalProgress format expected by DailyGoalTrackerV2
      const goal = profile.track_goals
      const startDate = profile.goal_assigned_at || new Date().toISOString()

      console.log('🔍 DEBUG Goal data transformation:', {
        goalAssignedAt: profile.goal_assigned_at,
        startDate,
        goalName: goal?.name,
        goalDescription: goal?.description
      })

      // Format target amount from structured data
      const formatTargetAmount = (amount: number, currency: string = 'USD') => {
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })
        return formatter.format(amount)
      }

      return {
        id: goal.id,
        title: goal.name || goal.description, // Use clean goal name
        currentAmount: '$0', // This should come from actual progress tracking
        targetAmount: formatTargetAmount(goal.target_amount || 1000, goal.currency || 'USD'),
        progress: 0, // This should come from actual progress calculation
        targetDate: new Date(new Date(startDate).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from start
        startDate: startDate.split('T')[0],
        status: 'active',
        description: goal.description,
        trackName: goal.tracks?.name
      }
    },
    enabled: !!user?.id
  })

  // Show loading if no user yet
  if (!user?.id || goalLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user session...</p>
        </div>
      </div>
    )
  }

  // Production unified conversation system
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <ConversationIntegrationV2
        studentId={user.id}
        isInstructorView={false}
        enableUnifiedSystem={true}
        goalProgress={goalData}
      />
    </div>
  )
}
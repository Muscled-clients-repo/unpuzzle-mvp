'use client'

import React from 'react'
import { ConversationIntegrationV2 } from '@/components/conversation/ConversationIntegrationV2'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/common'

interface InstructorStudentGoalTrackerProps {
  studentId: string
  instructorId: string
}

export function InstructorStudentGoalTracker({
  studentId,
  instructorId
}: InstructorStudentGoalTrackerProps) {
  // Fetch the same real goal data that student view uses
  const { data: goalData, isLoading: goalLoading, refetch: refetchGoalData } = useQuery({
    queryKey: ['instructor-student-goal', studentId],
    queryFn: async () => {
      if (!studentId) return null

      const supabase = createClient()

      // Get student's current goal assignment - same query as StudentGoalDashboard
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          current_goal_id,
          goal_assigned_at,
          total_revenue_earned,
          current_mrr,
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
        .eq('id', studentId)
        .single()

      if (profileError || !profile?.current_goal_id) {
        return null
      }

      // Transform to goalProgress format expected by DailyGoalTrackerV2
      const goal = profile.track_goals
      const startDate = profile.goal_assigned_at || new Date().toISOString()

      // Get current amount based on track type
      const isSaasTrack = goal.tracks?.name?.toLowerCase().includes('saas')
      const currentRevenueAmount = isSaasTrack ? profile.current_mrr : profile.total_revenue_earned
      const targetAmount = goal.target_amount || 1000

      // Format target amount from structured data
      const formatAmount = (amount: number, currency: string = 'USD') => {
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })
        return formatter.format(amount)
      }

      // Calculate progress percentage
      const progressPercentage = targetAmount > 0 ? Math.min((currentRevenueAmount / targetAmount) * 100, 100) : 0

      return {
        id: goal.id,
        title: goal.name || goal.description, // Use clean goal name
        currentAmount: formatAmount(currentRevenueAmount || 0, goal.currency || 'USD'),
        targetAmount: formatAmount(targetAmount, goal.currency || 'USD'),
        progress: progressPercentage,
        targetDate: new Date(new Date(startDate).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from start
        startDate: startDate.split('T')[0],
        status: 'active',
        description: goal.description,
        trackName: goal.tracks?.name
      }
    },
    enabled: !!studentId
  })

  if (goalLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ConversationIntegrationV2
        studentId={studentId}
        instructorId={instructorId}
        isInstructorView={true}
        enableUnifiedSystem={true}
        goalProgress={goalData} // Now pass the real goal data
        onGoalProgressUpdate={refetchGoalData} // Pass refetch function
      />
    </div>
  )
}
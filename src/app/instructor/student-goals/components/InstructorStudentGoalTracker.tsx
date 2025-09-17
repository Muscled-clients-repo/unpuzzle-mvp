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
  const { data: goalData, isLoading: goalLoading } = useQuery({
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
          track_goals (
            id,
            name,
            description,
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

      // Extract target amount from goal name
      const getTargetAmount = (goalName: string) => {
        if (goalName.includes('1k')) return '$1,000'
        if (goalName.includes('3k')) return '$3,000'
        if (goalName.includes('5k')) return '$5,000'
        if (goalName.includes('10k')) return '$10,000'
        if (goalName.includes('20k')) return '$20,000'
        if (goalName.includes('30k')) return '$30,000'
        if (goalName.includes('50k')) return '$50,000'
        if (goalName.includes('100k')) return '$100,000'
        if (goalName.includes('250k')) return '$250,000'
        if (goalName.includes('500k')) return '$500,000'
        return '$1,000' // default
      }

      return {
        id: goal.id,
        title: goal.description, // Use the full description as title
        currentAmount: '$0', // This should come from actual progress tracking
        targetAmount: getTargetAmount(goal.name),
        progress: 0, // This should come from actual progress calculation
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
      />
    </div>
  )
}
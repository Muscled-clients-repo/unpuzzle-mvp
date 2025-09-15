'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { DailyGoalTracker } from './DailyGoalTracker'
import { getDailyGoalData, getUserGoalProgress } from '@/lib/actions/goals-actions'

export function StudentDailyGoalTracker() {
  // Fetch student's own goal progress
  const { data: goalProgress, isLoading: goalLoading } = useQuery({
    queryKey: ['student-goal-progress'],
    queryFn: getUserGoalProgress
  })

  // Fetch student's own daily data
  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['student-daily-goal-data'],
    queryFn: () => getDailyGoalData({ limit: 30 })
  })

  return (
    <DailyGoalTracker
      goalProgress={goalProgress}
      dailyData={dailyData}
      isLoading={goalLoading || dailyLoading}
      isInstructorView={false}
    />
  )
}
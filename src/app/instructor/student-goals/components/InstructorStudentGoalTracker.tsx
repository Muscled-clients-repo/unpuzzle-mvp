'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { DailyGoalTracker } from '@/app/student/goals/components/DailyGoalTracker'
import { getStudentGoalProgress, getStudentDailyGoalData } from '@/lib/actions/instructor-goals-actions'

interface InstructorStudentGoalTrackerProps {
  studentId: string
  instructorId: string
}

export function InstructorStudentGoalTracker({ 
  studentId, 
  instructorId 
}: InstructorStudentGoalTrackerProps) {
  // Fetch specific student's goal progress
  const { data: goalProgress, isLoading: goalLoading } = useQuery({
    queryKey: ['instructor-student-goal-progress', studentId],
    queryFn: () => getStudentGoalProgress(studentId)
  })

  // Fetch specific student's daily data
  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['instructor-student-daily-goal-data', studentId],
    queryFn: () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      return getStudentDailyGoalData(studentId, {
        startDate: startDate.toISOString().split('T')[0],
        limit: 50
      })
    },
    refetchInterval: 60000 // Refetch every minute for instructor view
  })

  return (
    <DailyGoalTracker
      goalProgress={goalProgress}
      dailyData={dailyData}
      isLoading={goalLoading || dailyLoading}
      studentId={studentId}
      isInstructorView={true}
      instructorId={instructorId}
    />
  )
}
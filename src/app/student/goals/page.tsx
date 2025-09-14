'use client'

import React from 'react'
import { StudentGoalDashboard } from './components/StudentGoalDashboard'

export default function StudentGoalsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StudentGoalDashboard />
    </div>
  )
}
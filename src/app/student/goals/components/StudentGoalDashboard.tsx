'use client'

import React from 'react'
import { ConversationIntegrationV2 } from '@/components/conversation/ConversationIntegrationV2'
import { useAppStore } from '@/stores/app-store'

export function StudentGoalDashboard() {
  const { user } = useAppStore()

  // Show loading if no user yet
  if (!user?.id) {
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
      />
    </div>
  )
}
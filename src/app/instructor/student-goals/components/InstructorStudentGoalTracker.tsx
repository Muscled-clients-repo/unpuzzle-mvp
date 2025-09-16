'use client'

import React from 'react'
import { ConversationIntegrationV2 } from '@/components/conversation/ConversationIntegrationV2'

interface InstructorStudentGoalTrackerProps {
  studentId: string
  instructorId: string
}

export function InstructorStudentGoalTracker({
  studentId,
  instructorId
}: InstructorStudentGoalTrackerProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ConversationIntegrationV2
        studentId={studentId}
        instructorId={instructorId}
        isInstructorView={true}
        enableUnifiedSystem={true}
      />
    </div>
  )
}
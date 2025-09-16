'use client'

import React from 'react'
import { DailyGoalTrackerV2 } from './DailyGoalTrackerV2'
import { UnifiedConversationContainer } from './UnifiedConversationContainer'

interface ConversationIntegrationV2Props {
  studentId: string
  instructorId?: string
  isInstructorView?: boolean
  enableUnifiedSystem?: boolean
  goalProgress?: any
  className?: string
}

/**
 * Integration component that can switch between unified conversation system
 * and the goal-specific DailyGoalTrackerV2 UI
 */
export function ConversationIntegrationV2({
  studentId,
  instructorId,
  isInstructorView = false,
  enableUnifiedSystem = true,
  goalProgress,
  className = ''
}: ConversationIntegrationV2Props) {
  // For now, always use the DailyGoalTrackerV2 which provides the original UI/UX
  // but with the unified conversation system underneath
  return (
    <div className={className}>
      <DailyGoalTrackerV2
        studentId={studentId}
        instructorId={instructorId}
        isInstructorView={isInstructorView}
        goalProgress={goalProgress}
      />
    </div>
  )

  // Fallback option to use generic conversation UI
  // return (
  //   <div className={className}>
  //     <UnifiedConversationContainer
  //       studentId={studentId}
  //       instructorId={instructorId}
  //       isInstructorView={isInstructorView}
  //     />
  //   </div>
  // )
}
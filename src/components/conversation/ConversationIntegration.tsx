'use client'

import React from 'react'
import { UnifiedConversationContainer } from './UnifiedConversationContainer'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageSquare, Zap, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversationIntegrationProps {
  studentId: string
  instructorId?: string
  isInstructorView?: boolean
  className?: string

  // Migration options
  enableUnifiedSystem?: boolean
  showMigrationPrompt?: boolean
  onMigrationClick?: () => void
}

/**
 * Integration component for unified conversation system
 * Provides smooth transition from old to new system
 */
export function ConversationIntegration({
  studentId,
  instructorId,
  isInstructorView = false,
  className = '',
  enableUnifiedSystem = false,
  showMigrationPrompt = false,
  onMigrationClick
}: ConversationIntegrationProps) {
  // If unified system is enabled, render it directly
  if (enableUnifiedSystem) {
    return (
      <UnifiedConversationContainer
        studentId={studentId}
        instructorId={instructorId}
        isInstructorView={isInstructorView}
        className={className}
      />
    )
  }

  // Show migration prompt if requested
  if (showMigrationPrompt) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Enhanced Conversation System Available
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Upgrade to our new unified conversation system for better performance,
              improved file handling, and enhanced real-time collaboration.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <MessageSquare className="w-3 h-3 mr-1" />
              Unified Messages
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Zap className="w-3 h-3 mr-1" />
              Real-time Updates
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              Enhanced File Handling
            </Badge>
          </div>

          <div className="pt-4">
            <Button onClick={onMigrationClick} size="lg" className="group">
              Upgrade Now
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your existing data will be preserved and enhanced
          </p>
        </div>
      </Card>
    )
  }

  // Fallback: render placeholder for development
  return (
    <Card className={cn('p-6 border-dashed', className)}>
      <div className="text-center space-y-3">
        <MessageSquare className="w-12 h-12 mx-auto text-gray-400" />
        <div className="space-y-1">
          <h3 className="font-medium text-gray-700 dark:text-gray-300">
            Conversation Integration Point
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This is where the {isInstructorView ? 'instructor' : 'student'} conversation
            system will be integrated.
          </p>
        </div>
        <div className="text-xs font-mono text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
          studentId: {studentId}
          {instructorId && (
            <>
              <br />
              instructorId: {instructorId}
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
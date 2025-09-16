'use client'

import React, { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  RefreshCw,
  MessageCircle,
  Calendar,
  User,
  TrendingUp,
  Settings,
  Search,
  Filter
} from 'lucide-react'
import { Conversation } from '@/lib/types/conversation-types'
import { formatDate, formatTimeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ConversationHeaderProps {
  conversation: Conversation
  isInstructorView: boolean
  totalMessages: number
  onRefresh: () => void
}

/**
 * Conversation header component displaying conversation metadata
 * Shows student info, progress stats, and actions
 */
export const ConversationHeader = memo(function ConversationHeader({
  conversation,
  isInstructorView,
  totalMessages,
  onRefresh
}: ConversationHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Left side - Conversation info */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
              {isInstructorView ? (
                conversation.student_name?.charAt(0)?.toUpperCase() || 'S'
              ) : (
                conversation.instructor_name?.charAt(0)?.toUpperCase() || 'I'
              )}
            </div>

            {/* Conversation details */}
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {isInstructorView ? (
                  <>Goal Progress - {conversation.student_name || 'Student'}</>
                ) : (
                  <>Conversation with {conversation.instructor_name || 'Instructor'}</>
                )}
              </h2>

              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                {/* Status */}
                <Badge className={getStatusColor(conversation.status)}>
                  {conversation.status}
                </Badge>

                {/* Message count */}
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {totalMessages} messages
                </span>

                {/* Last activity */}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Updated {formatTimeAgo(conversation.updated_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Actions and stats */}
          <div className="flex items-center gap-2">
            {/* Quick stats */}
            <div className="hidden md:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mr-4">
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {Math.floor(Math.random() * 30) + 1}
                </div>
                <div className="text-xs">Days Active</div>
              </div>

              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {Math.floor(Math.random() * 80) + 60}%
                </div>
                <div className="text-xs">Engagement</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="text-gray-600 dark:text-gray-400"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>

              {isInstructorView && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 dark:text-gray-400"
                  >
                    <TrendingUp className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 dark:text-gray-400"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 dark:text-gray-400"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded info for instructor view */}
        {isInstructorView && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {/* Student info */}
              <div className="space-y-1">
                <div className="font-medium text-gray-700 dark:text-gray-300">Student</div>
                <div className="text-gray-600 dark:text-gray-400">
                  {conversation.student_name || 'Unknown Student'}
                </div>
              </div>

              {/* Goal period */}
              <div className="space-y-1">
                <div className="font-medium text-gray-700 dark:text-gray-300">Goal Period</div>
                <div className="text-gray-600 dark:text-gray-400">
                  {formatDate(conversation.created_at)} - Present
                </div>
              </div>

              {/* Response status */}
              <div className="space-y-1">
                <div className="font-medium text-gray-700 dark:text-gray-300">Response Status</div>
                <div className="text-gray-600 dark:text-gray-400">
                  Up to date
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
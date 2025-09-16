'use client'

import React, { memo } from 'react'
import { ConversationMessage } from '@/lib/types/conversation-types'
import { MessageCard } from './MessageCard'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

interface MessageListProps {
  messages: ConversationMessage[]
  isInstructorView: boolean
  onReply: (messageId: string) => void
  onEdit: (messageId: string) => void
  selectedMessages: Set<string>
  onMessageSelect: (messageId: string) => void
  expandedThreads: Set<string>
  onToggleThread: (messageId: string) => void
  onImageClick: (messageId: string, fileIndex: number, totalFiles: number) => void
  compactMode: boolean
  showTimestamps: boolean
  groupByDate: boolean
}

/**
 * Message list component displaying chronological conversation messages
 * Supports grouping by date and various display modes
 */
export const MessageList = memo(function MessageList({
  messages,
  isInstructorView,
  onReply,
  onEdit,
  selectedMessages,
  onMessageSelect,
  expandedThreads,
  onToggleThread,
  onImageClick,
  compactMode,
  showTimestamps,
  groupByDate
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <Card className="p-8 text-center my-4">
        <div className="text-gray-500 dark:text-gray-400">
          <h3 className="text-lg font-medium mb-2">No messages yet</h3>
          <p className="text-sm">
            {isInstructorView
              ? 'This conversation will appear here once the student starts sharing their progress.'
              : 'Start your conversation by sharing your daily progress or goals.'}
          </p>
        </div>
      </Card>
    )
  }

  // Group messages by date if enabled
  const messageGroups = groupByDate
    ? groupMessagesByDate(messages)
    : [{ date: null, messages }]

  return (
    <div className="message-list space-y-4">
      {messageGroups.map((group, groupIndex) => (
        <div key={group.date || groupIndex} className="message-group">
          {/* Date separator */}
          {group.date && groupByDate && (
            <div className="flex items-center justify-center my-6">
              <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {formatDate(group.date)}
                </span>
              </div>
            </div>
          )}

          {/* Messages for this date */}
          <div className="space-y-3">
            {group.messages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                isInstructorView={isInstructorView}
                isSelected={selectedMessages.has(message.id)}
                isThreadExpanded={expandedThreads.has(message.id)}
                onSelect={() => onMessageSelect(message.id)}
                onReply={() => onReply(message.id)}
                onEdit={() => onEdit(message.id)}
                onToggleThread={() => onToggleThread(message.id)}
                onImageClick={(fileIndex, totalFiles) =>
                  onImageClick(message.id, fileIndex, totalFiles)
                }
                compactMode={compactMode}
                showTimestamps={showTimestamps}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})

/**
 * Group messages by date for chronological organization
 */
function groupMessagesByDate(messages: ConversationMessage[]) {
  const groups = new Map<string, ConversationMessage[]>()

  messages.forEach(message => {
    const dateKey = message.target_date || message.created_at.split('T')[0]

    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(message)
  })

  // Convert to array and sort by date (newest first)
  return Array.from(groups.entries())
    .map(([date, messages]) => ({
      date,
      messages: messages.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
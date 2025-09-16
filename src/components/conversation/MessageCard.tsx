'use client'

import React, { memo } from 'react'
import { ConversationMessage } from '@/lib/types/conversation-types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MessageCircle,
  Edit,
  MoreVertical,
  Reply,
  Clock,
  Paperclip,
  Activity,
  BookOpen
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MessageAttachments } from './MessageAttachments'
import { formatTimeAgo, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface MessageCardProps {
  message: ConversationMessage
  isInstructorView: boolean
  isSelected: boolean
  isThreadExpanded: boolean
  onSelect: () => void
  onReply: () => void
  onEdit: () => void
  onToggleThread: () => void
  onImageClick: (fileIndex: number, totalFiles: number) => void
  compactMode: boolean
  showTimestamps: boolean
}

/**
 * Individual message card component
 * Displays message content, metadata, and actions
 */
export const MessageCard = memo(function MessageCard({
  message,
  isInstructorView,
  isSelected,
  isThreadExpanded,
  onSelect,
  onReply,
  onEdit,
  onToggleThread,
  onImageClick,
  compactMode,
  showTimestamps
}: MessageCardProps) {
  const isInstructorMessage = message.message_type === 'instructor_response'
  const isStudentMessage = message.message_type === 'daily_note' || message.message_type === 'activity'
  const isActivityMessage = message.message_type === 'activity'

  // Determine if current user can edit this message
  const canEdit = isInstructorView ? isInstructorMessage : isStudentMessage

  // Get message type styling
  const getMessageStyling = () => {
    if (isInstructorMessage) {
      return {
        cardClass: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
        badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: <MessageCircle className="w-4 h-4" />
      }
    }

    if (isActivityMessage) {
      return {
        cardClass: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950',
        badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        icon: <Activity className="w-4 h-4" />
      }
    }

    // Default: student daily note
    return {
      cardClass: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
      badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      icon: <BookOpen className="w-4 h-4" />
    }
  }

  const styling = getMessageStyling()

  return (
    <Card
      className={cn(
        'p-4 transition-all duration-200 hover:shadow-md cursor-pointer',
        styling.cardClass,
        isSelected && 'ring-2 ring-blue-500 dark:ring-blue-400',
        compactMode && 'p-3'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className={compactMode ? 'w-8 h-8' : 'w-10 h-10'}>
          <AvatarImage src={`/avatars/${message.sender_role}.png`} />
          <AvatarFallback>
            {message.sender_name?.charAt(0)?.toUpperCase() || (isInstructorMessage ? 'I' : 'S')}
          </AvatarFallback>
        </Avatar>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={cn(
                'font-medium text-gray-900 dark:text-gray-100',
                compactMode && 'text-sm'
              )}>
                {message.sender_name || (isInstructorMessage ? 'Instructor' : 'Student')}
              </span>

              <Badge variant="secondary" className={cn(styling.badgeClass, 'text-xs')}>
                {styling.icon}
                <span className="ml-1">
                  {message.message_type === 'instructor_response' ? 'Response' :
                   message.message_type === 'activity' ? 'Activity' : 'Note'}
                </span>
              </Badge>

              {showTimestamps && (
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(message.created_at)}
                </span>
              )}
            </div>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReply(); }}>
                  <Reply className="w-4 h-4 mr-2" />
                  Reply
                </DropdownMenuItem>

                {canEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}

                {message.attachments?.length > 0 && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleThread(); }}>
                    <Paperclip className="w-4 h-4 mr-2" />
                    {isThreadExpanded ? 'Hide Files' : 'Show Files'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Target date */}
          {message.target_date && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Target: {formatTime(message.target_date)}
            </div>
          )}

          {/* Message content */}
          <div className={cn(
            'text-gray-800 dark:text-gray-200 whitespace-pre-wrap',
            compactMode ? 'text-sm' : 'text-base'
          )}>
            {message.content}
          </div>

          {/* Metadata display */}
          {message.metadata && Object.keys(message.metadata).length > 0 && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {message.metadata.migrated_from && (
                <span className="inline-flex items-center gap-1">
                  Migrated from {message.metadata.migrated_from}
                </span>
              )}
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                </span>
                {!isThreadExpanded && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onToggleThread(); }}
                    className="text-xs"
                  >
                    Show Files
                  </Button>
                )}
              </div>

              {isThreadExpanded && (
                <MessageAttachments
                  attachments={message.attachments}
                  onImageClick={onImageClick}
                  compactMode={compactMode}
                />
              )}
            </div>
          )}

          {/* Timestamp (full) */}
          {showTimestamps && !compactMode && (
            <div className="mt-2 text-xs text-gray-400">
              {formatTime(message.created_at)}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
})
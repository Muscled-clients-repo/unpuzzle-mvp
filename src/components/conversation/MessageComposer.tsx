'use client'

import React, { memo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Send,
  Paperclip,
  X,
  Calendar,
  MessageCircle,
  BookOpen,
  Activity,
  ChevronDown,
  ChevronUp,
  Reply,
  Edit,
  Image as ImageIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useResponseTemplates } from '@/hooks/use-message-form'

interface MessageComposerProps {
  messageText: string
  onMessageChange: (text: string) => void
  attachedFiles: File[]
  onFilesChange: (files: File[]) => void
  onAddFiles: (files: File[]) => void
  onRemoveFile: (index: number) => void
  messageType: 'daily_note' | 'instructor_response' | 'activity' | 'milestone'
  onMessageTypeChange: (type: 'daily_note' | 'instructor_response' | 'activity' | 'milestone') => void
  targetDate?: string
  onTargetDateChange: (date: string) => void
  isExpanded: boolean
  onExpand: () => void
  onCollapse: () => void
  replyToId?: string
  editingId?: string
  onCancel: () => void
  onSend: () => void
  isLoading: boolean
  isDirty: boolean
  isValid: boolean
  isInstructorView: boolean
  isDragOver: boolean
  onDragOver: (isDragOver: boolean) => void
}

/**
 * Message composer component for unified conversation system
 * Supports different message types, file attachments, and templates
 */
export const MessageComposer = memo(function MessageComposer({
  messageText,
  onMessageChange,
  attachedFiles,
  onFilesChange,
  onAddFiles,
  onRemoveFile,
  messageType,
  onMessageTypeChange,
  targetDate,
  onTargetDateChange,
  isExpanded,
  onExpand,
  onCollapse,
  replyToId,
  editingId,
  onCancel,
  onSend,
  isLoading,
  isDirty,
  isValid,
  isInstructorView,
  isDragOver,
  onDragOver
}: MessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { templates, applyTemplate } = useResponseTemplates()

  // Show templates only for instructor responses
  const showTemplates = isInstructorView && messageType === 'instructor_response'

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      onAddFiles(files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onAddFiles(files)
    }
  }

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'instructor_response':
        return <MessageCircle className="w-4 h-4" />
      case 'activity':
        return <Activity className="w-4 h-4" />
      case 'milestone':
        return <BookOpen className="w-4 h-4" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }

  const getPlaceholder = () => {
    if (editingId) return 'Edit your message...'
    if (replyToId) return 'Write your reply...'

    switch (messageType) {
      case 'instructor_response':
        return 'Write your response to the student...'
      case 'activity':
        return 'Describe your activity or accomplishment...'
      case 'milestone':
        return 'Share your milestone achievement...'
      default:
        return 'Share your daily progress, thoughts, or questions...'
    }
  }

  if (!isExpanded) {
    return (
      <Card
        className={cn(
          'fixed bottom-4 right-4 shadow-lg cursor-pointer transition-all duration-200 hover:shadow-xl',
          isDragOver && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
        )}
        onClick={onExpand}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            {getMessageTypeIcon(messageType)}
            <span className="text-sm">
              {editingId ? 'Continue editing...' :
               replyToId ? 'Continue reply...' :
               'Write a message...'}
            </span>
            <ChevronUp className="w-4 h-4 ml-auto" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'fixed bottom-4 left-4 right-4 shadow-xl transition-all duration-200',
        isDragOver && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {editingId && <Edit className="w-5 h-5 text-blue-500" />}
            {replyToId && <Reply className="w-5 h-5 text-green-500" />}
            {getMessageTypeIcon(messageType)}
            <span>
              {editingId ? 'Edit Message' :
               replyToId ? 'Reply' :
               messageType === 'instructor_response' ? 'Instructor Response' :
               messageType === 'activity' ? 'Activity Update' :
               messageType === 'milestone' ? 'Milestone' :
               'Daily Note'}
            </span>
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCollapse}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Message Type and Date Controls */}
        <div className="flex flex-wrap gap-3">
          {!editingId && !replyToId && (
            <Select
              value={messageType}
              onValueChange={onMessageTypeChange}
            >
              <SelectTrigger className="w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {!isInstructorView && (
                  <>
                    <SelectItem value="daily_note">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Daily Note
                      </div>
                    </SelectItem>
                    <SelectItem value="activity">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Activity
                      </div>
                    </SelectItem>
                  </>
                )}
                {isInstructorView && (
                  <SelectItem value="instructor_response">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Response
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => onTargetDateChange(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        {/* Response Templates (Instructor only) */}
        {showTemplates && !editingId && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Quick responses:</p>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(template.id, onMessageChange)}
                  className="text-xs"
                >
                  {template.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Message Text Area */}
        <div className="space-y-2">
          <Textarea
            placeholder={getPlaceholder()}
            value={messageText}
            onChange={(e) => onMessageChange(e.target.value)}
            className="min-h-[120px] resize-none"
            disabled={isLoading}
          />

          {/* Character count and validation */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>{messageText.length} characters</span>
            {!isValid && isDirty && (
              <span className="text-red-500">Message cannot be empty</span>
            )}
          </div>
        </div>

        {/* File Attachments */}
        <div className="space-y-3">
          {/* File Upload Area */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-4 text-center transition-colors',
              isDragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            )}
          >
            <Button
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="text-gray-600 dark:text-gray-400"
            >
              <Paperclip className="w-4 h-4 mr-2" />
              Attach files or drag and drop
            </Button>
          </div>

          {/* Attached Files Display */}
          {attachedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Attached files ({attachedFiles.length}):
              </p>
              <div className="space-y-2">
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded border"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{file.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {(file.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFile(index)}
                      disabled={isLoading}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {(isDirty || replyToId || editingId) && (
              <Button
                variant="ghost"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </div>

          <Button
            onClick={onSend}
            disabled={!isValid || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {editingId ? 'Update' : 'Send'}
              </>
            )}
          </Button>
        </div>
      </CardContent>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.txt,.doc,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />
    </Card>
  )
})
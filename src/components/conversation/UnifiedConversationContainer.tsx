'use client'

import React, { useEffect, useCallback } from 'react'
import { useConversationData, useCreateMessageWithAttachments, useUpdateMessage } from '@/hooks/use-conversation-data'
import { useMessageForm } from '@/hooks/use-message-form'
import { useConversationUI } from '@/hooks/use-conversation-ui'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import { ConversationHeader } from './ConversationHeader'
import { ImageViewerModal } from './ImageViewerModal'
import { LoadingSpinner, ErrorFallback } from '@/components/common'
import { Card } from '@/components/ui/card'

interface UnifiedConversationContainerProps {
  studentId: string
  instructorId?: string
  isInstructorView?: boolean
  className?: string
}

/**
 * Unified conversation container following 3-layer SSOT architecture
 * Replaces fragmented DailyGoalTracker with optimized conversation system
 */
export function UnifiedConversationContainer({
  studentId,
  instructorId,
  isInstructorView = false,
  className = ''
}: UnifiedConversationContainerProps) {
  // TanStack Query: Server state
  const {
    data: conversationData,
    isLoading,
    error,
    refetch
  } = useConversationData(studentId, {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    instructorId
  })

  // Form State: Message composition
  const messageForm = useMessageForm({
    messageType: isInstructorView ? 'instructor_response' : 'daily_note',
    targetDate: new Date().toISOString().split('T')[0]
  })

  // Zustand: UI state
  const ui = useConversationUI()

  // Mutations
  const createMessageMutation = useCreateMessageWithAttachments()
  const updateMessageMutation = useUpdateMessage()

  // UI Orchestration: Handle message sending
  const handleSendMessage = useCallback(async () => {
    if (!messageForm.isValid) return

    try {
      // Check if this is an edit operation
      if (ui.composing.editingId) {
        // Update existing message
        await updateMessageMutation.mutateAsync({
          messageId: ui.composing.editingId,
          updates: {
            content: messageForm.messageText,
            metadata: messageForm.metadata
          }
        })
      } else {
        // Prepare form data for file attachments
        let formData: FormData | undefined
        if (messageForm.attachedFiles.length > 0) {
          formData = new FormData()
          messageForm.attachedFiles.forEach((file, index) => {
            formData!.append(`file_${index}`, file)
          })
        }

        // Create new message with attachments
        await createMessageMutation.mutateAsync({
          messageData: {
            studentId,
            conversationId: conversationData?.conversation.id,
            messageType: messageForm.messageType,
            content: messageForm.messageText,
            targetDate: messageForm.targetDate,
            replyToId: messageForm.replyToId,
            metadata: messageForm.metadata
          },
          attachments: formData
        })
      }

      // Reset form on success
      messageForm.resetForm()
      ui.cancelComposing()

    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }, [
    messageForm,
    conversationData,
    studentId,
    createMessageMutation,
    updateMessageMutation,
    ui
  ])

  // UI Orchestration: Handle reply
  const handleReply = useCallback((messageId: string) => {
    messageForm.setReplyToId(messageId)
    ui.startReply(messageId)
  }, [messageForm, ui])

  // UI Orchestration: Handle edit
  const handleEdit = useCallback((messageId: string) => {
    // Find the message to edit
    const messageToEdit = conversationData?.messages.find(msg => msg.id === messageId)
    if (messageToEdit) {
      messageForm.setMessageText(messageToEdit.content)
      messageForm.setMessageType(messageToEdit.message_type)
      messageForm.setTargetDate(messageToEdit.target_date || '')
      ui.startEdit(messageId)
      ui.expandComposer()
    }
  }, [messageForm, ui, conversationData])

  // Real-time updates via refetch interval (WebSocket integration can be added later)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading && !createMessageMutation.isPending && !updateMessageMutation.isPending) {
        refetch()
      }
    }, 30000) // Refetch every 30 seconds

    return () => clearInterval(interval)
  }, [isLoading, createMessageMutation.isPending, updateMessageMutation.isPending, refetch])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          Loading conversation...
        </span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <ErrorFallback
        error={error}
        onRetry={refetch}
        title="Failed to load conversation"
      />
    )
  }

  // No conversation data - show helpful message
  if (!conversationData) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">No conversation found</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {isInstructorView
            ? 'This student hasn\'t started their goal tracking yet, or the conversation needs to be migrated.'
            : 'Your conversation data needs to be set up. This may happen automatically when you start tracking your progress.'
          }
        </p>
        <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded">
          <strong>Debug info:</strong><br/>
          Student ID: {studentId}<br/>
          {instructorId && <>Instructor ID: {instructorId}<br/></>}
          View: {isInstructorView ? 'Instructor' : 'Student'}
        </div>
        {!isInstructorView && (
          <button
            onClick={() => ui.expandComposer()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Starting an Entry
          </button>
        )}
      </Card>
    )
  }

  const { conversation, messages } = conversationData

  return (
    <div className={`unified-conversation-container ${className}`}>
      {/* Conversation Header */}
      <ConversationHeader
        conversation={conversation}
        isInstructorView={isInstructorView}
        totalMessages={messages.length}
        onRefresh={refetch}
      />

      {/* Message Timeline */}
      <MessageList
        messages={messages}
        isInstructorView={isInstructorView}
        onReply={handleReply}
        onEdit={handleEdit}
        selectedMessages={ui.selectedMessages}
        onMessageSelect={ui.toggleMessageSelection}
        expandedThreads={ui.expandedThreads}
        onToggleThread={ui.toggleThread}
        onImageClick={(messageId, fileIndex, totalFiles) => {
          ui.openImageViewer(messageId, fileIndex, totalFiles)
        }}
        compactMode={ui.preferences.compactMode}
        showTimestamps={ui.preferences.showTimestamps}
        groupByDate={ui.preferences.groupByDate}
      />

      {/* Message Composer */}
      <MessageComposer
        messageText={messageForm.messageText}
        onMessageChange={messageForm.setMessageText}
        attachedFiles={messageForm.attachedFiles}
        onFilesChange={messageForm.setAttachedFiles}
        onAddFiles={messageForm.addFiles}
        onRemoveFile={messageForm.removeFile}
        messageType={messageForm.messageType}
        onMessageTypeChange={messageForm.setMessageType}
        targetDate={messageForm.targetDate}
        onTargetDateChange={messageForm.setTargetDate}
        isExpanded={ui.composing.isExpanded}
        onExpand={ui.expandComposer}
        onCollapse={ui.collapseComposer}
        replyToId={messageForm.replyToId}
        editingId={ui.composing.editingId}
        onCancel={() => {
          messageForm.resetForm()
          ui.cancelComposing()
        }}
        onSend={handleSendMessage}
        isLoading={createMessageMutation.isPending || updateMessageMutation.isPending}
        isDirty={messageForm.isDirty}
        isValid={messageForm.isValid}
        isInstructorView={isInstructorView}
        isDragOver={ui.fileUpload.isDragOver}
        onDragOver={ui.setDragOver}
      />

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={ui.imageViewer.isOpen}
        onClose={ui.closeImageViewer}
        messageId={ui.imageViewer.messageId}
        fileIndex={ui.imageViewer.fileIndex}
        totalFiles={ui.imageViewer.totalFiles}
        onNext={ui.nextImage}
        onPrevious={ui.previousImage}
        messages={messages}
      />
    </div>
  )
}
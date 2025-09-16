'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConversationData, createMessage, updateMessage, deleteMessage, getStudentGoalProgress, getMessagesForDate } from '@/lib/actions/conversation-actions'
import { uploadMessageAttachments } from '@/lib/actions/message-attachments'
import { toast } from 'sonner'

// TanStack Query hooks for unified conversation system

/**
 * Hook for fetching complete conversation data
 * Replaces multiple separate queries with single optimized query
 */
export function useConversationData(studentId: string, options: {
  startDate?: string
  endDate?: string
  limit?: number
  instructorId?: string
} = {}) {
  // Normalize options to create more consistent cache keys
  const normalizedOptions = {
    startDate: options.startDate,
    endDate: options.endDate,
    limit: options.limit || 50,
    instructorId: options.instructorId
  }

  return useQuery({
    queryKey: ['conversation', studentId, normalizedOptions],
    queryFn: () => getConversationData(studentId, normalizedOptions),
    staleTime: 30000, // 30 seconds - longer since we have real-time updates
    refetchOnWindowFocus: true
    // Removed refetchInterval - WebSocket provides real-time updates
  })
}

/**
 * Hook for fetching messages for a specific date
 * Replaces getInstructorResponsesForDate
 */
export function useMessagesForDate(studentId: string, targetDate: string) {
  return useQuery({
    queryKey: ['messages-date', studentId, targetDate],
    queryFn: () => getMessagesForDate(studentId, targetDate),
    staleTime: 10000, // 10 seconds
    enabled: !!studentId && !!targetDate
  })
}

/**
 * Hook for fetching student goal progress (instructor view)
 */
export function useStudentGoalProgress(studentId: string) {
  return useQuery({
    queryKey: ['student-goal-progress', studentId],
    queryFn: () => getStudentGoalProgress(studentId),
    staleTime: 300000, // 5 minutes
    enabled: !!studentId
  })
}

/**
 * Hook for creating new messages
 * Unified mutation replacing multiple create functions
 */
export function useCreateMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createMessage,
    onMutate: async (newMessage) => {
      // Cancel any outgoing refetches for conversation data
      const conversationKey = ['conversation', newMessage.studentId]
      await queryClient.cancelQueries({ queryKey: conversationKey })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(conversationKey)

      // Optimistically update the conversation
      if (previousData && newMessage.studentId) {
        queryClient.setQueryData(conversationKey, (old: any) => {
          if (!old) return old

          const optimisticMessage = {
            id: `temp-${Date.now()}`,
            conversation_id: old.conversation.id,
            sender_id: 'current-user', // Will be replaced with real data
            message_type: newMessage.messageType,
            content: newMessage.content,
            metadata: newMessage.metadata || {},
            target_date: newMessage.targetDate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sender_name: 'You',
            sender_role: newMessage.messageType === 'instructor_response' ? 'instructor' : 'student',
            attachments: []
          }

          return {
            ...old,
            messages: [optimisticMessage, ...old.messages]
          }
        })
      }

      return { previousData }
    },
    onError: (err, newMessage, context) => {
      // Rollback optimistic update
      if (context?.previousData && newMessage.studentId) {
        queryClient.setQueryData(['conversation', newMessage.studentId], context.previousData)
      }
      toast.error('Failed to send message')
    },
    onSuccess: (data, variables) => {
      // WebSocket will handle real-time cache updates
      // Only keep minimal cache management for reliability
      if (variables.targetDate && variables.studentId) {
        queryClient.invalidateQueries({
          queryKey: ['messages-date', variables.studentId, variables.targetDate]
        })
      }

      toast.success('Message sent successfully!')
    }
  })
}

/**
 * Hook for updating messages
 */
export function useUpdateMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ messageId, updates }: { messageId: string; updates: any }) =>
      updateMessage(messageId, updates),
    onMutate: async ({ messageId, updates }) => {
      // Cancel any outgoing refetches for conversation data
      await queryClient.cancelQueries({ queryKey: ['conversation'] })

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: ['conversation'] })

      // Optimistically update all conversation queries containing this message
      queryClient.setQueriesData({ queryKey: ['conversation'] }, (oldData: any) => {
        if (!oldData?.messages) return oldData

        return {
          ...oldData,
          messages: oldData.messages.map((msg: any) =>
            msg.id === messageId
              ? { ...msg, ...updates, updated_at: new Date().toISOString() }
              : msg
          )
        }
      })

      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error('Failed to update message')
    },
    onSuccess: (data, variables) => {
      // WebSocket will handle real-time updates, just show success
      toast.success('Message updated successfully!')
    }
  })
}

/**
 * Hook for deleting messages
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMessage,
    onSuccess: () => {
      // Invalidate all conversation queries
      queryClient.invalidateQueries({ queryKey: ['conversation'] })
      queryClient.invalidateQueries({ queryKey: ['messages-date'] })

      toast.success('Message deleted successfully!')
    },
    onError: () => {
      toast.error('Failed to delete message')
    }
  })
}

/**
 * Hook for uploading message attachments
 */
export function useUploadMessageAttachments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadMessageAttachments,
    onSuccess: (results, variables) => {
      const successCount = results.filter(r => r.success).length
      const errorCount = results.filter(r => !r.success).length

      if (successCount > 0) {
        toast.success(`${successCount} file(s) uploaded successfully!`)

        // Invalidate conversation queries to show new attachments
        queryClient.invalidateQueries({ queryKey: ['conversation'] })
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} file(s) failed to upload`)
      }
    },
    onError: () => {
      toast.error('File upload failed')
    }
  })
}

/**
 * Combined hook for message creation with file uploads
 * Handles the complete flow: create message -> upload files -> update UI
 */
export function useCreateMessageWithAttachments() {
  const createMessageMutation = useCreateMessage()
  const uploadAttachmentsMutation = useUploadMessageAttachments()

  return useMutation({
    mutationFn: async (data: {
      messageData: Parameters<typeof createMessage>[0]
      attachments?: FormData
    }) => {
      // First create the message
      const message = await createMessage(data.messageData)

      // Then upload attachments if any
      if (data.attachments && message) {
        await uploadMessageAttachments({
          messageId: message.id,
          files: data.attachments
        })
      }

      return message
    },
    onSuccess: (data, variables) => {
      // Invalidate conversation data to show complete message with attachments
      if (variables.messageData.studentId) {
        // Use a slight delay to ensure attachments are processed
        setTimeout(() => {
          createMessageMutation.reset() // Reset individual mutations
          uploadAttachmentsMutation.reset()
        }, 100)
      }

      toast.success('Message and attachments sent successfully!')
    },
    onError: () => {
      toast.error('Failed to send message with attachments')
    }
  })
}
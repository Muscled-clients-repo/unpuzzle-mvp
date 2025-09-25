'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConversationData, createMessage, updateMessage, deleteMessage, getStudentGoalProgress, getMessagesForDate } from '@/lib/actions/conversation-actions'
import { uploadMessageAttachments, deleteMessageAttachment } from '@/lib/actions/conversation-attachments'
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

  const query = useQuery({
    queryKey: ['conversation', studentId, normalizedOptions],
    queryFn: () => getConversationData(studentId, normalizedOptions),
    staleTime: 30000, // 30 seconds - longer since we have real-time updates
    refetchOnWindowFocus: true,
    enabled: !!studentId
    // Removed refetchInterval - WebSocket provides real-time updates
  })


  return query
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
 * Hook for uploading message attachments with UI transition support
 */
export function useUploadMessageAttachments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadMessageAttachments,
    onMutate: async (variables) => {
      const { messageId, files } = variables

      // Cancel any outgoing refetches for conversation data
      await queryClient.cancelQueries({ queryKey: ['conversation'] })

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueriesData({ queryKey: ['conversation'] })

      // Create optimistic attachments from files
      const fileArray: File[] = []
      for (const [key, value] of files.entries()) {
        if (key.startsWith('file_') && value instanceof File) {
          fileArray.push(value)
        }
      }

      // Generate consistent timestamp for ID matching
      const timestamp = Date.now()

      const optimisticAttachments = fileArray.map((file, index) => {
        const attachmentId = `temp-${timestamp}-${index}`
        const blobUrl = URL.createObjectURL(file)

        // Set up UI transition if it's an image - using file-based mapping
        if (file.type.startsWith('image/')) {
          // Set transition state for architecture-compliant blob URL handling
          import('@/stores/ui-transition-store').then(({ useUITransitionStore }) => {
            const store = useUITransitionStore.getState()
            store.setImageTransition(file.name, file.size, blobUrl)
          })
        }

        return {
          id: attachmentId,
          message_id: messageId,
          filename: `${timestamp}_${file.name}`,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          cdn_url: `private:temp-upload:${attachmentId}`, // Private URL format for consistency
          storage_path: '',
          upload_status: 'uploading' as const,
          created_at: new Date().toISOString()
        }
      })

      // Optimistically add attachments to the message
      queryClient.setQueriesData({ queryKey: ['conversation'] }, (oldData: any) => {
        if (!oldData?.messages) return oldData

        return {
          ...oldData,
          messages: oldData.messages.map((msg: any) =>
            msg.id === messageId
              ? {
                  ...msg,
                  attachments: [...(msg.attachments || []), ...optimisticAttachments]
                }
              : msg
          )
        }
      })

      return { previousData, optimisticAttachments }
    },
    onError: (err, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error('File upload failed')
    },
    onSuccess: async (results, variables, context) => {
      const successCount = results.filter(r => r.success).length
      const errorCount = results.filter(r => !r.success).length

      if (successCount > 0) {
        toast.success(`${successCount} file(s) uploaded successfully!`)

        // Standard invalidation to get fresh server data
        queryClient.invalidateQueries({ queryKey: ['conversation'] })

        // Clean up UI transitions after server data loads (Architecture-compliant)
        setTimeout(async () => {
          const { useUITransitionStore } = await import('@/stores/ui-transition-store')
          const store = useUITransitionStore.getState()

          // Clear all transitions for this upload batch using file-based mapping
          if (context?.optimisticAttachments) {
            context.optimisticAttachments.forEach((attachment: any) => {
              if (attachment.mime_type.startsWith('image/')) {
                const fileKey = `${attachment.original_filename.replace(/[^a-zA-Z0-9]/g, '_')}_${attachment.file_size}`
                store.clearImageTransition(fileKey)
              }
            })
          }
        }, 2000) // Allow time for signed URLs to load
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} file(s) failed to upload`)
      }
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

/**
 * Hook for deleting message attachments with proper optimistic updates
 */
export function useDeleteMessageAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMessageAttachment,
    onMutate: async (attachmentId: string) => {
      // Cancel any outgoing refetches for conversation data
      await queryClient.cancelQueries({ queryKey: ['conversation'] })

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueriesData({ queryKey: ['conversation'] })

      // Optimistically update all conversation queries containing this attachment
      queryClient.setQueriesData({ queryKey: ['conversation'] }, (oldData: any) => {
        if (!oldData?.messages) return oldData

        return {
          ...oldData,
          messages: oldData.messages.map((msg: any) => ({
            ...msg,
            attachments: msg.attachments?.filter((att: any) => att.id !== attachmentId) || []
          }))
        }
      })

      return { previousData }
    },
    onError: (err, attachmentId, context) => {
      // Rollback optimistic updates on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error('Failed to delete attachment')
    },
    onSuccess: () => {
      // Invalidate to ensure fresh data (optional since optimistic update handles most cases)
      queryClient.invalidateQueries({ queryKey: ['conversation'] })
      queryClient.invalidateQueries({ queryKey: ['messages-date'] })

      toast.success('Attachment deleted successfully!')
    }
  })
}
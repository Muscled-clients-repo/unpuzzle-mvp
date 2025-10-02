'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  saveDraft,
  getDraftMessages,
  publishDraft,
  deleteDraftMessage
} from '@/lib/actions/conversation-actions'
import { useAppStore } from '@/stores/app-store'
import { toast } from 'sonner'

// Query keys for conversation drafts
export const conversationDraftKeys = {
  all: ['conversation-drafts'] as const,
  byConversation: (conversationId: string) => [...conversationDraftKeys.all, conversationId] as const,
}

/**
 * Hook for querying conversation draft messages
 */
export function useConversationDrafts(conversationId?: string) {
  const { user } = useAppStore()

  const draftsQuery = useQuery({
    queryKey: conversationDraftKeys.byConversation(conversationId || ''),
    queryFn: () => conversationId ? getDraftMessages(conversationId) : Promise.resolve([]),
    enabled: !!user?.id && !!conversationId,
  })

  return {
    drafts: draftsQuery.data || [],
    isLoading: draftsQuery.isLoading,
    error: draftsQuery.error,
    refetch: draftsQuery.refetch
  }
}

/**
 * Hook for conversation draft mutations (save, publish, delete)
 */
export function useConversationDraftMutations(conversationId?: string) {
  const { user } = useAppStore()
  const queryClient = useQueryClient()

  // Auto-save mutation (silent)
  const autoSaveMutation = useMutation({
    mutationFn: async (data: {
      draftId?: string
      messageType: 'daily_note' | 'instructor_response'
      content: string
      targetDate?: string
      visibility?: 'private' | 'shared'
      metadata?: Record<string, any>
    }) => {
      if (!conversationId && !user?.id) {
        throw new Error('Conversation ID or user ID required')
      }

      return await saveDraft({
        draftId: data.draftId,
        conversationId,
        studentId: user?.id,
        messageType: data.messageType,
        content: data.content,
        targetDate: data.targetDate,
        visibility: data.visibility,
        metadata: data.metadata
      })
    },
    onSuccess: () => {
      // Invalidate drafts query
      if (conversationId) {
        queryClient.invalidateQueries({
          queryKey: conversationDraftKeys.byConversation(conversationId)
        })
      }
    },
    onError: (error) => {
      console.error('Auto-save failed:', error)
      // Silent failure for auto-save
    }
  })

  // Publish draft mutation
  const publishMutation = useMutation({
    mutationFn: publishDraft,
    onSuccess: () => {
      toast.success('Message sent')
      // Invalidate both drafts and messages
      if (conversationId) {
        queryClient.invalidateQueries({
          queryKey: conversationDraftKeys.byConversation(conversationId)
        })
        queryClient.invalidateQueries({
          queryKey: ['conversation-messages', conversationId]
        })
      }
    },
    onError: (error) => {
      toast.error('Failed to send message')
      console.error('Publish failed:', error)
    }
  })

  // Delete draft mutation
  const deleteMutation = useMutation({
    mutationFn: deleteDraftMessage,
    onSuccess: () => {
      toast.success('Draft deleted')
      if (conversationId) {
        queryClient.invalidateQueries({
          queryKey: conversationDraftKeys.byConversation(conversationId)
        })
      }
    },
    onError: () => {
      toast.error('Failed to delete draft')
    }
  })

  // Simple auto-save function
  const performAutoSave = useCallback(async (data: {
    draftId?: string
    messageType: 'daily_note' | 'instructor_response'
    content: string
    targetDate?: string
    visibility?: 'private' | 'shared'
    metadata?: Record<string, any>
  }) => {
    if (!user?.id) return null
    return autoSaveMutation.mutateAsync(data)
  }, [user?.id, autoSaveMutation])

  return {
    performAutoSave,
    publishDraft: publishMutation.mutate,
    deleteDraft: deleteMutation.mutate,

    // Status
    isAutoSaving: autoSaveMutation.isPending,
    isPublishing: publishMutation.isPending,
    isDeleting: deleteMutation.isPending
  }
}

'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { saveDraft, getDrafts, deleteDraft, type DraftData } from '@/lib/actions/draft-actions'
import { useAppStore } from '@/stores/app-store'
import { toast } from 'sonner'

// Query keys for drafts
export const draftKeys = {
  all: ['drafts'] as const,
  list: (type?: string) => [...draftKeys.all, 'list', type] as const,
  detail: (id: string) => [...draftKeys.all, 'detail', id] as const,
}

export function useDraftQueries() {
  const { user } = useAppStore()

  // Direct hook calls for draft types
  const bugDraftsQuery = useQuery({
    queryKey: draftKeys.list('bug_report'),
    queryFn: () => getDrafts('bug_report'),
    enabled: !!user?.id,
    select: (data) => data.drafts || []
  })

  const featureDraftsQuery = useQuery({
    queryKey: draftKeys.list('feature_request'),
    queryFn: () => getDrafts('feature_request'),
    enabled: !!user?.id,
    select: (data) => data.drafts || []
  })

  const allDraftsQuery = useQuery({
    queryKey: draftKeys.list(),
    queryFn: () => getDrafts(),
    enabled: !!user?.id,
    select: (data) => data.drafts || []
  })

  return {
    bugDrafts: bugDraftsQuery.data || [],
    featureDrafts: featureDraftsQuery.data || [],
    allDrafts: allDraftsQuery.data || [],
    isLoadingBugDrafts: bugDraftsQuery.isLoading,
    isLoadingFeatureDrafts: featureDraftsQuery.isLoading,
    isLoadingAllDrafts: allDraftsQuery.isLoading
  }
}

export function useDraftMutations() {
  const { user } = useAppStore()
  const queryClient = useQueryClient()

  // Simple auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (draftData: DraftData) => {
      return await saveDraft(draftData)
    },
    onSuccess: (result) => {
      if (result.success) {
        // Directly update React Query cache instead of WebSocket events
        queryClient.invalidateQueries({ queryKey: draftKeys.all })
      }
    },
    onError: (error) => {
      console.error('Auto-save failed:', error)
      // Silent failure for auto-save
    }
  })

  // Manual save mutation (when user explicitly saves)
  const saveMutation = useMutation({
    mutationFn: saveDraft,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message)
        queryClient.invalidateQueries({ queryKey: draftKeys.all })
      } else {
        toast.error(result.error || 'Failed to save draft')
      }
    },
    onError: () => {
      toast.error('Failed to save draft')
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteDraft,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Draft deleted')
        // Directly update cache
        queryClient.invalidateQueries({ queryKey: draftKeys.all })
      } else {
        toast.error(result.error || 'Failed to delete draft')
      }
    },
    onError: () => {
      toast.error('Failed to delete draft')
    }
  })

  // Simple auto-save function that returns a promise
  const performAutoSave = useCallback((draftData: DraftData) => {
    if (!user?.id) return Promise.resolve(null)
    return autoSaveMutation.mutateAsync(draftData)
  }, [user?.id, autoSaveMutation])

  return {
    performAutoSave,
    saveDraft: saveMutation.mutate,
    deleteDraft: deleteMutation.mutate,

    // Status
    isAutoSaving: autoSaveMutation.isPending,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending
  }
}
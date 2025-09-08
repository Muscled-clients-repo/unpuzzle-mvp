import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  getChaptersForCourseAction,
  createChapterAction,
  updateChapterAction,
  deleteChapterAction
} from '@/app/actions/chapter-actions'
import type { Chapter, Course } from '@/types/course'
import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { useMemo } from 'react'

// ===== QUERY KEYS =====
export const chapterKeys = {
  all: ['chapters'] as const,
  lists: () => [...chapterKeys.all, 'list'] as const,
  list: (courseId: string) => [...chapterKeys.lists(), courseId] as const,
  details: () => [...chapterKeys.all, 'detail'] as const,
  detail: (id: string) => [...chapterKeys.details(), id] as const,
}

// ===== CHAPTERS LIST HOOK =====
export function useChaptersEdit(courseId: string) {
  const queryClient = useQueryClient()
  const ui = useCourseCreationUI()
  
  // Query for chapters data
  const chaptersQuery = useQuery({
    queryKey: chapterKeys.list(courseId),
    queryFn: async () => {
      try {
        const result = await getChaptersForCourseAction(courseId)
        console.log('📚 Chapters query result:', result)
        return result || []
      } catch (error) {
        console.error('📚 Chapters query error:', error)
        return []
      }
    },
    enabled: !!courseId
  })
  
  // ARCHITECTURE-COMPLIANT: TanStack owns ALL server-related state (no data mixing)
  const chapters = chaptersQuery.data || []
  
  console.log('📚 Chapters in hook:', { 
    data: chaptersQuery.data, 
    isLoading: chaptersQuery.isLoading, 
    error: chaptersQuery.error,
    chaptersLength: chapters?.length 
  })
  
  // ARCHITECTURE-COMPLIANT: Staged chapter creation for Consolidated UX
  // Add pending chapters to TanStack cache immediately, save to database via Save button
  const createChapter = (title: string) => {
    const tempId = `chapter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Immediately add to TanStack cache with pending flag
    queryClient.setQueryData(chapterKeys.list(courseId), (old: Chapter[] = []) => [
      ...old,
      {
        id: tempId,
        title: title,
        course_id: courseId,
        videos: [],
        videoCount: 0,
        order: 999,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Flag for pending creation
        _isPendingCreation: true
      } as Chapter & { _isPendingCreation?: boolean }
    ])
    
    console.log('✅ Chapter added to cache, pending save')
  }
  
  // Update chapter mutation
  const updateMutation = useMutation({
    mutationFn: ({ chapterId, updates }: { chapterId: string, updates: Partial<Chapter> }) =>
      updateChapterAction(chapterId, updates),
    
    onMutate: async ({ chapterId, updates }) => {
      await queryClient.cancelQueries({ queryKey: chapterKeys.list(courseId) })
      
      const previousChapters = queryClient.getQueryData(chapterKeys.list(courseId))
      
      // Optimistic update
      queryClient.setQueryData(chapterKeys.list(courseId), (old: Chapter[] = []) =>
        old.map(chapter => 
          chapter.id === chapterId 
            ? { ...chapter, ...updates }
            : chapter
        )
      )
      
      // Also update course cache if it has chapters
      queryClient.setQueryData(['course', courseId], (old: Course) => {
        if (old?.chapters) {
          return {
            ...old,
            chapters: old.chapters.map(chapter =>
              chapter.id === chapterId ? { ...chapter, ...updates } : chapter
            )
          }
        }
        return old
      })
      
      return { previousChapters }
    },
    
    onSuccess: (result) => {
      // Don't show toast here - let the parent component handle it
      // This prevents duplicate toasts when "Save Changes" triggers multiple saves
      if (result.success) {
        console.log('✅ Chapter updated successfully (no toast)')
      }
    },
    
    onError: (error, variables, context) => {
      if (context?.previousChapters) {
        queryClient.setQueryData(chapterKeys.list(courseId), context.previousChapters)
      }
      toast.error('Failed to update chapter')
    }
  })
  
  // Delete chapter mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: (chapterId: string) => deleteChapterAction(courseId, chapterId),
    
    onMutate: async (chapterId) => {
      await queryClient.cancelQueries({ queryKey: chapterKeys.list(courseId) })
      
      const previousChapters = queryClient.getQueryData(chapterKeys.list(courseId))
      
      // Optimistic update - remove chapter
      queryClient.setQueryData(chapterKeys.list(courseId), (old: Chapter[] = []) =>
        old.filter(chapter => chapter.id !== chapterId)
      )
      
      return { previousChapters, deletedChapterId: chapterId }
    },
    
    onSuccess: (result) => {
      if (result.success) {
        // No individual toast - handled by consolidated save toast
      }
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousChapters) {
        queryClient.setQueryData(chapterKeys.list(courseId), context.previousChapters)
      }
      
      // Individual error toast kept for immediate feedback on failures  
      toast.error('Failed to delete chapter')
    }
  })
  
  // ARCHITECTURE-COMPLIANT: Reorder chapters via TanStack mutation
  const reorderMutation = useMutation({
    mutationFn: async (newOrder: Chapter[]) => {
      // TODO: Implement server action for chapter reordering
      // For now, return success since it's client-side only
      return { success: true, data: newOrder }
    },
    
    onMutate: async (newOrder: Chapter[]) => {
      await queryClient.cancelQueries({ queryKey: chapterKeys.list(courseId) })
      
      const previousChapters = queryClient.getQueryData(chapterKeys.list(courseId))
      
      // Optimistic update
      queryClient.setQueryData(chapterKeys.list(courseId), newOrder)
      
      return { previousChapters }
    },
    
    onError: (error, variables, context) => {
      // TanStack rollback
      if (context?.previousChapters) {
        queryClient.setQueryData(chapterKeys.list(courseId), context.previousChapters)
      }
      toast.error('Failed to reorder chapters')
    }
  })
  
  const reorderChapters = (newOrder: Chapter[]) => {
    reorderMutation.mutate(newOrder)
  }
  
  return {
    chapters: chapters, // ARCHITECTURE-COMPLIANT: Direct from TanStack, no merging
    isLoading: chaptersQuery.isLoading,
    error: chaptersQuery.error,
    createChapter: createChapter,
    updateChapter: updateMutation.mutate,
    deleteChapter: deleteMutation.mutate,
    reorderChapters,
    isCreating: false, // Chapter creation is immediate to cache, no loading needed
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending // ARCHITECTURE-COMPLIANT: Real mutation loading state
  }
}
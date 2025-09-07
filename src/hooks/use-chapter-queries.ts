import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  getChaptersForCourseAction,
  createChapterAction,
  updateChapterAction,
  deleteChapterAction
} from '@/app/actions/chapter-actions'
import type { Chapter, Course } from '@/types/course'

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
  
  // Query for chapters data
  const chaptersQuery = useQuery({
    queryKey: chapterKeys.list(courseId),
    queryFn: () => getChaptersForCourseAction(courseId),
    enabled: !!courseId
  })
  
  // Create chapter mutation
  const createMutation = useMutation({
    mutationFn: (title: string) => createChapterAction(courseId, title),
    
    onMutate: async (title) => {
      await queryClient.cancelQueries({ queryKey: chapterKeys.list(courseId) })
      
      const previousChapters = queryClient.getQueryData(chapterKeys.list(courseId))
      
      // Optimistic update - add new chapter
      const tempChapter: Chapter = {
        id: `temp-chapter-${Date.now()}`,
        title,
        courseId,
        order: (previousChapters as Chapter[] || []).length,
        videos: [],
        videoCount: 0
      }
      
      queryClient.setQueryData(chapterKeys.list(courseId), (old: Chapter[] = []) => [
        ...old,
        tempChapter
      ])
      
      return { previousChapters }
    },
    
    onSuccess: (result) => {
      if (result.success) {
        // Replace temp chapter with real one
        queryClient.setQueryData(chapterKeys.list(courseId), (old: Chapter[] = []) =>
          old.map(chapter => 
            chapter.id.startsWith('temp-') ? result.data : chapter
          )
        )
        toast.success('Chapter created successfully!')
      }
    },
    
    onError: (error, variables, context) => {
      if (context?.previousChapters) {
        queryClient.setQueryData(chapterKeys.list(courseId), context.previousChapters)
      }
      toast.error('Failed to create chapter')
    }
  })
  
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
        toast.success('Chapter deleted successfully!')
      }
    },
    
    onError: (error, variables, context) => {
      if (context?.previousChapters) {
        queryClient.setQueryData(chapterKeys.list(courseId), context.previousChapters)
      }
      toast.error('Failed to delete chapter')
    }
  })
  
  // Reorder chapters function (client-side only for now)
  const reorderChapters = (newOrder: Chapter[]) => {
    // For now, just do optimistic update without server call
    queryClient.setQueryData(chapterKeys.list(courseId), newOrder)
    toast.success('Chapters reordered!')
  }
  
  return {
    chapters: chaptersQuery.data,
    isLoading: chaptersQuery.isLoading,
    error: chaptersQuery.error,
    createChapter: createMutation.mutate,
    updateChapter: updateMutation.mutate,
    deleteChapter: deleteMutation.mutate,
    reorderChapters,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: false
  }
}
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
import { useCourseWebSocketSimple } from './use-course-websocket-simple'
import { generateOperationId } from '@/lib/websocket-operations'
import { courseEventObserver, COURSE_EVENTS, MEDIA_EVENTS } from '@/lib/course-event-observer'
import { useMemo, useEffect } from 'react'

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
  const websocket = useCourseWebSocketSimple(courseId)
  
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
  
  // Remove noisy chapter logging
  
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
  
  // Observer subscriptions for real-time updates (re-enabled with stable dependencies)
  useEffect(() => {
    const unsubscribers = [
      // Chapter update completion
      courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, (event) => {
        if (event.courseId !== courseId) return
        
        console.log('📚 Chapter update completed via Observer:', event)
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
        
        // Handle operation completion tracking if needed
        if (event.operationId) {
          toast.success('Chapter updated')
        }
      }),

      // Chapter creation completion  
      courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_CREATE_COMPLETE, (event) => {
        if (event.courseId !== courseId) return
        
        console.log('📚 Chapter created via Observer:', event)
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
        
        if (event.operationId) {
          toast.success('Chapter created')
        }
      }),

      // Chapter deletion completion
      courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_DELETE_COMPLETE, (event) => {
        if (event.courseId !== courseId) return
        
        console.log('🗑️ Chapter deleted via Observer:', event)
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
        
        if (event.operationId) {
          toast.success('Chapter deleted')
        }
      })
    ]

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [courseId, queryClient]) // Stable dependencies only - no more circular issues

  // Update chapter mutation
  const updateMutation = useMutation({
    mutationFn: ({ chapterId, updates, operationId }: { 
      chapterId: string, 
      updates: Partial<Chapter>, 
      operationId?: string 
    }) =>
      updateChapterAction(chapterId, updates, operationId),
    
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
    
    onSuccess: (result, variables) => {
      console.log('🎯 Chapter update result:', result)
      
      // WebSocket-enabled response
      if (result.operationId && result.immediate) {
        console.log(`🚀 WebSocket chapter operation started: ${result.operationId}`)
        // WebSocket will handle completion and cache updates
        return
      }
      
      // Legacy synchronous response - no toast (handled by parent)
      console.log('✅ Chapter updated successfully (legacy, no toast)')
      
      // Background refetch for consistency (skip error checking since onSuccess means it worked)
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: chapterKeys.list(courseId) })
      }, 2000)
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
    mutationFn: ({ chapterId, operationId }: { chapterId: string, operationId?: string }) => 
      deleteChapterAction(courseId, chapterId, operationId),
    
    onMutate: async ({ chapterId }) => {
      await queryClient.cancelQueries({ queryKey: chapterKeys.list(courseId) })
      
      const previousChapters = queryClient.getQueryData(chapterKeys.list(courseId))
      
      // Optimistic update - remove chapter
      queryClient.setQueryData(chapterKeys.list(courseId), (old: Chapter[] = []) =>
        old.filter(chapter => chapter.id !== chapterId)
      )
      
      return { previousChapters, deletedChapterId: chapterId }
    },
    
    onSuccess: (result, variables) => {
      console.log('🗑️ Chapter delete result:', result)
      
      // WebSocket-enabled response
      if (result.operationId && result.immediate) {
        console.log(`🚀 WebSocket chapter delete operation started: ${result.operationId}`)
        // WebSocket will handle completion and cache updates
        return
      }
      
      // Legacy synchronous response - no individual toast (handled by consolidated save toast)
      console.log('✅ Chapter deleted successfully (legacy)')
      
      // Background refetch for consistency
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: chapterKeys.list(courseId) })
      }, 2000)
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
  
  // WebSocket-enabled chapter update function (with Observer pattern)
  const updateChapterWithWebSocket = (chapterId: string, updates: Partial<Chapter>) => {
    const operationId = websocket.generateOperationId()
    console.log(`📚 Starting WebSocket chapter update: ${operationId}`)
    
    // Observer system will handle completion notifications via WebSocket events
    updateMutation.mutate({ chapterId, updates, operationId })
  }
  
  // WebSocket-enabled chapter delete function (with Observer pattern)
  const deleteChapterWithWebSocket = (chapterId: string) => {
    const operationId = websocket.generateOperationId()
    console.log(`🗑️ Starting WebSocket chapter delete: ${operationId}`)
    
    // Observer system will handle completion notifications via WebSocket events
    deleteMutation.mutate({ chapterId, operationId })
  }
  
  // Legacy chapter update function (no WebSocket)
  const updateChapterLegacy = (chapterId: string, updates: Partial<Chapter>) => {
    updateMutation.mutate({ chapterId, updates })
  }
  
  // Legacy chapter delete function (no WebSocket)
  const deleteChapterLegacy = (chapterId: string) => {
    deleteMutation.mutate({ chapterId })
  }
  
  // Listen for media-linked events to refresh chapters data (moved from use-course-queries.ts)
  useEffect(() => {
    const unsubscribe = courseEventObserver.subscribe(MEDIA_EVENTS.MEDIA_LINKED, (event) => {
      if (event.courseId === courseId) {
        console.log('🔗 [CHAPTERS] Media linked event received, refreshing chapters data')
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
      }
    })
    
    return unsubscribe
  }, [courseId, queryClient])
  
  return {
    chapters: chapters, // ARCHITECTURE-COMPLIANT: Direct from TanStack, no merging
    isLoading: chaptersQuery.isLoading,
    error: chaptersQuery.error,
    createChapter: createChapter,
    updateChapter: updateChapterWithWebSocket, // WebSocket-enabled update
    updateChapterMutation: updateMutation, // Expose mutation object for callback support
    deleteChapter: deleteChapterWithWebSocket, // WebSocket-enabled delete
    deleteChapterMutation: deleteMutation, // Expose mutation object for callback support
    reorderChapters,
    isCreating: false, // Chapter creation is immediate to cache, no loading needed
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending, // ARCHITECTURE-COMPLIANT: Real mutation loading state
    // WebSocket connection state
    isWebSocketConnected: websocket.isConnected
  }
}
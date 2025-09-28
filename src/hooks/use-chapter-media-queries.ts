import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  linkMediaToChapterAction,
  unlinkMediaFromChapterAction,
  reorderChapterMediaAction,
  updateMediaTitleAction,
  getChapterContentAction,
  getCourseWithMediaAction
} from '@/app/actions/chapter-media-actions'
import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { useCourseWebSocketSimple } from './use-course-websocket-simple'
import { courseEventObserver, COURSE_EVENTS, MEDIA_EVENTS } from '@/lib/course-event-observer'
import { useEffect } from 'react'

// ===== QUERY KEYS =====
export const chapterMediaKeys = {
  all: ['chapter-media'] as const,
  courses: () => [...chapterMediaKeys.all, 'course'] as const,
  course: (courseId: string) => [...chapterMediaKeys.courses(), courseId] as const,
  chapters: () => [...chapterMediaKeys.all, 'chapter'] as const,
  chapter: (chapterId: string) => [...chapterMediaKeys.chapters(), chapterId] as const,
  media: () => [...chapterMediaKeys.all, 'media'] as const,
  mediaUsage: (mediaId: string) => [...chapterMediaKeys.media(), 'usage', mediaId] as const,
}

// Type definitions for junction table data
export interface ChapterMedia {
  junctionId: string
  order: number
  customTitle: string | null
  createdAt: string
  // Media file properties
  id: string
  name: string
  file_type: string
  file_size: number
  duration_seconds: number | null
  cdn_url: string
  thumbnail_url: string | null
}

export interface ChapterWithMedia {
  id: string
  title: string
  order_position: number
  course_id: string
  created_at: string
  updated_at: string
  media: ChapterMedia[]
}

export interface CourseWithMedia {
  id: string
  title: string
  description: string
  thumbnail_url?: string
  instructor_id: string
  price: number | null
  status: string
  chapters: ChapterWithMedia[]
}

// ===== INSTRUCTOR HOOKS =====

/**
 * Get complete course structure with media (replaces use-video-queries.ts)
 */
export function useCourseWithMedia(courseId: string) {
  const queryClient = useQueryClient()
  const websocket = useCourseWebSocketSimple(courseId)

  const query = useQuery({
    queryKey: chapterMediaKeys.course(courseId),
    queryFn: async () => {
      try {
        const result = await getCourseWithMediaAction(courseId)
        console.log('📚 [COURSE MEDIA] Query result:', result)

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch course content')
        }

        return result.data as CourseWithMedia
      } catch (error) {
        console.error('📚 [COURSE MEDIA] Query error:', error)
        throw error
      }
    },
    enabled: !!courseId,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    retry: 2
  })

  // Listen for real-time updates via WebSocket observer
  useEffect(() => {
    const unsubscribers = [
      // Media linked event
      courseEventObserver.subscribe(MEDIA_EVENTS.MEDIA_LINKED, (event) => {
        if (event.courseId === courseId) {
          console.log('🔗 [COURSE MEDIA] Media linked event received, refreshing course data')
          queryClient.invalidateQueries({ queryKey: chapterMediaKeys.course(courseId) })
        }
      }),

      // Media unlinked event
      courseEventObserver.subscribe(MEDIA_EVENTS.MEDIA_UNLINKED, (event) => {
        if (event.courseId === courseId) {
          console.log('🔓 [COURSE MEDIA] Media unlinked event received, refreshing course data')
          queryClient.invalidateQueries({ queryKey: chapterMediaKeys.course(courseId) })
        }
      }),

      // Chapter update events
      courseEventObserver.subscribe(COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE, (event) => {
        if (event.courseId === courseId) {
          console.log('📚 [COURSE MEDIA] Chapter updated, refreshing course data')
          queryClient.invalidateQueries({ queryKey: chapterMediaKeys.course(courseId) })
        }
      })
    ]

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [courseId, queryClient])

  return {
    courseData: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isWebSocketConnected: websocket.isConnected
  }
}

/**
 * Get single chapter content with media
 */
export function useChapterContent(chapterId: string) {
  return useQuery({
    queryKey: chapterMediaKeys.chapter(chapterId),
    queryFn: async () => {
      const result = await getChapterContentAction(chapterId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch chapter content')
      }
      return result.data as ChapterWithMedia
    },
    enabled: !!chapterId,
    staleTime: 1000 * 60 * 2
  })
}

/**
 * Link media to chapter mutation
 */
export function useLinkMediaToChapter(chapterId: string) {
  const queryClient = useQueryClient()
  const websocket = useCourseWebSocketSimple('')

  return useMutation({
    mutationFn: async ({
      mediaId,
      customTitle
    }: {
      mediaId: string
      customTitle?: string
    }) => {
      console.log('🔗 [HOOK] Linking media to chapter:', { mediaId, chapterId, customTitle })
      const result = await linkMediaToChapterAction(mediaId, chapterId, customTitle)

      if (!result.success) {
        throw new Error(result.error || 'Failed to link media to chapter')
      }

      return result
    },

    onMutate: async ({ mediaId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: chapterMediaKeys.chapter(chapterId) })

      // We could add optimistic updates here, but for now keep it simple
      console.log('🔗 [HOOK] Starting link operation for media:', mediaId)
    },

    onSuccess: (result) => {
      console.log('✅ [HOOK] Media linked successfully:', result)

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: chapterMediaKeys.chapter(chapterId) })

      // Also invalidate course-level cache
      queryClient.invalidateQueries({ queryKey: chapterMediaKeys.courses() })

      // Broadcast event for other components
      courseEventObserver.emit(MEDIA_EVENTS.MEDIA_LINKED, {
        courseId: result.data?.course_chapters?.course_id || '',
        chapterId: chapterId,
        mediaId: result.data?.media_file_id || '',
        junctionId: result.data?.id || ''
      })

      toast.success(result.message || 'Media linked to chapter')
    },

    onError: (error) => {
      console.error('❌ [HOOK] Link media error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to link media to chapter')
    }
  })
}

/**
 * Unlink media from chapter mutation
 */
export function useUnlinkMediaFromChapter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (junctionId: string) => {
      console.log('🔓 [HOOK] Unlinking media from chapter:', junctionId)
      const result = await unlinkMediaFromChapterAction(junctionId)

      if (!result.success) {
        throw new Error(result.error || 'Failed to unlink media from chapter')
      }

      return result
    },

    onSuccess: (result) => {
      console.log('✅ [HOOK] Media unlinked successfully:', result)

      // Invalidate all course and chapter queries
      queryClient.invalidateQueries({ queryKey: chapterMediaKeys.all })

      toast.success(result.message || 'Media unlinked from chapter')
    },

    onError: (error) => {
      console.error('❌ [HOOK] Unlink media error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to unlink media from chapter')
    }
  })
}

/**
 * Reorder media within chapter mutation
 */
export function useReorderChapterMedia(chapterId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newOrder: Array<{ junctionId: string, newPosition: number }>) => {
      console.log('🔄 [HOOK] Reordering chapter media:', newOrder)
      const result = await reorderChapterMediaAction(chapterId, newOrder)

      if (!result.success) {
        throw new Error(result.error || 'Failed to reorder media')
      }

      return result
    },

    onMutate: async (newOrder) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: chapterMediaKeys.chapter(chapterId) })

      // Optimistic update - reorder items in cache
      const previousChapter = queryClient.getQueryData(chapterMediaKeys.chapter(chapterId))

      if (previousChapter) {
        queryClient.setQueryData(chapterMediaKeys.chapter(chapterId), (old: ChapterWithMedia) => {
          if (!old) return old

          const reorderedMedia = [...old.media]
          reorderedMedia.sort((a, b) => {
            const aOrder = newOrder.find(item => item.junctionId === a.junctionId)?.newPosition || a.order
            const bOrder = newOrder.find(item => item.junctionId === b.junctionId)?.newPosition || b.order
            return aOrder - bOrder
          })

          return {
            ...old,
            media: reorderedMedia
          }
        })
      }

      return { previousChapter }
    },

    onSuccess: (result) => {
      console.log('✅ [HOOK] Media reordered successfully:', result)

      // Refresh data from server
      queryClient.invalidateQueries({ queryKey: chapterMediaKeys.chapter(chapterId) })
      queryClient.invalidateQueries({ queryKey: chapterMediaKeys.courses() })

      toast.success(result.message || 'Media reordered successfully')
    },

    onError: (error, variables, context) => {
      console.error('❌ [HOOK] Reorder media error:', error)

      // Rollback optimistic update
      if (context?.previousChapter) {
        queryClient.setQueryData(chapterMediaKeys.chapter(chapterId), context.previousChapter)
      }

      toast.error(error instanceof Error ? error.message : 'Failed to reorder media')
    }
  })
}

/**
 * Update media title mutation
 */
export function useUpdateMediaTitle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      junctionId,
      customTitle
    }: {
      junctionId: string
      customTitle: string
    }) => {
      console.log('📝 [HOOK] Updating media title:', { junctionId, customTitle })
      const result = await updateMediaTitleAction(junctionId, customTitle)

      if (!result.success) {
        throw new Error(result.error || 'Failed to update media title')
      }

      return result
    },

    onSuccess: (result) => {
      console.log('✅ [HOOK] Media title updated successfully:', result)

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: chapterMediaKeys.all })

      toast.success(result.message || 'Media title updated')
    },

    onError: (error) => {
      console.error('❌ [HOOK] Update title error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update media title')
    }
  })
}

/**
 * Batch operations for complex UI interactions
 */
export function useBatchChapterMediaOperations(chapterId: string) {
  const linkMutation = useLinkMediaToChapter(chapterId)
  const unlinkMutation = useUnlinkMediaFromChapter()
  const reorderMutation = useReorderChapterMedia(chapterId)
  const updateTitleMutation = useUpdateMediaTitle()

  return {
    linkMedia: linkMutation.mutate,
    unlinkMedia: unlinkMutation.mutate,
    reorderMedia: reorderMutation.mutate,
    updateTitle: updateTitleMutation.mutate,

    isAnyLoading:
      linkMutation.isPending ||
      unlinkMutation.isPending ||
      reorderMutation.isPending ||
      updateTitleMutation.isPending,

    allMutations: {
      link: linkMutation,
      unlink: unlinkMutation,
      reorder: reorderMutation,
      updateTitle: updateTitleMutation
    }
  }
}
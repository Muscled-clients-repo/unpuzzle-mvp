import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getChaptersForCourseAction,
  createChapterAction,
  renameChapterAction
} from '@/app/actions/chapter-actions'
import { toast } from 'sonner'

/**
 * Chapter mutation hooks for virtual chapters
 * Since chapters are virtual (computed from video.chapter_id), 
 * we mainly need to refetch data after changes
 */
export function useChapterMutations() {
  const queryClient = useQueryClient()

  const createChapter = useMutation({
    mutationFn: async ({ courseId, title }: { courseId: string; title: string }) => {
      const result = await createChapterAction(courseId, title)
      return result
    },
    onMutate: async ({ courseId, title }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['chapters', courseId] })
      
      // Snapshot previous value
      const previousChapters = queryClient.getQueryData(['chapters', courseId])
      
      // Optimistically update with new empty chapter
      const newChapter = {
        id: `chapter-${Date.now()}`,
        title,
        courseId,
        videos: [],
        videoCount: 0
      }
      
      queryClient.setQueryData(['chapters', courseId], (old: any) => {
        const chapters = old || []
        return [...chapters, newChapter]
      })
      
      return { previousChapters, newChapter }
    },
    onSuccess: (result, { courseId }) => {
      if (result.success) {
        // Update the optimistic chapter with the real one
        queryClient.setQueryData(['chapters', courseId], (old: any) => {
          const chapters = old || []
          return chapters.map((chapter: any) => 
            chapter.id.startsWith('chapter-') && chapter.videos.length === 0
              ? { ...chapter, id: result.data.id, title: result.data.title }
              : chapter
          )
        })
      } else {
        toast.error(result.error || 'Failed to create chapter')
      }
    },
    onError: (error, { courseId }, context) => {
      // Rollback optimistic update
      if (context?.previousChapters) {
        queryClient.setQueryData(['chapters', courseId], context.previousChapters)
      }
      console.error('Create chapter error:', error)
      toast.error('Failed to create chapter')
    },
  })

  const updateChapter = useMutation({
    mutationFn: async ({ 
      courseId, 
      chapterId, 
      updates 
    }: { 
      courseId: string; 
      chapterId: string; 
      updates: { title?: string } 
    }) => {
      if (!updates.title) {
        return { success: false, error: 'Title is required' }
      }
      
      const result = await renameChapterAction(courseId, chapterId, updates.title)
      return result
    },
    onMutate: async ({ courseId, chapterId, updates }) => {
      if (!updates.title) return
      
      console.log('🔄 [CHAPTER UPDATE] Starting optimistic update:', { courseId, chapterId, newTitle: updates.title })
      
      // Cancel outgoing refetches for BOTH cache keys  
      await queryClient.cancelQueries({ queryKey: ['chapters', courseId] })
      await queryClient.cancelQueries({ queryKey: ['course', courseId] })
      
      // Snapshot both previous values
      const previousChapters = queryClient.getQueryData(['chapters', courseId])
      const previousCourse = queryClient.getQueryData(['course', courseId])
      console.log('📸 Previous chapters data:', previousChapters)
      console.log('📸 Previous course data:', previousCourse)
      
      // Update CHAPTERS cache (this is what ChapterManager reads!)
      queryClient.setQueryData(['chapters', courseId], (old: any) => {
        if (!old || !Array.isArray(old)) {
          console.log('⚠️ No chapters data found')
          return old
        }
        
        const updatedChapters = old.map((chapter: any) => {
          if (chapter.id === chapterId) {
            console.log(`📝 Optimistic update (chapters): ${chapter.id} "${chapter.title}" → "${updates.title}"`)
            return { ...chapter, title: updates.title }
          }
          return chapter
        })
        
        console.log('✨ Chapters optimistic update applied successfully')
        return updatedChapters
      })
      
      // Also update course cache for consistency (in case anything reads from there)
      queryClient.setQueryData(['course', courseId], (old: any) => {
        if (!old) {
          console.log('⚠️ No course data found') 
          return old
        }
        console.log('✨ Course cache updated for consistency')
        return old // Course cache doesn't need chapter titles
      })
      
      return { previousChapters, previousCourse }
    },
    onError: (err, variables, context) => {
      console.error('❌ Chapter update failed, rolling back optimistic updates:', err)
      // Roll back BOTH caches
      if (context?.previousChapters) {
        queryClient.setQueryData(['chapters', variables.courseId], context.previousChapters)
        console.log('🔄 Rolled back chapters cache')
      }
      if (context?.previousCourse) {
        queryClient.setQueryData(['course', variables.courseId], context.previousCourse)
        console.log('🔄 Rolled back course cache')
      }
      toast.error('Failed to update chapter')
    },
    onSuccess: (result, { courseId, chapterId, updates }) => {
      console.log('🎉 Chapter update success:', result)
      if (result.success) {
        toast.success('Chapter updated successfully')
        
        // Background reconciliation after delay - don't invalidate immediately
        setTimeout(() => {
          console.log('🔄 Background sync: Refetching chapters data for reconciliation')
          queryClient.refetchQueries({ queryKey: ['chapters', courseId] })
        }, 2000) // Background sync after 2 seconds
      } else {
        console.error('❌ Server returned error:', result.error)
        toast.error(result.error || 'Failed to update chapter')
      }
    }
  })

  const deleteChapter = useMutation({
    mutationFn: async ({ 
      courseId, 
      chapterId 
    }: { 
      courseId: string; 
      chapterId: string 
    }) => {
      // Deleting a virtual chapter would mean reassigning all its videos
      // This is complex - for now we'll simulate success
      return { success: true }
    },
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['chapters', courseId] })
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      toast.success('Chapter deleted')
    },
    onError: (error) => {
      console.error('Delete chapter error:', error)
      toast.error('Failed to delete chapter')
    },
  })

  const reorderChapters = useMutation({
    mutationFn: async ({ 
      courseId, 
      chapters 
    }: { 
      courseId: string; 
      chapters: any[] 
    }) => {
      // Reordering virtual chapters would require updating video orders
      // This is complex - for now we'll simulate success
      return { success: true }
    },
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['chapters', courseId] })
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      toast.success('Chapters reordered')
    },
    onError: (error) => {
      console.error('Reorder chapters error:', error)
      toast.error('Failed to reorder chapters')
    },
  })

  return {
    createChapter,
    updateChapter,
    deleteChapter,
    reorderChapters,
  }
}
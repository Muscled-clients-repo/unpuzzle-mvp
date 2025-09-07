import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateChapterAction } from '@/app/actions/chapter-actions'

/**
 * POC: Chapter mutations using PROVEN VIDEO PATTERN
 */
export function useChapterMutationsPOC(courseId: string) {
  const queryClient = useQueryClient()
  
  // === PROVEN PATTERN: Batch Chapter Update (copied from batchUpdateVideoOrdersSilent) ===
  const batchUpdateChaptersSilent = useMutation({
    mutationFn: (updates: Array<{
      id: string
      title?: string
    }>) => {
      // For POC, call individual chapter updates (can batch later if needed)
      return Promise.all(
        updates.map(update => 
          updateChapterAction(update.id, { title: update.title })
        )
      )
    },
    
    onMutate: async (updates) => {
      console.log('🔄 [POC] Chapter mutation starting with updates:', updates)
      console.log('🔍 [POC] About to update cache key:', ['chapters', courseId])
      console.log('🔍 [POC] Current chapters cache:', queryClient.getQueryData(['chapters', courseId]))
      
      // PROVEN PATTERN: Cancel outgoing refetches for BOTH cache keys
      await queryClient.cancelQueries({ queryKey: ['course', courseId] })
      await queryClient.cancelQueries({ queryKey: ['chapters', courseId] })

      // PROVEN PATTERN: Snapshot both previous values
      const previousCourse = queryClient.getQueryData(['course', courseId])
      const previousChapters = queryClient.getQueryData(['chapters', courseId])
      console.log('📸 [POC] Previous course data:', previousCourse)
      console.log('📸 [POC] Previous chapters data:', previousChapters)

      // PROVEN PATTERN: Update CHAPTERS cache (this is what the UI actually reads!)
      queryClient.setQueryData(['chapters', courseId], (old: any) => {
        if (!old || !Array.isArray(old)) {
          console.log('⚠️ [POC] No chapters data found')
          return old
        }

        const updatedChapters = old.map((chapter: any) => {
          const update = updates.find(u => u.id === chapter.id)
          if (update && update.title) {
            console.log(`📝 [POC] Optimistic update (chapters): ${chapter.id} "${chapter.title || chapter.name}" → "${update.title}"`)
            return { 
              ...chapter, 
              title: update.title, 
              name: update.title // Also update name for consistency
            }
          }
          return chapter
        })

        console.log('✨ [POC] Chapters optimistic update applied successfully')
        return updatedChapters
      })

      // PROVEN PATTERN: Also update course cache for consistency (but UI doesn't read from this)
      queryClient.setQueryData(['course', courseId], (old: any) => {
        if (!old || !old.chapters) {
          console.log('⚠️ [POC] No course chapters data found')
          return old
        }

        const updatedChapters = old.chapters.map((chapter: any) => {
          const update = updates.find(u => u.id === chapter.id)
          if (update && update.title) {
            console.log(`📝 [POC] Optimistic update (course): ${chapter.id} "${chapter.title || chapter.name}" → "${update.title}"`)
            return { 
              ...chapter, 
              title: update.title, 
              name: update.title
            }
          }
          return chapter
        })

        const newData = {
          ...old,
          chapters: updatedChapters
        }
        
        console.log('✨ [POC] Course optimistic update applied successfully')
        console.log(`🎯 [POC] Updated ${updates.length} chapters in cache`)
        return newData
      })

      // PROVEN PATTERN: Return context with both previous values for rollback
      return { previousCourse, previousChapters }
    },
    
    onError: (err, newUpdates, context) => {
      console.error('❌ [POC] Chapter mutation failed, rolling back optimistic updates:', err)
      // PROVEN PATTERN: Roll back BOTH caches
      if (context?.previousChapters) {
        queryClient.setQueryData(['chapters', courseId], context.previousChapters)
        console.log('🔄 [POC] Rolled back chapters cache')
      }
      if (context?.previousCourse) {
        queryClient.setQueryData(['course', courseId], context.previousCourse)
        console.log('🔄 [POC] Rolled back course cache')
      }
    },
    
    onSuccess: (result, variables) => {
      console.log('🎉 [POC] Chapter mutation success:', result)
      if (result.every(r => r.success)) {
        toast.success(`${variables.length} chapter name(s) updated successfully`)
        
        // PROVEN PATTERN: Background reconciliation after delay - don't invalidate immediately
        setTimeout(() => {
          console.log('🔄 [POC] Background sync: Refetching both course and chapters data for reconciliation')
          queryClient.refetchQueries({ queryKey: ['course', courseId] })
          queryClient.refetchQueries({ queryKey: ['chapters', courseId] })
        }, 2000) // Background sync after 2 seconds
      } else {
        console.error('❌ [POC] Some chapter updates failed:', result)
        toast.error('Some chapter updates failed')
      }
    },
    
    onError: (error) => {
      console.error('❌ [POC] Chapter mutation error:', error)
      toast.error('Failed to update chapter names')
    },
    
    onSettled: () => {
      // PROVEN PATTERN: Don't invalidate immediately - trust optimistic updates
      // Background sync happens in onSuccess after delay
    }
  })
  
  return {
    batchUpdateChaptersSilent
  }
}
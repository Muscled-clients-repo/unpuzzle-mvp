import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  uploadVideoAction,
  deleteVideoAction,
  reorderVideosAction,
  moveVideoToChapterAction,
  updateVideoAction,
  batchUpdateVideoOrdersAction
} from '@/app/actions/video-actions'

/**
 * Mutation hooks for video operations
 */
export function useVideoMutations(courseId: string) {
  const queryClient = useQueryClient()
  
  // Helper function to update progress in cache by filename (for uploading videos)
  const updateVideoProgressByFilename = (filename: string, progress: number) => {
    queryClient.setQueryData(['course', courseId], (old: any) => {
      if (!old) return old
      return {
        ...old,
        videos: old.videos.map((v: any) => 
          v.filename === filename && v.status === 'uploading' ? { ...v, progress } : v
        )
      }
    })
    
    // Also update chapters cache
    queryClient.setQueryData(['chapters', courseId], (old: any) => {
      if (!old || !Array.isArray(old)) return old
      return old.map((chapter: any) => ({
        ...chapter,
        videos: chapter.videos?.map((v: any) => 
          v.filename === filename && v.status === 'uploading' ? { ...v, progress } : v
        ) || []
      }))
    })
  }
  
  // Helper function to update progress in cache by video ID
  const updateVideoProgress = (videoId: string, progress: number) => {
    queryClient.setQueryData(['course', courseId], (old: any) => {
      if (!old) return old
      return {
        ...old,
        videos: old.videos.map((v: any) => 
          v.id === videoId ? { ...v, progress } : v
        )
      }
    })
    
    // Also update chapters cache
    queryClient.setQueryData(['chapters', courseId], (old: any) => {
      if (!old || !Array.isArray(old)) return old
      return old.map((chapter: any) => ({
        ...chapter,
        videos: chapter.videos?.map((v: any) => 
          v.id === videoId ? { ...v, progress } : v
        ) || []
      }))
    })
  }
  
  // Upload video mutation with progress tracking
  const uploadVideo = useMutation({
    mutationFn: async ({ 
      file, 
      chapterId, 
      onProgress 
    }: { 
      file: File, 
      chapterId: string,
      onProgress?: (progress: number) => void 
    }) => {
      console.log('🔄 Video mutation executing:', { fileName: file.name, chapterId, courseId })
      
      // Create FormData for server action
      const formData = new FormData()
      formData.append('file', file)
      formData.append('courseId', courseId)
      formData.append('chapterId', chapterId)
      
      // Simulate upload progress based on file size (until we get real progress from server)
      if (onProgress) {
        const fileSizeMB = file.size / (1024 * 1024)
        const estimatedTimeSeconds = Math.max(2, Math.min(30, fileSizeMB * 2)) // 2-30 seconds based on size
        const progressIntervalMs = 200 // Update every 200ms
        const totalSteps = (estimatedTimeSeconds * 1000) / progressIntervalMs
        let currentStep = 0
        
        const progressInterval = setInterval(() => {
          currentStep++
          // Use exponential curve for more realistic progress
          const rawProgress = currentStep / totalSteps
          const exponentialProgress = 1 - Math.exp(-rawProgress * 3) // Exponential curve
          const percentage = Math.min(95, Math.round(exponentialProgress * 100)) // Cap at 95% until complete
          
          onProgress(percentage)
          
          if (currentStep >= totalSteps) {
            clearInterval(progressInterval)
          }
        }, progressIntervalMs)
        
        try {
          const result = await uploadVideoAction(formData)
          clearInterval(progressInterval)
          onProgress(100) // Complete
          console.log('📊 Upload action result:', result)
          return result
        } catch (error) {
          clearInterval(progressInterval)
          throw error
        }
      } else {
        // No progress tracking requested
        const result = await uploadVideoAction(formData)
        console.log('📊 Upload action result:', result)
        return result
      }
    },
    onMutate: async ({ file, chapterId }) => {
      // Optimistic update - add temporary video with progress tracking
      const tempVideo = {
        id: `temp-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        filename: file.name,
        file_size: file.size,
        chapter_id: chapterId,
        course_id: courseId,
        status: 'uploading',
        progress: 0, // Initialize progress at 0%
        order: 999, // Will be fixed on success
        created_at: new Date().toISOString()
      }
      
      // Update course cache
      queryClient.setQueryData(['course', courseId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          videos: [...(old.videos || []), tempVideo]
        }
      })
      
      // Also update chapters cache (this is what VideoList reads from!)
      queryClient.setQueryData(['chapters', courseId], (old: any) => {
        if (!old || !Array.isArray(old)) return old
        
        return old.map((chapter: any) => {
          // Add temp video to the correct chapter
          if (chapter.id === chapterId) {
            return {
              ...chapter,
              videos: [...(chapter.videos || []), tempVideo]
            }
          }
          return chapter
        })
      })
      
      return { tempVideo }
    },
    onSuccess: (result, variables, context) => {
      console.log('✅ Upload mutation success:', result)
      if (result.success) {
        // Replace temp video with real one in course cache
        queryClient.setQueryData(['course', courseId], (old: any) => {
          if (!old) return old
          const updatedData = {
            ...old,
            videos: old.videos.map((v: any) => 
              v.id === context?.tempVideo.id ? result.data : v
            )
          }
          console.log('📄 Updated course data:', updatedData)
          return updatedData
        })
        
        // Also replace in chapters cache
        queryClient.setQueryData(['chapters', courseId], (old: any) => {
          if (!old || !Array.isArray(old)) return old
          return old.map((chapter: any) => ({
            ...chapter,
            videos: chapter.videos?.map((v: any) => 
              v.id === context?.tempVideo.id ? result.data : v
            ) || []
          }))
        })
        
        queryClient.invalidateQueries({ queryKey: ['course', courseId] })
        queryClient.invalidateQueries({ queryKey: ['chapters', courseId] })
        
        toast.success('Video uploaded successfully')
      } else {
        console.error('❌ Upload failed:', result.error)
        // Remove temp video on failure from both caches
        queryClient.setQueryData(['course', courseId], (old: any) => {
          if (!old) return old
          return {
            ...old,
            videos: old.videos.filter((v: any) => v.id !== context?.tempVideo.id)
          }
        })
        
        queryClient.setQueryData(['chapters', courseId], (old: any) => {
          if (!old || !Array.isArray(old)) return old
          return old.map((chapter: any) => ({
            ...chapter,
            videos: chapter.videos?.filter((v: any) => v.id !== context?.tempVideo.id) || []
          }))
        })
        
        toast.error(result.error || 'Failed to upload video')
      }
    },
    onError: (error, variables, context) => {
      console.error('❌ Upload mutation error:', error)
      // Remove temp video on error from both caches
      queryClient.setQueryData(['course', courseId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          videos: old.videos.filter((v: any) => v.id !== context?.tempVideo.id)
        }
      })
      
      queryClient.setQueryData(['chapters', courseId], (old: any) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((chapter: any) => ({
          ...chapter,
          videos: chapter.videos?.filter((v: any) => v.id !== context?.tempVideo.id) || []
        }))
      })
      
      toast.error('Failed to upload video')
    }
  })
  
  // Delete video mutation
  const deleteVideo = useMutation({
    mutationFn: deleteVideoAction,
    onMutate: async (videoId) => {
      // Optimistically remove video
      queryClient.setQueryData(['course', courseId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          videos: old.videos.filter((v: any) => v.id !== videoId)
        }
      })
      
      return { videoId }
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['course', courseId] })
        queryClient.invalidateQueries({ queryKey: ['chapters', courseId] })
        toast.success('Video deleted successfully')
      } else {
        toast.error(result.error || 'Failed to delete video')
      }
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      toast.error('Failed to delete video')
    }
  })
  
  // Reorder videos mutation
  const reorderVideos = useMutation({
    mutationFn: ({ chapterId, videoIds }: { chapterId: string, videoIds: string[] }) =>
      reorderVideosAction(courseId, chapterId, videoIds),
    onMutate: async ({ chapterId, videoIds }) => {
      // Optimistically reorder
      queryClient.setQueryData(['course', courseId], (old: any) => {
        if (!old) return old
        
        const videosMap = new Map(old.videos.map((v: any) => [v.id, v]))
        const reorderedVideos = videoIds.map((id, index) => ({
          ...videosMap.get(id),
          order: index
        }))
        
        const otherVideos = old.videos.filter((v: any) => 
          v.chapter_id !== chapterId || !videoIds.includes(v.id)
        )
        
        return {
          ...old,
          videos: [...otherVideos, ...reorderedVideos].sort((a, b) => 
            a.chapter_id === b.chapter_id ? a.order - b.order : 0
          )
        }
      })
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['course', courseId] })
        queryClient.invalidateQueries({ queryKey: ['chapters', courseId] })
      } else {
        toast.error(result.error || 'Failed to reorder videos')
      }
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      toast.error('Failed to reorder videos')
    }
  })
  
  // Move video to chapter mutation
  const moveVideoToChapter = useMutation({
    mutationFn: ({ videoId, newChapterId, newOrder }: {
      videoId: string
      newChapterId: string
      newOrder: number
    }) => moveVideoToChapterAction(videoId, newChapterId, newOrder),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['course', courseId] })
        queryClient.invalidateQueries({ queryKey: ['chapters', courseId] })
        toast.success('Video moved successfully')
      } else {
        toast.error(result.error || 'Failed to move video')
      }
    },
    onError: () => {
      toast.error('Failed to move video')
    }
  })
  
  // Update video metadata mutation
  const updateVideo = useMutation({
    mutationFn: ({ videoId, updates }: {
      videoId: string
      updates: { title?: string; description?: string; thumbnail_url?: string }
    }) => updateVideoAction(videoId, updates),
    onMutate: async ({ videoId, updates }) => {
      // Optimistic update
      queryClient.setQueryData(['course', courseId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          videos: old.videos.map((v: any) => 
            v.id === videoId ? { ...v, ...updates } : v
          )
        }
      })
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['course', courseId] })
        toast.success('Video updated successfully')
      } else {
        toast.error(result.error || 'Failed to update video')
      }
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      toast.error('Failed to update video')
    }
  })
  
  // Batch update video orders (for complex drag operations)
  const batchUpdateVideoOrders = useMutation({
    mutationFn: (updates: Array<{
      id: string
      order: number
      chapter_id: string
      title?: string
    }>) => batchUpdateVideoOrdersAction(courseId, updates),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['course', courseId] })
        queryClient.invalidateQueries({ queryKey: ['chapters', courseId] })
      }
      // No toast here - let the caller handle it to avoid duplicates
    },
    onError: () => {
      // No toast here - let the caller handle it to avoid duplicates
    }
  })

  // Silent batch update for filename changes (no automatic toasts)
  const batchUpdateVideoOrdersSilent = useMutation({
    mutationFn: (updates: Array<{
      id: string
      order: number
      chapter_id: string
      title?: string
    }>) => batchUpdateVideoOrdersAction(courseId, updates),
    onMutate: async (updates) => {
      console.log('🔄 [INVESTIGATION] Mutation starting with updates:', updates)
      console.log('🔍 [INVESTIGATION] About to update cache key:', ['course', courseId])
      console.log('🔍 [INVESTIGATION] Current course cache:', queryClient.getQueryData(['course', courseId]))
      console.log('🔍 [INVESTIGATION] Current chapters cache:', queryClient.getQueryData(['chapters', courseId]))
      
      // Cancel outgoing refetches for BOTH cache keys
      await queryClient.cancelQueries({ queryKey: ['course', courseId] })
      await queryClient.cancelQueries({ queryKey: ['chapters', courseId] })

      // Snapshot both previous values
      const previousCourse = queryClient.getQueryData(['course', courseId])
      const previousChapters = queryClient.getQueryData(['chapters', courseId])
      console.log('📸 Previous course data:', previousCourse)
      console.log('📸 Previous chapters data:', previousChapters)

      // Update CHAPTERS cache (this is what the UI actually reads!)
      queryClient.setQueryData(['chapters', courseId], (old: any) => {
        if (!old || !Array.isArray(old)) {
          console.log('⚠️ No chapters data found')
          return old
        }

        const updatedChapters = old.map((chapter: any) => {
          if (!chapter.videos || !Array.isArray(chapter.videos)) {
            return chapter
          }

          const updatedVideos = chapter.videos.map((video: any) => {
            const update = updates.find(u => u.id === video.id)
            if (update && update.title) {
              console.log(`📝 Optimistic update (chapters): ${video.id} "${video.title || video.name || video.filename}" → "${update.title}"`)
              return { 
                ...video, 
                title: update.title, 
                name: update.title,
                filename: video.filename 
              }
            }
            return video
          })

          return {
            ...chapter,
            videos: updatedVideos
          }
        })

        console.log('✨ Chapters optimistic update applied successfully')
        return updatedChapters
      })

      // Also update course cache for consistency (but UI doesn't read from this)
      queryClient.setQueryData(['course', courseId], (old: any) => {
        if (!old || !old.videos) {
          console.log('⚠️ No old data or videos found')
          return old
        }

        const updatedVideos = old.videos.map((video: any) => {
          const update = updates.find(u => u.id === video.id)
          if (update && update.title) {
            console.log(`📝 Optimistic update: ${video.id} "${video.title || video.name || video.filename}" → "${update.title}"`)
            return { 
              ...video, 
              title: update.title, 
              name: update.title,
              // Ensure filename fallback is preserved
              filename: video.filename 
            }
          }
          return video
        })

        const newData = {
          ...old,
          videos: updatedVideos
        }
        
        console.log('✨ Optimistic update applied successfully')
        console.log(`🎯 Updated ${updates.length} videos in cache`)
        return newData
      })

      // Return context with both previous values for rollback
      return { previousCourse, previousChapters }
    },
    onError: (err, newUpdates, context) => {
      console.error('❌ Mutation failed, rolling back optimistic updates:', err)
      // Roll back BOTH caches
      if (context?.previousChapters) {
        queryClient.setQueryData(['chapters', courseId], context.previousChapters)
        console.log('🔄 Rolled back chapters cache')
      }
      if (context?.previousCourse) {
        queryClient.setQueryData(['course', courseId], context.previousCourse)
        console.log('🔄 Rolled back course cache')
      }
    },
    onSuccess: (result, variables) => {
      console.log('🎉 Mutation success:', result)
      if (result.success) {
        toast.success(`${variables.length} video name(s) updated successfully`)
        
        // Background reconciliation after delay - don't invalidate immediately
        setTimeout(() => {
          console.log('🔄 Background sync: Refetching both course and chapters data for reconciliation')
          queryClient.refetchQueries({ queryKey: ['course', courseId] })
          queryClient.refetchQueries({ queryKey: ['chapters', courseId] })
        }, 2000) // Background sync after 2 seconds
      } else {
        console.error('❌ Server returned error:', result.error)
        toast.error(result.error || 'Failed to update video names')
      }
    },
    onError: (error) => {
      console.error('❌ Mutation error:', error)
      toast.error('Failed to update video names')
    },
    onSettled: () => {
      // Don't invalidate immediately - trust optimistic updates
      // Background sync happens in onSuccess after delay
    }
  })
  
  return {
    uploadVideo,
    deleteVideo,
    reorderVideos,
    moveVideoToChapter,
    updateVideo,
    batchUpdateVideoOrders,
    batchUpdateVideoOrdersSilent,
    updateVideoProgress,
    updateVideoProgressByFilename
  }
}
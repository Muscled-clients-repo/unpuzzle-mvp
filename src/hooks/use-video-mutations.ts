import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAppStore } from '@/stores/app-store'
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
  const { setUploadProgress, clearUploadProgress } = useAppStore()
  
  // Upload video mutation with progress tracking
  const uploadVideo = useMutation({
    mutationFn: async ({ file, chapterId }: { file: File, chapterId: string }) => {
      const tempId = `temp-${Date.now()}`
      
      // Start progress tracking
      setUploadProgress(tempId, 0)
      
      // Simulate progress (in production, get real progress from upload)
      const progressInterval = setInterval(() => {
        setUploadProgress(tempId, prev => Math.min(prev + 10, 90))
      }, 500)
      
      try {
        const result = await uploadVideoAction(file, courseId, chapterId)
        
        clearInterval(progressInterval)
        setUploadProgress(tempId, 100)
        
        setTimeout(() => {
          clearUploadProgress(tempId)
        }, 1000)
        
        return result
      } catch (error) {
        clearInterval(progressInterval)
        clearUploadProgress(tempId)
        throw error
      }
    },
    onMutate: async ({ file, chapterId }) => {
      // Optimistic update - add temporary video
      const tempVideo = {
        id: `temp-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        filename: file.name,
        file_size: file.size,
        chapter_id: chapterId,
        course_id: courseId,
        status: 'uploading',
        order: 999, // Will be fixed on success
        created_at: new Date().toISOString()
      }
      
      queryClient.setQueryData(['course', courseId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          videos: [...(old.videos || []), tempVideo]
        }
      })
      
      return { tempVideo }
    },
    onSuccess: (result, variables, context) => {
      if (result.success) {
        // Replace temp video with real one
        queryClient.setQueryData(['course', courseId], (old: any) => {
          if (!old) return old
          return {
            ...old,
            videos: old.videos.map((v: any) => 
              v.id === context?.tempVideo.id ? result.data : v
            )
          }
        })
        
        queryClient.invalidateQueries({ queryKey: ['course', courseId] })
        queryClient.invalidateQueries({ queryKey: ['chapters', courseId] })
        
        toast.success('Video uploaded successfully')
      } else {
        // Remove temp video on failure
        queryClient.setQueryData(['course', courseId], (old: any) => {
          if (!old) return old
          return {
            ...old,
            videos: old.videos.filter((v: any) => v.id !== context?.tempVideo.id)
          }
        })
        
        toast.error(result.error || 'Failed to upload video')
      }
    },
    onError: (error, variables, context) => {
      // Remove temp video on error
      queryClient.setQueryData(['course', courseId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          videos: old.videos.filter((v: any) => v.id !== context?.tempVideo.id)
        }
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
      } else {
        toast.error(result.error || 'Failed to update videos')
      }
    },
    onError: () => {
      toast.error('Failed to update videos')
    }
  })
  
  return {
    uploadVideo,
    deleteVideo,
    reorderVideos,
    moveVideoToChapter,
    updateVideo,
    batchUpdateVideoOrders
  }
}
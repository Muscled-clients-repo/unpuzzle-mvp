import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  uploadVideoAction,
  updateVideoAction,
  deleteVideoAction,
  batchUpdateVideoOrdersAction,
  reorderVideosAction
} from '@/app/actions/video-actions'
import type { Video, UploadItem } from '@/types'
import { chapterKeys } from './use-chapter-queries'
import { useCourseCreationUI } from '@/stores/course-creation-ui'

// ===== QUERY KEYS =====
export const videoKeys = {
  all: ['videos'] as const,
  lists: () => [...videoKeys.all, 'list'] as const,
  list: (courseId: string) => [...videoKeys.lists(), courseId] as const,
  chapter: (chapterId: string) => [...videoKeys.all, 'chapter', chapterId] as const,
  details: () => [...videoKeys.all, 'detail'] as const,
  detail: (id: string) => [...videoKeys.details(), id] as const,
}

// ===== VIDEO UPLOAD HOOK =====
export function useVideoUpload(courseId: string) {
  const queryClient = useQueryClient()
  
  const uploadMutation = useMutation({
    mutationFn: async ({ 
      file, 
      chapterId, 
      tempVideoId
    }: { 
      file: File
      chapterId: string
      tempVideoId: string
    }) => {
      // ARCHITECTURE-COMPLIANT: mutationFn only calls server action
      // Progress tracking will be handled by WebSocket updates to TanStack cache
      return uploadVideoAction({
        file,
        courseId,
        chapterId
      })
    },
    
    onMutate: async ({ file, chapterId, tempVideoId }) => {
      // Create temporary video object for immediate UI feedback
      const tempVideo: Video = {
        id: tempVideoId,
        filename: file.name,
        originalFilename: file.name,
        course_id: courseId,
        chapter_id: chapterId,
        order: 0, // Will be calculated by server
        duration: null,
        size: file.size,
        format: file.type,
        status: 'uploading',
        backblaze_file_id: null,
        backblaze_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // ARCHITECTURE-COMPLIANT: Upload progress in TanStack
        uploadProgress: 0,
        uploadStartTime: Date.now()
      }
      
      // Add to videos cache optimistically
      queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) => [
        ...old,
        tempVideo
      ])
      
      // Update chapters cache to reflect new video count
      queryClient.setQueryData(chapterKeys.list(courseId), (old: any) => {
        if (!Array.isArray(old)) return old
        
        return old.map((chapter: any) => 
          chapter.id === chapterId
            ? {
                ...chapter,
                videos: [...(chapter.videos || []), tempVideo],
                videoCount: (chapter.videoCount || 0) + 1
              }
            : chapter
        )
      })
      
      return { tempVideoId: tempVideo.id }
    },
    
    onSuccess: (result, variables, context) => {
      if (result.success && result.data) {
        const realVideo = result.data
        
        // ARCHITECTURE-COMPLIANT: Update temporary video with real data but preserve temp ID to avoid React key change
        // This prevents edit mode exit when upload completes during filename editing
        queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) =>
          old.map(video => 
            video.id === context?.tempVideoId 
              ? { ...realVideo, id: context.tempVideoId } // Keep temp ID to preserve React key
              : video
          )
        )
        
        // Update chapters cache (preserve temp ID to avoid React key change)
        queryClient.setQueryData(chapterKeys.list(courseId), (old: any) => {
          if (!Array.isArray(old)) return old
          
          return old.map((chapter: any) => 
            chapter.id === variables.chapterId
              ? {
                  ...chapter,
                  videos: chapter.videos.map((video: Video) =>
                    video.id === context?.tempVideoId 
                      ? { ...realVideo, id: context.tempVideoId } // Keep temp ID to preserve React key
                      : video
                  )
                }
              : chapter
          )
        })
        
        // Extract a cleaner filename by removing UUID and timestamp
        const cleanFilename = realVideo.filename
          .replace(/_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.mp4$/, '.mp4') // Remove timestamp
          .replace(/^[a-f0-9-]{36}_/, '') // Remove UUID prefix
          .replace(/^.*\//, '') // Remove any path prefixes
        
        toast.success(`📹 ${cleanFilename} uploaded successfully!`)
        
        // No background refetch needed - direct cache update above is sufficient
        // Removing this prevents editing state from being reset during filename editing
      } else {
        toast.error(result.error || 'Upload failed')
      }
    },
    
    onError: (error, variables, context) => {
      // Remove temporary video on error
      if (context?.tempVideoId) {
        queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) =>
          old.filter(video => video.id !== context.tempVideoId)
        )
        
        queryClient.setQueryData(['chapters', courseId], (old: any) => {
          if (!Array.isArray(old)) return old
          
          return old.map(chapter => 
            chapter.id === variables.chapterId
              ? {
                  ...chapter,
                  videos: chapter.videos.filter((video: Video) => 
                    video.id !== context.tempVideoId
                  ),
                  videoCount: Math.max(0, (chapter.videoCount || 1) - 1)
                }
              : chapter
          )
        })
      }
      
      toast.error(`Failed to upload ${variables.file.name}`)
    }
  })
  
  return {
    uploadVideo: uploadMutation.mutate,
    uploadVideoAsync: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending
  }
}

// ===== BATCH VIDEO OPERATIONS HOOK =====
export function useVideoBatchOperations(courseId: string) {
  const queryClient = useQueryClient()
  
  // ARCHITECTURE-COMPLIANT: Read UI state from Zustand for dirty tracking
  const ui = useCourseCreationUI()
  const videoPendingChanges = ui.getVideoPendingChanges()
  const getVideoPendingChangesCount = ui.getVideoPendingChangesCount
  
  const batchUpdateMutation = useMutation({
    mutationFn: ({ courseId, updates }: { 
      courseId: string, 
      updates: Array<{ id: string, title?: string, chapter_id?: string, order?: number }> 
    }) => {
      console.log('🔥 Batch update called with:', { courseId, updates })
      return batchUpdateVideoOrdersAction(courseId, updates)
    },
    
    onMutate: async ({ courseId, updates }) => {
      await queryClient.cancelQueries({ queryKey: videoKeys.list(courseId) })
      await queryClient.cancelQueries({ queryKey: chapterKeys.list(courseId) })
      
      const previousVideos = queryClient.getQueryData(videoKeys.list(courseId))
      const previousChapters = queryClient.getQueryData(chapterKeys.list(courseId))
      
      // Optimistic update for videos
      queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) =>
        old.map(video => {
          const update = updates.find(u => u.id === video.id)
          return update ? { ...video, ...update } : video
        })
      )
      
      // Optimistic update for chapters
      queryClient.setQueryData(chapterKeys.list(courseId), (old: any) => {
        if (!Array.isArray(old)) return old
        
        return old.map((chapter: any) => ({
          ...chapter,
          videos: chapter.videos.map((video: Video) => {
            const update = updates.find(u => u.id === video.id)
            return update ? { ...video, ...update } : video
          })
        }))
      })
      
      return { previousVideos, previousChapters }
    },
    
    onSuccess: (result, variables) => {
      console.log('🎯 Batch update result:', result)
      if (result.success) {
        // No individual toast - handled by consolidated save toast
        console.log(`✅ ${variables.updates.length} video(s) updated successfully`)
        
        // Background refetch for consistency
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: videoKeys.list(courseId) })
          queryClient.refetchQueries({ queryKey: chapterKeys.list(courseId) })
        }, 2000)
      } else {
        toast.error(result.error || 'Update failed')
        console.error('❌ Batch update failed:', result.error)
      }
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousVideos) {
        queryClient.setQueryData(videoKeys.list(courseId), context.previousVideos)
      }
      if (context?.previousChapters) {
        queryClient.setQueryData(['chapters', courseId], context.previousChapters)
      }
      
      toast.error('Failed to update videos')
    }
  })
  
  return {
    batchUpdateVideos: batchUpdateMutation.mutate,
    isBatchUpdating: batchUpdateMutation.isPending,
    // ARCHITECTURE-COMPLIANT: Use unified content system for all pending changes
    hasPendingVideoChanges: ui.getVideoPendingChangesCount() > 0,
    videoPendingCount: ui.getVideoPendingChangesCount(),
    videoPendingChanges: videoPendingChanges || {} // Expose the actual pending changes for save operations
  }
}

// ===== VIDEO DELETE HOOK =====
export function useVideoDelete(courseId: string) {
  const queryClient = useQueryClient()
  
  const deleteMutation = useMutation({
    mutationFn: (videoId: string) => deleteVideoAction(videoId),
    
    onMutate: async (videoId) => {
      await queryClient.cancelQueries({ queryKey: videoKeys.list(courseId) })
      await queryClient.cancelQueries({ queryKey: chapterKeys.list(courseId) })
      
      const previousVideos = queryClient.getQueryData(videoKeys.list(courseId))
      const previousChapters = queryClient.getQueryData(chapterKeys.list(courseId))
      
      // Optimistic update - remove video
      queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) =>
        old.filter(video => video.id !== videoId)
      )
      
      // Update chapters cache
      queryClient.setQueryData(chapterKeys.list(courseId), (old: any) => {
        if (!Array.isArray(old)) return old
        
        return old.map((chapter: any) => ({
          ...chapter,
          videos: chapter.videos.filter((video: Video) => video.id !== videoId),
          videoCount: Math.max(0, (chapter.videoCount || 1) - 1)
        }))
      })
      
      return { previousVideos, previousChapters, deletedVideoId: videoId }
    },
    
    onSuccess: (result) => {
      if (result.success) {
        // No individual toast - handled by consolidated save toast
        console.log('✅ Video deleted successfully')
      }
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousVideos) {
        queryClient.setQueryData(videoKeys.list(courseId), context.previousVideos)
      }
      if (context?.previousChapters) {
        queryClient.setQueryData(chapterKeys.list(courseId), context.previousChapters)
      }
      
      toast.error('Failed to delete video')
    }
  })
  
  return {
    deleteVideo: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending
  }
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { 
  uploadVideoAction,
  updateVideoAction,
  deleteVideoAction,
  batchUpdateVideoOrdersAction,
  reorderVideosAction,
  linkMediaToChapterAction
} from '@/app/actions/video-actions'
import type { Video, UploadItem } from '@/types'
import { chapterKeys } from './use-chapter-queries'
import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { useCourseWebSocketSimple } from './use-course-websocket-simple'
import { generateOperationId } from '@/lib/websocket-operations'
import { courseEventObserver, COURSE_EVENTS } from '@/lib/course-event-observer'

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
  const websocket = useCourseWebSocketSimple(courseId)
  const [currentOperationId, setCurrentOperationId] = useState<string | null>(null)
  
  // WebSocket connection will now handle real-time progress updates
  
  const uploadMutation = useMutation({
    mutationFn: async ({ 
      file, 
      chapterId, 
      tempVideoId,
      operationId
    }: { 
      file: File
      chapterId: string
      tempVideoId: string
      operationId: string
    }) => {
      // ARCHITECTURE-COMPLIANT: mutationFn only calls server action
      // Progress tracking will be handled by WebSocket updates to TanStack cache
      return uploadVideoAction({
        file,
        courseId,
        chapterId,
        operationId
      })
    },
    
    onMutate: async ({ file, chapterId, tempVideoId, operationId }) => {
      console.log(`📈 [UPLOAD PROGRESS] onMutate called for ${file.name} with operationId: ${operationId}`)
      
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
        backblaze_file_id: operationId, // Store operationId here for progress matching
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
      
      return { tempVideoId: tempVideo.id, operationId }
    },
    
    onSuccess: (result, variables, context) => {
      if (result.success && result.data) {
        const realVideo = result.data
        
        console.log(`📈 [UPLOAD PROGRESS] Upload success for ${context?.operationId}`)
        
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
        console.log(`❌ [UPLOAD PROGRESS] Removing failed upload video ${context.tempVideoId}`)
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
    uploadVideo: (params: { file: File; chapterId: string; tempVideoId: string }) => {
      // Generate operation ID and add to params
      const operationId = generateOperationId()
      console.log(`🚀 [UPLOAD PROGRESS] Starting upload with Observer pattern: ${operationId} for ${params.file.name}`)
      setCurrentOperationId(operationId)
      uploadMutation.mutate({ ...params, operationId })
    },
    uploadVideoAsync: (params: { file: File; chapterId: string; tempVideoId: string }) => {
      // Generate operation ID and add to params
      const operationId = generateOperationId()
      console.log(`🚀 [UPLOAD PROGRESS] Starting upload async with Observer pattern: ${operationId} for ${params.file.name}`)
      setCurrentOperationId(operationId)
      return uploadMutation.mutateAsync({ ...params, operationId })
    },
    isUploading: uploadMutation.isPending
  }
}

// ===== BATCH VIDEO OPERATIONS HOOK =====
export function useVideoBatchOperations(courseId: string) {
  const queryClient = useQueryClient()
  const websocket = useCourseWebSocketSimple(courseId)
  
  // ARCHITECTURE-COMPLIANT: Read UI state from Zustand for dirty tracking
  const ui = useCourseCreationUI()
  const videoPendingChanges = ui.getVideoPendingChanges()
  const getVideoPendingChangesCount = ui.getVideoPendingChangesCount
  
  // Observer subscriptions for real-time video updates (re-enabled with stable dependencies)
  useEffect(() => {
    const unsubscribers = [
      courseEventObserver.subscribe(COURSE_EVENTS.VIDEO_UPDATE_COMPLETE, (event) => {
        if (event.courseId !== courseId) return
        
        console.log('🎬 Video update completed via Observer:', event)
        queryClient.invalidateQueries({ queryKey: videoKeys.list(courseId) })
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
        
        if (event.operationId) {
          toast.success('Video updated')
        }
      }),

      courseEventObserver.subscribe(COURSE_EVENTS.VIDEO_DELETE_COMPLETE, (event) => {
        if (event.courseId !== courseId) return
        
        console.log('🗑️ Video deleted via Observer:', event)
        queryClient.invalidateQueries({ queryKey: videoKeys.list(courseId) })
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
        
        if (event.operationId) {
          toast.success('Video deleted')
        }
      }),

      courseEventObserver.subscribe(COURSE_EVENTS.UPLOAD_PROGRESS, (event) => {
        if (event.courseId !== courseId) return
        
        console.log(`📈 [UPLOAD PROGRESS] WebSocket progress event: ${event.data.progress}% for operation ${event.operationId}`)
        
        // Update upload progress in TanStack cache for real-time UI updates
        queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) => {
          const updated = old.map(video => {
            // Match by operationId stored in temp video during upload
            if (video.id.includes(event.operationId) || video.backblaze_file_id === event.operationId) {
              console.log(`📈 [UPLOAD PROGRESS] Updating progress for video ${video.id}: ${event.data.progress}%`)
              return {
                ...video,
                uploadProgress: event.data.progress,
                status: 'uploading' as const
              }
            }
            return video
          })
          console.log(`📈 [UPLOAD PROGRESS] Cache updated, videos with progress:`, 
            updated.filter(v => v.uploadProgress !== undefined).map(v => ({ id: v.id, progress: v.uploadProgress }))
          )
          return updated
        })

        // CRITICAL FIX: Also update chapters cache (where UI reads from)
        queryClient.setQueryData(chapterKeys.list(courseId), (old: any) => {
          if (!Array.isArray(old)) return old
          
          return old.map((chapter: any) => ({
            ...chapter,
            videos: chapter.videos.map((video: Video) => {
              // Match by operationId stored in temp video during upload
              if (video.id.includes(event.operationId) || video.backblaze_file_id === event.operationId) {
                console.log(`📈 [UPLOAD PROGRESS] Updating progress in chapters cache for video ${video.id}: ${event.data.progress}%`)
                return {
                  ...video,
                  uploadProgress: event.data.progress,
                  status: 'uploading' as const
                }
              }
              return video
            })
          }))
        })
      }),

      courseEventObserver.subscribe(COURSE_EVENTS.UPLOAD_COMPLETE, (event) => {
        if (event.courseId !== courseId) return
        
        console.log('📤 Upload completed via Observer:', event)
        queryClient.invalidateQueries({ queryKey: videoKeys.list(courseId) })
        queryClient.invalidateQueries({ queryKey: chapterKeys.list(courseId) })
        
        if (event.operationId) {
          toast.success('Upload completed!')
        }
      })
    ]

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [courseId, queryClient])
  
  const batchUpdateMutation = useMutation({
    mutationFn: ({ courseId, updates, operationId }: { 
      courseId: string, 
      updates: Array<{ id: string, title?: string, chapter_id?: string, order?: number }>,
      operationId?: string
    }) => {
      console.log('🔥 Batch update called with:', { courseId, updates, operationId })
      return batchUpdateVideoOrdersAction(courseId, updates, operationId)
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
      
      // WebSocket-enabled response
      if (result.operationId && result.immediate) {
        console.log(`🚀 WebSocket operation started: ${result.operationId}`)
        // WebSocket will handle completion and cache updates
        return
      }
      
      // Legacy synchronous response
      console.log(`✅ ${variables.updates.length} video(s) updated successfully (legacy)`)
      
      // Background refetch for consistency (skip error checking since onSuccess means it worked)
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: videoKeys.list(courseId) })
        queryClient.refetchQueries({ queryKey: chapterKeys.list(courseId) })
      }, 2000)
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
  
  // WebSocket-enabled batch update function
  const batchUpdateVideosWithWebSocket = (updates: Array<{ id: string, title?: string, order?: number, chapter_id?: string }>) => {
    const operationId = generateOperationId()
    console.log(`🎬 Starting WebSocket video batch update: ${operationId}`)
    
    // Observer system will handle completion notifications via WebSocket events
    
    // Start mutation with operation tracking
    batchUpdateMutation.mutate({ courseId, updates, operationId })
  }

  return {
    batchUpdateVideos: batchUpdateVideosWithWebSocket,
    batchUpdateVideosMutation: batchUpdateMutation, // Expose mutation object for callback support
    isBatchUpdating: batchUpdateMutation.isPending,
    // ARCHITECTURE-COMPLIANT: Use unified content system for all pending changes
    hasPendingVideoChanges: ui.getVideoPendingChangesCount() > 0,
    videoPendingCount: ui.getVideoPendingChangesCount(),
    videoPendingChanges: videoPendingChanges || {}, // Expose the actual pending changes for save operations
    // WebSocket connection state
    isWebSocketConnected: websocket.isConnected
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

/**
 * Link media file to chapter using TanStack Query
 * Phase 4B: Reuses existing mutation patterns
 */
export function useLinkMediaToChapter() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      mediaId, 
      chapterId, 
      courseId 
    }: { 
      mediaId: string
      chapterId: string
      courseId: string 
    }) => {
      const result = await linkMediaToChapterAction(mediaId, chapterId, courseId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to link media')
      }
      return result
    },
    onSuccess: (data, variables) => {
      // Don't invalidate here - let the WebSocket observer handle it to avoid race conditions
      // queryClient.invalidateQueries({ queryKey: ['courses', 'detail', variables.courseId] })
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
      
      console.log('✅ Media linked successfully:', data.data?.id)
      // Removed success toast - real-time UI update is sufficient feedback
    },
    onError: (error) => {
      console.error('❌ Media link failed:', error)
      toast.error(error.message || 'Failed to link media to chapter')
    }
  })
}
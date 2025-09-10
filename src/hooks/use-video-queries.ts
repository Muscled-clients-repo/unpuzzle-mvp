import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { 
  uploadVideoAction,
  updateVideoAction,
  deleteVideoAction,
  unlinkVideoAction,
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

// ===== VIDEO REMOVE HOOK (Smart unlink/delete with concurrent processing) =====
export function useVideoDelete(courseId: string) {
  const queryClient = useQueryClient()
  
  // CONCURRENT DELETION PATTERN: Queue and batch rapid delete operations
  const [deleteQueue, setDeleteQueue] = useState<Set<string>>(new Set())
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout>()
  
  // Process batched deletes with Promise.all() for 4x speed improvement
  const processBatchedDeletes = async (videoIds: string[]) => {
    console.log(`🚀 [CONCURRENT DELETE] Starting batch delete for ${videoIds.length} videos:`, videoIds)
    
    const chapters = queryClient.getQueryData<any[]>(chapterKeys.list(courseId)) || []
    
    // Prepare all delete operations
    const deleteOperations = videoIds.map(async (videoId) => {
      // Find video to determine unlink vs delete
      let video = null
      for (const chapter of chapters) {
        if (chapter.videos) {
          video = chapter.videos.find((v: any) => v.id === videoId)
          if (video) break
        }
      }
      
      if (!video || video.media_file_id) {
        console.log(`🔗 [CONCURRENT DELETE] Unlinking media library video: ${videoId}`)
        return await unlinkVideoAction(videoId)
      } else {
        console.log(`🗑️ [CONCURRENT DELETE] Deleting direct upload video: ${videoId}`)
        return await deleteVideoAction(videoId)
      }
    })
    
    // Execute all deletes concurrently
    const results = await Promise.all(deleteOperations)
    console.log(`✅ [CONCURRENT DELETE] Batch completed:`, results)
    return results
  }
  
  // Debounced delete function that batches rapid clicks
  const debouncedDelete = (videoId: string) => {
    console.log(`⏱️ [CONCURRENT DELETE] Queuing video ${videoId} for batch processing`)
    
    // Add to queue
    setDeleteQueue(prev => new Set([...prev, videoId]))
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Set new timer (200ms debounce window)
    debounceTimerRef.current = setTimeout(async () => {
      const currentQueue = [...deleteQueue, videoId] // Include the current video
      const uniqueQueue = [...new Set(currentQueue)] // Remove duplicates
      
      if (uniqueQueue.length === 0) return
      
      console.log(`🚀 [CONCURRENT DELETE] Processing batch of ${uniqueQueue.length} videos:`, uniqueQueue)
      
      setIsProcessingBatch(true)
      setDeleteQueue(new Set()) // Clear queue
      
      try {
        // Perform optimistic updates for all videos in batch
        await queryClient.cancelQueries({ queryKey: videoKeys.list(courseId) })
        await queryClient.cancelQueries({ queryKey: chapterKeys.list(courseId) })
        
        const previousVideos = queryClient.getQueryData(videoKeys.list(courseId))
        const previousChapters = queryClient.getQueryData(chapterKeys.list(courseId))
        
        // Optimistic batch removal
        queryClient.setQueryData(videoKeys.list(courseId), (old: Video[] = []) =>
          old.filter(video => !uniqueQueue.includes(video.id))
        )
        
        // Update chapters cache
        queryClient.setQueryData(chapterKeys.list(courseId), (old: any) => {
          if (!Array.isArray(old)) return old
          
          return old.map((chapter: any) => ({
            ...chapter,
            videos: chapter.videos.filter((video: Video) => !uniqueQueue.includes(video.id)),
            videoCount: Math.max(0, (chapter.videoCount || chapter.videos?.length || 0) - uniqueQueue.filter(id => 
              chapter.videos?.some((v: Video) => v.id === id)
            ).length)
          }))
        })
        
        // Execute batch delete
        const results = await processBatchedDeletes(uniqueQueue)
        
        // Check for failures and rollback if needed
        const failures = results.filter(r => !r.success)
        if (failures.length > 0) {
          console.error(`❌ [CONCURRENT DELETE] ${failures.length} operations failed, rolling back`)
          if (previousVideos) queryClient.setQueryData(videoKeys.list(courseId), previousVideos)
          if (previousChapters) queryClient.setQueryData(chapterKeys.list(courseId), previousChapters)
          toast.error(`Failed to delete ${failures.length} video(s)`)
        } else {
          console.log(`✅ [CONCURRENT DELETE] Successfully processed ${uniqueQueue.length} videos`)
        }
        
      } catch (error) {
        console.error('❌ [CONCURRENT DELETE] Batch processing failed:', error)
        // The optimistic updates rollback is handled in individual mutation error handlers
      } finally {
        setIsProcessingBatch(false)
      }
    }, 200) // 200ms debounce window
  }
  
  // Single mutation that handles both individual and batch operations
  const removeMutation = useMutation({
    mutationFn: async (videoId: string) => {
      console.log(`🔍 [VIDEO DELETE] Phase 1 Debug: Starting delete for video ${videoId}`)
      
      // First get the video from chapters cache to check if it's from media library
      const chapters = queryClient.getQueryData<any[]>(chapterKeys.list(courseId)) || []
      console.log(`🔍 [VIDEO DELETE] Phase 1 Debug: Found ${chapters.length} chapters in cache`)
      
      let video = null
      
      // Find video in any chapter
      for (const chapter of chapters) {
        if (chapter.videos) {
          console.log(`🔍 [VIDEO DELETE] Phase 1 Debug: Searching chapter ${chapter.id} with ${chapter.videos.length} videos`)
          video = chapter.videos.find((v: any) => v.id === videoId)
          if (video) {
            console.log(`🔍 [VIDEO DELETE] Phase 1 Debug: Found video in chapter ${chapter.id}:`, video)
            break
          }
        }
      }
      
      if (!video) {
        console.warn(`🔍 [VIDEO REMOVE] Video ${videoId} not found in chapters cache, proceeding with unlink (safer option)`)
        // Default to unlink since media library videos are more common now
        return await unlinkVideoAction(videoId)
      }
      
      // Use unlink for media library videos (have media_file_id), delete for direct uploads
      if (video.media_file_id) {
        console.log(`🔗 [VIDEO REMOVE] Unlinking media library video: ${videoId} (media_file_id: ${video.media_file_id})`)
        return await unlinkVideoAction(videoId)
      } else {
        console.log(`🗑️ [VIDEO REMOVE] Deleting direct upload video: ${videoId}`)
        return await deleteVideoAction(videoId)
      }
    },
    
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
    
    onSuccess: (result, videoId) => {
      if (result.success) {
        // Get video info to show appropriate success message
        const videos = queryClient.getQueryData<Video[]>(videoKeys.list(courseId)) || []
        const wasMediaLibraryVideo = videos.some(v => v.id === videoId && (v as any).media_file_id)
        
        const action = wasMediaLibraryVideo ? 'unlinked from chapter' : 'deleted permanently'
        console.log(`✅ Video ${action} successfully`)
        // No individual toast - handled by consolidated save toast
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
      
      // Show specific error message based on video type
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove video'
      toast.error(errorMessage)
    }
  })
  
  return {
    deleteVideo: debouncedDelete, // Use debounced version for concurrent processing
    isDeleting: removeMutation.isPending || isProcessingBatch,
    // Expose the mutation for more control if needed
    removeMutation
  }
}

/**
 * Link media file to chapter using TanStack Query
 * Phase 1: OPTIMISTIC UPDATES ONLY - Videos appear instantly before server confirmation
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
    
    onMutate: async ({ mediaId, chapterId, courseId }) => {
      console.log(`🚀 [PHASE 1] Optimistically adding media ${mediaId} to chapter ${chapterId}`)
      
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: chapterKeys.list(courseId) })
      
      // Get current chapter data
      const previousChapters = queryClient.getQueryData(chapterKeys.list(courseId))
      
      // Find the media file data from cache (if available)
      const mediaFiles = queryClient.getQueryData(['media-files']) as any[]
      const mediaFile = mediaFiles?.find(file => file.id === mediaId)
      
      if (mediaFile) {
        // Create temporary video object from media file
        const tempVideo: Video = {
          id: `temp-${mediaId}-${Date.now()}`, // Temporary ID for UI tracking
          filename: mediaFile.name,
          originalFilename: mediaFile.original_name || mediaFile.name,
          course_id: courseId,
          chapter_id: chapterId,
          order: 999, // Will be recalculated by server
          duration: mediaFile.duration || null,
          size: mediaFile.file_size || 0,
          format: mediaFile.file_type || 'video/mp4',
          status: 'ready', // Media files are already processed
          backblaze_file_id: mediaFile.backblaze_file_id || null,
          backblaze_url: mediaFile.cdn_url || mediaFile.url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Mark as optimistic for potential rollback
          _isOptimistic: true,
          _originalMediaId: mediaId,
          _isLinking: true // ARCHITECTURE-COMPLIANT: TanStack owns server operation state
        }
        
        // Optimistically add video to chapter
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
        
        console.log(`✨ [PHASE 1] Optimistically added ${mediaFile.name} to chapter - UI should update instantly!`)
      }
      
      return { previousChapters, mediaId, chapterId }
    },
    
    onSuccess: (data, variables, context) => {
      console.log(`✅ [PHASE 1] Server confirmed linking ${variables.mediaId} to chapter ${variables.chapterId}`)
      
      // Replace optimistic entry with real server data if available
      if (data.data) {
        const realVideo = data.data
        queryClient.setQueryData(chapterKeys.list(variables.courseId), (old: any) => {
          if (!Array.isArray(old)) return old
          
          return old.map((chapter: any) => 
            chapter.id === variables.chapterId
              ? {
                  ...chapter,
                  videos: chapter.videos.map((video: Video) => 
                    (video as any)._originalMediaId === variables.mediaId
                      ? { 
                          ...realVideo, 
                          _isOptimistic: false,
                          _isLinking: false // ARCHITECTURE-COMPLIANT: Clear linking state
                        }
                      : video
                  )
                }
              : chapter
          )
        })
      }
      
      // Update media files cache
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
      
      console.log('✅ Media linked successfully:', data.data?.id)
    },
    
    onError: (error, variables, context) => {
      console.error(`❌ [PHASE 1] Server failed to link ${variables.mediaId}:`, error)
      
      // Rollback optimistic update by restoring previous state
      if (context?.previousChapters) {
        queryClient.setQueryData(chapterKeys.list(variables.courseId), context.previousChapters)
        console.log(`🔄 [PHASE 1] Rolled back optimistic update for ${variables.mediaId}`)
      }
      
      toast.error(error.message || 'Failed to link media to chapter')
    }
  })
}
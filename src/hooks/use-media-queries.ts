"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMediaFilesAction, deleteMediaFileAction, uploadMediaFileAction, generateBulkDeletePreviewAction, bulkDeleteMediaFilesAction, getExistingTagsAction, bulkAddTagsAction, bulkRemoveTagsAction, bulkReplaceTagsAction } from '@/app/actions/media-actions'
import { toast } from 'sonner'
import { courseEventObserver, MEDIA_EVENTS } from '@/lib/course-event-observer'
import { useEffect } from 'react'
import { useMediaWebSocketSimple } from './use-media-websocket-simple'

export interface MediaFile {
  id: string
  name: string
  type: string
  size: string
  usage: string
  uploadedAt: string
  thumbnail: string | null
  tags?: string[] | null // Database tags field
  // Raw database fields
  file_size: number | null
  duration_seconds: number | null
  media_usage?: Array<{
    course_id: string
    resource_type: string
    resource_id: string
    courses?: { title: string }
  }> | null // Course usage data
  // Internal fields for preview functionality
  backblaze_file_id?: string
  backblaze_url?: string
  file_name?: string
  cdn_url?: string | null // CDN URL with HMAC token

  // ARCHITECTURE-COMPLIANT: Upload progress fields (TanStack managed)
  uploadProgress?: number // 0-100
  uploadStartTime?: number // timestamp
  uploadTimeRemaining?: number | null // seconds remaining
  status?: 'uploading' | 'processing' | 'ready' | 'error'
}

export function useMediaFiles(options?: { page?: number; limit?: number }) {
  const page = options?.page || 1
  const limit = options?.limit || 30

  return useQuery({
    queryKey: ['media-files', page, limit],
    queryFn: async () => {
      const result = await getMediaFilesAction({ page, limit })
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch media files')
      }
      return {
        media: result.media,
        hasMore: result.hasMore || false,
        totalCount: result.totalCount || 0,
        currentPage: result.currentPage || page
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    keepPreviousData: true, // Keep previous page data while loading next page
  })
}

export function useUploadMediaFile() {
  const queryClient = useQueryClient()
  
  // ARCHITECTURE-COMPLIANT: Use same WebSocket pattern as Video system
  const websocket = useMediaWebSocketSimple()
  
  // ARCHITECTURE-COMPLIANT: Observer subscription for progress updates stored in TanStack cache
  // This matches the Video system pattern exactly
  useEffect(() => {
    const handleProgress = (event: any) => {
      console.log('[MEDIA UPLOAD PROGRESS] Received event:', event)
      console.log('[MEDIA UPLOAD PROGRESS] Event operationId:', event.operationId)
      console.log('[MEDIA UPLOAD PROGRESS] Event data:', event.data)
      
      if (!event.operationId) {
        console.warn('[MEDIA UPLOAD PROGRESS] No operationId in event, skipping')
        return
      }

      if (!event.data || typeof event.data.progress !== 'number') {
        console.warn('[MEDIA UPLOAD PROGRESS] No progress data in event:', event.data)
        return
      }
      
      // Update TanStack cache with progress (same pattern as Video system)
      // Update all pages of media-files
      queryClient.setQueriesData(['media-files'], (currentData: any) => {
        if (!currentData?.media) return currentData

        const updated = currentData.media.map((file: MediaFile) => {
          // Match by operationId (stored in backblaze_file_id for temp files)
          if (file.backblaze_file_id === event.operationId) {
            console.log(`📈 [MEDIA UPLOAD PROGRESS] Updating progress for file ${file.id}: ${event.data.progress}%`)
            return {
              ...file,
              uploadProgress: event.data.progress,
              status: 'uploading' as const
            }
          }
          return file
        })

        console.log('[MEDIA UPLOAD PROGRESS] Files with progress after update:',
          updated.filter((f: MediaFile) => f.uploadProgress !== undefined).map((f: MediaFile) => ({ id: f.id, progress: f.uploadProgress }))
        )

        return { ...currentData, media: updated }
      })
    }
    
    const handleComplete = (event: any) => {
      console.log('[MEDIA UPLOAD COMPLETE] Received event:', event)

      // Invalidate cache to fetch real data (same pattern as Video system)
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
    }

    const handleDurationUpdate = (event: any) => {
      console.log('[MEDIA DURATION UPDATE] Received event:', event)
      console.log('[MEDIA DURATION UPDATE] Event data:', {
        fileId: event.fileId,
        durationSeconds: event.durationSeconds,
        operationId: event.operationId
      })

      // Immediately update cache with duration (all pages)
      queryClient.setQueriesData(['media-files'], (currentData: any) => {
        if (!currentData?.media) return currentData

        const updated = currentData.media.map((file: MediaFile) => {
          // Match by fileId or operationId
          if (file.id === event.fileId || file.backblaze_file_id === event.operationId) {
            console.log(`⏱️ [MEDIA DURATION UPDATE] Updating duration for file ${file.id}:`, event.durationSeconds)
            return {
              ...file,
              duration_seconds: event.durationSeconds
            }
          }
          return file
        })

        return { ...currentData, media: updated }
      })

      // Also invalidate to ensure we get fresh data
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
    }

    const handleThumbnailUpdate = (event: any) => {
      console.log('[MEDIA THUMBNAIL UPDATE] Received event:', event)
      console.log('[MEDIA THUMBNAIL UPDATE] Event data:', {
        fileId: event.fileId,
        thumbnailUrl: event.thumbnailUrl,
        operationId: event.operationId
      })

      // Immediately update cache with new thumbnail (all pages)
      queryClient.setQueriesData(['media-files'], (currentData: any) => {
        if (!currentData?.media) return currentData

        const updated = currentData.media.map((file: MediaFile) => {
          // Match by fileId or operationId
          if (file.id === event.fileId || file.backblaze_file_id === event.operationId) {
            console.log(`🖼️ [MEDIA THUMBNAIL UPDATE] Updating thumbnail for file ${file.id}:`, event.thumbnailUrl)
            return {
              ...file,
              thumbnail: event.thumbnailUrl,
              cdn_url: event.thumbnailUrl // Update CDN URL too
            }
          }
          return file
        })

        return { ...currentData, media: updated }
      })

      // Also invalidate to ensure we get fresh data
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
    }

    // CRITICAL FIX: Subscribe to MEDIA_EVENTS (WebSocket emits media-upload-progress)
    // The logs show WebSocket emits 'media-upload-progress' events
    const unsubscribeProgress = courseEventObserver.subscribe(MEDIA_EVENTS.MEDIA_UPLOAD_PROGRESS, handleProgress)
    const unsubscribeComplete = courseEventObserver.subscribe(MEDIA_EVENTS.MEDIA_UPLOAD_COMPLETE, handleComplete)
    const unsubscribeDuration = courseEventObserver.subscribe(MEDIA_EVENTS.MEDIA_DURATION_UPDATED, handleDurationUpdate)
    const unsubscribeThumbnail = courseEventObserver.subscribe(MEDIA_EVENTS.MEDIA_THUMBNAIL_UPDATED, handleThumbnailUpdate)

    return () => {
      unsubscribeProgress()
      unsubscribeComplete()
      unsubscribeDuration()
      unsubscribeThumbnail()
    }
  }, [queryClient])
  
  return useMutation({
    mutationFn: async ({ file, operationId }: { file: File, operationId: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      return await uploadMediaFileAction(formData, operationId)
    },
    
    onMutate: async ({ file, operationId }) => {
      console.log(`📈 [MEDIA UPLOAD] onMutate called for ${file.name} with operationId: ${operationId}`)
      
      // Create temporary media file object for immediate UI feedback
      const tempMediaFile: MediaFile = {
        id: operationId, // Use operationId as temporary ID
        name: file.name,
        type: file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'document',
        size: formatFileSize(file.size),
        usage: 'Uploading...',
        uploadedAt: 'Just now',
        thumbnail: null,
        // Store operation ID for progress matching
        backblaze_file_id: operationId,
        backblaze_url: null,
        file_name: file.name,
        // ARCHITECTURE-COMPLIANT: Initial upload state (same as Video system)
        uploadProgress: 0,
        uploadStartTime: Date.now(),
        uploadTimeRemaining: null,
        status: 'uploading'
      }
      
      // Optimistically add the uploading file to the cache (all pages)
      queryClient.setQueriesData(['media-files'], (oldData: any) => {
        if (!oldData?.media) return { ...oldData, media: [tempMediaFile] }
        return { ...oldData, media: [tempMediaFile, ...oldData.media] }
      })
      
      console.log('📈 [MEDIA UPLOAD] Added temporary file to cache:', tempMediaFile)
      
      return { tempMediaFile }
    },
    
    onSuccess: (result, { file, operationId }) => {
      if (result.success) {
        toast.success(`✅ ${file.name} uploaded successfully`)
        
        // First update the temp file to show 100% completion (all pages)
        queryClient.setQueriesData(['media-files'], (oldData: any) => {
          if (!oldData?.media) return oldData
          return {
            ...oldData,
            media: oldData.media.map((mediaFile: MediaFile) => {
              if (mediaFile.id === operationId) {
                return {
                  ...mediaFile,
                  uploadProgress: 100,
                  status: 'ready' as const
                }
              }
              return mediaFile
            })
          }
        })
        
        // Delay invalidation to show 100% progress for a moment
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['media-files'] })
        }, 1500) // Show completion for 1.5 seconds
        
        console.log(`✅ [MEDIA UPLOAD] Upload successful for operationId: ${operationId}`)
      } else {
        toast.error(`❌ Upload failed: ${result.error}`)
        // Remove the temporary file on failure (all pages)
        queryClient.setQueriesData(['media-files'], (oldData: any) => {
          if (!oldData?.media) return oldData
          return { ...oldData, media: oldData.media.filter((file: MediaFile) => file.id !== operationId) }
        })
      }
    },
    
    onError: (error, { file, operationId }) => {
      console.error('Upload mutation error:', error)
      toast.error(`❌ Failed to upload ${file.name}`)

      // Remove the temporary file on error (all pages)
      queryClient.setQueriesData(['media-files'], (oldData: any) => {
        if (!oldData?.media) return oldData
        return { ...oldData, media: oldData.media.filter((f: MediaFile) => f.id !== operationId) }
      })
    }
  })
}

// Helper function to format file size (moved from media-actions.ts)
function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

export function useDeleteMediaFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (fileId: string) => {
      return await deleteMediaFileAction(fileId)
    },
    onSuccess: (result, fileId) => {
      if (result.success) {
        toast.success('✅ File deleted successfully')
        // Invalidate and refetch media files
        queryClient.invalidateQueries({ queryKey: ['media-files'] })
      } else {
        toast.error(`❌ Delete failed: ${result.error}`)
      }
    },
    onError: (error) => {
      console.error('Delete mutation error:', error)
      toast.error('❌ Failed to delete file')
    }
  })
}

export function useMediaFileHistory(fileId: string | null) {
  // Media file history removed - media_file_history table deleted
  return useQuery({
    queryKey: ['media-file-history', fileId],
    queryFn: async () => {
      return { success: true, history: [] }
    },
    enabled: !!fileId
  })
}

export function useBulkDeletePreview() {
  return useMutation({
    mutationFn: async (fileIds: string[]) => {
      return await generateBulkDeletePreviewAction(fileIds)
    },
    onError: (error) => {
      console.error('Bulk delete preview error:', error)
      toast.error('❌ Failed to generate deletion preview')
    }
  })
}

export function useBulkDeleteFiles() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ fileIds, operationId, onAnimationStart }: { 
      fileIds: string[]; 
      operationId: string;
      onAnimationStart?: (fileIds: string[]) => void;
    }) => {
      // Trigger animation start callback
      if (onAnimationStart) {
        onAnimationStart(fileIds)
      }
      
      // Delay to allow animation to play (longer for visible effect)
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      return await bulkDeleteMediaFilesAction(fileIds, operationId)
    },
    
    onMutate: async ({ fileIds, onAnimationStart }) => {
      // Don't remove from UI immediately - let animation handle it
      console.log('🗑️ [BULK DELETE] Starting deletion with animation for:', fileIds)
    },
    
    onSuccess: (result, { fileIds }) => {
      if (result.success) {
        toast.success(`✅ Successfully deleted ${fileIds.length} file${fileIds.length !== 1 ? 's' : ''}`)

        // Remove from UI after animation completes (all pages)
        queryClient.setQueriesData(['media-files'], (oldData: any) => {
          if (!oldData?.media) return oldData
          return { ...oldData, media: oldData.media.filter((file: MediaFile) => !fileIds.includes(file.id)) }
        })
        
        // Invalidate and refetch to get fresh data
        queryClient.invalidateQueries({ queryKey: ['media-files'] })
      } else {
        toast.error(`❌ Bulk delete failed: ${result.error}`)
        
        // Don't remove files on failure - let animation reset
        queryClient.invalidateQueries({ queryKey: ['media-files'] })
      }
    },
    
    onError: (error, { fileIds }) => {
      console.error('Bulk delete mutation error:', error)
      toast.error(`❌ Failed to delete ${fileIds.length} file${fileIds.length !== 1 ? 's' : ''}`)
      
      // Don't remove files on error - let animation reset
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
    }
  })
}

export function useExistingTags() {
  return useQuery({
    queryKey: ['media-tags'],
    queryFn: async () => {
      const result = await getExistingTagsAction()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tags')
      }
      return result.tags
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

export function useBulkAddTags() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ fileIds, tagsToAdd }: { fileIds: string[], tagsToAdd: string[] }) => {
      const result = await bulkAddTagsAction(fileIds, tagsToAdd)
      if (!result.success) {
        throw new Error(result.error || 'Failed to add tags')
      }
      return result
    },
    
    onSuccess: (result) => {
      const { summary } = result
      toast.success(`✅ Added tags "${summary.tagsAdded.join(', ')}" to ${summary.succeeded} file${summary.succeeded !== 1 ? 's' : ''}`)
      
      // Invalidate and refetch media files
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
      // Invalidate tags list to include new tags
      queryClient.invalidateQueries({ queryKey: ['media-tags'] })
    },
    
    onError: (error) => {
      console.error('Bulk add tags mutation error:', error)
      toast.error(`❌ Failed to add tags: ${error.message}`)
    }
  })
}

export function useBulkRemoveTags() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ fileIds, tagsToRemove }: { fileIds: string[], tagsToRemove: string[] }) => {
      const result = await bulkRemoveTagsAction(fileIds, tagsToRemove)
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove tags')
      }
      return result
    },
    
    onSuccess: (result) => {
      const { summary } = result
      toast.success(`✅ Removed tags "${summary.tagsRemoved.join(', ')}" from ${summary.succeeded} file${summary.succeeded !== 1 ? 's' : ''}`)
      
      // Invalidate and refetch media files
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
      // Invalidate tags list to update suggestions
      queryClient.invalidateQueries({ queryKey: ['media-tags'] })
    },
    
    onError: (error) => {
      console.error('Bulk remove tags mutation error:', error)
      toast.error(`❌ Failed to remove tags: ${error.message}`)
    }
  })
}

export function useBulkReplaceTags() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ fileIds, newTags }: { fileIds: string[], newTags: string[] }) => {
      const result = await bulkReplaceTagsAction(fileIds, newTags)
      if (!result.success) {
        throw new Error(result.error || 'Failed to replace tags')
      }
      return result
    },
    
    onSuccess: (result) => {
      const { summary } = result
      const tagText = summary.newTags.length > 0 ? `"${summary.newTags.join(', ')}"` : 'no tags'
      toast.success(`✅ Replaced tags with ${tagText} on ${summary.succeeded} file${summary.succeeded !== 1 ? 's' : ''}`)
      
      // Invalidate and refetch media files
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
      // Invalidate tags list to update suggestions
      queryClient.invalidateQueries({ queryKey: ['media-tags'] })
    },
    
    onError: (error) => {
      console.error('Bulk replace tags mutation error:', error)
      toast.error(`❌ Failed to replace tags: ${error.message}`)
    }
  })
}
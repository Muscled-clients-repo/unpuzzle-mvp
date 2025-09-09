"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMediaFilesAction, deleteMediaFileAction, uploadMediaFileAction, getMediaFileHistoryAction } from '@/app/actions/media-actions'
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
  // Internal fields for preview functionality
  backblaze_file_id?: string
  backblaze_url?: string
  file_name?: string
  
  // ARCHITECTURE-COMPLIANT: Upload progress fields (TanStack managed)
  uploadProgress?: number // 0-100
  uploadStartTime?: number // timestamp
  uploadTimeRemaining?: number | null // seconds remaining
  status?: 'uploading' | 'processing' | 'ready' | 'error'
}

export function useMediaFiles() {
  return useQuery({
    queryKey: ['media-files'],
    queryFn: async () => {
      const result = await getMediaFilesAction()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch media files')
      }
      return result.media
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
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
      queryClient.setQueryData(['media-files'], (currentData: MediaFile[] | undefined) => {
        if (!currentData) return currentData
        
        const updated = currentData.map(file => {
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
          updated.filter(f => f.uploadProgress !== undefined).map(f => ({ id: f.id, progress: f.uploadProgress }))
        )
        
        return updated
      })
    }
    
    const handleComplete = (event: any) => {
      console.log('[MEDIA UPLOAD COMPLETE] Received event:', event)
      
      // Invalidate cache to fetch real data (same pattern as Video system)
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
    }
    
    // CRITICAL FIX: Subscribe to MEDIA_EVENTS (WebSocket emits media-upload-progress)
    // The logs show WebSocket emits 'media-upload-progress' events
    const unsubscribeProgress = courseEventObserver.subscribe(MEDIA_EVENTS.MEDIA_UPLOAD_PROGRESS, handleProgress)
    const unsubscribeComplete = courseEventObserver.subscribe(MEDIA_EVENTS.MEDIA_UPLOAD_COMPLETE, handleComplete)
    
    return () => {
      unsubscribeProgress()
      unsubscribeComplete()
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
      
      // Optimistically add the uploading file to the cache
      queryClient.setQueryData(['media-files'], (oldData: MediaFile[] | undefined) => {
        if (!oldData) return [tempMediaFile]
        return [tempMediaFile, ...oldData]
      })
      
      console.log('📈 [MEDIA UPLOAD] Added temporary file to cache:', tempMediaFile)
      
      return { tempMediaFile }
    },
    
    onSuccess: (result, { file, operationId }) => {
      if (result.success) {
        toast.success(`✅ ${file.name} uploaded successfully`)
        
        // First update the temp file to show 100% completion
        queryClient.setQueryData(['media-files'], (oldData: MediaFile[] | undefined) => {
          if (!oldData) return oldData
          return oldData.map(mediaFile => {
            if (mediaFile.id === operationId) {
              return {
                ...mediaFile,
                uploadProgress: 100,
                status: 'ready' as const
              }
            }
            return mediaFile
          })
        })
        
        // Delay invalidation to show 100% progress for a moment
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['media-files'] })
        }, 1500) // Show completion for 1.5 seconds
        
        console.log(`✅ [MEDIA UPLOAD] Upload successful for operationId: ${operationId}`)
      } else {
        toast.error(`❌ Upload failed: ${result.error}`)
        // Remove the temporary file on failure
        queryClient.setQueryData(['media-files'], (oldData: MediaFile[] | undefined) => {
          if (!oldData) return []
          return oldData.filter(file => file.id !== operationId)
        })
      }
    },
    
    onError: (error, { file, operationId }) => {
      console.error('Upload mutation error:', error)
      toast.error(`❌ Failed to upload ${file.name}`)
      
      // Remove the temporary file on error
      queryClient.setQueryData(['media-files'], (oldData: MediaFile[] | undefined) => {
        if (!oldData) return []
        return oldData.filter(file => file.id !== operationId)
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
  return useQuery({
    queryKey: ['media-file-history', fileId],
    queryFn: async () => {
      if (!fileId) return { success: false, history: [] }
      const result = await getMediaFileHistoryAction(fileId)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
    enabled: !!fileId
  })
}
"use client"

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { courseEventObserver, MEDIA_EVENTS } from '@/lib/course-event-observer'
import { useMediaStore } from '@/stores/media-store'
import { useWebSocketConnection } from './use-websocket-connection'
import { useAppStore } from '@/stores/app-store'
import type { 
  MediaUploadProgressEvent, 
  MediaUploadCompleteEvent,
  MediaBulkOperationProgressEvent,
  MediaBulkOperationCompleteEvent 
} from '@/lib/course-event-observer'

/**
 * Hook to wire up Media Manager to existing WebSocket → Observer → TanStack pattern
 * Follows the same architecture as course video uploads
 */
export function useMediaProgress() {
  const queryClient = useQueryClient()
  const mediaStore = useMediaStore()

  // Establish WebSocket connection using real user ID from app store (same as course system)
  const userId = useAppStore((state) => state.user?.id)
  useWebSocketConnection(userId || '')

  useEffect(() => {
    console.log('📡 [MEDIA PROGRESS] Subscribing to media upload progress events')
    
    // Subscribe to media upload progress events (WebSocket → Observer → TanStack pattern)
    const unsubscribeUploadProgress = courseEventObserver.subscribe(
      MEDIA_EVENTS.MEDIA_UPLOAD_PROGRESS,
      (event) => {
        console.log('📡 [MEDIA PROGRESS] Received upload progress event:', event)
        const data = event.data as MediaUploadProgressEvent
        
        // Update media store (Zustand for UI state) only if we have the operationId
        if (event.operationId) {
          mediaStore.updateUpload(event.operationId, {
            id: event.operationId,
            filename: data.fileName || data.filename,
            progress: data.progress,
            status: data.status === 'completed' ? 'complete' : data.status,
            error: data.error,
            mediaId: data.mediaId,
            operationId: event.operationId
          })
        }
        
        // TanStack Query cache updates are handled by the upload mutations
        // This hook only manages Zustand store for progress panel UI
      }
    )

    // Subscribe to media upload complete events
    const unsubscribeUploadComplete = courseEventObserver.subscribe(
      MEDIA_EVENTS.MEDIA_UPLOAD_COMPLETE,
      (event) => {
        const data = event.data as MediaUploadCompleteEvent
        
        // Mark upload as complete
        if (event.operationId) {
          mediaStore.updateUpload(event.operationId, {
            id: event.operationId,
            filename: data.fileName || data.filename,
            progress: 100,
            status: 'complete',
            mediaId: data.mediaId,
            operationId: event.operationId
          })
          
          // Auto-clear completed upload after 3 seconds
          setTimeout(() => {
            mediaStore.removeUpload(event.operationId)
          }, 3000)
        }
        
        // Invalidate and refetch media files (new file added)
        queryClient.invalidateQueries({ queryKey: ['media-files'] })
      }
    )

    // Subscribe to bulk operation progress events
    const unsubscribeBulkProgress = courseEventObserver.subscribe(
      MEDIA_EVENTS.MEDIA_BULK_DELETE_PROGRESS,
      (event) => {
        const data = event.data as MediaBulkOperationProgressEvent
        
        // Update bulk operation progress
        mediaStore.updateBulkOperation(data.operationId, {
          id: data.operationId,
          operationId: data.operationId,
          operationType: data.operationType,
          filename: `${data.operationType} operation`,
          progress: data.progress,
          status: 'processing',
          error: data.errors?.join(', ')
        })
        
        // Optimistically update cache for bulk operations
        if (data.operationType === 'delete') {
          queryClient.setQueryData(['media-files'], (oldData: any) => {
            if (!oldData?.media) return oldData
            // Optimistically remove deleted items from cache
            return oldData
          })
        }
      }
    )

    // Subscribe to bulk operation complete events
    const unsubscribeBulkComplete = courseEventObserver.subscribe(
      MEDIA_EVENTS.MEDIA_BULK_DELETE_COMPLETE,
      (event) => {
        const data = event.data as MediaBulkOperationCompleteEvent
        
        // Mark bulk operation as complete
        mediaStore.updateBulkOperation(data.operationId, {
          id: data.operationId,
          operationId: data.operationId,
          operationType: data.operationType,
          filename: `${data.operationType} operation`,
          progress: 100,
          status: 'complete'
        })
        
        // Invalidate and refetch media files (items deleted/moved)
        queryClient.invalidateQueries({ queryKey: ['media-files'] })
        
        // Clear selection after bulk operation
        mediaStore.clearSelection()
      }
    )

    // Cleanup function
    return () => {
      unsubscribeUploadProgress()
      unsubscribeUploadComplete()
      unsubscribeBulkProgress()
      unsubscribeBulkComplete()
    }
  }, [queryClient, mediaStore])
}

/**
 * Hook to get combined upload and bulk operation items for display
 * Follows the same pattern as course upload progress
 */
export function useMediaOperationProgress() {
  const mediaStore = useMediaStore()
  
  const uploads = mediaStore.getUploadsArray()
  const bulkOperations = mediaStore.getBulkOperationsArray()
  
  console.log('📊 [MEDIA PROGRESS] Current uploads:', uploads)
  console.log('📊 [MEDIA PROGRESS] Current bulk operations:', bulkOperations)
  
  // Convert bulk operations to generic upload format for display
  const bulkOperationUploads = bulkOperations.map(op => ({
    id: op.operationId,
    filename: `${op.operationType} operation (${op.filename})`,
    progress: op.progress,
    status: op.status as any,
    error: op.error
  }))
  
  // Combine uploads and bulk operations
  const allOperations = [...uploads, ...bulkOperationUploads]
  
  return {
    operations: allOperations,
    totalProgress: mediaStore.getTotalUploadProgress(),
    hasActiveOperations: allOperations.some(op => 
      op.status === 'uploading' || op.status === 'processing'
    ),
    clearCompleted: () => {
      mediaStore.clearCompletedUploads()
      mediaStore.clearCompletedBulkOperations()
    },
    removeOperation: (id: string) => {
      // Try to remove from both uploads and bulk operations
      mediaStore.removeUpload(id)
      mediaStore.removeBulkOperation(id)
    }
  }
}
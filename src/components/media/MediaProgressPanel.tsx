"use client"

import React from 'react'
import { UploadProgressPanel } from '@/components/ui/UploadProgressPanel'
import { useMediaStore } from '@/stores/media-store'
import { useMediaProgress } from '@/hooks/use-media-progress'

interface MediaProgressPanelProps {
  className?: string
}

/**
 * Media-specific progress panel - simplified to match course system stability
 * Reads directly from media store like course upload system does
 */
export function MediaProgressPanel({ className }: MediaProgressPanelProps) {
  // Wire up WebSocket updates to media store (but don't use the complex hook)
  useMediaProgress()
  
  // Read directly from media store like course system - more stable!
  const mediaStore = useMediaStore()
  const uploads = mediaStore.getUploadsArray()
  const bulkOperations = mediaStore.getBulkOperationsArray()
  
  // Convert bulk operations to upload format
  const bulkUploads = bulkOperations.map(op => ({
    id: op.operationId,
    filename: `${op.operationType} operation`,
    progress: op.progress,
    status: op.status as any,
    error: op.error
  }))
  
  // Combine all operations
  const operations = [...uploads, ...bulkUploads]
  const totalProgress = mediaStore.getTotalUploadProgress()
  const hasActiveOperations = operations.some(op => 
    op.status === 'uploading' || op.status === 'processing'
  )

  return (
    <UploadProgressPanel
      uploads={operations}
      title="Media Operations"
      subtitle={hasActiveOperations ? "In Progress" : undefined}
      className={className}
      onClearCompleted={() => {
        mediaStore.clearCompletedUploads()
        mediaStore.clearCompletedBulkOperations()
      }}
      onRemoveUpload={(id) => {
        mediaStore.removeUpload(id)
        mediaStore.removeBulkOperation(id)
      }}
      showOverallProgress={true}
    />
  )
}
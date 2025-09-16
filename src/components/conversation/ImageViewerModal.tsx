'use client'

import React, { memo, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Share,
  Calendar,
  User
} from 'lucide-react'
import { ConversationMessage } from '@/lib/types/conversation-types'
import { formatDate, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ImageViewerModalProps {
  isOpen: boolean
  onClose: () => void
  messageId: string | null
  fileIndex: number
  totalFiles: number
  onNext: () => void
  onPrevious: () => void
  messages: ConversationMessage[]
}

/**
 * Image viewer modal component for conversation attachments
 * Reuses modal patterns from existing codebase
 */
export const ImageViewerModal = memo(function ImageViewerModal({
  isOpen,
  onClose,
  messageId,
  fileIndex,
  totalFiles,
  onNext,
  onPrevious,
  messages
}: ImageViewerModalProps) {
  // Find the current message and attachment
  const currentMessage = messages.find(m => m.id === messageId)
  const currentAttachment = currentMessage?.attachments?.[fileIndex]

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          onPrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          onNext()
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onNext, onPrevious, onClose])

  const handleDownload = useCallback(() => {
    if (currentAttachment?.cdn_url) {
      const link = document.createElement('a')
      link.href = currentAttachment.cdn_url
      link.download = currentAttachment.original_filename
      link.click()
    }
  }, [currentAttachment])

  const handleShare = useCallback(async () => {
    if (currentAttachment?.cdn_url && navigator.share) {
      try {
        await navigator.share({
          title: currentAttachment.original_filename,
          url: currentAttachment.cdn_url
        })
      } catch (error) {
        // Fallback to copy URL
        navigator.clipboard.writeText(currentAttachment.cdn_url)
      }
    }
  }, [currentAttachment])

  if (!currentMessage || !currentAttachment) {
    return null
  }

  const isImage = currentAttachment.mime_type?.startsWith('image/')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">
          Image Viewer - {currentAttachment.original_filename}
        </DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* File info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {currentAttachment.original_filename}
              </h3>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {currentMessage.sender_name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(currentMessage.created_at)}
                </span>
                {currentAttachment.file_size && (
                  <Badge variant="secondary" className="text-xs">
                    {formatFileSize(currentAttachment.file_size)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Navigation and actions */}
          <div className="flex items-center gap-2">
            {/* File counter */}
            {totalFiles > 1 && (
              <div className="text-sm text-gray-600 dark:text-gray-400 px-2">
                {fileIndex + 1} of {totalFiles}
              </div>
            )}

            {/* Navigation buttons */}
            {totalFiles > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrevious}
                  disabled={fileIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNext}
                  disabled={fileIndex === totalFiles - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Action buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
            </Button>

            {navigator.share && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
              >
                <Share className="w-4 h-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          {isImage && currentAttachment.cdn_url ? (
            <div className="relative max-w-full max-h-full">
              <img
                src={currentAttachment.cdn_url}
                alt={currentAttachment.original_filename}
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: 'calc(90vh - 120px)' }}
              />
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-500">
                  {getFileExtension(currentAttachment.original_filename)}
                </span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {currentAttachment.original_filename}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  This file type cannot be previewed
                </p>
              </div>
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>

        {/* Message context */}
        {currentMessage.content && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <div className="text-sm">
              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message context:
              </div>
              <div className="text-gray-600 dark:text-gray-400 line-clamp-2">
                {currentMessage.content}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
})

/**
 * Helper functions
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE'
}
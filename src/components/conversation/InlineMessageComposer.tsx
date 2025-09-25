'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Send,
  Paperclip,
  X,
  Image as ImageIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DailyNoteImage } from '@/app/student/goals/components/DailyNoteImage'
import { DailyNoteImageViewer } from '@/app/student/goals/components/DailyNoteImageViewer'
import { UploadProgress } from '@/components/ui/UploadProgress'
import { useUITransitionStore } from '@/stores/ui-transition-store'
import type { ExistingAttachment } from '@/hooks/use-message-form'

interface InlineMessageComposerProps {
  messageText: string
  onMessageChange: (text: string) => void
  attachedFiles: File[]
  onAddFiles: (files: File[]) => void
  onRemoveFile: (index: number) => void
  existingAttachments: ExistingAttachment[]
  onRemoveExistingAttachment: (id: string) => void
  placeholder?: string
  onCancel: () => void
  onSend: () => void
  isLoading: boolean
  isDirty: boolean
  isValid: boolean
  isDragOver: boolean
  onDragOver: (isDragOver: boolean) => void
  isEditMode?: boolean
  originalMessageText?: string
  originalAttachments?: ExistingAttachment[]
}

/**
 * Inline message composer for use within DailyGoalTrackerV2
 * Unlike the modal MessageComposer, this renders inline within the content
 */
export function InlineMessageComposer({
  messageText,
  onMessageChange,
  attachedFiles,
  onAddFiles,
  onRemoveFile,
  existingAttachments,
  onRemoveExistingAttachment,
  placeholder = "Write your message...",
  onCancel,
  onSend,
  isLoading,
  isDirty,
  isValid,
  isDragOver,
  onDragOver,
  isEditMode = false,
  originalMessageText = '',
  originalAttachments = []
}: InlineMessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // UI Transition Store for file-based image transitions (architecture compliant)
  const { getTransitionByFile, setImageTransition } = useUITransitionStore()

  // Image viewer state
  const [imageViewer, setImageViewer] = useState<{
    isOpen: boolean
    dailyEntry: any
    initialIndex: number
  }>({
    isOpen: false,
    dailyEntry: null,
    initialIndex: 0
  })

  // File blob URL cache to prevent state updates during render
  const [fileBlobUrls, setFileBlobUrls] = useState<Map<string, string>>(new Map())

  // Create blob URLs for files when they change
  useEffect(() => {
    const newBlobUrls = new Map<string, string>()

    attachedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const fileKey = file.name + file.size

        // Check if we already have a blob URL for this file
        if (!fileBlobUrls.has(fileKey)) {
          const blobUrl = URL.createObjectURL(file)
          newBlobUrls.set(fileKey, blobUrl)

          // Also update the UI transition store (but not during render)
          setImageTransition(file.name, file.size, blobUrl)
        } else {
          // Keep existing blob URL
          newBlobUrls.set(fileKey, fileBlobUrls.get(fileKey)!)
        }
      }
    })

    // Clean up old blob URLs that are no longer needed
    fileBlobUrls.forEach((blobUrl, fileKey) => {
      const fileStillExists = attachedFiles.some(file => (file.name + file.size) === fileKey)
      if (!fileStillExists) {
        URL.revokeObjectURL(blobUrl)
      } else {
        newBlobUrls.set(fileKey, blobUrl)
      }
    })

    setFileBlobUrls(newBlobUrls)
  }, [attachedFiles, setImageTransition])

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      fileBlobUrls.forEach(blobUrl => {
        URL.revokeObjectURL(blobUrl)
      })
    }
  }, [])

  // Change detection for edit mode
  const hasContentChanged = isEditMode ? messageText.trim() !== originalMessageText.trim() : false
  const originalAttachmentIds = originalAttachments.map(att => att.id).sort()
  const currentAttachmentIds = existingAttachments.map(att => att.id).sort()
  const hasAttachmentsChanged = isEditMode ? JSON.stringify(originalAttachmentIds) !== JSON.stringify(currentAttachmentIds) : false
  const hasNewFiles = attachedFiles.length > 0
  const hasChanges = hasContentChanged || hasAttachmentsChanged || hasNewFiles

  // Override isValid for edit mode - only valid if there are actual changes
  const isValidForSave = isEditMode ? (hasChanges && (messageText.trim() !== '' || existingAttachments.length > 0 || attachedFiles.length > 0)) : isValid

  // UI orchestration helper for file display URLs (follows file-based transition pattern)
  const getFileDisplayUrl = (file: File) => {
    if (!file.type.startsWith('image/')) return null

    const fileKey = file.name + file.size

    // First check our local cache
    if (fileBlobUrls.has(fileKey)) {
      return fileBlobUrls.get(fileKey)
    }

    // Then check UI transition store using file-based mapping
    const transition = getTransitionByFile(file.name, file.size)
    if (transition) {
      return transition.blobUrl
    }

    // Return null if we don't have a blob URL yet (useEffect will create it)
    return null
  }

  // Convert File objects and existing attachments to format expected by image viewer
  const createMockDailyEntry = () => {
    const newImageFiles = attachedFiles.filter(file => file.type.startsWith('image/'))
    const existingImageFiles = existingAttachments.filter(att => att.mimeType.startsWith('image/'))

    const allAttachedFiles = [
      // Existing attachments
      ...existingImageFiles.map(att => ({
        id: att.id,
        filename: att.name,
        original_filename: att.name,
        file_size: att.size,
        mime_type: att.mimeType,
        cdn_url: att.url,
        storage_path: '',
        message_text: messageText || 'Existing attachment'
      })),
      // New file attachments
      ...newImageFiles.map(file => ({
        id: file.name + file.size, // Use filename + size as unique ID
        filename: file.name,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        cdn_url: getFileDisplayUrl(file) || '',
        storage_path: '',
        message_text: messageText || 'Preview before sending'
      }))
    ]

    return {
      day: 1,
      date: new Date().toISOString().split('T')[0],
      attachedFiles: allAttachedFiles
    }
  }

  const openImageViewer = (fileId: string) => {
    const mockEntry = createMockDailyEntry()
    const initialIndex = mockEntry.attachedFiles.findIndex(file => file.id === fileId)

    setImageViewer({
      isOpen: true,
      dailyEntry: mockEntry,
      initialIndex: Math.max(0, initialIndex)
    })
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      onAddFiles(files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onAddFiles(files)
    }
  }

  return (
    <div className="space-y-3 p-4 bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-600 rounded-lg">
      {/* Unified Message Text Area with Drag/Drop */}
      <div className="space-y-2">
        <div
          className={cn(
            'relative rounded-lg transition-all duration-200',
            isDragOver
              ? 'ring-2 ring-blue-500 ring-offset-2'
              : ''
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Textarea
            placeholder={`${placeholder}${messageText ? '' : '\n\nDrag and drop files here or click the attach button below'}`}
            value={messageText}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                if (isValidForSave && !isLoading) {
                  onSend()
                }
              }
            }}
            className={cn(
              'min-h-[100px] resize-none transition-all duration-200',
              isDragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                : ''
            )}
            disabled={isLoading}
          />

          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 rounded-lg bg-blue-500/10 border-2 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
              <div className="text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Drop files to attach
              </div>
            </div>
          )}
        </div>

        {/* Character count, validation, and file attach button */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-3">
            <span className="text-gray-500">{messageText.length} characters</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="h-6 px-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800"
            >
              <Paperclip className="w-3 h-3 mr-1" />
              Attach
            </Button>
          </div>
          {!isValidForSave && isDirty && !isEditMode && (
            <span className="text-red-500">Message cannot be empty</span>
          )}
        </div>
      </div>

      {/* Existing Attachments Display */}
      {existingAttachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Current attachments ({existingAttachments.length}):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {existingAttachments.map((attachment) => (
              <div key={attachment.id} className="group relative">
                {attachment.mimeType.startsWith('image/') ? (
                  <div className="relative">
                    <DailyNoteImage
                      attachmentId={attachment.id}
                      originalFilename={attachment.name}
                      className="w-full h-32"
                      onClick={() => !isLoading && openImageViewer(attachment.id)}
                    />

                    {/* Remove button overlay */}
                    {!isLoading && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onRemoveExistingAttachment(attachment.id)
                          }}
                          className="w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500">
                    <div className="text-lg">📄</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(attachment.size / 1024)}KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveExistingAttachment(attachment.id)}
                      disabled={isLoading}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Attached Files Display */}
      {attachedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            New files ({attachedFiles.length}):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {attachedFiles.map((file, index) => (
              <div key={index} className="group relative">
                {file.type.startsWith('image/') ? (
                  <div className="relative">
                    {/* Show actual image preview (WhatsApp/Messenger style with UI orchestration) */}
                    {getFileDisplayUrl(file) ? (
                      <img
                        src={getFileDisplayUrl(file)!}
                        alt={file.name}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => !isLoading && openImageViewer(file.name + file.size)}
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                        <div className="text-gray-500 text-sm">Loading...</div>
                      </div>
                    )}

                    {/* Upload progress overlay */}
                    {isLoading && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="w-6 h-6 animate-spin rounded-full border-2 border-white border-t-transparent mb-2 mx-auto"></div>
                          <div className="text-xs">Uploading...</div>
                        </div>
                      </div>
                    )}

                    {/* Remove button overlay */}
                    {!isLoading && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onRemoveFile(index)
                          }}
                          className="w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500">
                    <div className="text-lg">📄</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(file.size / 1024)}KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFile(index)}
                      disabled={isLoading}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault()
            onCancel()
          }}
          disabled={isLoading}
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onSend()
          }}
          disabled={!isValidForSave || isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {isEditMode ? 'Saving...' : 'Sending...'}
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {isEditMode ? 'Save' : 'Send'}
            </>
          )}
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.txt,.doc,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Viewer Modal */}
      {imageViewer.dailyEntry && (
        <DailyNoteImageViewer
          isOpen={imageViewer.isOpen}
          onClose={() => setImageViewer({ isOpen: false, dailyEntry: null, initialIndex: 0 })}
          initialImageIndex={imageViewer.initialIndex}
          dailyEntry={imageViewer.dailyEntry}
        />
      )}
    </div>
  )
}
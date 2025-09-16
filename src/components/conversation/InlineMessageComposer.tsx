'use client'

import React, { useRef, useState } from 'react'
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

interface InlineMessageComposerProps {
  messageText: string
  onMessageChange: (text: string) => void
  attachedFiles: File[]
  onAddFiles: (files: File[]) => void
  onRemoveFile: (index: number) => void
  placeholder?: string
  onCancel: () => void
  onSend: () => void
  isLoading: boolean
  isDirty: boolean
  isValid: boolean
  isDragOver: boolean
  onDragOver: (isDragOver: boolean) => void
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
  placeholder = "Write your message...",
  onCancel,
  onSend,
  isLoading,
  isDirty,
  isValid,
  isDragOver,
  onDragOver
}: InlineMessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Convert File objects to format expected by image viewer
  const createMockDailyEntry = () => {
    const imageFiles = attachedFiles.filter(file => file.type.startsWith('image/'))
    return {
      day: 1,
      date: new Date().toISOString().split('T')[0],
      attachedFiles: imageFiles.map(file => ({
        id: file.name + file.size, // Use filename + size as unique ID
        filename: file.name,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        cdn_url: URL.createObjectURL(file),
        storage_path: '',
        message_text: messageText || 'Preview before sending'
      }))
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
                if (isValid && !isLoading) {
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
          {!isValid && isDirty && (
            <span className="text-red-500">Message cannot be empty</span>
          )}
        </div>
      </div>

      {/* Attached Files Display */}
      {attachedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Attached files ({attachedFiles.length}):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {attachedFiles.map((file, index) => (
              <div key={index} className="group relative">
                {file.type.startsWith('image/') ? (
                  <div className="relative">
                    <DailyNoteImage
                      privateUrl={URL.createObjectURL(file)}
                      originalFilename={file.name}
                      className="w-full h-32"
                      onClick={() => !isLoading && openImageViewer(file.name + file.size)}
                    />

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
          disabled={!isValid || isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send
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
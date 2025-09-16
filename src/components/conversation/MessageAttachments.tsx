'use client'

import React, { memo } from 'react'
import { MessageAttachment } from '@/lib/types/conversation-types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Download,
  Eye,
  Image as ImageIcon,
  File,
  Video,
  Music
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageAttachmentsProps {
  attachments: MessageAttachment[]
  onImageClick: (fileIndex: number, totalFiles: number) => void
  compactMode: boolean
}

/**
 * Component for displaying message attachments
 * Reuses existing file display patterns from the codebase
 */
export const MessageAttachments = memo(function MessageAttachments({
  attachments,
  onImageClick,
  compactMode
}: MessageAttachmentsProps) {
  const imageAttachments = attachments.filter(isImageFile)
  const otherAttachments = attachments.filter(file => !isImageFile(file))

  return (
    <div className="space-y-3">
      {/* Image attachments - grid display */}
      {imageAttachments.length > 0 && (
        <div className="space-y-2">
          <div className={cn(
            'grid gap-2',
            imageAttachments.length === 1 ? 'grid-cols-1' :
            imageAttachments.length === 2 ? 'grid-cols-2' :
            'grid-cols-3'
          )}>
            {imageAttachments.map((attachment, index) => (
              <ImagePreview
                key={attachment.id}
                attachment={attachment}
                onClick={() => onImageClick(
                  attachments.findIndex(a => a.id === attachment.id),
                  attachments.length
                )}
                compactMode={compactMode}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other file attachments - list display */}
      {otherAttachments.length > 0 && (
        <div className="space-y-2">
          {otherAttachments.map((attachment) => (
            <FilePreview
              key={attachment.id}
              attachment={attachment}
              compactMode={compactMode}
            />
          ))}
        </div>
      )}
    </div>
  )
})

/**
 * Image preview component with click to open modal
 */
const ImagePreview = memo(function ImagePreview({
  attachment,
  onClick,
  compactMode
}: {
  attachment: MessageAttachment
  onClick: () => void
  compactMode: boolean
}) {
  return (
    <div
      className={cn(
        'relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800',
        compactMode ? 'h-24' : 'h-32'
      )}
      onClick={onClick}
    >
      {attachment.cdn_url ? (
        <img
          src={attachment.cdn_url}
          alt={attachment.original_filename}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
        <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* File info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <p className="text-white text-xs truncate font-medium">
          {attachment.original_filename}
        </p>
        {attachment.file_size && (
          <p className="text-white/80 text-xs">
            {formatFileSize(attachment.file_size)}
          </p>
        )}
      </div>
    </div>
  )
})

/**
 * Non-image file preview component
 */
const FilePreview = memo(function FilePreview({
  attachment,
  compactMode
}: {
  attachment: MessageAttachment
  compactMode: boolean
}) {
  const fileIcon = getFileIcon(attachment.mime_type)

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors',
      compactMode && 'p-2'
    )}>
      {/* File icon */}
      <div className="flex-shrink-0">
        {fileIcon}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-medium text-gray-900 dark:text-gray-100 truncate',
          compactMode ? 'text-sm' : 'text-base'
        )}>
          {attachment.original_filename}
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          {attachment.file_size && (
            <span>{formatFileSize(attachment.file_size)}</span>
          )}
          <Badge variant="outline" className="text-xs">
            {getFileExtension(attachment.original_filename)}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {attachment.cdn_url && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(attachment.cdn_url, '_blank')}
              className={compactMode ? 'h-8 w-8 p-0' : ''}
            >
              <Eye className="w-4 h-4" />
              {!compactMode && <span className="ml-1">View</span>}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const link = document.createElement('a')
                link.href = attachment.cdn_url
                link.download = attachment.original_filename
                link.click()
              }}
              className={compactMode ? 'h-8 w-8 p-0' : ''}
            >
              <Download className="w-4 h-4" />
              {!compactMode && <span className="ml-1">Download</span>}
            </Button>
          </>
        )}
      </div>
    </div>
  )
})

/**
 * Helper functions
 */
function isImageFile(attachment: MessageAttachment): boolean {
  return attachment.mime_type?.startsWith('image/') || false
}

function getFileIcon(mimeType?: string) {
  if (!mimeType) return <File className="w-6 h-6 text-gray-400" />

  if (mimeType.startsWith('image/')) {
    return <ImageIcon className="w-6 h-6 text-blue-500" />
  }

  if (mimeType.startsWith('video/')) {
    return <Video className="w-6 h-6 text-red-500" />
  }

  if (mimeType.startsWith('audio/')) {
    return <Music className="w-6 h-6 text-purple-500" />
  }

  if (mimeType.includes('pdf')) {
    return <FileText className="w-6 h-6 text-red-600" />
  }

  if (mimeType.includes('document') || mimeType.includes('text')) {
    return <FileText className="w-6 h-6 text-blue-600" />
  }

  return <File className="w-6 h-6 text-gray-500" />
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
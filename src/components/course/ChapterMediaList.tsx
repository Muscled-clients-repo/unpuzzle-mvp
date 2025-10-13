"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  GripVertical,
  Edit2,
  Trash2,
  Eye,
  FileVideo,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Save,
  FileText,
  Upload
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChapterMedia } from "@/hooks/use-chapter-media-queries"
import { useCourseCreationUI } from '@/stores/course-creation-ui'

interface ChapterMediaListProps {
  chapterId: string
  courseId?: string
  media: ChapterMedia[]
  onMediaUnlink: (junctionId: string) => void
  onMediaPreview?: (media: ChapterMedia) => void
  onTranscriptUpload?: (media: ChapterMedia) => void
  onMediaReorder?: (newOrder: Array<{ junctionId: string, newPosition: number }>) => void
  onTitleUpdate?: (junctionId: string, customTitle: string) => void
  onPendingChangesUpdate?: (hasChanges: boolean, changeCount: number, saveFunction: () => void, isSaving?: boolean) => void
  isDraggable?: boolean
  className?: string
}

export function ChapterMediaList({
  chapterId,
  courseId,
  media,
  onMediaUnlink,
  onMediaPreview,
  onTranscriptUpload,
  onMediaReorder,
  onTitleUpdate,
  onPendingChangesUpdate,
  isDraggable = true,
  className
}: ChapterMediaListProps) {

  // Router for navigation
  const router = useRouter()

  // UI state management
  const ui = useCourseCreationUI()

  // Local editing state
  const [editingMedia, setEditingMedia] = useState<string | null>(null)
  const [mediaTitle, setMediaTitle] = useState("")
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null)
  const [draggedMediaIndex, setDraggedMediaIndex] = useState<number | null>(null)

  // ARCHITECTURE-COMPLIANT: Use Zustand for pending changes (001 arch principle)
  const pendingChanges = ui.getMediaPendingChanges()

  // Sort media by order
  const sortedMedia = [...media].sort((a, b) => a.order - b.order)

  // Helper to get display title (custom title or original name)
  const getDisplayTitle = (mediaItem: ChapterMedia): string => {
    return mediaItem.customTitle || mediaItem.name || 'Untitled Media'
  }

  // Helper to get file extension for icon
  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  // Status icon based on file type and state
  const getStatusIcon = (mediaItem: ChapterMedia) => {
    const isDeletionPending = ui.pendingDeletes.has(mediaItem.junctionId)

    if (isDeletionPending) {
      return <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
    }

    // Show icon based on file type (handle both file_type and type properties)
    const fileType = mediaItem.file_type || (mediaItem as any).type || ''
    if (fileType === 'video' || (fileType && fileType.startsWith('video/'))) {
      return <FileVideo className="h-4 w-4 text-primary flex-shrink-0" />
    } else if (fileType === 'audio' || (fileType && fileType.startsWith('audio/'))) {
      return <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
    } else {
      return <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    }
  }

  // Format duration for display
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '--:--'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // ARCHITECTURE-COMPLIANT: Track pending changes in Zustand (001 arch principle)
  const trackPendingChange = (junctionId: string, newTitle: string) => {
    const mediaItem = sortedMedia.find(m => m.junctionId === junctionId)
    if (!mediaItem) return

    const currentTitle = getDisplayTitle(mediaItem)

    if (newTitle !== currentTitle) {
      ui.setMediaPendingChange(junctionId, newTitle)
    } else {
      ui.removeContentPendingChange('media', junctionId)
    }
  }

  // ARCHITECTURE-COMPLIANT: Handle save all pending changes via Zustand (001 arch principle)
  const handleSaveAllChanges = useCallback(() => {
    console.log('💾 [MEDIA LIST] Saving all pending changes:', Object.keys(pendingChanges).length)

    Object.entries(pendingChanges).forEach(([junctionId, newTitle]) => {
      if (onTitleUpdate && newTitle.trim()) {
        onTitleUpdate(junctionId, newTitle.trim())
      }
    })

    ui.clearAllMediaPendingChanges()
    setEditingMedia(null)
  }, [pendingChanges, onTitleUpdate, ui])

  // Notify parent of pending changes
  useEffect(() => {
    const changeCount = Object.keys(pendingChanges).length
    const hasChanges = changeCount > 0

    if (onPendingChangesUpdate) {
      onPendingChangesUpdate(hasChanges, changeCount, handleSaveAllChanges, false)
    }
  }, [pendingChanges, handleSaveAllChanges, onPendingChangesUpdate])

  // Edit handlers
  const handleStartEdit = (mediaItem: ChapterMedia) => {
    const currentTitle = getDisplayTitle(mediaItem)
    setEditingMedia(mediaItem.junctionId)
    setMediaTitle(currentTitle)
  }

  const handleSaveEdit = (junctionId: string) => {
    if (mediaTitle.trim() && mediaTitle.trim() !== '') {
      trackPendingChange(junctionId, mediaTitle.trim())
    }
    setEditingMedia(null)
    setMediaTitle('')
  }

  const handleCancelEdit = () => {
    setEditingMedia(null)
    setMediaTitle('')
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number, junctionId: string) => {
    setDraggedMediaIndex(index)
    e.dataTransfer.setData('text/plain', junctionId)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDraggedOverIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedMediaIndex(null)
    setDraggedOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()

    if (draggedMediaIndex === null || draggedMediaIndex === dropIndex) {
      handleDragEnd()
      return
    }

    // Create new order array
    const reorderedMedia = [...sortedMedia]
    const draggedItem = reorderedMedia[draggedMediaIndex]

    // Remove dragged item and insert at new position
    reorderedMedia.splice(draggedMediaIndex, 1)
    reorderedMedia.splice(dropIndex, 0, draggedItem)

    // Create order updates
    const orderUpdates = reorderedMedia.map((item, index) => ({
      junctionId: item.junctionId,
      newPosition: index + 1 // 1-based ordering
    }))

    if (onMediaReorder) {
      onMediaReorder(orderUpdates)
    }

    handleDragEnd()
  }

  if (sortedMedia.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <FileVideo className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No media files linked to this chapter yet.</p>
        <p className="text-sm">Add media from your library to get started.</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {sortedMedia.map((mediaItem, index) => {
        const isDeletionPending = ui.pendingDeletes.has(mediaItem.junctionId)
        const hasPendingChange = pendingChanges[mediaItem.junctionId]
        const isEditing = editingMedia === mediaItem.junctionId

        return (
          <div
            key={mediaItem.junctionId}
            className={cn(
              "group flex items-center gap-3 p-3 border rounded-lg transition-all",
              "hover:bg-muted/50 hover:border-muted-foreground/20",
              isDeletionPending && "opacity-50 bg-destructive/5 border-destructive/20",
              draggedOverIndex === index && "border-primary bg-primary/5",
              hasPendingChange && "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20"
            )}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
          >
            {/* Drag Handle */}
            {isDraggable && (
              <div
                className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                draggable={!isDeletionPending}
                onDragStart={(e) => handleDragStart(e, index, mediaItem.junctionId)}
                onDragEnd={handleDragEnd}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {/* Order Number */}
            <span className="text-sm text-muted-foreground font-medium min-w-[20px]">
              {mediaItem.order}.
            </span>

            {/* Status Icon */}
            {getStatusIcon(mediaItem)}

            {/* Media Title/Name */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  onBlur={() => handleSaveEdit(mediaItem.junctionId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveEdit(mediaItem.junctionId)
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      handleCancelEdit()
                    }
                  }}
                  className="text-sm"
                  autoFocus
                />
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 group/title">
                    <p
                      className={cn(
                        "text-sm font-medium cursor-pointer truncate hover:underline",
                        hasPendingChange && "text-orange-700 dark:text-orange-300"
                      )}
                      onClick={() => {
                        if (!isDeletionPending) {
                          console.log('🎬 [MEDIA LIST] Navigating to video editor:', {
                            mediaId: mediaItem.id,
                            mediaName: mediaItem.name,
                            junctionId: mediaItem.junctionId,
                            courseId
                          })
                          // If courseId exists, use course context route, otherwise use standalone route
                          const videoPath = courseId
                            ? `/instructor/course/${courseId}/video/${mediaItem.id}`
                            : `/instructor/video/${mediaItem.id}`
                          router.push(videoPath)
                        }
                      }}
                      title={`Open ${getDisplayTitle(mediaItem)} in video editor`}
                    >
                      {hasPendingChange ? pendingChanges[mediaItem.junctionId] : getDisplayTitle(mediaItem)}
                      {hasPendingChange && (
                        <span className="ml-2 text-xs text-orange-500">*</span>
                      )}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover/title:opacity-100 transition-opacity"
                      onClick={() => !isDeletionPending && handleStartEdit(mediaItem)}
                      title="Rename video"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Media metadata */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatFileSize(mediaItem.file_size)}</span>
                    {mediaItem.duration_seconds && (
                      <span>{formatDuration(mediaItem.duration_seconds)}</span>
                    )}
                    <span className="uppercase">{getFileExtension(mediaItem.name)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Pending Change Indicator */}
            {hasPendingChange && (
              <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300">
                Unsaved
              </Badge>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Preview Button */}
              {onMediaPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMediaPreview(mediaItem)}
                  disabled={isDeletionPending}
                  className="h-8 w-8 p-0"
                  title="Preview video"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              )}

              {/* Transcript Upload Button */}
              {(() => {
                const fileType = mediaItem.file_type || (mediaItem as any).type || ''
                return (fileType === 'video' || (fileType && fileType.startsWith('video/'))) && onTranscriptUpload
              })() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('Transcript upload clicked for:', mediaItem.name, mediaItem.file_type || (mediaItem as any).type)
                    onTranscriptUpload(mediaItem)
                  }}
                  disabled={isDeletionPending}
                  className="h-8 w-8 p-0"
                  title="Upload transcript"
                >
                  <Upload className="h-3 w-3" />
                </Button>
              )}


              {/* Unlink Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('🔓 [MEDIA LIST] Unlinking media:', mediaItem.junctionId)
                  onMediaUnlink(mediaItem.junctionId)
                }}
                disabled={isDeletionPending}
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                {isDeletionPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        )
      })}

      {/* Pending Changes Summary */}
      {Object.keys(pendingChanges).length > 0 && (
        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm text-orange-700 dark:text-orange-300">
                {Object.keys(pendingChanges).length} unsaved change(s)
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleSaveAllChanges}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Save className="h-3 w-3 mr-1" />
              Save All
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
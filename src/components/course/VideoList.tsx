"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
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
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { VideoUpload } from "@/stores/slices/course-creation-slice"

interface VideoListProps {
  videos: VideoUpload[]
  onVideoRename: (videoId: string, newName: string) => void
  onVideoDelete: (videoId: string) => void
  onVideoPreview?: (video: VideoUpload) => void
  onVideoDragStart?: (videoId: string) => void
  onVideoDragEnd?: () => void
  onVideoReorder?: (videos: VideoUpload[]) => void
  isDraggable?: boolean
  className?: string
}

export function VideoList({
  videos,
  onVideoRename,
  onVideoDelete,
  onVideoPreview,
  onVideoDragStart,
  onVideoDragEnd,
  onVideoReorder,
  isDraggable = true,
  className
}: VideoListProps) {
  const [editingVideo, setEditingVideo] = useState<string | null>(null)
  const [videoTitle, setVideoTitle] = useState("")
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null)
  const [draggedVideoIndex, setDraggedVideoIndex] = useState<number | null>(null)

  const handleStartEdit = (video: VideoUpload) => {
    setEditingVideo(video.id)
    setVideoTitle(video.name)
  }

  const handleDragStart = (e: React.DragEvent, index: number, videoId: string) => {
    setDraggedVideoIndex(index)
    if (onVideoDragStart) {
      onVideoDragStart(videoId)
    }
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedVideoIndex !== null && draggedVideoIndex !== index) {
      setDraggedOverIndex(index)
    }
  }

  const handleDragEnd = () => {
    setDraggedVideoIndex(null)
    setDraggedOverIndex(null)
    if (onVideoDragEnd) {
      onVideoDragEnd()
    }
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (draggedVideoIndex !== null && draggedVideoIndex !== dropIndex && onVideoReorder) {
      const newVideos = [...videos]
      const [draggedVideo] = newVideos.splice(draggedVideoIndex, 1)
      newVideos.splice(dropIndex, 0, draggedVideo)
      
      // Update order numbers
      const reorderedVideos = newVideos.map((v, i) => ({ ...v, order: i }))
      onVideoReorder(reorderedVideos)
    }
    
    setDraggedVideoIndex(null)
    setDraggedOverIndex(null)
  }

  const handleSaveEdit = (videoId: string) => {
    if (videoTitle.trim()) {
      onVideoRename(videoId, videoTitle.trim())
    }
    setEditingVideo(null)
  }

  const getStatusIcon = (status: VideoUpload['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <FileVideo className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: VideoUpload['status']) => {
    switch (status) {
      case 'uploading':
        return <Badge variant="secondary">Uploading</Badge>
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>
      case 'complete':
        return <Badge variant="default">Ready</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'pending':
        return <Badge variant="outline">Pending</Badge>
      default:
        return null
    }
  }

  if (videos.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <FileVideo className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No videos uploaded yet</p>
        <p className="text-xs mt-1">Upload videos to get started</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {videos.map((video, index) => (
        <div
          key={video.id}
          draggable={isDraggable && video.status !== 'uploading'}
          onDragStart={(e) => isDraggable && handleDragStart(e, index, video.id)}
          onDragOver={(e) => isDraggable && handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          onDrop={(e) => isDraggable && handleDrop(e, index)}
          className={cn(
            "flex items-center gap-3 p-3 bg-background rounded-lg border",
            "hover:bg-accent/50 transition-colors group",
            video.status === 'uploading' && "opacity-70",
            draggedOverIndex === index && "border-primary bg-accent",
            isDraggable && video.status !== 'uploading' && "cursor-move",
            video.markedForDeletion && "opacity-50 bg-destructive/10"
          )}
        >
          {/* Drag Handle */}
          {isDraggable && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              {video.status === 'uploading' ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}

          {/* Video Number */}
          <span className="text-sm text-muted-foreground font-medium min-w-[20px]">
            {index + 1}.
          </span>

          {/* Status Icon */}
          {getStatusIcon(video.status)}

          {/* Video Name/Title */}
          <div className="flex-1 min-w-0">
            {editingVideo === video.id ? (
              <Input
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                onBlur={() => handleSaveEdit(video.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit(video.id)
                  } else if (e.key === 'Escape') {
                    setEditingVideo(null)
                  }
                }}
                className="h-7 text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="space-y-1">
                <p className={cn(
                  "text-sm font-medium truncate",
                  video.markedForDeletion && "line-through"
                )}>
                  {video.name}
                </p>
                {video.status === 'uploading' && video.progress !== undefined && (
                  <div className="flex items-center gap-2">
                    <Progress value={video.progress} className="h-1 flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {video.progress}%
                    </span>
                  </div>
                )}
                {video.duration && video.status === 'complete' && (
                  <p className="text-xs text-muted-foreground">
                    Duration: {video.duration}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Status Badge */}
          {video.markedForDeletion ? (
            <Badge variant="destructive">Marked for deletion</Badge>
          ) : (
            getStatusBadge(video.status)
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Preview Button */}
            {onVideoPreview && video.url && video.status === 'complete' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  onVideoPreview(video)
                }}
                title="Preview video"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}

            {/* Edit Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation()
                handleStartEdit(video)
              }}
              disabled={video.status === 'uploading'}
              title="Rename video"
            >
              <Edit2 className="h-3 w-3" />
            </Button>

            {/* Delete Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onVideoDelete(video.id)
              }}
              disabled={video.status === 'uploading'}
              title={video.markedForDeletion ? "Undo delete" : "Delete video"}
            >
              {video.markedForDeletion ? (
                <X className="h-3 w-3" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
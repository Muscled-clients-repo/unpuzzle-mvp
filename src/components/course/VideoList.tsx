"use client"

import { useState, useEffect, useCallback } from "react"
import { useClickToEdit } from "@/hooks/use-click-to-edit"
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
  AlertCircle,
  Save
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
  batchRenameMutation?: any // TanStack Query mutation
  onPendingChangesUpdate?: (hasChanges: boolean, changeCount: number, saveFunction: () => void, isSaving?: boolean) => void
  onTabNavigation?: (currentId: string, currentType: 'video' | 'chapter', direction: 'next' | 'previous') => void
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
  batchRenameMutation,
  onPendingChangesUpdate,
  onTabNavigation,
  isDraggable = true,
  className
}: VideoListProps) {
  // 🔍 INVESTIGATION: Log VideoList data source
  useEffect(() => {
    console.log('🔍 [INVESTIGATION] VideoList received videos:', {
      count: videos.length,
      videoIds: videos.map(v => v.id),
      firstVideoTitle: videos[0]?.title,
      firstVideoName: videos[0]?.name,
      firstVideoFilename: videos[0]?.filename,
      dataSource: 'chapter.videos from useChapters query'
    })
  }, [videos])

  const [editingVideo, setEditingVideo] = useState<string | null>(null)
  const [videoTitle, setVideoTitle] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null)
  const [draggedVideoIndex, setDraggedVideoIndex] = useState<number | null>(null)
  const [cursorPosition, setCursorPosition] = useState<number | null>(null)
  
  // Simple pending changes for UI feedback
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({})
  const [activelyEditing, setActivelyEditing] = useState<{id: string, value: string} | null>(null)
  
  // Get display name for a video (show pending changes until save, then let TanStack Query handle updates)
  const getDisplayName = (video: VideoUpload): string => {
    // If actively editing, show current input
    if (editingVideo === video.id && videoTitle) {
      return videoTitle
    }
    // Show pending changes (until save is clicked)
    if (pendingChanges[video.id]) {
      return pendingChanges[video.id]
    }
    
    // Extract original filename from structured path if needed
    let displayFilename = video.filename
    if (displayFilename && displayFilename.includes('/')) {
      // Extract just the filename part from structured path like "courses/.../uuid_filename.mp4"
      displayFilename = displayFilename.split('/').pop() || displayFilename
      // Remove UUID prefix if present (e.g., "uuid_filename.mp4" -> "filename.mp4")
      if (displayFilename.includes('_') && displayFilename.match(/^[a-f0-9-]{36}_/)) {
        displayFilename = displayFilename.replace(/^[a-f0-9-]{36}_/, '')
      }
    }
    
    // Otherwise show server data (prioritize title which gets updated by TanStack Query)
    return video.title || video.name || displayFilename || 'Untitled Video'
  }
  
  // Track pending changes for counter
  const trackPendingChange = (videoId: string, newName: string) => {
    const video = videos.find(v => v.id === videoId)
    const currentName = video?.name || video?.title || video?.filename || 'Untitled Video'
    
    if (newName.trim() === currentName) {
      // No change, remove from pending
      setPendingChanges(prev => {
        const next = { ...prev }
        delete next[videoId]
        return next
      })
    } else {
      // Add to pending changes
      setPendingChanges(prev => ({
        ...prev,
        [videoId]: newName.trim()
      }))
    }
  }
  
  // Save all pending changes using TanStack Query mutation
  const saveAllChanges = useCallback(async () => {
    if (!batchRenameMutation) return
    
    // Include any currently active edit
    let finalChanges = { ...pendingChanges }
    
    // If user is currently editing, include that change
    if (editingVideo && videoTitle.trim()) {
      const video = videos.find(v => v.id === editingVideo)
      const currentName = video?.name || video?.title || video?.filename || 'Untitled Video'
      if (videoTitle.trim() !== currentName) {
        finalChanges[editingVideo] = videoTitle.trim()
      }
    }
    
    if (Object.keys(finalChanges).length === 0) return
    
    // Convert to mutation format
    const updates = Object.entries(finalChanges).map(([id, name]) => {
      // For filename changes, we only need to send id and title
      // Don't send order/chapter_id unless we're actually reordering
      return {
        id,
        title: name
      }
    })
    
    console.log('🚀 Saving changes:', updates)
    
    // Use TanStack Query mutation (handles optimistic updates)
    batchRenameMutation.mutate(updates, {
      onSuccess: (result) => {
        console.log('✅ Save success:', result)
        // Immediately clear pending changes - trust TanStack Query optimistic updates
        setPendingChanges({})
        if (editingVideo) {
          setEditingVideo(null)
          setEditingIndex(null)
          setVideoTitle('')
        }
      },
      onError: (error) => {
        console.error('❌ Save error:', error)
        // Keep pending changes on error so user doesn't lose work
      }
    })
  }, [batchRenameMutation, pendingChanges, editingVideo, videoTitle, videos])
  
  // Notify parent of pending changes when state changes
  useEffect(() => {
    let totalChanges = Object.keys(pendingChanges).length
    let hasAnyChanges = totalChanges > 0
    
    // Include currently active edit if it's different from original
    if (editingVideo && videoTitle.trim()) {
      const video = videos.find(v => v.id === editingVideo)
      const currentName = video?.name || video?.title || video?.filename || 'Untitled Video'
      if (videoTitle.trim() !== currentName && !pendingChanges[editingVideo]) {
        totalChanges += 1
        hasAnyChanges = true
      }
    }
    
    const isSaving = batchRenameMutation?.isPending || false
    onPendingChangesUpdate?.(hasAnyChanges, totalChanges, saveAllChanges, isSaving)
  }, [pendingChanges, editingVideo, videoTitle, videos, saveAllChanges, onPendingChangesUpdate, batchRenameMutation?.isPending])

  // Auto-save on component unmount
  useEffect(() => {
    return () => {
      if (Object.keys(pendingChanges).length > 0) {
        if (onBatchRename) {
          const changes = Object.entries(pendingChanges).map(([id, name]) => ({ id, name }))
          onBatchRename(changes)
        } else {
          // Fallback to individual renames if batch not available
          for (const [videoId, newName] of Object.entries(pendingChanges)) {
            onVideoRename(videoId, newName)
          }
        }
      }
    }
  }, [])

  // Calculate cursor position based on click location
  const calculateCursorPosition = (e: React.MouseEvent, text: string): number => {
    const element = e.currentTarget as HTMLElement
    const rect = element.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    
    // Create a temporary span to measure text width
    const tempSpan = document.createElement('span')
    tempSpan.style.font = window.getComputedStyle(element).font
    tempSpan.style.position = 'absolute'
    tempSpan.style.visibility = 'hidden'
    tempSpan.style.whiteSpace = 'pre'
    document.body.appendChild(tempSpan)
    
    let position = 0
    for (let i = 0; i <= text.length; i++) {
      tempSpan.textContent = text.substring(0, i)
      if (tempSpan.offsetWidth >= clickX) {
        position = i
        break
      }
      position = i
    }
    
    document.body.removeChild(tempSpan)
    return position
  }

  const handleStartEdit = (video: VideoUpload, index: number, clickPosition?: number | 'start' | 'end') => {
    const videoName = getDisplayName(video)
    setEditingVideo(video.id)
    setEditingIndex(index)
    setVideoTitle(videoName)
    
    if (clickPosition === 'start') {
      setCursorPosition(0)
    } else if (clickPosition === 'end') {
      setCursorPosition(videoName.length)
    } else {
      setCursorPosition(clickPosition ?? null)
    }
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

  const handleSaveEdit = (videoId: string, force = false) => {
    // Always track the current edit when exiting
    if (videoTitle.trim()) {
      trackPendingChange(videoId, videoTitle.trim())
    }
    setEditingVideo(null)
    setEditingIndex(null)
    setVideoTitle('')
  }
  
  const handleCancelEdit = () => {
    setEditingVideo(null)
    setEditingIndex(null)
    setVideoTitle('')
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

  const getStatusIndicator = (status: VideoUpload['status']) => {
    switch (status) {
      case 'uploading':
        return <Badge variant="secondary">Uploading</Badge>
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>
      case 'complete':
        return <div className="h-2 w-2 bg-green-500 rounded-full" title="Ready" />
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
          className={cn(
            "flex items-center gap-3 p-3 bg-background rounded-lg border",
            "hover:bg-accent/50 transition-colors group",
            video.status === 'uploading' && "opacity-70",
            draggedOverIndex === index && "border-primary bg-accent",
            video.markedForDeletion && "opacity-50 bg-destructive/10"
          )}
        >
          {/* Drag Handle */}
          {isDraggable && (
            <div 
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
              draggable={video.status !== 'uploading'}
              onDragStart={(e) => handleDragStart(e, index, video.id)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
            >
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
          <div 
            className="flex-1 min-w-0"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (editingVideo !== video.id) {
                // Save any current edit before starting new one
                if (editingVideo && videoTitle.trim()) {
                  const currentVideo = videos.find(v => v.id === editingVideo)
                  if (currentVideo) {
                    trackPendingChange(editingVideo, videoTitle.trim())
                  }
                }
                
                // Check if this is a navigation click (cursor should be at end)
                const target = e.target as HTMLElement
                const currentTarget = e.currentTarget as HTMLElement
                
                // Check both target and currentTarget for the data attribute
                let cursorIntent = target.getAttribute('data-cursor-position') || 
                                 currentTarget.querySelector('[data-cursor-position]')?.getAttribute('data-cursor-position')
                
                let clickPosition: number | 'start' | 'end'
                if (cursorIntent === 'end') {
                  clickPosition = 'end'
                } else {
                  // Calculate cursor position from click
                  const displayName = getDisplayName(video)
                  clickPosition = calculateCursorPosition(e, displayName)
                }
                
                handleStartEdit(video, index, clickPosition)
              }
            }}
          >
            {editingVideo === video.id ? (
              <Input
                value={videoTitle || ''}
                onChange={(e) => {
                  const newValue = e.target.value
                  setVideoTitle(newValue)
                  
                  // Track pending changes for counter
                  trackPendingChange(video.id, newValue)
                }}
                onBlur={() => {
                  // Save changes on blur instead of canceling
                  if (videoTitle.trim()) {
                    handleSaveEdit(video.id)
                  } else {
                    handleCancelEdit()
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (videoTitle.trim()) {
                      handleSaveEdit(video.id, true)
                    } else {
                      handleCancelEdit()
                    }
                  } else if (e.key === 'Tab') {
                    e.preventDefault()
                    
                    // Always save current edit when tabbing
                    if (videoTitle.trim()) {
                      trackPendingChange(video.id, videoTitle.trim())
                    }
                    
                    // Exit edit mode
                    setEditingVideo(null)
                    setEditingIndex(null)
                    setVideoTitle('')
                    
                    // Navigate to next field
                    if (onTabNavigation) {
                      onTabNavigation(video.id, 'video', e.shiftKey ? 'previous' : 'next')
                    }
                  } else if (e.key === 'Escape') {
                    handleCancelEdit()
                  }
                }}
                className="h-7 text-sm"
                ref={(input) => {
                  if (input) {
                    input.focus()
                    // Set cursor position if we captured it from the click
                    if (cursorPosition !== null) {
                      setTimeout(() => {
                        input.setSelectionRange(cursorPosition, cursorPosition)
                        // Clear cursor position after setting it so it doesn't interfere with typing
                        setCursorPosition(null)
                      }, 0)
                    }
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="space-y-1">
                <p 
                  className={cn(
                    "text-sm font-medium cursor-pointer select-none hover:bg-slate-200 hover:text-slate-900 px-2 py-1 rounded border border-transparent hover:border-slate-400 transition-all",
                    video.markedForDeletion && "line-through"
                  )}
                  title="Click to edit filename"
                  data-video-edit={video.id}
                >
                  {getDisplayName(video)}
                </p>
                {video.status === 'uploading' && video.progress !== undefined && (
                  <div className="flex items-center gap-2">
                    <Progress value={video.progress} className="h-1 flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {video.progress}%
                    </span>
                  </div>
                )}
                {video.duration && video.status === 'complete' && video.duration !== '0:00' && (
                  <p className="text-xs text-muted-foreground">
                    Duration: {video.duration}
                  </p>
                )}
                
              </div>
            )}
          </div>

          {/* Status Indicator */}
          {video.markedForDeletion ? (
            <Badge variant="destructive">Marked for deletion</Badge>
          ) : (
            getStatusIndicator(video.status)
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
"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  GripVertical,
  Edit2,
  Trash2,
  Upload
} from "lucide-react"
import { cn } from "@/lib/utils"
import { VideoList } from "./VideoList"
import { VideoUploader } from "./VideoUploader"
import type { VideoUpload, Chapter } from "@/types/course"

interface ChapterManagerProps {
  chapters: Chapter[]
  onCreateChapter: (title: string) => void
  onUpdateChapter: (chapterId: string, updates: Partial<Chapter>) => void
  onDeleteChapter: (chapterId: string) => void
  onReorderChapters: (chapters: Chapter[]) => void
  onVideoUpload: (chapterId: string, files: FileList) => void
  onVideoRename: (videoId: string, newName: string) => void
  batchRenameMutation?: any // TanStack Query mutation
  onVideoDelete: (videoId: string) => void
  onVideoPreview?: (video: VideoUpload) => void
  onMoveVideo: (videoId: string, fromChapterId: string, toChapterId: string) => void
  onReorderVideosInChapter?: (chapterId: string, videos: VideoUpload[]) => void
  onPendingChangesUpdate?: (hasChanges: boolean, changeCount: number, saveFunction: () => void, isSaving?: boolean) => void
  onTabNavigation?: (currentId: string, currentType: 'chapter' | 'video', direction: 'next' | 'previous') => void
  className?: string
}

export function ChapterManager({
  chapters,
  onCreateChapter,
  onUpdateChapter,
  onDeleteChapter,
  onReorderChapters,
  onVideoUpload,
  onVideoRename,
  batchRenameMutation,
  onVideoDelete,
  onVideoPreview,
  onMoveVideo,
  onReorderVideosInChapter,
  onPendingChangesUpdate,
  onTabNavigation,
  className
}: ChapterManagerProps) {
  // Always expand all chapters - initialize with all chapter IDs
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(chapters.map(chapter => chapter.id))
  )

  // Update expanded chapters when new chapters are added
  useEffect(() => {
    setExpandedChapters(new Set(chapters.map(chapter => chapter.id)))
  }, [chapters])
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [chapterTitle, setChapterTitle] = useState("")
  const [draggedChapter, setDraggedChapter] = useState<string | null>(null)
  const [draggedVideo, setDraggedVideo] = useState<string | null>(null)
  const [dragOverChapter, setDragOverChapter] = useState<string | null>(null)

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev)
      if (next.has(chapterId)) {
        next.delete(chapterId)
      } else {
        next.add(chapterId)
      }
      return next
    })
  }

  const handleStartEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter.id)
    setChapterTitle(chapter.title)
  }

  const handleSaveChapterEdit = (chapterId: string) => {
    if (chapterTitle.trim()) {
      onUpdateChapter(chapterId, { title: chapterTitle.trim() })
    }
    setEditingChapter(null)
  }

  const handleChapterDragStart = (chapterId: string) => {
    setDraggedChapter(chapterId)
  }

  const handleChapterDrop = (targetChapterId: string) => {
    if (draggedChapter && draggedChapter !== targetChapterId) {
      const newChapters = [...chapters]
      const draggedIndex = newChapters.findIndex(c => c.id === draggedChapter)
      const targetIndex = newChapters.findIndex(c => c.id === targetChapterId)
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = newChapters.splice(draggedIndex, 1)
        newChapters.splice(targetIndex, 0, removed)
        onReorderChapters(newChapters)
      }
    }
    setDraggedChapter(null)
    setDragOverChapter(null)
  }

  const handleVideoDrop = (chapterId: string) => {
    if (draggedVideo) {
      // Find which chapter the video is currently in
      const fromChapter = chapters.find(ch => 
        ch.videos.some(v => v.id === draggedVideo)
      )
      if (fromChapter && fromChapter.id !== chapterId) {
        onMoveVideo(draggedVideo, fromChapter.id, chapterId)
      }
    }
    setDraggedVideo(null)
  }

  return (
    <div className={cn("space-y-4", className)}>

      {/* Chapters List */}
      <div className="space-y-3">
        {chapters.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No chapters yet</p>
              <Button
                className="mt-4"
                onClick={() => onCreateChapter("Chapter 1")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Chapter
              </Button>
            </CardContent>
          </Card>
        )}
        
        {chapters.length > 0 && (
          <>
            {chapters.map((chapter, index) => (
            <Card
              key={chapter.id}
              onDrop={() => handleChapterDrop(chapter.id)}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverChapter(chapter.id)
              }}
              onDragLeave={() => setDragOverChapter(null)}
              className={cn(
                "transition-colors",
                dragOverChapter === chapter.id && "border-primary bg-primary/5"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical 
                      className="h-4 w-4 text-muted-foreground cursor-move" 
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation()
                        handleChapterDragStart(chapter.id)
                      }}
                    />
                    
                    <button
                      onClick={() => toggleChapter(chapter.id)}
                      className="flex items-center gap-2 flex-1"
                    >
                      {expandedChapters.has(chapter.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      
                      {editingChapter === chapter.id ? (
                        <Input
                          value={chapterTitle}
                          onChange={(e) => setChapterTitle(e.target.value)}
                          onBlur={() => handleSaveChapterEdit(chapter.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveChapterEdit(chapter.id)
                            } else if (e.key === 'Escape') {
                              setEditingChapter(null)
                            }
                          }}
                          className="h-8 flex-1"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <h3 className="font-medium">
                          {index + 1}. {chapter.title}
                        </h3>
                      )}
                    </button>

                    <Badge variant="secondary">
                      {chapter.videos.length} videos
                    </Badge>
                    
                    {chapter.duration && (
                      <span className="text-sm text-muted-foreground">
                        {chapter.duration}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <VideoUploader
                      onFilesSelected={(files) => onVideoUpload(chapter.id, files)}
                      compact
                    />
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartEditChapter(chapter)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (chapter.videos.length > 0) {
                          if (confirm(`Delete "${chapter.title}"? ${chapter.videos.length} video(s) will be moved to the first available chapter.`)) {
                            onDeleteChapter(chapter.id)
                          }
                        } else {
                          onDeleteChapter(chapter.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedChapters.has(chapter.id) && (
                <CardContent
                  className={cn(
                    "pt-0",
                    chapter.videos.length === 0 && "min-h-[100px]"
                  )}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleVideoDrop(chapter.id)
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {chapter.videos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Drag videos here or use the upload button</p>
                    </div>
                  ) : (
                    <VideoList
                      videos={chapter.videos}
                      onVideoRename={onVideoRename}
                      batchRenameMutation={batchRenameMutation}
                      onVideoDelete={onVideoDelete}
                      onVideoPreview={onVideoPreview}
                      onVideoDragStart={setDraggedVideo}
                      onVideoDragEnd={() => setDraggedVideo(null)}
                      onVideoReorder={(reorderedVideos) => {
                        if (onReorderVideosInChapter) {
                          onReorderVideosInChapter(chapter.id, reorderedVideos)
                        }
                      }}
                      onPendingChangesUpdate={onPendingChangesUpdate}
                      onTabNavigation={onTabNavigation}
                    />
                  )}
                </CardContent>
              )}
            </Card>
          ))}
          
          {/* Add New Chapter Row */}
          <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
            <CardContent className="py-4">
              <button
                onClick={() => onCreateChapter(`Chapter ${chapters.length + 1}`)}
                className="flex items-center justify-center gap-2 w-full text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">Add Chapter</span>
              </button>
            </CardContent>
          </Card>
          </>
        )}
      </div>

    </div>
  )
}
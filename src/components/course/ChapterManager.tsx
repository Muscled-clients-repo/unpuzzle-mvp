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
  Trash2,
  Library,
  Upload
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { ChapterMediaList } from "./ChapterMediaList"
import { MediaSelector } from "../media/media-selector"
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { linkMediaToChapterAction } from '@/app/actions/chapter-media-actions'
import type { ChapterWithMedia } from "@/hooks/use-chapter-media-queries"
import type { MediaFile } from "@/hooks/use-media-queries"

interface ChapterManagerProps {
  chapters: ChapterWithMedia[]  // NEW: Use junction table data structure
  courseId: string
  onCreateChapter: (title: string) => void
  onUpdateChapter: (chapterId: string, updates: Partial<ChapterWithMedia>) => void
  onDeleteChapter: (chapterId: string) => void
  isDeletingChapter?: boolean
  deletingChapterIds?: Set<string>
  onReorderChapters: (chapters: ChapterWithMedia[]) => void
  // NEW: Media-specific handlers for junction table
  onMediaUnlink: (junctionId: string) => void
  onMediaPreview?: (media: any) => void
  onMediaReorder?: (chapterId: string, newOrder: Array<{ junctionId: string, newPosition: number }>) => void
  onMediaTitleUpdate?: (junctionId: string, customTitle: string) => void
  onPendingChangesUpdate?: (hasChanges: boolean, changeCount: number, saveFunction: () => void, isSaving?: boolean) => void
  className?: string
}

export function ChapterManager({
  chapters,
  courseId,
  onCreateChapter,
  onUpdateChapter,
  onDeleteChapter,
  isDeletingChapter,
  deletingChapterIds,
  onReorderChapters,
  onMediaUnlink,
  onMediaPreview,
  onMediaReorder,
  onMediaTitleUpdate,
  onPendingChangesUpdate,
  className
}: ChapterManagerProps) {
  // Safety check for undefined chapters
  if (!chapters) {
    console.warn('⚠️ ChapterManager: chapters prop is undefined')
    return <div>Loading chapters...</div>
  }

  // Zustand store for pending changes
  const ui = useCourseCreationUI()
  
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
  const [dragOverChapter, setDragOverChapter] = useState<string | null>(null)
  const [showMediaSelector, setShowMediaSelector] = useState<string | null>(null)
  const [linkingChapters, setLinkingChapters] = useState<Set<string>>(new Set())
  // Use parent-managed deletion state or fallback to internal state
  const [internalDeletingChapters, setInternalDeletingChapters] = useState<Set<string>>(new Set())
  const deletingChapters = deletingChapterIds || internalDeletingChapters
  const setDeletingChapters = deletingChapterIds ? () => {} : setInternalDeletingChapters

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

  const handleStartEditChapter = (chapter: ChapterWithMedia) => {
    setEditingChapter(chapter.id)
    // CONTROLLED INPUT FIX: Ensure chapterTitle is always a string
    setChapterTitle(ui.getChapterPendingChanges()[chapter.id] || chapter.title || '')
  }

  const handleSaveChapterEdit = (chapterId: string) => {
    const chapter = chapters.find(ch => ch.id === chapterId)
    if (chapter && chapterTitle.trim()) {
      const originalTitle = chapter.title
      
      if (chapterTitle.trim() === originalTitle) {
        // No change, remove any pending changes
        ui.removeContentPendingChange('chapters', chapterId)
      } else {
        // Only set pending change if actually different
        ui.setChapterPendingChange(chapterId, chapterTitle.trim())
      }
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


  const queryClient = useQueryClient()

  const handleMediaSelected = async (files: MediaFile[], chapterId: string) => {
    console.log(`🔗 [Phase 1] Linking ${files.length} media files to chapter ${chapterId} in course ${courseId}`)

    // Mark this chapter as linking
    setLinkingChapters(prev => new Set([...prev, chapterId]))

    try {
      // Phase 2: Link all selected media files in parallel for 4x speed improvement
      console.log(`🚀 [Phase 2] Starting parallel processing of ${files.length} files`)

      const linkingPromises = files.map(file =>
        linkMediaToChapterAction(file.id, chapterId).then(result => {
          console.log(`✅ [Phase 2] Parallel link successful for ${file.name}:`, result)
          return { file, result, success: true }
        }).catch(error => {
          console.error(`❌ [Phase 2] Parallel link failed for ${file.name}:`, error)
          toast.error(`Failed to link ${file.name}`)
          return { file, error, success: false }
        })
      )

      // Wait for all operations to complete (success or failure)
      const results = await Promise.all(linkingPromises)

      // Log summary
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      console.log(`📊 [Phase 2] Parallel processing complete: ${successful} successful, ${failed} failed out of ${files.length} total`)

      // If any successful, invalidate queries to refresh data
      if (successful > 0) {
        queryClient.invalidateQueries({ queryKey: ['course-with-media', courseId] })
        toast.success(`Successfully linked ${successful} media file${successful > 1 ? 's' : ''}`)
      }
    } finally {
      // Remove chapter from linking state
      setLinkingChapters(prev => {
        const newSet = new Set(prev)
        newSet.delete(chapterId)
        return newSet
      })
      setShowMediaSelector(null)
    }
  }

  // Chapter deletion handler - simplified when using parent-managed state
  const handleChapterDeletion = async (chapterId: string) => {
    console.log(`🗑️ [CHAPTER MANAGER] handleChapterDeletion called with:`, chapterId, 'type:', typeof chapterId)
    
    // If using internal state management, mark chapter as deleting
    if (!deletingChapterIds) {
      setDeletingChapters(prev => new Set([...prev, chapterId]))
    }
    
    try {
      // Call the parent's delete handler which should use TanStack mutation
      await onDeleteChapter(chapterId)
      console.log(`✅ Chapter ${chapterId} deletion initiated successfully`)
    } catch (error) {
      console.error(`❌ Error deleting chapter ${chapterId}:`, error)
      // Clear deletion state on immediate error (only if using internal state)
      if (!deletingChapterIds) {
        setDeletingChapters(prev => {
          const newSet = new Set(prev)
          newSet.delete(chapterId)
          return newSet
        })
      }
    }
  }

  // Cleanup internal deletion state when chapters are removed (only when using internal state)
  useEffect(() => {
    if (!deletingChapterIds && internalDeletingChapters.size > 0) {
      const chapterIds = new Set(chapters.map(ch => ch.id))
      
      setInternalDeletingChapters(prev => {
        const newSet = new Set(prev)
        let hasChanges = false
        
        // Remove any deletion states for chapters that no longer exist in data
        prev.forEach(chapterId => {
          if (!chapterIds.has(chapterId)) {
            newSet.delete(chapterId)
            hasChanges = true
            console.log(`🧹 [CHAPTER MANAGER] Clearing internal deletion state for removed chapter: ${chapterId}`)
          }
        })
        
        return hasChanges ? newSet : prev
      })
    }
  }, [chapters, deletingChapterIds, internalDeletingChapters])

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
            {chapters.map((chapter, index) => {
              const isPendingCreation = (chapter as any)._isPendingCreation
              const isBeingDeleted = deletingChapters.has(chapter.id) // Chapter-specific deletion state
              
              return (
            <Card
              key={chapter.id}
              onDrop={() => handleChapterDrop(chapter.id)}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverChapter(chapter.id)
              }}
              onDragLeave={() => setDragOverChapter(null)}
              className={cn(
                "transition-all duration-500",
                dragOverChapter === chapter.id && "border-primary bg-primary/5",
                isBeingDeleted && "opacity-50 scale-95 bg-red-50 border-red-200 animate-pulse"
                // Removed pending creation styling - new chapters look like normal chapters
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
                    
                    <div className="flex items-center gap-2 flex-1">
                      {/* Chevron for expand/collapse */}
                      <button
                        onClick={() => toggleChapter(chapter.id)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        {expandedChapters.has(chapter.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      
                      {/* Chapter title - clickable to edit */}
                      {editingChapter === chapter.id ? (
                        <Input
                          value={typeof chapterTitle === 'string' ? chapterTitle : ''}
                          onChange={(e) => {
                            const newTitle = e.target.value
                            setChapterTitle(newTitle || '')
                            
                            // Only set pending changes if value actually differs from original
                            const originalTitle = chapter.title
                            
                            if (newTitle.trim() === originalTitle) {
                              // No change, remove from pending changes
                              ui.removeContentPendingChange('chapters', chapter.id)
                            } else if (newTitle.trim() && newTitle.trim() !== originalTitle) {
                              // Only set pending change if actually different from original
                              ui.setChapterPendingChange(chapter.id, newTitle.trim())
                            }
                          }}
                          onBlur={(e) => {
                            // Only exit edit mode if blur is due to clicking elsewhere in the document
                            // Not due to application switching (Cmd+Tab)
                            setTimeout(() => {
                              if (document.activeElement && document.activeElement !== e.target) {
                                handleSaveChapterEdit(chapter.id)
                              }
                            }, 0)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveChapterEdit(chapter.id)
                            } else if (e.key === 'Escape') {
                              setEditingChapter(null)
                            }
                          }}
                          className="h-8 flex-1"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => handleStartEditChapter(chapter)}
                          className="text-left flex-1 hover:bg-primary/10 hover:text-primary px-2 py-1 rounded transition-colors"
                        >
                          <h3 className="font-medium">
                            {index + 1}. {ui.getChapterPendingChanges()[chapter.id] || chapter.title}
                            {ui.getChapterPendingChanges()[chapter.id] && (
                              <span className="ml-2 text-xs text-orange-500">●</span>
                            )}
                            {isBeingDeleted && (
                              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-md font-medium animate-pulse">
                                Unlinking videos...
                              </span>
                            )}
                          </h3>
                        </button>
                      )}
                    </div>

                    
                    {chapter.duration && (
                      <span className="text-sm text-muted-foreground">
                        {chapter.duration}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Direct upload removed - only media library import allowed */}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setShowMediaSelector(chapter.id)}
                      disabled={linkingChapters.has(chapter.id)}
                    >
                      {linkingChapters.has(chapter.id) ? (
                        <>
                          <div className="animate-spin h-3 w-3 mr-1 border border-current border-t-transparent rounded-full" />
                          Linking...
                        </>
                      ) : (
                        <>
                          <Library className="h-3 w-3 mr-1" />
                          Browse Library
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleChapterDeletion(chapter.id)}
                      disabled={isBeingDeleted}
                    >
                      {isBeingDeleted ? (
                        <div className="animate-spin h-4 w-4 border border-current border-t-transparent rounded-full" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedChapters.has(chapter.id) && (
                <CardContent
                  className={cn(
                    "pt-0",
                    (!chapter.media || chapter.media.length === 0) && "min-h-[100px]"
                  )}
                >
                  {(!chapter.media || chapter.media.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Add media from your library to this chapter</p>
                    </div>
                  ) : (
                    <ChapterMediaList
                      chapterId={chapter.id}
                      media={chapter.media || []}
                      onMediaUnlink={onMediaUnlink}
                      onMediaPreview={onMediaPreview}
                      onMediaReorder={(newOrder) => onMediaReorder?.(chapter.id, newOrder)}
                      onTitleUpdate={onMediaTitleUpdate}
                      onPendingChangesUpdate={onPendingChangesUpdate}
                    />
                  )}
                </CardContent>
              )}
            </Card>
              )
            })}
          
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

      {/* Phase 4A: MediaSelector Integration */}
      {showMediaSelector && (
        <MediaSelector
          isOpen={!!showMediaSelector}
          onClose={() => setShowMediaSelector(null)}
          onSelect={(selectedFiles) => handleMediaSelected(selectedFiles, showMediaSelector)}
          fileTypeFilter="video"
          allowMultiple={true}
          title="Select Videos from Library"
          isLinking={showMediaSelector ? linkingChapters.has(showMediaSelector) : false}
        />
      )}
    </div>
  )
}
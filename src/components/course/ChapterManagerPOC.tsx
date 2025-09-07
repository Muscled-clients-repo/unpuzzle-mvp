"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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

interface ChapterManagerPOCProps {
  chapters: Chapter[]
  onCreateChapter: (title: string) => void
  onUpdateChapter: (chapterId: string, updates: Partial<Chapter>) => void
  onDeleteChapter: (chapterId: string) => void
  onReorderChapters: (chapters: Chapter[]) => void
  onVideoUpload: (chapterId: string, files: FileList) => void
  onVideoRename: (videoId: string, newName: string) => void
  batchRenameMutation?: any // TanStack Query mutation for videos
  batchChapterUpdateMutation?: any // NEW: TanStack Query mutation for chapters
  onVideoDelete: (videoId: string) => void
  onVideoPreview?: (video: VideoUpload) => void
  onMoveVideo: (videoId: string, fromChapterId: string, toChapterId: string) => void
  onReorderVideosInChapter?: (chapterId: string, videos: VideoUpload[]) => void
  onPendingChangesUpdate?: (hasChanges: boolean, changeCount: number, saveFunction: () => void, isSaving?: boolean) => void
  onPendingChapterChangesUpdate?: (hasChanges: boolean, changeCount: number, saveFunction: () => void, isSaving?: boolean) => void
  onTabNavigation?: (currentId: string, currentType: 'chapter' | 'video', direction: 'next' | 'previous') => void
  className?: string
}

export function ChapterManagerPOC({
  chapters,
  onCreateChapter,
  onUpdateChapter,
  onDeleteChapter,
  onReorderChapters,
  onVideoUpload,
  onVideoRename,
  batchRenameMutation,
  batchChapterUpdateMutation,
  onVideoDelete,
  onVideoPreview,
  onMoveVideo,
  onReorderVideosInChapter,
  onPendingChangesUpdate,
  onPendingChapterChangesUpdate,
  onTabNavigation,
  className
}: ChapterManagerPOCProps) {
  
  // === PROVEN PATTERN: Chapter Editing State (copied from VideoList) ===
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [chapterTitle, setChapterTitle] = useState("")
  const [pendingChapterChanges, setPendingChapterChanges] = useState<Record<string, string>>({})
  const [hasSelectedText, setHasSelectedText] = useState(false)
  
  // Expanded state for chapters (POC: keep all expanded for simplicity)
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(chapters.map(c => c.id))
  )

  // === PROVEN PATTERN: Smart Display Name Resolution ===
  const getChapterDisplayName = (chapter: Chapter): string => {
    // 1. HIGHEST PRIORITY: Currently editing this chapter
    if (editingChapter === chapter.id && chapterTitle) {
      console.log(`🔍 [POC] Display name for ${chapter.id}: editing (${chapterTitle})`)
      return chapterTitle
    }
    
    // 2. HIGH PRIORITY: Pending changes (unsaved edits)
    if (pendingChapterChanges[chapter.id]) {
      console.log(`🔍 [POC] Display name for ${chapter.id}: pending (${pendingChapterChanges[chapter.id]})`)
      return pendingChapterChanges[chapter.id]
    }
    
    // 3. FALLBACK: Server/optimistic data
    const fallback = chapter.title || chapter.name || 'Untitled Chapter'
    console.log(`🔍 [POC] Display name for ${chapter.id}: server (${fallback})`, {
      title: chapter.title,
      name: chapter.name,
      fullChapter: chapter
    })
    return fallback
  }
  
  // === PROVEN PATTERN: Track Pending Changes ===
  const trackPendingChapterChange = (chapterId: string, newName: string) => {
    const chapter = chapters.find(c => c.id === chapterId)
    if (!chapter) return
    
    const currentName = chapter.title || chapter.name || 'Untitled Chapter'
    
    if (newName.trim() === currentName) {
      // No change, remove from pending
      setPendingChapterChanges(prev => {
        const next = { ...prev }
        delete next[chapterId]
        return next
      })
    } else {
      // Add to pending changes
      setPendingChapterChanges(prev => ({
        ...prev,
        [chapterId]: newName.trim()
      }))
    }
  }
  
  // === PROVEN PATTERN: Batch Save Function ===
  const saveAllChapterChanges = useCallback(async () => {
    console.log('🔍 [POC] saveAllChapterChanges called!', {
      hasMutation: !!batchChapterUpdateMutation,
      pendingChanges: pendingChapterChanges,
      editingChapter,
      chapterTitle
    })
    
    if (!batchChapterUpdateMutation) {
      console.log('⚠️ [POC] No batchChapterUpdateMutation available!')
      return
    }
    
    // Include any currently active edit
    let finalChanges = { ...pendingChapterChanges }
    
    // If user is currently editing, include that change
    if (editingChapter && chapterTitle.trim()) {
      const chapter = chapters.find(c => c.id === editingChapter)
      if (chapter) {
        const currentName = chapter.title || chapter.name || 'Untitled Chapter'
        console.log('🔍 [POC] Comparing names:', { current: currentName, new: chapterTitle.trim() })
        if (chapterTitle.trim() !== currentName) {
          finalChanges[editingChapter] = chapterTitle.trim()
          console.log('📝 [POC] Added active edit to changes:', finalChanges)
        }
      }
    }
    
    console.log('📊 [POC] Final changes to save:', finalChanges)
    
    if (Object.keys(finalChanges).length === 0) {
      console.log('⚠️ [POC] No changes to save!')
      return
    }
    
    // Convert to mutation format
    const updates = Object.entries(finalChanges).map(([id, name]) => ({
      id,
      title: name
    }))
    
    console.log('🚀 [POC] Saving chapter changes:', updates)
    
    // Use TanStack Query mutation (handles optimistic updates)
    batchChapterUpdateMutation.mutate(updates, {
      onSuccess: (result) => {
        console.log('✅ [POC] Chapter save success:', result)
        // Clear pending changes - optimistic updates will handle display
        setPendingChapterChanges({})
        if (editingChapter) {
          setEditingChapter(null)
          setChapterTitle('')
          setHasSelectedText(false)
        }
      },
      onError: (error) => {
        console.error('❌ [POC] Chapter save error:', error)
        // Keep pending changes on error so user doesn't lose work
      }
    })
  }, [batchChapterUpdateMutation, pendingChapterChanges, editingChapter, chapterTitle, chapters])
  
  // === PROVEN PATTERN: Start Edit Function ===
  const handleStartChapterEdit = (chapter: Chapter) => {
    const chapterName = getChapterDisplayName(chapter)
    setEditingChapter(chapter.id)
    setChapterTitle(chapterName)
    setHasSelectedText(false) // Reset flag so we can select text once
  }
  
  // === PROVEN PATTERN: Save/Cancel Edit ===
  const handleSaveChapterEdit = (chapterId: string) => {
    if (chapterTitle.trim()) {
      trackPendingChapterChange(chapterId, chapterTitle.trim())
    }
    setEditingChapter(null)
    setChapterTitle('')
    setHasSelectedText(false)
  }
  
  const handleCancelChapterEdit = () => {
    setEditingChapter(null)
    setChapterTitle('')
    setHasSelectedText(false)
  }

  // Update expanded state when chapters change
  useEffect(() => {
    setExpandedChapters(new Set(chapters.map(c => c.id)))
  }, [chapters])
  
  // Track previous values to prevent infinite loops
  const prevUpdateRef = useRef<{
    hasAnyChanges: boolean
    totalChanges: number
    isSaving: boolean
  }>({ hasAnyChanges: false, totalChanges: 0, isSaving: false })

  // === PROVEN PATTERN: Notify Parent of Pending Changes ===
  useEffect(() => {
    let totalChanges = Object.keys(pendingChapterChanges).length
    let hasAnyChanges = totalChanges > 0
    
    // Include currently active edit if it's different from original
    if (editingChapter && chapterTitle.trim()) {
      const chapter = chapters.find(c => c.id === editingChapter)
      if (chapter) {
        const currentName = chapter.title || chapter.name || 'Untitled Chapter'
        if (chapterTitle.trim() !== currentName && !pendingChapterChanges[editingChapter]) {
          totalChanges += 1
          hasAnyChanges = true
        }
      }
    }
    
    const isSaving = batchChapterUpdateMutation?.isPending || false
    
    // Only call callback if values actually changed
    const prev = prevUpdateRef.current
    if (prev.hasAnyChanges !== hasAnyChanges || prev.totalChanges !== totalChanges || prev.isSaving !== isSaving) {
      prevUpdateRef.current = { hasAnyChanges, totalChanges, isSaving }
      
      // Create a stable save function reference to avoid infinite loops
      const stableSaveFunction = () => saveAllChapterChanges()
      
      onPendingChapterChangesUpdate?.(hasAnyChanges, totalChanges, stableSaveFunction, isSaving)
    }
  }, [pendingChapterChanges, editingChapter, chapterTitle, chapters, onPendingChapterChangesUpdate, batchChapterUpdateMutation?.isPending])

  return (
    <div className={cn("space-y-4", className)}>
      {chapters.map((chapter, index) => (
        <Card key={chapter.id} className="bg-background">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {/* POC: DRAG HANDLE ONLY - not entire div */}
              <div 
                className="cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity"
                draggable
                title="Drag to reorder chapter"
                onClick={(e) => e.stopPropagation()} // Prevent chapter click
              >
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Expand/Collapse */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setExpandedChapters(prev => {
                    const next = new Set(prev)
                    if (next.has(chapter.id)) {
                      next.delete(chapter.id)
                    } else {
                      next.add(chapter.id)
                    }
                    return next
                  })
                }}
                className="p-1 h-6 w-6"
              >
                {expandedChapters.has(chapter.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>

              {/* Chapter Title - POC: EDITABLE */}
              <div className="flex-1 min-w-0">
                {editingChapter === chapter.id ? (
                  <Input
                    value={chapterTitle || ''}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setChapterTitle(newValue)
                      // Track pending changes for counter
                      trackPendingChapterChange(chapter.id, newValue)
                    }}
                    onBlur={() => {
                      if (chapterTitle.trim()) {
                        handleSaveChapterEdit(chapter.id)
                      } else {
                        handleCancelChapterEdit()
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (chapterTitle.trim()) {
                          handleSaveChapterEdit(chapter.id)
                        } else {
                          handleCancelChapterEdit()
                        }
                      } else if (e.key === 'Tab') {
                        e.preventDefault()
                        // Save current edit when tabbing
                        if (chapterTitle.trim()) {
                          trackPendingChapterChange(chapter.id, chapterTitle.trim())
                        }
                        // Exit edit mode
                        setEditingChapter(null)
                        setChapterTitle('')
                        setHasSelectedText(false)
                        // Navigate to next field
                        if (onTabNavigation) {
                          onTabNavigation(chapter.id, 'chapter', e.shiftKey ? 'previous' : 'next')
                        }
                      } else if (e.key === 'Escape') {
                        handleCancelChapterEdit()
                      }
                    }}
                    className="h-7 text-sm font-medium"
                    ref={(input) => {
                      if (input) {
                        input.focus()
                        // Only select all text once when starting to edit
                        if (!hasSelectedText) {
                          setTimeout(() => {
                            input.select()
                            setHasSelectedText(true)
                          }, 0)
                        }
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <h3 
                    className={cn(
                      "text-lg font-semibold cursor-pointer select-none hover:bg-slate-200 hover:text-slate-900 px-2 py-1 rounded border border-transparent hover:border-slate-400 transition-all",
                      pendingChapterChanges[chapter.id] && "text-orange-600 font-bold"
                    )}
                    onClick={() => handleStartChapterEdit(chapter)}
                    title="Click to edit chapter name"
                  >
                    {getChapterDisplayName(chapter)}
                  </h3>
                )}
              </div>

              {/* Chapter Info */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {chapter.videos?.length || 0} videos
                </Badge>
                
                {/* Chapter Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteChapter(chapter.id)}
                    className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    title="Delete chapter"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          {expandedChapters.has(chapter.id) && (
            <CardContent className="pt-0">
              {/* Video Upload */}
              <div className="mb-4">
                <VideoUploader
                  onFilesSelected={(files) => onVideoUpload(chapter.id, files)}
                  className="border-dashed"
                  compact={true}
                />
              </div>

              {/* Video List */}
              <VideoList
                videos={chapter.videos || []}
                onVideoRename={onVideoRename}
                onVideoDelete={onVideoDelete}
                onVideoPreview={onVideoPreview}
                batchRenameMutation={batchRenameMutation}
                onPendingChangesUpdate={onPendingChangesUpdate}
                onTabNavigation={onTabNavigation}
                className="space-y-2"
              />
            </CardContent>
          )}
        </Card>
      ))}

      {/* Add Chapter Button */}
      <Button
        variant="outline"
        onClick={() => onCreateChapter(`Chapter ${chapters.length + 1}`)}
        className="w-full border-dashed"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Chapter
      </Button>
    </div>
  )
}
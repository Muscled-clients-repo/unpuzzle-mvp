"use client"

import React, { useEffect } from 'react'
import { ChapterManager } from './ChapterManager'
import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { useChaptersEdit } from '@/hooks/use-chapter-queries'
import { useVideoBatchOperations, useVideoUpload, useVideoDelete } from '@/hooks/use-video-queries'
import type { Chapter } from '@/types/course'

interface EnhancedChapterManagerProps {
  courseId: string
  className?: string
  // ARCHITECTURE-COMPLIANT: No callback chains - parent reads TanStack state directly
}

/**
 * Enhanced Chapter Manager that integrates existing UI with new Zustand + TanStack architecture
 */
export function EnhancedChapterManager({ 
  courseId, 
  className 
}: EnhancedChapterManagerProps) {
  // New architecture hooks
  const ui = useCourseCreationUI()
  const { 
    chapters, 
    createChapter, 
    updateChapter, 
    deleteChapter, 
    reorderChapters,
    isCreating,
    isUpdating,
    isDeleting,
    isReordering
  } = useChaptersEdit(courseId)
  
  const { uploadVideo, uploadVideoAsync, isUploading } = useVideoUpload(courseId)
  const { batchUpdateVideos, isBatchUpdating } = useVideoBatchOperations(courseId)
  const { deleteVideo, isDeleting: isDeletingVideo } = useVideoDelete(courseId)
  
  // Sync chapters data to UI store for drag & drop state management (only run once per chapters change)
  useEffect(() => {
    if (chapters) {
      // Only update preferences for chapters that don't have an existing preference
      chapters.forEach(chapter => {
        if (ui.preferences.chapterExpanded[chapter.id] === undefined) {
          ui.updatePreference('chapterExpanded', {
            ...ui.preferences.chapterExpanded,
            [chapter.id]: true
          })
        }
      })
    }
  }, [chapters]) // Remove ui from dependencies to prevent infinite loop
  
  // Handler functions that integrate with our new architecture
  const handleCreateChapter = (title: string) => {
    createChapter(title)
  }
  
  const handleUpdateChapter = (chapterId: string, updates: Partial<Chapter>) => {
    updateChapter({ chapterId, updates })
  }
  
  const handleDeleteChapter = (chapterId: string) => {
    // Add to pending deletes in UI store for soft delete
    ui.markForDeletion(chapterId)
    
    // For now, immediately delete - could be changed to batch delete later
    deleteChapter(chapterId)
  }
  
  const handleReorderChapters = (newOrder: Chapter[]) => {
    reorderChapters(newOrder)
  }
  
  const handleVideoUpload = async (chapterId: string, files: FileList) => {
    const fileArray = Array.from(files)
    
    console.log('🎬 [ARCHITECTURE-COMPLIANT] Starting video upload via TanStack:', {
      chapterId,
      fileCount: fileArray.length,
      fileNames: fileArray.map(f => f.name)
    })
    
    // ARCHITECTURE-COMPLIANT: Upload progress managed by TanStack Query
    fileArray.forEach((file) => {
      const tempVideoId = `temp-video-${Date.now()}-${Math.random()}`
      
      uploadVideoAsync({
        file,
        chapterId,
        tempVideoId
      }).then((result) => {
        console.log('✅ [UPLOAD] Upload completed:', result)
      }).catch((error) => {
        console.error('❌ [UPLOAD] Upload failed:', error)
      })
    })
  }
  
  const handleVideoRename = (videoId: string, newName: string) => {
    // Use batch update for single video rename
    batchUpdateVideos({ 
      courseId, 
      updates: [{ id: videoId, title: newName }] 
    })
  }
  
  const handleVideoDelete = (videoId: string) => {
    // Add to pending deletes in UI store
    ui.markForDeletion(videoId)
    
    // For now, immediately delete - could be changed to batch delete later
    deleteVideo(videoId)
  }
  
  const handleMoveVideo = (videoId: string, fromChapterId: string, toChapterId: string) => {
    // Use batch update to move video between chapters
    batchUpdateVideos({ 
      courseId, 
      updates: [{ id: videoId, chapter_id: toChapterId, order: 0 }] 
    })
  }
  
  const handleVideoPreview = (video: any) => {
    // Open video preview modal via UI store
    ui.openModal('video-preview', video)
  }
  
  // ARCHITECTURE-COMPLIANT: Remove callback chains - parent reads TanStack state directly
  const handlePendingChangesUpdate = (
    hasChanges: boolean, 
    changeCount: number, 
    saveFunction: () => void, 
    isSaving?: boolean
  ) => {
    console.log('📝 [ARCHITECTURE-COMPLIANT] Video pending changes (local only):', { hasChanges, changeCount, isSaving })
    // No callback forwarding - parent component uses UI orchestration to read TanStack state
  }
  
  // CONSOLIDATED: Old save function approach removed - now using consolidated callbacks
  
  const handleTabNavigation = (
    currentId: string, 
    currentType: 'chapter' | 'video', 
    direction: 'next' | 'previous'
  ) => {
    // Tab navigation logic - could be enhanced with UI store
    console.log('Tab navigation:', { currentId, currentType, direction })
  }
  
  // Show loading state if data is not yet available
  if (!chapters) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 animate-pulse rounded" />
        <div className="h-32 bg-gray-200 animate-pulse rounded" />
        <div className="h-32 bg-gray-200 animate-pulse rounded" />
      </div>
    )
  }
  
  return (
    <ChapterManager
      chapters={chapters}
      onCreateChapter={handleCreateChapter}
      onUpdateChapter={handleUpdateChapter}
      onDeleteChapter={handleDeleteChapter}
      onReorderChapters={handleReorderChapters}
      onVideoUpload={handleVideoUpload}
      onVideoRename={handleVideoRename}
      batchRenameMutation={{
        mutate: (updates: Array<{ id: string, title?: string }>) => 
          batchUpdateVideos({ courseId, updates }),
        isPending: isBatchUpdating
      }}
      onVideoDelete={handleVideoDelete}
      onVideoPreview={handleVideoPreview}
      onMoveVideo={handleMoveVideo}
      onPendingChangesUpdate={handlePendingChangesUpdate}
      onTabNavigation={handleTabNavigation}
      className={className}
    />
  )
}
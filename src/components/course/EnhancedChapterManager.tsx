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
  onVideoSaveFunctionReady?: (saveFunction: () => void) => void
}

/**
 * Enhanced Chapter Manager that integrates existing UI with new Zustand + TanStack architecture
 */
export function EnhancedChapterManager({ courseId, className, onVideoSaveFunctionReady }: EnhancedChapterManagerProps) {
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
  
  const { uploadVideo, isUploading } = useVideoUpload(courseId)
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
    
    // Add uploads to UI store for progress tracking
    fileArray.forEach((file, index) => {
      const uploadId = `upload-${Date.now()}-${index}`
      ui.addUpload({
        id: uploadId,
        file,
        filename: file.name,
        chapterId,
        progress: 0,
        status: 'pending'
      })
      
      // Start upload with progress tracking
      uploadVideo({
        file,
        chapterId,
        onProgress: (progress) => {
          ui.updateUploadProgress(uploadId, progress)
        }
      }).then((result) => {
        if (result.success) {
          ui.updateUploadStatus(uploadId, 'complete')
        } else {
          ui.updateUploadStatus(uploadId, 'error', result.error)
        }
      }).catch((error) => {
        ui.updateUploadStatus(uploadId, 'error', error.message)
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
  
  // Track video save functions from all VideoList components
  const videoSaveFunctionsRef = React.useRef<Record<string, () => void>>({})
  
  // Pending changes tracking for save button activation
  const handlePendingChangesUpdate = (
    hasChanges: boolean, 
    changeCount: number, 
    saveFunction: () => void, 
    isSaving?: boolean
  ) => {
    // Store the save function for this chapter's videos
    // We'll identify by the first video ID in the videos being managed
    if (saveFunction) {
      videoSaveFunctionsRef.current['videos'] = saveFunction
    }
    
    // This could connect to parent component's save button logic
    console.log('📝 Video pending changes:', { hasChanges, changeCount, isSaving })
  }
  
  // Function to save all pending video changes across all chapters
  const saveAllVideoChanges = () => {
    console.log('💾 Saving all video changes...')
    Object.values(videoSaveFunctionsRef.current).forEach(saveFunction => {
      if (saveFunction) {
        saveFunction()
      }
    })
  }
  
  // Expose the save function to parent component
  React.useEffect(() => {
    if (onVideoSaveFunctionReady) {
      onVideoSaveFunctionReady(saveAllVideoChanges)
    }
  }, [onVideoSaveFunctionReady])
  
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
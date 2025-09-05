/**
 * Hook to handle video reordering with normalized state
 * This is the migration path from old to new state
 * It updates BOTH states during transition period
 */

import { useAppStore } from '@/stores/app-store'
import { useCallback } from 'react'
import { getAllVideosOrdered } from '@/stores/selectors/course-selectors'
import { VideoUpload } from '@/stores/slices/course-creation-slice'

// Feature flag to control which state to use
const USE_NORMALIZED_REORDER = process.env.NEXT_PUBLIC_USE_NORMALIZED_REORDER !== 'false'

export function useNormalizedVideoReorder() {
  const store = useAppStore()
  
  // Get both old and new functions
  const oldReorderFunction = store.reorderVideosInChapter
  const normalizedState = store.normalizedState
  const reorderVideoNormalized = store.reorderVideoNormalized
  const normalizeVideos = store.normalizeVideos
  
  /**
   * The new reorder function that uses normalized state
   * This is THE FIX for the reordering bug!
   */
  const handleReorderWithNormalized = useCallback((chapterId: string, videos: VideoUpload[]) => {
    
    // First, sync videos to normalized state if they don't exist
    const existingVideos = getAllVideosOrdered(normalizedState)
    const needsSync = videos.some(v => !normalizedState.videos[v.id])
    
    if (needsSync) {
      normalizeVideos(videos)
    }
    
    // Update each video's order in normalized state
    // THIS IS THE KEY: Just update the order field, no array manipulation!
    videos.forEach((video, index) => {
      const newOrder = index // Simple: position in array becomes the order
      
      reorderVideoNormalized({
        videoId: video.id,
        newOrder: newOrder,
        chapterId: chapterId,
      })
    })
    
    // IMPORTANT: Create a new array with updated order values for the old state
    // The old function needs videos with correct order field values
    const videosWithUpdatedOrder = videos.map((video, index) => ({
      ...video,
      order: index // Update order to match position
    }))
    
    // IMPORTANT: Also update old state during transition so UI updates!
    // This keeps both states in sync until we fully migrate the UI
    oldReorderFunction(chapterId, videosWithUpdatedOrder)
    
  }, [normalizedState, reorderVideoNormalized, normalizeVideos, oldReorderFunction])
  
  /**
   * The wrapper function that decides which implementation to use
   * This allows gradual migration with a feature flag
   */
  const reorderVideosInChapter = useCallback((chapterId: string, videos: VideoUpload[]) => {
    if (USE_NORMALIZED_REORDER) {
      handleReorderWithNormalized(chapterId, videos)
    } else {
      oldReorderFunction(chapterId, videos)
    }
  }, [handleReorderWithNormalized, oldReorderFunction])
  
  /**
   * Get videos in order from normalized state
   * This always returns correctly ordered videos
   */
  const getOrderedVideos = useCallback(() => {
    if (USE_NORMALIZED_REORDER && Object.keys(normalizedState.videos).length > 0) {
      return getAllVideosOrdered(normalizedState)
    }
    // Fallback to old state
    return store.courseCreation?.videos || []
  }, [normalizedState, store.courseCreation])
  
  return {
    reorderVideosInChapter,
    getOrderedVideos,
    isUsingNormalized: USE_NORMALIZED_REORDER,
  }
}

/**
 * Hook to migrate existing course data to normalized state
 * Use this when loading a course for editing
 */
export function useMigrateCourseToNormalized() {
  const store = useAppStore()
  const { normalizeVideos, normalizeChapters, setNormalizedCourse } = store
  
  const migrateCourse = useCallback((course: any) => {
    
    if (!course) return
    
    // Migrate the course itself
    setNormalizedCourse(course)
    
    // Migrate chapters
    if (course.chapters && Array.isArray(course.chapters)) {
      normalizeChapters(course.chapters)
      
      // Migrate videos from each chapter
      course.chapters.forEach((chapter: any) => {
        if (chapter.videos && Array.isArray(chapter.videos)) {
          normalizeVideos(chapter.videos)
        }
      })
    }
    
    // IMPORTANT: Also migrate the main videos array!
    // This is what saveDraft uses
    if (course.videos && Array.isArray(course.videos)) {
      normalizeVideos(course.videos)
    }
    
  }, [normalizeVideos, normalizeChapters, setNormalizedCourse])
  
  return { migrateCourse }
}
/**
 * Selectors for normalized course state
 * These transform normalized data into UI-friendly shapes
 * Provides compatibility layer during migration
 */

import {
  NormalizedState,
  NormalizedVideo,
  NormalizedChapter,
  NormalizedCourse,
  ChapterWithVideos,
  CourseWithChapters,
} from '@/types/normalized'

/**
 * Get a single video by ID
 */
export function getVideoById(
  state: NormalizedState,
  videoId: string
): NormalizedVideo | null {
  return state.videos[videoId] || null
}

/**
 * Get all videos for a specific chapter, sorted by order
 */
export function getVideosForChapter(
  state: NormalizedState,
  chapterId: string
): NormalizedVideo[] {
  const chapter = state.chapters[chapterId]
  if (!chapter) return []
  
  return chapter.videoIds
    .map(id => state.videos[id])
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
}

/**
 * Get chapter with populated videos (denormalized view)
 * This matches the old state structure for UI compatibility
 */
export function getChapterWithVideos(
  state: NormalizedState,
  chapterId: string
): ChapterWithVideos | null {
  const chapter = state.chapters[chapterId]
  if (!chapter) return null
  
  // Reconstruct old format from normalized
  const videos = chapter.videoIds
    .map(id => state.videos[id])
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
  
  return {
    ...chapter,
    videos,
  }
}

/**
 * Get all videos across all chapters, sorted by order
 * FIXES THE REORDERING BUG - single source of truth!
 */
export function getAllVideosOrdered(state: NormalizedState): NormalizedVideo[] {
  // Single source of truth: the 'order' field on each video
  // No array positions to maintain!
  return Object.values(state.videos)
    .sort((a, b) => a.order - b.order)
}

/**
 * Get all videos for a specific course
 */
export function getVideosForCourse(
  state: NormalizedState,
  courseId: string
): NormalizedVideo[] {
  return Object.values(state.videos)
    .filter(video => video.courseId === courseId)
    .sort((a, b) => a.order - b.order)
}

/**
 * Get all chapters for a course, sorted by order
 */
export function getChaptersForCourse(
  state: NormalizedState,
  courseId: string
): NormalizedChapter[] {
  return Object.values(state.chapters)
    .filter(chapter => chapter.courseId === courseId)
    .sort((a, b) => a.order - b.order)
}

/**
 * Get course with fully populated chapters and videos (denormalized)
 * This provides the complete nested structure for UI
 */
export function getCourseWithChapters(
  state: NormalizedState,
  courseId: string
): CourseWithChapters | null {
  const course = state.courses[courseId]
  if (!course) return null
  
  const chapters = course.chapterIds
    .map(chapterId => getChapterWithVideos(state, chapterId))
    .filter(Boolean) as ChapterWithVideos[]
  
  return {
    ...course,
    chapters,
  }
}

/**
 * Get the active course with all nested data
 */
export function getActiveCourse(state: NormalizedState): CourseWithChapters | null {
  if (!state.activeCourseId) return null
  return getCourseWithChapters(state, state.activeCourseId)
}

/**
 * Check if a video exists
 */
export function hasVideo(state: NormalizedState, videoId: string): boolean {
  return !!state.videos[videoId]
}

/**
 * Get video count for a chapter
 */
export function getVideoCount(state: NormalizedState, chapterId: string): number {
  const chapter = state.chapters[chapterId]
  return chapter ? chapter.videoIds.length : 0
}

/**
 * Get total video count for a course
 */
export function getTotalVideoCount(state: NormalizedState, courseId: string): number {
  return Object.values(state.videos)
    .filter(video => video.courseId === courseId)
    .length
}

/**
 * Get videos by status
 */
export function getVideosByStatus(
  state: NormalizedState,
  status: NormalizedVideo['status']
): NormalizedVideo[] {
  return Object.values(state.videos)
    .filter(video => video.status === status)
    .sort((a, b) => a.order - b.order)
}

/**
 * Get uploading videos (for progress tracking)
 */
export function getUploadingVideos(state: NormalizedState): NormalizedVideo[] {
  return Object.values(state.videos)
    .filter(video => video.status === 'uploading' || video.status === 'processing')
    .sort((a, b) => a.order - b.order)
}

/**
 * Convert old state format to normalized (for migration)
 * Use this when migrating existing data
 */
export function normalizeOldCourseData(oldCourse: any): {
  course: NormalizedCourse
  chapters: Record<string, NormalizedChapter>
  videos: Record<string, NormalizedVideo>
} {
  const videos: Record<string, NormalizedVideo> = {}
  const chapters: Record<string, NormalizedChapter> = {}
  
  // Process chapters and videos
  const chapterIds: string[] = []
  
  if (oldCourse.chapters && Array.isArray(oldCourse.chapters)) {
    oldCourse.chapters.forEach((oldChapter: any, chapterIndex: number) => {
      const chapterId = oldChapter.id || `chapter-${chapterIndex}`
      chapterIds.push(chapterId)
      
      const videoIds: string[] = []
      
      if (oldChapter.videos && Array.isArray(oldChapter.videos)) {
        oldChapter.videos.forEach((oldVideo: any, videoIndex: number) => {
          const videoId = oldVideo.id || `video-${chapterIndex}-${videoIndex}`
          videoIds.push(videoId)
          
          videos[videoId] = {
            id: videoId,
            title: oldVideo.title || oldVideo.name || '',
            url: oldVideo.url,
            thumbnailUrl: oldVideo.thumbnailUrl,
            duration: oldVideo.duration,
            order: oldVideo.order ?? videoIndex,
            chapterId: chapterId,
            courseId: oldCourse.id || '',
            status: oldVideo.status || 'pending',
            uploadProgress: oldVideo.progress,
            error: oldVideo.error,
            backblazeFileId: oldVideo.backblazeFileId,
            filename: oldVideo.filename,
            fileSize: oldVideo.fileSize || oldVideo.size,
            uploadedAt: oldVideo.uploadedAt,
            createdAt: oldVideo.createdAt,
            updatedAt: oldVideo.updatedAt,
          }
        })
      }
      
      chapters[chapterId] = {
        id: chapterId,
        title: oldChapter.title || '',
        description: oldChapter.description,
        courseId: oldCourse.id || '',
        videoIds,
        order: oldChapter.order ?? chapterIndex,
        createdAt: oldChapter.createdAt,
        updatedAt: oldChapter.updatedAt,
      }
    })
  }
  
  // Create normalized course
  const course: NormalizedCourse = {
    id: oldCourse.id || crypto.randomUUID(),
    title: oldCourse.title || '',
    description: oldCourse.description,
    instructorId: oldCourse.instructorId || '',
    chapterIds,
    status: oldCourse.status || 'draft',
    thumbnailUrl: oldCourse.thumbnailUrl,
    price: oldCourse.price,
    currency: oldCourse.currency,
    category: oldCourse.category,
    level: oldCourse.level,
    tags: oldCourse.tags,
    studentsCount: oldCourse.studentsCount || 0,
    completionRate: oldCourse.completionRate || 0,
    rating: oldCourse.rating,
    createdAt: oldCourse.createdAt,
    updatedAt: oldCourse.updatedAt,
    publishedAt: oldCourse.publishedAt,
  }
  
  return { course, chapters, videos }
}

/**
 * Check if normalized state has data
 */
export function hasNormalizedData(state: NormalizedState): boolean {
  return Object.keys(state.videos).length > 0 || 
         Object.keys(state.chapters).length > 0 || 
         Object.keys(state.courses).length > 0
}

/**
 * Get videos that need reordering (helper for migration)
 */
export function getVideosNeedingReorder(
  state: NormalizedState,
  chapterId: string
): NormalizedVideo[] {
  const videos = getVideosForChapter(state, chapterId)
  
  // Check if any videos have duplicate order values
  const orderValues = videos.map(v => v.order)
  const hasDuplicates = orderValues.length !== new Set(orderValues).size
  
  if (hasDuplicates) {
    // Return videos with suggested new order values
    return videos.map((video, index) => ({
      ...video,
      order: index // Suggested new order
    }))
  }
  
  return []
}
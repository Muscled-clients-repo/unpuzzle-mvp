'use server'

import { createClient } from '@/lib/supabase/server'
import type { Chapter, ChapterVideo, MediaFile } from '@/types/course'

export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface CourseWithContent {
  id: string
  title: string
  description: string
  thumbnail_url?: string
  instructor_id: string
  chapters: Chapter[]
  total_videos: number
  total_duration_minutes: number
}

/**
 * Get course with chapters and videos using JSONB architecture
 * Single query approach with JSONB processing
 */
export async function getCourseWithChaptersAndVideos(courseId: string): Promise<ActionResult<CourseWithContent>> {
  try {
    console.log('🟡 [JSONB] Starting getCourseWithChaptersAndVideos for courseId:', courseId)
    const startTime = Date.now()
    const supabase = await createClient()

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, description, thumbnail_url, instructor_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      console.error('🔴 [JSONB] Course query error:', courseError)
      return {
        success: false,
        error: courseError ? `Course error: ${courseError.message}` : 'Course not found'
      }
    }

    console.log('✅ [JSONB] Course found:', course.title)

    // Get chapters with JSONB videos
    console.log('🟡 [JSONB] Querying course_chapters for courseId:', courseId)
    const { data: chapters, error: chaptersError } = await supabase
      .from('course_chapters')
      .select('*')
      .eq('course_id', courseId)
      .order('order')

    if (chaptersError) {
      console.error('🔴 [JSONB] Chapters query error:', chaptersError)
      return {
        success: false,
        error: `Failed to fetch course chapters: ${chaptersError.message}`
      }
    }

    console.log('✅ [JSONB] Chapters query result:', { count: chapters?.length || 0, chapters: chapters?.map(c => ({ id: c.id, title: c.title, videos: c.videos })) })

    if (!chapters || chapters.length === 0) {
      console.log('🟡 [JSONB] No chapters found, returning empty course')
      return {
        success: true,
        data: {
          ...course,
          chapters: [],
          total_videos: 0,
          total_duration_minutes: 0
        }
      }
    }

    // Extract all media file IDs from JSONB arrays (handle null/empty cases)
    const mediaFileIds = chapters
      .flatMap(chapter => {
        const videos = chapter.videos || []
        // Handle case where videos might be null or not an array
        if (!Array.isArray(videos)) return []
        return videos.map((v: ChapterVideo) => v.media_file_id)
      })
      .filter(Boolean)

    if (mediaFileIds.length === 0) {
      return {
        success: true,
        data: {
          ...course,
          chapters: chapters.map(chapter => ({
            ...chapter,
            videos: [],
            videoCount: 0,
            totalDuration: 0
          })),
          total_videos: 0,
          total_duration_minutes: 0
        }
      }
    }

    // Get media file details in single query
    const { data: mediaFiles, error: mediaError } = await supabase
      .from('media_files')
      .select('*')
      .in('id', mediaFileIds)

    if (mediaError) {
      return {
        success: false,
        error: 'Failed to fetch media files'
      }
    }

    // Create media file lookup map
    const mediaFileMap = new Map<string, MediaFile>()
    mediaFiles?.forEach(file => {
      mediaFileMap.set(file.id, file)
    })

    // Process chapters and combine with media file data
    const processedChapters: Chapter[] = chapters.map(chapter => {
      const chapterVideos: ChapterVideo[] = (chapter.videos || [])
        .map((video: ChapterVideo) => ({
          ...video,
          mediaFile: mediaFileMap.get(video.media_file_id)
        }))
        .filter(video => video.mediaFile) // Only include videos with valid media files
        .sort((a, b) => a.order - b.order)

      const totalDuration = chapterVideos.reduce(
        (sum, video) => sum + (video.mediaFile?.duration_seconds || 0),
        0
      )

      return {
        ...chapter,
        videos: chapterVideos,
        videoCount: chapterVideos.length,
        totalDuration: Math.round(totalDuration / 60) // Convert to minutes
      }
    })

    // Calculate totals
    const totalVideos = processedChapters.reduce((sum, chapter) => sum + chapter.videoCount, 0)
    const totalDurationMinutes = processedChapters.reduce((sum, chapter) => sum + (chapter.totalDuration || 0), 0)

    const result = {
      success: true,
      data: {
        ...course,
        chapters: processedChapters,
        total_videos: totalVideos,
        total_duration_minutes: totalDurationMinutes
      }
    }

    const duration = Date.now() - startTime
    console.log(`✅ [JSONB] getCourseWithChaptersAndVideos completed in ${duration}ms:`, {
      courseTitle: course.title,
      chaptersCount: processedChapters.length,
      totalVideos,
      totalDurationMinutes
    })

    return result
  } catch (error) {
    console.error('🔴 [JSONB] FATAL ERROR in getCourseWithChaptersAndVideos:', error)
    console.error('🔴 [JSONB] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch course content'
    }
  }
}

/**
 * Get video by position in chapter using JSONB architecture
 * Uses chapter_id + video_order instead of video_id
 */
export async function getVideoByPosition(
  courseId: string,
  chapterId: string,
  videoOrder: number
): Promise<ActionResult<ChapterVideo & { mediaFile: MediaFile }>> {
  try {
    const supabase = await createClient()

    // Get chapter with videos
    const { data: chapter, error: chapterError } = await supabase
      .from('course_chapters')
      .select('videos, course_id')
      .eq('id', chapterId)
      .eq('course_id', courseId)
      .single()

    if (chapterError || !chapter) {
      return {
        success: false,
        error: 'Chapter not found'
      }
    }

    const videos: ChapterVideo[] = chapter.videos || []
    const video = videos.find(v => v.order === videoOrder)

    if (!video) {
      return {
        success: false,
        error: 'Video not found at the specified position'
      }
    }

    // Get media file details
    const { data: mediaFile, error: mediaError } = await supabase
      .from('media_files')
      .select('*')
      .eq('id', video.media_file_id)
      .single()

    if (mediaError || !mediaFile) {
      return {
        success: false,
        error: 'Media file not found'
      }
    }

    return {
      success: true,
      data: {
        ...video,
        mediaFile
      }
    }
  } catch (error) {
    console.error('Get video by position error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch video'
    }
  }
}

/**
 * Get next video for course progression using JSONB architecture
 */
export async function getNextVideoForCourse(courseId: string): Promise<ActionResult<{
  chapterId: string
  videoOrder: number
  title: string
  mediaFileId: string
}>> {
  try {
    const supabase = await createClient()

    // Get all chapters with videos for the course
    const { data: chapters, error: chaptersError } = await supabase
      .from('course_chapters')
      .select('id, videos')
      .eq('course_id', courseId)
      .order('chapter_order')

    if (chaptersError || !chapters) {
      return {
        success: false,
        error: 'Failed to fetch course chapters'
      }
    }

    // Find first video in first chapter (simple progression logic)
    for (const chapter of chapters) {
      const videos: ChapterVideo[] = chapter.videos || []
      if (videos.length > 0) {
        const firstVideo = videos.sort((a, b) => a.order - b.order)[0]

        return {
          success: true,
          data: {
            chapterId: chapter.id,
            videoOrder: firstVideo.order,
            title: firstVideo.title,
            mediaFileId: firstVideo.media_file_id
          }
        }
      }
    }

    return {
      success: false,
      error: 'No videos found in course'
    }
  } catch (error) {
    console.error('Get next video error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get next video'
    }
  }
}

/**
 * Get video navigation context (previous/next videos) using JSONB architecture
 */
export async function getVideoNavigation(
  courseId: string,
  chapterId: string,
  currentVideoOrder: number
): Promise<ActionResult<{
  previousVideo?: { chapterId: string; videoOrder: number; title: string }
  nextVideo?: { chapterId: string; videoOrder: number; title: string }
  currentChapterTitle: string
}>> {
  try {
    const supabase = await createClient()

    // Get all chapters with videos for navigation
    const { data: chapters, error: chaptersError } = await supabase
      .from('course_chapters')
      .select('id, title, videos')
      .eq('course_id', courseId)
      .order('chapter_order')

    if (chaptersError || !chapters) {
      return {
        success: false,
        error: 'Failed to fetch chapters for navigation'
      }
    }

    const currentChapter = chapters.find(c => c.id === chapterId)
    if (!currentChapter) {
      return {
        success: false,
        error: 'Current chapter not found'
      }
    }

    const currentChapterVideos: ChapterVideo[] = (currentChapter.videos || [])
      .sort((a, b) => a.order - b.order)

    let previousVideo, nextVideo

    // Find previous video (within chapter or previous chapter)
    const currentVideoIndex = currentChapterVideos.findIndex(v => v.order === currentVideoOrder)

    if (currentVideoIndex > 0) {
      // Previous video in same chapter
      const prevVideo = currentChapterVideos[currentVideoIndex - 1]
      previousVideo = {
        chapterId,
        videoOrder: prevVideo.order,
        title: prevVideo.title
      }
    } else {
      // Look in previous chapter
      const currentChapterIndex = chapters.findIndex(c => c.id === chapterId)
      if (currentChapterIndex > 0) {
        const prevChapter = chapters[currentChapterIndex - 1]
        const prevChapterVideos: ChapterVideo[] = (prevChapter.videos || [])
          .sort((a, b) => a.order - b.order)

        if (prevChapterVideos.length > 0) {
          const lastVideo = prevChapterVideos[prevChapterVideos.length - 1]
          previousVideo = {
            chapterId: prevChapter.id,
            videoOrder: lastVideo.order,
            title: lastVideo.title
          }
        }
      }
    }

    // Find next video (within chapter or next chapter)
    if (currentVideoIndex < currentChapterVideos.length - 1) {
      // Next video in same chapter
      const nextVid = currentChapterVideos[currentVideoIndex + 1]
      nextVideo = {
        chapterId,
        videoOrder: nextVid.order,
        title: nextVid.title
      }
    } else {
      // Look in next chapter
      const currentChapterIndex = chapters.findIndex(c => c.id === chapterId)
      if (currentChapterIndex < chapters.length - 1) {
        const nextChapter = chapters[currentChapterIndex + 1]
        const nextChapterVideos: ChapterVideo[] = (nextChapter.videos || [])
          .sort((a, b) => a.order - b.order)

        if (nextChapterVideos.length > 0) {
          const firstVideo = nextChapterVideos[0]
          nextVideo = {
            chapterId: nextChapter.id,
            videoOrder: firstVideo.order,
            title: firstVideo.title
          }
        }
      }
    }

    return {
      success: true,
      data: {
        previousVideo,
        nextVideo,
        currentChapterTitle: currentChapter.title
      }
    }
  } catch (error) {
    console.error('Get video navigation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get video navigation'
    }
  }
}
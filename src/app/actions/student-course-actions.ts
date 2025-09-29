'use server'

import { createClient } from '@/lib/supabase/server'
import type { Course, CourseProgress } from '@/types/domain'
import { broadcastWebSocketMessage } from '@/lib/websocket-operations'

/**
 * Get accessible courses for a student based on goal matching (community model)
 * Enhanced version of getUserCoursesAction with video relationships
 */
export async function getEnrolledCourses(): Promise<Course[]> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    console.log('[Server Action] Fetching accessible courses for user:', user.id)

    // First check if user has a goal assigned
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_goal_id')
      .eq('id', user.id)
      .single()

    console.log('[Server Action] User profile:', profile)

    if (!profile?.current_goal_id) {
      console.log('[Server Action] User has no goal assigned - cannot access courses')
      return []
    }

    console.log('[Server Action] User has goal:', profile.current_goal_id)

    // Use the existing get_user_courses function which already filters by goals
    const { data: courses, error } = await supabase
      .rpc('get_user_courses', { user_id: user.id })

    console.log('[Server Action] RPC get_user_courses result:', { courses, error })

    if (error) {
      console.error('[Server Action] Error fetching goal-based courses:', error)
      return []
    }

    if (!courses || courses.length === 0) {
      console.log('[Server Action] No accessible courses found for user')

      // Debug: Check if there are any course_goal_assignments for this goal
      const { data: assignments } = await supabase
        .from('course_goal_assignments')
        .select('*')
        .eq('goal_id', profile.current_goal_id)

      console.log('[Server Action] Course assignments for goal:', assignments)
      return []
    }

    // Transform to Course format with videos
    const enhancedCourses: Course[] = []

    for (const courseData of courses) {
      // Get media files for this course via junction table (new architecture)
      const { data: chapters } = await supabase
        .from('course_chapters')
        .select(`
          id,
          title,
          order_position,
          course_chapter_media (
            id,
            order_in_chapter,
            title,
            media_files (
              id,
              name,
              file_type,
              file_size,
              duration_seconds,
              cdn_url,
              thumbnail_url
            )
          )
        `)
        .eq('course_id', courseData.id)
        .order('order_position', { ascending: true })

      console.log('[Server Action] Found chapters for course:', { courseId: courseData.id, chapterCount: chapters?.length || 0 })

      // Transform junction table data to video format for compatibility
      const transformedVideos: any[] = []
      let globalIndex = 0

      for (const chapter of chapters || []) {
        const sortedMedia = (chapter.course_chapter_media || [])
          .sort((a, b) => a.order_in_chapter - b.order_in_chapter)

        for (const mediaItem of sortedMedia) {
          if (mediaItem.media_files) {
            transformedVideos.push({
              id: mediaItem.media_files.id,
              courseId: courseData.id,
              title: mediaItem.title || mediaItem.media_files.name,
              description: '',
              duration: mediaItem.media_files.duration_seconds || 600,
              order: globalIndex + 1,
              videoUrl: mediaItem.media_files.cdn_url, // CDN URL for new architecture
              thumbnailUrl: mediaItem.media_files.thumbnail_url,
              transcript: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            globalIndex++
          }
        }
      }

      const course: Course = {
        id: courseData.id,
        title: courseData.title,
        description: courseData.description,
        thumbnailUrl: courseData.thumbnail_url,
        instructor: {
          id: courseData.instructor_id || '',
          name: 'Instructor',
          email: 'instructor@example.com',
          avatar: ''
        },
        price: courseData.price || 0,
        duration: courseData.total_duration_minutes || 0,
        difficulty: courseData.difficulty || 'beginner',
        videos: transformedVideos,
        tags: [],
        enrollmentCount: 0,
        rating: 4.5,
        isPublished: true,
        isFree: courseData.price === 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      enhancedCourses.push(course)
    }

    console.log('[Server Action] Found accessible courses:', enhancedCourses.length)
    return enhancedCourses

  } catch (error) {
    console.error('[Server Action] Failed to get enrolled courses:', error)
    return []
  }
}

/**
 * Get enhanced course progress for a student with better calculation
 */
export async function getCourseProgress(courseId: string): Promise<CourseProgress | null> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    console.log('[Server Action] Getting course progress for:', { userId: user.id, courseId })

    // Check if user has access to this course through goals
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_goal_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_goal_id) {
      console.log('[Server Action] User has no goal assigned')
      return null
    }

    // Verify course is accessible through user's goal
    const { data: courseAccess } = await supabase
      .from('course_goal_assignments')
      .select('course_id')
      .eq('goal_id', profile.current_goal_id)
      .eq('course_id', courseId)
      .single()

    if (!courseAccess) {
      console.log('[Server Action] User does not have access to course:', courseId)
      return null
    }

    // Get total videos in course for accurate calculation
    const { data: totalVideos, error: videosError } = await supabase
      .from('videos')
      .select('id, duration_seconds')
      .eq('course_id', courseId)

    if (videosError) {
      console.error('[Server Action] Error fetching course videos:', videosError)
    }

    const totalVideoCount = totalVideos?.length || 0
    const totalDurationMinutes = totalVideos?.reduce((sum, video) => sum + (video.duration_seconds || 600), 0) / 60 || 0

    // Skip video progress for now - focus on basic functionality
    const completedLessons = 0
    const lessonsWithProgress = 0

    // Calculate weighted progress based on video completion and watch time
    let weightedProgress = 0
    if (totalVideoCount > 0) {
      weightedProgress = Math.round((completedLessons / totalVideoCount) * 100)
    }

    // More accurate time estimation
    const avgVideoLength = totalDurationMinutes / Math.max(totalVideoCount, 1)
    const remainingVideos = totalVideoCount - completedLessons
    const estimatedTimeRemaining = remainingVideos > 0
      ? `${Math.round(remainingVideos * avgVideoLength)} min`
      : '0 min'

    // Get most recent activity
    const lastActivityDate = new Date().toISOString()

    const progress: CourseProgress = {
      courseId,
      progressPercentage: weightedProgress,
      completedLessons,
      totalLessons: totalVideoCount,
      lastAccessedAt: lastActivityDate,
      estimatedTimeRemaining,
      // Additional metadata for enhanced tracking
      lessonsInProgress: lessonsWithProgress - completedLessons,
      totalDurationMinutes: Math.round(totalDurationMinutes)
    }

    console.log('[Server Action] Enhanced course progress:', progress)
    return progress

  } catch (error) {
    console.error('[Server Action] Failed to get course progress:', error)
    return null
  }
}

// Note: Enrollment system removed - access is now based on goal matching

/**
 * Get next video for a student in a course with smart resume logic (Phase 2 enhancement)
 */
export async function getNextVideoForCourse(courseId: string): Promise<{
  videoId: string;
  title: string;
  resumeTimestamp?: number;
  isResuming?: boolean;
  completionStatus?: 'not_started' | 'in_progress' | 'completed';
} | null> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    console.log('[Server Action] Getting next video for course:', courseId)

    // Get all videos for the course directly (avoiding foreign key relationship issue)
    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, title, order')
      .eq('course_id', courseId)
      .order('chapter_id', { ascending: true })
      .order('order', { ascending: true })

    if (error) {
      console.error('[Server Action] Error fetching course videos:', error)
      return null
    }

    const allVideos = videos || []

    if (allVideos.length === 0) {
      console.log('[Server Action] No videos found for course:', courseId)
      return null
    }

    // Simple logic - just return first video if any exist
    if (allVideos.length > 0) {
      console.log('[Server Action] Returning first video:', allVideos[0].title)
      return {
        videoId: allVideos[0].id,
        title: allVideos[0].title
      }
    }

    console.log('[Server Action] No videos found')
    return null

  } catch (error) {
    console.error('[Server Action] Failed to get next video:', error)
    return null
  }
}

/**
 * Update video progress for a student
 */
export async function updateVideoProgress(
  courseId: string,
  videoId: string,
  watchedSeconds: number,
  completed: boolean = false
): Promise<boolean> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    console.log('[Server Action] Updating video progress:', { courseId, videoId, watchedSeconds, completed, userId: user.id })

    // First check if the table exists and what columns it has
    console.log('[Server Action] Checking video_progress table schema...')

    // Test if we can read from the table
    const { data: testRead, error: readError } = await supabase
      .from('video_progress')
      .select('*')
      .limit(1)

    console.log('[Server Action] Table read test:', { testRead, readError })

    const progressData = {
      user_id: user.id,
      course_id: courseId,
      video_id: videoId,
      last_position_seconds: Math.round(watchedSeconds),
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }

    console.log('[Server Action] Attempting to insert/update:', progressData)

    // Upsert video progress - match actual table schema
    const { data, error } = await supabase
      .from('video_progress')
      .upsert(progressData, {
        onConflict: 'user_id,video_id'
      })
      .select()

    if (error) {
      console.error('[Server Action] Error updating video progress:', {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return false
    }

    console.log('[Server Action] Video progress updated successfully:', data)
    console.log('[Server Action] Progress saved - Position:', Math.round(watchedSeconds), 'seconds')

    // Real-time progress broadcasting following 001 patterns
    try {
      // Get video title for broadcasting
      const { data: videoData } = await supabase
        .from('videos')
        .select('title')
        .eq('id', videoId)
        .single()

      // Calculate progress percentage for this video
      const { data: videoDuration } = await supabase
        .from('videos')
        .select('duration_seconds')
        .eq('id', videoId)
        .single()

      const duration = videoDuration?.duration_seconds || 600
      const progressPercentage = Math.min(Math.round((watchedSeconds / duration) * 100), 100)

      // Broadcast video progress update
      await broadcastWebSocketMessage({
        type: 'student-progress-updated',
        data: {
          studentId: user.id,
          courseId,
          videoId,
          watchedSeconds,
          progressPercentage,
          completed,
          timestamp: new Date().toISOString()
        }
      })

      // If video completed, broadcast completion event
      if (completed && videoData?.title) {
        await broadcastWebSocketMessage({
          type: 'student-video-completed',
          data: {
            studentId: user.id,
            courseId,
            videoId,
            videoTitle: videoData.title,
            completedAt: new Date().toISOString(),
            totalWatchTime: watchedSeconds
          }
        })

        // Get updated course progress and broadcast overall progress
        const updatedProgress = await getCourseProgress(courseId)
        if (updatedProgress) {
          await broadcastWebSocketMessage({
            type: 'student-course-progress-updated',
            data: {
              studentId: user.id,
              courseId,
              progressPercentage: updatedProgress.progressPercentage,
              completedLessons: updatedProgress.completedLessons,
              totalLessons: updatedProgress.totalLessons,
              estimatedTimeRemaining: updatedProgress.estimatedTimeRemaining,
              lastAccessedAt: updatedProgress.lastAccessedAt
            }
          })
        }
      }

      console.log('[Server Action] Progress WebSocket broadcasts sent successfully')
    } catch (broadcastError) {
      // Don't fail the main operation if WebSocket fails
      console.warn('[Server Action] WebSocket broadcast failed:', broadcastError)
    }

    return true

  } catch (error) {
    console.error('[Server Action] Failed to update video progress:', error)
    return false
  }
}

/**
 * Get student video data with progress and learning features
 */
export async function getStudentVideo(videoId: string): Promise<{
  id: string
  courseId: string
  title: string
  description: string
  videoUrl: string
  thumbnailUrl: string
  duration: number
  order: number
  aiContextEnabled: boolean
  progress?: {
    userId: string
    videoId: string
    watchedSeconds: number
    totalSeconds: number
    percentComplete: number
    lastWatchedAt: string
    reflectionCount: number
  }
  reflections: any[]
  quizzes: any[]
  transcript: string[]
  createdAt: string
  updatedAt: string
} | null> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    console.log('[Server Action] Getting student video data for:', videoId)

    // Get video data
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      console.error('[Server Action] Error fetching video:', videoError)
      return null
    }

    // Check if user has access to this video through goals
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_goal_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_goal_id) {
      console.log('[Server Action] User has no goal assigned')
      return null
    }

    // Verify course is accessible through user's goal
    const { data: courseAccess } = await supabase
      .from('course_goal_assignments')
      .select('course_id')
      .eq('goal_id', profile.current_goal_id)
      .eq('course_id', video.course_id)
      .single()

    if (!courseAccess) {
      console.log('[Server Action] User does not have access to video course:', video.course_id)
      return null
    }

    // Get video progress
    const { data: progress, error: progressError } = await supabase
      .from('video_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .single()

    console.log('[Server Action] Video progress query result:', {
      progress: progress ? {
        last_position_seconds: progress.last_position_seconds,
        progress_percent: progress.progress_percent,
        updated_at: progress.updated_at
      } : null,
      progressError
    })

    // Return private URL as-is - components will use useSignedUrl hook for conversion
    const studentVideoData = {
      id: video.id,
      courseId: video.course_id,
      title: video.title,
      description: video.description || '',
      videoUrl: video.video_url, // Keep private format for useSignedUrl hook
      thumbnailUrl: video.thumbnail_url || '',
      duration: video.duration_seconds || 600,
      order: video.order || 1,
      aiContextEnabled: true,
      progress: progress ? {
        userId: user.id,
        videoId: videoId,
        watchedSeconds: progress.last_position_seconds || 0,
        totalSeconds: video.duration_seconds || 600,
        percentComplete: Math.round(((progress.last_position_seconds || 0) / (video.duration_seconds || 600)) * 100),
        lastWatchedAt: progress.updated_at || new Date().toISOString(),
        reflectionCount: 0
      } : undefined,
      reflections: [],
      quizzes: [],
      transcript: [],
      createdAt: video.created_at || new Date().toISOString(),
      updatedAt: video.updated_at || new Date().toISOString()
    }

    console.log('[Server Action] Student video data retrieved:', studentVideoData.title)
    return studentVideoData

  } catch (error) {
    console.error('[Server Action] Failed to get student video:', error)
    return null
  }
}

/**
 * Get course by ID for student with access check
 */
export async function getCourseById(courseId: string): Promise<Course | null> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    console.log('[Server Action] Getting course by ID for student:', courseId)

    // Check if user has access to this course through goals
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_goal_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_goal_id) {
      console.log('[Server Action] User has no goal assigned')
      return null
    }

    // Verify course is accessible through user's goal
    const { data: courseAccess } = await supabase
      .from('course_goal_assignments')
      .select('course_id')
      .eq('goal_id', profile.current_goal_id)
      .eq('course_id', courseId)
      .single()

    if (!courseAccess) {
      console.log('[Server Action] User does not have access to course:', courseId)
      return null
    }

    // Get course data with videos (using same approach as instructor getCourseAction)
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        videos (
          id,
          title,
          description,
          thumbnail_url,
          duration_seconds,
          order,
          chapter_id,
          video_url,
          status,
          created_at,
          updated_at
        )
      `)
      .eq('id', courseId)
      .eq('status', 'published')
      .single()

    if (courseError || !courseData) {
      console.log('[Server Action] Course not found or not published:', courseId, courseError)
      return null
    }

    // Sort videos by chapter and order
    if (courseData.videos) {
      courseData.videos.sort((a: any, b: any) => {
        // First sort by chapter_id, then by order
        if (a.chapter_id !== b.chapter_id) {
          return (a.chapter_id || '').localeCompare(b.chapter_id || '')
        }
        return (a.order || 0) - (b.order || 0)
      })
    }

    console.log('[Server Action] Found videos for course:', { courseId, videoCount: courseData.videos?.length || 0 })

    const transformedVideos = (courseData.videos || []).map((video: any) => ({
      id: video.id,
      courseId: courseData.id,
      title: video.title,
      description: video.description || '',
      duration: video.duration_seconds || 600,
      order: video.order || 0,
      videoUrl: video.video_url,
      thumbnailUrl: video.thumbnail_url,
      transcript: [],
      createdAt: video.created_at,
      updatedAt: video.updated_at
    }))

    const transformedCourse: Course = {
      id: courseData.id,
      title: courseData.title,
      description: courseData.description,
      thumbnailUrl: courseData.thumbnail_url,
      instructor: {
        id: courseData.instructor_id || '',
        name: 'Instructor',
        email: 'instructor@example.com',
        avatar: ''
      },
      price: courseData.price || 0,
      duration: courseData.total_duration_minutes || 0,
      difficulty: 'beginner',
      videos: transformedVideos,
      tags: courseData.tags || [],
      enrollmentCount: courseData.students || 0,
      rating: courseData.rating || 4.5,
      isPublished: courseData.status === 'published',
      isFree: courseData.is_free || courseData.price === 0,
      createdAt: courseData.created_at,
      updatedAt: courseData.updated_at
    }

    console.log('[Server Action] Course retrieved:', transformedCourse.title, 'with', transformedCourse.videos.length, 'videos')
    return transformedCourse

  } catch (error) {
    console.error('[Server Action] Failed to get course by ID:', error)
    return null
  }
}

/**
 * 🎯 OPTIMIZED: Get course with chapters and videos in single query
 * Following 001 Architecture Principles - TanStack Query server state management
 */
export async function getCourseWithChaptersAndVideos(courseId: string): Promise<{
  success: boolean
  data?: {
    id: string
    title: string
    description: string
    thumbnail_url?: string
    instructor_id: string
    chapters: {
      id: string
      title: string
      order: number
      videos: {
        id: string
        title: string
        duration_seconds: number
        order: number
        chapter_id: string
      }[]
    }[]
    total_videos: number
    total_duration_minutes: number
  }
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    console.log('[Server Action] Getting optimized course content for:', courseId)

    // 🎯 GOAL-BASED ACCESS: Verify user has access to this course
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_goal_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_goal_id) {
      throw new Error('No goal assigned')
    }

    const { data: courseAccess } = await supabase
      .from('course_goal_assignments')
      .select('course_id')
      .eq('goal_id', profile.current_goal_id)
      .eq('course_id', courseId)
      .single()

    if (!courseAccess) {
      throw new Error('Course not accessible')
    }

    // 🎯 OPTIMIZED QUERIES: Parallel fetch course, chapters, and videos
    const [courseResult, chaptersResult, videosResult] = await Promise.all([
      supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, instructor_id')
        .eq('id', courseId)
        .eq('status', 'published')
        .single(),

      supabase
        .from('course_chapters')
        .select('id, title, order')
        .eq('course_id', courseId)
        .order('order', { ascending: true }),

      supabase
        .from('videos')
        .select('id, title, duration_seconds, order, chapter_id')
        .eq('course_id', courseId)
        .order('chapter_id')
        .order('order', { ascending: true })
    ])

    if (courseResult.error || !courseResult.data) {
      throw new Error(`Course not found: ${courseResult.error?.message}`)
    }

    const courseData = courseResult.data
    const allChapters = chaptersResult.data || []
    const allVideos = videosResult.data || []

    console.log('[Server Action] Raw data loaded:', {
      courseId,
      chaptersCount: allChapters.length,
      videosCount: allVideos.length
    })

    // 🐛 DEBUG: Log video details to identify filtering issue
    console.log('[DEBUG] All videos:', allVideos.map(v => ({
      id: v.id,
      title: v.title,
      chapter_id: v.chapter_id,
      duration_seconds: v.duration_seconds,
      order: v.order
    })))

    console.log('[DEBUG] All chapters:', allChapters.map(ch => ({
      id: ch.id,
      title: ch.title,
      order: ch.order
    })))

    // 🎯 DATA TRANSFORMATION: Manual join chapters with their videos
    const chapters = allChapters
      .map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        videos: allVideos
          .filter(video => video.chapter_id === chapter.id)
          // 🔧 REMOVED duration filter - videos can have 0 duration (not yet processed)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
      }))
      .filter(chapter => chapter.videos.length > 0) // Only include chapters with videos
      .sort((a, b) => a.order - b.order)

    // 🎯 HANDLE VIDEOS WITHOUT CHAPTERS: Create chapters from video chapter_ids
    const videosWithoutExistingChapter = allVideos
      .filter(video => video.chapter_id && !allChapters.find(ch => ch.id === video.chapter_id))

    // Group videos by their chapter_id and create missing chapters
    const missingChapterGroups = videosWithoutExistingChapter.reduce((acc, video) => {
      if (!acc[video.chapter_id]) {
        acc[video.chapter_id] = []
      }
      acc[video.chapter_id].push(video)
      return acc
    }, {} as Record<string, typeof allVideos>)

    // Create chapters for missing chapter_ids
    Object.entries(missingChapterGroups).forEach(([chapterId, videos], index) => {
      chapters.push({
        id: chapterId,
        title: `Chapter ${index + 1}`, // Generate chapter title
        order: index + 1,
        videos: videos.sort((a, b) => (a.order || 0) - (b.order || 0))
      })
    })

    // Handle truly orphaned videos (no chapter_id at all)
    const videosWithoutChapter = allVideos
      .filter(video => !video.chapter_id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    // 🐛 DEBUG: Log filtering results
    console.log('[DEBUG] Missing chapters created:', Object.keys(missingChapterGroups).length)
    console.log('[DEBUG] Videos without chapter_id:', videosWithoutChapter.length)
    console.log('[DEBUG] Total chapters after processing:', chapters.length)

    if (videosWithoutChapter.length > 0) {
      chapters.unshift({
        id: 'default-chapter',
        title: 'Course Videos',
        order: 0,
        videos: videosWithoutChapter
      })
      console.log('[DEBUG] Added default chapter with', videosWithoutChapter.length, 'videos')
    }

    // 🎯 COMPUTED METRICS: Calculate totals efficiently
    const totalVideos = chapters.reduce((sum, chapter) => sum + chapter.videos.length, 0)
    const totalDurationMinutes = Math.ceil(
      chapters.reduce((sum, chapter) =>
        sum + chapter.videos.reduce((videoSum, video) => videoSum + video.duration_seconds, 0), 0
      ) / 60
    )

    console.log('[Server Action] Course content loaded:', {
      courseId,
      chaptersCount: chapters.length,
      totalVideos,
      totalDurationMinutes
    })

    return {
      success: true,
      data: {
        id: courseData.id,
        title: courseData.title,
        description: courseData.description,
        thumbnail_url: courseData.thumbnail_url,
        instructor_id: courseData.instructor_id,
        chapters,
        total_videos: totalVideos,
        total_duration_minutes: totalDurationMinutes
      }
    }

  } catch (error) {
    console.error('[Server Action] Failed to get course content:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch course content'
    }
  }
}
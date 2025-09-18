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
      // Get videos for this course directly (avoiding foreign key relationship issue)
      const { data: videos } = await supabase
        .from('videos')
        .select('*')
        .eq('course_id', courseData.id)
        .order('chapter_id', { ascending: true })
        .order('order', { ascending: true })

      console.log('[Server Action] Found videos for course:', { courseId: courseData.id, videoCount: videos?.length || 0 })

      const transformedVideos = (videos || []).map((video: any, index: number) => ({
        id: video.id,
        courseId: courseData.id,
        title: video.title,
        description: video.description || '',
        duration: video.duration_seconds || 600,
        order: index + 1,
        videoUrl: video.video_url, // Keep private format for useSignedUrl hook
        thumbnailUrl: video.thumbnail_url,
        transcript: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

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

    // Get course data using existing function logic
    const { data: courseData } = await supabase
      .rpc('get_user_courses', { user_id: user.id })

    const course = courseData?.find((c: any) => c.id === courseId)
    if (!course) {
      console.log('[Server Action] Course not found:', courseId)
      return null
    }

    // Get videos for this course
    const { data: videos } = await supabase
      .from('videos')
      .select('*')
      .eq('course_id', courseId)
      .order('chapter_id', { ascending: true })
      .order('order', { ascending: true })

    console.log('[Server Action] Found videos for course:', { courseId, videoCount: videos?.length || 0 })

    const transformedVideos = (videos || []).map((video: any, index: number) => ({
      id: video.id,
      courseId: courseId,
      title: video.title,
      description: video.description || '',
      duration: video.duration_seconds || 600,
      order: index + 1,
      videoUrl: video.video_url, // Keep private format for useSignedUrl hook
      thumbnailUrl: video.thumbnail_url,
      transcript: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))

    const transformedCourse: Course = {
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnailUrl: course.thumbnail_url,
      instructor: {
        id: course.instructor_id || '',
        name: 'Instructor',
        email: 'instructor@example.com',
        avatar: ''
      },
      price: course.price || 0,
      duration: course.total_duration_minutes || 0,
      difficulty: course.difficulty || 'beginner',
      videos: transformedVideos,
      tags: [],
      enrollmentCount: 0,
      rating: 4.5,
      isPublished: true,
      isFree: course.price === 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    console.log('[Server Action] Course retrieved:', transformedCourse.title)
    return transformedCourse

  } catch (error) {
    console.error('[Server Action] Failed to get course by ID:', error)
    return null
  }
}
'use server'

import { createClient } from '@/lib/supabase/server'
import type { Course, CourseProgress } from '@/types/domain'

/**
 * Get enrolled courses for a student with video relationships
 */
export async function getEnrolledCourses(): Promise<Course[]> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    console.log('[Server Action] Fetching enrollments for user:', user.id)

    // Get enrollments with course details
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        course_id,
        enrollment_date,
        courses (
          id,
          title,
          description,
          thumbnail_url,
          price,
          difficulty,
          total_duration_minutes,
          total_videos,
          instructor_id,
          profiles (
            full_name,
            avatar_url
          )
        )
      `)
      .eq('student_id', user.id)
      .eq('status', 'active')

    if (error) {
      console.error('[Server Action] Error fetching enrollments:', error)
      return []
    }

    // Transform to Course format with videos
    const courses: Course[] = (data || []).map(enrollment => {
      const course = enrollment.courses as any
      const instructor = course.profiles

      // Flatten videos from all chapters, maintaining order
      const allVideos = (course.course_chapters || [])
        .sort((a: any, b: any) => a.order - b.order)
        .flatMap((chapter: any) =>
          (chapter.videos || [])
            .sort((a: any, b: any) => a.order - b.order)
            .map((video: any, index: number) => ({
              id: video.id,
              courseId: course.id,
              title: video.title,
              description: video.description || '',
              duration: video.duration_seconds || 600,
              order: index + 1,
              videoUrl: video.video_url,
              thumbnailUrl: video.thumbnail_url,
              transcript: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }))
        )

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnail_url,
        instructor: {
          id: course.instructor_id,
          name: instructor?.full_name || 'Unknown Instructor',
          email: `${instructor?.full_name?.toLowerCase().replace(' ', '.')}@example.com`,
          avatar: instructor?.avatar_url
        },
        price: course.price || 0,
        duration: course.total_duration_minutes || 0,
        difficulty: course.difficulty || 'beginner',
        videos: allVideos,
        tags: [],
        enrollmentCount: 0,
        rating: 4.5,
        isPublished: true,
        isFree: course.price === 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    })

    console.log('[Server Action] Found enrollments:', courses.length)
    return courses

  } catch (error) {
    console.error('[Server Action] Failed to get enrolled courses:', error)
    return []
  }
}

/**
 * Get course progress for a student
 */
export async function getCourseProgress(courseId: string): Promise<CourseProgress | null> {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    console.log('[Server Action] Getting course progress for:', { userId: user.id, courseId })
    
    // Get enrollment progress
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .single()
    
    if (error || !enrollment) {
      console.log('[Server Action] No enrollment found for course:', courseId)
      return null
    }
    
    // Get lesson progress
    const { data: lessons, error: lessonsError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed_at, progress')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
    
    if (lessonsError) {
      console.error('[Server Action] Error fetching lesson progress:', lessonsError)
    }
    
    // Calculate overall progress
    const totalLessons = lessons?.length || 0
    const completedLessons = lessons?.filter(l => l.completed_at).length || 0
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
    
    const progress: CourseProgress = {
      courseId,
      progressPercentage,
      completedLessons,
      totalLessons,
      lastAccessedAt: enrollment.updated_at || enrollment.enrollment_date,
      estimatedTimeRemaining: totalLessons > completedLessons ? `${(totalLessons - completedLessons) * 30} min` : '0 min'
    }
    
    console.log('[Server Action] Course progress:', progress)
    return progress
    
  } catch (error) {
    console.error('[Server Action] Failed to get course progress:', error)
    return null
  }
}

/**
 * Enroll student in a course
 */
export async function enrollInCourse(courseId: string): Promise<boolean> {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    console.log('[Server Action] Enrolling user in course:', { userId: user.id, courseId })
    
    const { error } = await supabase
      .from('enrollments')
      .insert({
        student_id: user.id,
        course_id: courseId,
        enrollment_date: new Date().toISOString(),
        status: 'active'
      })
    
    if (error) {
      console.error('[Server Action] Enrollment failed:', error)
      return false
    }
    
    console.log('[Server Action] Successfully enrolled in course')
    return true
    
  } catch (error) {
    console.error('[Server Action] Failed to enroll in course:', error)
    return false
  }
}

/**
 * Get next video for a student in a course (for continue learning)
 */
export async function getNextVideoForCourse(courseId: string): Promise<{ videoId: string; title: string } | null> {
  const supabase = await createClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    console.log('[Server Action] Getting next video for course:', courseId)

    // Get all videos for the course directly (since foreign key relationship isn't set up yet)
    const { data: videos, error } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        chapter_id,
        "order"
      `)
      .eq('course_id', courseId)
      .order('chapter_id')
      .order('order')

    if (error || !videos) {
      console.error('[Server Action] Error fetching course videos:', error)
      return null
    }

    // Videos are already sorted by chapter_id and order
    const allVideos = videos

    if (allVideos.length === 0) {
      console.log('[Server Action] No videos found for course:', courseId)
      return null
    }

    // Get completed videos for this user/course
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .not('completed_at', 'is', null)

    const completedVideoIds = new Set(progress?.map(p => p.lesson_id) || [])

    // Find first uncompleted video
    const nextVideo = allVideos.find((video: any) => !completedVideoIds.has(video.id))

    if (nextVideo) {
      console.log('[Server Action] Next video found:', nextVideo.title)
      return {
        videoId: nextVideo.id,
        title: nextVideo.title
      }
    }

    // If all videos completed, return first video for review
    console.log('[Server Action] All videos completed, returning first video')
    return {
      videoId: allVideos[0].id,
      title: allVideos[0].title
    }

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

    console.log('[Server Action] Updating video progress:', { courseId, videoId, watchedSeconds, completed })

    // Upsert lesson progress
    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        student_id: user.id,
        course_id: courseId,
        lesson_id: videoId,
        progress: watchedSeconds,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'student_id,course_id,lesson_id'
      })

    if (error) {
      console.error('[Server Action] Error updating video progress:', error)
      return false
    }

    console.log('[Server Action] Video progress updated successfully')
    return true

  } catch (error) {
    console.error('[Server Action] Failed to update video progress:', error)
    return false
  }
}
'use server'

import { createClient } from '@/lib/supabase/server'
import type { Course, CourseProgress } from '@/types/domain'

/**
 * Get enrolled courses for a student
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
    
    // Transform to Course format
    const courses: Course[] = (data || []).map(enrollment => {
      const course = enrollment.courses as any
      const instructor = course.profiles
      
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
        difficulty: course.difficulty || 'beginner'
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
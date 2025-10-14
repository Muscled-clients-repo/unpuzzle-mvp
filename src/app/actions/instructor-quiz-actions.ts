'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Instructor Quiz Attempts Actions
 *
 * Allows instructors to view quiz attempts from students in their courses.
 *
 * SECURITY:
 * - Verifies instructor role via profiles table
 * - Verifies course ownership via courses.instructor_id
 * - RLS policies provide additional database-level protection
 * - Only SELECT access (read-only)
 */

// Helper function to get authenticated user
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Authentication required')
  }

  return user
}

// Helper function to verify instructor owns the course
async function verifyInstructorOwnership(courseId: string, instructorId: string) {
  const supabase = createServiceClient()

  // Check if user is an instructor who owns this course
  const { data: course, error } = await supabase
    .from('courses')
    .select('id, instructor_id')
    .eq('id', courseId)
    .eq('instructor_id', instructorId)
    .single()

  if (error || !course) {
    return false
  }

  return true
}

export interface QuizAttempt {
  id: string
  user_id: string
  video_id: string
  course_id: string
  video_timestamp: number
  questions: any[]
  user_answers: number[]
  score: number
  total_questions: number
  percentage: number
  quiz_duration_seconds?: number
  created_at: string
  updated_at: string
}

export interface InstructorQuizAttemptsResponse {
  success: boolean
  data?: QuizAttempt[]
  error?: string
  hasMore?: boolean
  nextOffset?: number
}

/**
 * Get paginated quiz attempts for instructor's course
 *
 * @param videoId - Video ID to filter by
 * @param courseId - Course ID (must be owned by requesting instructor)
 * @param userId - Optional: Filter by specific student (or null for all students)
 * @param limit - Number of records to return (default: 20)
 * @param offset - Offset for pagination (default: 0)
 */
export async function getInstructorQuizAttempts(
  videoId: string,
  courseId: string,
  userId?: string | null,
  limit: number = 20,
  offset: number = 0
): Promise<InstructorQuizAttemptsResponse> {
  try {
    // 1. Authenticate user
    const user = await requireAuth()

    // 2. Verify instructor role
    const supabase = createServiceClient()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'instructor') {
      return {
        success: false,
        error: 'Forbidden: Instructor role required'
      }
    }

    // 3. Verify instructor owns the course
    const ownsCourse = await verifyInstructorOwnership(courseId, user.id)
    if (!ownsCourse) {
      return {
        success: false,
        error: 'Forbidden: You do not have access to this course'
      }
    }

    // 4. Build query
    let query = supabase
      .from('quiz_attempts')
      .select('*', { count: 'exact' })
      .eq('video_id', videoId)
      .eq('course_id', courseId)

    // Filter by specific student if provided
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Apply pagination and ordering
    const { data: quizAttempts, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[InstructorQuizActions] Query error:', error)
      return {
        success: false,
        error: 'Failed to fetch quiz attempts'
      }
    }

    // Calculate if there are more results
    const hasMore = count ? count > offset + limit : false
    const nextOffset = hasMore ? offset + limit : undefined

    return {
      success: true,
      data: quizAttempts || [],
      hasMore,
      nextOffset
    }

  } catch (error) {
    console.error('[InstructorQuizActions] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }
  }
}

/**
 * Get enrolled students for a course (for student selector dropdown)
 *
 * @param courseId - Course ID (must be owned by requesting instructor)
 */
export async function getEnrolledStudentsForCourse(courseId: string) {
  try {
    // 1. Authenticate user
    const user = await requireAuth()

    // 2. Verify instructor role
    const supabase = createServiceClient()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'instructor') {
      return {
        success: false,
        error: 'Forbidden: Instructor role required'
      }
    }

    // 3. Verify instructor owns the course
    const ownsCourse = await verifyInstructorOwnership(courseId, user.id)
    if (!ownsCourse) {
      return {
        success: false,
        error: 'Forbidden: You do not have access to this course'
      }
    }

    // 4. Get enrolled students via enrollments table
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        user_id,
        profiles!inner(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[InstructorQuizActions] Enrollment query error:', error)
      return {
        success: false,
        error: 'Failed to fetch enrolled students'
      }
    }

    // Transform to simpler format
    const students = enrollments?.map((e: any) => ({
      id: e.profiles.id,
      name: e.profiles.full_name || 'Unknown Student',
      email: e.profiles.email,
      avatarUrl: e.profiles.avatar_url
    })) || []

    return {
      success: true,
      data: students
    }

  } catch (error) {
    console.error('[InstructorQuizActions] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }
  }
}

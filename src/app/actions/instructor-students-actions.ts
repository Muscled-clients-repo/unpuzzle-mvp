'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Instructor Students Actions
 *
 * Provides functions for instructors to get student information for their courses.
 * Used primarily for student selector dropdowns in instructor UIs.
 *
 * SECURITY:
 * - Verifies instructor role via profiles table
 * - Verifies course ownership via courses.instructor_id
 * - Only returns students enrolled in instructor's courses
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

export interface EnrolledStudent {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  enrolledAt: string
}

export interface InstructorStudentsResponse {
  success: boolean
  data?: EnrolledStudent[]
  error?: string
}

/**
 * Get all enrolled students for a specific course
 *
 * @param courseId - Course ID (must be owned by requesting instructor)
 * @returns List of enrolled students with basic profile information
 */
export async function getEnrolledStudents(
  courseId: string
): Promise<InstructorStudentsResponse> {
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
        created_at,
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
      console.error('[InstructorStudentsActions] Query error:', error)
      return {
        success: false,
        error: 'Failed to fetch enrolled students'
      }
    }

    // 5. Transform to simpler format
    const students: EnrolledStudent[] = (enrollments || []).map((e: any) => ({
      id: e.profiles.id,
      name: e.profiles.full_name || 'Unknown Student',
      email: e.profiles.email,
      avatarUrl: e.profiles.avatar_url || null,
      enrolledAt: e.created_at
    }))

    return {
      success: true,
      data: students
    }

  } catch (error) {
    console.error('[InstructorStudentsActions] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }
  }
}

/**
 * Get student count for a course (for quick metrics)
 *
 * @param courseId - Course ID (must be owned by requesting instructor)
 * @returns Count of enrolled students
 */
export async function getStudentCount(
  courseId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
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

    // 4. Get enrollment count
    const { count, error } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)

    if (error) {
      console.error('[InstructorStudentsActions] Count error:', error)
      return {
        success: false,
        error: 'Failed to get student count'
      }
    }

    return {
      success: true,
      count: count || 0
    }

  } catch (error) {
    console.error('[InstructorStudentsActions] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }
  }
}

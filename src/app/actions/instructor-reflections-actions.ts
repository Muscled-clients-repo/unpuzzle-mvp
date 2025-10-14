'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Instructor Reflections Actions
 *
 * Allows instructors to view reflections (voice memos, Loom videos, screenshots)
 * from students in their courses.
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

export interface Reflection {
  id: string
  user_id: string
  video_id: string
  course_id: string
  reflection_type: 'voice' | 'loom' | 'screenshot'
  reflection_text: string | null
  reflection_prompt: string | null
  file_url: string | null
  duration_seconds: number | null
  video_timestamp_seconds: number
  created_at: string
  updated_at: string
}

export interface InstructorReflectionsResponse {
  success: boolean
  data?: Reflection[]
  error?: string
  hasMore?: boolean
  nextOffset?: number
}

/**
 * Get paginated reflections for instructor's course
 *
 * @param videoId - Video ID to filter by
 * @param courseId - Course ID (must be owned by requesting instructor)
 * @param userId - Optional: Filter by specific student (or null for all students)
 * @param limit - Number of records to return (default: 20)
 * @param offset - Offset for pagination (default: 0)
 */
export async function getInstructorReflections(
  videoId: string,
  courseId: string,
  userId?: string | null,
  limit: number = 20,
  offset: number = 0
): Promise<InstructorReflectionsResponse> {
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
      .from('reflections')
      .select(`
        id,
        user_id,
        video_id,
        course_id,
        reflection_type,
        reflection_text,
        reflection_prompt,
        file_url,
        duration_seconds,
        video_timestamp_seconds,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('video_id', videoId)
      .eq('course_id', courseId)

    // Filter by specific student if provided
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Apply pagination and ordering
    const { data: reflections, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[InstructorReflectionsActions] Query error:', error)
      return {
        success: false,
        error: 'Failed to fetch reflections'
      }
    }

    // Calculate if there are more results
    const hasMore = count ? count > offset + limit : false
    const nextOffset = hasMore ? offset + limit : undefined

    return {
      success: true,
      data: reflections || [],
      hasMore,
      nextOffset
    }

  } catch (error) {
    console.error('[InstructorReflectionsActions] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }
  }
}

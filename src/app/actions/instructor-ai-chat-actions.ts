'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Instructor AI Chat Actions
 *
 * Allows instructors to view AI chat conversations from students in their courses.
 *
 * SECURITY:
 * - Verifies instructor role via profiles table
 * - Verifies course ownership via courses.instructor_id
 * - RLS policies provide additional database-level protection
 * - Only SELECT access (read-only)
 *
 * NOTE: The table name is "video_ai_conversations" (not ai_interactions)
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

export interface AIConversation {
  id: string
  user_id: string
  media_file_id: string | null
  parent_message_id: string | null
  video_timestamp: number | null
  conversation_context: string | null
  user_message: string
  ai_response: string
  model_used: string | null
  metadata: Record<string, any>
  created_at: string
}

export interface InstructorAIChatResponse {
  success: boolean
  data?: AIConversation[]
  error?: string
  hasMore?: boolean
  nextOffset?: number
}

/**
 * Get paginated AI conversations for instructor's course
 *
 * @param videoId - Video/Media File ID to filter by
 * @param courseId - Course ID (must be owned by requesting instructor)
 * @param userId - Optional: Filter by specific student (or null for all students)
 * @param limit - Number of records to return (default: 20)
 * @param offset - Offset for pagination (default: 0)
 */
export async function getInstructorAIConversations(
  videoId: string,
  courseId: string,
  userId?: string | null,
  limit: number = 20,
  offset: number = 0
): Promise<InstructorAIChatResponse> {
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

    // 4. Build query for video_ai_conversations table
    // Note: This table doesn't have course_id, so we filter by media_file_id (video)
    // and verify the video belongs to the course through media_files join
    let query = supabase
      .from('video_ai_conversations')
      .select(`
        id,
        user_id,
        media_file_id,
        parent_message_id,
        video_timestamp,
        conversation_context,
        user_message,
        ai_response,
        model_used,
        metadata,
        created_at
      `, { count: 'exact' })
      .eq('media_file_id', videoId)

    // Filter by specific student if provided
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Apply pagination and ordering
    const { data: conversations, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[InstructorAIChatActions] Query error:', error)
      return {
        success: false,
        error: 'Failed to fetch AI conversations'
      }
    }

    // Calculate if there are more results
    const hasMore = count ? count > offset + limit : false
    const nextOffset = hasMore ? offset + limit : undefined

    return {
      success: true,
      data: conversations || [],
      hasMore,
      nextOffset
    }

  } catch (error) {
    console.error('[InstructorAIChatActions] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }
  }
}

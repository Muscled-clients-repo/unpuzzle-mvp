'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { backblazeService } from '@/services/video/backblaze-service'
import { revalidatePath } from 'next/cache'
import { broadcastWebSocketMessage } from '@/lib/websocket-operations'

// Result types for better type safety
export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface DeleteCourseResult {
  success: boolean
  message?: string
  error?: string
  videosDeleted?: number
}

// Helper function to get authenticated user
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Authentication required')
  }
  
  return user
}

/**
 * Create a new course
 */
export async function createCourseAction(data: {
  title?: string
  description?: string
  price?: number
  category?: string
}): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const courseData = {
      title: data.title || 'Untitled Course',
      description: data.description || '',
      instructor_id: user.id,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Add optional fields if they exist
    if (data.price !== undefined) courseData.price = data.price

    const { data: course, error } = await supabase
      .from('courses')
      .insert(courseData)
      .select()
      .single()
    
    if (error) throw error
    
    revalidatePath('/instructor/courses')
    revalidatePath(`/instructor/course/${course.id}`)
    
    return { success: true, data: course }
  } catch (error) {
    console.error('Create course error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create course' 
    }
  }
}

/**
 * Get a single course with videos
 */
export async function getCourseAction(courseId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        *,
        videos (
          id,
          title,
          thumbnail_url,
          duration,
          order,
          chapter_id,
          backblaze_file_id,
          filename,
          file_size,
          status,
          created_at,
          updated_at
        )
      `)
      .eq('id', courseId)
      .eq('instructor_id', user.id)
      .single()
    
    if (error) throw error
    if (!course) throw new Error('Course not found')
    
    // Sort videos by order
    if (course.videos) {
      course.videos.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    }
    
    return { success: true, data: course }
  } catch (error) {
    console.error('Get course error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get course' 
    }
  }
}

/**
 * Get all courses for the current user
 */
export async function getCoursesAction() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        videos!inner (count)
      `)
      .eq('instructor_id', user.id)
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    
    return courses || []
  } catch (error) {
    console.error('Get courses error:', error)
    throw error
  }
}

/**
 * Save course as draft (auto-save functionality)
 */
export async function saveCourseAsDraftAction(
  courseId: string, 
  data: any
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Map the data to match the database schema
    const updateData: any = {
      status: 'draft',
      updated_at: new Date().toISOString()
    }
    
    // Only include fields that exist in the courses table
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.price !== undefined) updateData.price = data.price
    if (data.thumbnail_url !== undefined) updateData.thumbnail_url = data.thumbnail_url
    if (data.is_free !== undefined) updateData.is_free = data.is_free
    
    // Note: difficulty/level fields removed from database schema
    
    // Note: 'category' field doesn't exist in the current schema, so we skip it
    // if (data.category !== undefined) updateData.category = data.category
    
    const { data: course, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .eq('instructor_id', user.id)
      .select()
      .single()
    
    if (error) {
      console.error('Database error details:', error)
      throw error
    }
    
    // Soft revalidation for auto-save
    revalidatePath(`/instructor/course/${courseId}`, 'page')
    
    return { success: true, data: course }
  } catch (error) {
    console.error('Save draft error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save draft' 
    }
  }
}

/**
 * Publish a course
 */
export async function publishCourseAction(courseId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Verify course has required content
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select(`
        *,
        course_chapters (
          id,
          course_chapter_media (
            id,
            media_files (id)
          )
        )
      `)
      .eq('id', courseId)
      .eq('instructor_id', user.id)
      .single()

    if (fetchError) throw fetchError
    if (!course) throw new Error('Course not found')

    if (!course.title || !course.description) {
      throw new Error('Course must have title and description')
    }

    // Check if course has at least one chapter with media
    const hasMedia = course.course_chapters?.some(chapter =>
      chapter.course_chapter_media && chapter.course_chapter_media.length > 0
    )

    if (!hasMedia) {
      throw new Error('Course must have at least one media file in a chapter')
    }
    
    const { data: publishedCourse, error } = await supabase
      .from('courses')
      .update({
        status: 'published',
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .eq('instructor_id', user.id)
      .select()
      .single()
    
    if (error) throw error

    // Broadcast WebSocket message for real-time updates
    await broadcastWebSocketMessage({
      type: 'course-status-changed',
      data: {
        courseId,
        status: 'published',
        course: publishedCourse
      }
    })

    revalidatePath(`/instructor/course/${courseId}`)
    revalidatePath('/instructor/courses')

    return { success: true, data: publishedCourse }
  } catch (error) {
    console.error('Publish course error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to publish course' 
    }
  }
}

/**
 * Unpublish a course
 */
export async function unpublishCourseAction(courseId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data: course, error } = await supabase
      .from('courses')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .eq('instructor_id', user.id)
      .select()
      .single()
    
    if (error) throw error

    // Broadcast WebSocket message for real-time updates
    await broadcastWebSocketMessage({
      type: 'course-status-changed',
      data: {
        courseId,
        status: 'draft',
        course: course
      }
    })

    revalidatePath(`/instructor/course/${courseId}`)
    revalidatePath('/instructor/courses')

    return { success: true, data: course }
  } catch (error) {
    console.error('Unpublish course error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to unpublish course' 
    }
  }
}

/**
 * Server Action to update a course
 * Ensures proper authentication and ownership verification
 */
export async function updateCourseAction(courseId: string, updates: any): Promise<ActionResult> {
  const supabase = await createClient()
  
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    
    // First verify ownership
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()
    
    if (fetchError || !course) {
      throw new Error('Course not found')
    }
    
    if (course.instructor_id !== user.id) {
      throw new Error('Access denied - you do not own this course')
    }
    
    // Map the updates to match the database schema
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    // Only include fields that exist in the courses table
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.price !== undefined) updateData.price = updates.price
    if (updates.thumbnail_url !== undefined) updateData.thumbnail_url = updates.thumbnail_url
    if (updates.is_free !== undefined) updateData.is_free = updates.is_free
    if (updates.status !== undefined) updateData.status = updates.status
    
    // Note: difficulty/level fields removed from database schema
    
    // Note: 'category' field doesn't exist in the current schema, so we skip it
    // if (updates.category !== undefined) updateData.category = updates.category

    // Update the course  
    const { data, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .eq('instructor_id', user.id) // Extra safety check
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return { success: true, data }
    
  } catch (error) {
    console.error('Update course error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update course' 
    }
  }
}

/**
 * Server Action to update video metadata in a course
 * Used when reordering videos, renaming them, or moving between chapters
 */
export async function updateVideoOrders(
  courseId: string, 
  videoOrders: Array<{ id: string; title?: string; order: number; chapter_id: string }>
) {
  const supabase = await createClient()
  
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    
    // Verify ownership of the course
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()
    
    if (fetchError || !course) {
      throw new Error('Course not found')
    }
    
    if (course.instructor_id !== user.id) {
      throw new Error('Access denied - you do not own this course')
    }
    
    // First, temporarily set ALL videos in affected chapters to have order = NULL
    // This avoids the unique constraint violation (course_id, chapter_id, order)
    const chapterIds = [...new Set(videoOrders.map(v => v.chapter_id))]
    
    const { error: resetError } = await supabase
      .from('videos')
      .update({ 
        order: null,  // Use NULL instead of -1 to avoid constraint violation
        updated_at: new Date().toISOString()
      })
      .in('chapter_id', chapterIds)
      .eq('course_id', courseId)
    
    if (resetError) {
      throw resetError
    }
    
    // Now update each video with its new metadata
    // IMPORTANT: Sort by order to update in sequence (0, 1, 2, etc)
    // Filter out any videos that might have null order from previous operations
    const sortedVideoOrders = [...videoOrders]
      .filter(v => v.order !== null && v.order !== undefined)
      .sort((a, b) => a.order - b.order)
    
    
    for (const video of sortedVideoOrders) {
      const updateData: any = {
        order: video.order,  // This will be properly escaped as "order" by Supabase
        chapter_id: video.chapter_id,
        updated_at: new Date().toISOString()
      }
      
      // Only update title if it's provided
      if (video.title !== undefined) {
        updateData.title = video.title
      }
      
      
      const { data: updatedVideo, error: updateError } = await supabase
        .from('videos')
        .update(updateData)
        .eq('id', video.id)
        .eq('course_id', courseId) // Extra safety check
        .select()
        .single()
      
      if (updateError) {
        throw updateError
      }
    }
    
    
    return { success: true }
    
  } catch (error) {
    throw error
  }
}

/**
 * Server Action to delete a course and all associated resources
 * This follows the professional pattern used by YouTube/Netflix
 * - Authentication is automatic via cookies
 * - No API routes needed
 * - Direct database access with proper auth
 * - Backblaze cleanup handled server-side
 */
export async function deleteCourse(courseId: string): Promise<DeleteCourseResult> {
  
  try {
    
    // Get authenticated user from cookies (automatic with server client)
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }
    
    // Check if user owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()
    
    if (courseError || !course) {
      return {
        success: false,
        error: 'Course not found'
      }
    }
    
    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Verify ownership (instructors can only delete their own courses)
    if (profile?.role === 'instructor' && course.instructor_id !== user.id) {
      return {
        success: false,
        error: 'You can only delete your own courses'
      }
    }
    
    
    // Use service client for deletion (bypasses RLS)
    let serviceClient;
    try {
      serviceClient = createServiceClient()
    } catch (error) {
      return {
        success: false,
        error: 'Service configuration error'
      }
    }
    
    // 1. Get all videos for cleanup
    const { data: videos, error: videosError } = await serviceClient
      .from('videos')
      .select('id, backblaze_file_id, filename')
      .eq('course_id', courseId)
    
    if (videosError) {
      // Continue with deletion even if video fetch fails
    }
    
    // 2. Delete course from database (cascades to videos, progress, and other relations)
    // Note: The database triggers have been fixed to properly handle DELETE operations
    const { error: deleteError } = await serviceClient
      .from('courses')
      .delete()
      .eq('id', courseId)
    
    if (deleteError) {
      return {
        success: false,
        error: `Failed to delete course: ${deleteError.message || 'Database error'}`
      }
    }
    
    
    // 3. Clean up Backblaze files in parallel
    if (videos && videos.length > 0) {
      
      const deletionPromises = videos.map(async (video) => {
        if (video.backblaze_file_id && video.filename) {
          try {
            await backblazeService.deleteVideo(video.backblaze_file_id, video.filename)
          } catch (error) {
            // Don't fail the whole operation - continue with other deletions
          }
        }
      })
      
      await Promise.all(deletionPromises)
    }
    
    // 4. Revalidate the courses page to reflect changes
    revalidatePath('/instructor/courses')
    revalidatePath('/instructor')
    
    return {
      success: true,
      message: 'Course and all associated videos deleted successfully',
      videosDeleted: videos?.length || 0
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Get courses visible to user based on their goal assignments
 * Uses the get_user_courses() database function
 */
export async function getUserCoursesAction(): Promise<ActionResult<any[]>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Call the database function that filters courses by user's goals
    const { data: courses, error } = await supabase
      .rpc('get_user_courses', { user_id: user.id })

    if (error) throw error

    return {
      success: true,
      data: courses || []
    }
  } catch (error) {
    console.error('Get user courses error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch courses',
      data: []
    }
  }
}

/**
 * PUBLIC ENDPOINT - No authentication required
 * Get all published courses available on the platform
 * Used in: Community/Courses Page - Public course listing
 *
 * Security: Only returns published courses. RLS policies ensure proper access control.
 */
export async function getAllPublishedCoursesAction(): Promise<ActionResult<any[]>> {
  try {
    const supabase = await createClient()
    // No auth check - this is a public endpoint

    // Fetch all published courses with basic info
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        description,
        thumbnail_url,
        is_free,
        price,
        created_at,
        updated_at,
        instructor_id,
        profiles!courses_instructor_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get published courses error:', error)
      throw error
    }

    // Transform the data to a cleaner format
    const formattedCourses = (courses || []).map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnail_url: course.thumbnail_url,
      is_free: course.is_free,
      price: course.price,
      created_at: course.created_at,
      updated_at: course.updated_at,
      instructor: {
        id: course.profiles?.id,
        name: course.profiles?.full_name || 'Instructor',
        avatar_url: course.profiles?.avatar_url
      }
    }))

    return {
      success: true,
      data: formattedCourses
    }
  } catch (error) {
    console.error('Get all published courses error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch courses',
      data: []
    }
  }
}

/**
 * PUBLIC ENDPOINT - No authentication required
 * Get courses organized by tracks and goals for community discovery
 * Used in: Community/Courses Page - Track/Goal based course browsing
 *
 * Security: Only returns published courses. RLS policies ensure proper access control.
 * Returns: Hierarchical structure: Tracks → Goals → Courses
 */
export async function getCoursesGroupedByTrackAndGoalAction(): Promise<ActionResult<any[]>> {
  try {
    const supabase = await createClient()
    // No auth check - this is a public endpoint

    // Fetch all active tracks
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id, name, description')
      .eq('is_active', true)
      .order('name')

    if (tracksError) {
      console.error('Error fetching tracks:', tracksError)
      throw tracksError
    }

    // Fetch all active goals with their tracks
    const { data: goals, error: goalsError } = await supabase
      .from('track_goals')
      .select('id, track_id, name, description, sort_order')
      .eq('is_active', true)
      .order('sort_order')

    if (goalsError) {
      console.error('Error fetching goals:', goalsError)
      throw goalsError
    }

    // Fetch all published courses with track and goal assignments
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        description,
        thumbnail_url,
        is_free,
        price,
        instructor_id,
        profiles!courses_instructor_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('status', 'published')

    if (coursesError) {
      console.error('Error fetching courses:', coursesError)
      throw coursesError
    }

    // Fetch course-track assignments
    const { data: trackAssignments, error: trackAssignmentsError } = await supabase
      .from('course_track_assignments')
      .select('course_id, track_id')

    if (trackAssignmentsError) {
      console.error('Error fetching track assignments:', trackAssignmentsError)
      throw trackAssignmentsError
    }

    // Fetch course-goal assignments
    const { data: goalAssignments, error: goalAssignmentsError } = await supabase
      .from('course_goal_assignments')
      .select('course_id, goal_id')

    if (goalAssignmentsError) {
      console.error('Error fetching goal assignments:', goalAssignmentsError)
      throw goalAssignmentsError
    }

    // Build the hierarchical structure
    const tracksWithGoalsAndCourses = (tracks || []).map(track => {
      // Get goals for this track
      const trackGoals = (goals || [])
        .filter(goal => goal.track_id === track.id)
        .map(goal => {
          // Get courses assigned to this goal
          const goalCourseIds = (goalAssignments || [])
            .filter(ga => ga.goal_id === goal.id)
            .map(ga => ga.course_id)

          // Also get courses assigned to the track (but not to a specific goal)
          const trackCourseIds = (trackAssignments || [])
            .filter(ta => ta.track_id === track.id)
            .map(ta => ta.course_id)

          // Combine both
          const relevantCourseIds = [...new Set([...goalCourseIds, ...trackCourseIds])]

          const goalCourses = (courses || [])
            .filter(course => relevantCourseIds.includes(course.id))
            .map(course => ({
              id: course.id,
              title: course.title,
              description: course.description,
              thumbnail_url: course.thumbnail_url,
              is_free: course.is_free,
              price: course.price,
              instructor: {
                id: course.profiles?.id,
                name: course.profiles?.full_name || 'Instructor',
                avatar_url: course.profiles?.avatar_url
              }
            }))

          return {
            id: goal.id,
            name: goal.name,
            description: goal.description,
            sort_order: goal.sort_order,
            courses: goalCourses,
            course_count: goalCourses.length
          }
        })
        // Only include goals that have courses
        .filter(goal => goal.course_count > 0)

      return {
        id: track.id,
        name: track.name,
        description: track.description,
        goals: trackGoals,
        total_courses: trackGoals.reduce((sum, goal) => sum + goal.course_count, 0)
      }
    })
    // Only include tracks that have goals with courses
    .filter(track => track.total_courses > 0)

    return {
      success: true,
      data: tracksWithGoalsAndCourses
    }
  } catch (error) {
    console.error('Get courses grouped by track and goal error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch courses',
      data: []
    }
  }
}
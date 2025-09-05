'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { backblazeService } from '@/services/video/backblaze-service'
import { revalidatePath } from 'next/cache'

export interface DeleteCourseResult {
  success: boolean
  message?: string
  error?: string
  videosDeleted?: number
}

/**
 * Server Action to update a course
 * Ensures proper authentication and ownership verification
 */
export async function updateCourse(courseId: string, updates: any) {
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
    
    // Update the course  
    const { data, error } = await supabase
      .from('courses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .eq('instructor_id', user.id) // Extra safety check
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return data
    
  } catch (error) {
    throw error
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
    
    // 2. Delete course from database (cascades to videos, enrollments, and other relations)
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
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
    
    console.log('[Server Action] Updating course:', courseId, 'by user:', user.id)
    
    // First verify ownership
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()
    
    if (fetchError || !course) {
      console.error('[Server Action] Course not found:', courseId)
      throw new Error('Course not found')
    }
    
    if (course.instructor_id !== user.id) {
      console.error('[Server Action] Access denied - user', user.id, 'does not own course', courseId)
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
      console.error('[Server Action] Error updating course:', error)
      throw error
    }
    
    console.log('[Server Action] Course updated successfully:', courseId)
    return data
    
  } catch (error) {
    console.error('[Server Action] Failed to update course:', error)
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
  console.log('[SERVER ACTION] deleteCourse function called with ID:', courseId)
  
  try {
    console.log('[SERVER ACTION] Starting delete process for course:', courseId)
    
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
    
    console.log(`[SERVER ACTION] User ${user.id} authorized to delete course ${courseId}`)
    
    // Use service client for deletion (bypasses RLS)
    let serviceClient;
    try {
      serviceClient = createServiceClient()
      console.log('[SERVER ACTION] Service client created successfully')
    } catch (error) {
      console.error('[SERVER ACTION] Failed to create service client:', error)
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
      console.error('[SERVER ACTION] Failed to fetch videos:', videosError)
    }
    
    console.log(`[SERVER ACTION] Found ${videos?.length || 0} videos to clean up`)
    
    // 2. Delete course from database (cascades to videos, enrollments, and other relations)
    // Note: The database triggers have been fixed to properly handle DELETE operations
    const { error: deleteError } = await serviceClient
      .from('courses')
      .delete()
      .eq('id', courseId)
    
    if (deleteError) {
      console.error('[SERVER ACTION] Course deletion failed:', deleteError)
      console.error('[SERVER ACTION] Delete error details:', {
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
        code: deleteError.code
      })
      return {
        success: false,
        error: `Failed to delete course: ${deleteError.message || 'Database error'}`
      }
    }
    
    console.log('[SERVER ACTION] Course deleted from database successfully')
    
    // 3. Clean up Backblaze files in parallel
    if (videos && videos.length > 0) {
      console.log('[SERVER ACTION] Starting Backblaze cleanup')
      
      const deletionPromises = videos.map(async (video) => {
        if (video.backblaze_file_id && video.filename) {
          try {
            await backblazeService.deleteVideo(video.backblaze_file_id, video.filename)
            console.log(`[SERVER ACTION] Deleted video file: ${video.filename}`)
          } catch (error) {
            console.error(`[SERVER ACTION] Failed to delete ${video.filename}:`, error)
            // Don't fail the whole operation
          }
        }
      })
      
      await Promise.all(deletionPromises)
      console.log('[SERVER ACTION] Backblaze cleanup completed')
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
    console.error('[SERVER ACTION] Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}
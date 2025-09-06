'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { backblazeService } from '@/services/video/backblaze-service'
import { revalidatePath } from 'next/cache'

// Result types
export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
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
 * Upload a video to Backblaze and create database record
 */
export async function uploadVideoAction(
  file: File,
  courseId: string,
  chapterId: string = 'chapter-1'
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()
    
    if (courseError || !course) {
      throw new Error('Course not found')
    }
    
    if (course.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }
    
    // Convert File to Buffer for Backblaze
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload to Backblaze
    const uploadResult = await backblazeService.uploadVideo(buffer, file.name)
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Failed to upload to Backblaze')
    }
    
    // Get next order position
    const { data: lastVideo } = await supabase
      .from('videos')
      .select('order')
      .eq('course_id', courseId)
      .eq('chapter_id', chapterId)
      .order('order', { ascending: false })
      .limit(1)
      .single()
    
    const nextOrder = (lastVideo?.order || -1) + 1
    
    // Create video record
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        filename: file.name,
        url: uploadResult.url,
        backblaze_file_id: uploadResult.fileId,
        course_id: courseId,
        chapter_id: chapterId,
        order: nextOrder,
        file_size: file.size,
        status: 'ready',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (videoError) throw videoError
    
    revalidatePath(`/instructor/course/${courseId}`)
    
    return { success: true, data: video }
  } catch (error) {
    console.error('Upload video error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload video'
    }
  }
}

/**
 * Delete a video from database and Backblaze
 */
export async function deleteVideoAction(videoId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Get video details and verify ownership
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select(`
        *,
        courses!inner (
          instructor_id
        )
      `)
      .eq('id', videoId)
      .single()
    
    if (fetchError || !video) {
      throw new Error('Video not found')
    }
    
    if (video.courses.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this video')
    }
    
    // Delete from Backblaze
    if (video.backblaze_file_id && video.filename) {
      try {
        await backblazeService.deleteVideo(video.backblaze_file_id, video.filename)
      } catch (error) {
        console.error('Backblaze deletion error:', error)
        // Continue with database deletion even if Backblaze fails
      }
    }
    
    // Delete from database
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)
    
    if (deleteError) throw deleteError
    
    revalidatePath(`/instructor/course/${video.course_id}`)
    
    return { success: true, message: 'Video deleted successfully' }
  } catch (error) {
    console.error('Delete video error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete video'
    }
  }
}

/**
 * Reorder videos within a chapter
 */
export async function reorderVideosAction(
  courseId: string,
  chapterId: string,
  videoIds: string[]
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()
    
    if (courseError || !course) {
      throw new Error('Course not found')
    }
    
    if (course.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }
    
    // First, reset all video orders in the chapter to null to avoid conflicts
    const { error: resetError } = await supabase
      .from('videos')
      .update({ 
        order: null,
        updated_at: new Date().toISOString()
      })
      .eq('course_id', courseId)
      .eq('chapter_id', chapterId)
    
    if (resetError) throw resetError
    
    // Update each video with its new order
    for (let i = 0; i < videoIds.length; i++) {
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          order: i,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoIds[i])
        .eq('course_id', courseId)
    
      if (updateError) throw updateError
    }
    
    revalidatePath(`/instructor/course/${courseId}`)
    
    return { success: true, message: 'Videos reordered successfully' }
  } catch (error) {
    console.error('Reorder videos error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder videos'
    }
  }
}

/**
 * Move a video to a different chapter
 */
export async function moveVideoToChapterAction(
  videoId: string,
  newChapterId: string,
  newOrder: number
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Get video and verify ownership
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select(`
        *,
        courses!inner (
          instructor_id
        )
      `)
      .eq('id', videoId)
      .single()
    
    if (fetchError || !video) {
      throw new Error('Video not found')
    }
    
    if (video.courses.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this video')
    }
    
    // Update video with new chapter and order
    const { data: updatedVideo, error: updateError } = await supabase
      .from('videos')
      .update({
        chapter_id: newChapterId,
        order: newOrder,
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId)
      .select()
      .single()
    
    if (updateError) throw updateError
    
    revalidatePath(`/instructor/course/${video.course_id}`)
    
    return { success: true, data: updatedVideo }
  } catch (error) {
    console.error('Move video error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to move video'
    }
  }
}

/**
 * Update video metadata (title, description, etc.)
 */
export async function updateVideoAction(
  videoId: string,
  updates: {
    title?: string
    description?: string
    thumbnail_url?: string
  }
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Get video and verify ownership
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select(`
        *,
        courses!inner (
          instructor_id
        )
      `)
      .eq('id', videoId)
      .single()
    
    if (fetchError || !video) {
      throw new Error('Video not found')
    }
    
    if (video.courses.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this video')
    }
    
    // Update video
    const { data: updatedVideo, error: updateError } = await supabase
      .from('videos')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId)
      .select()
      .single()
    
    if (updateError) throw updateError
    
    revalidatePath(`/instructor/course/${video.course_id}`)
    
    return { success: true, data: updatedVideo }
  } catch (error) {
    console.error('Update video error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update video'
    }
  }
}

/**
 * Get videos for a specific chapter
 */
export async function getVideosForChapterAction(
  courseId: string,
  chapterId?: string
) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()
    
    if (courseError || !course) {
      throw new Error('Course not found')
    }
    
    if (course.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }
    
    // Build query
    let query = supabase
      .from('videos')
      .select('*')
      .eq('course_id', courseId)
    
    if (chapterId) {
      query = query.eq('chapter_id', chapterId)
    }
    
    const { data: videos, error } = await query
      .order('order', { ascending: true })
    
    if (error) throw error
    
    return videos || []
  } catch (error) {
    console.error('Get videos error:', error)
    throw error
  }
}

/**
 * Batch update video orders (used for complex reordering operations)
 */
export async function batchUpdateVideoOrdersAction(
  courseId: string,
  updates: Array<{
    id: string
    order: number
    chapter_id: string
    title?: string
  }>
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()
    
    if (courseError || !course) {
      throw new Error('Course not found')
    }
    
    if (course.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }
    
    // Get all unique chapter IDs from updates
    const chapterIds = [...new Set(updates.map(u => u.chapter_id))]
    
    // Reset orders for all affected chapters
    const { error: resetError } = await supabase
      .from('videos')
      .update({ 
        order: null,
        updated_at: new Date().toISOString()
      })
      .eq('course_id', courseId)
      .in('chapter_id', chapterIds)
    
    if (resetError) throw resetError
    
    // Sort updates by order to apply them sequentially
    const sortedUpdates = [...updates].sort((a, b) => a.order - b.order)
    
    // Apply each update
    for (const update of sortedUpdates) {
      const updateData: any = {
        order: update.order,
        chapter_id: update.chapter_id,
        updated_at: new Date().toISOString()
      }
      
      if (update.title !== undefined) {
        updateData.title = update.title
      }
      
      const { error: updateError } = await supabase
        .from('videos')
        .update(updateData)
        .eq('id', update.id)
        .eq('course_id', courseId)
      
      if (updateError) throw updateError
    }
    
    revalidatePath(`/instructor/course/${courseId}`)
    
    return { success: true, message: 'Videos updated successfully' }
  } catch (error) {
    console.error('Batch update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update videos'
    }
  }
}
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
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Extract parameters from FormData
    const file = formData.get('file') as File
    const courseId = formData.get('courseId') as string
    const chapterId = formData.get('chapterId') as string || 'chapter-1'
    
    if (!file || !courseId) {
      throw new Error('Missing required fields: file and courseId')
    }
    
    console.log('[SERVER ACTION] Processing upload:', {
      fileName: file.name,
      fileSize: file.size,
      courseId,
      chapterId
    })
    
    console.log('[SERVER ACTION] Environment check:', {
      hasBackblazeKeyId: !!process.env.BACKBLAZE_APPLICATION_KEY_ID,
      hasBackblazeKey: !!process.env.BACKBLAZE_APPLICATION_KEY,
      hasBucketName: !!process.env.BACKBLAZE_BUCKET_NAME,
      hasBucketId: !!process.env.BACKBLAZE_BUCKET_ID
    })
    
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
    
    // Generate structured file path like professional platforms
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const structuredPath = `courses/${courseId}/chapters/${chapterId}/${crypto.randomUUID()}_${sanitizedFileName}`
    
    console.log('[SERVER ACTION] Structured path:', structuredPath)
    
    // Upload to Backblaze with structured path
    console.log('[SERVER ACTION] Starting Backblaze upload...')
    const uploadResult = await backblazeService.uploadVideo(file, structuredPath)
    console.log('[SERVER ACTION] Backblaze upload result:', uploadResult)
    
    // uploadResult returns { fileId, fileName, fileUrl, ... }
    if (!uploadResult.fileUrl) {
      throw new Error('Failed to upload to Backblaze - no file URL returned')
    }
    
    // Get next order position - handle both null and numeric orders
    const { data: existingVideos, error: orderError } = await supabase
      .from('videos')
      .select('order')
      .eq('course_id', courseId)
      .eq('chapter_id', chapterId)
      .order('order', { ascending: false, nullsFirst: false })
    
    if (orderError) {
      console.log('[SERVER ACTION] Order query error:', orderError)
      throw orderError
    }
    
    // Calculate next order - handle both existing videos and null orders
    let nextOrder = 0
    if (existingVideos && existingVideos.length > 0) {
      // Find the highest non-null order
      const validOrders = existingVideos
        .map(v => v.order)
        .filter(order => order !== null && typeof order === 'number')
        .sort((a, b) => b - a) // Sort descending
      
      nextOrder = validOrders.length > 0 ? validOrders[0] + 1 : existingVideos.length
    }
    
    console.log('[SERVER ACTION] Order calculation:', {
      existingVideosCount: existingVideos?.length || 0,
      existingOrders: existingVideos?.map(v => v.order) || [],
      nextOrder
    })
    
    // Create video record
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        filename: uploadResult.fileName, // Store Backblaze structured path for deletion
        video_url: uploadResult.fileUrl, // Use video_url instead of url
        backblaze_file_id: uploadResult.fileId,
        course_id: courseId,
        chapter_id: chapterId,
        order: nextOrder,
        file_size: file.size,
        status: 'complete',
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
    
    console.log('[SERVER ACTION] Starting video deletion:', {
      videoId,
      backblazeFileId: video.backblaze_file_id,
      filename: video.filename,
      hasBackblazeData: !!(video.backblaze_file_id && video.filename)
    })
    
    // Delete from Backblaze - filename now contains the structured path
    if (video.backblaze_file_id && video.filename) {
      try {
        console.log('[SERVER ACTION] Deleting from Backblaze:', {
          fileId: video.backblaze_file_id,
          fileName: video.filename
        })
        await backblazeService.deleteVideo(video.backblaze_file_id, video.filename)
        console.log('[SERVER ACTION] Backblaze deletion successful')
      } catch (error) {
        console.error('[SERVER ACTION] Backblaze deletion error:', error)
        // Continue with database deletion even if Backblaze fails
      }
    } else {
      console.log('[SERVER ACTION] No Backblaze data found, skipping Backblaze deletion')
    }
    
    // Delete from database
    console.log('[SERVER ACTION] Deleting from Supabase database:', videoId)
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)
    
    if (deleteError) {
      console.error('[SERVER ACTION] Supabase deletion error:', deleteError)
      throw deleteError
    }
    
    console.log('[SERVER ACTION] Supabase deletion successful')
    revalidatePath(`/instructor/course/${video.course_id}`)
    
    console.log('[SERVER ACTION] Video deletion completed successfully')
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
    
    console.log('[SERVER ACTION] Batch updating videos:', updates)
    
    // For title-only updates (no order/chapter changes), we can update directly
    const titleOnlyUpdates = updates.filter(u => u.title !== undefined && u.order === undefined && u.chapter_id === undefined)
    const orderUpdates = updates.filter(u => u.order !== undefined && u.chapter_id !== undefined)
    
    console.log('[SERVER ACTION] Title-only updates:', titleOnlyUpdates.length)
    console.log('[SERVER ACTION] Order updates:', orderUpdates.length)
    
    // First, handle title-only updates (no constraint issues)
    for (const update of titleOnlyUpdates) {
      const updateData: any = {
        title: update.title,
        updated_at: new Date().toISOString()
      }
      
      console.log(`[SERVER ACTION] Updating video ${update.id} title: ${update.title}`)
      
      const { error: updateError } = await supabase
        .from('videos')
        .update(updateData)
        .eq('id', update.id)
        .eq('course_id', courseId)
      
      if (updateError) {
        console.error('[SERVER ACTION] Title update failed for video:', update.id, updateError)
        throw updateError
      }
      
      console.log(`[SERVER ACTION] Successfully updated video ${update.id} title`)
    }
    
    // Then handle order updates if any (with constraint handling)
    for (const update of orderUpdates) {
      const updateData: any = {
        order: update.order,
        chapter_id: update.chapter_id,
        updated_at: new Date().toISOString()
      }
      
      if (update.title !== undefined) {
        updateData.title = update.title
        console.log(`[SERVER ACTION] Updating video ${update.id} title + order: ${update.title}`)
      }
      
      const { error: updateError } = await supabase
        .from('videos')
        .update(updateData)
        .eq('id', update.id)
        .eq('course_id', courseId)
      
      if (updateError) {
        console.error('[SERVER ACTION] Order update failed for video:', update.id, updateError)
        throw updateError
      }
      
      console.log(`[SERVER ACTION] Successfully updated video ${update.id}`)
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
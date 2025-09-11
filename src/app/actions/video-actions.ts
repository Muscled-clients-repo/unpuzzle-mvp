'use server'

import { createClient } from '@/lib/supabase/server'
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

// Helper function to broadcast WebSocket messages from Server Actions
async function broadcastWebSocketMessage(message: {
  type: string
  courseId: string
  operationId?: string
  data: any
  timestamp: number
}) {
  try {
    console.log(`📤 [WEBSOCKET] Broadcasting to server:`, message.type)
    const response = await fetch('http://localhost:8080/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    })
    
    if (response.ok) {
      console.log(`✅ [WEBSOCKET] Broadcast successful: ${message.type}`)
    } else {
      console.warn(`⚠️ [WEBSOCKET] Broadcast failed: ${response.status}`)
    }
  } catch (error) {
    console.warn(`⚠️ [WEBSOCKET] Broadcast error (server may be offline):`, error.message)
  }
}

/**
 * Upload a video to Backblaze and create database record
 * Now with WebSocket progress updates!
 */
export async function uploadVideoAction({
  file,
  courseId,
  chapterId,
  operationId,
  onProgress
}: {
  file: File
  courseId: string
  chapterId: string
  operationId?: string
  onProgress?: (progress: number) => void
}): Promise<ActionResult & { operationId?: string }> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    if (!file || !courseId) {
      throw new Error('Missing required fields: file and courseId')
    }
    
    // Default chapter if not provided
    if (!chapterId) {
      chapterId = 'chapter-1'
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
    
    // Upload to Backblaze with structured path and progress tracking
    console.log(`[SERVER ACTION] Starting Backblaze upload with operationId: ${operationId || 'none'}`)
    
    // Initialize progress tracking if operationId provided
    if (operationId) {
      console.log(`📈 [UPLOAD PROGRESS] Starting progress tracking for ${operationId}`)
    }
    
    const uploadResult = await backblazeService.uploadVideo(
      file, 
      structuredPath,
      // Server-side progress callback - broadcast via WebSocket
      operationId ? (progressData) => {
        console.log(`📈 [UPLOAD PROGRESS] Server progress: ${progressData.percentage}% for operation ${operationId}`)
        
        // Broadcast progress via WebSocket to all connected clients
        broadcastWebSocketMessage({
          type: 'upload-progress',
          courseId,
          operationId,
          data: {
            operationId,
            courseId,
            progress: progressData.percentage,
            bytes: progressData.bytes,
            total: progressData.total
          },
          timestamp: Date.now()
        })
        
        // Call legacy progress callback if provided
        if (onProgress) {
          onProgress(progressData.percentage)
        }
      } : (progressData) => {
        console.log(`📈 [UPLOAD PROGRESS] Progress callback (no operationId): ${progressData.percentage}%`)
      }
    )
    
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
    
    // Create private URL format for signed URL system
    const privateUrl = `private:${uploadResult.fileId}:${uploadResult.fileName}`
    console.log('[SERVER ACTION] Generated private URL format:', privateUrl)

    // Create video record
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        filename: uploadResult.fileName, // Store Backblaze structured path for deletion
        video_url: privateUrl, // Store private URL format for signed URL generation
        backblaze_file_id: uploadResult.fileId,
        backblaze_url: uploadResult.fileUrl, // Store direct URL as backup
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
    
    // Upload completion event
    if (operationId) {
      console.log(`📈 [UPLOAD PROGRESS] Upload completed for operation ${operationId}`)
      
      // Broadcast completion via WebSocket
      broadcastWebSocketMessage({
        type: 'upload-complete',
        courseId,
        operationId,
        data: {
          operationId,
          courseId,
          videoId: video.id,
          chapterId: chapterId
        },
        timestamp: Date.now()
      })
    }
    
    return { success: true, data: video, operationId }
  } catch (error) {
    console.error('Upload video error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload video'
    }
  }
}

/**
 * Unlink a media library video from chapter (keeps file in media library)
 */
export async function unlinkVideoAction(videoId: string): Promise<ActionResult> {
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
    
    // Verify ownership
    if (video.courses.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }
    
    // Check if this is a media library video (has media_file_id)
    if (!video.media_file_id) {
      throw new Error('This video cannot be unlinked - use delete instead for directly uploaded videos')
    }
    
    console.log('[SERVER ACTION] Unlinking media library video:', {
      videoId,
      mediaFileId: video.media_file_id,
      keepingInLibrary: true
    })
    
    // Only delete video record from database (keep media file in library)
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)
    
    if (deleteError) {
      console.error('[SERVER ACTION] Video unlink error:', deleteError)
      throw deleteError
    }
    
    // Remove usage tracking
    const { error: usageError } = await supabase
      .from('media_usage')
      .delete()
      .eq('media_file_id', video.media_file_id)
      .eq('resource_type', 'chapter')
      .eq('resource_id', video.chapter_id)
    
    if (usageError) {
      console.warn('[SERVER ACTION] Usage tracking removal failed:', usageError)
      // Don't throw - this is not critical
    }
    
    console.log('[SERVER ACTION] Video unlinked successfully (media file preserved in library)')
    revalidatePath(`/instructor/course/${video.course_id}`)
    
    return { success: true, message: 'Video unlinked from chapter (preserved in media library)' }
  } catch (error) {
    console.error('Unlink video error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlink video'
    }
  }
}

/**
 * Delete a video from database and Backblaze (for directly uploaded videos only)
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
    
    // Check if this is a directly uploaded video (no media_file_id)
    if (video.media_file_id) {
      throw new Error('This video cannot be deleted - use unlink instead for media library videos')
    }
    
    console.log('[SERVER ACTION] Starting video deletion:', {
      videoId,
      backblazeFileId: video.backblaze_file_id,
      filename: video.filename,
      hasBackblazeData: !!(video.backblaze_file_id && video.filename),
      isDirectUpload: true
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
    order?: number
    chapter_id?: string
    title?: string
  }>,
  operationId?: string
): Promise<ActionResult & { operationId?: string; immediate?: boolean }> {
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
    
    // If operationId provided, this is WebSocket-enabled
    if (operationId) {
      console.log(`[WEBSOCKET] Video batch update completed for operation: ${operationId}`)
      
      // Emit WebSocket completion event (real server or simulator)
      webSocketEventSimulator.simulateVideoUpdateComplete(operationId, courseId, { updates })
      
      return { 
        success: true, 
        operationId,
        immediate: true,
        message: 'Video update started - WebSocket will confirm completion'
      }
    }
    
    // Legacy synchronous response
    return { success: true, message: 'Videos updated successfully' }
  } catch (error) {
    console.error('Batch update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update videos'
    }
  }
}

/**
 * Link existing media file to course chapter
 * Phase 4B: Reuses all existing patterns from video-actions.ts
 */
export async function linkMediaToChapterAction(
  mediaId: string,
  chapterId: string,
  courseId: string
): Promise<ActionResult> {
  console.log('🚀 [MEDIA LINKING] Function called with:', { mediaId, chapterId, courseId })
  try {
    const user = await requireAuth() // REUSE: Line 16-25 pattern
    const supabase = await createClient()
    
    console.log('[MEDIA LINKING] Starting link process:', { mediaId, chapterId, courseId })
    
    // REUSE: Course ownership verification (same as line 100-112)
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
    
    // REUSE: Media ownership verification (same pattern as media-actions.ts)
    const { data: mediaFile, error: mediaError } = await supabase
      .from('media_files')
      .select('*')
      .eq('id', mediaId)
      .eq('uploaded_by', user.id)
      .single()
    
    if (mediaError || !mediaFile) {
      throw new Error('Media file not found or unauthorized')
    }
    
    // Check for duplicate linking (prevent same media in same chapter)
    const { data: duplicateCheck, error: duplicateError } = await supabase
      .from('videos')
      .select('id')
      .eq('course_id', courseId)
      .eq('chapter_id', chapterId)
      .eq('media_file_id', mediaId)
      .single()
    
    if (duplicateCheck) {
      throw new Error('This media file is already linked to this chapter')
    }
    
    // REUSE: Next order calculation (same as lines 166-195)
    const { data: existingVideos, error: orderError } = await supabase
      .from('videos')
      .select('order')
      .eq('course_id', courseId)
      .eq('chapter_id', chapterId)
      .order('order', { ascending: false, nullsFirst: false })
    
    if (orderError) {
      console.log('[MEDIA LINKING] Order query error:', orderError)
      throw orderError
    }
    
    // REUSE: Order calculation logic (same as lines 181-195)
    let nextOrder = 0
    if (existingVideos && existingVideos.length > 0) {
      const validOrders = existingVideos
        .map(v => v.order)
        .filter(order => order !== null && typeof order === 'number')
        .sort((a, b) => b - a)
      
      nextOrder = validOrders.length > 0 ? validOrders[0] + 1 : existingVideos.length
    }
    
    console.log('[MEDIA LINKING] Calculated next order:', nextOrder)
    
    // REUSE: Video record creation (same structure as lines 202-219)
    const { data: linkedVideo, error: linkError } = await supabase
      .from('videos')
      .insert({
        title: mediaFile.name, // Use media file name as video title
        filename: mediaFile.name, // Store original filename
        video_url: mediaFile.cdn_url, // Use CDN URL for playback
        backblaze_file_id: mediaFile.backblaze_file_id,
        backblaze_url: mediaFile.backblaze_url,
        course_id: courseId,
        chapter_id: chapterId,
        order: nextOrder,
        file_size: mediaFile.file_size,
        status: 'complete', // Media files are already processed
        media_file_id: mediaId, // NEW: Link to original media file
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (linkError) {
      console.error('[MEDIA LINKING] Video creation error:', linkError)
      throw linkError
    }
    
    console.log('[MEDIA LINKING] Video created successfully:', linkedVideo.id)
    
    // NEW: Track usage for delete protection
    // Since chapters use text IDs, we need to handle this differently
    // For now, let's use the video ID as the resource_id since videos have UUIDs
    const { error: usageError } = await supabase
      .from('media_usage')
      .insert({
        media_file_id: mediaId,
        resource_type: 'chapter',
        resource_id: linkedVideo.id, // Use video UUID instead of chapter text ID
        course_id: courseId
      })
    
    if (usageError) {
      console.error('[MEDIA LINKING] Usage tracking error:', usageError)
      console.error('[MEDIA LINKING] Failed to insert:', { mediaId, chapterId, courseId })
      // Don't fail the operation for usage tracking errors
    } else {
      console.log('[MEDIA LINKING] Usage tracking successful for:', { mediaId, chapterId, courseId })
    }
    
    // NEW: Update usage count in media_files
    const { error: updateError } = await supabase
      .from('media_files')
      .update({
        usage_count: (mediaFile.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', mediaId)
    
    if (updateError) {
      console.error('[MEDIA LINKING] Usage count update error:', updateError)
      // Don't fail the operation for usage count errors
    }
    
    // REUSE: Path revalidation (same as line 223)
    revalidatePath(`/instructor/course/${courseId}`)
    
    // Broadcast media link event via WebSocket for real-time UI updates
    // Add small delay to ensure database transaction is committed
    setTimeout(() => {
      broadcastWebSocketMessage({
        type: 'media-linked',
        courseId,
        data: {
          videoId: linkedVideo.id,
          chapterId: chapterId,
          mediaFileId: mediaId,
          title: linkedVideo.title
        },
        timestamp: Date.now()
      })
    }, 100)
    
    console.log('[MEDIA LINKING] Link operation completed successfully')
    
    return { 
      success: true, 
      data: linkedVideo,
      message: `Successfully linked ${mediaFile.name} to chapter`
    }
  } catch (error) {
    console.error('Link media to chapter error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to link media to chapter'
    }
  }
}
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ChapterVideo, MediaFile } from '@/types/course'

export interface ActionResult<T = unknown> {
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
 * Link media file to chapter using JSONB architecture
 * Adds video reference to chapter.videos JSONB array
 */
export async function linkMediaToChapterAction(
  mediaId: string,
  chapterId: string,
  customTitle?: string
): Promise<ActionResult> {
  try {
    console.log('🔗 [JSONB LINK] Starting linkMediaToChapterAction:', { mediaId, chapterId, customTitle })
    const user = await requireAuth()
    const supabase = await createClient()

    // Get media file details
    const { data: mediaFile, error: mediaError } = await supabase
      .from('media_files')
      .select('*')
      .eq('id', mediaId)
      .single()

    if (mediaError || !mediaFile) {
      throw new Error('Media file not found')
    }

    if (mediaFile.uploaded_by !== user.id) {
      throw new Error('Unauthorized: You do not own this media file')
    }

    // Get current chapter and verify ownership
    const { data: chapter, error: chapterError } = await supabase
      .from('course_chapters')
      .select('id, course_id, videos')
      .eq('id', chapterId)
      .single()

    if (chapterError || !chapter) {
      throw new Error('Chapter not found')
    }

    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', chapter.course_id)
      .single()

    if (courseError || !course) {
      throw new Error('Course not found')
    }

    if (course.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    // Get current videos array from JSONB
    const currentVideos: ChapterVideo[] = chapter.videos || []

    // Check if media file is already linked to this chapter
    const existingVideo = currentVideos.find(v => v.media_file_id === mediaId)
    if (existingVideo) {
      throw new Error('Media file is already linked to this chapter')
    }

    // Calculate next order
    const nextOrder = currentVideos.length + 1

    // Create new video reference
    const displayTitle = customTitle || mediaFile.original_name || mediaFile.name
    // Clean up the title (remove file extension if present)
    const cleanTitle = displayTitle.replace(/\.[^/.]+$/, '')

    const newVideo: ChapterVideo = {
      media_file_id: mediaId,
      order: nextOrder,
      title: cleanTitle
    }

    console.log('🔗 [JSONB LINK] Created video object:', newVideo)

    // Update chapter with new video in JSONB array
    const { error: updateError } = await supabase
      .from('course_chapters')
      .update({
        videos: [...currentVideos, newVideo],
        updated_at: new Date().toISOString()
      })
      .eq('id', chapterId)

    if (updateError) {
      console.error('🔗 [JSONB LINK] Update error:', updateError)
      throw updateError
    }

    console.log('🔗 [JSONB LINK] Successfully updated chapter with video')

    revalidatePath(`/instructor/course/${chapter.course_id}`)

    return {
      success: true,
      data: newVideo,
      message: `Media "${cleanTitle}" linked to chapter successfully`
    }
  } catch (error) {
    console.error('Link media to chapter error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to link media to chapter'
    }
  }
}

/**
 * Remove video from chapter using JSONB architecture
 * Removes video reference from chapter.videos JSONB array and reorders remaining videos
 */
export async function removeVideoFromChapterAction(
  chapterId: string,
  mediaFileId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get current chapter and verify ownership
    const { data: chapter, error: chapterError } = await supabase
      .from('course_chapters')
      .select('id, course_id, videos')
      .eq('id', chapterId)
      .single()

    if (chapterError || !chapter) {
      throw new Error('Chapter not found')
    }

    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', chapter.course_id)
      .single()

    if (courseError || !course) {
      throw new Error('Course not found')
    }

    if (course.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    // Get current videos array
    const currentVideos: ChapterVideo[] = chapter.videos || []

    // Remove the video and reorder remaining videos
    const updatedVideos = currentVideos
      .filter(v => v.media_file_id !== mediaFileId)
      .map((video, index) => ({
        ...video,
        order: index + 1
      }))

    // Update chapter with filtered and reordered videos
    const { error: updateError } = await supabase
      .from('course_chapters')
      .update({
        videos: updatedVideos,
        updated_at: new Date().toISOString()
      })
      .eq('id', chapterId)

    if (updateError) throw updateError

    revalidatePath(`/instructor/course/${chapter.course_id}`)

    return {
      success: true,
      message: 'Video removed from chapter successfully'
    }
  } catch (error) {
    console.error('Remove video from chapter error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove video from chapter'
    }
  }
}

/**
 * Reorder videos within a chapter using JSONB architecture
 * Updates the order field for all videos in the chapter.videos JSONB array
 */
export async function reorderChapterVideosAction(
  chapterId: string,
  videoOrders: { media_file_id: string; new_order: number }[]
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get current chapter and verify ownership
    const { data: chapter, error: chapterError } = await supabase
      .from('course_chapters')
      .select('id, course_id, videos')
      .eq('id', chapterId)
      .single()

    if (chapterError || !chapter) {
      throw new Error('Chapter not found')
    }

    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', chapter.course_id)
      .single()

    if (courseError || !course) {
      throw new Error('Course not found')
    }

    if (course.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    // Get current videos array
    const currentVideos: ChapterVideo[] = chapter.videos || []

    // Create order map for quick lookup
    const orderMap = new Map(
      videoOrders.map(vo => [vo.media_file_id, vo.new_order])
    )

    // Update orders and sort
    const updatedVideos = currentVideos
      .map(video => ({
        ...video,
        order: orderMap.get(video.media_file_id) || video.order
      }))
      .sort((a, b) => a.order - b.order)

    // Update chapter with reordered videos
    const { error: updateError } = await supabase
      .from('course_chapters')
      .update({
        videos: updatedVideos,
        updated_at: new Date().toISOString()
      })
      .eq('id', chapterId)

    if (updateError) throw updateError

    revalidatePath(`/instructor/course/${chapter.course_id}`)

    return {
      success: true,
      message: 'Videos reordered successfully'
    }
  } catch (error) {
    console.error('Reorder chapter videos error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder videos'
    }
  }
}

/**
 * Update video title within a chapter using JSONB architecture
 */
export async function updateVideoTitleInChapterAction(
  chapterId: string,
  mediaFileId: string,
  newTitle: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get current chapter and verify ownership
    const { data: chapter, error: chapterError } = await supabase
      .from('course_chapters')
      .select('id, course_id, videos')
      .eq('id', chapterId)
      .single()

    if (chapterError || !chapter) {
      throw new Error('Chapter not found')
    }

    // Verify course ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', chapter.course_id)
      .single()

    if (courseError || !course) {
      throw new Error('Course not found')
    }

    if (course.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    // Get current videos array and update the specific video's title
    const currentVideos: ChapterVideo[] = chapter.videos || []

    const updatedVideos = currentVideos.map(video =>
      video.media_file_id === mediaFileId
        ? { ...video, title: newTitle }
        : video
    )

    // Update chapter with updated video title
    const { error: updateError } = await supabase
      .from('course_chapters')
      .update({
        videos: updatedVideos,
        updated_at: new Date().toISOString()
      })
      .eq('id', chapterId)

    if (updateError) throw updateError

    revalidatePath(`/instructor/course/${chapter.course_id}`)

    return {
      success: true,
      message: 'Video title updated successfully'
    }
  } catch (error) {
    console.error('Update video title error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update video title'
    }
  }
}
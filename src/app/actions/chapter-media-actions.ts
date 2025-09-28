'use server'

import { createClient } from '@/lib/supabase/server'
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
 * Link existing media file to course chapter (INDUSTRY STANDARD: Unlink-only in course editing)
 */
export async function linkMediaToChapterAction(
  mediaId: string,
  chapterId: string,
  customTitle?: string
): Promise<ActionResult> {
  console.log('🔗 [CHAPTER MEDIA] Linking media to chapter:', { mediaId, chapterId, customTitle })

  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get course ID from chapter for ownership verification
    const { data: chapter, error: chapterError } = await supabase
      .from('course_chapters')
      .select(`
        course_id,
        courses!inner (
          instructor_id
        )
      `)
      .eq('id', chapterId)
      .single()

    if (chapterError || !chapter) {
      throw new Error('Chapter not found')
    }

    // Verify course ownership
    if (chapter.courses.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    // Verify media ownership
    const { data: mediaFile, error: mediaError } = await supabase
      .from('media_files')
      .select('*')
      .eq('id', mediaId)
      .eq('uploaded_by', user.id)
      .single()

    if (mediaError || !mediaFile) {
      throw new Error('Media file not found or unauthorized')
    }

    // Check for duplicate linking
    const { data: duplicate } = await supabase
      .from('course_chapter_media')
      .select('id')
      .eq('chapter_id', chapterId)
      .eq('media_file_id', mediaId)
      .single()

    if (duplicate) {
      throw new Error('This media file is already linked to this chapter')
    }

    // Calculate next order position
    const { data: maxOrder } = await supabase
      .from('course_chapter_media')
      .select('order_in_chapter')
      .eq('chapter_id', chapterId)
      .order('order_in_chapter', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrder?.order_in_chapter || 0) + 1

    // Create junction record
    const { data: junction, error: linkError } = await supabase
      .from('course_chapter_media')
      .insert({
        chapter_id: chapterId,
        media_file_id: mediaId,
        order_in_chapter: nextOrder,
        title: customTitle || null
      })
      .select(`
        *,
        media_files (
          id,
          name,
          file_type,
          file_size,
          duration_seconds,
          cdn_url,
          thumbnail_url
        )
      `)
      .single()

    if (linkError) {
      console.error('🔗 [CHAPTER MEDIA] Link error:', linkError)
      throw linkError
    }

    // Update usage tracking
    const { error: usageError } = await supabase
      .from('media_usage')
      .insert({
        media_file_id: mediaId,
        resource_type: 'chapter',
        resource_id: junction.id, // Use junction ID
        course_id: chapter.course_id
      })

    if (usageError) {
      console.warn('🔗 [CHAPTER MEDIA] Usage tracking failed:', usageError)
    }

    // Update media file usage count
    await supabase
      .from('media_files')
      .update({
        usage_count: (mediaFile.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', mediaId)

    revalidatePath(`/instructor/course/${chapter.course_id}`)

    console.log('✅ [CHAPTER MEDIA] Successfully linked media to chapter')

    return {
      success: true,
      data: junction,
      message: `Successfully linked ${mediaFile.name} to chapter`
    }
  } catch (error) {
    console.error('🔗 [CHAPTER MEDIA] Link error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to link media to chapter'
    }
  }
}

/**
 * Unlink media from chapter (INDUSTRY STANDARD: Preserve media in library)
 */
export async function unlinkMediaFromChapterAction(
  junctionId: string
): Promise<ActionResult> {
  console.log('🔓 [CHAPTER MEDIA] Unlinking media from chapter:', junctionId)

  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get junction record with ownership verification
    const { data: junction, error: fetchError } = await supabase
      .from('course_chapter_media')
      .select(`
        *,
        course_chapters!inner (
          course_id,
          courses!inner (
            instructor_id
          )
        ),
        media_files (
          name,
          usage_count
        )
      `)
      .eq('id', junctionId)
      .single()

    if (fetchError || !junction) {
      throw new Error('Media link not found')
    }

    // Verify ownership
    if (junction.course_chapters.courses.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    // Delete junction record (preserves media file in library)
    const { error: deleteError } = await supabase
      .from('course_chapter_media')
      .delete()
      .eq('id', junctionId)

    if (deleteError) {
      throw deleteError
    }

    // Remove usage tracking
    await supabase
      .from('media_usage')
      .delete()
      .eq('resource_id', junctionId)
      .eq('resource_type', 'chapter')

    // Update media file usage count
    const newCount = Math.max(0, (junction.media_files.usage_count || 1) - 1)
    await supabase
      .from('media_files')
      .update({ usage_count: newCount })
      .eq('id', junction.media_file_id)

    revalidatePath(`/instructor/course/${junction.course_chapters.course_id}`)

    console.log('✅ [CHAPTER MEDIA] Successfully unlinked media from chapter')

    return {
      success: true,
      message: `Unlinked ${junction.media_files.name} from chapter (preserved in media library)`
    }
  } catch (error) {
    console.error('🔓 [CHAPTER MEDIA] Unlink error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlink media from chapter'
    }
  }
}

/**
 * Reorder media within a chapter
 */
export async function reorderChapterMediaAction(
  chapterId: string,
  newOrder: Array<{ junctionId: string, newPosition: number }>
): Promise<ActionResult> {
  console.log('🔄 [CHAPTER MEDIA] Reordering media in chapter:', { chapterId, itemCount: newOrder.length })

  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Verify chapter ownership
    const { data: chapter, error: chapterError } = await supabase
      .from('course_chapters')
      .select(`
        course_id,
        courses!inner (
          instructor_id
        )
      `)
      .eq('id', chapterId)
      .single()

    if (chapterError || !chapter) {
      throw new Error('Chapter not found')
    }

    if (chapter.courses.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    // Update all positions in a transaction-like manner
    for (const item of newOrder) {
      const { error: updateError } = await supabase
        .from('course_chapter_media')
        .update({
          order_in_chapter: item.newPosition,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.junctionId)
        .eq('chapter_id', chapterId) // Security check

      if (updateError) {
        throw updateError
      }
    }

    revalidatePath(`/instructor/course/${chapter.course_id}`)

    console.log('✅ [CHAPTER MEDIA] Successfully reordered chapter media')

    return {
      success: true,
      message: 'Media reordered successfully'
    }
  } catch (error) {
    console.error('🔄 [CHAPTER MEDIA] Reorder error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder media'
    }
  }
}

/**
 * Update custom title for media in specific chapter
 */
export async function updateMediaTitleAction(
  junctionId: string,
  customTitle: string
): Promise<ActionResult> {
  console.log('📝 [CHAPTER MEDIA] Updating media title:', { junctionId, customTitle })

  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Verify ownership through junction
    const { data: junction, error: fetchError } = await supabase
      .from('course_chapter_media')
      .select(`
        *,
        course_chapters!inner (
          courses!inner (
            instructor_id
          )
        )
      `)
      .eq('id', junctionId)
      .single()

    if (fetchError || !junction) {
      throw new Error('Media link not found')
    }

    if (junction.course_chapters.courses.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    // Update custom title
    const { data: updated, error: updateError } = await supabase
      .from('course_chapter_media')
      .update({
        title: customTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', junctionId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    revalidatePath(`/instructor/course/${junction.course_chapters.course_id}`)

    console.log('✅ [CHAPTER MEDIA] Successfully updated media title')

    return {
      success: true,
      data: updated,
      message: 'Media title updated successfully'
    }
  } catch (error) {
    console.error('📝 [CHAPTER MEDIA] Update title error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update media title'
    }
  }
}

/**
 * Get chapter content with media (for instructor editing)
 */
export async function getChapterContentAction(
  chapterId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get chapter with media and verify ownership
    const { data: chapter, error: chapterError } = await supabase
      .from('course_chapters')
      .select(`
        *,
        courses!inner (
          instructor_id
        ),
        course_chapter_media (
          id,
          order_in_chapter,
          title,
          created_at,
          media_files (
            id,
            name,
            file_type,
            file_size,
            duration_seconds,
            cdn_url,
            thumbnail_url
          )
        )
      `)
      .eq('id', chapterId)
      .single()

    if (chapterError || !chapter) {
      throw new Error('Chapter not found')
    }

    if (chapter.courses.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    // Sort media by order
    const sortedMedia = chapter.course_chapter_media
      .sort((a, b) => a.order_in_chapter - b.order_in_chapter)
      .map(item => ({
        junctionId: item.id,
        order: item.order_in_chapter,
        customTitle: item.title,
        createdAt: item.created_at,
        ...item.media_files
      }))

    return {
      success: true,
      data: {
        ...chapter,
        media: sortedMedia
      }
    }
  } catch (error) {
    console.error('📚 [CHAPTER MEDIA] Get content error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get chapter content'
    }
  }
}

/**
 * Get complete course structure with media (for instructor editing)
 */
export async function getCourseWithMediaAction(
  courseId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    console.log('🎓 [CHAPTER MEDIA] Getting course with media for:', courseId)

    // 🎯 PARALLEL QUERIES (like old videos table pattern)
    const [courseResult, chaptersResult] = await Promise.all([
      // Get course basic data (title, description, etc.)
      supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, instructor_id, price, status')
        .eq('id', courseId)
        .single(),

      // Get chapters with junction table media (using FK relationship)
      supabase
        .from('course_chapters')
        .select(`
          id,
          title,
          order_position,
          course_id,
          created_at,
          updated_at,
          course_chapter_media (
            id,
            order_in_chapter,
            title,
            created_at,
            media_files (
              id,
              name,
              file_type,
              file_size,
              duration_seconds,
              cdn_url,
              thumbnail_url
            )
          )
        `)
        .eq('course_id', courseId)
        .order('order_position', { ascending: true })
    ])

    if (courseResult.error || !courseResult.data) {
      throw new Error(`Course not found: ${courseResult.error?.message}`)
    }

    if (courseResult.data.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    if (chaptersResult.error) {
      throw chaptersResult.error
    }

    const courseData = courseResult.data
    const chapters = chaptersResult.data || []

    console.log('🎓 [CHAPTER MEDIA] Raw data loaded:', {
      courseId,
      courseTitle: courseData.title,
      chaptersCount: chapters.length,
      totalMediaItems: chapters.reduce((sum, ch) => sum + (ch.course_chapter_media?.length || 0), 0)
    })

    // 🔍 DEBUG: Log chapter IDs to identify the issue
    console.log('🔍 Chapter IDs:', chapters.map(ch => ({ id: ch.id, title: ch.title, order: ch.order_position })))

    // Structure the data for UI consumption (following old videos table pattern)
    const structuredChapters = chapters.map(chapter => ({
      ...chapter,
      media: (chapter.course_chapter_media || [])
        .sort((a, b) => a.order_in_chapter - b.order_in_chapter)
        .map(item => ({
          junctionId: item.id,
          order: item.order_in_chapter,
          customTitle: item.title,
          createdAt: item.created_at,
          ...item.media_files
        }))
    }))

    return {
      success: true,
      data: {
        // Include full course data (like old pattern)
        ...courseData,
        chapters: structuredChapters
      }
    }
  } catch (error) {
    console.error('🎓 [CHAPTER MEDIA] Get course error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get course content'
    }
  }
}
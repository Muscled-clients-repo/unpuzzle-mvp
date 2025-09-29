'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Result types
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Chapter type for junction table architecture
export interface Chapter {
  id: string
  course_id: string
  title: string
  description: string
  order_position: number
  is_published: boolean
  is_preview: boolean
  created_at: string
  updated_at: string
  media_count?: number
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

// Helper function to verify course ownership
async function verifyCourseOwnership(supabase: any, courseId: string, userId: string) {
  const { data: course, error } = await supabase
    .from('courses')
    .select('instructor_id')
    .eq('id', courseId)
    .single()

  if (error || !course) {
    throw new Error('Course not found')
  }

  if (course.instructor_id !== userId) {
    throw new Error('Unauthorized: You do not own this course')
  }

  return course
}

/**
 * CREATE: Add a new chapter to a course
 */
export async function createChapterAction(
  courseId: string,
  title: string,
  description: string = ''
): Promise<ActionResult<Chapter>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Verify course ownership
    await verifyCourseOwnership(supabase, courseId, user.id)

    // Get the next order position
    const { data: lastChapter } = await supabase
      .from('course_chapters')
      .select('order_position')
      .eq('course_id', courseId)
      .order('order_position', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (lastChapter?.order_position || 0) + 1

    // Generate chapter ID (following existing pattern)
    const chapterId = `chapter-${Date.now()}`

    // Insert new chapter
    const { data: chapter, error } = await supabase
      .from('course_chapters')
      .insert({
        id: chapterId,
        course_id: courseId,
        title: title.trim(),
        description: description.trim(),
        order_position: nextOrder,
        is_published: true,
        is_preview: false
      })
      .select()
      .single()

    if (error) throw error

    // Revalidate the course page
    revalidatePath(`/instructor/course/${courseId}`)
    revalidatePath(`/instructor/course/${courseId}/edit`)

    return {
      success: true,
      data: chapter,
      message: `Chapter "${title}" created successfully`
    }
  } catch (error) {
    console.error('Create chapter error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create chapter'
    }
  }
}

/**
 * READ: Get all chapters for a course with media counts
 */
export async function getChaptersForCourseAction(courseId: string): Promise<ActionResult<Chapter[]>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Verify course ownership
    await verifyCourseOwnership(supabase, courseId, user.id)

    // Get chapters with media counts
    const { data: chapters, error } = await supabase
      .from('course_chapters')
      .select(`
        *,
        media_count:course_chapter_media(count)
      `)
      .eq('course_id', courseId)
      .order('order_position', { ascending: true })

    if (error) throw error

    // Transform the data to include media_count as a number
    const transformedChapters = chapters?.map(chapter => ({
      ...chapter,
      media_count: chapter.media_count?.[0]?.count || 0
    })) || []

    return {
      success: true,
      data: transformedChapters
    }
  } catch (error) {
    console.error('Get chapters error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get chapters'
    }
  }
}

/**
 * READ: Get a single chapter by ID
 */
export async function getChapterByIdAction(chapterId: string): Promise<ActionResult<Chapter>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get chapter with course info for ownership verification
    const { data: chapter, error } = await supabase
      .from('course_chapters')
      .select(`
        *,
        media_count:course_chapter_media(count),
        courses!inner(instructor_id)
      `)
      .eq('id', chapterId)
      .single()

    if (error) throw error

    // Verify ownership
    if (chapter.courses.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    // Transform the data
    const transformedChapter = {
      ...chapter,
      media_count: chapter.media_count?.[0]?.count || 0
    }

    return {
      success: true,
      data: transformedChapter
    }
  } catch (error) {
    console.error('Get chapter error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get chapter'
    }
  }
}

/**
 * UPDATE: Update chapter details
 */
export async function updateChapterAction(
  chapterId: string,
  updates: {
    title?: string
    description?: string
    is_published?: boolean
    is_preview?: boolean
  }
): Promise<ActionResult<Chapter>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get chapter with course info for ownership verification
    const { data: existingChapter, error: fetchError } = await supabase
      .from('course_chapters')
      .select('*, courses!inner(instructor_id)')
      .eq('id', chapterId)
      .single()

    if (fetchError) throw fetchError

    // Verify ownership
    if (existingChapter.courses.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (updates.title !== undefined) updateData.title = updates.title.trim()
    if (updates.description !== undefined) updateData.description = updates.description.trim()
    if (updates.is_published !== undefined) updateData.is_published = updates.is_published
    if (updates.is_preview !== undefined) updateData.is_preview = updates.is_preview

    // Update chapter
    const { data: updatedChapter, error } = await supabase
      .from('course_chapters')
      .update(updateData)
      .eq('id', chapterId)
      .select()
      .single()

    if (error) throw error

    // Revalidate pages
    revalidatePath(`/instructor/course/${existingChapter.course_id}`)
    revalidatePath(`/instructor/course/${existingChapter.course_id}/edit`)

    return {
      success: true,
      data: updatedChapter,
      message: 'Chapter updated successfully'
    }
  } catch (error) {
    console.error('Update chapter error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update chapter'
    }
  }
}

/**
 * UPDATE: Reorder chapters within a course
 */
export async function reorderChaptersAction(
  courseId: string,
  chapterOrders: Array<{ id: string, order_position: number }>
): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Verify course ownership
    await verifyCourseOwnership(supabase, courseId, user.id)

    // Update each chapter's order_position
    for (const { id, order_position } of chapterOrders) {
      const { error } = await supabase
        .from('course_chapters')
        .update({
          order_position,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('course_id', courseId) // Extra security check

      if (error) throw error
    }

    // Revalidate pages
    revalidatePath(`/instructor/course/${courseId}`)
    revalidatePath(`/instructor/course/${courseId}/edit`)

    return {
      success: true,
      message: 'Chapters reordered successfully'
    }
  } catch (error) {
    console.error('Reorder chapters error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder chapters'
    }
  }
}

/**
 * DELETE: Delete a chapter and all its media links
 * With migration 100, the cascade delete will automatically remove course_chapter_media records
 */
export async function deleteChapterAction(chapterId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get chapter with course info for ownership verification and media count
    const { data: chapter, error: fetchError } = await supabase
      .from('course_chapters')
      .select(`
        *,
        courses!inner(instructor_id),
        media_count:course_chapter_media(count)
      `)
      .eq('id', chapterId)
      .single()

    if (fetchError) throw fetchError

    // Verify ownership
    if (chapter.courses.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    const mediaCount = chapter.media_count?.[0]?.count || 0

    // Delete the chapter (cascade delete will handle course_chapter_media automatically)
    const { error: deleteError } = await supabase
      .from('course_chapters')
      .delete()
      .eq('id', chapterId)

    if (deleteError) throw deleteError

    // Revalidate pages
    revalidatePath(`/instructor/course/${chapter.course_id}`)
    revalidatePath(`/instructor/course/${chapter.course_id}/edit`)

    return {
      success: true,
      message: `Chapter "${chapter.title}" deleted successfully. ${mediaCount} media links were automatically removed.`
    }
  } catch (error) {
    console.error('Delete chapter error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete chapter'
    }
  }
}

/**
 * UTILITY: Duplicate a chapter (without media links)
 */
export async function duplicateChapterAction(chapterId: string): Promise<ActionResult<Chapter>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get original chapter
    const { data: originalChapter, error: fetchError } = await supabase
      .from('course_chapters')
      .select('*, courses!inner(instructor_id)')
      .eq('id', chapterId)
      .single()

    if (fetchError) throw fetchError

    // Verify ownership
    if (originalChapter.courses.instructor_id !== user.id) {
      throw new Error('Unauthorized: You do not own this course')
    }

    // Get next order position
    const { data: lastChapter } = await supabase
      .from('course_chapters')
      .select('order_position')
      .eq('course_id', originalChapter.course_id)
      .order('order_position', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (lastChapter?.order_position || 0) + 1

    // Create duplicate with new ID
    const duplicateId = `chapter-${Date.now()}`
    const { data: duplicateChapter, error } = await supabase
      .from('course_chapters')
      .insert({
        id: duplicateId,
        course_id: originalChapter.course_id,
        title: `${originalChapter.title} (Copy)`,
        description: originalChapter.description,
        order_position: nextOrder,
        is_published: false, // New chapters start as draft
        is_preview: originalChapter.is_preview
      })
      .select()
      .single()

    if (error) throw error

    // Revalidate pages
    revalidatePath(`/instructor/course/${originalChapter.course_id}`)
    revalidatePath(`/instructor/course/${originalChapter.course_id}/edit`)

    return {
      success: true,
      data: duplicateChapter,
      message: `Chapter duplicated as "${duplicateChapter.title}"`
    }
  } catch (error) {
    console.error('Duplicate chapter error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to duplicate chapter'
    }
  }
}
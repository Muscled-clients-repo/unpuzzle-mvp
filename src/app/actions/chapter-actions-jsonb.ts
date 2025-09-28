'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Chapter, ChapterVideo, MediaFile } from '@/types/course'

// Result types
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Virtual Chapter type for instructor interface (JSONB-based)
export interface VirtualChapter {
  id: string
  title: string
  courseId: string
  videos: ChapterVideo[]
  videoCount: number
  totalDuration?: string
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
 * Get all chapters for a course using JSONB architecture
 * Uses course_chapters.videos JSONB arrays instead of videos table
 */
export async function getChaptersForCourseAction(courseId: string) {
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

    // Get chapters with JSONB videos
    const { data: chapters, error: chaptersError } = await supabase
      .from('course_chapters')
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true })

    if (chaptersError) throw chaptersError

    if (!chapters || chapters.length === 0) {
      return []
    }

    // Extract all media file IDs from JSONB arrays
    const mediaFileIds = chapters
      .flatMap(chapter => {
        const videos = chapter.videos || []
        if (!Array.isArray(videos)) return []
        return videos.map((v: ChapterVideo) => v.media_file_id)
      })
      .filter(Boolean)

    // Get media file details if there are any videos
    let mediaFileMap = new Map<string, MediaFile>()
    if (mediaFileIds.length > 0) {
      const { data: mediaFiles } = await supabase
        .from('media_files')
        .select('*')
        .in('id', mediaFileIds)

      mediaFiles?.forEach(file => {
        mediaFileMap.set(file.id, file)
      })
    }

    // Process chapters and combine with media file data
    const virtualChapters: VirtualChapter[] = chapters.map(chapter => {
      const chapterVideos: ChapterVideo[] = (chapter.videos || [])
        .map((video: ChapterVideo) => ({
          ...video,
          mediaFile: mediaFileMap.get(video.media_file_id)
        }))
        .filter(video => video.mediaFile) // Only include videos with valid media files
        .sort((a, b) => a.order - b.order)

      const totalDurationSeconds = chapterVideos.reduce(
        (sum, video) => sum + (video.mediaFile?.duration_seconds || 0),
        0
      )

      return {
        id: chapter.id,
        title: chapter.title,
        courseId,
        videos: chapterVideos,
        videoCount: chapterVideos.length,
        totalDuration: formatDuration(totalDurationSeconds)
      }
    })

    return virtualChapters
  } catch (error) {
    console.error('Get chapters error:', error)
    throw error
  }
}

/**
 * Create a new chapter using JSONB architecture
 */
export async function createChapterAction(courseId: string, title?: string): Promise<ActionResult> {
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

    // Get next order number for this course
    const { data: lastChapter } = await supabase
      .from('course_chapters')
      .select('order')
      .eq('course_id', courseId)
      .order('order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (lastChapter?.order || 0) + 1

    // Generate a new chapter ID
    const timestamp = Date.now()
    const chapterId = `chapter-${timestamp}`
    const chapterTitle = title || `Chapter ${nextOrder}`

    // Create chapter in database with empty videos array
    const { error: insertError } = await supabase
      .from('course_chapters')
      .insert({
        id: chapterId,
        course_id: courseId,
        title: chapterTitle,
        order: nextOrder,
        videos: []
      })

    if (insertError) {
      throw insertError
    }

    const virtualChapter: VirtualChapter = {
      id: chapterId,
      title: chapterTitle,
      courseId,
      videos: [],
      videoCount: 0,
      totalDuration: '0s'
    }

    return {
      success: true,
      data: virtualChapter,
      message: `Chapter "${chapterTitle}" created successfully.`
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
 * Update chapter title using JSONB architecture
 */
export async function updateChapterAction(
  chapterId: string,
  updates: { title?: string },
  operationId?: string
): Promise<ActionResult & { operationId?: string; immediate?: boolean }> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    if (!updates.title) {
      return { success: true, message: 'No updates provided' }
    }

    // Get chapter and verify ownership
    const { data: chapter, error: fetchError } = await supabase
      .from('course_chapters')
      .select('id, course_id')
      .eq('id', chapterId)
      .single()

    if (fetchError || !chapter) {
      throw new Error('Chapter not found')
    }

    // Verify user owns the course
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

    // Update chapter title
    const { error: updateError } = await supabase
      .from('course_chapters')
      .update({
        title: updates.title,
        updated_at: new Date().toISOString()
      })
      .eq('id', chapterId)

    if (updateError) throw updateError

    return {
      success: true,
      message: `Chapter updated to "${updates.title}"`,
      data: { id: chapterId, title: updates.title }
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
 * Delete a chapter and its videos using JSONB architecture
 */
export async function deleteChapterAction(
  courseId: string,
  chapterId: string,
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

    // Get chapter to count videos for reporting
    const { data: chapter } = await supabase
      .from('course_chapters')
      .select('videos')
      .eq('id', chapterId)
      .single()

    const videoCount = chapter?.videos ? chapter.videos.length : 0

    // Delete chapter (videos are part of JSONB, so they're deleted automatically)
    const { error: deleteError } = await supabase
      .from('course_chapters')
      .delete()
      .eq('id', chapterId)
      .eq('course_id', courseId)

    if (deleteError) throw deleteError

    revalidatePath(`/instructor/course/${courseId}`)

    return {
      success: true,
      message: `Chapter deleted with ${videoCount} videos successfully`,
      operationId,
      immediate: !!operationId
    }
  } catch (error) {
    console.error('Delete chapter error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete chapter'
    }
  }
}

// Helper function to format duration
function formatDuration(seconds: number): string {
  if (!seconds || seconds === 0) return '0s'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`)

  return parts.join(' ')
}
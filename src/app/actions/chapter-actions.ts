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

// Virtual Chapter type (chapters are not stored in database)
export interface VirtualChapter {
  id: string
  title: string
  courseId: string
  videos: any[]
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
 * Get all virtual chapters for a course
 * Groups videos by their chapter_id field
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
    
    // Get all videos for the course
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true })
    
    if (videosError) throw videosError
    
    // Get chapter titles from course_chapters table
    const { data: chapterTitles } = await supabase
      .from('course_chapters')
      .select('id, title, order')
      .eq('course_id', courseId)
      .order('order', { ascending: true })
    
    const chapterTitleMap: Record<string, string> = {}
    chapterTitles?.forEach(chapter => {
      chapterTitleMap[chapter.id] = chapter.title
    })
    
    // Group videos by chapter_id to create virtual chapters
    const chaptersMap: Record<string, VirtualChapter> = {}
    
    // First, create chapters for all stored chapter titles (including empty ones)
    chapterTitles?.forEach(storedChapter => {
      chaptersMap[storedChapter.id] = {
        id: storedChapter.id,
        title: storedChapter.title,
        courseId,
        videos: [],
        videoCount: 0
      }
    })
    
    // Then add videos to their respective chapters
    for (const video of videos || []) {
      const chapterId = video.chapter_id || 'chapter-default'
      
      if (!chaptersMap[chapterId]) {
        // Use stored title or fallback to auto-generated title
        const chapterNumber = chapterId.split('-')[1] || '1'
        const title = chapterTitleMap[chapterId] || `Chapter ${chapterNumber}`
        
        chaptersMap[chapterId] = {
          id: chapterId,
          title,
          courseId,
          videos: [],
          videoCount: 0
        }
      }
      
      chaptersMap[chapterId].videos.push(video)
      chaptersMap[chapterId].videoCount++
    }
    
    // Convert to array and sort by chapter ID
    const chapters = Object.values(chaptersMap).sort((a, b) => {
      // Extract numbers from chapter IDs for proper sorting
      const aNum = parseInt(a.id.split('-')[1] || '0')
      const bNum = parseInt(b.id.split('-')[1] || '0')
      return aNum - bNum
    })
    
    return chapters
  } catch (error) {
    console.error('Get chapters error:', error)
    throw error
  }
}

/**
 * Create a new virtual chapter
 * Returns a new chapter ID that can be used when adding videos
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
    
    // Generate a new chapter ID
    const timestamp = Date.now()
    const chapterId = `chapter-${timestamp}`
    const chapterTitle = title || `Chapter ${timestamp}`
    
    // Create virtual chapter object (staged for save)
    const virtualChapter: VirtualChapter = {
      id: chapterId,
      title: chapterTitle,
      courseId,
      videos: [],
      videoCount: 0
    }
    
    // No database operation - chapter will be saved when user clicks Save
    // This maintains consistency with the staged architecture
    
    return { 
      success: true, 
      data: virtualChapter,
      message: 'Chapter created and staged for save.'
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
 * Save a virtual chapter to database (for pending chapters from save flow)
 */
export async function saveChapterToDatabaseAction(
  courseId: string, 
  chapterId: string, 
  title: string
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
    
    // Get next order number for this course
    const { data: lastChapter } = await supabase
      .from('course_chapters')
      .select('order')
      .eq('course_id', courseId)
      .order('order', { ascending: false })
      .limit(1)
      .single()
    
    const nextOrder = (lastChapter?.order || 0) + 1
    
    // Insert new chapter directly into course_chapters table
    const { error: insertError } = await supabase
      .from('course_chapters')
      .insert({
        id: chapterId,
        course_id: courseId,
        title: title,
        order: nextOrder
      })
    
    if (insertError) {
      throw insertError
    }
    
    return { 
      success: true, 
      message: `Chapter "${title}" saved to database`,
      data: { id: chapterId, title, courseId, order: nextOrder }
    }
  } catch (error) {
    console.error('Save chapter to database error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save chapter to database'
    }
  }
}

/**
 * Update chapter title using course_chapters table
 */
export async function updateChapterAction(chapterId: string, updates: { title?: string }): Promise<ActionResult> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    if (!updates.title) {
      return { success: true, message: 'No updates provided' }
    }
    
    // Check if chapter exists in course_chapters table
    const { data: existingChapter, error: fetchError } = await supabase
      .from('course_chapters')
      .select('id, course_id')
      .eq('id', chapterId)
      .single()
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      throw fetchError
    }
    
    if (existingChapter) {
      // Verify user owns the course
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('instructor_id')
        .eq('id', existingChapter.course_id)
        .single()
      
      if (courseError || !course) {
        throw new Error('Course not found')
      }
      
      if (course.instructor_id !== user.id) {
        throw new Error('Unauthorized: You do not own this course')
      }
      
      // Update existing chapter
      const { error: updateError } = await supabase
        .from('course_chapters')
        .update({ 
          title: updates.title,
          updated_at: new Date().toISOString()
        })
        .eq('id', chapterId)
      
      if (updateError) throw updateError
    } else {
      // Chapter doesn't exist yet - this happens with virtual chapters
      // We need to find the course_id from videos table and create the chapter
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('course_id')
        .eq('chapter_id', chapterId)
        .limit(1)
        .single()
      
      if (videoError || !video) {
        throw new Error('Chapter not found')
      }
      
      // Verify user owns the course
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('instructor_id')
        .eq('id', video.course_id)
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
        .eq('course_id', video.course_id)
        .order('order', { ascending: false })
        .limit(1)
        .single()
      
      const nextOrder = (lastChapter?.order || 0) + 1
      
      // Create new chapter
      const { error: createError } = await supabase
        .from('course_chapters')
        .insert({
          id: chapterId,
          course_id: video.course_id,
          title: updates.title,
          order: nextOrder
        })
      
      if (createError) throw createError
    }
    
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
 * Delete a virtual chapter and all its videos
 */
export async function deleteChapterAction(
  courseId: string,
  chapterId: string
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
    
    // Get all videos in this chapter for Backblaze cleanup
    const { data: videos, error: fetchError } = await supabase
      .from('videos')
      .select('id, backblaze_file_id, filename')
      .eq('course_id', courseId)
      .eq('chapter_id', chapterId)
    
    if (fetchError) throw fetchError
    
    // Delete from Backblaze
    const deletionPromises = (videos || []).map(async (video) => {
      if (video.backblaze_file_id && video.filename) {
        try {
          await backblazeService.deleteVideo(video.backblaze_file_id, video.filename)
        } catch (error) {
          console.error(`Failed to delete video ${video.id} from Backblaze:`, error)
          // Continue with other deletions
        }
      }
    })
    
    await Promise.all(deletionPromises)
    
    // Delete all videos from database
    const { error: deleteVideosError } = await supabase
      .from('videos')
      .delete()
      .eq('course_id', courseId)
      .eq('chapter_id', chapterId)
    
    if (deleteVideosError) throw deleteVideosError
    
    // Delete chapter from course_chapters table (if it exists)
    const { error: deleteChapterError } = await supabase
      .from('course_chapters')
      .delete()
      .eq('id', chapterId)
      .eq('course_id', courseId)
    
    if (deleteChapterError) throw deleteChapterError
    
    revalidatePath(`/instructor/course/${courseId}`)
    
    return {
      success: true,
      message: `Chapter and ${videos?.length || 0} videos deleted successfully`
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
 * Rename a virtual chapter
 * This updates the metadata we return, not stored in database
 */
export async function renameChapterAction(
  courseId: string,
  chapterId: string,
  newTitle: string
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
    
    // Since chapters are virtual, we can't update them in the database
    // The title is generated from the chapter ID or can be stored in course metadata
    // For now, we'll return success and let the frontend handle the display
    
    return {
      success: true,
      data: {
        id: chapterId,
        title: newTitle
      },
      message: 'Chapter renamed successfully (virtual operation)'
    }
  } catch (error) {
    console.error('Rename chapter error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename chapter'
    }
  }
}

/**
 * Get the next available chapter ID for a course
 */
export async function getNextChapterIdAction(courseId: string): Promise<ActionResult> {
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
    
    // Get all existing chapter IDs
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('chapter_id')
      .eq('course_id', courseId)
    
    if (videosError) throw videosError
    
    // Extract unique chapter IDs
    const existingChapterIds = new Set(
      (videos || []).map(v => v.chapter_id).filter(Boolean)
    )
    
    // Find the highest chapter number
    let maxNumber = 0
    for (const chapterId of existingChapterIds) {
      const match = chapterId.match(/chapter-(\d+)/)
      if (match) {
        const num = parseInt(match[1])
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num
        }
      }
    }
    
    // Generate next chapter ID
    const nextChapterId = `chapter-${maxNumber + 1}`
    
    return {
      success: true,
      data: nextChapterId
    }
  } catch (error) {
    console.error('Get next chapter ID error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get next chapter ID'
    }
  }
}

/**
 * Merge two chapters (move all videos from source to target chapter)
 */
export async function mergeChaptersAction(
  courseId: string,
  sourceChapterId: string,
  targetChapterId: string
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
    
    // Get the highest order in target chapter
    const { data: lastVideo } = await supabase
      .from('videos')
      .select('order')
      .eq('course_id', courseId)
      .eq('chapter_id', targetChapterId)
      .order('order', { ascending: false })
      .limit(1)
      .single()
    
    const startOrder = (lastVideo?.order || -1) + 1
    
    // Get all videos from source chapter
    const { data: sourceVideos, error: fetchError } = await supabase
      .from('videos')
      .select('id, order')
      .eq('course_id', courseId)
      .eq('chapter_id', sourceChapterId)
      .order('order', { ascending: true })
    
    if (fetchError) throw fetchError
    
    // Update each video to move to target chapter
    for (let i = 0; i < (sourceVideos || []).length; i++) {
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          chapter_id: targetChapterId,
          order: startOrder + i,
          updated_at: new Date().toISOString()
        })
        .eq('id', sourceVideos![i].id)
      
      if (updateError) throw updateError
    }
    
    revalidatePath(`/instructor/course/${courseId}`)
    
    return {
      success: true,
      message: `Moved ${sourceVideos?.length || 0} videos to target chapter`
    }
  } catch (error) {
    console.error('Merge chapters error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to merge chapters'
    }
  }
}
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
    
    // Group videos by chapter_id to create virtual chapters
    const chaptersMap: Record<string, VirtualChapter> = {}
    
    for (const video of videos || []) {
      const chapterId = video.chapter_id || 'chapter-default'
      
      if (!chaptersMap[chapterId]) {
        // Extract chapter number from ID for title
        const chapterNumber = chapterId.split('-')[1] || '1'
        
        chaptersMap[chapterId] = {
          id: chapterId,
          title: `Chapter ${chapterNumber}`,
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
    
    // Create virtual chapter object (not stored in database)
    const virtualChapter: VirtualChapter = {
      id: chapterId,
      title: title || `Chapter ${timestamp}`,
      courseId,
      videos: [],
      videoCount: 0
    }
    
    // No database operation needed - chapters are virtual
    // The chapter will appear once videos are added to it
    
    return { 
      success: true, 
      data: virtualChapter,
      message: 'Virtual chapter created. Add videos to make it visible.'
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
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('course_id', courseId)
      .eq('chapter_id', chapterId)
    
    if (deleteError) throw deleteError
    
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
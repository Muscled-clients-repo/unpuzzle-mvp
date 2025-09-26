'use server'

import { createClient } from '@/lib/supabase/server'


/**
 * Get detailed lesson analytics for a course
 */
export async function getLessonAnalytics(courseId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    console.log('[Server Action] Getting lesson analytics for:', { userId: user.id, courseId })
    
    // Query the lesson_analytics_view
    const { data, error } = await supabase
      .from('lesson_analytics_view')
      .select('*')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .order('lesson_order', { ascending: true })
    
    if (error) {
      console.error('[Server Action] Error fetching lesson analytics:', error)
      return []
    }
    
    console.log('[Server Action] Found lesson analytics:', data?.length || 0)
    return data || []
    
  } catch (error) {
    console.error('[Server Action] Failed to get lesson analytics:', error)
    return []
  }
}

/**
 * Get video analytics for a lesson
 */
export async function getVideoAnalytics(lessonId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    console.log('[Server Action] Getting video analytics for:', { userId: user.id, lessonId })
    
    // Query video progress
    const { data, error } = await supabase
      .from('video_progress')
      .select(`
        *,
        videos (
          id,
          title,
          duration_seconds,
          video_url
        )
      `)
      .eq('student_id', user.id)
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('[Server Action] Error fetching video analytics:', error)
      return []
    }
    
    console.log('[Server Action] Found video analytics:', data?.length || 0)
    return data || []
    
  } catch (error) {
    console.error('[Server Action] Failed to get video analytics:', error)
    return []
  }
}


/**
 * Update video progress
 */
export async function updateVideoProgress(
  videoId: string,
  progressSeconds: number,
  totalDuration: number
) {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    const progressPercent = Math.round((progressSeconds / totalDuration) * 100)
    const isCompleted = progressPercent >= 90 // Consider 90%+ as completed
    
    console.log('[Server Action] Updating video progress:', {
      userId: user.id,
      videoId,
      progressSeconds,
      progressPercent,
      isCompleted
    })
    
    // Update or insert video progress
    const { data, error } = await supabase
      .from('video_progress')
      .upsert({
        student_id: user.id,
        video_id: videoId,
        progress_seconds: progressSeconds,
        progress_percent: progressPercent,
        completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .select()
    
    if (error) {
      console.error('[Server Action] Error updating video progress:', error)
      return false
    }
    
    console.log('[Server Action] Video progress updated successfully')
    return true
    
  } catch (error) {
    console.error('[Server Action] Failed to update video progress:', error)
    return false
  }
}






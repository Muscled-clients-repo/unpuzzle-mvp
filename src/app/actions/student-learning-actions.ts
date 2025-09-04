'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get enrolled courses with analytics for a student
 */
export async function getEnrolledCoursesWithAnalytics() {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    console.log('[Server Action] Getting enrolled courses with analytics for user:', user.id)
    
    // Query the enrollments_with_analytics view
    const { data, error } = await supabase
      .from('enrollments_with_analytics')
      .select('*')
      .eq('user_id', user.id)
      .order('last_accessed_at', { ascending: false })
    
    if (error) {
      console.error('[Server Action] Error fetching enrollments with analytics:', error)
      return []
    }
    
    console.log('[Server Action] Found enrolled courses with analytics:', data?.length || 0)
    return data || []
    
  } catch (error) {
    console.error('[Server Action] Failed to get enrolled courses with analytics:', error)
    return []
  }
}

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
 * Get AI interaction history for a student
 */
export async function getAIInteractionHistory(courseId?: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    console.log('[Server Action] Getting AI interaction history for:', { userId: user.id, courseId })
    
    let query = supabase
      .from('ai_interactions')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
    
    // Filter by course if provided
    if (courseId) {
      query = query.eq('course_id', courseId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('[Server Action] Error fetching AI interaction history:', error)
      return []
    }
    
    console.log('[Server Action] Found AI interactions:', data?.length || 0)
    return data || []
    
  } catch (error) {
    console.error('[Server Action] Failed to get AI interaction history:', error)
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

/**
 * Enroll student in course
 */
export async function enrollInCourse(courseId: string) {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    console.log('[Server Action] Enrolling in course:', { userId: user.id, courseId })
    
    // Check if already enrolled
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    if (existing) {
      return { success: true, enrollmentId: existing.id }
    }

    // Get total videos for the course
    const { data: videos } = await supabase
      .from('videos')
      .select('id')
      .eq('course_id', courseId)

    const totalVideos = videos?.length || 0

    // Create new enrollment
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .insert({
        user_id: user.id,
        course_id: courseId,
        total_videos: totalVideos,
        progress_percent: 0,
        completed_videos: 0,
        current_lesson_title: 'Getting Started',
        estimated_time_remaining_formatted: 'Calculating...'
      })
      .select()
      .single()

    if (error) {
      console.error('[Server Action] Error creating enrollment:', error)
      throw error
    }

    // Initialize learning milestones for the course
    await initializeCourseMilestones(user.id, courseId, supabase)

    return { success: true, enrollmentId: enrollment.id }
    
  } catch (error) {
    console.error('[Server Action] Failed to enroll in course:', error)
    throw error
  }
}

/**
 * Initialize default milestones for a course enrollment
 */
async function initializeCourseMilestones(userId: string, courseId: string, supabase: any) {
  try {
    // Get course videos count
    const { data: videos } = await supabase
      .from('videos')
      .select('id')
      .eq('course_id', courseId)
      .order('sequence_num')

    const totalVideos = videos?.length || 0
    
    // Create default milestones
    const milestones = [
      {
        user_id: userId,
        course_id: courseId,
        milestone_type: 'module_completion',
        title: 'Complete first video',
        target_value: 1,
        current_value: 0,
        sequence_order: 1
      },
      {
        user_id: userId,
        course_id: courseId,
        milestone_type: 'module_completion',
        title: 'Complete 50% of course',
        target_value: Math.floor(totalVideos / 2),
        current_value: 0,
        sequence_order: 2
      },
      {
        user_id: userId,
        course_id: courseId,
        milestone_type: 'course_completion',
        title: 'Complete the course',
        target_value: totalVideos,
        current_value: 0,
        sequence_order: 3
      }
    ]

    await supabase
      .from('learning_milestones')
      .insert(milestones)
      
  } catch (error) {
    console.error('[Server Action] Error initializing milestones:', error)
    // Non-critical error, don't fail enrollment
  }
}

/**
 * Get user learning statistics
 */
export async function getUserLearningStats() {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    console.log('[Server Action] Getting user learning stats for:', user.id)
    
    const { data, error } = await supabase
      .from('user_learning_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[Server Action] Error fetching user stats:', error)
      return null
    }

    console.log('[Server Action] Found user learning stats')
    return data
    
  } catch (error) {
    console.error('[Server Action] Failed to get user learning stats:', error)
    return null
  }
}

/**
 * Detect and record learning struggle
 */
export async function detectLearningStruggle(
  courseId: string,
  videoId: string,
  conceptName: string,
  evidenceType: 'multiple_rewinds' | 'pause_duration' | 'ai_help_requests' | 'quiz_failures' | 'slow_progress'
) {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    console.log('[Server Action] Detecting learning struggle:', { 
      userId: user.id, 
      courseId, 
      conceptName, 
      evidenceType 
    })
    
    // Check if struggle already exists
    const { data: existing } = await supabase
      .from('learning_struggles')
      .select('id, difficulty_level')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('concept_name', conceptName)
      .eq('status', 'active')
      .single()

    if (existing) {
      // Update existing struggle
      const { error } = await supabase
        .from('learning_struggles')
        .update({
          difficulty_level: Math.min(5, existing.difficulty_level + 1),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (error) {
        console.error('[Server Action] Error updating learning struggle:', error)
        return false
      }
    } else {
      // Create new struggle
      const { error } = await supabase
        .from('learning_struggles')
        .insert({
          user_id: user.id,
          course_id: courseId,
          video_id: videoId,
          concept_name: conceptName,
          evidence_type: evidenceType,
          difficulty_level: 1,
          status: 'active'
        })

      if (error) {
        console.error('[Server Action] Error creating learning struggle:', error)
        return false
      }
    }

    console.log('[Server Action] Learning struggle recorded successfully')
    return true
    
  } catch (error) {
    console.error('[Server Action] Failed to detect learning struggle:', error)
    return false
  }
}

/**
 * Record AI interaction
 */
export async function recordAIInteraction(
  courseId: string,
  lessonId: string,
  videoId: string,
  question: string,
  response: string,
  interactionType: string = 'question'
) {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }
    
    console.log('[Server Action] Recording AI interaction:', {
      userId: user.id,
      courseId,
      lessonId,
      videoId,
      interactionType
    })
    
    const { data, error } = await supabase
      .from('ai_interactions')
      .insert({
        student_id: user.id,
        course_id: courseId,
        lesson_id: lessonId,
        video_id: videoId,
        question,
        response,
        interaction_type: interactionType,
        created_at: new Date().toISOString()
      })
      .select()
    
    if (error) {
      console.error('[Server Action] Error recording AI interaction:', error)
      return null
    }
    
    console.log('[Server Action] AI interaction recorded successfully')
    return data?.[0] || null
    
  } catch (error) {
    console.error('[Server Action] Failed to record AI interaction:', error)
    return null
  }
}
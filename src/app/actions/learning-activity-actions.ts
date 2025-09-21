'use server'

import { createClient } from '@/lib/supabase/server'

// Helper function to get authenticated user
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Authentication required')
  }

  return user
}

export interface LearningActivityData {
  userId: string
  courseId: string
  videoId?: string
  activityType: 'quiz' | 'reflection' | 'checkpoint' | 'prompt'
  activitySubtype?: string // 'voice', 'loom', 'multiple_choice', etc.
  title: string
  content?: any // JSONB content for activity-specific data
  triggeredAtTimestamp?: number // Video timestamp in seconds
}

export interface LearningActivityUpdate {
  id: string
  state?: 'pending' | 'active' | 'completed'
  content?: any
  completedAt?: string
}

// Get learning activities for a course/video
export async function getLearningActivitiesAction(courseId: string, videoId?: string) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    let query = supabase
      .from('learning_activities')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (videoId) {
      query = query.eq('video_id', videoId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[LearningActivityAction] Error fetching activities:', error)
      return {
        success: false,
        error: 'Failed to fetch learning activities'
      }
    }

    return {
      success: true,
      data: data || []
    }
  } catch (error) {
    console.error('[LearningActivityAction] Error:', error)
    return {
      success: false,
      error: 'Failed to fetch learning activities'
    }
  }
}

// Create a new learning activity
export async function createLearningActivityAction(data: LearningActivityData) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Validate required fields
    if (!data.courseId || !data.activityType || !data.title) {
      return {
        success: false,
        error: 'Missing required fields: courseId, activityType, title'
      }
    }

    // Ensure user_id matches authenticated user
    const activityData = {
      user_id: user.id,
      course_id: data.courseId,
      video_id: data.videoId || null,
      activity_type: data.activityType,
      activity_subtype: data.activitySubtype || null,
      title: data.title,
      content: data.content || null,
      triggered_at_timestamp: data.triggeredAtTimestamp || null,
      state: 'pending'
    }

    const { data: activity, error } = await supabase
      .from('learning_activities')
      .insert(activityData)
      .select()
      .single()

    if (error) {
      console.error('[LearningActivityAction] Error creating activity:', error)
      return {
        success: false,
        error: 'Failed to create learning activity'
      }
    }

    return {
      success: true,
      data: activity
    }
  } catch (error) {
    console.error('[LearningActivityAction] Error:', error)
    return {
      success: false,
      error: 'Failed to create learning activity'
    }
  }
}

// Update a learning activity
export async function updateLearningActivityAction(data: LearningActivityUpdate) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const updateData: any = {}

    if (data.state) {
      updateData.state = data.state
    }

    if (data.content !== undefined) {
      updateData.content = data.content
    }

    if (data.completedAt) {
      updateData.completed_at = data.completedAt
    }

    // Only allow users to update their own activities
    const { data: activity, error } = await supabase
      .from('learning_activities')
      .update(updateData)
      .eq('id', data.id)
      .eq('user_id', user.id) // Security: ensure user owns the activity
      .select()
      .single()

    if (error) {
      console.error('[LearningActivityAction] Error updating activity:', error)
      return {
        success: false,
        error: 'Failed to update learning activity'
      }
    }

    return {
      success: true,
      data: activity
    }
  } catch (error) {
    console.error('[LearningActivityAction] Error:', error)
    return {
      success: false,
      error: 'Failed to update learning activity'
    }
  }
}

// Delete a learning activity
export async function deleteLearningActivityAction(activityId: string) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Only allow users to delete their own activities
    const { error } = await supabase
      .from('learning_activities')
      .delete()
      .eq('id', activityId)
      .eq('user_id', user.id) // Security: ensure user owns the activity

    if (error) {
      console.error('[LearningActivityAction] Error deleting activity:', error)
      return {
        success: false,
        error: 'Failed to delete learning activity'
      }
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('[LearningActivityAction] Error:', error)
    return {
      success: false,
      error: 'Failed to delete learning activity'
    }
  }
}

// Helper function to create reflection activity (used by reflection system)
export async function createReflectionActivityAction(
  courseId: string,
  videoId: string,
  videoTimestamp: number,
  reflectionType: 'voice' | 'loom' | 'screenshot',
  reflectionId?: string
) {
  try {
    const activityData: LearningActivityData = {
      userId: '', // Will be overridden by createLearningActivityAction
      courseId,
      videoId,
      activityType: 'reflection',
      activitySubtype: reflectionType,
      title: `${reflectionType.charAt(0).toUpperCase() + reflectionType.slice(1)} Reflection`,
      content: reflectionId ? { reflectionId } : null,
      triggeredAtTimestamp: videoTimestamp
    }

    return await createLearningActivityAction(activityData)
  } catch (error) {
    console.error('[LearningActivityAction] Error creating reflection activity:', error)
    return {
      success: false,
      error: 'Failed to create reflection activity'
    }
  }
}

// Helper function to create quiz activity (used by quiz system)
export async function createQuizActivityAction(
  courseId: string,
  videoId: string,
  videoTimestamp: number,
  quizData: any
) {
  try {
    const activityData: LearningActivityData = {
      userId: '', // Will be overridden by createLearningActivityAction
      courseId,
      videoId,
      activityType: 'quiz',
      activitySubtype: 'multiple_choice',
      title: 'Knowledge Check Quiz',
      content: quizData,
      triggeredAtTimestamp: videoTimestamp
    }

    return await createLearningActivityAction(activityData)
  } catch (error) {
    console.error('[LearningActivityAction] Error creating quiz activity:', error)
    return {
      success: false,
      error: 'Failed to create quiz activity'
    }
  }
}
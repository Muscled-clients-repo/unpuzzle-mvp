'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type CheckpointType = 'quiz' | 'reflection' | 'voice_memo'

export interface InstructorCheckpoint {
  id: string
  created_by: string
  media_file_id: string
  prompt_type: CheckpointType
  timestamp_seconds: number
  title: string
  instructions: string | null
  quiz_questions: any | null
  passing_score: number | null
  reflection_prompt: string | null
  requires_video: boolean
  requires_audio: boolean
  is_required: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Create a video checkpoint (instructors only)
 */
export async function createCheckpoint(data: {
  media_file_id: string
  prompt_type: CheckpointType
  timestamp_seconds: number
  title: string
  instructions?: string
  quiz_questions?: any
  passing_score?: number
  reflection_prompt?: string
  requires_video?: boolean
  requires_audio?: boolean
  is_required?: boolean
  is_active?: boolean
}) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Verify user is instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'instructor') {
      return { error: 'Only instructors can create checkpoints' }
    }

    const { data: checkpoint, error: insertError } = await supabase
      .from('instructor_video_checkpoints')
      .insert({
        created_by: user.id,
        media_file_id: data.media_file_id,
        prompt_type: data.prompt_type,
        timestamp_seconds: data.timestamp_seconds,
        title: data.title,
        instructions: data.instructions || null,
        quiz_questions: data.quiz_questions || null,
        passing_score: data.passing_score || null,
        reflection_prompt: data.reflection_prompt || null,
        requires_video: data.requires_video || false,
        requires_audio: data.requires_audio || false,
        is_required: data.is_required || false,
        is_active: data.is_active !== undefined ? data.is_active : true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating checkpoint:', insertError)
      return { error: 'Failed to create checkpoint' }
    }

    revalidatePath(`/video/${data.media_file_id}`)
    revalidatePath(`/instructor/media/${data.media_file_id}`)
    return { success: true, checkpoint }
  } catch (error) {
    console.error('Error in createCheckpoint:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get all checkpoints for a video
 */
export async function getVideoCheckpoints(mediaFileId: string, activeOnly = true) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('instructor_video_checkpoints')
      .select(`
        *,
        creator:created_by (
          id,
          full_name
        )
      `)
      .eq('media_file_id', mediaFileId)

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: checkpoints, error } = await query.order('timestamp_seconds', { ascending: true })

    if (error) {
      console.error('Error fetching checkpoints:', error)
      return { error: 'Failed to fetch checkpoints' }
    }

    return { checkpoints }
  } catch (error) {
    console.error('Error in getVideoCheckpoints:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Update a checkpoint (instructors only)
 */
export async function updateCheckpoint(
  checkpointId: string,
  data: Partial<{
    title: string
    instructions: string
    quiz_questions: any
    passing_score: number
    reflection_prompt: string
    requires_video: boolean
    requires_audio: boolean
    is_required: boolean
    is_active: boolean
  }>
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Verify user is instructor and owns this checkpoint
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'instructor') {
      return { error: 'Only instructors can update checkpoints' }
    }

    const { data: checkpoint, error: updateError } = await supabase
      .from('instructor_video_checkpoints')
      .update(data)
      .eq('id', checkpointId)
      .eq('created_by', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating checkpoint:', updateError)
      return { error: 'Failed to update checkpoint' }
    }

    revalidatePath(`/video/${checkpoint.media_file_id}`)
    revalidatePath(`/instructor/media/${checkpoint.media_file_id}`)
    return { success: true, checkpoint }
  } catch (error) {
    console.error('Error in updateCheckpoint:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Delete a checkpoint (instructors only)
 */
export async function deleteCheckpoint(checkpointId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Get checkpoint first to check ownership and get media_file_id
    const { data: checkpoint } = await supabase
      .from('instructor_video_checkpoints')
      .select('media_file_id, created_by')
      .eq('id', checkpointId)
      .single()

    if (!checkpoint || checkpoint.created_by !== user.id) {
      return { error: 'Unauthorized' }
    }

    const { error: deleteError } = await supabase
      .from('instructor_video_checkpoints')
      .delete()
      .eq('id', checkpointId)
      .eq('created_by', user.id)

    if (deleteError) {
      console.error('Error deleting checkpoint:', deleteError)
      return { error: 'Failed to delete checkpoint' }
    }

    revalidatePath(`/video/${checkpoint.media_file_id}`)
    revalidatePath(`/instructor/media/${checkpoint.media_file_id}`)
    return { success: true }
  } catch (error) {
    console.error('Error in deleteCheckpoint:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Toggle checkpoint active status
 */
export async function toggleCheckpointActive(checkpointId: string, isActive: boolean) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { data: checkpoint, error: updateError } = await supabase
      .from('instructor_video_checkpoints')
      .update({ is_active: isActive })
      .eq('id', checkpointId)
      .eq('created_by', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error toggling checkpoint:', updateError)
      return { error: 'Failed to toggle checkpoint' }
    }

    revalidatePath(`/video/${checkpoint.media_file_id}`)
    return { success: true, checkpoint }
  } catch (error) {
    console.error('Error in toggleCheckpointActive:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get checkpoint completion stats (instructors only)
 */
export async function getCheckpointCompletionStats(checkpointId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Verify ownership
    const { data: checkpoint } = await supabase
      .from('instructor_video_checkpoints')
      .select('prompt_type, created_by')
      .eq('id', checkpointId)
      .single()

    if (!checkpoint || checkpoint.created_by !== user.id) {
      return { error: 'Unauthorized' }
    }

    let completionData

    if (checkpoint.prompt_type === 'quiz') {
      // Get quiz attempt stats
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('user_id, score, percentage')
        .eq('checkpoint_id', checkpointId)

      completionData = attempts || []
    } else {
      // Get reflection/voice memo stats
      const { data: reflections } = await supabase
        .from('reflections')
        .select('user_id, created_at')
        .eq('checkpoint_id', checkpointId)

      completionData = reflections || []
    }

    const totalCompletions = completionData.length
    const uniqueUsers = new Set(completionData.map((c: any) => c.user_id)).size

    return {
      success: true,
      stats: {
        totalCompletions,
        uniqueUsers,
        completionData
      }
    }
  } catch (error) {
    console.error('Error in getCheckpointCompletionStats:', error)
    return { error: 'An unexpected error occurred' }
  }
}

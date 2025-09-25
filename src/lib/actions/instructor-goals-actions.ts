'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { broadcastWebSocketMessage } from '@/lib/websocket-operations'

export interface CreateInstructorResponseData {
  studentId: string
  message: string
  targetDate: string
  responseType?: 'feedback' | 'encouragement' | 'assignment' | 'review'
  dailyNoteId?: string
  metadata?: any
}

export interface InstructorResponse {
  id: string
  instructor_id: string
  student_id: string
  daily_note_id?: string
  message: string
  response_type: string
  target_date: string
  metadata: any
  created_at: string
  updated_at: string
  instructor_profile?: {
    full_name: string
    email: string
  }
  attachedFiles?: Array<{
    id: string
    filename: string
    original_filename: string
    file_size: number
    mime_type: string
    cdn_url?: string
    storage_path: string
  }>
}

export async function createInstructorResponse(data: CreateInstructorResponseData) {
  const supabase = await createClient()

  // Get current user (should be instructor)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  // Use service client for profiles with role check and other operations
  const serviceClient = createServiceClient()
  const { data: profile, error: profileError } = await (serviceClient as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'instructor') {
    throw new Error('Only instructors can create responses')
  }

  // Create the instructor response - tables exist but not in schema, so we cast
  const { data: response, error } = await (serviceClient as any)
    .from('instructor_goal_responses')
    .insert({
      instructor_id: user.id,
      student_id: data.studentId,
      daily_note_id: data.dailyNoteId,
      message: data.message,
      response_type: data.responseType || 'feedback',
      target_date: data.targetDate,
      metadata: data.metadata || {}
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating instructor response:', error)
    throw new Error('Failed to create instructor response')
  }

  // Revalidate relevant paths
  revalidatePath(`/instructor/students/${data.studentId}/goals`)
  revalidatePath('/student/goals')

  return response
}

export async function getInstructorResponsesForStudent(studentId: string, startDate?: string, endDate?: string) {
  const supabase = await createClient()

  // Get current user (should be instructor)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  const serviceClient = createServiceClient()

  // Use service client with type assertion for missing table
  let query = (serviceClient as any)
    .from('instructor_goal_responses')
    .select('*')
    .eq('student_id', studentId)
    .order('target_date', { ascending: false })

  if (startDate) {
    query = query.gte('target_date', startDate)
  }
  if (endDate) {
    query = query.lte('target_date', endDate)
  }

  const { data: responses, error } = await query

  if (error) {
    console.error('Error fetching instructor responses:', error)
    throw new Error('Failed to fetch instructor responses')
  }

  return responses
}

export async function getInstructorResponsesForDate(studentId: string, targetDate: string) {
  const supabase = await createClient()
  const serviceClient = createServiceClient()

  const { data: responses, error } = await (serviceClient as any)
    .from('instructor_goal_responses')
    .select(`
      *,
      instructor_profile:user_profiles!instructor_id(
        full_name,
        email
      )
    `)
    .eq('student_id', studentId)
    .eq('target_date', targetDate)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching instructor responses for date:', error)
    throw new Error('Failed to fetch instructor responses')
  }

  // Get attached files for each response
  const { getInstructorResponseFiles } = await import('./instructor-response-attachments')
  const responsesWithFiles = await Promise.all(
    (responses || []).map(async (response: any) => {
      const files = await getInstructorResponseFiles(response.id)
      return {
        ...response,
        attachedFiles: files
      }
    })
  )

  return responsesWithFiles
}

export async function updateInstructorResponse(responseId: string, updates: Partial<CreateInstructorResponseData>) {
  const supabase = await createClient()
  
  // Get current user (should be instructor)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  const serviceClient = createServiceClient()

  // Update the response (RLS will ensure only the instructor who created it can update)
  const { data: response, error } = await (serviceClient as any)
    .from('instructor_goal_responses')
    .update({
      message: updates.message,
      response_type: updates.responseType,
      metadata: updates.metadata,
      updated_at: new Date().toISOString()
    })
    .eq('id', responseId)
    .eq('instructor_id', user.id) // Additional safety check
    .select('*')
    .single()

  if (error) {
    console.error('Error updating instructor response:', error)
    throw new Error('Failed to update instructor response')
  }

  // Revalidate relevant paths
  if (response) {
    revalidatePath(`/instructor/students/${response.student_id}/goals`)
    revalidatePath('/student/goals')
  }

  return response
}

export async function deleteInstructorResponse(responseId: string) {
  const supabase = await createClient()

  // Get current user (should be instructor)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  const serviceClient = createServiceClient()

  // Get the response first to know which paths to revalidate
  const { data: response, error: fetchError } = await (serviceClient as any)
    .from('instructor_goal_responses')
    .select('student_id')
    .eq('id', responseId)
    .eq('instructor_id', user.id)
    .single()

  if (fetchError) {
    throw new Error('Response not found or not authorized')
  }

  // Delete the response
  const { error } = await (serviceClient as any)
    .from('instructor_goal_responses')
    .delete()
    .eq('id', responseId)
    .eq('instructor_id', user.id) // Additional safety check

  if (error) {
    console.error('Error deleting instructor response:', error)
    throw new Error('Failed to delete instructor response')
  }

  // Revalidate relevant paths
  revalidatePath(`/instructor/students/${response.student_id}/goals`)
  revalidatePath('/student/goals')

  return { success: true }
}

// Get student's goal progress for instructor view
export async function getStudentGoalProgress(studentId: string) {
  const supabase = await createClient()
  
  // Get current user (should be instructor)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  const serviceClient = createServiceClient()
  const { data, error } = await (serviceClient as any)
    .from('profiles')
    .select(`
      goal_title,
      goal_current_amount,
      goal_target_amount,
      goal_progress,
      goal_target_date,
      goal_start_date,
      goal_status
    `)
    .eq('id', studentId)
    .single()

  if (error) {
    throw new Error('Failed to get student goal progress')
  }

  return data
}

// Get student's daily notes and actions for instructor view
export async function getStudentDailyGoalData(studentId: string, {
  startDate,
  endDate,
  limit = 30
}: {
  startDate?: string
  endDate?: string
  limit?: number
} = {}) {
  const supabase = await createClient()
  
  // Get current user (should be instructor)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  const serviceClient = createServiceClient()

  // Get user actions using service client
  let actionsQuery = (serviceClient as any)
    .from('user_actions')
    .select('*')
    .eq('user_id', studentId)
    .order('action_date', { ascending: false })

  if (startDate) {
    actionsQuery = actionsQuery.gte('action_date', startDate)
  }

  if (endDate) {
    actionsQuery = actionsQuery.lte('action_date', endDate)
  }

  if (limit) {
    actionsQuery = actionsQuery.limit(limit)
  }

  const userActionsResult = await actionsQuery

  if (userActionsResult.error) {
    throw new Error('Failed to get student actions')
  }

  // Note: Daily notes feature removed - data migrated to conversation_messages system
  return {
    dailyNotes: [], // Daily notes feature removed
    userActions: userActionsResult.data || []
  }
}

// Reassign goal for student (Architecture-compliant server action)
export async function reassignStudentGoal(studentId: string, goalId: string | null) {
  console.log('🚀 Reassign goal server action called for student:', studentId, 'goal:', goalId)

  const supabase = await createClient()

  // Get current user (should be instructor)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('❌ Auth error:', authError)
    return { success: false, error: 'Not authenticated' }
  }

  console.log('✅ User authenticated:', user.id, user.email)

  const serviceClient = createServiceClient()

  // Verify user is an instructor
  const { data: profile, error: profileError } = await (serviceClient as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'instructor') {
    console.error('❌ Role check failed:', profileError, profile?.role)
    return { success: false, error: 'Only instructors can reassign goals' }
  }

  try {
    if (goalId === null) {
      // Remove goal assignment - put student back in pending review
      console.log('🗑️ Removing goal assignment for student:', studentId)

      const { error: updateError } = await (serviceClient as any)
        .from('profiles')
        .update({
          current_goal_id: null,
          current_track_id: null,
          goal_assigned_at: null,
          track_assigned_at: null
        })
        .eq('id', studentId)

      if (updateError) {
        console.error('Failed to remove goal assignment:', updateError)
        return { success: false, error: 'Failed to remove goal assignment' }
      }

      // Update or create a goal conversation to pending status
      const { data: existingConversation } = await (serviceClient as any)
        .from('goal_conversations')
        .select('id')
        .eq('student_id', studentId)
        .single()

      if (existingConversation) {
        // Update existing conversation to pending
        await (serviceClient as any)
          .from('goal_conversations')
          .update({
            status: 'pending_instructor_review',
            instructor_id: user.id
          })
          .eq('id', existingConversation.id)
      } else {
        // Create new pending conversation
        await (serviceClient as any)
          .from('goal_conversations')
          .insert({
            student_id: studentId,
            instructor_id: user.id,
            status: 'pending_instructor_review'
          })
      }

      // Revalidate relevant paths
      revalidatePath(`/instructor/students/${studentId}`)
      revalidatePath('/instructor/students')

      // Broadcast WebSocket message for real-time updates
      console.log('🔥 [WEBSOCKET] Broadcasting goal removal for student:', studentId)
      await broadcastWebSocketMessage({
        type: 'goal-reassignment',
        data: {
          studentId,
          goalId: null,
          action: 'removed',
          userId: studentId // For student's course list updates
        }
      })
      console.log('✅ [WEBSOCKET] Goal removal broadcast completed')

      return { success: true, message: 'Goal removed successfully' }

    } else {
      // Reassign to new goal
      console.log('🔄 Reassigning student', studentId, 'to goal', goalId)

      // Get the track ID for this goal
      const { data: goal, error: goalError } = await (serviceClient as any)
        .from('track_goals')
        .select('track_id, name, description')
        .eq('id', goalId)
        .single()

      if (goalError || !goal) {
        console.error('Goal query error:', goalError)
        return { success: false, error: 'Goal not found' }
      }

      console.log('Found goal:', goal)

      // Update student's goal assignment
      const { data: updateResult, error: updateError } = await (serviceClient as any)
        .from('profiles')
        .update({
          current_goal_id: goalId,
          current_track_id: goal.track_id,
          goal_assigned_at: new Date().toISOString(),
          track_assigned_at: new Date().toISOString()
        })
        .eq('id', studentId)
        .select('id, current_goal_id, current_track_id')

      console.log('📊 Update result:', updateResult)
      console.log('❌ Update error:', updateError)

      if (updateError) {
        console.error('Failed to reassign goal:', updateError)
        return { success: false, error: `Failed to reassign goal: ${updateError.message}` }
      }

      if (!updateResult || updateResult.length === 0) {
        console.error('❌ No rows were updated - student not found or no changes made')
        return { success: false, error: 'Student profile not found or update failed' }
      }

      console.log('✅ Goal assignment successful, updated profile:', updateResult[0])

      // Update conversation status to active if exists
      await (serviceClient as any)
        .from('goal_conversations')
        .update({ status: 'active' })
        .eq('student_id', studentId)

      // Revalidate relevant paths
      revalidatePath(`/instructor/students/${studentId}`)
      revalidatePath('/instructor/students')

      // Broadcast WebSocket message for real-time updates
      console.log('🔥 [WEBSOCKET] Broadcasting goal assignment for student:', studentId, 'to goal:', goalId)
      await broadcastWebSocketMessage({
        type: 'goal-reassignment',
        data: {
          studentId,
          goalId,
          goalName: goal.name,
          trackId: goal.track_id,
          action: 'assigned',
          userId: studentId // For student's course list updates
        }
      })
      console.log('✅ [WEBSOCKET] Goal assignment broadcast completed')

      return { success: true, message: 'Goal reassigned successfully' }
    }
  } catch (error) {
    console.error('Goal reassignment error:', error)
    return { success: false, error: 'Internal server error' }
  }
}
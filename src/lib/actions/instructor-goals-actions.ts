'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  // Get daily notes using service client
  let notesQuery = (serviceClient as any)
    .from('user_daily_notes')
    .select('*')
    .eq('user_id', studentId)
    .order('note_date', { ascending: false })

  if (startDate) {
    notesQuery = notesQuery.gte('note_date', startDate)
  }

  if (endDate) {
    notesQuery = notesQuery.lte('note_date', endDate)
  }

  if (limit) {
    notesQuery = notesQuery.limit(limit)
  }

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

  const [dailyNotesResult, userActionsResult] = await Promise.all([
    notesQuery,
    actionsQuery
  ])

  if (dailyNotesResult.error) {
    throw new Error('Failed to get student daily notes')
  }

  if (userActionsResult.error) {
    throw new Error('Failed to get student actions')
  }

  // Get files for each daily note
  const { getDailyNoteFiles } = await import('./daily-note-attachments')
  const notesWithFiles = await Promise.all(
    (dailyNotesResult.data || []).map(async (note: any) => {
      const files = await getDailyNoteFiles(note.id, studentId) // Pass studentId for instructor view
      return {
        ...note,
        attachedFiles: files
      }
    })
  )

  return {
    dailyNotes: notesWithFiles,
    userActions: userActionsResult.data || []
  }
}
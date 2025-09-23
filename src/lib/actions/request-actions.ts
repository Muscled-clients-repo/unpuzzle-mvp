'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateRequestParams {
  request_type: 'bug_report' | 'feature_request' | 'track_change' | 'refund'
  title: string
  description: string
  metadata?: Record<string, unknown>
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export async function createRequest(params: CreateRequestParams) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // For track change requests, check if user already has a pending request
  if (params.request_type === 'track_change') {
    const { data: existingRequest } = await supabase
      .from('requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('request_type', 'track_change')
      .in('status', ['pending', 'in_review', 'approved'])
      .limit(1)

    if (existingRequest && existingRequest.length > 0) {
      const status = existingRequest[0].status
      const statusText = status === 'approved' ? 'approved and awaiting questionnaire completion' : 'pending instructor review'
      throw new Error(`You already have a track change request that is ${statusText}. Please wait for it to be completed before submitting a new request.`)
    }
  }

  const { error } = await supabase
    .from('requests')
    .insert({
      user_id: user.id,
      request_type: params.request_type,
      title: params.title,
      description: params.description,
      metadata: params.metadata || {},
      priority: params.priority || 'medium'
    })

  if (error) {
    console.error('Failed to create request:', error)
    throw new Error('Failed to create request')
  }

  revalidatePath('/instructor')
  return { success: true }
}

export async function getUserCurrentTrack() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Get user's current track from profiles table (single source of truth)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      current_track_id,
      tracks!inner (
        id,
        name,
        description
      )
    `)
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Failed to get user track:', error)
    throw new Error('Failed to get current track')
  }

  return profile?.tracks || null
}

export async function getAllTracks() {
  const supabase = await createClient()

  const { data: tracks, error } = await supabase
    .from('tracks')
    .select('id, name, description')
    .eq('is_active', true)

  if (error) {
    console.error('Failed to get tracks:', error)
    throw new Error('Failed to get tracks')
  }

  return tracks || []
}

export async function getAllRequests() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Check if user is instructor/admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['instructor', 'admin'].includes(profile.role)) {
    throw new Error('Access denied')
  }

  const { data: requests, error } = await supabase
    .from('requests')
    .select(`
      id,
      request_type,
      title,
      description,
      status,
      priority,
      metadata,
      created_at,
      updated_at,
      resolved_at,
      profiles!user_id (
        id,
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to get requests:', error)
    throw new Error('Failed to get requests')
  }

  return requests || []
}

export async function updateRequestStatus(requestId: string, status: string, assignedTo?: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString()
  }

  if (assignedTo) {
    updateData.assigned_to = assignedTo
  }

  if (status === 'completed' || status === 'rejected') {
    updateData.resolved_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('requests')
    .update(updateData)
    .eq('id', requestId)

  if (error) {
    console.error('Failed to update request:', error)
    throw new Error('Failed to update request')
  }

  revalidatePath('/instructor')
  return { success: true }
}

export async function approveTrackChangeRequest(requestId: string, approvalNotes?: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Check if user is instructor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['instructor', 'admin'].includes(profile.role)) {
    throw new Error('Access denied')
  }

  // Get the track change request
  const { data: request, error: requestError } = await supabase
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .eq('request_type', 'track_change')
    .single()

  if (requestError || !request) {
    throw new Error('Track change request not found')
  }

  const metadata = request.metadata || {}

  // Update request status to approved
  const { error: updateError } = await supabase
    .from('requests')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString(),
      assigned_to: user.id,
      metadata: {
        ...metadata,
        approval_notes: approvalNotes,
        approved_at: new Date().toISOString(),
        next_step: 'questionnaire_required'
      }
    })
    .eq('id', requestId)

  if (updateError) {
    throw new Error('Failed to approve track change request')
  }

  // Invalidate relevant queries
  revalidatePath('/instructor/requests')
  revalidatePath('/instructor/requests/track-assignments')
  revalidatePath('/student/track-selection')

  return {
    success: true,
    message: 'Track change approved. Student will be notified to complete questionnaire for new track.',
    questionnaire_url: `/student/track-selection/questionnaire?track=${metadata.desired_track?.toLowerCase().includes('saas') ? 'saas' : 'agency'}&change_request=${requestId}`
  }
}

export async function getStudentTrackChangeStatus(studentId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Students can only check their own status, instructors can check any student
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isInstructor = profile?.role === 'instructor' || profile?.role === 'admin'
  const targetStudentId = isInstructor ? studentId : user.id

  // Get track change requests for the student
  const { data: requests, error } = await supabase
    .from('requests')
    .select('*')
    .eq('user_id', targetStudentId)
    .eq('request_type', 'track_change')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error('Failed to get track change status')
  }

  return requests?.[0] || null
}

export async function markTrackChangeCompleted(requestId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Check if user is instructor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['instructor', 'admin'].includes(profile.role)) {
    throw new Error('Access denied')
  }

  // Update request status to completed
  const { error: updateError } = await supabase
    .from('requests')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
      metadata: {
        completed_at: new Date().toISOString(),
        completed_by: user.id
      }
    })
    .eq('id', requestId)
    .eq('request_type', 'track_change')

  if (updateError) {
    throw new Error('Failed to mark track change as completed')
  }

  // Invalidate relevant queries
  revalidatePath('/instructor/requests')
  revalidatePath('/instructor/requests/track-assignments')

  return { success: true }
}

export async function createTrackChangeRequestWithQuestionnaire({
  currentTrackName,
  desiredTrackName,
  questionnaire,
  trackType
}: {
  currentTrackName: string
  desiredTrackName: string
  questionnaire: any
  trackType: 'agency' | 'saas'
}) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Check for existing pending track change request
  const { data: existingRequest } = await supabase
    .from('requests')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('request_type', 'track_change')
    .in('status', ['pending', 'in_review', 'approved'])
    .limit(1)

  if (existingRequest && existingRequest.length > 0) {
    const status = existingRequest[0].status
    const statusText = status === 'approved' ? 'approved and awaiting goal assignment' : 'pending instructor review'
    throw new Error(`You already have a track change request that is ${statusText}. Please wait for it to be completed before submitting a new request.`)
  }

  // Create track change request with questionnaire data
  const { data: request, error } = await supabase
    .from('requests')
    .insert({
      user_id: user.id,
      request_type: 'track_change',
      title: `Request to switch to ${desiredTrackName}`,
      description: `I would like to switch from my current track "${currentTrackName}" to "${desiredTrackName}". I have completed the questionnaire for the new track.`,
      metadata: {
        current_track: currentTrackName,
        desired_track: desiredTrackName,
        desired_track_type: trackType,
        questionnaire_responses: questionnaire,
        questionnaire_completed_at: new Date().toISOString(),
        next_step: 'instructor_review_and_goal_assignment'
      },
      priority: 'medium'
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create track change request:', error)
    throw new Error('Failed to create track change request')
  }

  revalidatePath('/instructor/requests')
  revalidatePath('/instructor/requests/track-assignments')
  revalidatePath('/student/track-selection')

  return {
    success: true,
    requestId: request.id,
    message: 'Track change request submitted with questionnaire! An instructor will review your request and assign an appropriate goal.'
  }
}

export async function acceptTrackChangeRequest(requestId: string, goalId?: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Check if user is instructor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['instructor', 'admin'].includes(profile.role)) {
    throw new Error('Access denied: Instructor role required')
  }

  // Get the track change request
  console.log('[DEBUG] acceptTrackChangeRequest - Looking for request with ID:', requestId)

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .eq('request_type', 'track_change')
    .single()

  console.log('[DEBUG] acceptTrackChangeRequest - Request query result:', { request, requestError })

  if (requestError || !request) {
    console.error('[DEBUG] acceptTrackChangeRequest - Request not found:', { requestId, requestError })
    throw new Error('Track change request not found')
  }

  const metadata = request.metadata || {}
  const questionnaireData = metadata.questionnaire_responses || {}

  // Validate that questionnaire data exists
  if (Object.keys(questionnaireData).length === 0) {
    throw new Error('Cannot accept request without questionnaire data. This appears to be a legacy request.')
  }

  // Get the desired track ID from track name
  const { data: desiredTrack } = await supabase
    .from('tracks')
    .select('id')
    .eq('name', metadata.desired_track)
    .single()

  if (!desiredTrack) {
    throw new Error(`Track not found: ${metadata.desired_track}`)
  }

  // Step 1: Close any existing active conversations (track change workflow)
  const { error: closeError } = await supabase
    .from('goal_conversations')
    .update({
      status: 'track_changed',
      ended_at: new Date().toISOString(),
      end_reason: 'track_change',
      transition_to_track_id: desiredTrack.id
    })
    .eq('student_id', request.user_id)
    .eq('status', 'active')

  if (closeError) {
    console.error('Failed to close existing conversations:', closeError)
    throw new Error('Failed to close existing conversations')
  }

  // Step 2: Create new conversation for the new track
  let conversation = null

  // Determine conversation status based on whether goal is assigned
  const conversationStatus = goalId ? 'active' : 'pending_instructor_review'

  // Always create a new conversation for track changes
  const { data: newConversation, error: conversationError } = await supabase
    .from('goal_conversations')
    .insert({
      student_id: request.user_id,
      instructor_id: user.id,
      status: conversationStatus,
      track_id: desiredTrack.id,
      goal_id: goalId || null
    })
    .select()
    .single()

  if (conversationError) {
    console.error('Failed to create conversation:', conversationError)
    throw new Error('Failed to create conversation for goal assignment')
  }

  conversation = newConversation

  // Create questionnaire message in the conversation
  const { error: messageError } = await supabase
    .from('conversation_messages')
    .insert({
      conversation_id: conversation.id,
      sender_id: request.user_id,
      message_type: 'questionnaire_response',
      content: `Track Change Questionnaire for ${metadata.desired_track}`,
      metadata: {
        questionnaire_type: 'track_change',
        responses: questionnaireData,
        submitted_at: metadata.questionnaire_completed_at || new Date().toISOString(),
        track_change_request_id: requestId,
        transition_type: 'track_change',
        from_track: metadata.current_track,
        to_track: metadata.desired_track,
        track_id: desiredTrack.id
      }
    })

  if (messageError) {
    console.error('Failed to create questionnaire message:', messageError)
    // Clean up the conversation if message creation fails
    await supabase.from('goal_conversations').delete().eq('id', conversation.id)
    throw new Error('Failed to transfer questionnaire data to conversation')
  }

  // Update the student's profile to the new track and goal
  const profileUpdateData: any = {
    current_track_id: desiredTrack.id,
    track_assigned_at: new Date().toISOString()
  }

  // If a goal is assigned, also update the current_goal_id
  if (goalId) {
    profileUpdateData.current_goal_id = goalId
    profileUpdateData.goal_assigned_at = new Date().toISOString()
  }

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update(profileUpdateData)
    .eq('id', request.user_id)

  if (profileUpdateError) {
    console.error('Failed to update student profile track:', profileUpdateError)
    // Clean up the conversation if profile update fails
    await supabase.from('goal_conversations').delete().eq('id', conversation.id)
    throw new Error('Failed to update student track assignment')
  }

  // Update request status to approved and mark conversation created
  const { error: updateError } = await supabase
    .from('requests')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString(),
      assigned_to: user.id,
      metadata: {
        ...metadata,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        conversation_id: conversation.id,
        next_step: 'goal_assignment',
        track_changed_to: desiredTrack.id,
        track_changed_at: new Date().toISOString()
      }
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('Failed to update request status:', updateError)
    // Clean up the conversation and revert profile if request update fails
    await supabase.from('goal_conversations').delete().eq('id', conversation.id)
    // Note: We could revert the profile track here, but since the conversation creation succeeded,
    // it's probably safer to leave the track changed and let the instructor handle it manually
    throw new Error('Failed to update request status')
  }

  // Invalidate relevant paths
  revalidatePath('/instructor/requests')
  revalidatePath('/instructor/requests/track-assignments')
  revalidatePath('/instructor/student-goals')
  revalidatePath('/student/track-selection')

  return {
    success: true,
    conversationId: conversation.id,
    message: goalId
      ? 'Track change request accepted and goal assigned! The student has been switched to their new track with an active goal.'
      : 'Track change request accepted! Questionnaire data transferred to conversation. You can now assign a goal to the student.'
  }
}
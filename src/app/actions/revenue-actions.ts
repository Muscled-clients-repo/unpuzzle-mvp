'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Revenue submission metadata structure
 */
interface RevenueSubmissionMetadata {
  message_type: 'revenue_submission'
  track_type: 'agency' | 'saas'
  submitted_amount: number
  proof_video_url: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
}

/**
 * Submit revenue proof for instructor approval
 * Creates a conversation message with revenue submission metadata
 */
export async function submitRevenueProof(params: {
  conversationId: string
  amount: number
  proofVideoUrl: string
  trackType: 'agency' | 'saas'
}) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Verify conversation exists and user is participant
    const { data: conversation, error: convError } = await supabase
      .from('goal_conversations')
      .select('id, student_id, instructor_id')
      .eq('id', params.conversationId)
      .single()

    if (convError || !conversation) {
      return { error: 'Conversation not found' }
    }

    if (conversation.student_id !== user.id) {
      return { error: 'Only students can submit revenue proof' }
    }

    // Check if there's already a pending submission
    const { data: existingPending } = await supabase
      .from('conversation_messages')
      .select('id, metadata')
      .eq('conversation_id', params.conversationId)
      .eq('sender_id', user.id)
      .eq('message_type', 'revenue_submission')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingPending) {
      const metadata = existingPending.metadata as RevenueSubmissionMetadata
      if (metadata.status === 'pending') {
        return { error: 'You already have a pending revenue submission. Please wait for instructor review.' }
      }
    }

    // Create revenue submission message
    const metadata: RevenueSubmissionMetadata = {
      message_type: 'revenue_submission',
      track_type: params.trackType,
      submitted_amount: params.amount,
      proof_video_url: params.proofVideoUrl,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null
    }

    const { data: message, error: messageError } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: params.conversationId,
        sender_id: user.id,
        message_type: 'revenue_submission',
        content: `Submitted revenue proof: $${params.amount.toLocaleString()} (${params.trackType})`,
        metadata,
        target_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating revenue submission:', messageError)
      return { error: 'Failed to submit revenue proof' }
    }

    // Notify instructor about new revenue submission
    if (conversation.instructor_id) {
      try {
        // Get student profile for notification
        const { data: studentProfile } = await supabase
          .from('profiles')
          .select('full_name, email, goal_title')
          .eq('id', user.id)
          .single()

        // Notify the assigned instructor
        await supabase.rpc('notify_instructor', {
          instructor_id: conversation.instructor_id,
          notification_type: 'revenue_submission',
          notification_title: `New Revenue Submission from ${studentProfile?.full_name || 'Student'}`,
          notification_message: `${studentProfile?.full_name || 'Student'} submitted $${params.amount.toLocaleString()} in revenue for review`,
          notification_metadata: {
            submissionId: message.id,
            studentName: studentProfile?.full_name || 'Unknown',
            studentEmail: studentProfile?.email || user.email,
            amount: params.amount,
            goalTitle: studentProfile?.goal_title || 'Unknown Goal'
          },
          notification_action_url: `/instructor/student-goals/${user.id}`
        })
      } catch (notifError) {
        // Log but don't fail the submission if notification fails
        console.error('Failed to send revenue submission notification:', notifError)
      }
    }

    revalidatePath('/student/goals')
    return { success: true, messageId: message.id }
  } catch (error) {
    console.error('Error in submitRevenueProof:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get the latest revenue submission for a user in a conversation
 * For students: gets their own submission
 * For instructors: gets the student's submission in this conversation
 */
export async function getLatestRevenueSubmission(conversationId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // First, get the conversation to determine if user is instructor or student
    const { data: conversation, error: convError } = await supabase
      .from('goal_conversations')
      .select('student_id, instructor_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return { error: 'Conversation not found' }
    }

    const isInstructor = conversation.instructor_id === user.id
    const senderId = isInstructor ? conversation.student_id : user.id

    const { data: message, error: messageError } = await supabase
      .from('conversation_messages')
      .select('id, content, metadata, created_at, sender_id')
      .eq('conversation_id', conversationId)
      .eq('sender_id', senderId)
      .eq('message_type', 'revenue_submission')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (messageError) {
      console.error('Error fetching latest submission:', messageError)
      return { error: 'Failed to fetch submission status' }
    }

    return { submission: message }
  } catch (error) {
    console.error('Error in getLatestRevenueSubmission:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Review revenue submission (instructor only)
 * Approves or rejects the submission and updates user's profile accordingly
 */
export async function reviewRevenueSubmission(params: {
  messageId: string
  approved: boolean
  rejectionReason?: string
}) {
  try {
    const supabase = await createClient()

    // Get current user (instructor)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Get the message and verify it's a revenue submission
    const { data: message, error: messageError } = await supabase
      .from('conversation_messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        message_type,
        metadata,
        goal_conversations!inner (
          id,
          student_id,
          instructor_id
        )
      `)
      .eq('id', params.messageId)
      .single()

    if (messageError || !message) {
      return { error: 'Submission not found' }
    }

    // Verify user is the instructor
    const conversation = message.goal_conversations as any
    if (conversation.instructor_id !== user.id) {
      return { error: 'Only the assigned instructor can review submissions' }
    }

    if (message.message_type !== 'revenue_submission') {
      return { error: 'Invalid message type' }
    }

    const metadata = message.metadata as RevenueSubmissionMetadata

    // Check if already reviewed
    if (metadata.status !== 'pending') {
      return { error: 'This submission has already been reviewed' }
    }

    // Update metadata with review
    const updatedMetadata: RevenueSubmissionMetadata = {
      ...metadata,
      status: params.approved ? 'approved' : 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: params.approved ? null : params.rejectionReason || 'No reason provided'
    }

    // Update message
    const { error: updateError } = await supabase
      .from('conversation_messages')
      .update({
        metadata: updatedMetadata,
        content: params.approved
          ? `Revenue proof approved: $${metadata.submitted_amount.toLocaleString()} (${metadata.track_type})`
          : `Revenue proof rejected: $${metadata.submitted_amount.toLocaleString()} - ${updatedMetadata.rejection_reason}`
      })
      .eq('id', params.messageId)

    if (updateError) {
      console.error('Error updating message:', updateError)
      return { error: 'Failed to update submission' }
    }

    // If approved, update user's profile revenue
    if (params.approved) {
      const { error: revenueError } = await supabase.rpc('update_user_revenue', {
        p_user_id: conversation.student_id,
        p_track_type: metadata.track_type,
        p_amount: metadata.submitted_amount
      })

      if (revenueError) {
        console.error('Error updating user revenue:', revenueError)
        // Don't return error - message is already updated, this is just a sync issue
      }

      // Notify student about approved revenue submission
      try {
        // Get student profile for notification
        const { data: studentProfile } = await supabase
          .from('profiles')
          .select('full_name, goal_title')
          .eq('id', conversation.student_id)
          .single()

        // Notify the student
        await supabase.rpc('notify_instructor', {
          instructor_id: conversation.student_id, // Using the student_id here since notify_instructor sends to user_id
          notification_type: 'system',
          notification_title: `Revenue Submission Approved!`,
          notification_message: `Your $${metadata.submitted_amount.toLocaleString()} revenue submission has been approved and added to your progress.`,
          notification_metadata: {
            submissionId: params.messageId,
            amount: metadata.submitted_amount,
            goalTitle: studentProfile?.goal_title || 'Your Goal',
            trackType: metadata.track_type
          },
          notification_action_url: `/student/goals`
        })
      } catch (notifError) {
        // Log but don't fail if notification fails
        console.error('Failed to send approval notification:', notifError)
      }
    }

    revalidatePath('/student/goals')
    revalidatePath('/instructor/students')
    return { success: true }
  } catch (error) {
    console.error('Error in reviewRevenueSubmission:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get user's current revenue progress
 */
export async function getUserRevenueProgress() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { data: progress, error: progressError } = await supabase
      .rpc('get_goal_progress', { p_user_id: user.id })

    if (progressError) {
      console.error('Error fetching revenue progress:', progressError)
      return { error: 'Failed to fetch progress' }
    }

    return { progress: progress?.[0] || null }
  } catch (error) {
    console.error('Error in getUserRevenueProgress:', error)
    return { error: 'An unexpected error occurred' }
  }
}

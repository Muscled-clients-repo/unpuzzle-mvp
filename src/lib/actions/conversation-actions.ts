'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { broadcastWebSocketMessage } from '@/lib/websocket-operations'
import { CONVERSATION_EVENTS } from '@/lib/course-event-observer'

// Unified interfaces for conversation system
export interface ConversationMessage {
  id: string
  conversation_id: string
  sender_id: string
  message_type: 'daily_note' | 'instructor_response' | 'activity' | 'milestone'
  content: string
  metadata: Record<string, any>
  reply_to_id?: string
  target_date?: string
  created_at: string
  updated_at: string
  sender_name: string
  sender_role: string
  sender_avatar?: string
  reply_content?: string
  reply_sender_name?: string
  attachments: MessageAttachment[]
}

export interface MessageAttachment {
  id: string
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  cdn_url: string
  created_at: string
}

export interface CreateMessageData {
  conversationId?: string
  studentId?: string // For creating conversation if it doesn't exist
  messageType: 'daily_note' | 'instructor_response' | 'activity' | 'milestone'
  content: string
  targetDate?: string
  replyToId?: string
  metadata?: Record<string, any>
}

export interface ConversationData {
  conversation: {
    id: string
    student_id: string
    instructor_id?: string
    status: string
    created_at: string
  }
  messages: ConversationMessage[]
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

// Helper function to get or create conversation
async function getOrCreateConversation(studentId: string, instructorId?: string) {
  const serviceClient = createServiceClient()

  // Try to find existing conversation with proper null handling
  let query = (serviceClient as any)
    .from('goal_conversations')
    .select('*')
    .eq('student_id', studentId)

  if (instructorId) {
    query = query.eq('instructor_id', instructorId)
  } else {
    query = query.is('instructor_id', null)
  }

  const { data: existing } = await query.maybeSingle()

  if (existing) {
    console.log('[CONVERSATION] Found existing conversation:', existing.id)
    return existing
  }

  console.log('[CONVERSATION] Creating new conversation for studentId:', studentId, 'instructorId:', instructorId)

  // Create new conversation
  const { data: newConversation, error } = await (serviceClient as any)
    .from('goal_conversations')
    .insert({
      student_id: studentId,
      instructor_id: instructorId,
      status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error('[CONVERSATION] Failed to create conversation:', error)
    throw new Error(`Failed to create conversation: ${error.message}`)
  }

  console.log('[CONVERSATION] Created new conversation:', newConversation.id)
  return newConversation
}

/**
 * Get complete conversation data with single optimized query
 * Replaces multiple queries from old fragmented system
 */
export async function getConversationData(studentId: string, options: {
  startDate?: string
  endDate?: string
  limit?: number
  instructorId?: string
} = {}): Promise<ConversationData> {
  const user = await requireAuth()
  const serviceClient = createServiceClient()

  // Validate studentId
  if (!studentId || studentId.trim() === '') {
    throw new Error('Student ID is required')
  }

  // Verify user has access to this conversation
  console.log('[CONVERSATION] Checking access for user:', user.id, 'studentId:', studentId)

  let conversationQuery = (serviceClient as any)
    .from('goal_conversations')
    .select('*')
    .eq('student_id', studentId)

  // For now, get any conversation for this student (instructor can view any)
  // TODO: Add proper instructor assignment logic later
  // Just get the first conversation for this student
  conversationQuery = conversationQuery.limit(1)

  const { data: conversation, error: convError } = await conversationQuery.single()

  console.log('[CONVERSATION] Query result:', { conversation, convError })

  if (convError || !conversation) {
    console.log('[CONVERSATION] No conversation found or error:', convError)
    // Create conversation if user is student and it doesn't exist
    if (user.id === studentId) {
      console.log('[CONVERSATION] Creating new conversation for student')
      const newConversation = await getOrCreateConversation(studentId, options.instructorId)
      return {
        conversation: newConversation,
        messages: [],
        totalCount: 0,
        hasMore: false
      }
    }
    console.log('[CONVERSATION] Access denied - user is not the student or assigned instructor')
    throw new Error('Conversation not found or access denied')
  }

  // Check if user has access to this conversation
  console.log('[CONVERSATION] Access check:', {
    userId: user.id,
    conversationStudentId: conversation.student_id,
    conversationInstructorId: conversation.instructor_id,
    isStudent: user.id === conversation.student_id,
    isInstructor: user.id === conversation.instructor_id,
    isStudentOnlyConversation: conversation.instructor_id === null
  })

  // TODO: Add proper role-based access control
  // For now, allow instructors to view any student conversation
  const hasAccess = (
    user.id === conversation.student_id || // User is the student
    user.id === conversation.instructor_id || // User is the assigned instructor
    true // Temporary: allow all authenticated users (instructors) to view conversations
  )

  if (!hasAccess) {
    console.log('[CONVERSATION] Access denied - insufficient permissions')
    throw new Error('Conversation not found or access denied')
  }

  // Single optimized query using the view
  let query = (serviceClient as any)
    .from('conversation_timeline')
    .select('*')
    .eq('conversation_id', conversation.id)

  if (options.startDate) {
    query = query.gte('target_date', options.startDate)
  }
  if (options.endDate) {
    query = query.lte('target_date', options.endDate)
  }

  query = query
    .order('target_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(options.limit || 50)

  const { data: messages, error } = await query

  if (error) {
    throw new Error(`Failed to get conversation data: ${error.message}`)
  }

  return {
    conversation,
    messages: messages || []
  }
}

/**
 * Create a new message in the conversation
 * Unified function replacing createInstructorResponse, createOrUpdateDailyNote, etc.
 */
export async function createMessage(data: CreateMessageData) {
  const user = await requireAuth()
  const serviceClient = createServiceClient()

  let conversationId = data.conversationId

  // Create conversation if it doesn't exist
  if (!conversationId && data.studentId) {
    const instructorId = data.messageType === 'instructor_response' ? user.id : undefined
    const conversation = await getOrCreateConversation(data.studentId, instructorId)
    conversationId = conversation.id
  }

  if (!conversationId) {
    throw new Error('Conversation ID required or studentId must be provided')
  }

  // Verify user has access to this conversation
  const { data: conversation, error: convError } = await (serviceClient as any)
    .from('goal_conversations')
    .select('student_id, instructor_id')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation) {
    throw new Error('Conversation not found')
  }

  // Check permissions - Get user role from profiles
  const { data: profile } = await (serviceClient as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isStudent = user.id === conversation.student_id
  const isInstructor = profile?.role === 'instructor'
  const isAssignedInstructor = user.id === conversation.instructor_id

  const canCreateThisType =
    (data.messageType === 'daily_note' && isStudent) ||
    (data.messageType === 'instructor_response' && isInstructor) || // Any instructor can respond
    (data.messageType === 'activity' && isStudent) ||
    (data.messageType === 'milestone' && (isStudent || isInstructor))

  if (!canCreateThisType) {
    throw new Error('Permission denied for this message type')
  }

  // For instructor responses, check if one already exists for this date
  if (data.messageType === 'instructor_response' && data.targetDate) {
    const { data: existing } = await (serviceClient as any)
      .from('conversation_messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('message_type', 'instructor_response')
      .eq('target_date', data.targetDate)
      .eq('sender_id', user.id)
      .single()

    if (existing) {
      throw new Error('Only one instructor response per day is allowed. Please edit your existing response.')
    }
  }

  // Create the message
  const { data: message, error } = await (serviceClient as any)
    .from('conversation_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message_type: data.messageType,
      content: data.content,
      target_date: data.targetDate,
      reply_to_id: data.replyToId,
      metadata: data.metadata || {}
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create message: ${error.message}`)
  }

  // Broadcast WebSocket event for real-time updates
  await broadcastWebSocketMessage({
    type: CONVERSATION_EVENTS.MESSAGE_CREATED,
    data: {
      messageId: message.id,
      conversationId: message.conversation_id,
      studentId: data.studentId,
      messageType: data.messageType,
      senderId: user.id,
      senderRole: isInstructor ? 'instructor' : 'student',
      content: data.content,
      targetDate: data.targetDate,
      attachments: [] // Will be populated by attachment upload if any
    }
  })

  // Revalidate relevant paths
  revalidatePath('/instructor/student-goals')
  revalidatePath('/student/goals')

  return message
}

/**
 * Update an existing message
 * Unified function replacing updateInstructorResponse, etc.
 */
export async function updateMessage(messageId: string, updates: {
  content?: string
  metadata?: Record<string, any>
}) {
  const user = await requireAuth()
  const serviceClient = createServiceClient()

  // Verify user owns this message
  const { data: message, error: fetchError } = await (serviceClient as any)
    .from('conversation_messages')
    .select('sender_id, conversation_id')
    .eq('id', messageId)
    .eq('sender_id', user.id)
    .single()

  if (fetchError || !message) {
    throw new Error('Message not found or access denied')
  }

  // Update the message
  const { data: updatedMessage, error } = await (serviceClient as any)
    .from('conversation_messages')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .eq('sender_id', user.id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update message: ${error.message}`)
  }

  // Get conversation details for WebSocket broadcast
  const { data: conversation } = await (serviceClient as any)
    .from('goal_conversations')
    .select('student_id')
    .eq('id', message.conversation_id)
    .single()

  // Broadcast WebSocket event for real-time updates
  if (conversation) {
    await broadcastWebSocketMessage({
      type: CONVERSATION_EVENTS.MESSAGE_UPDATED,
      data: {
        messageId,
        conversationId: message.conversation_id,
        studentId: conversation.student_id,
        senderId: user.id,
        updates
      }
    })
  }

  // Revalidate relevant paths
  revalidatePath('/instructor/student-goals')
  revalidatePath('/student/goals')

  return updatedMessage
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string) {
  const user = await requireAuth()
  const serviceClient = createServiceClient()

  // Verify user owns this message
  const { data: message, error: fetchError } = await (serviceClient as any)
    .from('conversation_messages')
    .select('sender_id, conversation_id')
    .eq('id', messageId)
    .eq('sender_id', user.id)
    .single()

  if (fetchError || !message) {
    throw new Error('Message not found or access denied')
  }

  // Delete the message (attachments will cascade)
  const { error } = await (serviceClient as any)
    .from('conversation_messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', user.id)

  if (error) {
    throw new Error(`Failed to delete message: ${error.message}`)
  }

  // Revalidate relevant paths
  revalidatePath('/instructor/student-goals')
  revalidatePath('/student/goals')

  return { success: true }
}

/**
 * Get messages for a specific date (replaces getInstructorResponsesForDate)
 */
export async function getMessagesForDate(studentId: string, targetDate: string) {
  const conversationData = await getConversationData(studentId, {
    startDate: targetDate,
    endDate: targetDate
  })

  return conversationData.messages.filter(msg => msg.target_date === targetDate)
}

/**
 * Get student goal progress (compatible with existing interface)
 */
export async function getStudentGoalProgress(studentId: string) {
  const user = await requireAuth()
  const serviceClient = createServiceClient()

  // Verify user is instructor
  const { data: profile } = await (serviceClient as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'instructor') {
    throw new Error('Only instructors can view student goal progress')
  }

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
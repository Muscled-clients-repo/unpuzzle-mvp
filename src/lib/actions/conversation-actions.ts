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
  attachments: ConversationAttachment[]
}

export interface ConversationAttachment {
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

  console.log('[DEBUG] Looking for conversations with student_id:', studentId)

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

  // For instructors viewing student goals, prioritize pending questionnaire reviews
  // First try to find pending questionnaire review
  const { data: pendingConversation } = await (serviceClient as any)
    .from('goal_conversations')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'pending_instructor_review')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (pendingConversation) {
    console.log('[CONVERSATION] Found pending questionnaire review:', pendingConversation.id)
    conversationQuery = (serviceClient as any)
      .from('goal_conversations')
      .select('*')
      .eq('id', pendingConversation.id)
  } else {
    // Fallback to most recent active conversation
    conversationQuery = conversationQuery
      .order('created_at', { ascending: false })
      .limit(1)
  }

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
        messages: []
      }
    }

    // Check if user is instructor - allow them to see that no conversation exists yet
    const { data: profile } = await (serviceClient as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'instructor') {
      console.log('[CONVERSATION] Instructor viewing student with no conversation yet')
      // Return empty state for instructor to see "no questionnaire submitted yet"
      return {
        conversation: null,
        messages: []
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

  console.log('[CONVERSATION] Found conversation:', {
    conversationId: conversation.id,
    studentId: conversation.student_id,
    instructorId: conversation.instructor_id,
    status: conversation.status
  })

  // For questionnaire conversations, query messages directly since conversation_timeline view may not include questionnaire_response
  let messages: any[] = []
  let error: any = null

  if (conversation.status === 'pending_instructor_review') {
    console.log('[CONVERSATION] Pending questionnaire - querying messages directly')
    // Query conversation_messages directly for questionnaire data
    const { data: directMessages, error: directError } = await (serviceClient as any)
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })

    if (directError) {
      console.error('[CONVERSATION] Direct message query error:', directError)
      error = directError
    } else {
      // Get sender profiles separately
      const senderIds = directMessages?.map(msg => msg.sender_id) || []
      let profiles: any[] = []

      if (senderIds.length > 0) {
        const { data: profileData } = await (serviceClient as any)
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', senderIds)

        profiles = profileData || []
      }

      // Transform to match conversation_timeline format
      messages = directMessages?.map((msg: any) => {
        const profile = profiles.find(p => p.id === msg.sender_id)
        return {
          ...msg,
          sender_name: profile?.full_name || 'Unknown',
          sender_role: msg.message_type === 'instructor_response' ? 'instructor' : 'student',
          sender_avatar: profile?.avatar_url,
          attachments: [] // TODO: Add attachment support if needed
        }
      }) || []
    }
  } else {
    // DEBUG: First check if messages exist in the raw table
    const { data: rawMessages, error: rawError } = await (serviceClient as any)
      .from('conversation_messages')
      .select('id, content, message_type, target_date, created_at')
      .eq('conversation_id', conversation.id)
      .limit(5)

    console.log('[CONVERSATION] DEBUG - Raw messages in conversation_messages table:', {
      rawCount: rawMessages?.length || 0,
      rawError: rawError?.message || null,
      rawMessages: rawMessages || []
    })

    // DEBUG: Also test direct query with manual joins to bypass view issues
    const { data: debugMessages, error: debugError } = await (serviceClient as any)
      .from('conversation_messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        message_type,
        content,
        target_date,
        created_at,
        profiles!sender_id (
          full_name,
          role,
          avatar_url
        )
      `)
      .eq('conversation_id', conversation.id)
      .limit(5)

    console.log('[CONVERSATION] DEBUG - Direct message query with profiles:', {
      debugCount: debugMessages?.length || 0,
      debugError: debugError?.message || null,
      debugMessages: debugMessages?.map(m => ({
        id: m.id,
        content: m.content?.substring(0, 30),
        target_date: m.target_date,
        hasProfile: !!m.profiles,
        profileName: m.profiles?.full_name || 'MISSING'
      })) || []
    })

    // Use conversation_timeline view for regular conversations
    let query = (serviceClient as any)
      .from('conversation_timeline')
      .select('*')
      .eq('conversation_id', conversation.id)

    console.log('[CONVERSATION] Querying conversation_timeline for conversation:', conversation.id)
    console.log('[CONVERSATION] Query options:', { options, startDate: options.startDate, endDate: options.endDate, limit: options.limit })

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

    console.log('[CONVERSATION] Executing query...')
    const { data: timelineMessages, error: timelineError } = await query
    console.log('[CONVERSATION] Raw query result:', {
      messagesFound: timelineMessages?.length || 0,
      hasError: !!timelineError,
      errorMsg: timelineError?.message,
      firstRawMessage: timelineMessages?.[0] || null
    })

    messages = timelineMessages || []

    // 🔍 DEBUG: Log query results
    console.log('🔍 CONVERSATION TIMELINE QUERY RESULTS:', {
      conversationId: conversation.id,
      messagesCount: timelineMessages?.length || 0,
      error: timelineError?.message || null,
      firstMessage: timelineMessages?.[0] ? {
        id: timelineMessages[0].id,
        content: timelineMessages[0].content?.substring(0, 50) + '...',
        message_type: timelineMessages[0].message_type,
        target_date: timelineMessages[0].target_date,
        attachments: timelineMessages[0].attachments,
        attachmentsCount: Array.isArray(timelineMessages[0].attachments) ? timelineMessages[0].attachments.length : 'NOT_ARRAY'
      } : null
    })

    if (timelineError && messages.length === 0) {
      error = timelineError
    }
    // messages already set above in the temp fix logic
  }

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
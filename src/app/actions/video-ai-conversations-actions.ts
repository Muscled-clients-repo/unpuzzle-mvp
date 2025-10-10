'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface VideoAIConversation {
  id: string
  user_id: string
  media_file_id: string | null
  parent_message_id: string | null
  video_timestamp: number | null
  conversation_context: string | null
  user_message: string
  ai_response: string
  model_used: string | null
  metadata: Record<string, any>
  created_at: string
}

/**
 * Create a new AI conversation (question + answer)
 */
export async function createAIConversation(data: {
  media_file_id?: string
  parent_message_id?: string
  video_timestamp?: number
  conversation_context?: string
  user_message: string
  ai_response: string
  model_used?: string
  metadata?: Record<string, any>
}) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { data: conversation, error: insertError } = await supabase
      .from('video_ai_conversations')
      .insert({
        user_id: user.id,
        media_file_id: data.media_file_id || null,
        parent_message_id: data.parent_message_id || null,
        video_timestamp: data.video_timestamp || null,
        conversation_context: data.conversation_context || null,
        user_message: data.user_message,
        ai_response: data.ai_response,
        model_used: data.model_used || null,
        metadata: data.metadata || {}
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating AI conversation:', insertError)
      return { error: 'Failed to create conversation' }
    }

    // Auto-create community activity for AI conversation (only for root conversations, not follow-ups)
    if (!data.parent_message_id && data.media_file_id) {
      try {
        const { createCommunityActivity } = await import('./community-activity-actions')

        // Get video title for display
        const { data: video } = await supabase
          .from('media_files')
          .select('title')
          .eq('id', data.media_file_id)
          .single()

        await createCommunityActivity({
          activity_type: 'ai_chat',
          ai_conversation_id: conversation.id,
          media_file_id: data.media_file_id,
          video_title: video?.title || 'Untitled Video',
          timestamp_seconds: data.video_timestamp || null,
          content: data.user_message.length > 100
            ? data.user_message.substring(0, 100) + '...'
            : data.user_message,
          metadata: {
            model_used: data.model_used || 'unknown'
          },
          is_public: true // AI chats are public by default
        })
      } catch (activityError) {
        // Log but don't fail the conversation creation if activity creation fails
        console.error('[AIConversationAction] Failed to create community activity:', activityError)
      }
    }

    revalidatePath(`/video/${data.media_file_id}`)
    return { success: true, conversation }
  } catch (error) {
    console.error('Error in createAIConversation:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get all AI conversations for a specific video
 */
export async function getVideoAIConversations(mediaFileId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { data: conversations, error } = await supabase
      .from('video_ai_conversations')
      .select('*')
      .eq('media_file_id', mediaFileId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching AI conversations:', error)
      return { error: 'Failed to fetch conversations' }
    }

    return { conversations }
  } catch (error) {
    console.error('Error in getVideoAIConversations:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get a conversation thread (parent + all follow-ups)
 */
export async function getConversationThread(conversationId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Get the root conversation
    const { data: rootConversation, error: rootError } = await supabase
      .from('video_ai_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (rootError || !rootConversation) {
      return { error: 'Conversation not found' }
    }

    // Get all follow-ups recursively
    const { data: followUps, error: followUpsError } = await supabase
      .from('video_ai_conversations')
      .select('*')
      .eq('parent_message_id', conversationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (followUpsError) {
      console.error('Error fetching follow-ups:', followUpsError)
      return { error: 'Failed to fetch thread' }
    }

    const thread = [rootConversation, ...(followUps || [])]

    return { thread }
  } catch (error) {
    console.error('Error in getConversationThread:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Delete an AI conversation
 */
export async function deleteAIConversation(conversationId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { error: deleteError } = await supabase
      .from('video_ai_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting AI conversation:', deleteError)
      return { error: 'Failed to delete conversation' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteAIConversation:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get user's conversation history across all videos
 */
export async function getUserAIConversationHistory(limit = 50) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { data: conversations, error } = await supabase
      .from('video_ai_conversations')
      .select(`
        *,
        media_files:media_file_id (
          id,
          title,
          thumbnail_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching conversation history:', error)
      return { error: 'Failed to fetch history' }
    }

    return { conversations }
  } catch (error) {
    console.error('Error in getUserAIConversationHistory:', error)
    return { error: 'An unexpected error occurred' }
  }
}

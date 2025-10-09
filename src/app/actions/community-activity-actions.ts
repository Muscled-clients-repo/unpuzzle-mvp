'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActivityType =
  | 'ai_chat'
  | 'video_note'
  | 'voice_memo'
  | 'quiz'
  | 'goal_message'
  | 'revenue_proof'
  | 'goal_achieved'

export interface CommunityActivity {
  id: string
  user_id: string
  activity_type: ActivityType

  // Foreign keys to source tables
  ai_conversation_id: string | null
  reflection_id: string | null
  quiz_attempt_id: string | null
  conversation_message_id: string | null

  // Denormalized display fields
  media_file_id: string | null
  video_title: string | null
  timestamp_seconds: number | null
  goal_id: string | null
  goal_title: string | null
  content: string | null
  metadata: Record<string, any>
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface PrivateNote {
  id: string
  user_id: string
  goal_id: string | null
  media_file_id: string | null
  title: string | null
  content: string
  tags: string[] | null
  is_shared_with_instructor: boolean
  shared_at: string | null
  shared_to_conversation_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Create a community activity
 */
export async function createCommunityActivity(data: {
  activity_type: ActivityType

  // Source table foreign keys (only one should be set)
  ai_conversation_id?: string
  reflection_id?: string
  quiz_attempt_id?: string
  conversation_message_id?: string

  // Denormalized display data
  media_file_id?: string
  video_title?: string
  timestamp_seconds?: number
  goal_id?: string
  goal_title?: string
  content?: string
  metadata?: Record<string, any>
  is_public?: boolean
}) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { data: activity, error: insertError } = await supabase
      .from('community_activities')
      .insert({
        user_id: user.id,
        activity_type: data.activity_type,
        ai_conversation_id: data.ai_conversation_id || null,
        reflection_id: data.reflection_id || null,
        quiz_attempt_id: data.quiz_attempt_id || null,
        conversation_message_id: data.conversation_message_id || null,
        media_file_id: data.media_file_id || null,
        video_title: data.video_title || null,
        timestamp_seconds: data.timestamp_seconds || null,
        goal_id: data.goal_id || null,
        goal_title: data.goal_title || null,
        content: data.content || null,
        metadata: data.metadata || {},
        is_public: data.is_public !== undefined ? data.is_public : true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating activity:', insertError)
      return { error: 'Failed to create activity' }
    }

    revalidatePath('/community')
    return { success: true, activity }
  } catch (error) {
    console.error('Error in createCommunityActivity:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get public community activities (for community feed)
 */
export async function getCommunityActivities(limit = 50) {
  try {
    const supabase = await createClient()

    const { data: activities, error } = await supabase
      .from('community_activities')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching activities:', error)
      return { error: 'Failed to fetch activities' }
    }

    return { activities }
  } catch (error) {
    console.error('Error in getCommunityActivities:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get user's own activities (public and private)
 */
export async function getUserActivities(userId?: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const targetUserId = userId || user.id

    // Users can only view their own activities
    if (targetUserId !== user.id) {
      return { error: 'Unauthorized' }
    }

    const { data: activities, error } = await supabase
      .from('community_activities')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user activities:', error)
      return { error: 'Failed to fetch activities' }
    }

    return { activities }
  } catch (error) {
    console.error('Error in getUserActivities:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Delete an activity
 */
export async function deleteCommunityActivity(activityId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { error: deleteError } = await supabase
      .from('community_activities')
      .delete()
      .eq('id', activityId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting activity:', deleteError)
      return { error: 'Failed to delete activity' }
    }

    revalidatePath('/community')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteCommunityActivity:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Create a private note
 */
export async function createPrivateNote(data: {
  title?: string
  content: string
  goal_id?: string
  media_file_id?: string
  tags?: string[]
}) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { data: note, error: insertError } = await supabase
      .from('private_notes')
      .insert({
        user_id: user.id,
        title: data.title || null,
        content: data.content,
        goal_id: data.goal_id || null,
        media_file_id: data.media_file_id || null,
        tags: data.tags || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating private note:', insertError)
      return { error: 'Failed to create note' }
    }

    return { success: true, note }
  } catch (error) {
    console.error('Error in createPrivateNote:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get user's private notes
 */
export async function getPrivateNotes() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { data: notes, error } = await supabase
      .from('private_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching private notes:', error)
      return { error: 'Failed to fetch notes' }
    }

    return { notes }
  } catch (error) {
    console.error('Error in getPrivateNotes:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Share private note to goal conversation (one-way, cannot unshare)
 */
export async function shareNoteToConversation(noteId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Get the note
    const { data: note, error: noteError } = await supabase
      .from('private_notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single()

    if (noteError || !note) {
      return { error: 'Note not found' }
    }

    // Check if already shared
    if (note.is_shared_with_instructor) {
      return { error: 'Note already shared' }
    }

    // Find active goal conversation for today
    const { data: activeConversation, error: convError } = await supabase
      .from('goal_conversations')
      .select('id')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (convError || !activeConversation) {
      return { error: 'No active goal conversation found' }
    }

    // Create conversation message with shared note
    const { data: message, error: messageError } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: activeConversation.id,
        sender_id: user.id,
        message_type: 'shared_note',
        shared_note_id: noteId,
        content: note.content // Copy content for display
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return { error: 'Failed to share note' }
    }

    // Update private note to mark as shared (irreversible)
    const { error: updateError } = await supabase
      .from('private_notes')
      .update({
        is_shared_with_instructor: true,
        shared_at: new Date().toISOString(),
        shared_to_conversation_id: activeConversation.id
      })
      .eq('id', noteId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating note:', updateError)
      return { error: 'Failed to update note status' }
    }

    return { success: true, conversationId: activeConversation.id, message }
  } catch (error) {
    console.error('Error in shareNoteToConversation:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get shared notes (for instructors)
 */
export async function getSharedNotes() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Check if user is instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'instructor') {
      return { error: 'Only instructors can view shared notes' }
    }

    const { data: notes, error } = await supabase
      .from('private_notes')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('is_shared_with_instructor', true)
      .order('shared_at', { ascending: false })

    if (error) {
      console.error('Error fetching shared notes:', error)
      return { error: 'Failed to fetch shared notes' }
    }

    return { notes }
  } catch (error) {
    console.error('Error in getSharedNotes:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Delete a private note
 */
export async function deletePrivateNote(noteId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { error: deleteError } = await supabase
      .from('private_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting private note:', deleteError)
      return { error: 'Failed to delete note' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deletePrivateNote:', error)
    return { error: 'An unexpected error occurred' }
  }
}

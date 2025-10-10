'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

    if (data.media_file_id) {
      revalidatePath(`/video/${data.media_file_id}`)
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
export async function getPrivateNotes(filters?: {
  media_file_id?: string
  goal_id?: string
  tags?: string[]
  is_shared?: boolean
}) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    let query = supabase
      .from('private_notes')
      .select(`
        *,
        media_files:media_file_id (
          id,
          title,
          thumbnail_url
        ),
        track_goals:goal_id (
          id,
          title
        )
      `)
      .eq('user_id', user.id)

    if (filters?.media_file_id) {
      query = query.eq('media_file_id', filters.media_file_id)
    }

    if (filters?.goal_id) {
      query = query.eq('goal_id', filters.goal_id)
    }

    if (filters?.is_shared !== undefined) {
      query = query.eq('is_shared_with_instructor', filters.is_shared)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

    const { data: notes, error } = await query.order('created_at', { ascending: false })

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
 * Update a private note
 */
export async function updatePrivateNote(
  noteId: string,
  data: {
    title?: string
    content?: string
    tags?: string[]
  }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    const { data: note, error: updateError } = await supabase
      .from('private_notes')
      .update({
        title: data.title,
        content: data.content,
        tags: data.tags
      })
      .eq('id', noteId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating private note:', updateError)
      return { error: 'Failed to update note' }
    }

    return { success: true, note }
  } catch (error) {
    console.error('Error in updatePrivateNote:', error)
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

/**
 * Share private note to goal conversation (one-way, irreversible)
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

    revalidatePath('/goals')
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
        ),
        media_files:media_file_id (
          id,
          title
        ),
        track_goals:goal_id (
          id,
          title
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

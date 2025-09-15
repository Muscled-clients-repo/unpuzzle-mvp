'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface DailyNote {
  id: string
  user_id: string
  goal_id: string | null
  note: string
  note_date: string
  created_at: string
  updated_at: string
}

export interface UserGoalProgress {
  goal_title: string | null
  goal_current_amount: string | null
  goal_target_amount: string | null
  goal_progress: number
  goal_target_date: string | null
  goal_start_date: string | null
  goal_status: 'active' | 'completed' | 'paused'
}

// Get user's goal progress
export async function getUserGoalProgress(): Promise<UserGoalProgress | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
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
    .eq('id', user.id)
    .single()

  if (error) {
    throw new Error('Failed to get user goal progress')
  }

  return data
}

// Get user's daily notes for a date range
export async function getUserDailyNotes({
  startDate,
  endDate,
  limit = 30
}: {
  startDate?: string
  endDate?: string
  limit?: number
} = {}): Promise<DailyNote[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  let query = supabase
    .from('user_daily_notes')
    .select('*')
    .eq('user_id', user.id)
    .order('note_date', { ascending: false })

  if (startDate) {
    query = query.gte('note_date', startDate)
  }

  if (endDate) {
    query = query.lte('note_date', endDate)
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error('Failed to get daily notes')
  }

  return data || []
}

// Create or update daily note for a specific date
export async function createOrUpdateDailyNote({
  note,
  noteDate,
  files
}: {
  note: string
  noteDate?: string
  files?: FormData
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const targetDate = noteDate || new Date().toISOString().split('T')[0]

  // Get user's current goal
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_goal_id')
    .eq('id', user.id)
    .single()

  // Check if there's already a note for this date
  const { data: existingNote } = await supabase
    .from('user_daily_notes')
    .select('note')
    .eq('user_id', user.id)
    .eq('note_date', targetDate)
    .single()

  // Format the note content
  const newEntry = note.trim()
  let finalNote: string

  if (existingNote?.note) {
    // Append as new bullet point
    finalNote = `${existingNote.note}\n• ${newEntry}`
  } else {
    // First entry, add bullet point
    finalNote = `• ${newEntry}`
  }

  // Upsert the daily note
  const { data, error } = await supabase
    .from('user_daily_notes')
    .upsert({
      user_id: user.id,
      goal_id: profile?.current_goal_id || null,
      note: finalNote,
      note_date: targetDate
    }, {
      onConflict: 'user_id, note_date'
    })
    .select()
    .single()

  if (error) {
    throw new Error('Failed to save daily note')
  }

  // Handle file uploads if provided
  if (files && data) {
    const { uploadDailyNoteFiles } = await import('./daily-note-attachments')
    const uploadResults = await uploadDailyNoteFiles({
      dailyNoteId: data.id,
      files,
      messageText: newEntry // Pass the specific message that was added with the files
    })
    
    // Log any upload failures but don't fail the note creation
    const failedUploads = uploadResults.filter(result => !result.success)
    if (failedUploads.length > 0) {
      console.error('Some file uploads failed:', failedUploads)
    }
  }

  revalidatePath('/student/goals')
  return data
}

// Update user's goal progress
export async function updateUserGoalProgress(goalData: Partial<UserGoalProgress>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(goalData)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    throw new Error('Failed to update goal progress')
  }

  revalidatePath('/student/goals')
  return data
}

// Get combined daily data (notes + actions + files) for goals page
export async function getDailyGoalData({
  startDate,
  endDate,
  limit = 30
}: {
  startDate?: string
  endDate?: string  
  limit?: number
} = {}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Get daily notes and user actions in parallel
  const [dailyNotes, userActions] = await Promise.all([
    getUserDailyNotes({ startDate, endDate, limit }),
    // Import and call getUserActions from user-actions.ts
    (await import('./user-actions')).getUserActions({ startDate, endDate, limit })
  ])

  // Get files for each daily note
  const { getDailyNoteFiles } = await import('./daily-note-attachments')
  const notesWithFiles = await Promise.all(
    dailyNotes.map(async (note) => {
      const files = await getDailyNoteFiles(note.id)
      return {
        ...note,
        attachedFiles: files
      }
    })
  )

  return {
    dailyNotes: notesWithFiles,
    userActions
  }
}
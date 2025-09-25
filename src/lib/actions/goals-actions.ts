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
// NOTE: Daily notes feature migrated to conversation_messages system
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

  // Daily notes feature removed - data migrated to conversation_messages system
  return []
}

// Create or update daily note for a specific date
// NOTE: Daily notes feature migrated to conversation_messages system
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

  // Daily notes feature removed - data migrated to conversation_messages system
  // Files are now handled through the conversation system with message_attachments
  throw new Error('Daily notes feature has been migrated to the conversation system')
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
// NOTE: Daily notes feature migrated to conversation_messages system
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

  // Get user actions (daily notes removed - migrated to conversation system)
  const userActions = await (await import('./user-actions')).getUserActions({ startDate, endDate, limit })

  // Daily notes feature removed - data migrated to conversation_messages system
  return {
    dailyNotes: [], // Daily notes feature removed
    userActions
  }
}
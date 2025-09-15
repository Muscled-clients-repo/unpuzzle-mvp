'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface UserAction {
  id: string
  user_id: string
  action_type_id: string
  goal_id: string | null
  description: string
  metadata: Record<string, any>
  action_date: string
  created_at: string
  action_type?: {
    name: string
    description: string | null
    is_auto_tracked: boolean
  }
}

export interface ActionType {
  id: string
  track_id: string
  name: string
  description: string | null
  is_auto_tracked: boolean
  is_active: boolean
}

// Get user's current track and goal
export async function getUserTrackAndGoal() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      current_track_id,
      current_goal_id,
      tracks:current_track_id (id, name),
      track_goals:current_goal_id (id, name)
    `)
    .eq('id', user.id)
    .single()

  if (error) {
    throw new Error('Failed to get user track and goal')
  }

  return profile
}

// Get action types for user's track
export async function getActionTypesForTrack(trackId: string): Promise<ActionType[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('action_types')
    .select('*')
    .eq('track_id', trackId)
    .eq('is_active', true)
    .order('name')

  if (error) {
    throw new Error('Failed to get action types')
  }

  return data || []
}

// Create a new user action (for manual activities)
export async function createUserAction({
  actionTypeName,
  description,
  metadata = {},
  actionDate
}: {
  actionTypeName: string
  description: string
  metadata?: Record<string, any>
  actionDate?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Get user's track and goal
  const profile = await getUserTrackAndGoal()
  
  if (!profile.current_track_id) {
    throw new Error('User has no assigned track')
  }

  // Get the action type ID
  const { data: actionType, error: actionTypeError } = await supabase
    .from('action_types')
    .select('id')
    .eq('track_id', profile.current_track_id)
    .eq('name', actionTypeName)
    .single()

  if (actionTypeError || !actionType) {
    throw new Error('Action type not found')
  }

  // Create the action
  const { data, error } = await supabase
    .from('user_actions')
    .insert({
      user_id: user.id,
      action_type_id: actionType.id,
      goal_id: profile.current_goal_id,
      description,
      metadata,
      action_date: actionDate || new Date().toISOString().split('T')[0]
    })
    .select()
    .single()

  if (error) {
    throw new Error('Failed to create user action')
  }

  revalidatePath('/student/goals')
  return data
}

// Get user actions for a specific date range
export async function getUserActions({
  startDate,
  endDate,
  limit = 50
}: {
  startDate?: string
  endDate?: string
  limit?: number
} = {}): Promise<UserAction[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  let query = supabase
    .from('user_actions')
    .select(`
      *,
      action_type:action_types (
        name,
        description,
        is_auto_tracked
      )
    `)
    .eq('user_id', user.id)
    .order('action_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (startDate) {
    query = query.gte('action_date', startDate)
  }

  if (endDate) {
    query = query.lte('action_date', endDate)
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error('Failed to get user actions')
  }

  return data || []
}

// Create auto-tracked action (called by system when user completes activities)
export async function createAutoTrackedAction({
  actionTypeName,
  description,
  metadata = {}
}: {
  actionTypeName: string
  description: string
  metadata?: Record<string, any>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return // Silent fail for auto-tracked actions
  }

  try {
    // Get user's track and goal
    const profile = await getUserTrackAndGoal()
    
    if (!profile.current_track_id) {
      return // User not assigned to track yet
    }

    // Get the action type ID (must be auto-tracked)
    const { data: actionType, error: actionTypeError } = await supabase
      .from('action_types')
      .select('id')
      .eq('track_id', profile.current_track_id)
      .eq('name', actionTypeName)
      .eq('is_auto_tracked', true)
      .single()

    if (actionTypeError || !actionType) {
      return // Action type not found or not auto-tracked
    }

    // Create the action
    await supabase
      .from('user_actions')
      .insert({
        user_id: user.id,
        action_type_id: actionType.id,
        goal_id: profile.current_goal_id,
        description,
        metadata,
        action_date: new Date().toISOString().split('T')[0]
      })

    revalidatePath('/student/goals')
  } catch (error) {
    // Silent fail for auto-tracked actions
    console.error('Failed to create auto-tracked action:', error)
  }
}
'use server'

import { createClient } from '@/lib/supabase/server'

export interface PaidStudent {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  current_track_id: string | null
  current_goal_id: string | null
  goal_title: string | null
  goal_progress: number | null
  goal_status: string | null
  track_assigned_at: string | null
  revenue_updated_at: string | null
  current_mrr: number | null
  total_revenue_earned: number | null
}

export interface LeadUser {
  id: string
  full_name: string | null
  email: string
  created_at: string
  source: 'resource_download' | 'signup'
  resource_title?: string
  download_count?: number
}

/**
 * Get all paid students (students with track assignments)
 */
export async function getPaidStudents(): Promise<{
  data: PaidStudent[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: 'Unauthorized' }
    }

    // Check if user is instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['instructor', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Access denied' }
    }

    // Get all students with track assignments (paid customers)
    const { data: students, error } = await supabase
      .from('profiles')
      .select(
        `
        id,
        full_name,
        email,
        avatar_url,
        current_track_id,
        current_goal_id,
        goal_title,
        goal_progress,
        goal_status,
        track_assigned_at,
        revenue_updated_at,
        current_mrr,
        total_revenue_earned
      `
      )
      .eq('role', 'student')
      .not('current_track_id', 'is', null)
      .order('track_assigned_at', { ascending: false })

    if (error) {
      console.error('Error fetching paid students:', error)
      return { data: null, error: error.message }
    }

    return { data: students, error: null }
  } catch (error) {
    console.error('Error in getPaidStudents:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Get all lead users (resource downloaders and free signups without track assignments)
 */
export async function getLeadUsers(): Promise<{
  data: LeadUser[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: 'Unauthorized' }
    }

    // Check if user is instructor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['instructor', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Access denied' }
    }

    // Get resource downloaders (people who downloaded but haven't paid)
    const { data: resourceUsers, error: resourceError } = await supabase
      .from('resource_interactions')
      .select(
        `
        user_id,
        email,
        download_count,
        created_at,
        resources!inner (
          title
        )
      `
      )
      .not('email', 'is', null)
      .order('created_at', { ascending: false })

    if (resourceError) {
      console.error('Error fetching resource users:', resourceError)
    }

    // Get free signups without track assignments
    const { data: freeSignups, error: signupError } = await supabase
      .from('profiles')
      .select(
        `
        id,
        full_name,
        email,
        created_at
      `
      )
      .eq('role', 'student')
      .is('current_track_id', null)
      .order('created_at', { ascending: false })

    if (signupError) {
      console.error('Error fetching free signups:', signupError)
    }

    // Combine and deduplicate by email
    const leads: LeadUser[] = []
    const seenEmails = new Set<string>()

    // Add resource downloaders
    if (resourceUsers) {
      for (const interaction of resourceUsers) {
        if (!seenEmails.has(interaction.email)) {
          seenEmails.add(interaction.email)
          leads.push({
            id: interaction.user_id || interaction.email,
            full_name: null,
            email: interaction.email,
            created_at: interaction.created_at,
            source: 'resource_download',
            resource_title: (interaction.resources as any)?.title,
            download_count: interaction.download_count,
          })
        }
      }
    }

    // Add free signups
    if (freeSignups) {
      for (const signup of freeSignups) {
        if (!seenEmails.has(signup.email)) {
          seenEmails.add(signup.email)
          leads.push({
            id: signup.id,
            full_name: signup.full_name,
            email: signup.email,
            created_at: signup.created_at,
            source: 'signup',
          })
        }
      }
    }

    // Sort by created_at descending
    leads.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return { data: leads, error: null }
  } catch (error) {
    console.error('Error in getLeadUsers:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

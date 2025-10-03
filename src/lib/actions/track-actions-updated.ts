// Updated track actions to work with simplified student_track_assignments table
// This file shows the changes needed after migration 090

import { createClient } from '@/lib/supabase/client'
import { revalidatePath } from 'next/cache'

// Get student's track assignments
export async function getStudentTrackAssignments() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('student_track_assignments')
    .select(`
      *,
      track:tracks (*)
    `)
    .eq('student_id', user.id)
    .eq('status', 'active') // Changed from is_active to status
    .order('assigned_at', { ascending: false })

  if (error) {
    throw new Error('Failed to get student track assignments')
  }

  return data || []
}

// Simplified assign track to student - removed unused parameters
export async function assignTrackToStudent({
  trackId,
  goalId // Optional goal_id if linking to a specific goal
}: {
  trackId: string
  goalId?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('student_track_assignments')
    .select('id')
    .eq('student_id', user.id)
    .eq('track_id', trackId)
    .eq('status', 'active')
    .single()

  if (existing) {
    // Update existing assignment - just update assigned_at to refresh it
    const { data, error } = await supabase
      .from('student_track_assignments')
      .update({
        assigned_at: new Date().toISOString(),
        status: 'active', // Ensure it's active
        goal_id: goalId || null
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      throw new Error('Failed to update track assignment')
    }

    revalidatePath('/student/dashboard')
    revalidatePath('/student/track-selection')
    return data
  } else {
    // Create new assignment with simplified data
    const { data, error } = await supabase
      .from('student_track_assignments')
      .insert({
        student_id: user.id,
        track_id: trackId,
        goal_id: goalId || null,
        status: 'active',
        assigned_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error('Failed to assign track to student')
    }

    revalidatePath('/student/dashboard')
    revalidatePath('/student/track-selection')
    return data
  }
}

// Remove track assignment (mark as abandoned instead of deleting)
export async function removeTrackAssignment(assignmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  // Instead of deleting, mark as abandoned
  const { error } = await supabase
    .from('student_track_assignments')
    .update({
      status: 'abandoned',
      updated_at: new Date().toISOString()
    })
    .eq('id', assignmentId)
    .eq('student_id', user.id)

  if (error) {
    throw new Error('Failed to remove track assignment')
  }

  revalidatePath('/student/dashboard')
  revalidatePath('/student/track-selection')
}

// Get student preferences (this table exists and works as-is)
export async function getStudentPreferences() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('student_preferences')
    .select('*')
    .eq('student_id', user.id)
    .single()

  return data
}

// Save questionnaire responses
export async function saveQuestionnaireResponses(responses: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('student_preferences')
    .upsert({
      student_id: user.id,
      ...responses,
      completed_questionnaire: true,
      questionnaire_completed_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error('Failed to save questionnaire responses')
  }

  revalidatePath('/student/track-selection')
  return data
}

// Note: course_recommendations table doesn't exist
// This function will need to be removed or the table created
export async function getFilteredCourses() {
  // For now, return empty array since course_recommendations doesn't exist
  console.warn('course_recommendations table does not exist')
  return []
}
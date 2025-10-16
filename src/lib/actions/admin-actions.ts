'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function promoteToInstructor(targetUserId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // Check if current user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Only admins can promote users' }
  }

  // Call the secure database function
  const { error } = await supabase.rpc('promote_user_to_instructor', {
    target_user_id: targetUserId
  })

  if (error) {
    console.error('Failed to promote user:', error)
    return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: true, message: 'User promoted to instructor successfully' }
}

export async function demoteToStudent(targetUserId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // Check if current user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Only admins can demote users' }
  }

  // Call the secure database function
  const { error } = await supabase.rpc('demote_to_student', {
    target_user_id: targetUserId
  })

  if (error) {
    console.error('Failed to demote user:', error)
    return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: true, message: 'User demoted to student successfully' }
}

export async function getAllUsers() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // Check if current user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Access denied: Admin role required' }
  }

  // Fetch all users
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at, avatar_url')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch users:', error)
    return { error: 'Failed to fetch users' }
  }

  return { users }
}

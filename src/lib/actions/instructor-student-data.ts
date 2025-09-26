'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Get specific student data for instructor view
 * Replaces bulk loadInstructorData() with targeted query
 */
export async function getStudentForInstructor(studentId: string) {
  const user = await requireAuth()
  const serviceClient = createServiceClient()

  // Simplified query to avoid RLS policy recursion
  const { data: student, error } = await (serviceClient as any)
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      avatar_url,
      created_at
    `)
    .eq('id', studentId)
    .single()

  if (error || !student) {
    throw new Error('Student not found or access denied')
  }

  return {
    id: student.id,
    name: student.full_name,
    email: student.email,
    avatar: student.avatar_url,
    joinedAt: student.created_at
  }
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
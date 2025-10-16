'use server'

import { createClient } from '@/lib/supabase/server'

export interface FeaturedStudent {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  current_goal_id: string | null
  goal_title: string | null
  featured_order: number
  featured_at: string
}

/**
 * Get the 3 featured students for community/goals page
 * PUBLIC - Anyone can view featured students
 */
export async function getFeaturedStudents(): Promise<{
  data: FeaturedStudent[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: students, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, current_goal_id, goal_title, featured_order, featured_at')
      .eq('is_featured', true)
      .order('featured_order', { ascending: true })
      .limit(3)

    if (error) {
      console.error('Error fetching featured students:', error)
      return { data: null, error: error.message }
    }

    return { data: students as FeaturedStudent[], error: null }
  } catch (error) {
    console.error('Error in getFeaturedStudents:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Get all students (for instructor to choose from)
 * INSTRUCTOR ONLY
 */
export async function getAllStudentsForFeaturing(): Promise<{
  data: Array<{
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    is_featured: boolean
    featured_order: number | null
  }> | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    // Check if user is instructor
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['instructor', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Access denied' }
    }

    // Get all students (role = student)
    const { data: students, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, is_featured, featured_order')
      .eq('role', 'student')
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Error fetching students:', error)
      return { data: null, error: error.message }
    }

    return { data: students, error: null }
  } catch (error) {
    console.error('Error in getAllStudentsForFeaturing:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Feature a student (mark as featured)
 * INSTRUCTOR ONLY
 */
export async function featureStudent(studentId: string): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const supabase = await createClient()

    // Check if user is instructor
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['instructor', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Access denied' }
    }

    // Update student to featured (trigger handles limit and order)
    const { error } = await supabase
      .from('profiles')
      .update({ is_featured: true })
      .eq('id', studentId)

    if (error) {
      console.error('Error featuring student:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error in featureStudent:', error)
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

/**
 * Unfeature a student
 * INSTRUCTOR ONLY
 */
export async function unfeatureStudent(studentId: string): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const supabase = await createClient()

    // Check if user is instructor
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['instructor', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Access denied' }
    }

    // Update student to not featured (trigger clears featured_order and featured_at)
    const { error } = await supabase
      .from('profiles')
      .update({ is_featured: false })
      .eq('id', studentId)

    if (error) {
      console.error('Error unfeaturing student:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in unfeatureStudent:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Reorder featured students (change featured_order)
 * INSTRUCTOR ONLY
 */
export async function reorderFeaturedStudents(studentOrders: Array<{ id: string; order: number }>): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const supabase = await createClient()

    // Check if user is instructor
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['instructor', 'admin'].includes(profile.role)) {
      return { success: false, error: 'Access denied' }
    }

    // Update each student's order
    for (const { id, order } of studentOrders) {
      const { error } = await supabase
        .from('profiles')
        .update({ featured_order: order })
        .eq('id', id)

      if (error) {
        console.error('Error reordering students:', error)
        return { success: false, error: error.message }
      }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in reorderFeaturedStudents:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

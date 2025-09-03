import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type UserRole = 'student' | 'instructor' | 'admin' | null

/**
 * Get the user's active role, checking cookie first, then falling back to database role
 * This is the server-side version for use in Server Components and API routes
 */
export async function getActiveRole(userId?: string): Promise<UserRole> {
  try {
    const cookieStore = await cookies()
    const activeRoleCookie = cookieStore.get('active-role')

    // If we have a cookie with a valid role, use it
    if (activeRoleCookie && ['student', 'instructor'].includes(activeRoleCookie.value)) {
      return activeRoleCookie.value as UserRole
    }

    // Fall back to database role
    if (userId) {
      const supabase = await createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      return profile?.role as UserRole || null
    }

    return null
  } catch (error) {
    console.error('Error getting active role:', error)
    return null
  }
}

/**
 * Get the user's database role (their actual permission level)
 */
export async function getDatabaseRole(userId: string): Promise<UserRole> {
  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    return profile?.role as UserRole || null
  } catch (error) {
    console.error('Error getting database role:', error)
    return null
  }
}

/**
 * Check if a user can switch to a specific role
 */
export async function canSwitchToRole(userId: string, targetRole: UserRole): Promise<boolean> {
  if (targetRole === 'student') {
    return true // Everyone can switch to student mode
  }

  if (targetRole === 'instructor') {
    const databaseRole = await getDatabaseRole(userId)
    return databaseRole === 'instructor' || databaseRole === 'admin'
  }

  if (targetRole === 'admin') {
    const databaseRole = await getDatabaseRole(userId)
    return databaseRole === 'admin'
  }

  return false
}
/**
 * Client-side role utilities
 * These functions can be used in client components
 */

export type UserRole = 'student' | 'instructor' | 'admin' | null

/**
 * Client-side version for getting active role from user object and cookies
 */
export function getClientActiveRole(user: any): UserRole {
  // Only check browser-specific things if we're on the client
  if (typeof window !== 'undefined') {
    // Check for active role cookie on client side
    const cookies = document.cookie.split(';')
    const activeRoleCookie = cookies.find(cookie => 
      cookie.trim().startsWith('active-role=')
    )
    
    if (activeRoleCookie) {
      const role = activeRoleCookie.split('=')[1].trim()
      if (['student', 'instructor'].includes(role)) {
        return role as UserRole
      }
    }
    
    // Check the URL path as a fallback hint for the active role
    const path = window.location.pathname
    
    // If no cookie but we're on instructor route, assume instructor mode
    // (This handles the case where user navigates directly to /instructor)
    if (path.startsWith('/instructor')) {
      return 'instructor'
    }
    
    // If on student route, return student
    if (path.startsWith('/student')) {
      return 'student'
    }
  }

  // Fall back to user metadata/database role
  if (!user) return null
  
  // Return null during SSR to prevent hydration mismatch
  return null
}

/**
 * Get the user's database role (their actual permission level)
 */
export function getDatabaseRoleFromUser(user: any): UserRole {
  if (!user) return null
  
  return user.user_metadata?.role || 
         user.app_metadata?.role || 
         'student' // default fallback
}
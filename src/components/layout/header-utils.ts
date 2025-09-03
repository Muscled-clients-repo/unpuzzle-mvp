import { Settings, BarChart3, GraduationCap, TrendingUp, MessageCircle } from 'lucide-react'
import { getClientActiveRole, getDatabaseRoleFromUser, type UserRole } from '@/lib/role-utils.client'

export { type UserRole }

type IconName = 'Settings' | 'BarChart3' | 'GraduationCap' | 'TrendingUp' | 'MessageCircle'

export function getUserRole(user: any): UserRole {
  // Use the new client-side active role function
  return getClientActiveRole(user)
}

export function getUserDatabaseRole(user: any): UserRole {
  return getDatabaseRoleFromUser(user)
}

export function getUserInfo(user: any) {
  if (!user) return null
  
  return {
    name: user.user_metadata?.full_name || 
          user.email?.split('@')[0] || 
          'User',
    email: user.email || '',
    avatar: user.user_metadata?.avatar_url
  }
}

export function getHomeRoute(role: UserRole): string {
  switch (role) {
    case 'instructor': return '/instructor'
    case 'student': return '/student'
    case 'admin': return '/admin'
    default: return '/'
  }
}

export function getSearchPlaceholder(role: UserRole): string {
  switch (role) {
    case 'instructor': return 'Search students, courses, analytics...'
    case 'student': return 'Search courses, lessons, topics...'
    case 'admin': return 'Search users, system data...'
    default: return 'Search...'
  }
}

export function getRoleSpecificMenuItems(role: UserRole) {
  const base: Array<{ href: string; label: string; icon: IconName }> = [
    { href: '/help', label: 'Help & Support', icon: 'MessageCircle' }
  ]
  
  switch (role) {
    case 'instructor':
      return [
        { href: '/instructor/settings', label: 'Instructor Settings', icon: 'Settings' },
        { href: '/instructor/analytics', label: 'Analytics Dashboard', icon: 'BarChart3' },
        { href: '/student', label: 'Switch to Student Mode', icon: 'GraduationCap' },
        ...base
      ]
    
    case 'student':
      return [
        { href: '/student/settings', label: 'Settings', icon: 'Settings' },
        { href: '/student/progress', label: 'My Progress', icon: 'TrendingUp' },
        ...base
      ]
    
    default:
      return base
  }
}

// Icon mapping utility - centralized icon management
export function getIconComponent(iconName: IconName) {
  const iconMap = {
    Settings,
    BarChart3,
    GraduationCap,
    TrendingUp,
    MessageCircle,
  } as const
  
  return iconMap[iconName] || Settings // fallback to Settings if icon not found
}
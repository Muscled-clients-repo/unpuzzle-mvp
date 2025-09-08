import { useAppStore } from '@/stores/app-store'

/**
 * Simple auth hook to get current user information
 * 
 * Architecture Compliance:
 * - Reads from Zustand auth slice (UI state layer)
 * - Provides user.id for WebSocket connection
 */
export function useAuth() {
  const { user, authLoading, authError } = useAppStore((state) => ({
    user: state.user,
    authLoading: state.authLoading,
    authError: state.authError,
  }))

  return {
    user,
    userId: user?.id || null,
    isAuthenticated: !!user,
    isLoading: authLoading,
    error: authError,
  }
}
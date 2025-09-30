import { useAppStore } from '@/stores/app-store'

/**
 * Simple auth hook to get current user information
 *
 * Architecture Compliance:
 * - Reads from Zustand auth slice (UI state layer)
 * - Provides user.id for WebSocket connection
 */
export function useAuth() {
  // Use individual selectors to avoid object reference issues
  const user = useAppStore((state) => state.user)
  const authLoading = useAppStore((state) => state.authLoading)
  const authError = useAppStore((state) => state.authError)

  return {
    user,
    userId: user?.id || null,
    isAuthenticated: !!user,
    isLoading: authLoading,
    error: authError,
  }
}
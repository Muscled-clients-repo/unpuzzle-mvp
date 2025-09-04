import { useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'

export function useAuthInit() {
  const { initializeAuth } = useAppStore()

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Initialize auth from server-side session on mount
    initializeAuth()
    
    // Re-initialize auth when page gains focus (handles role switches)
    const handleFocus = () => {
      initializeAuth()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [initializeAuth])
}
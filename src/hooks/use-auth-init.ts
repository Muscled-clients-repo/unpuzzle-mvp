import { useEffect, useRef } from 'react'
import { useAppStore } from '@/stores/app-store'

export function useAuthInit() {
  const { initializeAuth } = useAppStore()
  const lastFocusTime = useRef(Date.now())

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Initialize auth from server-side session on mount
    initializeAuth()
    
    // Track when page loses focus
    const handleBlur = () => {
      lastFocusTime.current = Date.now()
    }
    
    // Re-initialize auth when page gains focus, but only if away for meaningful time
    const handleFocus = () => {
      const timeAway = Date.now() - lastFocusTime.current
      const REFRESH_THRESHOLD = 30000 // 30 seconds
      
      // Only refresh if user was away for more than 30 seconds
      // This prevents loading flicker for quick app switches
      if (timeAway > REFRESH_THRESHOLD) {
        initializeAuth()
      }
    }
    
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
    }
  }, [initializeAuth])
}
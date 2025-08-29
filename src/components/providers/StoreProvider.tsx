'use client'

import { ReactNode, useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'
import { isDevelopment, isBrowser } from '@/config/env'
import { mockUsers } from '@/data/mock'

// Properly type the window object for development tools
declare global {
  interface Window {
    __UNPUZZLE_DEV__?: {
      store: typeof useAppStore
      version: string
      timestamp: number
    }
  }
}

interface StoreProviderProps {
  children: ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  const { initializeAuth } = useAppStore()
  
  useEffect(() => {
    // Initialize authentication on mount
    initializeAuth()

    // Only expose store in development and in browser environment
    if (isBrowser && isDevelopment) {
      // Properly typed, no @ts-ignore needed
      window.__UNPUZZLE_DEV__ = {
        store: useAppStore,
        version: '1.0.0',
        timestamp: Date.now()
      }
      
      console.log('🏪 Zustand Store initialized. Access via window.__UNPUZZLE_DEV__.store')
      console.log('📊 Open Redux DevTools to inspect store state and actions.')
    }
  }, [])

  return <>{children}</>
}
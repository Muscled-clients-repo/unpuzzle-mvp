'use client'

import { ReactNode, useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'

interface StoreProviderProps {
  children: ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // @ts-ignore
      window.useAppStore = useAppStore
      console.log('🏪 Zustand Store initialized. Access via window.useAppStore in console.')
      console.log('📊 Open Redux DevTools to inspect store state and actions.')
    }
  }, [])

  return <>{children}</>
}
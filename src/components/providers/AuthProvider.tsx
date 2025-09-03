'use client'

import { useAuthInit } from '@/hooks/use-auth-init'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  useAuthInit()
  
  return <>{children}</>
}
"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ClearAllPage() {
  const router = useRouter()
  
  useEffect(() => {
    async function clearEverything() {
      console.log('🧹 Clearing ALL authentication data...')
      
      // Clear all localStorage
      localStorage.clear()
      
      // Clear all sessionStorage
      sessionStorage.clear()
      
      // Clear all cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })
      
      // Sign out from Supabase
      const supabase = createClient()
      await supabase.auth.signOut()
      
      console.log('✅ All data cleared. Redirecting to login...')
      
      // Force redirect to login
      window.location.href = '/login'
    }
    
    clearEverything()
  }, [])
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Clearing all authentication data...</h1>
        <p className="text-muted-foreground">You will be redirected to login shortly.</p>
      </div>
    </div>
  )
}
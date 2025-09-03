import { useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function useAuthInit() {
  const { 
    initializeAuth, 
    setUser, 
    setProfile, 
    setLoading, 
    fetchProfile 
  } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    const supabase = createClient()

    // Initialize auth on mount
    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
        
        // Handle redirect after login
        if (event === 'SIGNED_IN') {
          const params = new URLSearchParams(window.location.search)
          const redirect = params.get('redirect')
          if (redirect) {
            router.push(redirect)
          } else {
            router.push('/student')
          }
        }
        
        // Handle redirect after logout
        if (event === 'SIGNED_OUT') {
          router.push('/')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, initializeAuth, setUser, setProfile, setLoading, fetchProfile])
}
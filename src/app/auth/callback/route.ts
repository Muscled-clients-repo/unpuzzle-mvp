import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Get user role to redirect appropriately
      const { data: { user } } = await supabase.auth.getUser()
      if (user && !next) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        // Redirect based on role
        if (profile?.role === 'admin') {
          next = '/admin'
        } else if (profile?.role === 'instructor') {
          next = '/instructor'
        } else {
          next = '/student/courses'
        }
      }

      return NextResponse.redirect(`${origin}${next || '/student/courses'}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`)
}
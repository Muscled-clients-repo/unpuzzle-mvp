import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        authenticated: false,
        error: authError?.message || 'No user session'
      })
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      profileError: profileError,
      debug: {
        expected_instructor_access: profile?.role === 'instructor',
        actual_role: profile?.role || 'NOT_FOUND'
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
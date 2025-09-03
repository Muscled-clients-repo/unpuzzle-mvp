import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json()

    // Validate role
    if (!role || !['student', 'instructor'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "student" or "instructor"' },
        { status: 400 }
      )
    }

    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's profile to check if they can switch to instructor role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if user is allowed to switch to the requested role
    if (role === 'instructor' && profile.role !== 'instructor') {
      return NextResponse.json(
        { error: 'You do not have instructor permissions' },
        { status: 403 }
      )
    }

    // Set the active role cookie
    const cookieStore = await cookies()
    cookieStore.set('active-role', role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    return NextResponse.json({ 
      success: true, 
      message: `Role switched to ${role}`,
      activeRole: role
    })

  } catch (error) {
    console.error('Error switching role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
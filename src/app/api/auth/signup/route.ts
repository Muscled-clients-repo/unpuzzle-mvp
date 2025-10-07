import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json()

    // Validate inputs
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. Create the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/auth/callback?next=/student/courses`
      }
    })

    if (authError) {
      console.error('[SIGNUP] Auth error:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // 2. Get the Agency Track from tracks table
    const { data: agencyTrack, error: trackError } = await supabase
      .from('tracks')
      .select('id')
      .eq('name', 'Agency Track')
      .eq('is_active', true)
      .single()

    if (trackError || !agencyTrack) {
      console.error('[SIGNUP] Track error:', trackError)
      // Don't fail signup, just log the error
      // User can be assigned track later by instructor
    }

    // 3. Get the default $1K goal for Agency Track
    let defaultGoal: { id: string } | null = null
    if (agencyTrack) {
      const { data: goal, error: goalError } = await supabase
        .from('track_goals')
        .select('id')
        .eq('track_id', agencyTrack.id)
        .eq('is_default', true)
        .eq('is_active', true)
        .single()

      if (goalError) {
        console.error('[SIGNUP] Goal error:', goalError)
        // Try to find goal by name if default flag isn't set
        const { data: fallbackGoal } = await supabase
          .from('track_goals')
          .select('id')
          .eq('track_id', agencyTrack.id)
          .eq('name', 'agency-1k')
          .single()

        defaultGoal = fallbackGoal
      } else {
        defaultGoal = goal
      }
    }

    // 4. Create/update the profile with track and goal assignment
    if (agencyTrack && defaultGoal) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          current_track_id: agencyTrack.id,
          current_goal_id: defaultGoal.id,
          role: 'student',
          track_assigned_at: new Date().toISOString(),
          goal_assigned_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (profileError) {
        console.error('[SIGNUP] Profile update error:', profileError)
        // Try insert instead if update failed (profile might not exist yet)
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email,
            full_name: fullName,
            current_track_id: agencyTrack.id,
            current_goal_id: defaultGoal.id,
            role: 'student',
            track_assigned_at: new Date().toISOString(),
            goal_assigned_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('[SIGNUP] Profile insert error:', insertError)
        }
      }
    } else {
      // Fallback: Just update/create profile with basic info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          role: 'student'
        })
        .eq('id', userId)

      if (profileError) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email,
            full_name: fullName,
            role: 'student'
          })

        if (insertError) {
          console.error('[SIGNUP] Profile insert error:', insertError)
        }
      }
    }

    // 5. Create student_track_assignment if we have track and goal
    if (agencyTrack && defaultGoal) {
      const { error: assignmentError } = await supabase
        .from('student_track_assignments')
        .insert({
          student_id: userId,
          track_id: agencyTrack.id,
          goal_id: defaultGoal.id,
          status: 'active',
          assigned_at: new Date().toISOString()
        })

      if (assignmentError) {
        console.error('[SIGNUP] Assignment error:', assignmentError)
      }

      // 6. Create initial goal conversation
      const { error: conversationError } = await supabase
        .from('goal_conversations')
        .insert({
          student_id: userId,
          track_id: agencyTrack.id,
          goal_id: defaultGoal.id,
          status: 'active',
          created_at: new Date().toISOString()
        })

      if (conversationError) {
        console.error('[SIGNUP] Conversation error:', conversationError)
      }
    }

    // 7. Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      needsEmailVerification: true
    })
  } catch (error: any) {
    console.error('[SIGNUP] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

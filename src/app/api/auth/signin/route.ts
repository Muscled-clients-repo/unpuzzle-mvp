import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()
  
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    if (data?.session) {
      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single()
      
      return NextResponse.json({ 
        user: {
          id: data.session.user.id,
          email: data.session.user.email,
          user_metadata: data.session.user.user_metadata
        },
        profile,
        success: true 
      })
    }
    
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 400 })
  } catch (error) {
    console.error('[API] Sign in error:', error)
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 })
  }
}
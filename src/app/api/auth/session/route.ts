import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ user: null, profile: null })
    }
    
    // Get profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      },
      profile 
    })
  } catch (error) {
    console.error('[API] Session error:', error)
    return NextResponse.json({ user: null, profile: null })
  }
}
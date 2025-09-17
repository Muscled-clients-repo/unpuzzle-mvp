import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const serviceClient = createServiceClient()

    // Get all conversations with their messages
    const { data: conversations, error: convError } = await (serviceClient as any)
      .from('goal_conversations')
      .select(`
        *,
        conversation_messages(*)
      `)
      .order('created_at', { ascending: false })

    if (convError) {
      console.error('Error fetching conversations:', convError)
      return NextResponse.json({ error: convError.message }, { status: 500 })
    }

    // Get profiles for student names
    const { data: profiles } = await (serviceClient as any)
      .from('profiles')
      .select('id, full_name, email')

    return NextResponse.json({
      conversations: conversations || [],
      profiles: profiles || [],
      totalConversations: conversations?.length || 0
    })
  } catch (error) {
    console.error('Debug conversations error:', error)
    return NextResponse.json({ error: 'Failed to fetch debug data' }, { status: 500 })
  }
}
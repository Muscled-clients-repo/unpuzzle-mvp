import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const trackName = searchParams.get('track')

    if (!trackName) {
      return NextResponse.json({ error: 'Track name is required' }, { status: 400 })
    }

    // Get track goals for the specified track
    const { data: goals, error } = await supabase
      .from('track_goals')
      .select(`
        id,
        name,
        description,
        target_amount,
        sort_order,
        tracks!inner (
          name
        )
      `)
      .eq('tracks.name', trackName)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching track goals:', error)
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }

    return NextResponse.json(goals || [])
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
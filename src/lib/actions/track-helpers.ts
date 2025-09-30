// Helper functions for track selection
import { createClient } from '@/lib/supabase/client'

// Map track type strings to actual track IDs
export async function getTrackIdByType(trackType: 'agency' | 'saas'): Promise<string | null> {
  const supabase = await createClient()

  // Map the type to the track name in database
  const trackName = trackType === 'agency' ? 'Agency Track' : 'SaaS Track'

  const { data, error } = await supabase
    .from('tracks')
    .select('id')
    .eq('name', trackName)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    console.error('Failed to find track:', trackName, error)
    return null
  }

  return data.id
}

// Wrapper function to assign track using type string
export async function assignTrackByType(
  trackType: 'agency' | 'saas',
  goalId?: string
) {
  const { assignTrackToStudent } = await import('./track-actions')

  // Get the actual track ID
  const trackId = await getTrackIdByType(trackType)

  if (!trackId) {
    throw new Error(`Track not found: ${trackType}`)
  }

  // Call the original function with the actual ID
  return assignTrackToStudent({ trackId, goalId })
}

// Get all tracks with a simplified structure
export async function getTracksForSelection() {
  const supabase = await createClient()

  const { data: tracks, error } = await supabase
    .from('tracks')
    .select('id, name, description')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Failed to fetch tracks:', error)
    return []
  }

  // Add a type field for easier UI handling
  return tracks.map(track => ({
    ...track,
    type: track.name.toLowerCase().includes('agency') ? 'agency' as const : 'saas' as const
  }))
}
'use server'

import { createClient } from '@/lib/supabase/server'

export interface VideoData {
  id: string
  course_id: string
  chapter_id?: string
  chapterId?: string
  title: string
  description?: string
  duration?: string
  duration_seconds?: number
  video_url?: string
  url?: string
  videoUrl?: string
  thumbnail_url?: string
  thumbnailUrl?: string
  order: number
  status?: string
}

export async function getCourseVideos(courseId: string): Promise<VideoData[]> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true })
    
    if (error) {
      console.error('[Server Action] Error fetching videos:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('[Server Action] Failed to fetch videos:', error)
    return []
  }
}
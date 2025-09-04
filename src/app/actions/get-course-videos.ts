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
  
  console.log('[Server Action] Fetching videos for course:', courseId)
  
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
    
    console.log('[Server Action] Found videos:', data?.length || 0, 'for course:', courseId)
    if (data && data.length > 0) {
      console.log('[Server Action] First video:', {
        id: data[0].id,
        title: data[0].title,
        course_id: data[0].course_id,
        chapter_id: data[0].chapter_id
      })
    }
    
    return data || []
  } catch (error) {
    console.error('[Server Action] Failed to fetch videos:', error)
    return []
  }
}
/**
 * Refactored Video Service - Best Practice
 * Always creates instance with proper auth context
 */

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Video } from '@/types/domain'

export class VideoService {
  constructor(private supabase: SupabaseClient) {}
  
  async deleteVideo(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('videos')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    console.log(`Video ${id} deleted successfully`)
  }
  
  async getCourseVideos(courseId: string): Promise<Video[]> {
    const { data, error } = await this.supabase
      .from('videos')
      .select('*')
      .eq('course_id', courseId)
      .order('order')
    
    if (error) throw error
    return data || []
  }
}

/**
 * Factory functions - always create with proper auth
 */

// For client-side usage (React components)
export async function getClientVideoService() {
  const supabase = createClient()
  return new VideoService(supabase)
}

// For server-side usage (API routes)
export async function getServerVideoService() {
  const supabase = await createServerClient()
  return new VideoService(supabase)
}

// Usage examples:
// 
// In React component:
// const videoService = await getClientVideoService()
// await videoService.deleteVideo(id)
//
// In API route:
// const videoService = await getServerVideoService()
// await videoService.deleteVideo(id)
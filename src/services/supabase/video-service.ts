/**
 * Supabase Video Service
 * UI-First Design: Serves data in formats the existing UI expects
 */

import { createClient } from '@/lib/supabase/client'
import type { Video } from '@/types/domain'
import type { VideoUpload } from '@/stores/slices/course-creation-slice'

// Database row interface (internal use)
export interface VideoRow {
  id: string
  course_id: string
  chapter_id: string
  title: string
  description: string
  duration: string // Formatted like "5:30"
  duration_seconds: number
  video_url?: string
  thumbnail_url?: string
  filename: string
  file_size: number
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  backblaze_file_id?: string
  backblaze_url?: string
  order: number
  created_at: string
  updated_at: string
}

// Helper function to format seconds as "MM:SS" or "H:MM:SS"
function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0:00'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Helper function to parse duration string to seconds
function parseDuration(duration: string): number {
  const parts = duration.split(':').map(Number)
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1] // "MM:SS"
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2] // "H:MM:SS"
  }
  return 0
}

// Convert database row to UI Video interface
function rowToVideo(row: VideoRow): Video {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    duration: parseDuration(row.duration),
    order: row.order,
    videoUrl: row.video_url || '',
    thumbnailUrl: row.thumbnail_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Convert database row to UI VideoUpload interface (for course creation)
function rowToVideoUpload(row: VideoRow): VideoUpload {
  // Determine progress based on status since progress column is removed
  const progress = row.status === 'complete' ? 100 :
                  row.status === 'processing' ? 90 :
                  row.status === 'uploading' ? 50 : 0;

  return {
    id: row.id,
    name: row.title,
    size: row.file_size,
    duration: row.duration,
    status: row.status,
    progress: progress,
    url: row.video_url,
    thumbnailUrl: row.thumbnail_url,
    chapterId: row.chapter_id,
    order: row.order || 0
  }
}

export class SupabaseVideoService {
  private supabase: any
  
  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || createClient()
  }
  
  /**
   * Create a new video record from VideoUpload (course creation)
   */
  async createVideoFromUpload(
    courseId: string, 
    chapterId: string, 
    videoUpload: VideoUpload
  ): Promise<VideoUpload> {
    try {
      console.log('[SUPABASE VIDEO] Creating video record:', videoUpload.name)
      
      const insertData = {
        id: videoUpload.id, // IMPORTANT: Use the provided UUID
        course_id: courseId,
        chapter_id: chapterId,
        title: videoUpload.name,
        description: '',
        duration: videoUpload.duration || '0:00',
        duration_seconds: videoUpload.duration ? parseDuration(videoUpload.duration) : 0,
        filename: (videoUpload as any).backblazeFileName || `${videoUpload.name}.${videoUpload.file?.name.split('.').pop() || 'mp4'}`,
        file_size: videoUpload.size,
        status: videoUpload.status,
        // Note: progress column removed - status is sufficient for tracking
        order: videoUpload.order || 0, // Use provided order
        video_url: videoUpload.url,
        thumbnail_url: videoUpload.thumbnailUrl,
        backblaze_file_id: videoUpload.backblazeFileId // Store for deletion
      }
      
      console.log('[SUPABASE VIDEO] Attempting to insert:', insertData)
      
      const { data, error } = await this.supabase
        .from('videos')
        .insert([insertData])
        .select()
        .single()
      
      if (error) {
        console.error('[SUPABASE VIDEO] Create error:', error)
        console.error('[SUPABASE VIDEO] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      if (!data) {
        console.error('[SUPABASE VIDEO] No data returned from insert')
        throw new Error('Video insert failed - no data returned')
      }
      
      console.log('[SUPABASE VIDEO] Video created successfully:', data.id)
      return rowToVideoUpload(data)
      
    } catch (error) {
      console.error('[SUPABASE VIDEO] Create failed:', error)
      throw error
    }
  }
  
  /**
   * Update a video record and return as VideoUpload
   */
  async updateVideo(id: string, updates: Partial<VideoUpload>): Promise<VideoUpload> {
    try {
      console.log(`[SUPABASE VIDEO] Updating video ${id}:`, Object.keys(updates))
      
      // Convert VideoUpload updates to database format
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      }
      
      if (updates.name !== undefined) dbUpdates.title = updates.name
      if (updates.duration !== undefined) {
        dbUpdates.duration = updates.duration
        dbUpdates.duration_seconds = parseDuration(updates.duration)
      }
      if (updates.status !== undefined) dbUpdates.status = updates.status
      // Note: progress column removed - progress is derived from status
      if (updates.url !== undefined) dbUpdates.video_url = updates.url
      if (updates.thumbnailUrl !== undefined) dbUpdates.thumbnail_url = updates.thumbnailUrl
      if (updates.chapterId !== undefined) dbUpdates.chapter_id = updates.chapterId
      if ((updates as any).backblaze_file_id !== undefined) dbUpdates.backblaze_file_id = (updates as any).backblaze_file_id
      if ((updates as any).backblaze_url !== undefined) dbUpdates.backblaze_url = (updates as any).backblaze_url
      
      const { data, error } = await this.supabase
        .from('videos')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('[SUPABASE VIDEO] Update error:', error)
        throw error
      }
      
      console.log('[SUPABASE VIDEO] Video updated successfully')
      return rowToVideoUpload(data)
      
    } catch (error) {
      console.error('[SUPABASE VIDEO] Update failed:', error)
      throw error
    }
  }
  
  /**
   * Get video by ID as Video (domain interface)
   */
  async getVideo(id: string): Promise<Video | null> {
    try {
      const { data, error } = await this.supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('[SUPABASE VIDEO] Get error:', error)
        throw error
      }
      
      return rowToVideo(data)
      
    } catch (error) {
      console.error('[SUPABASE VIDEO] Get failed:', error)
      throw error
    }
  }
  
  /**
   * Get video by ID as VideoUpload (for course creation)
   */
  async getVideoUpload(id: string): Promise<VideoUpload | null> {
    try {
      const { data, error } = await this.supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        console.error('[SUPABASE VIDEO] Get error:', error)
        throw error
      }
      
      return rowToVideoUpload(data)
      
    } catch (error) {
      console.error('[SUPABASE VIDEO] Get failed:', error)
      throw error
    }
  }
  
  /**
   * Get all videos for a course as VideoUpload[] (for course creation)
   */
  async getCourseVideoUploads(courseId: string): Promise<VideoUpload[]> {
    try {
      console.log(`[SUPABASE VIDEO] Getting video uploads for course: ${courseId}`)
      
      const { data, error } = await this.supabase
        .from('videos')
        .select('*')
        .eq('course_id', courseId)
        .order('chapter_id', { ascending: true })
        .order('order', { ascending: true })
      
      if (error) {
        console.error('[SUPABASE VIDEO] Get course videos error:', error)
        throw error
      }
      
      console.log(`[SUPABASE VIDEO] Found ${data?.length || 0} videos for course`)
      return data ? data.map(rowToVideoUpload) : []
      
    } catch (error) {
      console.error('[SUPABASE VIDEO] Get course videos failed:', error)
      throw error
    }
  }
  
  /**
   * Get all videos for a course as Video[] (domain interface)
   */
  async getCourseVideos(courseId: string): Promise<Video[]> {
    try {
      console.log(`[SUPABASE VIDEO] Getting videos for course: ${courseId}`)
      
      const { data, error } = await this.supabase
        .from('videos')
        .select('*')
        .eq('course_id', courseId)
        .order('chapter_id', { ascending: true })
        .order('order', { ascending: true })
      
      if (error) {
        console.error('[SUPABASE VIDEO] Get course videos error:', error)
        throw error
      }
      
      console.log(`[SUPABASE VIDEO] Found ${data?.length || 0} videos for course`)
      if (data && data.length > 0) {
        console.log('[SUPABASE VIDEO] Video details:', data.map(v => ({ 
          id: v.id, 
          title: v.title,
          status: v.status 
        })))
      }
      return data ? data.map(rowToVideo) : []
      
    } catch (error) {
      console.error('[SUPABASE VIDEO] Get course videos failed:', error)
      throw error
    }
  }
  
  /**
   * Get videos for a specific chapter as VideoUpload[]
   */
  async getChapterVideoUploads(courseId: string, chapterId: string): Promise<VideoUpload[]> {
    try {
      console.log(`[SUPABASE VIDEO] Getting video uploads for chapter: ${chapterId}`)
      
      const { data, error } = await this.supabase
        .from('videos')
        .select('*')
        .eq('course_id', courseId)
        .eq('chapter_id', chapterId)
        .order('order', { ascending: true })
      
      if (error) {
        console.error('[SUPABASE VIDEO] Get chapter videos error:', error)
        throw error
      }
      
      console.log(`[SUPABASE VIDEO] Found ${data?.length || 0} videos for chapter`)
      return data ? data.map(rowToVideoUpload) : []
      
    } catch (error) {
      console.error('[SUPABASE VIDEO] Get chapter videos failed:', error)
      throw error
    }
  }
  
  /**
   * Get videos for a specific chapter
   */
  async getChapterVideos(courseId: string, chapterId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('videos')
        .select('*')
        .eq('course_id', courseId)
        .eq('chapter_id', chapterId)
        .order('order', { ascending: true })
      
      if (error) throw error
      return data || []
      
    } catch (error) {
      console.error('[SUPABASE VIDEO] Get chapter videos failed:', error)
      return []
    }
  }

  /**
   * Get raw video data including Backblaze fields
   */
  async getVideoRaw(id: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
      
    } catch (error) {
      console.error('[SUPABASE VIDEO] Get raw video failed:', error)
      return null
    }
  }

  /**
   * Delete a video record
   */
  async deleteVideo(id: string): Promise<void> {
    try {
      console.log(`[SUPABASE VIDEO] Deleting video: ${id}`)
      
      // First check if the video exists and get course info
      const { data: existingVideo, error: fetchError } = await this.supabase
        .from('videos')
        .select('id, title, course_id')
        .eq('id', id)
        .single()
      
      if (fetchError) {
        console.error('[SUPABASE VIDEO] Could not fetch video to delete:', fetchError)
      } else {
        console.log('[SUPABASE VIDEO] Found video to delete:', existingVideo)
        
        // Course ownership should be verified by the calling API route, not here
        console.log('[SUPABASE VIDEO] Deleting video for course:', existingVideo?.course_id)
      }
      
      // Attempt deletion
      const { data, error, count } = await this.supabase
        .from('videos')
        .delete()
        .eq('id', id)
        .select() // Return deleted rows to confirm
      
      if (error) {
        console.error('[SUPABASE VIDEO] Delete error:', error)
        throw error
      }
      
      console.log('[SUPABASE VIDEO] Delete response - data:', data, 'count:', count)
      
      // Verify deletion
      const { data: checkVideo, error: checkError } = await this.supabase
        .from('videos')
        .select('id')
        .eq('id', id)
        .single()
      
      if (!checkError && checkVideo) {
        console.error('[SUPABASE VIDEO] Video still exists after delete!', checkVideo)
        throw new Error('Video deletion failed - video still exists')
      } else if (checkError?.code === 'PGRST116') {
        console.log('[SUPABASE VIDEO] Video confirmed deleted (not found)')
      }
      
      console.log('[SUPABASE VIDEO] Video deleted successfully')
      
    } catch (error) {
      console.error('[SUPABASE VIDEO] Delete failed:', error)
      throw error
    }
  }
  
  /**
   * Update video upload status
   */
  async updateUploadStatus(id: string, status: VideoMetadata['upload_status'], progress?: number): Promise<void> {
    try {
      const updates: any = {
        upload_status: status,
        updated_at: new Date().toISOString()
      }
      
      if (progress !== undefined) {
        updates.upload_progress = progress
      }
      
      const { error } = await this.supabase
        .from('videos')
        .update(updates)
        .eq('id', id)
      
      if (error) {
        console.error('[SUPABASE VIDEO] Update status error:', error)
        throw error
      }
      
    } catch (error) {
      console.error('[SUPABASE VIDEO] Update status failed:', error)
      throw error
    }
  }
  
  /**
   * Update video order within a chapter
   */
  async updateVideoOrder(id: string, newOrder: number): Promise<void> {
    try {
      console.log(`[SUPABASE VIDEO] Updating video ${id} order to ${newOrder}`)
      
      const { error } = await this.supabase
        .from('videos')
        .update({ 
          order: newOrder,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (error) {
        console.error('[SUPABASE VIDEO] Update order error:', error)
        throw error
      }
      
      console.log('[SUPABASE VIDEO] Video order updated successfully')
      
    } catch (error) {
      console.error('[SUPABASE VIDEO] Update order failed:', error)
      throw error
    }
  }
  
  /**
   * Get raw video row from database (internal use)
   */
  async getVideoRow(id: string): Promise<VideoRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      
      return data as VideoRow
      
    } catch (error) {
      console.error('[SUPABASE VIDEO] Get video row failed:', error)
      return null
    }
  }
}

// Export singleton instance
// Don't export singleton - require explicit client creation
// export const supabaseVideoService = new SupabaseVideoService()
// Use: new SupabaseVideoService(supabaseClient) in server context
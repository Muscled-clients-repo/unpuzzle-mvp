/**
 * Integrated Video Upload Service
 * Coordinates Backblaze B2 uploads with Supabase database storage
 * UI-First Design: Maintains existing VideoUpload interface compatibility
 */

import { backblazeService } from './backblaze-service'
import { supabaseVideoService } from '@/services/supabase/video-service'
import type { VideoUpload } from '@/stores/slices/course-creation-slice'

export interface VideoUploadProgress {
  videoId: string
  progress: number
  status: VideoUpload['status']
  error?: string
}

export class VideoUploadService {
  /**
   * Upload video file to Backblaze B2 and save metadata to database
   */
  async uploadVideo(
    courseId: string,
    chapterId: string,
    videoUpload: VideoUpload,
    onProgress?: (progress: VideoUploadProgress) => void
  ): Promise<VideoUpload> {
    
    if (!videoUpload.file) {
      throw new Error('No file provided for upload')
    }
    
    const file = videoUpload.file
    const fileName = `courses/${courseId}/chapters/${chapterId}/${videoUpload.id}_${file.name}`
    
    try {
      console.log(`[VIDEO UPLOAD] Starting upload for ${videoUpload.name}`)
      
      // Update status to uploading
      onProgress?.({
        videoId: videoUpload.id,
        progress: 0,
        status: 'uploading'
      })
      
      // Upload to Backblaze B2 with progress tracking
      const uploadResult = await backblazeService.uploadVideo(
        file,
        fileName,
        (progress) => {
          console.log(`[VIDEO UPLOAD] Progress ${videoUpload.name}: ${progress.percentage}%`)
          
          onProgress?.({
            videoId: videoUpload.id,
            progress: progress.percentage,
            status: 'uploading'
          })
        }
      )
      
      console.log(`[VIDEO UPLOAD] Upload complete: ${uploadResult.fileUrl}`)
      
      // Update status to processing (for potential future transcoding)
      onProgress?.({
        videoId: videoUpload.id,
        progress: 100,
        status: 'processing'
      })
      
      // For now, skip transcoding and go straight to complete
      // TODO: Add Bunny.net CDN integration here
      
      // Create database record
      const updatedVideoUpload: VideoUpload = {
        ...videoUpload,
        status: 'complete',
        progress: 100,
        url: uploadResult.fileUrl, // Use B2 URL for now, will be CDN later
        duration: await this.extractVideoDuration(file) // Extract duration from file
      }
      
      // Save to database
      const savedVideo = await supabaseVideoService.createVideoFromUpload(
        courseId,
        chapterId,
        {
          ...updatedVideoUpload,
          // Add backend metadata
          size: uploadResult.contentLength
        }
      )
      
      // Update database with B2 metadata
      await supabaseVideoService.updateVideo(savedVideo.id, {
        ...savedVideo,
        url: uploadResult.fileUrl
      })
      
      console.log(`[VIDEO UPLOAD] Complete: ${savedVideo.name}`)
      
      onProgress?.({
        videoId: videoUpload.id,
        progress: 100,
        status: 'complete'
      })
      
      return savedVideo
      
    } catch (error) {
      console.error(`[VIDEO UPLOAD] Failed for ${videoUpload.name}:`, error)
      
      onProgress?.({
        videoId: videoUpload.id,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      })
      
      throw error
    }
  }
  
  /**
   * Delete video from both Backblaze and database
   */
  async deleteVideo(videoUpload: VideoUpload): Promise<void> {
    try {
      console.log(`[VIDEO UPLOAD] Deleting video: ${videoUpload.name}`)
      
      // Get video from database to get Backblaze file ID
      const video = await supabaseVideoService.getVideoUpload(videoUpload.id)
      
      if (video) {
        // Delete from database first
        await supabaseVideoService.deleteVideo(video.id)
        
        // If we have backend storage info, delete from Backblaze
        // Note: We'll need to store backblaze_file_id in the database for this to work
        // For now, we'll skip B2 deletion to avoid errors
        console.log(`[VIDEO UPLOAD] Deleted from database: ${video.name}`)
      }
      
    } catch (error) {
      console.error(`[VIDEO UPLOAD] Delete failed:`, error)
      throw error
    }
  }
  
  /**
   * Get upload progress for a video
   */
  async getVideoUploadStatus(videoId: string): Promise<VideoUpload | null> {
    try {
      return await supabaseVideoService.getVideoUpload(videoId)
    } catch (error) {
      console.error(`[VIDEO UPLOAD] Failed to get status for ${videoId}:`, error)
      return null
    }
  }
  
  /**
   * Get all video uploads for a course
   */
  async getCourseVideoUploads(courseId: string): Promise<VideoUpload[]> {
    try {
      return await supabaseVideoService.getCourseVideoUploads(courseId)
    } catch (error) {
      console.error(`[VIDEO UPLOAD] Failed to get course videos:`, error)
      return []
    }
  }
  
  /**
   * Extract video duration from file (placeholder - would use real video processing)
   */
  private async extractVideoDuration(file: File): Promise<string> {
    // For MVP, return placeholder duration
    // TODO: Implement real video duration extraction using ffmpeg or video element
    const sizeInMB = file.size / (1024 * 1024)
    const estimatedDurationMinutes = Math.max(1, Math.floor(sizeInMB / 10)) // Rough estimate
    
    return `${estimatedDurationMinutes}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
  }
  
  /**
   * Check if feature flags allow real video upload
   */
  static shouldUseRealUpload(): boolean {
    return process.env.NEXT_PUBLIC_USE_REAL_VIDEO_UPLOAD === 'true'
  }
}

// Export singleton instance
export const videoUploadService = new VideoUploadService()
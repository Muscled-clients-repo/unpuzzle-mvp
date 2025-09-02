import { NextRequest, NextResponse } from 'next/server'
import { backblazeService } from '@/services/video/backblaze-service'
import { SupabaseVideoService } from '@/services/supabase/video-service'
import { createServiceClient } from '@/lib/supabase/server'
import type { VideoUpload } from '@/stores/slices/course-creation-slice'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const courseId = formData.get('courseId') as string
    const chapterId = formData.get('chapterId') as string
    const videoId = formData.get('videoId') as string
    const videoName = formData.get('videoName') as string
    const duration = formData.get('duration') as string || '0:00'
    
    if (!file || !courseId || !chapterId || !videoId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`[API] Uploading video: ${videoName} for course ${courseId}`)
    
    // Convert File to the format Backblaze expects
    const fileName = `courses/${courseId}/chapters/${chapterId}/${videoId}_${file.name}`
    
    // Upload to Backblaze
    const uploadResult = await backblazeService.uploadVideo(
      file,
      fileName,
      (progress) => {
        console.log(`[API] Upload progress: ${progress.percentage}%`)
      }
    )
    
    console.log(`[API] Upload complete: ${uploadResult.fileUrl}`)
    
    // Create service client with elevated privileges for database insert
    const supabase = createServiceClient()
    const videoService = new SupabaseVideoService(supabase)
    
    // Get existing videos to determine the order
    const existingVideos = await videoService.getChapterVideos(courseId, chapterId)
    const nextOrder = existingVideos.length // This will be the next order number
    
    // Save to database - create VideoUpload object
    const videoUpload: VideoUpload = {
      id: videoId,
      name: videoName,
      size: file.size,
      status: 'complete' as const,
      progress: 100,
      url: uploadResult.fileUrl, // Already has CDN URL from backblaze service
      chapterId: chapterId,
      order: nextOrder,
      duration: duration, // Real duration from client
      thumbnailUrl: undefined
    }
    
    await videoService.createVideoFromUpload(
      courseId,
      chapterId,
      videoUpload
    )
    
    return NextResponse.json({
      success: true,
      url: videoUpload.url,
      fileId: uploadResult.fileId,
      duration: videoUpload.duration
    })
    
  } catch (error) {
    console.error('[API] Upload failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
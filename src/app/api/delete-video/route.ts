import { NextRequest, NextResponse } from 'next/server'
import { backblazeService } from '@/services/video/backblaze-service'
import { SupabaseVideoService } from '@/services/supabase/video-service'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    const fileId = searchParams.get('fileId')
    const fileName = searchParams.get('fileName')
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    console.log(`[API] Deleting video: ${videoId}`)
    
    // Delete from database first
    const supabase = createServiceClient()
    const videoService = new SupabaseVideoService(supabase)
    
    // Get video details from database if not provided
    let backblazeFileId = fileId
    let backblazeFileName = fileName
    
    if (!backblazeFileId || !backblazeFileName) {
      try {
        const video = await videoService.getVideoRaw(videoId)
        if (video) {
          backblazeFileId = video.backblaze_file_id
          backblazeFileName = video.filename
        }
      } catch (error) {
        console.error('[API] Could not fetch video details:', error)
      }
    }
    
    // Delete from database
    await videoService.deleteVideo(videoId)
    console.log(`[API] Deleted from database: ${videoId}`)
    
    // Delete from Backblaze if we have the file info
    if (backblazeFileId && backblazeFileName) {
      try {
        await backblazeService.deleteVideo(backblazeFileId, backblazeFileName)
        console.log(`[API] Deleted from Backblaze: ${backblazeFileName}`)
      } catch (error) {
        console.error('[API] Backblaze deletion failed (non-critical):', error)
        // Don't fail the whole operation if Backblaze delete fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully'
    })
    
  } catch (error) {
    console.error('[API] Delete failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    )
  }
}
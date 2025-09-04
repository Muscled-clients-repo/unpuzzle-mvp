import { NextRequest, NextResponse } from 'next/server'
import { backblazeService } from '@/services/video/backblaze-service'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id
    console.log('[API] Delete video called for ID:', videoId)
    
    // Create service client to access database
    const supabase = createServiceClient()
    
    // 1. Get video details from database (SERVER-SIDE)
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('id, backblaze_file_id, filename, course_id')
      .eq('id', videoId)
      .single()
    
    if (fetchError || !video) {
      console.log('[API] Video not found:', videoId)
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }
    
    console.log('[API] Found video:', {
      id: video.id,
      filename: video.filename,
      backblaze_file_id: video.backblaze_file_id
    })
    
    // 2. Delete from database first
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)
    
    if (deleteError) {
      console.error('[API] Database deletion failed:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete video from database' },
        { status: 500 }
      )
    }
    
    console.log('[API] Deleted from database successfully')
    
    // 3. Delete from Backblaze (if we have the file info)
    if (video.backblaze_file_id && video.filename) {
      try {
        console.log('[API] Attempting to delete from Backblaze')
        await backblazeService.deleteVideo(video.backblaze_file_id, video.filename)
        console.log('[API] Successfully deleted from Backblaze')
      } catch (bbError) {
        console.error('[API] Backblaze deletion failed:', bbError)
        // Don't fail the whole operation - DB deletion succeeded
        // Backblaze file can be cleaned up manually if needed
      }
    } else {
      console.log('[API] No Backblaze file info available for cleanup')
    }
    
    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
      videoId
    })
    
  } catch (error) {
    console.error('[API] Delete video error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    )
  }
}
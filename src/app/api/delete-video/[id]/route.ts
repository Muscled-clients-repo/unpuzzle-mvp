import { NextRequest, NextResponse } from 'next/server'
import { backblazeService } from '@/services/video/backblaze-service'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const videoId = resolvedParams.id
    console.log('[API] Delete video called for ID:', videoId)
    
    // Authenticate user first
    const authResult = await authenticateApiRequest(request, 'instructor')
    
    if (!authResult.success || !authResult.user) {
      console.error('[API] Authentication failed:', authResult.error)
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      )
    }
    console.log('[API] Authenticated user:', authResult.user.id)
    
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
    
    // 2. Verify ownership - check if user owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', video.course_id)
      .single()
    
    if (courseError || !course || course.instructor_id !== authResult.user.id) {
      console.log('[API] Access denied - user does not own course')
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
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
import { NextRequest, NextResponse } from 'next/server'
import { backblazeService } from '@/services/video/backblaze-service'
import { createServiceClient } from '@/lib/supabase/server'
import { authenticateApiRequest, verifyResourceOwnership } from '@/lib/auth/api-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const courseId = resolvedParams.id
    console.log('[API] Delete course called for ID:', courseId)
    
    // Authenticate user and require instructor role
    let authResult;
    try {
      authResult = await authenticateApiRequest(request, 'instructor')
    } catch (authError) {
      console.error('[API] Authentication error:', authError)
      return NextResponse.json(
        { error: 'Authentication failed', details: authError instanceof Error ? authError.message : 'Unknown error' },
        { status: 500 }
      )
    }
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Verify course ownership
    const ownsResource = await verifyResourceOwnership(authResult.user.id, courseId)
    
    if (!ownsResource) {
      return NextResponse.json(
        { error: 'Access denied. You can only delete your own courses.' },
        { status: 403 }
      )
    }
    
    console.log(`[API] User ${authResult.user.id} authorized to delete course ${courseId}`)
    
    // Create service client to access database
    const supabase = createServiceClient()
    
    // 1. Get all videos for this course to clean up Backblaze
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, backblaze_file_id, filename')
      .eq('course_id', courseId) as { 
        data: { id: string; backblaze_file_id: string | null; filename: string }[] | null;
        error: any 
      }
    
    if (videosError) {
      console.error('[API] Failed to fetch videos:', videosError)
    }
    
    console.log(`[API] Found ${videos?.length || 0} videos to clean up`)
    
    // 2. Delete course from database (this will cascade delete videos due to FK constraint)
    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
    
    if (deleteError) {
      console.error('[API] Course deletion failed:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete course' },
        { status: 500 }
      )
    }
    
    console.log('[API] Course deleted from database successfully')
    
    // 3. Clean up Backblaze files (after database deletion succeeds)
    if (videos && videos.length > 0) {
      console.log('[API] Starting Backblaze cleanup for videos')
      
      // Delete files from Backblaze in parallel for efficiency
      const deletionPromises = videos.map(async (video) => {
        if (video.backblaze_file_id && video.filename) {
          try {
            await backblazeService.deleteVideo(video.backblaze_file_id, video.filename)
            console.log(`[API] Deleted video file: ${video.filename}`)
          } catch (error) {
            console.error(`[API] Failed to delete video file ${video.filename}:`, error)
            // Don't fail the whole operation if one file fails
          }
        }
      })
      
      await Promise.all(deletionPromises)
      console.log('[API] Backblaze cleanup completed')
    }
    
    return NextResponse.json({
      success: true,
      message: 'Course and all associated videos deleted successfully',
      courseId,
      videosDeleted: videos?.length || 0
    })
    
  } catch (error) {
    console.error('[API] Delete course error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    )
  }
}
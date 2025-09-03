import { NextRequest, NextResponse } from 'next/server'
import { backblazeService } from '@/services/video/backblaze-service'
import { SupabaseVideoService } from '@/services/supabase/video-service'
import { createServiceClient } from '@/lib/supabase/server'
import { authenticateApiRequest, validateDeleteRequest, verifyVideoOwnership } from '@/lib/auth/api-auth'
import { checkRateLimit, rateLimitConfigs } from '@/lib/auth/rate-limit'

export async function DELETE(request: NextRequest) {
  try {
    // 1. Check rate limit
    const rateLimit = checkRateLimit(request, rateLimitConfigs.delete)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Too many delete requests.',
          resetTime: rateLimit.resetTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfigs.delete.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
          }
        }
      )
    }

    // 2. Authenticate user and require instructor role
    const authResult = await authenticateApiRequest(request, 'instructor')
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      )
    }

    // 3. Validate request parameters
    const validationResult = validateDeleteRequest(request.url)
    
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      )
    }

    const { videoId, fileId, fileName } = validationResult.data!

    // 4. Verify video ownership
    const ownershipResult = await verifyVideoOwnership(authResult.user.id, videoId)
    
    if (!ownershipResult.owns) {
      return NextResponse.json(
        { error: 'Access denied. You can only delete your own videos.' },
        { status: 403 }
      )
    }

    console.log(`[API] Deleting video: ${videoId} by user ${authResult.user.id}`)
    
    // 5. Delete from database first
    const supabase = createServiceClient()
    const videoService = new SupabaseVideoService(supabase)
    
    // 6. Get video details from database if not provided
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
    
    // 7. Delete from database
    await videoService.deleteVideo(videoId)
    console.log(`[API] Deleted from database: ${videoId}`)
    
    // 8. Delete from Backblaze if we have the file info
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
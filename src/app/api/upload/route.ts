import { NextRequest, NextResponse } from 'next/server'
import { backblazeService } from '@/services/video/backblaze-service'
import { SupabaseVideoService } from '@/services/supabase/video-service'
import { createServiceClient } from '@/lib/supabase/server'
import { authenticateApiRequest, validateUploadRequest, verifyResourceOwnership } from '@/lib/auth/api-auth'
import { checkRateLimit, rateLimitConfigs } from '@/lib/auth/rate-limit'
import type { VideoUpload } from '@/stores/slices/course-creation-slice'

export async function POST(request: NextRequest) {
  try {
    // 1. Check rate limit
    const rateLimit = checkRateLimit(request, rateLimitConfigs.upload)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Too many upload requests.',
          resetTime: rateLimit.resetTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfigs.upload.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
          }
        }
      )
    }

    // 2. Authenticate user and require instructor role
    console.log('[API] Authenticating upload request...')
    const authResult = await authenticateApiRequest(request, 'instructor')
    
    if (!authResult.success || !authResult.user) {
      console.error('[API] Authentication failed:', authResult.error)
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: 401 }
      )
    }
    console.log('[API] Authentication successful for user:', authResult.user.id)

    // 3. Validate request data
    const formData = await request.formData()
    const validationResult = validateUploadRequest(formData)
    
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      )
    }

    const { file, courseId, chapterId, videoId, videoName } = validationResult.data!
    const duration = formData.get('duration') as string || '0:00'

    // 4. Verify course ownership
    const ownsResource = await verifyResourceOwnership(authResult.user.id, courseId)
    
    if (!ownsResource) {
      return NextResponse.json(
        { error: 'Access denied. You can only upload videos to your own courses.' },
        { status: 403 }
      )
    }

    console.log(`[API] Uploading video: ${videoName} for course ${courseId} by user ${authResult.user.id}`)
    
    // 5. Convert File to the format Backblaze expects
    // Sanitize filename: replace spaces and special chars with underscores
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `courses/${courseId}/chapters/${chapterId}/${videoId}_${sanitizedFileName}`
    
    // Upload to Backblaze
    const uploadResult = await backblazeService.uploadVideo(
      file,
      fileName,
      (progress) => {
        console.log(`[API] Upload progress: ${progress.percentage}%`)
      }
    )
    
    console.log(`[API] Upload complete: ${uploadResult.fileUrl}`)
    
    // 5. Create service client with elevated privileges for database insert
    const supabase = createServiceClient()
    const videoService = new SupabaseVideoService(supabase)
    
    // 6. Get existing videos to determine the order
    const existingVideos = await videoService.getChapterVideos(courseId, chapterId)
    const nextOrder = existingVideos.length // This will be the next order number
    
    // 7. Save to database - create VideoUpload object with Backblaze file ID
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
      thumbnailUrl: undefined,
      backblazeFileId: uploadResult.fileId // Store the Backblaze file ID for deletion
    }
    
    // Pass the Backblaze filename separately to the service
    const uploadWithFilename = { ...videoUpload, backblazeFileName: fileName } as any
    
    await videoService.createVideoFromUpload(
      courseId,
      chapterId,
      uploadWithFilename
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
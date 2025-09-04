import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/domain'

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
}

export interface AuthResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
}

/**
 * Authenticate and authorize API requests
 * @param request - The Next.js request object
 * @param requiredRole - Optional role requirement
 * @returns Promise<AuthResult>
 */
export async function authenticateApiRequest(
  request: NextRequest,
  requiredRole?: UserRole
): Promise<AuthResult> {
  try {
    // Create Supabase client with user session (not service client)
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email!,
      role: profile.role as UserRole
    }

    // Check role requirement if specified
    if (requiredRole && profile.role !== requiredRole) {
      return {
        success: false,
        error: `Access denied. Required role: ${requiredRole}`
      }
    }

    return {
      success: true,
      user: authenticatedUser
    }
  } catch (error) {
    console.error('[API_AUTH] Authentication error:', error)
    return {
      success: false,
      error: 'Authentication failed'
    }
  }
}

/**
 * Check if user owns a specific course
 * @param userId - User ID to check
 * @param courseId - Course ID to verify ownership
 * @returns Promise<boolean>
 */
export async function verifyResourceOwnership(
  userId: string,
  courseId: string
): Promise<boolean> {
  try {
    console.log('[API_AUTH] Checking ownership - userId:', userId, 'courseId:', courseId)
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()

    console.log('[API_AUTH] Course query result:', { data, error })
    
    if (error || !data) {
      console.error('[API_AUTH] Course not found or error:', error)
      return false
    }

    const ownsIt = data.instructor_id === userId
    console.log('[API_AUTH] Ownership check:', {
      course_instructor_id: data.instructor_id,
      requesting_user_id: userId,
      owns: ownsIt
    })
    return ownsIt
  } catch (error) {
    console.error('[API_AUTH] Ownership verification error:', error)
    return false
  }
}

/**
 * Check if user owns a specific video by checking the associated course
 * @param userId - User ID to check
 * @param videoId - Video ID to verify ownership
 * @returns Promise<{ owns: boolean, courseId?: string }>
 */
export async function verifyVideoOwnership(
  userId: string,
  videoId: string
): Promise<{ owns: boolean, courseId?: string }> {
  try {
    const supabase = await createClient()
    
    // Get video with course information
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        course_id,
        courses!inner(instructor_id)
      `)
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return { owns: false }
    }

    const courseId = video.course_id
    const instructorId = (video.courses as any).instructor_id
    
    return {
      owns: instructorId === userId,
      courseId
    }
  } catch (error) {
    console.error('[API_AUTH] Video ownership verification error:', error)
    return { owns: false }
  }
}

/**
 * Validate file upload parameters
 * @param formData - FormData from request
 * @returns Object with validation result and parsed data
 */
export function validateUploadRequest(formData: FormData) {
  const file = formData.get('file') as File
  const courseId = formData.get('courseId') as string
  const chapterId = formData.get('chapterId') as string
  const videoId = formData.get('videoId') as string
  const videoName = formData.get('videoName') as string

  // Required field validation
  if (!file || !courseId || !chapterId || !videoId) {
    return {
      valid: false,
      error: 'Missing required fields: file, courseId, chapterId, videoId'
    }
  }

  // File type validation
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    }
  }

  // File size validation (100MB limit)
  const maxSize = 100 * 1024 * 1024 // 100MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 100MB limit'
    }
  }

  return {
    valid: true,
    data: { file, courseId, chapterId, videoId, videoName }
  }
}

/**
 * Validate delete request parameters
 * @param url - Request URL
 * @returns Object with validation result and parsed data
 */
export function validateDeleteRequest(url: string) {
  const { searchParams } = new URL(url)
  const videoId = searchParams.get('videoId')
  const fileId = searchParams.get('fileId')
  const fileName = searchParams.get('fileName')

  if (!videoId) {
    return {
      valid: false,
      error: 'Missing required parameter: videoId'
    }
  }

  return {
    valid: true,
    data: { videoId, fileId, fileName }
  }
}
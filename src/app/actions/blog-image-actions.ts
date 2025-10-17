"use server"

import { BackblazeService } from "@/services/video/backblaze-service"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"
import { generateCDNUrlWithToken as generateCDNUrl, extractFilePathFromPrivateUrl } from "@/services/security/hmac-token-service"

export interface BlogImageUploadResult {
  success: boolean
  fileUrl?: string
  cdnUrl?: string
  fileName?: string
  fileId?: string
  error?: string
}

async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Ignore cookie errors in middleware
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Ignore cookie errors in middleware
          }
        },
      },
    }
  )
}

// Generate CDN URL with HMAC token for private files
function generateCDNUrlWithToken(privateUrl: string | null): string | null {
  if (!privateUrl || !privateUrl.startsWith('private:')) {
    return privateUrl // Return as-is if not private format
  }

  const cdnBaseUrl = 'https://cdn.unpuzzle.co'
  const hmacSecret = process.env.CDN_AUTH_SECRET || process.env.AUTH_SECRET

  if (!hmacSecret) {
    console.warn('⚠️ HMAC secret not configured, cannot generate CDN URL')
    return null
  }

  try {
    const filePath = extractFilePathFromPrivateUrl(privateUrl)
    return generateCDNUrl(cdnBaseUrl, filePath, hmacSecret)
  } catch (error) {
    console.error('❌ Error generating CDN URL:', error)
    return null
  }
}

/**
 * Upload blog image to Backblaze (for featured images, OG images, and in-content images)
 * Images are stored in media_files table with category='blog'
 * Returns private URL format for CDN access with HMAC tokens
 */
export async function uploadBlogImageAction(
  formData: FormData
): Promise<BlogImageUploadResult> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      }
    }

    const file = formData.get('file') as File
    if (!file) {
      return {
        success: false,
        error: 'No file provided'
      }
    }

    // Validate file type (only images)
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'Only image files are allowed'
      }
    }

    // Validate file size (max 10MB for images)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'Image size must be less than 10MB'
      }
    }

    console.log('📤 Uploading blog image:', file.name, `${(file.size / 1024 / 1024).toFixed(2)}MB`)

    const backblazeService = new BackblazeService()

    // Generate unique filename with timestamp to avoid conflicts
    const timestamp = Date.now()
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueFileName = `blog/${timestamp}_${cleanFileName}`

    // Upload to Backblaze with private URL format
    const uploadResult = await backblazeService.uploadVideo(
      file,
      uniqueFileName
    )

    console.log('✅ Upload successful:', uploadResult.fileName)

    // Create private URL format for signed URL system
    const privateUrl = `private:${uploadResult.fileId}:${uploadResult.fileName}`

    // Generate CDN URL with HMAC token (6-hour expiration)
    const cdnUrl = generateCDNUrlWithToken(privateUrl)

    console.log('🔗 Private URL format:', privateUrl)
    console.log('🔗 CDN URL with token:', cdnUrl?.substring(0, 80) + '...')

    // Save media file to database with category='blog'
    const mediaFileData: Database["public"]["Tables"]["media_files"]["Insert"] = {
      name: uploadResult.fileName,
      original_name: file.name,
      file_type: 'image',
      mime_type: file.type,
      file_size: file.size,
      backblaze_file_id: uploadResult.fileId,
      backblaze_url: uploadResult.fileUrl,
      cdn_url: cdnUrl,
      uploaded_by: user.id,
      category: 'blog', // Mark as blog image
      status: 'active'
    }

    const { data: savedFile, error: dbError } = await supabase
      .from('media_files')
      .insert(mediaFileData)
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database save failed:', dbError)
      return {
        success: false,
        error: `Upload succeeded but failed to save metadata: ${dbError.message}`
      }
    }

    console.log('💾 Blog image saved to database:', savedFile.id)

    // Revalidate blog admin pages
    revalidatePath('/admin/blog')

    return {
      success: true,
      fileUrl: uploadResult.fileUrl,
      cdnUrl: cdnUrl || undefined,
      fileName: uploadResult.fileName,
      fileId: savedFile.id
    }
  } catch (error) {
    console.error('❌ Blog image upload failed:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Delete blog image from database
 * Soft delete by updating status to 'deleted'
 */
export async function deleteBlogImageAction(fileId: string) {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      }
    }

    console.log('🗑️ Deleting blog image:', fileId)

    // Soft delete by updating status to 'deleted'
    const { error } = await supabase
      .from('media_files')
      .update({ status: 'deleted' })
      .eq('id', fileId)
      .eq('uploaded_by', user.id)
      .eq('category', 'blog')

    if (error) {
      console.error('❌ Failed to delete blog image:', error)
      return {
        success: false,
        error: error.message
      }
    }

    console.log('✅ Blog image deleted successfully')

    // Revalidate blog admin pages
    revalidatePath('/admin/blog')

    return { success: true }
  } catch (error) {
    console.error('❌ Failed to delete blog image:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete image'
    }
  }
}

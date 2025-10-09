'use server'

import { createClient } from '@/lib/supabase/server'
import { backblazeService } from '@/services/video/backblaze-service'
import { generateCDNUrlWithToken, extractFilePathFromPrivateUrl } from '@/services/security/hmac-token-service'

/**
 * Upload resource file to Backblaze B2 and generate CDN URL with HMAC token
 * This handles the actual file upload and returns both private URL and CDN URL
 */
export async function uploadResourceFile(formData: FormData) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Unauthorized' }
    }

    // Verify user is instructor or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'instructor' && profile?.role !== 'admin') {
      return { error: 'Only instructors can upload resources' }
    }

    const file = formData.get('file') as File
    if (!file) {
      return { error: 'No file provided' }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `resources/${user.id}/${timestamp}_${sanitizedName}`

    console.log('[RESOURCE_UPLOAD] Uploading file:', fileName)

    // Upload to Backblaze (returns private URL format: private:fileId:fileName)
    const result = await backblazeService.uploadVideo(file, fileName)

    console.log('[RESOURCE_UPLOAD] Upload successful:', result.fileUrl)

    // Generate CDN URL with HMAC token for immediate use
    // Note: We store the private URL in the database, but can generate CDN URLs on demand
    const cdnBaseUrl = process.env.NEXT_PUBLIC_CDN_BASE_URL || 'https://cdn.unpuzzle.co'
    const hmacSecret = process.env.CDN_AUTH_SECRET || process.env.AUTH_SECRET

    let cdnUrl: string | null = null

    if (!hmacSecret) {
      console.warn('[RESOURCE_UPLOAD] ⚠️ HMAC secret not configured, CDN URL will not be generated')
    } else {
      try {
        // Extract file path from private URL
        const filePath = extractFilePathFromPrivateUrl(result.fileUrl)

        // Generate CDN URL with 6-hour token expiration (pattern 20 & 23)
        cdnUrl = generateCDNUrlWithToken(cdnBaseUrl, filePath, hmacSecret, { expirationHours: 6 })

        console.log('[RESOURCE_UPLOAD] CDN URL generated with HMAC token')
      } catch (error) {
        console.error('[RESOURCE_UPLOAD] ❌ Error generating CDN URL:', error)
      }
    }

    return {
      success: true,
      fileUrl: result.fileUrl,      // Private URL for database storage
      cdnUrl: cdnUrl || result.fileUrl, // CDN URL with HMAC token, or fallback to private URL
      fileId: result.fileId,
      fileName: result.fileName,
      fileSize: result.contentLength
    }
  } catch (error) {
    console.error('[RESOURCE_UPLOAD] Upload failed:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to upload file'
    }
  }
}

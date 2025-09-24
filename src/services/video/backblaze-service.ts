/**
 * Backblaze B2 Video Upload Service
 * Handles direct video uploads to Backblaze B2 cloud storage
 */

import B2 from 'backblaze-b2'
import { generateCDNUrlWithToken, extractFilePathFromPrivateUrl } from '../security/hmac-token-service'

interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

interface UploadResult {
  fileId: string
  fileName: string
  fileUrl: string
  contentLength: number
  contentSha1: string
  uploadTimestamp: number
}

interface SignedUrlResult {
  url: string
  expiresAt: number
}

export class BackblazeService {
  private b2: B2
  private isAuthorized = false
  private bucketId: string | null = null
  
  constructor() {
    const keyId = process.env.BACKBLAZE_APPLICATION_KEY_ID
    const key = process.env.BACKBLAZE_APPLICATION_KEY
    
    console.log('[BACKBLAZE] Initializing with credentials:')
    console.log('[BACKBLAZE] Key ID:', keyId ? `${keyId.substring(0, 10)}...` : 'MISSING')
    console.log('[BACKBLAZE] Key:', key ? 'SET' : 'MISSING')
    
    if (!keyId || !key) {
      console.error('[BACKBLAZE] Missing credentials! Check your .env.local file')
      console.error('[BACKBLAZE] Need BACKBLAZE_APPLICATION_KEY_ID and BACKBLAZE_APPLICATION_KEY')
    }
    
    this.b2 = new B2({
      applicationKeyId: keyId || '',
      applicationKey: key || '',
    })
  }
  
  /**
   * Authorize with Backblaze B2 and get bucket info
   */
  async authorize(): Promise<void> {
    if (this.isAuthorized) return
    
    try {
      console.log('[BACKBLAZE] Authorizing account...')
      console.log('[BACKBLAZE] Using Key ID:', process.env.BACKBLAZE_APPLICATION_KEY_ID)
      console.log('[BACKBLAZE] Using Bucket:', process.env.BACKBLAZE_BUCKET_NAME)
      
      const authResponse = await this.b2.authorize()
      console.log('[BACKBLAZE] Auth response received:', authResponse.data ? 'Success' : 'Failed')
      
      // Skip bucket listing if we have a restricted key
      // Use the bucket ID from the auth response if available
      const bucketName = process.env.BACKBLAZE_BUCKET_NAME!
      
      // For restricted keys, the allowed bucket ID is in the auth response
      if (authResponse.data.allowed && authResponse.data.allowed.bucketId) {
        this.bucketId = authResponse.data.allowed.bucketId
        console.log('[BACKBLAZE] Using restricted bucket ID from auth:', this.bucketId)
      } else if (process.env.BACKBLAZE_BUCKET_ID) {
        // Use bucket ID from environment if provided
        this.bucketId = process.env.BACKBLAZE_BUCKET_ID
        console.log('[BACKBLAZE] Using bucket ID from environment:', this.bucketId)
      } else {
        // Try to list buckets (will fail for restricted keys)
        try {
          const response = await this.b2.listBuckets()
          const bucket = response.data.buckets.find(b => b.bucketName === bucketName)
          
          if (!bucket) {
            throw new Error(`Bucket '${bucketName}' not found`)
          }
          
          this.bucketId = bucket.bucketId
        } catch (listError) {
          // If listing fails, we need the bucket ID
          console.log('[BACKBLAZE] Cannot list buckets (restricted key?), need BACKBLAZE_BUCKET_ID in .env')
          throw new Error('Please add BACKBLAZE_BUCKET_ID to your .env.local file')
        }
      }
      
      this.isAuthorized = true
      
      console.log('[BACKBLAZE] Authorization successful')
      console.log('[BACKBLAZE] Bucket ID:', this.bucketId)
      
    } catch (error) {
      console.error('[BACKBLAZE] Authorization failed:', error)
      throw error
    }
  }
  
  /**
   * Upload a video file to Backblaze B2
   */
  async uploadVideo(
    file: File,
    fileName: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    await this.authorize()
    
    if (!this.bucketId) {
      throw new Error('Bucket ID not available')
    }
    
    try {
      console.log(`[BACKBLAZE] Starting upload: ${fileName} (${file.size} bytes)`)
      
      // Get upload URL and token
      const uploadUrlResponse = await this.b2.getUploadUrl({
        bucketId: this.bucketId
      })
      
      const { uploadUrl, authorizationToken } = uploadUrlResponse.data
      
      // Convert File to Buffer for upload
      const buffer = await file.arrayBuffer()
      const fileBuffer = Buffer.from(buffer)
      
      // Calculate SHA1 hash
      const crypto = require('crypto')
      const sha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex')
      
      console.log(`[BACKBLAZE] Upload URL obtained, uploading ${fileName}...`)
      
      // Upload file with progress tracking
      const response = await this.b2.uploadFile({
        uploadUrl,
        uploadAuthToken: authorizationToken,
        fileName,
        data: fileBuffer,
        info: {
          'original-filename': file.name,
          'content-type': file.type,
          'uploaded-by': 'unpuzzle-mvp'
        },
        hash: sha1,
        onUploadProgress: (event: any) => {
          if (onProgress) {
            const progress: UploadProgress = {
              loaded: event.loaded || 0,
              total: event.total || file.size,
              percentage: event.total ? Math.round((event.loaded / event.total) * 100) : 0
            }
            onProgress(progress)
          }
        }
      })
      
      const result: UploadResult = {
        fileId: response.data.fileId,
        fileName: response.data.fileName,
        // Store file ID for private access - no direct URL
        fileUrl: `private:${response.data.fileId}:${response.data.fileName}`,
        contentLength: response.data.contentLength,
        contentSha1: response.data.contentSha1,
        uploadTimestamp: response.data.uploadTimestamp
      }
      
      console.log(`[BACKBLAZE] Upload successful: ${fileName}`)
      console.log(`[BACKBLAZE] File ID: ${result.fileId}`)
      console.log(`[BACKBLAZE] File URL: ${result.fileUrl}`)
      
      return result
      
    } catch (error) {
      console.error(`[BACKBLAZE] Upload failed for ${fileName}:`, error)
      throw error
    }
  }
  
  /**
   * Delete a video file from Backblaze B2
   */
  async deleteVideo(fileId: string, fileName: string): Promise<void> {
    await this.authorize()
    
    try {
      console.log(`[BACKBLAZE] Deleting file: ${fileName} (ID: ${fileId})`)
      
      // B2 API only needs fileId and fileName for deleteFileVersion
      // The fileName parameter is just for identification, not matching
      const deleteParams = {
        fileId: fileId,
        fileName: fileName.replace(/\+/g, ' ') // Decode + back to spaces
      }
      
      console.log('[BACKBLAZE] Delete params:', deleteParams)
      
      await this.b2.deleteFileVersion(deleteParams)
      
      console.log(`[BACKBLAZE] File deleted successfully: ${fileName}`)
      
    } catch (error: any) {
      console.error(`[BACKBLAZE] Delete failed for ${fileName}:`, error)
      
      // Log more details about the error
      if (error.response) {
        console.error('[BACKBLAZE] Error response:', {
          status: error.response.status,
          data: error.response.data
        })
      }
      
      throw error
    }
  }
  
  /**
   * Get file info from Backblaze B2
   */
  async getFileInfo(fileId: string): Promise<any> {
    await this.authorize()
    
    try {
      const response = await this.b2.getFileInfo({ fileId })
      return response.data
      
    } catch (error) {
      console.error(`[BACKBLAZE] Get file info failed for ${fileId}:`, error)
      throw error
    }
  }
  
  /**
   * List all videos in the bucket
   */
  async listVideos(prefix?: string): Promise<any[]> {
    await this.authorize()
    
    if (!this.bucketId) {
      throw new Error('Bucket ID not available')
    }
    
    try {
      console.log('[BACKBLAZE] Listing files...')
      
      const response = await this.b2.listFileNames({
        bucketId: this.bucketId,
        maxFileCount: 1000,
        prefix: prefix || ''
      })
      
      return response.data.files
      
    } catch (error) {
      console.error('[BACKBLAZE] List files failed:', error)
      throw error
    }
  }
  
  /**
   * Generate a CDN URL with HMAC token (new method)
   * @param fileName - File name/path
   * @param expirationHours - Hours until URL expires (default: 6)
   */
  generateCDNUrl(fileName: string, expirationHours: number = 6): SignedUrlResult {
    const cdnUrl = process.env.CLOUDFLARE_CDN_URL || 'https://cdn.unpuzzle.co'
    const authSecret = process.env.CDN_AUTH_SECRET || process.env.AUTH_SECRET || ''

    if (!authSecret) {
      console.warn('[BACKBLAZE] CDN_AUTH_SECRET not configured, falling back to Backblaze signed URLs')
      throw new Error('CDN authentication not configured')
    }

    // Ensure fileName starts with /
    const filePath = fileName.startsWith('/') ? fileName : `/${fileName}`

    // Debug logging
    console.log('[BACKBLAZE] generateCDNUrl - fileName:', fileName)
    console.log('[BACKBLAZE] generateCDNUrl - filePath:', filePath)
    console.log('[BACKBLAZE] generateCDNUrl - has spaces:', filePath.includes(' '))

    // Generate CDN URL with HMAC token
    const url = generateCDNUrlWithToken(cdnUrl, filePath, authSecret, {
      expirationHours
    })

    // Calculate expiration time
    const expiresAt = Date.now() + (expirationHours * 60 * 60 * 1000)

    console.log(`[BACKBLAZE] Generated CDN URL with HMAC token for ${fileName}`)
    console.log(`[BACKBLAZE] CDN URL: ${url.substring(0, 50)}...`)
    console.log(`[BACKBLAZE] Expires at: ${new Date(expiresAt).toISOString()}`)

    return { url, expiresAt }
  }

  /**
   * Generate a signed URL for private file access
   * @param fileId - Backblaze file ID
   * @param fileName - File name
   * @param expirationHours - Hours until URL expires (default: 2)
   */
  async generateSignedUrl(fileId: string, fileName: string, expirationHours: number = 2): Promise<SignedUrlResult> {
    // Check if we should use CDN with HMAC tokens
    const useCDNTokens = process.env.USE_CDN_TOKENS === 'true'

    if (useCDNTokens) {
      try {
        console.log('[BACKBLAZE] USE_CDN_TOKENS enabled, generating CDN URL with HMAC token')
        return this.generateCDNUrl(fileName, expirationHours)
      } catch (error) {
        console.error('[BACKBLAZE] Failed to generate CDN URL, falling back to Backblaze:', error)
        // Fall through to Backblaze signed URL generation
      }
    }

    await this.authorize()

    try {
      console.log(`[BACKBLAZE] Generating Backblaze signed URL for ${fileName} (expires in ${expirationHours}h)`)
      
      // Calculate expiration timestamp
      const expiresAt = Date.now() + (expirationHours * 60 * 60 * 1000)
      const validDurationSeconds = expirationHours * 60 * 60
      
      // Get download authorization
      const authResponse = await this.b2.getDownloadAuthorization({
        bucketId: this.bucketId!,
        fileNamePrefix: fileName,
        validDurationInSeconds: validDurationSeconds
      })
      
      const { authorizationToken } = authResponse.data
      
      // Construct signed download URL through Cloudflare CDN (fallback to direct B2)
      // Based on official Backblaze guide: CDN Transform Rule handles /file/bucket path
      let downloadUrl: string

      console.log(`[BACKBLAZE] DEBUG: CLOUDFLARE_CDN_URL = "${process.env.CLOUDFLARE_CDN_URL}"`)
      console.log(`[BACKBLAZE] DEBUG: USE_CDN_TOKENS = "${process.env.USE_CDN_TOKENS}"`)

      // When USE_CDN_TOKENS is false, use direct Backblaze URLs
      // When USE_CDN_TOKENS is true, the CDN with HMAC tokens is handled in generateSignedUrl method above
      // Legacy CDN mode (with Backblaze auth) is disabled for now due to conflicts
      if (false && process.env.CLOUDFLARE_CDN_URL && process.env.USE_CDN_TOKENS !== 'true' && process.env.USE_CDN_TOKENS !== 'false') {
        // Legacy mode: DISABLED - Was causing conflicts
        // Would need: ${CLOUDFLARE_CDN_URL}/file/${BUCKET_NAME}/${fileName}?Authorization=...
        downloadUrl = `${process.env.CLOUDFLARE_CDN_URL}/file/${process.env.BACKBLAZE_BUCKET_NAME}/${fileName}?Authorization=${authorizationToken}`
        console.log(`[BACKBLAZE] DEBUG: Using legacy CDN URL: ${downloadUrl}`)
      } else {
        // Default: Direct B2 URL (when USE_CDN_TOKENS is false or CDN not configured)
        downloadUrl = `https://f005.backblazeb2.com/file/${process.env.BACKBLAZE_BUCKET_NAME}/${fileName}?Authorization=${authorizationToken}`
        console.log(`[BACKBLAZE] DEBUG: Using direct B2 URL: ${downloadUrl}`)
      }

      if (process.env.CLOUDFLARE_CDN_URL) {
        console.log(`[BACKBLAZE] Using Cloudflare CDN: ${process.env.CLOUDFLARE_CDN_URL}`)
      } else {
        console.log(`[BACKBLAZE] Using direct B2 URL (no CDN configured)`)
        console.log(`[BACKBLAZE] WARNING: This will hit bandwidth caps - configure CLOUDFLARE_CDN_URL`)
      }
      
      console.log(`[BACKBLAZE] Signed URL generated for ${fileName}:`)
      console.log(`[BACKBLAZE] Final URL: ${downloadUrl}`)
      console.log(`[BACKBLAZE] Expires: ${new Date(expiresAt).toISOString()}`)
      console.log(`[BACKBLAZE] Using CDN: ${process.env.CLOUDFLARE_CDN_URL ? 'YES' : 'NO'}`)

      return {
        url: downloadUrl,
        expiresAt
      }
      
    } catch (error) {
      console.error(`[BACKBLAZE] Failed to generate signed URL for ${fileName}:`, error)
      throw error
    }
  }
  
  /**
   * Parse private file URL and generate signed URL
   * @param privateUrl - Format: "private:fileId:fileName"
   * @param expirationHours - Hours until URL expires (default: 2)
   */
  async getSignedUrlFromPrivate(privateUrl: string, expirationHours: number = 2): Promise<SignedUrlResult> {
    if (!privateUrl.startsWith('private:')) {
      throw new Error('Invalid private URL format. Expected: private:fileId:fileName')
    }

    const parts = privateUrl.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid private URL format. Expected: private:fileId:fileName')
    }

    const [, fileId, fileName] = parts

    // Check if we should use CDN with HMAC tokens
    const useCDNTokens = process.env.USE_CDN_TOKENS === 'true'

    if (useCDNTokens) {
      try {
        console.log('[BACKBLAZE] USE_CDN_TOKENS enabled, generating CDN URL from private URL')
        // Extract file path and generate CDN URL
        const filePath = extractFilePathFromPrivateUrl(privateUrl)
        return this.generateCDNUrl(filePath, expirationHours)
      } catch (error) {
        console.error('[BACKBLAZE] Failed to generate CDN URL from private URL, falling back to Backblaze:', error)
        // Fall through to Backblaze signed URL generation
      }
    }

    return this.generateSignedUrl(fileId, fileName, expirationHours)
  }
}

// Export singleton instance
export const backblazeService = new BackblazeService()
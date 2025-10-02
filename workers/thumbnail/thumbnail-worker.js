/**
 * Thumbnail Extraction Worker
 *
 * Extracts video thumbnails from Backblaze B2 videos using FFmpeg with HMAC authentication
 */

const BaseWorker = require('../shared/base-worker')
const { spawn } = require('child_process')
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { generateCDNUrlFromPrivateUrl } = require('../shared/cdn-utils')

class ThumbnailWorker extends BaseWorker {
  constructor(workerId) {
    super('thumbnail', workerId)

    // FFmpeg configuration
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'

    // CDN configuration
    this.cdnBaseUrl = 'https://cdn.unpuzzle.co'
    this.hmacSecret = process.env.HMAC_SECRET

    if (!this.hmacSecret) {
      throw new Error('HMAC_SECRET environment variable is required for CDN authentication')
    }

    // Backblaze B2 configuration
    this.b2KeyId = process.env.BACKBLAZE_APPLICATION_KEY_ID
    this.b2ApplicationKey = process.env.BACKBLAZE_APPLICATION_KEY
    this.b2BucketId = process.env.BACKBLAZE_BUCKET_ID

    if (!this.b2KeyId || !this.b2ApplicationKey || !this.b2BucketId) {
      throw new Error('Backblaze B2 credentials are required (KEY_ID, APPLICATION_KEY, BUCKET_ID)')
    }

    // Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // B2 authentication state
    this.b2AuthToken = null
    this.b2UploadUrl = null
    this.b2UploadAuthToken = null

    console.log(`🎬 FFmpeg Path: ${this.ffmpegPath}`)
    console.log(`🔐 HMAC authentication enabled for CDN`)
    console.log(`☁️ Backblaze B2 configured`)
  }

  /**
   * Authenticate with Backblaze B2
   */
  async authenticateB2() {
    const authString = Buffer.from(`${this.b2KeyId}:${this.b2ApplicationKey}`).toString('base64')

    try {
      const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`
        }
      })

      if (!response.ok) {
        throw new Error(`B2 authentication failed: ${response.status}`)
      }

      const data = await response.json()
      this.b2AuthToken = data.authorizationToken
      this.b2ApiUrl = data.apiUrl

      console.log('✅ Authenticated with Backblaze B2')
      return data
    } catch (error) {
      throw new Error(`B2 authentication error: ${error.message}`)
    }
  }

  /**
   * Get upload URL from Backblaze B2
   */
  async getB2UploadUrl() {
    if (!this.b2AuthToken) {
      await this.authenticateB2()
    }

    try {
      const response = await fetch(`${this.b2ApiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: {
          'Authorization': this.b2AuthToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bucketId: this.b2BucketId
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to get upload URL: ${response.status}`)
      }

      const data = await response.json()
      this.b2UploadUrl = data.uploadUrl
      this.b2UploadAuthToken = data.authorizationToken

      return data
    } catch (error) {
      throw new Error(`B2 upload URL error: ${error.message}`)
    }
  }

  /**
   * Upload thumbnail to Backblaze B2
   */
  async uploadToB2(thumbnailPath, fileName) {
    if (!this.b2UploadUrl || !this.b2UploadAuthToken) {
      await this.getB2UploadUrl()
    }

    try {
      const fileBuffer = fs.readFileSync(thumbnailPath)
      const sha1Hash = crypto.createHash('sha1').update(fileBuffer).digest('hex')

      const response = await fetch(this.b2UploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': this.b2UploadAuthToken,
          'X-Bz-File-Name': encodeURIComponent(fileName),
          'Content-Type': 'image/jpeg',
          'Content-Length': fileBuffer.length.toString(),
          'X-Bz-Content-Sha1': sha1Hash
        },
        body: fileBuffer
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`B2 upload failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`✅ Uploaded thumbnail to B2: ${fileName}`)

      // Return private URL format: private:fileId:fileName
      return `private:${data.fileId}:/${fileName}`
    } catch (error) {
      // Retry once on failure
      console.warn(`⚠️ B2 upload failed, retrying... ${error.message}`)

      // Refresh upload URL and try again
      await this.getB2UploadUrl()

      const fileBuffer = fs.readFileSync(thumbnailPath)
      const sha1Hash = crypto.createHash('sha1').update(fileBuffer).digest('hex')

      const response = await fetch(this.b2UploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': this.b2UploadAuthToken,
          'X-Bz-File-Name': encodeURIComponent(fileName),
          'Content-Type': 'image/jpeg',
          'Content-Length': fileBuffer.length.toString(),
          'X-Bz-Content-Sha1': sha1Hash
        },
        body: fileBuffer
      })

      if (!response.ok) {
        throw new Error(`B2 upload failed after retry: ${response.status}`)
      }

      const data = await response.json()
      return `private:${data.fileId}:/${fileName}`
    }
  }

  /**
   * Extract thumbnail from video using FFmpeg
   */
  async extractThumbnail(videoUrl, duration) {
    // Calculate extraction time: min(3 seconds, 10% of duration, duration - 0.5s)
    const extractTime = Math.max(0.5, Math.min(3, duration * 0.1, duration - 0.5))

    // Create temp file for thumbnail
    const tempDir = os.tmpdir()
    const tempFile = path.join(tempDir, `thumbnail_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`)

    return new Promise((resolve, reject) => {
      console.log(`🔍 Extracting thumbnail at ${extractTime}s from: ${videoUrl.split('?')[0]}`)

      const ffmpeg = spawn(this.ffmpegPath, [
        '-ss', extractTime.toString(),
        '-i', videoUrl,
        '-vframes', '1',
        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease',
        '-q:v', '2',
        tempFile
      ])

      let errorOutput = ''

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`))
          return
        }

        // Check if file was created
        if (!fs.existsSync(tempFile)) {
          reject(new Error('FFmpeg did not create thumbnail file'))
          return
        }

        console.log(`✅ Thumbnail extracted to: ${tempFile}`)
        resolve(tempFile)
      })

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`))
      })
    })
  }

  async executeJob(job) {
    console.log(`🖼️ Extracting thumbnail for video ${job.videoId}`)

    let tempThumbnailPath = null

    try {
      // Get media file from database (include uploaded_by for userId routing)
      let { data: mediaFile, error: mediaError } = await this.supabase
        .from('media_files')
        .select('id, name, original_name, backblaze_url, cdn_url, duration_seconds, uploaded_by')
        .eq('id', job.videoId)
        .single()

      if (mediaError || !mediaFile) {
        throw new Error(`Media file not found: ${job.videoId}`)
      }

      console.log(`📍 Media file found: ${mediaFile.name}`)

      // Check if duration is available, retry if not
      if (!mediaFile.duration_seconds || mediaFile.duration_seconds <= 0) {
        console.log('⏳ Duration not available yet, will retry in 5 seconds...')

        // Wait 5 seconds and retry
        await new Promise(resolve => setTimeout(resolve, 5000))

        // Re-fetch media file to check for duration
        const { data: retryMediaFile, error: retryError } = await this.supabase
          .from('media_files')
          .select('id, name, original_name, backblaze_url, cdn_url, duration_seconds, uploaded_by')
          .eq('id', job.videoId)
          .single()

        if (retryError || !retryMediaFile) {
          throw new Error(`Media file not found on retry: ${job.videoId}`)
        }

        if (!retryMediaFile.duration_seconds || retryMediaFile.duration_seconds <= 0) {
          throw new Error('Video duration still not available after retry. Duration worker may have failed.')
        }

        // Update mediaFile reference with retry data
        mediaFile = retryMediaFile
        console.log('✅ Duration now available: ' + mediaFile.duration_seconds + 's')
      }

      // Use cdn_url or backblaze_url (both should be in private: format)
      const privateUrl = mediaFile.cdn_url || mediaFile.backblaze_url

      if (!privateUrl) {
        throw new Error('No storage URL available')
      }

      console.log(`🔗 Private URL: ${privateUrl.substring(0, 50)}...`)

      // Generate CDN URL with HMAC token
      let videoUrl
      if (!privateUrl.startsWith('private:')) {
        console.log(`✅ Using public URL directly`)
        videoUrl = privateUrl
      } else {
        console.log(`🔐 Generating fresh HMAC token for CDN access...`)
        videoUrl = generateCDNUrlFromPrivateUrl(privateUrl, this.cdnBaseUrl, this.hmacSecret)
        console.log(`✅ CDN URL with token generated: ${videoUrl.split('?')[0]}`)
      }

      await this.updateJobStatus(job.id, 25, 'processing')

      // Extract thumbnail using FFmpeg
      tempThumbnailPath = await this.extractThumbnail(videoUrl, mediaFile.duration_seconds)

      await this.updateJobStatus(job.id, 50, 'processing')

      // Generate thumbnail filename: {videoId}_thumbnail.jpg
      const thumbnailFileName = `${job.videoId}_thumbnail.jpg`

      // Upload to Backblaze B2
      console.log(`☁️ Uploading thumbnail to Backblaze B2...`)
      const thumbnailUrl = await this.uploadToB2(tempThumbnailPath, thumbnailFileName)
      console.log(`✅ Thumbnail uploaded: ${thumbnailUrl}`)

      await this.updateJobStatus(job.id, 75, 'processing')

      // Update database with thumbnail URL
      const { error: updateError } = await this.supabase
        .from('media_files')
        .update({
          thumbnail_url: thumbnailUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.videoId)

      if (updateError) {
        throw new Error(`Failed to update thumbnail URL: ${updateError.message}`)
      }

      console.log(`✅ Thumbnail URL updated in database`)

      // Broadcast update via WebSocket (include userId from mediaFile)
      await this.broadcastThumbnailUpdate(job.videoId, thumbnailUrl, mediaFile.uploaded_by)

      // Clean up temp file
      if (tempThumbnailPath && fs.existsSync(tempThumbnailPath)) {
        fs.unlinkSync(tempThumbnailPath)
        console.log(`🧹 Cleaned up temp file: ${tempThumbnailPath}`)
      }

    } catch (error) {
      console.error(`❌ Thumbnail extraction failed for ${job.videoId}:`, error.message)

      // Clean up temp file on error
      if (tempThumbnailPath && fs.existsSync(tempThumbnailPath)) {
        try {
          fs.unlinkSync(tempThumbnailPath)
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to clean up temp file: ${cleanupError.message}`)
        }
      }

      throw error
    }
  }

  async broadcastThumbnailUpdate(videoId, thumbnailUrl, userId) {
    try {
      const response = await fetch(`${this.websocketServerUrl}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'media-thumbnail-updated',
          data: {
            userId,  // Required for WebSocket routing
            videoId,
            thumbnailUrl,
            timestamp: Date.now()
          }
        })
      })

      if (response.ok) {
        console.log(`📡 Thumbnail update broadcasted for video ${videoId} (userId: ${userId})`)
      } else {
        console.warn(`⚠️ Failed to broadcast thumbnail update: ${response.status}`)
      }
    } catch (error) {
      console.warn(`⚠️ Broadcast error:`, error.message)
    }
  }
}

// Start worker
const workerId = process.env.WORKER_ID || `thumbnail-${process.pid}`
const worker = new ThumbnailWorker(workerId)
worker.start()

// Graceful shutdown
process.on('SIGTERM', () => worker.shutdown())
process.on('SIGINT', () => worker.shutdown())

module.exports = ThumbnailWorker

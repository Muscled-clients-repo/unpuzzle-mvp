/**
 * Duration Extraction Worker
 *
 * Extracts video duration from Backblaze B2 videos using FFprobe
 */

const BaseWorker = require('../shared/base-worker')
const { spawn } = require('child_process')
const { createClient } = require('@supabase/supabase-js')

class DurationWorker extends BaseWorker {
  constructor(workerId) {
    super('duration', workerId)

    // FFprobe configuration
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe'

    // Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    console.log(`🎬 FFprobe Path: ${this.ffprobePath}`)
  }

  async executeJob(job) {
    console.log(`📹 Extracting duration for video ${job.videoId}`)

    try {
      // Get media file from database
      const { data: mediaFile, error: mediaError } = await this.supabase
        .from('media_files')
        .select('id, name, original_name, backblaze_url, cdn_url, file_type')
        .eq('id', job.videoId)
        .single()

      if (mediaError || !mediaFile) {
        throw new Error(`Media file not found: ${job.videoId}`)
      }

      console.log(`📍 Media file found: ${mediaFile.name}`)

      // Use CDN URL if available, otherwise use backblaze URL
      const videoUrl = mediaFile.cdn_url || mediaFile.backblaze_url

      console.log(`🔗 Video URL: ${videoUrl}`)

      if (!videoUrl) {
        throw new Error('No video URL available')
      }

      // Check if URL is a private Backblaze format
      if (videoUrl && videoUrl.startsWith('private:')) {
        throw new Error('Video URL is in private format and cannot be accessed directly. CDN URL is required.')
      }

      await this.updateJobStatus(job.id, 25, 'processing')

      const duration = await this.extractDuration(videoUrl)
      console.log(`⏱️ Extracted duration: ${duration} seconds`)

      await this.updateJobStatus(job.id, 75, 'processing')

      // Update database with duration
      const { error: updateError } = await this.supabase
        .from('media_files')
        .update({
          duration_seconds: Math.round(duration),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.videoId)

      if (updateError) {
        throw new Error(`Failed to update duration: ${updateError.message}`)
      }

      console.log(`✅ Duration updated in database: ${Math.round(duration)}s`)

      // Broadcast update via WebSocket
      await this.broadcastDurationUpdate(job.videoId, Math.round(duration), 'media-file')

    } catch (error) {
      console.error(`❌ Duration extraction failed for ${job.videoId}:`, error.message)
      throw error
    }
  }

  async extractDuration(videoUrl) {
    return new Promise((resolve, reject) => {
      console.log(`🔍 Running FFprobe on: ${videoUrl}`)

      const ffprobe = spawn(this.ffprobePath, [
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0',
        videoUrl
      ])

      let output = ''
      let errorOutput = ''

      ffprobe.stdout.on('data', (data) => {
        output += data.toString()
      })

      ffprobe.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFprobe failed with code ${code}: ${errorOutput}`))
          return
        }

        const duration = parseFloat(output.trim())
        if (isNaN(duration) || duration <= 0) {
          reject(new Error(`Invalid duration extracted: ${output.trim()}`))
          return
        }

        resolve(duration)
      })

      ffprobe.on('error', (error) => {
        reject(new Error(`FFprobe spawn error: ${error.message}`))
      })
    })
  }

  async broadcastDurationUpdate(mediaFileId, duration, type = 'video') {
    try {
      const response = await fetch(`${this.websocketServerUrl}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'media-duration-updated',
          data: {
            mediaFileId,
            duration,
            type,
            timestamp: Date.now()
          }
        })
      })

      if (response.ok) {
        console.log(`📡 Duration update broadcasted for media file ${mediaFileId}`)
      } else {
        console.warn(`⚠️ Failed to broadcast duration update: ${response.status}`)
      }
    } catch (error) {
      console.warn(`⚠️ Broadcast error:`, error.message)
    }
  }
}

// Start worker
const workerId = process.env.WORKER_ID || `duration-${process.pid}`
const worker = new DurationWorker(workerId)
worker.start()

// Graceful shutdown
process.on('SIGTERM', () => worker.shutdown())
process.on('SIGINT', () => worker.shutdown())

module.exports = DurationWorker
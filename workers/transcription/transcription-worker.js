/**
 * Transcription Worker Process
 *
 * Handles video transcription jobs using Whisper.cpp
 * Communicates with WebSocket server for job queue management
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// HTTP client for Node.js built-in
const http = require('http')
const https = require('https')

console.log('🎬 Starting Transcription Worker...')

class TranscriptionWorker {
  constructor(workerId) {
    this.workerId = workerId || process.env.WORKER_ID || `worker-${process.pid}`
    this.currentJob = null
    this.isProcessing = false
    this.websocketServerUrl = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8080'
    this.concurrentJobs = parseInt(process.env.CONCURRENT_JOBS || '1')

    // Whisper configuration
    this.whisperPath = process.env.WHISPER_CPP_PATH || './whisper.cpp/main'
    this.modelPath = process.env.WHISPER_MODEL_PATH || './models/ggml-base.en.bin'
    this.tempDir = process.env.TRANSCRIPTION_TEMP_DIR || '/tmp/transcriptions'
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'

    console.log(`🆔 Worker ID: ${this.workerId}`)
    console.log(`🌐 WebSocket Server: ${this.websocketServerUrl}`)
    console.log(`🎤 Whisper Path: ${this.whisperPath}`)
    console.log(`📁 Temp Directory: ${this.tempDir}`)
  }

  async start() {
    console.log(`🚀 Transcription Worker ${this.workerId} started`)

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true })
      console.log(`📁 Created temp directory: ${this.tempDir}`)
    }

    // Start polling for jobs
    this.pollForJobs()
  }

  async pollForJobs() {
    const pollInterval = 5000 // 5 seconds

    setInterval(async () => {
      if (!this.isProcessing) {
        try {
          await this.checkForNewJobs()
        } catch (error) {
          console.error('❌ Error checking for jobs:', error.message)
        }
      }
    }, pollInterval)

    console.log(`⏱️ Polling for jobs every ${pollInterval / 1000} seconds`)
  }

  async checkForNewJobs() {
    try {
      const job = await this.requestJob()

      if (job) {
        console.log(`🎯 Received job ${job.id} with ${job.videoIds.length} videos`)
        await this.processJob(job)
      }
    } catch (error) {
      console.error('❌ Job request failed:', error.message)
    }
  }

  async requestJob() {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({ workerId: this.workerId })

      const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/get-job',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }

      const req = http.request(options, (res) => {
        let body = ''
        res.on('data', (chunk) => {
          body += chunk.toString()
        })

        res.on('end', () => {
          try {
            const response = JSON.parse(body)
            resolve(response)
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${body}`))
          }
        })
      })

      req.on('error', reject)
      req.write(data)
      req.end()
    })
  }

  async processJob(job) {
    this.isProcessing = true
    this.currentJob = job

    console.log(`🔄 Processing job ${job.id}`)

    try {
      await this.updateJobStatus(job.id, 0, 'processing')

      for (let i = 0; i < job.videoIds.length; i++) {
        const videoId = job.videoIds[i]
        const progressStart = (i / job.videoIds.length) * 100
        const progressEnd = ((i + 1) / job.videoIds.length) * 100

        console.log(`📹 Transcribing video ${i + 1}/${job.videoIds.length}: ${videoId}`)

        try {
          // Update progress for current video
          await this.updateJobStatus(job.id, progressStart, 'processing')

          // Process single video
          await this.transcribeVideo(videoId, job.courseId, (videoProgress) => {
            // Convert video progress to job progress
            const jobProgress = progressStart + (videoProgress / 100) * (progressEnd - progressStart)
            this.updateJobStatus(job.id, jobProgress, 'processing').catch(console.error)
          })

          // Mark video complete
          await this.updateJobStatus(job.id, progressEnd, 'processing')
          console.log(`✅ Completed video ${i + 1}/${job.videoIds.length}`)

        } catch (videoError) {
          console.error(`❌ Failed to transcribe video ${videoId}:`, videoError.message)
          // Continue with other videos, don't fail entire job
        }
      }

      // Job complete
      await this.updateJobStatus(job.id, 100, 'completed')
      console.log(`🎉 Job ${job.id} completed successfully`)

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error.message)
      await this.updateJobStatus(job.id, 0, 'failed', error.message)
    }

    this.isProcessing = false
    this.currentJob = null
  }

  async transcribeVideo(videoId, courseId, progressCallback) {
    // Placeholder implementation - will be replaced with actual Whisper.cpp integration
    console.log(`🎤 [MOCK] Transcribing video ${videoId}`)

    // Simulate transcription progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200)) // Simulate work
      progressCallback(progress)
    }

    // TODO: Implement actual transcription logic:
    // 1. Get video URL from database
    // 2. Download and extract audio
    // 3. Run Whisper.cpp
    // 4. Parse transcript results
    // 5. Store transcript in database
    // 6. Clean up temp files

    console.log(`✅ [MOCK] Video ${videoId} transcription complete`)
  }

  async updateJobStatus(jobId, progress, status, error = null) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        jobId,
        progress: Math.round(progress),
        status,
        error,
        workerId: this.workerId,
        timestamp: Date.now()
      })

      const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/job-update',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }

      const req = http.request(options, (res) => {
        let body = ''
        res.on('data', (chunk) => {
          body += chunk.toString()
        })

        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve()
          } else {
            reject(new Error(`Update failed: ${res.statusCode} ${body}`))
          }
        })
      })

      req.on('error', reject)
      req.write(data)
      req.end()
    })
  }

  // Utility methods for future Whisper.cpp integration
  generateTempFilename(extension = '.wav') {
    return path.join(this.tempDir, `${crypto.randomUUID()}${extension}`)
  }

  cleanup(filePaths) {
    filePaths.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`🗑️ Cleaned up: ${filePath}`)
      }
    })
  }
}

// Start worker
const workerId = process.env.WORKER_ID || `worker-${process.pid}`
const worker = new TranscriptionWorker(workerId)
worker.start()

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔌 Shutting down transcription worker...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🔌 Shutting down transcription worker...')
  process.exit(0)
})

module.exports = TranscriptionWorker
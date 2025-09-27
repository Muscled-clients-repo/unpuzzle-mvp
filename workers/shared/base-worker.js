/**
 * Base Worker Class
 *
 * Provides common functionality for all worker types
 */

const http = require('http')

class BaseWorker {
  constructor(workerType, workerId) {
    this.workerType = workerType
    this.workerId = workerId || process.env.WORKER_ID || `${workerType}-${process.pid}`
    this.currentJob = null
    this.isProcessing = false
    this.websocketServerUrl = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:8080'

    console.log(`🆔 ${workerType} Worker ID: ${this.workerId}`)
    console.log(`🌐 WebSocket Server: ${this.websocketServerUrl}`)
  }

  async start() {
    console.log(`🚀 ${this.workerType} Worker ${this.workerId} started`)
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
        console.log(`🎯 Received ${this.workerType} job ${job.id}`)
        await this.processJob(job)
      }
    } catch (error) {
      console.error('❌ Job request failed:', error.message)
    }
  }

  async requestJob() {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        workerId: this.workerId,
        workerType: this.workerType
      })

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

    console.log(`🔄 Processing ${this.workerType} job ${job.id}`)

    try {
      await this.updateJobStatus(job.id, 0, 'processing')

      // Override this method in child classes
      await this.executeJob(job)

      await this.updateJobStatus(job.id, 100, 'completed')
      console.log(`🎉 ${this.workerType} job ${job.id} completed successfully`)

    } catch (error) {
      console.error(`❌ ${this.workerType} job ${job.id} failed:`, error.message)
      await this.updateJobStatus(job.id, 0, 'failed', error.message)
    }

    this.isProcessing = false
    this.currentJob = null
  }

  // Override this in child classes
  async executeJob(job) {
    throw new Error('executeJob must be implemented by child class')
  }

  async updateJobStatus(jobId, progress, status, error = null) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        jobId,
        progress: Math.round(progress),
        status,
        error,
        workerId: this.workerId,
        workerType: this.workerType,
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

  // Graceful shutdown
  shutdown() {
    console.log(`🔌 Shutting down ${this.workerType} worker...`)
    process.exit(0)
  }
}

module.exports = BaseWorker
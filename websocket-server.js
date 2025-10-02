/**
 * Standalone WebSocket Server Runner
 * 
 * Run this separately from Next.js: node websocket-server.js
 */

const WebSocket = require('ws')
const http = require('http')
const crypto = require('crypto')

console.log('🚀 Starting Unpuzzle WebSocket Server...')

// Create HTTP server for both WebSocket and REST endpoints
const server = http.createServer((req, res) => {
  console.log(`🌐 HTTP ${req.method} ${req.url} from ${req.headers.origin || 'unknown'}`)
  
  // CORS headers for Next.js and Server Actions
  res.setHeader('Access-Control-Allow-Origin', '*') // Allow server-side requests
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // Health check endpoint for Docker/Cloud Run
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'healthy', timestamp: Date.now() }))
    return
  }

  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const message = JSON.parse(body)
        console.log('📤 HTTP broadcast request:', message.type)

        // Handle duration job creation
        if (message.type === 'create-duration-job' && message.data) {
          const jobId = generateJobId()
          const job = {
            id: jobId,
            jobType: 'duration',
            videoId: message.data.videoId,
            operationId: message.operationId,
            status: 'queued',
            progress: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }

          // Add to job queue for workers to pick up
          jobQueue.push(job)
          console.log(`⏱️ Duration job created: ${jobId} for video ${message.data.videoId}`)
        }

        // Handle thumbnail job creation
        if (message.type === 'create-thumbnail-job' && message.data) {
          const jobId = generateJobId()
          const job = {
            id: jobId,
            jobType: 'thumbnail',
            videoId: message.data.videoId,
            operationId: message.operationId,
            status: 'queued',
            progress: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }

          // Add to job queue for workers to pick up
          jobQueue.push(job)
          console.log(`🖼️ Thumbnail job created: ${jobId} for video ${message.data.videoId}`)
        }

        broadcast(message)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('❌ HTTP broadcast error:', error)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  // Worker endpoints
  if (req.method === 'POST' && req.url === '/get-job') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const { workerId, workerType } = JSON.parse(body)
        const job = getNextJobForWorkerType(workerType)

        if (job) {
          markJobActive(job.id, workerId)
          job.status = 'processing'
          job.workerId = workerId
          console.log(`🔄 Job ${job.id} (${job.jobType || 'transcription'}) assigned to ${workerType} worker ${workerId}`)
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(job || null))
      } catch (error) {
        console.error('❌ Get job error:', error)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    })
    return
  }

  if (req.method === 'POST' && req.url === '/job-update') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const { jobId, progress, status, error, workerId } = JSON.parse(body)
        updateJobProgress(jobId, progress, status, error)

        if (status === 'completed' || status === 'failed') {
          markJobComplete(jobId)
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('❌ Job update error:', error)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid update' }))
      }
    })
    return
  }
  
  res.writeHead(404)
  res.end('Not found')
})

const wss = new WebSocket.Server({ server })

// Store connected clients
const clients = new Map()

// Job queue management
const transcriptionJobs = new Map() // jobId -> job details
const jobQueue = [] // pending jobs
const activeJobs = new Map() // jobId -> worker info

// Generate unique job ID
function generateJobId() {
  return crypto.randomUUID()
}

wss.on('connection', (ws, request) => {
  const url = new URL(request.url || '', 'http://localhost:8080')
  const userId = url.searchParams.get('userId') || 'anonymous'
  
  console.log(`🔗 WebSocket client connected: ${userId}`)
  clients.set(userId, ws)

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString())
      console.log(`📨 WebSocket message from ${userId}:`, parsedMessage.type)

      // Handle different message types
      switch (parsedMessage.type) {
        case 'TRANSCRIPTION_REQUEST':
          handleTranscriptionRequest(parsedMessage, userId)
          break
        case 'JOB_STATUS_REQUEST':
          sendJobStatus(parsedMessage.jobId, userId)
          break
        case 'CANCEL_JOB':
          cancelTranscriptionJob(parsedMessage.jobId, userId)
          break
        default:
          console.log(`ℹ️ Unhandled message type: ${parsedMessage.type}`)
      }
    } catch (error) {
      console.error('❌ WebSocket message parse error:', error)
    }
  })

  ws.on('close', () => {
    console.log(`🔌 WebSocket client disconnected: ${userId}`)
    clients.delete(userId)
  })

  ws.on('error', (error) => {
    console.error(`❌ WebSocket client error for ${userId}:`, error)
    clients.delete(userId)
  })
})

// Transcription job management functions
function handleTranscriptionRequest(message, userId) {
  const { videoIds, courseId } = message
  const jobId = generateJobId()

  const job = {
    id: jobId,
    userId,
    courseId,
    videoIds,
    status: 'queued',
    progress: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  transcriptionJobs.set(jobId, job)
  jobQueue.push(job)

  console.log(`🎬 Transcription job created: ${jobId} for ${videoIds.length} videos`)

  // Send confirmation to client
  const client = clients.get(userId)
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({
      type: 'JOB_CREATED',
      jobId,
      status: 'queued',
      videoCount: videoIds.length
    }))
  }

  // Notify available workers via broadcast
  broadcast({
    type: 'job-available',
    jobId,
    internal: true // Flag for worker processes
  })
}

function sendJobStatus(jobId, userId) {
  const job = transcriptionJobs.get(jobId)
  const client = clients.get(userId)

  if (client && client.readyState === WebSocket.OPEN) {
    if (job) {
      client.send(JSON.stringify({
        type: 'JOB_STATUS',
        jobId,
        status: job.status,
        progress: job.progress,
        videoCount: job.videoIds.length,
        error: job.error || null
      }))
    } else {
      client.send(JSON.stringify({
        type: 'JOB_STATUS',
        jobId,
        error: 'Job not found'
      }))
    }
  }
}

function cancelTranscriptionJob(jobId, userId) {
  const job = transcriptionJobs.get(jobId)

  if (job && job.userId === userId) {
    // Remove from queue if not started
    const queueIndex = jobQueue.findIndex(j => j.id === jobId)
    if (queueIndex !== -1) {
      jobQueue.splice(queueIndex, 1)
    }

    // Mark as cancelled
    job.status = 'cancelled'
    job.updatedAt = Date.now()

    console.log(`❌ Job cancelled: ${jobId}`)

    // Notify client
    const client = clients.get(userId)
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'JOB_CANCELLED',
        jobId
      }))
    }

    // Notify workers to stop if active
    if (activeJobs.has(jobId)) {
      broadcast({
        type: 'cancel-job',
        jobId,
        internal: true
      })
    }
  }
}

function updateJobProgress(jobId, progress, status, error = null) {
  const job = transcriptionJobs.get(jobId)
  if (job) {
    job.progress = Math.round(progress)
    job.status = status
    job.updatedAt = Date.now()
    if (error) {
      job.error = error
    }

    console.log(`📊 Job ${jobId} progress: ${progress}% (${status})`)

    // Broadcast to client
    const client = clients.get(job.userId)
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'JOB_PROGRESS',
        jobId,
        progress: job.progress,
        status: job.status,
        error: job.error || null
      }))
    }
  }
}

function getNextJob() {
  return jobQueue.shift() // FIFO queue
}

function getNextJobForWorkerType(workerType) {
  // Find the first job matching the worker type
  const index = jobQueue.findIndex(job => {
    // Transcription workers handle jobs without jobType or with jobType='transcription'
    if (workerType === 'transcription') {
      return !job.jobType || job.jobType === 'transcription'
    }
    // Other workers (like duration) match by jobType
    return job.jobType === workerType
  })

  if (index !== -1) {
    // Remove and return the job
    const job = jobQueue.splice(index, 1)[0]
    return job
  }

  return null
}

function markJobActive(jobId, workerId) {
  activeJobs.set(jobId, {
    workerId,
    startedAt: Date.now()
  })
}

function markJobComplete(jobId) {
  activeJobs.delete(jobId)
}

// Broadcast function for server actions to use
function broadcast(message) {
  const messageString = JSON.stringify(message)
  let sentCount = 0

  console.log(`🔍 DEBUG: Broadcasting to ${clients.size} registered clients`)
  clients.forEach((client, userId) => {
    console.log(`🔍 DEBUG: Client ${userId} state: ${client.readyState} (OPEN=${WebSocket.OPEN})`)
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString)
      sentCount++
      console.log(`✅ Sent to client ${userId}`)
    } else {
      console.log(`❌ Removing stale client ${userId}`)
      clients.delete(userId)
    }
  })

  if (sentCount > 0) {
    console.log(`📡 Broadcast sent to ${sentCount} clients:`, message.type)
  } else {
    console.log(`⚠️ No clients available for broadcast:`, message.type)
  }
}

// Export for server actions to use
global.broadcastWebSocket = broadcast

// Start server
server.listen(8080, () => {
  console.log('✅ WebSocket server running on ws://localhost:8080')
  console.log('✅ HTTP broadcast endpoint: http://localhost:8080/broadcast')
  console.log('👀 Waiting for client connections...')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔌 Shutting down WebSocket server...')
  wss.close()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🔌 Shutting down WebSocket server...')
  wss.close()
  process.exit(0)
})
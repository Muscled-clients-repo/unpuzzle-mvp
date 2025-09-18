# WebSocket + PM2 + Whisper.cpp Integration Architecture

**Date:** September 18, 2025 04:45 AM EST
**Context:** Extend existing WebSocket server for video transcription with PM2 process management

---

## Current Infrastructure Analysis

### ✅ Existing WebSocket Server
- **Location**: `websocket-server.js`
- **Port**: 8080
- **Features**:
  - HTTP broadcast endpoint (`/broadcast`)
  - Client connection management with userId
  - Real-time message broadcasting
  - Server action integration via HTTP POST
  - Graceful shutdown handling

### ✅ Current Usage Pattern
```bash
# Terminal 1: Next.js app
npm run dev

# Terminal 2: WebSocket server
npm run websocket
```

---

## Integration Architecture

### PM2 Process Management Structure
```
PM2 Ecosystem:
├── unpuzzle-websocket      (existing WebSocket server)
├── unpuzzle-transcription  (new Whisper.cpp worker)
└── unpuzzle-nextjs        (optional: Next.js app management)
```

### Communication Flow
```
Course Edit UI → WebSocket Client → WebSocket Server → Job Queue →
Transcription Worker → Whisper.cpp → Progress Updates → WebSocket Broadcast
```

---

## Implementation Files Structure

### Core Files
```
├── ecosystem.config.js                    # PM2 configuration
├── websocket-server.js                    # Enhanced existing server
├── transcription-worker.js                # New Whisper.cpp worker
├── src/services/transcription/
│   ├── whisper-service.ts                 # Whisper.cpp integration
│   ├── job-queue.ts                       # Job management
│   └── audio-processor.ts                 # Audio extraction
└── src/components/course/
    └── TranscriptionPanel.tsx              # Video selection UI
```

---

## Phase 1: PM2 Configuration

### ecosystem.config.js
```js
module.exports = {
  apps: [
    {
      name: 'unpuzzle-websocket',
      script: 'websocket-server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 8080,
        WHISPER_CPP_PATH: '/usr/local/bin/whisper',
        TRANSCRIPTION_TEMP_DIR: '/tmp/transcriptions'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      }
    },
    {
      name: 'unpuzzle-transcription',
      script: 'transcription-worker.js',
      instances: 2, // Parallel processing
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        WORKER_ID: 'auto',
        WHISPER_MODEL: 'base.en',
        CONCURRENT_JOBS: 1
      }
    }
  ]
}
```

### PM2 Commands
```bash
# Replace npm run websocket with:
pm2 start ecosystem.config.js

# Management commands:
pm2 status
pm2 logs unpuzzle-websocket
pm2 restart unpuzzle-transcription
pm2 stop all
```

---

## Phase 2: Enhanced WebSocket Server

### Job Queue Integration
```js
// Add to websocket-server.js

const transcriptionJobs = new Map() // jobId -> job details
const jobQueue = [] // pending jobs
const activeJobs = new Map() // jobId -> worker process

// Enhanced message handler
ws.on('message', (message) => {
  try {
    const parsedMessage = JSON.parse(message.toString())

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
    }
  } catch (error) {
    console.error('WebSocket message error:', error)
  }
})

// New functions
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
    createdAt: Date.now()
  }

  transcriptionJobs.set(jobId, job)
  jobQueue.push(job)

  // Notify transcription worker via HTTP
  notifyWorker({ action: 'NEW_JOB', jobId })

  // Send confirmation to client
  const client = clients.get(userId)
  if (client) {
    client.send(JSON.stringify({
      type: 'JOB_CREATED',
      jobId,
      status: 'queued'
    }))
  }
}

function updateJobProgress(jobId, progress, status) {
  const job = transcriptionJobs.get(jobId)
  if (job) {
    job.progress = progress
    job.status = status

    // Broadcast to client
    const client = clients.get(job.userId)
    if (client) {
      client.send(JSON.stringify({
        type: 'JOB_PROGRESS',
        jobId,
        progress,
        status
      }))
    }
  }
}
```

### Worker Communication
```js
// HTTP endpoint for worker updates
if (req.method === 'POST' && req.url === '/job-update') {
  let body = ''
  req.on('data', chunk => {
    body += chunk.toString()
  })
  req.on('end', () => {
    try {
      const update = JSON.parse(body)
      updateJobProgress(update.jobId, update.progress, update.status)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } catch (error) {
      res.writeHead(400)
      res.end('Invalid update')
    }
  })
  return
}
```

---

## Phase 3: Transcription Worker

### transcription-worker.js
```js
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')

class TranscriptionWorker {
  constructor(workerId) {
    this.workerId = workerId
    this.currentJob = null
    this.isProcessing = false
  }

  async start() {
    console.log(`🎬 Transcription Worker ${this.workerId} started`)
    this.pollForJobs()
  }

  async pollForJobs() {
    setInterval(async () => {
      if (!this.isProcessing) {
        await this.checkForNewJobs()
      }
    }, 5000) // Check every 5 seconds
  }

  async checkForNewJobs() {
    try {
      // Request job from WebSocket server
      const response = await fetch('http://localhost:8080/get-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: this.workerId })
      })

      if (response.ok) {
        const job = await response.json()
        if (job) {
          await this.processJob(job)
        }
      }
    } catch (error) {
      console.error('Job polling error:', error)
    }
  }

  async processJob(job) {
    this.isProcessing = true
    this.currentJob = job

    console.log(`🎯 Processing job ${job.id} with ${job.videoIds.length} videos`)

    try {
      for (let i = 0; i < job.videoIds.length; i++) {
        const videoId = job.videoIds[i]
        const progress = ((i / job.videoIds.length) * 100)

        await this.updateJobStatus(job.id, progress, 'processing')
        await this.transcribeVideo(videoId, job.courseId)

        // Progress per video completion
        const completedProgress = (((i + 1) / job.videoIds.length) * 100)
        await this.updateJobStatus(job.id, completedProgress,
          i === job.videoIds.length - 1 ? 'completed' : 'processing')
      }

      console.log(`✅ Job ${job.id} completed`)

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error)
      await this.updateJobStatus(job.id, 0, 'failed', error.message)
    }

    this.isProcessing = false
    this.currentJob = null
  }

  async transcribeVideo(videoId, courseId) {
    // 1. Get video URL from database
    const videoUrl = await this.getVideoUrl(videoId)

    // 2. Download and extract audio
    const audioPath = await this.extractAudio(videoUrl, videoId)

    // 3. Run Whisper.cpp
    const transcript = await this.runWhisper(audioPath)

    // 4. Store transcript in database
    await this.storeTranscript(videoId, courseId, transcript)

    // 5. Clean up temp files
    fs.unlinkSync(audioPath)
  }

  async runWhisper(audioPath) {
    return new Promise((resolve, reject) => {
      const whisperPath = process.env.WHISPER_CPP_PATH || './whisper.cpp/main'
      const modelPath = process.env.WHISPER_MODEL_PATH || './models/ggml-base.en.bin'

      const args = [
        '-m', modelPath,
        '-f', audioPath,
        '--output-json',
        '--output-file', audioPath.replace('.wav', '')
      ]

      const whisperProcess = spawn(whisperPath, args)

      whisperProcess.on('close', (code) => {
        if (code === 0) {
          // Read generated JSON transcript
          const transcriptPath = audioPath.replace('.wav', '.json')
          const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'))
          fs.unlinkSync(transcriptPath) // Clean up
          resolve(transcript)
        } else {
          reject(new Error(`Whisper process failed with code ${code}`))
        }
      })

      whisperProcess.on('error', reject)
    })
  }

  async updateJobStatus(jobId, progress, status, error = null) {
    try {
      await fetch('http://localhost:8080/job-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          progress: Math.round(progress),
          status,
          error,
          workerId: this.workerId
        })
      })
    } catch (error) {
      console.error('Failed to update job status:', error)
    }
  }
}

// Start worker
const workerId = process.env.WORKER_ID || process.pid
const worker = new TranscriptionWorker(workerId)
worker.start()
```

---

## Phase 4: Course Edit UI Integration

### Video Selection Component
```tsx
// src/components/course/TranscriptionPanel.tsx
'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '@/hooks/use-websocket-connection'

interface TranscriptionPanelProps {
  courseId: string
  videos: Video[]
}

export function TranscriptionPanel({ courseId, videos }: TranscriptionPanelProps) {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  const [jobs, setJobs] = useState<Map<string, TranscriptionJob>>(new Map())
  const { socket, isConnected } = useWebSocket()

  useEffect(() => {
    if (!socket) return

    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data)

      switch (message.type) {
        case 'JOB_CREATED':
          setJobs(prev => new Map(prev.set(message.jobId, {
            id: message.jobId,
            status: message.status,
            progress: 0
          })))
          break

        case 'JOB_PROGRESS':
          setJobs(prev => {
            const updated = new Map(prev)
            const job = updated.get(message.jobId)
            if (job) {
              job.progress = message.progress
              job.status = message.status
              updated.set(message.jobId, job)
            }
            return updated
          })
          break
      }
    }

    socket.addEventListener('message', handleMessage)
    return () => socket.removeEventListener('message', handleMessage)
  }, [socket])

  const startTranscription = () => {
    if (!socket || selectedVideos.length === 0) return

    socket.send(JSON.stringify({
      type: 'TRANSCRIPTION_REQUEST',
      videoIds: selectedVideos,
      courseId
    }))

    setSelectedVideos([]) // Clear selection
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Video Transcription</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Video Selection */}
      <div className="grid gap-2 max-h-60 overflow-y-auto">
        {videos.map(video => (
          <div key={video.id} className="flex items-center gap-3 p-2 border rounded">
            <input
              type="checkbox"
              checked={selectedVideos.includes(video.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedVideos(prev => [...prev, video.id])
                } else {
                  setSelectedVideos(prev => prev.filter(id => id !== video.id))
                }
              }}
            />
            <div className="flex-1">
              <div className="font-medium">{video.title}</div>
              <div className="text-sm text-gray-500">{video.duration}</div>
            </div>
            {video.hasTranscript && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Transcribed
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={startTranscription}
          disabled={!isConnected || selectedVideos.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300"
        >
          Transcribe Selected ({selectedVideos.length})
        </button>

        <button
          onClick={() => setSelectedVideos(videos.map(v => v.id))}
          className="px-4 py-2 border border-gray-300 rounded"
        >
          Select All
        </button>
      </div>

      {/* Job Progress */}
      {jobs.size > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Transcription Jobs</h4>
          {Array.from(jobs.values()).map(job => (
            <div key={job.id} className="p-3 border rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Job {job.id}</span>
                <span className={`text-sm px-2 py-1 rounded ${
                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                  job.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {job.status}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {job.progress}% complete
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Database Schema Updates

### New Tables
```sql
-- Video transcripts table
CREATE TABLE video_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  transcript_text text NOT NULL,
  transcript_segments jsonb, -- Whisper timing/word data
  language varchar(10) DEFAULT 'en',
  confidence_score decimal(3,2),
  processing_duration_ms integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transcription jobs tracking
CREATE TABLE transcription_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  video_ids jsonb NOT NULL, -- Array of video IDs
  status varchar(20) DEFAULT 'queued', -- queued, processing, completed, failed
  progress_percent integer DEFAULT 0,
  error_message text,
  worker_id varchar(50),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add transcription flag to videos
ALTER TABLE videos ADD COLUMN has_transcript boolean DEFAULT false;
ALTER TABLE videos ADD COLUMN transcription_requested_at timestamptz;
```

---

## Deployment Commands

### Development
```bash
# Install PM2 globally
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs unpuzzle-websocket --lines 50
```

### Production
```bash
# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup

# Set auto-restart on system reboot
pm2 save
```

---

## Benefits of This Architecture

### ✅ Process Management
- **Automatic restarts** on crashes
- **Memory monitoring** and restart on leaks
- **Log management** and rotation
- **Zero-downtime deployments**

### ✅ Scalability
- **Parallel transcription workers**
- **Job queue prevents overload**
- **Horizontal scaling** (add more workers)
- **Load balancing** across workers

### ✅ Real-time Experience
- **Live progress updates** via WebSocket
- **Immediate job confirmation**
- **Status monitoring** in course edit UI
- **Error notifications** in real-time

### ✅ Reliability
- **Job persistence** (survive server restarts)
- **Retry mechanisms** for failed jobs
- **Graceful error handling**
- **Resource management** (temp file cleanup)

---

This architecture extends your existing WebSocket infrastructure with minimal changes while adding powerful transcription capabilities managed by PM2.
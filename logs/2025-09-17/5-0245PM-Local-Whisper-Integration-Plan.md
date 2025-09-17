# Local Whisper.cpp Integration Plan

## Date: 2025-09-17

## Overview
Integrate whisper.cpp for automatic video transcription in local development environment using existing PM2 setup.

## Architecture
- **Next.js**: Port 3001 (existing)
- **WebSocket**: Separate PM2 process (existing)
- **Whisper Worker**: New PM2 process for transcription
- **Database**: Supabase (existing)

## Setup Steps

### 1. Install whisper.cpp
```bash
# In project root or separate folder
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp
make
wget https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
```

### 2. Database Schema
```sql
-- Add to existing videos table
ALTER TABLE videos ADD COLUMN transcript text;
ALTER TABLE videos ADD COLUMN transcript_status text DEFAULT 'pending';

-- Create transcription queue
CREATE TABLE transcription_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id),
  status text DEFAULT 'pending',
  file_path text,
  created_at timestamptz DEFAULT now()
);
```

### 3. Whisper Worker Process
```javascript
// whisper-worker.js
const { createClient } = require('@supabase/supabase-js')
const { exec } = require('child_process')

async function processQueue() {
  // 1. Check for pending jobs in transcription_queue
  // 2. Download video from Backblaze
  // 3. Extract audio with ffmpeg
  // 4. Run whisper.cpp binary
  // 5. Update videos table with transcript
  // 6. Clean up temp files
}

setInterval(processQueue, 10000) // Check every 10 seconds
```

### 4. PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'nextjs',
      script: 'npm',
      args: 'run dev'
    },
    {
      name: 'websocket',
      script: 'npm',
      args: 'run websocket'
    },
    {
      name: 'whisper-worker',
      script: 'whisper-worker.js',
      instances: 1,
      max_memory_restart: '500M'
    }
  ]
}
```

### 5. Integration with Video Upload
```javascript
// In video upload API route
export async function POST(request) {
  // Existing video upload logic...

  // Queue transcription job
  await supabase.from('transcription_queue').insert({
    video_id: videoId,
    status: 'pending',
    file_path: videoUrl
  })

  return response
}
```

## Workflow
1. **Upload video** → Stored in Backblaze + queued for transcription
2. **Whisper worker** → Processes queue automatically
3. **Transcript ready** → Available for AI agents
4. **Student experience** → AI agents have real video context

## Resource Usage
- **CPU**: High during transcription (2-5 minutes per video)
- **Memory**: ~500MB during processing
- **Storage**: Minimal (temp files cleaned up)

## Benefits
- ✅ Automatic transcription after video upload
- ✅ No API costs (vs OpenAI Whisper)
- ✅ Local processing during development
- ✅ Easy migration to production server later
- ✅ Enhanced AI agent context with real video content

## Commands
```bash
# Start all services
pm2 start ecosystem.config.js

# Monitor processes
pm2 monit

# View logs
pm2 logs whisper-worker
```

## Migration to Production
When deploying to VPS:
1. Install whisper.cpp on server
2. Copy whisper-worker.js
3. Update PM2 config
4. Same queue-based processing continues seamlessly
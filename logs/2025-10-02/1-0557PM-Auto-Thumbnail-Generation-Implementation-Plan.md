# Auto Thumbnail Generation Implementation Plan

**Created**: 2025-10-02 at 05:57 PM EST
**Purpose**: Detailed implementation plan for automatic video thumbnail extraction system
**Architecture**: Background worker with WebSocket updates following established patterns
**Estimated Completion**: 2-3 hours with testing

---

## 🎯 System Overview

### Goal
Automatically extract thumbnail images from uploaded videos using FFmpeg, upload to Backblaze B2, and display in UI with real-time WebSocket updates — no page refresh required.

### Architecture Pattern
```
Video Upload → Queue Thumbnail Job → Worker Polls → FFmpeg Extract → B2 Upload
     ↓                ↓                    ↓              ↓           ↓
WebSocket ← Broadcast Update ← Update DB ← Store URL ← Generate Private URL
     ↓
Frontend Observer → Cache Invalidation → Thumbnail Appears
```

### Key Design Decisions

**Parallel Execution Strategy**
Duration and thumbnail jobs execute in parallel (not sequential) for faster completion. Both jobs queue simultaneously after upload. Independent failures don't block each other.

**Frame Extraction Strategy**
Extract frame at `min(3 seconds, 10% of duration, duration - 0.5s)` to avoid black frames and loading screens. Falls back to 0.5s for very short videos.

**Storage Pattern**
Thumbnails stored in same B2 bucket as videos with `private:` URL format. Frontend accesses via CDN with HMAC tokens (same pattern as videos).

**Real-time Updates**
WebSocket broadcasts `media-thumbnail-updated` event with userId for routing. Frontend invalidates TanStack cache automatically. No manual refresh needed.

---

## 📚 Pattern References

This implementation follows established architectural patterns:

| Phase | Pattern Reference | Why It's Relevant |
|-------|------------------|-------------------|
| **All Phases** | Pattern 10 - Complete Upload System File Map | Architecture blueprint for upload infrastructure |
| **Phase 1-3** | Pattern 23 - CDN HMAC Authentication | Secure video access for FFmpeg processing |
| **Phase 2** | Pattern 02 - Video Upload Delete Pattern | Server-side security and storage ownership |
| **Phase 4-5** | Pattern 01 - Optimistic Updates Pattern | Real-time UI updates with TanStack Query |
| **Phase 5** | Pattern 10 - WebSocket Architecture | Event routing and observer pattern integration |

---

## 🏗️ Phase 1: Thumbnail Worker Core

**Objective**: Create worker that polls for jobs and extracts video frames using FFmpeg

**Files to Create**:
- `workers/thumbnail/thumbnail-worker.js` ✨

**Pattern Compliance**:
- Follows Pattern 10 (Upload System) worker architecture
- Extends BaseWorker class (existing pattern)
- Implements same polling mechanism as duration worker

**Implementation Details**:

```javascript
// Class structure following BaseWorker pattern
class ThumbnailWorker extends BaseWorker {
  constructor(workerId) {
    super('thumbnail', workerId)

    // FFmpeg configuration
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'

    // CDN configuration (Pattern 23)
    this.cdnBaseUrl = 'https://cdn.unpuzzle.co'
    this.hmacSecret = process.env.HMAC_SECRET

    if (!this.hmacSecret) {
      throw new Error('HMAC_SECRET environment variable required')
    }
  }

  async executeJob(job) {
    // 1. Fetch video from database
    // 2. Generate HMAC token for CDN access (Pattern 23)
    // 3. Extract frame using FFmpeg
    // 4. Upload to B2
    // 5. Update database
    // 6. Broadcast WebSocket event
  }
}
```

**HMAC Token Generation** (Pattern 23 - Critical for security):
```javascript
// Copy exact implementation from duration-worker.js
extractFilePathFromPrivateUrl(privateUrl)
generateHMACToken(filePath)
generateCDNUrlWithToken(privateUrl)
```

**FFmpeg Frame Extraction**:
```javascript
async extractThumbnail(videoUrl, duration) {
  // Calculate extraction time
  const extractTime = Math.min(3, duration * 0.1, duration - 0.5)

  // FFmpeg command for high-quality thumbnail
  const args = [
    '-ss', extractTime.toString(),
    '-i', videoUrl,
    '-vframes', '1',
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease',
    '-q:v', '2',
    outputPath
  ]

  // Execute with spawn, handle errors
}
```

**Testing Checklist**:
- [ ] Worker starts and polls successfully
- [ ] HMAC tokens generated correctly (Pattern 23)
- [ ] FFmpeg extracts frame from test video
- [ ] Handles videos with spaces in filename
- [ ] Error handling for missing/corrupt videos

---

## 🗄️ Phase 2: Backblaze Integration

**Objective**: Upload extracted thumbnails to B2 and generate private URLs

**Files to Modify**:
- `workers/thumbnail/thumbnail-worker.js` (add B2 upload)

**Pattern Compliance**:
- Pattern 02 (Video Upload Delete) - Server-side storage ownership
- Pattern 10 (Upload System) - BackblazeService integration pattern

**Implementation Strategy**:

Following Pattern 02 principle: **Storage complexity remains server-side**. Worker owns B2 credentials and upload logic. Frontend never sees Backblaze details.

**B2 Upload Flow**:
```javascript
async uploadThumbnailToB2(thumbnailPath, videoId, originalFileName) {
  // 1. Generate unique filename: {videoId}_thumbnail.jpg
  // 2. Use BackblazeService pattern from video uploads
  // 3. Upload to same bucket as videos
  // 4. Return private URL format: private:fileId:filename
  // 5. Delete local temp file
}
```

**Error Handling**:
- Retry B2 upload once on failure
- Clean up temp files even if upload fails
- Log detailed errors for debugging
- Mark job as failed if both attempts fail

**Testing Checklist**:
- [ ] Thumbnail uploads to B2 successfully
- [ ] Private URL format matches video pattern
- [ ] Temp files cleaned up after upload
- [ ] Retry logic works on transient failures
- [ ] Handles network errors gracefully

---

## 💾 Phase 3: Database Updates

**Objective**: Store thumbnail URL in database and prepare for broadcast

**Files to Modify**:
- `workers/thumbnail/thumbnail-worker.js` (add DB update)

**Pattern Compliance**:
- Pattern 10 (Upload System) - Supabase client usage pattern
- Pattern 02 (Video Upload Delete) - Minimal client data exposure

**Database Update Logic**:
```javascript
async updateThumbnailUrl(videoId, thumbnailUrl, userId) {
  const { error } = await this.supabase
    .from('media_files')
    .update({
      thumbnail_url: thumbnailUrl,  // private:fileId:filename format
      updated_at: new Date().toISOString()
    })
    .eq('id', videoId)

  if (error) {
    throw new Error(`Failed to update thumbnail: ${error.message}`)
  }

  console.log(`✅ Thumbnail URL updated for video ${videoId}`)
  return { videoId, thumbnailUrl, userId }
}
```

**Data to Fetch** (must include userId for WebSocket routing):
```javascript
const { data: mediaFile } = await this.supabase
  .from('media_files')
  .select('id, name, backblaze_url, cdn_url, duration_seconds, uploaded_by')
  .eq('id', job.videoId)
  .single()
```

**Testing Checklist**:
- [ ] Database updates successfully
- [ ] thumbnail_url field populated correctly
- [ ] userId captured for WebSocket routing
- [ ] Handles missing videoId gracefully
- [ ] No SQL injection vulnerabilities

---

## 📡 Phase 4: Job Queue Integration

**Objective**: Create thumbnail jobs when videos upload and route to workers

**Files to Modify**:
- `websocket-server.js` (add thumbnail job handler)
- `src/app/actions/media-actions.ts` (create thumbnail job)

**Pattern Compliance**:
- Pattern 10 (Upload System) - Job queue architecture
- Pattern 10 (Upload System) - Parallel job creation pattern

**WebSocket Server Changes** (`websocket-server.js`):
```javascript
// Add thumbnail job handler (lines 46-62 pattern)
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

  jobQueue.push(job)
  console.log(`🖼️ Thumbnail job created: ${jobId} for video ${message.data.videoId}`)
}
```

**Media Actions Changes** (`src/app/actions/media-actions.ts`):
```javascript
// After duration job creation (line 204), add parallel thumbnail job
if (getFileType(file.type) === 'video') {
  try {
    // Duration job (existing)
    await broadcastWebSocketMessage({
      type: 'create-duration-job',
      operationId: `duration_${savedFile.id}_${Date.now()}`,
      data: { jobType: 'duration', videoId: savedFile.id, userId: user.id }
    })

    // Thumbnail job (NEW - runs in parallel)
    await broadcastWebSocketMessage({
      type: 'create-thumbnail-job',
      operationId: `thumbnail_${savedFile.id}_${Date.now()}`,
      data: { jobType: 'thumbnail', videoId: savedFile.id, userId: user.id }
    })

    console.log('✅ Duration and thumbnail jobs created for:', savedFile.id)
  } catch (jobError) {
    console.warn('⚠️ Failed to create processing jobs:', jobError)
  }
}
```

**Worker Routing** (existing `getNextJobForWorkerType` function):
```javascript
// Already handles routing by jobType
// Thumbnail workers request jobType='thumbnail'
// Duration workers request jobType='duration'
```

**Testing Checklist**:
- [ ] Thumbnail jobs created on video upload
- [ ] Jobs queued correctly in WebSocket server
- [ ] Worker polls and receives thumbnail jobs
- [ ] Parallel execution with duration jobs
- [ ] Job queue doesn't block other operations

---

## 🎨 Phase 5: Frontend Real-time Updates

**Objective**: Display thumbnails automatically when worker completes processing

**Files to Modify**:
- `src/lib/course-event-observer.ts` (add event constant)
- `src/hooks/use-websocket-connection.ts` (map WebSocket message)
- `src/hooks/use-media-queries.ts` (handle event, invalidate cache)

**Pattern Compliance**:
- Pattern 01 (Optimistic Updates) - TanStack Query cache invalidation
- Pattern 10 (Upload System) - Observer pattern for WebSocket events
- Pattern 10 (Upload System) - Event routing by userId

**Event Constants** (`course-event-observer.ts`):
```javascript
export const MEDIA_EVENTS = {
  MEDIA_UPLOAD_PROGRESS: 'media-upload-progress',
  MEDIA_UPLOAD_COMPLETE: 'media-upload-complete',
  MEDIA_BULK_DELETE_PROGRESS: 'media-bulk-delete-progress',
  MEDIA_BULK_DELETE_COMPLETE: 'media-bulk-delete-complete',
  MEDIA_LINKED: 'media-linked',
  MEDIA_DURATION_UPDATED: 'media-duration-updated',
  MEDIA_THUMBNAIL_UPDATED: 'media-thumbnail-updated'  // NEW
} as const
```

**WebSocket Message Mapping** (`use-websocket-connection.ts`):
```javascript
const eventTypeMapping: Record<string, string> = {
  // ... existing mappings
  'media-duration-updated': MEDIA_EVENTS.MEDIA_DURATION_UPDATED,
  'media-thumbnail-updated': MEDIA_EVENTS.MEDIA_THUMBNAIL_UPDATED  // NEW
}
```

**Cache Invalidation** (`use-media-queries.ts`):
```javascript
// In useUploadMediaFile hook
const handleThumbnailUpdate = (event: any) => {
  console.log('[MEDIA THUMBNAIL UPDATE] Received event:', event)

  // Invalidate cache to refresh media files with updated thumbnail
  queryClient.invalidateQueries({ queryKey: ['media-files'] })
}

// Subscribe to events
const unsubscribeProgress = courseEventObserver.subscribe(
  MEDIA_EVENTS.MEDIA_UPLOAD_PROGRESS,
  handleProgress
)
const unsubscribeComplete = courseEventObserver.subscribe(
  MEDIA_EVENTS.MEDIA_UPLOAD_COMPLETE,
  handleComplete
)
const unsubscribeDuration = courseEventObserver.subscribe(
  MEDIA_EVENTS.MEDIA_DURATION_UPDATED,
  handleDurationUpdate
)
const unsubscribeThumbnail = courseEventObserver.subscribe(  // NEW
  MEDIA_EVENTS.MEDIA_THUMBNAIL_UPDATED,
  handleThumbnailUpdate
)

return () => {
  unsubscribeProgress()
  unsubscribeComplete()
  unsubscribeDuration()
  unsubscribeThumbnail()  // NEW
}
```

**Worker Broadcast** (`thumbnail-worker.js`):
```javascript
async broadcastThumbnailUpdate(videoId, thumbnailUrl, userId) {
  try {
    const response = await fetch(`${this.websocketServerUrl}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'media-thumbnail-updated',
        data: {
          userId,  // CRITICAL for WebSocket routing (Pattern 10)
          videoId,
          thumbnailUrl,
          timestamp: Date.now()
        }
      })
    })

    if (response.ok) {
      console.log(`📡 Thumbnail update broadcasted for ${videoId} (userId: ${userId})`)
    }
  } catch (error) {
    console.warn(`⚠️ Broadcast error:`, error.message)
  }
}
```

**Testing Checklist**:
- [ ] WebSocket event routes correctly
- [ ] Frontend receives thumbnail update
- [ ] Cache invalidates automatically
- [ ] Thumbnail appears without refresh
- [ ] Console logs show event flow
- [ ] Multiple uploads work in parallel

---

## ⚙️ Phase 6: PM2 Configuration & Production

**Objective**: Deploy thumbnail worker with PM2 for production reliability

**Files to Modify**:
- `ecosystem.config.js` (add worker configuration)

**Pattern Compliance**:
- Pattern 10 (Upload System) - Worker process management
- Follows existing duration worker configuration pattern

**PM2 Worker Configuration**:
```javascript
{
  name: 'unpuzzle-thumbnail-worker',
  script: 'workers/thumbnail/thumbnail-worker.js',
  instances: 1,  // Scale to 2-3 for high volume
  exec_mode: 'fork',
  autorestart: true,
  watch: false,
  max_memory_restart: '500M',
  env: {
    NODE_ENV: 'production',
    WORKER_ID: 'thumbnail-1',
    WORKER_TYPE: 'thumbnail',
    WEBSOCKET_SERVER_URL: 'http://localhost:8080',

    // FFmpeg configuration
    FFMPEG_PATH: '/opt/homebrew/bin/ffmpeg',

    // CDN HMAC authentication (Pattern 23)
    HMAC_SECRET: process.env.CDN_AUTH_SECRET || process.env.AUTH_SECRET,

    // Backblaze B2 credentials
    BACKBLAZE_APPLICATION_KEY_ID: process.env.BACKBLAZE_APPLICATION_KEY_ID,
    BACKBLAZE_APPLICATION_KEY: process.env.BACKBLAZE_APPLICATION_KEY,
    BACKBLAZE_BUCKET_ID: process.env.BACKBLAZE_BUCKET_ID,

    // Supabase database
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  error_file: './logs/thumbnail-worker-error.log',
  out_file: './logs/thumbnail-worker-out.log',
  log_file: './logs/thumbnail-worker-combined.log',
  time: true
}
```

**Startup Commands**:
```bash
# Start thumbnail worker
pm2 start ecosystem.config.js --only unpuzzle-thumbnail-worker

# Monitor logs
pm2 logs unpuzzle-thumbnail-worker

# Check status
pm2 status

# Restart after code changes
pm2 restart unpuzzle-thumbnail-worker
```

**Monitoring & Logs**:
- Worker logs to `logs/thumbnail-worker-combined.log`
- Monitor for HMAC authentication success/failure
- Track FFmpeg processing times
- Monitor B2 upload success rates
- Watch for memory leaks (max 500MB restart)

**Testing Checklist**:
- [ ] Worker starts via PM2
- [ ] Environment variables loaded correctly
- [ ] Worker polls and processes jobs
- [ ] Logs are readable and informative
- [ ] Auto-restart works on crash
- [ ] Multiple workers can run concurrently

---

## 🧪 End-to-End Testing Plan

### Test Scenario 1: Single Video Upload
1. Upload test video to /media
2. Verify both jobs created (duration + thumbnail)
3. Watch worker logs for processing
4. Confirm FFmpeg extracts frame
5. Verify B2 upload succeeds
6. Check database thumbnail_url populated
7. Confirm WebSocket broadcast with userId
8. Verify frontend receives event
9. Check thumbnail appears without refresh

**Expected Timeline**: 5-8 seconds total processing

### Test Scenario 2: Multiple Parallel Uploads
1. Upload 3 videos simultaneously
2. Verify 6 jobs created (3 duration + 3 thumbnail)
3. Watch workers process in parallel
4. Confirm all thumbnails appear
5. Verify no race conditions

**Expected Timeline**: 10-15 seconds for all videos

### Test Scenario 3: Error Handling
1. Upload corrupt video file
2. Verify worker fails gracefully
3. Confirm job marked as failed
4. Check no crash or memory leak
5. Verify next job processes normally

### Test Scenario 4: Edge Cases
- Very short video (<1 second)
- Video with spaces in filename
- Very large video (>500MB)
- Video in unusual format
- Missing HMAC secret (should fail startup)

---

## 📊 Success Metrics

**Performance Targets**:
- Thumbnail generation: <5 seconds for typical video
- B2 upload: <2 seconds for thumbnail file
- WebSocket latency: <100ms to frontend
- Total UX delay: <8 seconds from upload to thumbnail display

**Reliability Targets**:
- Worker uptime: >99.5%
- Job success rate: >98%
- HMAC authentication: 100% success
- Zero memory leaks over 24 hours

**User Experience Indicators**:
- Thumbnails appear without refresh
- Clear placeholder while processing
- Graceful fallback for failures
- Professional loading states

---

## 🚨 Critical Reminders

### Security (Pattern 02, Pattern 23)
- ✅ HMAC secret never exposed to frontend
- ✅ Private URLs require token for access
- ✅ Worker owns all B2 credentials
- ✅ Database only stores private URL format

### Architecture Compliance (Pattern 10)
- ✅ TanStack Query manages server data
- ✅ Observer pattern prevents infinite loops
- ✅ WebSocket routes by userId
- ✅ Components don't own worker logic

### Real-time Updates (Pattern 01)
- ✅ Cache invalidation triggers UI refresh
- ✅ No manual page refresh required
- ✅ Events carry minimal payload
- ✅ Frontend receives updates automatically

### Parallel Execution
- ✅ Duration and thumbnail jobs independent
- ✅ Both queue simultaneously
- ✅ Failures don't cascade
- ✅ Workers can scale independently

---

## 📋 Implementation Checklist

### Phase 1: Worker Core
- [ ] Create `workers/thumbnail/thumbnail-worker.js`
- [ ] Extend BaseWorker class
- [ ] Implement HMAC token generation (Pattern 23)
- [ ] Add FFmpeg frame extraction
- [ ] Test with single video

### Phase 2: Backblaze Integration
- [ ] Add B2 upload logic
- [ ] Generate thumbnail filenames
- [ ] Implement retry logic
- [ ] Test upload to B2

### Phase 3: Database Updates
- [ ] Add Supabase client
- [ ] Update thumbnail_url field
- [ ] Fetch userId for routing
- [ ] Test database updates

### Phase 4: Job Queue Integration
- [ ] Modify websocket-server.js
- [ ] Add thumbnail job creation to media-actions.ts
- [ ] Test job queuing
- [ ] Verify parallel execution

### Phase 5: Frontend Updates
- [ ] Add MEDIA_THUMBNAIL_UPDATED event
- [ ] Map WebSocket message
- [ ] Add cache invalidation listener
- [ ] Test real-time thumbnail display

### Phase 6: PM2 & Production
- [ ] Add worker to ecosystem.config.js
- [ ] Start with PM2
- [ ] Monitor logs
- [ ] Test with multiple uploads

### End-to-End Testing
- [ ] Test single upload
- [ ] Test parallel uploads
- [ ] Test error handling
- [ ] Test edge cases
- [ ] Verify performance metrics

---

## 🎯 Ready to Implement

This plan provides comprehensive guidance for implementing auto thumbnail generation following all established architectural patterns. Each phase references specific patterns and includes detailed testing criteria.

**Estimated Total Time**: 2-3 hours with testing
**Complexity**: Medium (follows existing duration worker pattern closely)
**Risk**: Low (parallel execution prevents blocking, graceful error handling)

The system will automatically extract thumbnails from uploaded videos, upload to B2, and display in the UI with zero manual intervention — providing a professional, YouTube-like experience.

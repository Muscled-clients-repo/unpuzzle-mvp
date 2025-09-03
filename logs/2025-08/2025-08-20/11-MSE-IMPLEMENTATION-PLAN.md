# MSE Implementation Plan: Clean Slate Approach

**Date**: August 20, 2025  
**Time**: 07:15 AM EST  
**Goal**: Implement Media Source Extensions for seamless video playback

## Phase 1: Cleanup Current Code (30 mins)

### What to Remove
1. **DualVideoPlaybackService.ts** - Entire file (failed approach)
2. **VideoEditorSingleton.ts** - Remove dual video integration (lines 459-497)
3. **VideoStudioNew.tsx** - Remove dual video container references

### What to Keep
1. **State Machine** (VideoEditorMachineV5.ts) - Works perfectly
2. **Timeline Service** - Clip management is solid
3. **Recording Service** - No changes needed
4. **Event Bus** - Communication layer works well
5. **UI Components** - All remain the same

### Cleanup Commands
```bash
# Create backup branch
git checkout -b backup/dual-video-attempt
git add .
git commit -m "backup: dual video attempt before MSE"

# Create clean branch
git checkout instructor-video-studio
git checkout -b feature/mse-playback

# Remove failed attempt files
rm src/lib/video-editor/services/DualVideoPlaybackService.ts
```

## Phase 2: MSE Architecture Design (1 hour)

### New Service Structure
```
VideoEditorSingleton.ts
    ↓
MSEPlaybackService.ts (NEW)
    ├── SegmentExtractor.ts (NEW) - Extract byte ranges
    ├── SourceBufferManager.ts (NEW) - Manage MSE buffers
    └── PlaybackController.ts (NEW) - Control playback
```

### Core Components

#### 1. MSEPlaybackService.ts
```typescript
class MSEPlaybackService {
  private mediaSource: MediaSource
  private sourceBuffer: SourceBuffer
  private videoElement: HTMLVideoElement
  private segmentQueue: Segment[]
  
  async initializeStream(clips: TimelineClip[]) {
    // 1. Create MediaSource
    // 2. Attach to video element
    // 3. Create SourceBuffer
    // 4. Process clips into segments
  }
  
  async playSequence(clips: TimelineClip[]) {
    // Build continuous stream from clips
  }
}
```

#### 2. SegmentExtractor.ts
```typescript
class SegmentExtractor {
  async extractSegment(
    videoUrl: string, 
    startTime: number, 
    endTime: number
  ): Promise<ArrayBuffer> {
    // Extract specific time range as bytes
    // Using fetch with Range headers
  }
  
  async getVideoCodec(videoUrl: string): Promise<string> {
    // Detect codec for MSE compatibility
  }
}
```

#### 3. SourceBufferManager.ts
```typescript
class SourceBufferManager {
  private sourceBuffer: SourceBuffer
  private pendingSegments: ArrayBuffer[]
  
  async appendSegment(segment: ArrayBuffer) {
    // Handle buffering, queue management
  }
  
  async buildContinuousStream(segments: ArrayBuffer[]) {
    // Append all segments in order
  }
}
```

## Phase 3: Implementation Steps (4-6 hours)

### Step 1: Basic MSE Setup (1 hour)
```typescript
// Create simple MSE test with single video
const mediaSource = new MediaSource()
video.src = URL.createObjectURL(mediaSource)

mediaSource.addEventListener('sourceopen', async () => {
  const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E"')
  
  // Test with full video first
  const response = await fetch(videoUrl)
  const arrayBuffer = await response.arrayBuffer()
  sourceBuffer.appendBuffer(arrayBuffer)
})
```

### Step 2: Segment Extraction (2 hours)

**Challenge**: Browsers can't directly extract time ranges from video files.

**Solutions**:
1. **Option A**: Use MP4Box.js library
```typescript
import MP4Box from 'mp4box'

async function extractSegment(file, startTime, endTime) {
  const mp4boxfile = MP4Box.createFile()
  
  // Extract specific time range
  const segment = await mp4boxfile.extractSegment(startTime, endTime)
  return segment
}
```

2. **Option B**: Server-side extraction
```typescript
// Request server to extract segment
const response = await fetch(`/api/extract-segment`, {
  method: 'POST',
  body: JSON.stringify({ videoUrl, startTime, endTime })
})
const segment = await response.arrayBuffer()
```

3. **Option C**: Use ffmpeg.wasm (client-side)
```typescript
import { FFmpeg } from '@ffmpeg/ffmpeg'

const ffmpeg = new FFmpeg()
await ffmpeg.load()

// Extract segment
await ffmpeg.exec([
  '-i', videoUrl,
  '-ss', startTime,
  '-to', endTime,
  '-c', 'copy',
  'segment.mp4'
])
```

### Step 3: Continuous Stream Building (1 hour)
```typescript
class MSEPlaybackService {
  async buildStream(clips: TimelineClip[]) {
    const segments = []
    
    for (const clip of clips) {
      const segment = await this.extractSegment(
        clip.sourceUrl,
        clip.inPoint,
        clip.outPoint
      )
      segments.push(segment)
    }
    
    // Append all segments to create continuous stream
    for (const segment of segments) {
      await this.appendToBuffer(segment)
    }
  }
}
```

### Step 4: Integration with State Machine (1 hour)
```typescript
// In VideoEditorSingleton.ts
if (snapshot.matches('playing') && playback.clipSequence) {
  // Use MSE service instead of dual video
  mseService.playSequence(playback.clipSequence)
    .then(() => stateMachine.send({ type: 'SEQUENCE.COMPLETED' }))
}
```

### Step 5: Testing & Debugging (1 hour)
- Test with single clip
- Test with multiple clips from same source
- Test with multiple clips from different sources
- Test error handling

## Phase 4: Challenges & Solutions

### Challenge 1: Segment Extraction
**Problem**: Can't extract byte ranges directly in browser
**Solution**: Use MP4Box.js or ffmpeg.wasm

### Challenge 2: Codec Compatibility
**Problem**: Different videos may have different codecs
**Solution**: 
```typescript
// Detect and handle multiple codecs
const codecs = await this.detectCodecs(clips)
if (codecs.length > 1) {
  // Need to transcode to common codec
  await this.transcodeToCommon(clips)
}
```

### Challenge 3: Memory Management
**Problem**: Large videos consume memory
**Solution**: Stream processing, cleanup after append

### Challenge 4: Seek Support
**Problem**: MSE seeking is complex
**Solution**: Maintain segment map for seeking

## Phase 5: Fallback Strategy

If MSE proves too complex, implement **Overlap Approach** as fallback:

```typescript
class OverlapPlaybackService {
  async transitionWithOverlap(currentClip, nextClip) {
    // Start next 200ms before current ends
    const overlapStart = currentClip.outPoint - 0.2
    
    // Monitor current video
    if (currentTime >= overlapStart) {
      // Start next video (hidden)
      nextVideo.currentTime = nextClip.inPoint
      await nextVideo.play()
      
      // At exact boundary, swap
      if (currentTime >= currentClip.outPoint) {
        this.instantSwap()
      }
    }
  }
}
```

## Decision Points

### 1. Segment Extraction Method
- [ ] MP4Box.js (pure JS, complex)
- [ ] ffmpeg.wasm (powerful, 30MB size)
- [ ] Server-side API (requires backend)
- [ ] Simplified approach (accept limitations)

### 2. Codec Handling
- [ ] Support single codec only
- [ ] Transcode on-the-fly
- [ ] Pre-process videos

### 3. Performance Strategy
- [ ] Load all segments upfront
- [ ] Stream segments on-demand
- [ ] Hybrid approach

## Success Criteria

1. ✅ Zero-gap playback between clips
2. ✅ Support trimmed segments
3. ✅ Work with multiple video sources
4. ✅ Maintain scrubber sync
5. ✅ Smooth performance

## Timeline Estimate

- **Phase 1 (Cleanup)**: 30 minutes
- **Phase 2 (Design)**: 1 hour  
- **Phase 3 (Implementation)**: 4-6 hours
- **Phase 4 (Testing)**: 2 hours
- **Total**: 8-10 hours

## Recommendations

### Start Simple
1. First, get MSE working with a single full video
2. Then add multiple full videos
3. Then add segment extraction
4. Finally add trimming support

### Libraries to Consider
- **MP4Box.js** - For MP4 manipulation
- **mux.js** - For transmuxing
- **ffmpeg.wasm** - For video processing

### Alternative: Use Existing Solution
- **video.js** with HTTP Live Streaming (HLS)
- **Plyr** with custom plugin
- **vidstack** - Modern video player

## Next Steps

1. **Approve cleanup** - Remove dual video code
2. **Choose extraction method** - MP4Box vs ffmpeg.wasm vs server
3. **Start with POC** - Basic MSE with single video
4. **Iterate** - Add features incrementally

---

**The MSE approach is complex but will give us professional-quality playback. Should we proceed with cleanup and start the MSE implementation, or would you prefer to try the simpler overlap approach first?**
# Frame-Based vs Time-Based Analysis for Video Editor

## 🎯 CRITICAL FINDING: We're Mixing Frames and Time Everywhere!

### WHERE WE ABSOLUTELY NEED FRAMES (NOT TIME)

#### 1. **VideoEditorSingleton.ts - ALL CALCULATIONS**
```typescript
// LINE 89 - WRONG: Time-based comparison
if (currentClip && currentTime >= currentClip.outPoint - 0.033)

// SHOULD BE:
const currentFrame = frameService.timeToFrame(currentTime)
const outPointFrame = frameService.timeToFrame(currentClip.outPoint)
if (currentFrame >= outPointFrame - 1) // 1 frame buffer
```

```typescript
// LINES 323-327 & 384-388 - WRONG: Time-based seek
const videoSeekTime = clip.inPoint + localSeekTime

// SHOULD BE:
const inPointFrame = frameService.timeToFrame(clip.inPoint)
const localSeekFrame = frameService.timeToFrame(localSeekTime)
const videoSeekFrame = inPointFrame + localSeekFrame
const videoSeekTime = frameService.frameToTime(videoSeekFrame)
```

```typescript
// LINE 249 - Partially correct but could be cleaner
const globalFrame = frameService.timeToFrame(playback.globalTimelinePosition)

// Better: Store as frame in state, no conversion needed
const isRestartingFromBeginning = playback.globalFrame === 0
```

#### 2. **VideoEditorMachineV5.ts - STATE & CALCULATIONS**

```typescript
// LINES 457-458 - WRONG: Time-based calculation
const localClipTime = videoTime - currentClip.inPoint
const globalPosition = currentClip.startTime + localClipTime

// SHOULD BE:
const videoFrame = frameService.timeToFrame(videoTime)
const inPointFrame = frameService.timeToFrame(currentClip.inPoint)
const localClipFrame = videoFrame - inPointFrame
const startFrame = frameService.timeToFrame(currentClip.startTime)
const globalFrame = startFrame + localClipFrame
// Only convert back for display
const globalPosition = frameService.frameToTime(globalFrame)
```

```typescript
// LINES 708-709, 713 - WRONG: Time-based duration
const lastClipTrimmedDuration = lastClip.outPoint - lastClip.inPoint
const clipTrimmedDuration = clip.outPoint - clip.inPoint

// SHOULD BE:
const lastClipFrames = frameService.timeToFrame(lastClip.outPoint) - frameService.timeToFrame(lastClip.inPoint)
const clipFrames = frameService.timeToFrame(clip.outPoint) - frameService.timeToFrame(clip.inPoint)
```

```typescript
// LINES 812-814 - WRONG: Time-based boundary check
const targetClip = context.timeline.clips.find(clip => 
  position >= clip.startTime && position < clip.startTime + clip.duration
)

// SHOULD BE:
const positionFrame = frameService.timeToFrame(position)
const targetClip = context.timeline.clips.find(clip => {
  const startFrame = frameService.timeToFrame(clip.startTime)
  const endFrame = startFrame + frameService.timeToFrame(clip.outPoint - clip.inPoint)
  return positionFrame >= startFrame && positionFrame < endFrame
})
```

#### 3. **PlaybackService.ts - SEEK OPERATIONS**

```typescript
// LINES 121-126 - Good! Already using frames
const snappedTime = this.frameService.snapToFrame(time)
const targetFrame = this.frameService.timeToFrame(snappedTime)
// BUT should pass frame to video element for precision
```

#### 4. **TimelineService.ts - POSITION CALCULATIONS**

```typescript
// LINES 138-148 - WRONG: Time-based positioning
const lastClip = trackClips.reduce((latest, clip) => 
  (clip.startTime > latest.startTime) ? clip : latest
)
return lastClip.startTime + lastClip.duration

// SHOULD BE:
const lastClipStartFrame = frameService.timeToFrame(lastClip.startTime)
const lastClipDurationFrames = frameService.timeToFrame(lastClip.outPoint) - frameService.timeToFrame(lastClip.inPoint)
const nextPositionFrame = lastClipStartFrame + lastClipDurationFrames
return frameService.frameToTime(nextPositionFrame)
```

### WHERE WE ACTUALLY NEED TIME (NOT FRAMES)

#### 1. **HTML Video Element Interface**
```typescript
// ONLY these need time in seconds:
videoElement.currentTime = time  // Must be seconds
videoElement.duration            // Returns seconds
videoElement.src                 // URL, not time
```

#### 2. **UI Display**
```typescript
// For user-readable display only:
formatTime(seconds) // "00:05:23"
// But internally should store as frames
```

#### 3. **Recording Duration from MediaRecorder**
```typescript
// MediaRecorder gives us time in milliseconds
const durationMs = Date.now() - startTime
// Convert immediately to frames:
const durationFrames = frameService.timeToFrame(durationMs / 1000)
```

### PROPOSED STATE STRUCTURE (ALL FRAMES)

```typescript
interface PlaybackState {
  currentFrame: number           // NOT currentTime
  globalFrame: number            // NOT globalTimelinePosition
  activeClipStartFrame: number   // NOT activeClipStartTime
  localClipFrame: number         // NOT localClipTime
}

interface TimelineClip {
  id: string
  startFrame: number      // NOT startTime
  inPointFrame: number    // NOT inPoint
  outPointFrame: number   // NOT outPoint
  durationFrames: number  // Cached: outPointFrame - inPointFrame
  sourceUrl: string       // Keep as is
}

interface ScrubberState {
  positionFrame: number   // NOT position
  isDragging: boolean
}
```

### CONVERSION POINTS (Frame ↔ Time)

```typescript
// INPUT: Convert time to frames immediately
videoElement.addEventListener('timeupdate', (e) => {
  const frame = frameService.timeToFrame(videoElement.currentTime)
  stateMachine.send({ type: 'VIDEO.FRAME_UPDATE', frame })
})

// OUTPUT: Convert frames to time only at boundaries
function seekVideo(targetFrame: number) {
  const time = frameService.frameToTime(targetFrame)
  videoElement.currentTime = time
}

function displayToUser(frame: number) {
  const time = frameService.frameToTime(frame)
  return formatTimecode(time)
}
```

### BENEFITS OF FRAME-BASED

1. **No floating-point errors**
   - `5.4999999` vs `5.5000001` problem GONE
   - Frame 165 is always frame 165

2. **Precise calculations**
   - Adding durations: `frame1 + frame2` (integer math)
   - Comparing positions: `if (frame1 === frame2)` (exact)

3. **Professional standard**
   - All pro video editors work in frames internally
   - Frame-accurate editing guaranteed

4. **Simpler boundary detection**
   ```typescript
   // Current (error-prone)
   if (Math.abs(time1 - time2) < 0.001) // Is this close enough?
   
   // Frame-based (exact)
   if (frame1 === frame2) // Perfect!
   ```

### CRITICAL BUGS FROM TIME-BASED APPROACH

1. **Scrubber jumping**: Float precision causes position mismatch
2. **Clip boundary misses**: `4.999999 < 5.0` fails
3. **Seek inaccuracy**: Seeking to `5.5` might land at `5.4999`
4. **Duration calculations**: Adding floats accumulates errors

### IMPLEMENTATION PRIORITY

1. **CRITICAL - Fix immediately:**
   - Seek calculations (causing current bugs)
   - Boundary detection (missing clip ends)
   - Duration calculations (position errors)

2. **HIGH - Fix soon:**
   - State machine state storage
   - Clip positioning logic
   - Scrubber position tracking

3. **MEDIUM - Refactor when possible:**
   - UI components to use frames
   - Timeline service calculations
   - Event payloads

### SUMMARY

**Use FRAMES for:**
- ALL calculations
- ALL state storage
- ALL comparisons
- ALL business logic

**Use TIME only for:**
- videoElement.currentTime (setting/getting)
- UI display to user
- Recording duration from MediaRecorder

**Conversion rule:**
- Convert to frames IMMEDIATELY on input
- Store and calculate in frames
- Convert to time ONLY at output boundaries
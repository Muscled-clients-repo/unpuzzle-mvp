# Frame-Based Video Editor Architecture
**DETAILED ANALYSIS & IMPLEMENTATION GUIDE**

---

## 🎯 THE CORE PROBLEM: Mixing Frames and Time

### Current State: BROKEN
Our video editor is doing this everywhere:
```typescript
// WRONG: Direct time calculations
const position = clip.startTime + localTime  // Float precision errors!
const duration = clip.outPoint - clip.inPoint  // Accumulating errors!
const isAtEnd = currentTime >= clipEndTime  // Comparison fails: 4.999999 vs 5.0
```

### What We Need: FRAME-PERFECT
```typescript
// RIGHT: Frame calculations
const positionFrame = clipStartFrame + localFrame  // Integer math - perfect!
const durationFrames = clipOutFrame - clipInFrame  // No precision loss!
const isAtEnd = currentFrame >= clipEndFrame  // Exact comparison
```

---

## 🔬 DETAILED BOUNDARY ANALYSIS

### The Video Element Interface Constraint

**HTML5 Video Element - THE ONLY TIME-BASED INTERFACE:**
```typescript
interface HTMLVideoElement {
  currentTime: number    // MUST be seconds (browser API)
  duration: number       // MUST be seconds (browser API)
  play(): Promise<void>
  pause(): void
  addEventListener('timeupdate', handler)  // Gives seconds
  addEventListener('ended', handler)
}
```

**This is our "translation layer" - the boundary where we convert:**
```typescript
// INPUT: Video → Our System (Time to Frames)
videoElement.addEventListener('timeupdate', () => {
  const seconds = videoElement.currentTime  // Browser gives us seconds
  const frame = frameService.timeToFrame(seconds)  // Convert immediately!
  stateMachine.send({ type: 'FRAME_UPDATE', frame })  // Use frames internally
})

// OUTPUT: Our System → Video (Frames to Time)
function seekToFrame(targetFrame: number) {
  const seconds = frameService.frameToTime(targetFrame)  // Convert only here!
  videoElement.currentTime = seconds  // Browser requires seconds
}
```

---

## 📊 COMPREHENSIVE CODE ANALYSIS

### VideoEditorSingleton.ts - THE INTEGRATION LAYER

#### PROBLEM AREAS:

**1. Boundary Detection (Lines 82-93)**
```typescript
// CURRENT - WRONG:
if (currentClip && currentTime >= currentClip.outPoint - 0.033) {
  // Why 0.033? Magic number for "1 frame buffer"
  // What if framerate changes? Breaks!
}

// FIXED - FRAME-BASED:
const currentFrame = frameService.timeToFrame(currentTime)
const outPointFrame = frameService.timeToFrame(currentClip.outPoint)
if (currentFrame >= outPointFrame - 1) {  // Exact 1 frame buffer
  stateMachine.send({ type: 'VIDEO.ENDED' })
}
```

**2. Seek Calculations (Lines 323-327, 384-388)**
```typescript
// CURRENT - WRONG:
const localSeekTime = playback.pendingSeek.time
const videoSeekTime = clip.inPoint + localSeekTime  // Float addition errors!

// FIXED - FRAME-BASED:
const localSeekFrame = playback.pendingSeek.frame  // State stores frames
const inPointFrame = clip.inPointFrame             // Clip stores frames
const videoSeekFrame = inPointFrame + localSeekFrame  // Perfect integer math
const videoSeekTime = frameService.frameToTime(videoSeekFrame)  // Convert only for video
```

**3. Restart Detection (Line 249)**
```typescript
// CURRENT - PARTIALLY RIGHT:
const globalFrame = frameService.timeToFrame(playback.globalTimelinePosition)
// But why convert? Store as frame in state!

// BETTER:
const isRestartingFromBeginning = playback.globalFrame === 0  // Direct comparison
```

### VideoEditorMachineV5.ts - THE STATE MACHINE

#### PROBLEM AREAS:

**1. Time Update Processing (Lines 456-458)**
```typescript
// CURRENT - WRONG:
const localClipTime = videoTime - currentClip.inPoint  // Float subtraction
const globalPosition = currentClip.startTime + localClipTime  // Float addition

// FIXED - FRAME-BASED:
const videoFrame = frameService.timeToFrame(videoTime)  // From video element
const inPointFrame = currentClip.inPointFrame          // From clip state
const localClipFrame = videoFrame - inPointFrame       // Integer math
const globalFrame = currentClip.startFrame + localClipFrame  // Integer math
// Store frame in state, convert only for display
```

**2. Duration Calculations (Lines 708, 713)**
```typescript
// CURRENT - WRONG:
const clipTrimmedDuration = clip.outPoint - clip.inPoint  // Float subtraction

// FIXED - FRAME-BASED:
const clipFrames = clip.outPointFrame - clip.inPointFrame  // Integer subtraction
// OR even better: store pre-calculated
const clipFrames = clip.durationFrames  // Cached when clip created
```

**3. Clip Boundary Detection (Lines 812-814)**
```typescript
// CURRENT - WRONG:
const targetClip = clips.find(clip => 
  position >= clip.startTime && 
  position < clip.startTime + clip.duration  // Multiple float operations!
)

// FIXED - FRAME-BASED:
const positionFrame = frameService.timeToFrame(position)  // Convert once
const targetClip = clips.find(clip => 
  positionFrame >= clip.startFrame && 
  positionFrame < clip.endFrame  // Pre-calculated integer boundaries
)
```

### PlaybackService.ts - THE SERVICE LAYER

#### MOSTLY CORRECT ALREADY:
```typescript
// Line 122: GOOD - Already using frames
const snappedTime = this.frameService.snapToFrame(time)
const targetFrame = this.frameService.timeToFrame(snappedTime)
```

**But could be improved:**
```typescript
// CURRENT:
async seek(time: number): Promise<void> {
  const snappedTime = this.frameService.snapToFrame(time)
  this.videoElement.currentTime = snappedTime
}

// BETTER:
async seekToFrame(frame: number): Promise<void> {
  const time = this.frameService.frameToTime(frame)  // Convert at boundary
  this.videoElement.currentTime = time
}
```

### TimelineService.ts - THE TIMELINE CALCULATIONS

#### PROBLEM AREAS:

**1. Position Calculations (Lines 138-148)**
```typescript
// CURRENT - WRONG:
const lastClip = trackClips.reduce((latest, clip) => 
  (clip.startTime > latest.startTime) ? clip : latest  // Float comparison
)
return lastClip.startTime + lastClip.duration  // Float addition

// FIXED - FRAME-BASED:
const lastClip = trackClips.reduce((latest, clip) => 
  (clip.startFrame > latest.startFrame) ? clip : latest  // Integer comparison
)
return lastClip.endFrame  // Pre-calculated, no addition needed
```

---

## 🏗️ PROPOSED STATE STRUCTURE - ALL FRAMES

### Current State (WRONG - Mixed Types)
```typescript
interface PlaybackState {
  currentVideoTime: number        // Seconds - inconsistent!
  globalTimelinePosition: number  // Seconds - float errors!
  activeClipStartTime: number     // Seconds - why?
  localClipTime?: number          // Seconds - precision loss!
}

interface TimelineClip {
  startTime: number     // Seconds - comparison errors!
  duration: number      // Seconds - accumulates errors!
  inPoint: number       // Seconds - seek calculation errors!
  outPoint: number      // Seconds - boundary detection fails!
}
```

### New State (RIGHT - All Frames)
```typescript
interface PlaybackState {
  currentVideoFrame: number      // Converted from videoElement.currentTime
  globalFrame: number            // Current position in global timeline
  activeClipStartFrame: number   // Where current clip starts
  localClipFrame: number         // Position within current clip
  
  // Only keep time for display/debugging
  displayTime?: number           // Calculated: frameToTime(globalFrame)
}

interface TimelineClip {
  startFrame: number       // Timeline position (integer)
  inPointFrame: number     // Trim start (integer)
  outPointFrame: number    // Trim end (integer)
  durationFrames: number   // Pre-calculated: outPointFrame - inPointFrame
  endFrame: number         // Pre-calculated: startFrame + durationFrames
  
  sourceUrl: string        // Keep as is
  id: string              // Keep as is
  
  // Only for display/export
  displayStartTime?: number  // frameToTime(startFrame)
  displayDuration?: number   // frameToTime(durationFrames)
}

interface ScrubberState {
  positionFrame: number   // Current scrubber position
  isDragging: boolean
  
  // For display only
  displayPosition?: number  // frameToTime(positionFrame)
}
```

---

## 🔄 CONVERSION STRATEGY

### Input Boundaries (Time → Frame)
```typescript
// 1. Video element events
videoElement.addEventListener('timeupdate', () => {
  const timeSeconds = videoElement.currentTime
  const frame = frameService.timeToFrame(timeSeconds)
  // Use frame from here on
})

// 2. User scrubber input
onScrubberDrag(pixelPosition: number) {
  const timeSeconds = pixelToTime(pixelPosition)
  const frame = frameService.timeToFrame(timeSeconds)
  // Store frame, not time
}

// 3. Recording completed
onRecordingComplete(durationMs: number) {
  const durationSeconds = durationMs / 1000
  const durationFrames = frameService.timeToFrame(durationSeconds)
  // Use frames for all calculations
}
```

### Output Boundaries (Frame → Time)
```typescript
// 1. Setting video position
function seekVideo(targetFrame: number) {
  const timeSeconds = frameService.frameToTime(targetFrame)
  videoElement.currentTime = timeSeconds  // ONLY place we use time
}

// 2. Display to user
function formatForDisplay(frame: number): string {
  const timeSeconds = frameService.frameToTime(frame)
  return formatTimecode(timeSeconds)  // "00:05:23:15"
}

// 3. Export/save data
function exportTimeline(): ExportData {
  return {
    clips: clips.map(clip => ({
      startTime: frameService.frameToTime(clip.startFrame),  // Convert for export
      duration: frameService.frameToTime(clip.durationFrames)
    }))
  }
}
```

---

## 🚀 IMPLEMENTATION PLAN

### Phase 1: Critical Fixes (High Impact, Low Risk)
1. **Fix seek calculations** - Replace time addition with frame addition
2. **Fix boundary detection** - Use frame comparisons instead of float
3. **Fix duration calculations** - Store pre-calculated frame counts

### Phase 2: State Migration (Medium Impact, Medium Risk)
1. **Update state interfaces** - Add frame properties alongside time
2. **Update state machine actions** - Use frame calculations
3. **Migrate gradually** - Keep time properties during transition

### Phase 3: Service Layer (Low Impact, Medium Risk)
1. **Update PlaybackService** - Accept frame parameters
2. **Update TimelineService** - Frame-based positioning
3. **Clean up** - Remove redundant time properties

### Phase 4: UI Layer (Low Impact, Low Risk)
1. **Update scrubber** - Work with frames internally
2. **Update displays** - Convert frames at display time
3. **Update inputs** - Convert time to frames immediately

---

## 🧪 TESTING STRATEGY

### Frame Precision Tests
```typescript
// Test 1: Exact positioning
const targetFrame = 165  // Exactly 5.5 seconds at 30fps
seekToFrame(targetFrame)
assert(getCurrentFrame() === targetFrame)  // Should be exact

// Test 2: Boundary detection
const clipEndFrame = 300  // 10 seconds
playUntilFrame(clipEndFrame)
assert(clipEndedEventFired === true)  // Should trigger exactly

// Test 3: Duration calculations
const clip1Frames = 150  // 5 seconds
const clip2Frames = 90   // 3 seconds
const totalFrames = clip1Frames + clip2Frames  // Should be exactly 240
assert(calculateTotalDuration() === totalFrames)
```

### Regression Tests
```typescript
// Test existing scenarios with frame precision
testSplitClipPlayback()     // No scrubber jumping
testTrimmedClipBoundaries() // Exact end detection  
testMultipleClipTransitions() // Smooth transitions
```

---

## 🎯 SUCCESS CRITERIA

### Technical Metrics
- ✅ Zero floating-point precision errors
- ✅ Frame-accurate seeking (±0 frames)
- ✅ Exact boundary detection
- ✅ Perfect duration calculations

### User Experience
- ✅ Scrubber never jumps unexpectedly  
- ✅ Clip transitions are seamless
- ✅ Trimmed clips play exact portions
- ✅ Timeline positioning is precise

### Code Quality
- ✅ All calculations use integer math
- ✅ Time conversions only at boundaries
- ✅ No magic numbers (0.033, etc.)
- ✅ Consistent state representation

---

## ⚠️ CRITICAL INSIGHTS

1. **The Video Element is Our Only Time Interface**
   - HTML5 video API forces us to use seconds
   - Everything else should be frames
   - Convert at the exact boundary

2. **Frame Math is Perfect, Time Math is Broken**
   ```typescript
   // Perfect:
   frame1 + frame2 === expectedFrame  // Always true
   
   // Broken:
   time1 + time2 === expectedTime  // Often false due to precision
   ```

3. **Professional Video Editors Use Frames**
   - Avid, Premiere, Final Cut - all frame-based internally
   - Timecode format: HH:MM:SS:FF (frames!)
   - Our approach should match industry standard

4. **Pre-calculate Everything**
   - Don't calculate `endFrame = startFrame + durationFrames` every time
   - Store calculated values in state
   - Update only when clips change

---

## 🔥 THE FIX

**Replace every time-based calculation with frame-based equivalents. Convert to time ONLY when interfacing with the video element or displaying to users.**

This single architectural change will eliminate ALL floating-point precision bugs causing scrubber jumping, missed boundaries, and timing inconsistencies.
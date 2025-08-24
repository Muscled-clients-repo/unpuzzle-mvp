# Frame-Based SSOT Implementation Plan

## Executive Summary

**Objective**: Implement frame-based Single Source of Truth (SSOT) for all time calculations in the video editor, following Principle 0 from BULLETPROOF V3.0 Architecture.

**Current State**: Using floating-point seconds everywhere, causing sync issues and precision problems  
**Target State**: Frame numbers as primary source, time values derived only when needed  
**Impact**: Complete refactor of time handling across State Machine, Services, and UI

---

## 1. Current Architecture Analysis

### 1.1 Time-Based State (VIOLATIONS)

#### State Machine Context (VideoEditorMachineV5.ts)
```typescript
// CURRENT - Multiple time representations
context: {
  currentTime: number              // ❌ Floating-point seconds
  recording: {
    startTime: number | null       // ❌ Performance.now() milliseconds
    duration: number               // ❌ Floating-point seconds
  }
  playback: {
    currentVideoTime: number       // ❌ Floating-point seconds (duplicate)
    videoDuration: number          // ❌ Floating-point seconds
    activeClipStartTime: number    // ❌ Floating-point seconds
    globalTimelinePosition: number // ❌ Floating-point seconds (duplicate)
    pendingSeek: { time: number }  // ❌ Floating-point seconds
  }
  timeline: {
    scrubber: {
      position: number             // ❌ Floating-point seconds
    }
    viewport: {
      pixelsPerSecond: number      // ⚠️ Derived value, should be pixelsPerFrame
    }
  }
}
```

#### TimelineClip Interface
```typescript
interface TimelineClip {
  startTime: number    // ❌ Should be startFrame
  duration: number     // ❌ Should be durationFrames
  inPoint: number      // ❌ Should be inFrame
  outPoint: number     // ❌ Should be outFrame
}
```

### 1.2 Service Layer Issues

#### PlaybackService
- `videoElement.currentTime` - HTML5 video uses seconds (unavoidable)
- Emits time-based events: `playback.timeUpdate`, `playback.seek`
- No frame conversion logic

#### RecordingService
- Uses `performance.now()` for timing
- Duration calculated in seconds
- No frame rate awareness

#### TimelineService
- Stores clips with time-based properties
- No frame conversion utilities

### 1.3 Integration Layer Issues

#### VideoEditorSingleton
- Forwards time values without conversion
- Seeks using floating-point seconds
- No frame-to-time conversion layer

### 1.4 UI Layer Issues

#### Components
- Scrubber displays time positions
- Timeline shows seconds-based grid
- No frame number display

---

## 2. Frame-Based Architecture Design

### 2.1 Core Constants

```typescript
// NEW: Core frame constants
const FRAME_RATE = 30 // 30 FPS standard for web video
const FRAME_PRECISION = 1000 // Sub-frame precision (1000 = millisecond precision)

// Conversion functions
const timeToFrame = (seconds: number): number => Math.round(seconds * FRAME_RATE)
const frameToTime = (frame: number): number => frame / FRAME_RATE
const frameToPixels = (frame: number, pixelsPerFrame: number): number => frame * pixelsPerFrame
const pixelsToFrame = (pixels: number, pixelsPerFrame: number): number => Math.round(pixels / pixelsPerFrame)
```

### 2.2 New State Machine Context

```typescript
context: {
  // PRIMARY SOURCE - Frame numbers
  currentFrame: number              // ✅ Integer frame number
  
  recording: {
    startFrame: number | null       // ✅ Frame when recording started
    durationFrames: number          // ✅ Total frames recorded
    frameRate: number               // ✅ Recording frame rate
  }
  
  playback: {
    videoDurationFrames: number     // ✅ Total frames in video
    loadedVideoUrl: string | null
    currentClipId: string | null
    pendingClipTransition: TimelineClip | null
    pendingSeekFrame: number | null // ✅ Target frame for seeking
    clipSequence: TimelineClip[]
    currentSequenceIndex: number
    frameRate: number               // ✅ Playback frame rate
  }
  
  timeline: {
    clips: TimelineClip[]           // With frame-based properties
    tracks: Track[]
    scrubber: {
      currentFrame: number          // ✅ Scrubber position in frames
      isDragging: boolean
      snapEnabled: boolean
    }
    viewport: {
      zoom: number
      scrollLeft: number
      pixelsPerFrame: number        // ✅ Pixels per frame (not second)
    }
  }
  
  // Metadata for conversions
  projectFrameRate: number          // ✅ Project-wide frame rate
}
```

### 2.3 Updated Interfaces

```typescript
interface TimelineClip {
  id: string
  sourceUrl: string
  startFrame: number      // ✅ Timeline position in frames
  durationFrames: number  // ✅ Clip length in frames
  inFrame: number        // ✅ Trim start in frames
  outFrame: number       // ✅ Trim end in frames
  frameRate: number      // ✅ Source clip frame rate
  
  // Derived for display only
  get startTime(): number { return frameToTime(this.startFrame) }
  get duration(): number { return frameToTime(this.durationFrames) }
}
```

---

## 3. Implementation Steps

### Phase 1: Core Infrastructure (Day 1)

#### Step 1.1: Create Frame Utilities Module
```typescript
// src/lib/video-editor/utils/FrameCalculations.ts
export const STANDARD_FRAME_RATE = 30

export class FrameCalculator {
  constructor(private frameRate: number = STANDARD_FRAME_RATE) {}
  
  timeToFrame(seconds: number): number {
    return Math.round(seconds * this.frameRate)
  }
  
  frameToTime(frame: number): number {
    return frame / this.frameRate
  }
  
  // Ensure frame alignment for precise seeking
  alignToFrame(seconds: number): number {
    return this.frameToTime(this.timeToFrame(seconds))
  }
}
```

#### Step 1.2: Update State Machine Context
- Add frame-based properties alongside time-based (temporary dual-state)
- Maintain backward compatibility during migration
- Add frameRate to context initialization

#### Step 1.3: Create Frame-Based Actions
```typescript
actions: {
  setCurrentFrame: assign({
    currentFrame: ({ event }) => event.frame,
    // Temporary: Also update currentTime for compatibility
    currentTime: ({ event, context }) => frameToTime(event.frame, context.projectFrameRate)
  })
}
```

### Phase 2: Service Layer Updates (Day 2)

#### Step 2.1: Update PlaybackService
```typescript
// Convert HTML5 video time to frames before emitting
private emitFrameUpdate(): void {
  const currentSeconds = this.videoElement.currentTime
  const currentFrame = this.frameCalculator.timeToFrame(currentSeconds)
  
  this.eventBus.emit('playback.frameUpdate', { 
    frame: currentFrame,
    time: currentSeconds // Temporary compatibility
  })
}

// Align seeks to frame boundaries
async seekToFrame(targetFrame: number): Promise<void> {
  const targetTime = this.frameCalculator.frameToTime(targetFrame)
  this.videoElement.currentTime = targetTime
}
```

#### Step 2.2: Update RecordingService
```typescript
// Track frames instead of time
private recordingStartFrame: number | null = null

startRecording(): void {
  this.recordingStartFrame = this.frameCalculator.timeToFrame(performance.now() / 1000)
  // ...
}

stopRecording(): Blob {
  const endFrame = this.frameCalculator.timeToFrame(performance.now() / 1000)
  const durationFrames = endFrame - this.recordingStartFrame
  // ...
}
```

### Phase 3: Integration Layer Updates (Day 3)

#### Step 3.1: Update VideoEditorSingleton
```typescript
// Convert between frames and time at the boundary
eventBus.on('playback.frameUpdate', ({ frame }) => {
  stateMachine.send({ type: 'FRAME.UPDATE', frame })
})

// Seek operations use frames
if (playback.pendingSeekFrame !== null) {
  const seekTime = frameCalculator.frameToTime(playback.pendingSeekFrame)
  await playbackService.seekToFrame(playback.pendingSeekFrame)
}
```

#### Step 3.2: Update Event Types
```typescript
type VideoEditorEvent = 
  | { type: 'FRAME.UPDATE'; frame: number }
  | { type: 'PLAYBACK.SEEK_TO_FRAME'; frame: number }
  | { type: 'SCRUBBER.DRAG_TO_FRAME'; frame: number }
  | { type: 'VIDEO.LOADED'; durationFrames: number; frameRate: number }
```

### Phase 4: Query Layer Updates (Day 4)

#### Step 4.1: Frame-Based Queries
```typescript
class VideoEditorQueries {
  getCurrentFrame(): number {
    return this.stateMachine.getSnapshot().context.currentFrame
  }
  
  // Derived time value for display only
  getCurrentTime(): number {
    const { currentFrame, projectFrameRate } = this.stateMachine.getSnapshot().context
    return frameToTime(currentFrame, projectFrameRate)
  }
  
  getScrubberFrame(): number {
    return this.stateMachine.getSnapshot().context.timeline.scrubber.currentFrame
  }
}
```

### Phase 5: Command Layer Updates (Day 4)

#### Step 5.1: Frame-Based Commands
```typescript
class VideoEditorCommands {
  seekToFrame(frame: number): void {
    this.stateMachine.send({ type: 'PLAYBACK.SEEK_TO_FRAME', frame })
  }
  
  scrubToFrame(frame: number): void {
    this.stateMachine.send({ type: 'SCRUBBER.DRAG_TO_FRAME', frame })
  }
}
```

### Phase 6: UI Component Updates (Day 5)

#### Step 6.1: Update Timeline Components
```typescript
// Display frame numbers and time
const FrameDisplay: React.FC<{ frame: number }> = ({ frame }) => {
  const time = frameToTime(frame, FRAME_RATE)
  return (
    <div>
      <span>{frame}f</span>
      <span>{formatTime(time)}</span>
    </div>
  )
}
```

#### Step 6.2: Update Scrubber
```typescript
// Scrubber operates in frames
const handleScrubberDrag = (pixelPosition: number) => {
  const frame = pixelsToFrame(pixelPosition, pixelsPerFrame)
  commands.scrubToFrame(frame)
}
```

### Phase 7: Migration & Cleanup (Day 6)

#### Step 7.1: Remove Old Time-Based Properties
- Remove `currentTime` from context
- Remove `position` from scrubber
- Remove all duplicate time tracking

#### Step 7.2: Update Tests
- Convert all time-based tests to frame-based
- Add frame precision tests
- Verify frame alignment

---

## 4. Critical Implementation Details

### 4.1 Frame Alignment

**CRITICAL**: All seeks must align to frame boundaries to prevent drift:
```typescript
// BAD - Can cause drift
videoElement.currentTime = 1.033333  // Arbitrary time

// GOOD - Aligned to frame
const targetFrame = 31  // Frame 31
videoElement.currentTime = frameToTime(targetFrame)  // Exactly 1.0333...
```

### 4.2 Multi-Rate Handling

Different clips may have different frame rates:
```typescript
// Convert between frame rates
const convertFrameRate = (frame: number, fromRate: number, toRate: number): number => {
  const time = frame / fromRate
  return Math.round(time * toRate)
}
```

### 4.3 Sub-Frame Precision

For smooth scrubbing, we may need sub-frame precision:
```typescript
interface PreciseFrame {
  frame: number        // Integer frame
  subFrame: number     // 0.0 to 0.999... within frame
}
```

### 4.4 Backward Compatibility

During migration, maintain both systems:
```typescript
// Temporary dual update
const updatePosition = (frame: number) => {
  context.currentFrame = frame
  context.currentTime = frameToTime(frame)  // Remove after migration
}
```

---

## 5. Testing Strategy

### 5.1 Unit Tests
- Frame conversion accuracy
- Frame alignment verification
- Multi-rate conversion tests

### 5.2 Integration Tests
- Scrubber-video sync at all frame rates
- Seek precision verification
- Clip boundary accuracy

### 5.3 Performance Tests
- Frame calculation performance
- No floating-point drift over time
- Smooth playback at various frame rates

---

## 6. Rollback Plan

If issues arise:
1. Keep time-based system in parallel initially
2. Feature flag for frame-based system
3. Gradual rollout by component
4. Quick revert via feature flag

---

## 7. Success Criteria

### Must Have
- ✅ Scrubber and video perfectly synchronized
- ✅ No floating-point precision issues
- ✅ Frame-accurate seeking
- ✅ Consistent position across all components

### Should Have
- ✅ Frame number display in UI
- ✅ Multi-frame-rate support
- ✅ Sub-frame precision for smooth scrubbing

### Nice to Have
- ✅ Frame-based keyboard shortcuts (← → for frame stepping)
- ✅ SMPTE timecode display
- ✅ Drop-frame timecode support

---

## 8. Risk Mitigation

### Risk 1: Performance Impact
**Mitigation**: Cache frame calculations, use lookup tables for common conversions

### Risk 2: HTML5 Video Limitations
**Mitigation**: Accept that video element uses seconds, convert at boundary only

### Risk 3: User Confusion
**Mitigation**: Show both frame numbers and time in UI during transition

### Risk 4: Third-Party Integration
**Mitigation**: Maintain time-based API for external integrations

---

## 9. Implementation Order

1. **Day 1**: Core infrastructure (FrameCalculations.ts, update context)
2. **Day 2**: Service layer (PlaybackService, RecordingService)
3. **Day 3**: Integration layer (VideoEditorSingleton event conversion)
4. **Day 4**: Query/Command layers
5. **Day 5**: UI components
6. **Day 6**: Cleanup and testing

---

## 10. Code Examples

### Example 1: Seeking to Frame
```typescript
// Command
commands.seekToFrame(150)  // Seek to frame 150

// State Machine
'PLAYBACK.SEEK_TO_FRAME': {
  actions: assign({
    currentFrame: ({ event }) => event.frame,
    playback: ({ context, event }) => ({
      ...context.playback,
      pendingSeekFrame: event.frame
    })
  })
}

// Integration Layer
const targetTime = frameCalculator.frameToTime(playback.pendingSeekFrame)
await playbackService.seekToFrame(playback.pendingSeekFrame)

// Service
async seekToFrame(frame: number): Promise<void> {
  const time = this.frameCalculator.frameToTime(frame)
  this.videoElement.currentTime = time
}
```

### Example 2: Scrubber Sync
```typescript
// Video time update
videoElement.ontimeupdate = () => {
  const frame = frameCalculator.timeToFrame(videoElement.currentTime)
  eventBus.emit('playback.frameUpdate', { frame })
}

// State Machine receives frame
'FRAME.UPDATE': {
  actions: assign({
    currentFrame: ({ event }) => event.frame,
    timeline: ({ context, event }) => ({
      ...context.timeline,
      scrubber: {
        ...context.timeline.scrubber,
        currentFrame: event.frame  // Perfect sync!
      }
    })
  })
}
```

---

## Conclusion

This plan provides a comprehensive, non-contradictory approach to implementing frame-based SSOT. The key is to:
1. Make frames the PRIMARY source of truth
2. Convert to time ONLY at service boundaries (HTML5 video)
3. Maintain frame alignment for precision
4. Implement gradually with backward compatibility

The result will be a professional-grade video editor with frame-accurate precision and perfect synchronization.
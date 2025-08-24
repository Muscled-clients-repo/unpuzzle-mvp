# File 6A: Frame-Based Target Architecture (Clean Final State)

## Purpose

This document describes the **FINAL TARGET STATE** after migration is complete. 
- NO legacy code
- NO compatibility layers  
- NO time-based storage
- Pure frame-based SSOT

---

## 1. Core Principles

### The One Rule
**Frames are the ONLY source of truth for position**

### What This Means
- `currentFrame` is the ONLY stored position
- Time is ALWAYS calculated from frames
- No duplicate storage anywhere
- No derived values stored

---

## 2. State Machine Context (Final State)

```typescript
interface VideoEditorContext {
  // THE SINGLE SOURCE OF TRUTH
  currentFrame: number              // The ONLY position stored
  projectFrameRate: number          // Project frame rate (30 fps)
  
  recording: {
    isRecording: boolean
    startFrame: number | null       // Frame when recording started
    durationFrames: number          // Total frames recorded
  }
  
  playback: {
    videoDurationFrames: number     // Total frames in video
    loadedVideoUrl: string | null
    currentClipId: string | null
    pendingSeekFrame: number | null // Target frame for seeking
    pendingClipTransition: TimelineClip | null
    clipSequence: TimelineClip[]
    currentSequenceIndex: number
  }
  
  timeline: {
    clips: TimelineClip[]           // Frame-based clips
    tracks: Track[]
    scrubber: {
      isDragging: boolean           // Just the dragging state
      snapEnabled: boolean
      // NO position - scrubber displays currentFrame
    }
    viewport: {
      zoom: number
      scrollLeft: number
      pixelsPerFrame: number        // For display calculations
    }
  }
}
```

### What's NOT in Context
- ❌ `currentTime` - calculated from currentFrame
- ❌ `scrubber.position` - scrubber displays currentFrame
- ❌ `playback.currentVideoTime` - redundant
- ❌ `playback.globalTimelinePosition` - redundant

---

## 3. Data Structures

### TimelineClip
```typescript
interface TimelineClip {
  id: string
  sourceUrl: string
  
  // ALL position data in frames
  startFrame: number       // Timeline position in frames
  durationFrames: number   // Clip length in frames  
  inFrame: number         // Trim start in frames
  outFrame: number        // Trim end in frames
}
```

### Events
```typescript
type VideoEditorEvent = 
  | { type: 'FRAME.SET'; frame: number }
  | { type: 'FRAME.ADVANCE'; deltaFrames: number }
  | { type: 'PLAYBACK.SEEK_TO_FRAME'; frame: number }
  | { type: 'SCRUBBER.DRAG_TO_FRAME'; frame: number }
  | { type: 'VIDEO.LOADED'; durationFrames: number }
  | { type: 'VIDEO.FRAME_UPDATE'; frame: number }
```

---

## 4. Layer Responsibilities

### State Machine Layer
**Stores frames, updates frames, knows nothing about time**

```typescript
actions: {
  setCurrentFrame: assign(({ event }) => ({
    currentFrame: event.frame
  })),
  
  advanceFrame: assign(({ context, event }) => ({
    currentFrame: context.currentFrame + event.deltaFrames
  })),
  
  handleScrubberDrag: assign(({ context, event }) => ({
    currentFrame: event.frame,
    timeline: {
      ...context.timeline,
      scrubber: {
        ...context.timeline.scrubber,
        isDragging: true
      }
    }
  })),
  
  handleVideoFrameUpdate: assign(({ event }) => ({
    currentFrame: event.frame
    // Scrubber automatically stays in sync because it reads currentFrame
  }))
}
```

### Query Layer
**Reads frames, calculates derived values**

```typescript
class VideoEditorQueries {
  getCurrentFrame(): number {
    return this.stateMachine.getSnapshot().context.currentFrame
  }
  
  getCurrentTime(): number {
    const { currentFrame, projectFrameRate } = this.stateMachine.getSnapshot().context
    return currentFrame / projectFrameRate
  }
  
  getScrubberFrame(): number {
    // Scrubber position IS current frame
    return this.getCurrentFrame()
  }
  
  getScrubberPixels(): number {
    const { currentFrame, timeline } = this.stateMachine.getSnapshot().context
    return currentFrame * timeline.viewport.pixelsPerFrame
  }
  
  getTimecode(): string {
    const frame = this.getCurrentFrame()
    const fps = this.stateMachine.getSnapshot().context.projectFrameRate
    const totalSeconds = frame / fps
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = Math.floor(totalSeconds % 60)
    const frames = frame % fps
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
  }
  
  getClipAtFrame(frame: number): TimelineClip | null {
    const clips = this.stateMachine.getSnapshot().context.timeline.clips
    return clips.find(clip => 
      frame >= clip.startFrame && 
      frame < clip.startFrame + clip.durationFrames
    ) || null
  }
}
```

### Command Layer
**Sends frame-based events only**

```typescript
class VideoEditorCommands {
  seekToFrame(frame: number): void {
    this.stateMachine.send({ type: 'PLAYBACK.SEEK_TO_FRAME', frame })
  }
  
  scrubToFrame(frame: number): void {
    this.stateMachine.send({ type: 'SCRUBBER.DRAG_TO_FRAME', frame })
  }
  
  advanceFrames(count: number): void {
    this.stateMachine.send({ type: 'FRAME.ADVANCE', deltaFrames: count })
  }
  
  // Convenience method if UI provides time
  seekToTime(seconds: number): void {
    const frame = Math.round(seconds * 30)
    this.seekToFrame(frame)
  }
}
```

### Integration Layer
**Converts frames to time for external services**

```typescript
// VideoEditorSingleton.ts

// Handle pending seeks
if (context.playback.pendingSeekFrame !== null) {
  const seekTime = context.playback.pendingSeekFrame / context.projectFrameRate
  await playbackService.seek(seekTime)
  stateMachine.send({ type: 'SEEK.COMPLETED' })
}

// Convert incoming time events to frames
eventBus.on('playback.timeUpdate', ({ currentTime }) => {
  const frame = Math.round(currentTime * context.projectFrameRate)
  stateMachine.send({ type: 'VIDEO.FRAME_UPDATE', frame })
})

// No time storage, just conversion at boundaries
```

### Service Layer
**Works with time (external requirement)**

```typescript
class PlaybackService {
  // Services use time because HTML5 video requires it
  async seek(timeInSeconds: number): Promise<void> {
    this.videoElement.currentTime = timeInSeconds
  }
  
  // Emit time (will be converted to frames by Integration Layer)
  private handleTimeUpdate = () => {
    this.eventBus.emit('playback.timeUpdate', { 
      currentTime: this.videoElement.currentTime 
    })
  }
}
```

---

## 5. Frame Utilities

```typescript
// src/lib/video-editor/utils/FrameCalculations.ts

export const PROJECT_FRAME_RATE = 30

export const timeToFrame = (seconds: number, fps: number = PROJECT_FRAME_RATE): number => {
  return Math.round(seconds * fps)
}

export const frameToTime = (frame: number, fps: number = PROJECT_FRAME_RATE): number => {
  return frame / fps
}

export const alignTimeToFrame = (seconds: number, fps: number = PROJECT_FRAME_RATE): number => {
  return frameToTime(timeToFrame(seconds, fps), fps)
}

export const framesToTimecode = (frame: number, fps: number = PROJECT_FRAME_RATE): string => {
  const totalSeconds = frame / fps
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const frames = frame % fps
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}

export const timecodeToFrames = (timecode: string, fps: number = PROJECT_FRAME_RATE): number => {
  const parts = timecode.split(':').map(Number)
  const [hours = 0, minutes = 0, seconds = 0, frames = 0] = parts
  
  return ((hours * 3600 + minutes * 60 + seconds) * fps) + frames
}
```

---

## 6. UI Components

### Scrubber Component
```typescript
const Scrubber: React.FC = () => {
  const currentFrame = queries.getCurrentFrame()
  const pixelsPerFrame = queries.getPixelsPerFrame()
  const positionInPixels = currentFrame * pixelsPerFrame
  
  const handleDrag = (pixelX: number) => {
    const frame = Math.round(pixelX / pixelsPerFrame)
    commands.scrubToFrame(frame)
  }
  
  return (
    <div 
      className="scrubber" 
      style={{ left: `${positionInPixels}px` }}
      onDrag={handleDrag}
    />
  )
}
```

### Timeline Display
```typescript
const TimelineDisplay: React.FC = () => {
  const currentFrame = queries.getCurrentFrame()
  const timecode = queries.getTimecode()
  
  return (
    <div className="timeline-display">
      <span className="frame-number">{currentFrame}f</span>
      <span className="timecode">{timecode}</span>
    </div>
  )
}
```

### Frame Controls
```typescript
const FrameControls: React.FC = () => {
  return (
    <div className="frame-controls">
      <button onClick={() => commands.advanceFrames(-1)}>← Previous Frame</button>
      <button onClick={() => commands.advanceFrames(1)}>Next Frame →</button>
      <button onClick={() => commands.advanceFrames(-5)}>-5f</button>
      <button onClick={() => commands.advanceFrames(5)}>+5f</button>
    </div>
  )
}
```

---

## 7. Why This Achieves TRUE SSOT

### Single Storage Point
- Position stored ONLY as `currentFrame`
- Everything else calculated on demand
- Impossible to have desync

### Perfect Scrubber Sync
- Scrubber doesn't have its own position
- It displays `currentFrame` directly
- Can never drift from video position

### Frame Precision
- All operations frame-accurate
- No floating-point accumulation errors
- Professional-grade precision

### Clean Mental Model
- "What frame are we on?" → `context.currentFrame`
- "What time is that?" → `currentFrame / frameRate`
- "Where is scrubber?" → Same as currentFrame

---

## 8. Benefits

1. **Impossible to Desync**: One source, perfect sync
2. **Frame-Accurate Editing**: Professional precision
3. **Simple Debugging**: Check one value
4. **Industry Standard**: How Premiere/Resolve work
5. **Clean Code**: No redundant updates
6. **Performance**: Integer math faster than floats

---

## 9. What's NOT Here

This document does NOT include:
- Migration strategies
- Compatibility layers
- Legacy support
- Dual storage patterns
- Transition states

For migration guidance, see File 6B.

---

## 10. Verification Checklist

To verify TRUE SSOT is achieved:

- [ ] `currentFrame` is the ONLY position storage
- [ ] No `currentTime` in context
- [ ] No `scrubber.position` in context
- [ ] All time values calculated from frames
- [ ] Services receive time via conversion at boundary
- [ ] Queries calculate, don't store
- [ ] Commands work with frames only
- [ ] UI displays frames and derived time

---

## Conclusion

This architecture achieves TRUE SSOT by:
1. Storing position in EXACTLY ONE place (currentFrame)
2. Calculating all other representations on demand
3. Never storing derived values
4. Making desync impossible by design

The key: **If you only store it once, it can only have one value.**
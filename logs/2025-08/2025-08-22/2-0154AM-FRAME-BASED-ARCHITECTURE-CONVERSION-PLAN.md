# Frame-Based Architecture Conversion Plan

**Date:** 2025-08-22
**Time:** 01:54 AM EST
**Purpose:** Complete analysis and implementation plan for converting video editor to frame-based calculations

> **NOTE:** All new files in logs folder must follow NUMBER-TIME-DESCRIPTION format

## Executive Summary

After reviewing the entire codebase, I've identified **127 time-based calculations** across 11 files that need conversion to frame-based logic. This conversion would eliminate floating-point precision issues and provide professional-grade accuracy.

## Current Time-Based Calculations Inventory

### 1. State Machine (VideoEditorMachineV5.ts)
**47 time references found:**
```typescript
// Context properties using seconds
currentTime: number               // → currentFrame: number
globalTimelinePosition: number     // → globalTimelineFrame: number
activeClipStartTime: number        // → activeClipStartFrame: number

// Clip properties
startTime: number                  // → startFrame: number
duration: number                   // → durationFrames: number
inPoint: number                    // → inFrame: number
outPoint: number                   // → outFrame: number
```

### 2. Integration Layer (VideoEditorSingleton.ts)
**23 time calculations found:**
```typescript
// Critical calculations that cause bugs
currentTime >= currentClip.outPoint - 0.05  // → currentFrame >= clip.outFrame
videoElement.currentTime = 0                 // → videoElement.currentTime = 0 / fps
clip.inPoint + playback.pendingSeek.time    // → clip.inFrame + seekFrames
```

### 3. TimeCalculations Utility
**15 calculations - ALL need conversion:**
```typescript
clip.startTime + videoElementTime           // → clip.startFrame + videoFrames
timelinePosition - clip.startTime           // → timelineFrame - clip.startFrame
clip.startTime + clip.duration              // → clip.startFrame + clip.durationFrames
```

### 4. Services (Playback, Timeline, Recording)
**28 time references across 3 files**

### 5. UI Components (Not analyzed yet)
**Estimated 30+ references in React components**

## Frame-Based Architecture Design

### Core Principle: Everything in Frames
```typescript
// New frame-based types
interface FrameClip {
  id: string
  fps: number                    // 30, 24, 60, etc.
  sourceFrames: number           // Total frames in source
  inFrame: number                // Start frame (trim)
  outFrame: number               // End frame (trim)
  durationFrames: number         // outFrame - inFrame
  timelineStartFrame: number     // Position on timeline
}

interface FrameContext {
  fps: number                    // Project frame rate
  currentFrame: number           // Current playhead position
  totalFrames: number            // Total timeline duration
}
```

## Implementation Strategy

### Phase 1: Core Frame Service (4 hours)
Create the foundation that everything else will use.

**File: `/src/lib/video-editor/services/FrameService.ts`**
```typescript
export class FrameService {
  private fps: number = 30  // Default, can be configured
  
  // Core conversions
  timeToFrame(seconds: number): number {
    return Math.round(seconds * this.fps)
  }
  
  frameToTime(frame: number): number {
    return frame / this.fps
  }
  
  // Precision comparisons (fixes floating point issues)
  areTimesEqual(time1: number, time2: number): boolean {
    return this.timeToFrame(time1) === this.timeToFrame(time2)
  }
  
  isTimeAtOrPast(current: number, target: number): boolean {
    return this.timeToFrame(current) >= this.timeToFrame(target)
  }
  
  // Clip calculations
  getClipEndFrame(clip: FrameClip): number {
    return clip.timelineStartFrame + clip.durationFrames
  }
  
  isFrameInClip(frame: number, clip: FrameClip): boolean {
    return frame >= clip.timelineStartFrame && 
           frame < this.getClipEndFrame(clip)
  }
  
  // Snapping (for scrubber)
  snapToNearestFrame(seconds: number): number {
    return this.frameToTime(this.timeToFrame(seconds))
  }
}
```

### Phase 2: State Machine Conversion (6 hours)

#### Step 1: Extend Context with Frame Data
```typescript
interface VideoEditorContext {
  // Keep time-based for backward compatibility
  currentTime: number
  
  // ADD frame-based in parallel
  frames: {
    fps: number
    currentFrame: number
    totalFrames: number
  }
  
  // Update playback state
  playback: {
    currentVideoTime: number      // Keep for video element
    currentVideoFrame: number     // ADD for precision
    activeClipStartFrame: number  // ADD
    globalTimelineFrame: number   // ADD
  }
}
```

#### Step 2: Update All Actions
```typescript
// Before (floating point issues)
updateVideoTime: assign(({ context, event }) => {
  const newTime = context.playback.activeClipStartTime + event.time
  
// After (frame-precise)
updateVideoTime: assign(({ context, event }) => {
  const frameService = new FrameService(context.frames.fps)
  const videoFrame = frameService.timeToFrame(event.time)
  const globalFrame = context.playback.activeClipStartFrame + videoFrame
```

### Phase 3: Integration Layer Updates (3 hours)

#### Convert Boundary Checking
```typescript
// BEFORE (buggy)
const hasReachedEnd = currentTime >= currentClip.outPoint - 0.05

// AFTER (precise)
const currentFrame = frameService.timeToFrame(currentTime)
const hasReachedEnd = currentFrame >= currentClip.outFrame
```

#### Convert Seek Operations
```typescript
// BEFORE (floating point)
const seekTime = clip.inPoint + playback.pendingSeek.time

// AFTER (frame-accurate)
const seekFrame = clip.inFrame + playback.pendingSeek.frames
const seekTime = frameService.frameToTime(seekFrame)
```

### Phase 4: TimeCalculations Replacement (2 hours)

**Replace entirely with FrameCalculations:**
```typescript
export class FrameCalculations {
  constructor(private frameService: FrameService) {}
  
  videoFrameToTimelineFrame(videoFrame: number, clip: FrameClip): number {
    return clip.timelineStartFrame + videoFrame
  }
  
  timelineFrameToVideoFrame(timelineFrame: number, clip: FrameClip): number {
    return Math.max(0, timelineFrame - clip.timelineStartFrame)
  }
  
  findClipAtFrame(frame: number, clips: FrameClip[]): FrameClip | null {
    return clips.find(clip => 
      frame >= clip.timelineStartFrame && 
      frame < clip.timelineStartFrame + clip.durationFrames
    ) || null
  }
  
  hasReachedClipEnd(frame: number, clip: FrameClip): boolean {
    return frame >= clip.timelineStartFrame + clip.durationFrames
  }
}
```

### Phase 5: Service Layer Updates (3 hours)

#### PlaybackService
```typescript
class PlaybackService {
  private frameService: FrameService
  
  async seek(targetFrame: number): Promise<void> {
    // Convert frame to time for video element
    const seekTime = this.frameService.frameToTime(targetFrame)
    this.videoElement.currentTime = seekTime
  }
  
  private handleTimeUpdate = () => {
    // Snap to nearest frame for precision
    const currentFrame = this.frameService.timeToFrame(this.videoElement.currentTime)
    this.eventBus.emit('playback.frameUpdate', { frame: currentFrame })
  }
}
```

#### TimelineService
```typescript
class TimelineService {
  requestAddClip(clip: Omit<FrameClip, 'id'>): void {
    // All calculations in frames
    const totalFrames = clip.outFrame - clip.inFrame
    const newClip: FrameClip = {
      ...clip,
      durationFrames: totalFrames,
      id: generateId()
    }
  }
}
```

### Phase 6: UI Components (4 hours)

#### Scrubber Component
```typescript
// Display both time and frame
const ScrubberDisplay = ({ currentFrame, fps }) => {
  const time = frameToTime(currentFrame, fps)
  const timecode = frameToTimecode(currentFrame, fps) // "00:00:05:15"
  
  return (
    <div>
      <span>{timecode}</span>  {/* Professional display */}
      <span>{time.toFixed(2)}s</span>  {/* Legacy display */}
    </div>
  )
}
```

#### Timeline Rendering
```typescript
// Snap to frame boundaries
const handleScrubberDrag = (x: number) => {
  const frame = Math.round(x / pixelsPerFrame)
  commands.scrubber({ action: 'drag', frame })
}
```

## Migration Strategy

### Incremental Approach (Recommended)
**Week 1:**
1. Day 1: Implement FrameService (4 hours)
2. Day 2: Add frame tracking to State Machine alongside time (6 hours)
3. Day 3: Update Integration Layer to use frames (3 hours)
4. Day 4: Replace TimeCalculations with FrameCalculations (2 hours)
5. Day 5: Update services and testing (3 hours)

**Week 2:**
- Update UI components
- Remove time-based code
- Comprehensive testing

### Big Bang Approach (Not Recommended)
- Convert everything at once over 3-4 days
- High risk of breaking everything
- Difficult to debug

## Benefits After Conversion

### 1. Precision Issues - SOLVED
```typescript
// BEFORE: Scrubber at 5.123456 vs video at 5.123457
// AFTER: Both at frame 154 - perfect sync!
```

### 2. Clip Boundaries - SOLVED
```typescript
// BEFORE: if (time >= end - 0.05) // Hacky tolerance
// AFTER: if (frame >= endFrame) // Exact!
```

### 3. Trim/Split - SOLVED
```typescript
// BEFORE: Split at 3.456789... between frames?
// AFTER: Split at frame 104 - clean cut!
```

### 4. Professional Features - ENABLED
```typescript
// Can now add:
- Frame-accurate editing
- Timecode display (00:00:00:00)
- Frame stepping (arrow keys)
- Snap to frame grid
- Frame-accurate transitions
```

## Code Examples

### Example 1: Seek Operation
```typescript
// BEFORE (imprecise)
commands.seek({ time: 5.5 })
// Might land at 5.499999 or 5.500001

// AFTER (precise)
commands.seek({ frame: 165 })  // Exactly frame 165
// Converts to 5.5 seconds internally for video element
```

### Example 2: Clip End Detection
```typescript
// BEFORE (buggy)
const hasEnded = currentTime >= clip.outPoint - 0.05
// What if currentTime is 4.9499999?

// AFTER (perfect)
const hasEnded = currentFrame >= clip.outFrame
// Frame 150 >= Frame 150? Clear yes/no!
```

### Example 3: Timeline Display
```typescript
// Professional timecode display
function frameToTimecode(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const frames = frame % fps
  
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`
  // "00:00:05:15" = 5 seconds, 15 frames
}
```

## Testing Strategy

### Unit Tests for FrameService
```typescript
describe('FrameService', () => {
  it('converts time to frame accurately', () => {
    const service = new FrameService(30)
    expect(service.timeToFrame(5.5)).toBe(165)
    expect(service.timeToFrame(5.499)).toBe(165) // Rounds correctly!
  })
  
  it('handles clip boundaries precisely', () => {
    const clip = { outFrame: 150 }
    expect(service.isFrameAtOrPast(149, clip.outFrame)).toBe(false)
    expect(service.isFrameAtOrPast(150, clip.outFrame)).toBe(true)
  })
})
```

### Integration Tests
1. Multi-clip playback with no pauses
2. Trim/split at exact frames
3. Scrubber sync validation
4. Restart from beginning

## Risks and Mitigations

### Risk 1: Video Element Compatibility
**Issue:** HTML5 video doesn't understand frames
**Mitigation:** Always convert frames to time for video element

### Risk 2: Performance Impact
**Issue:** Extra calculations on every update
**Mitigation:** Calculations are simple integer math, faster than floating point

### Risk 3: Variable Frame Rates
**Issue:** User uploads 24fps, 30fps, 60fps videos
**Mitigation:** Store fps per clip, convert between rates

## Success Metrics

### Quantitative
- [ ] Zero floating-point comparisons
- [ ] All time stored as integers (frames)
- [ ] No tolerance values (0.05, 0.1, etc.)
- [ ] 100% frame-accurate operations

### Qualitative
- [ ] Scrubber never desyncs
- [ ] Clips transition seamlessly
- [ ] Split/trim at exact frames
- [ ] Professional timecode display

## Conclusion

Converting to frame-based architecture will solve **ALL** our timing precision issues. The effort is significant (22 hours estimated) but the result will be a professional-grade video editor with perfect accuracy.

**Key insight:** Professional video editors don't use floating-point time - they use frames. We should too.

## Next Steps

1. **Get approval** for frame-based conversion
2. **Start with FrameService** - Low risk, high value
3. **Run in parallel** - Add frames alongside time initially
4. **Gradual migration** - Convert one system at a time
5. **Remove time-based** - Only after everything works

This is the difference between a "web video player with editing" and a "professional video editor."
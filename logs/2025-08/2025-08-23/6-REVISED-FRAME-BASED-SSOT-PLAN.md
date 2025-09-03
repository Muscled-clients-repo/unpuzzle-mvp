# Revised Frame-Based SSOT Implementation Plan

## Executive Summary

**Objective**: Implement TRUE Single Source of Truth using frame numbers as the ONLY stored time representation.

**Key Principle**: Store frames ONLY, calculate time when needed, never store both.

**Critical Change from v1**: No dual storage, no derived state in context, pure calculations allowed at boundaries.

---

## 1. CRITICAL SSOT RULES

### The Golden Rules:
1. **NEVER store both frame and time** - Calculate time when needed
2. **currentFrame is THE source** - Everything else derives from it  
3. **Scrubber doesn't have separate position** - It reads currentFrame directly
4. **No currentTime in context** - Always calculate from currentFrame
5. **No pre-calculated derived values** - Calculate at point of use

### Why This Matters:
- Storing derived values creates multiple sources of truth
- Derived values can become stale when frameRate changes
- Calculations are cheap, inconsistency is expensive

---

## 2. Architecture States

### 2.0 Migration Context States

```typescript
// DURING MIGRATION - Context will be in ONE of these states:

// State A: Legacy (current system)
interface LegacyContext {
  currentTime: number              // Time-based
  timeline: {
    scrubber: {
      position: number            // Also time-based
    }
  }
  // NO currentFrame property
}

// State B: Hybrid (transition phase) 
interface HybridContext {
  currentFrame: number            // Frame-based (NEW)
  projectFrameRate: number        // Required for conversion
  currentTime?: number            // May exist but IGNORED
  timeline: {
    scrubber: {
      position?: number           // May exist but IGNORED
    }
  }
}

// State C: Final (target)
interface FinalContext {
  currentFrame: number            // ONLY source
  projectFrameRate: number
  // NO currentTime
  // NO scrubber.position
}
```

CRITICAL: At any point, we read from ONLY ONE source:
- State A: Read currentTime
- State B: Read currentFrame (ignore currentTime if present)
- State C: Read currentFrame

### 2.1 State Machine Context (MINIMAL & CLEAN)

```typescript
// TARGET STATE (After Migration)
interface VideoEditorContext {
  // THE SINGLE SOURCE OF TRUTH
  currentFrame: number              // ✅ The ONLY time position stored
  projectFrameRate: number          // ✅ Project-wide frame rate (30 fps)
  
  recording: {
    isRecording: boolean
    startFrame: number | null       // ✅ Frame when recording started
    durationFrames: number          // ✅ Total frames recorded
  }
  
  playback: {
    videoDurationFrames: number     // ✅ Total frames in video
    loadedVideoUrl: string | null
    currentClipId: string | null
    pendingSeekFrame: number | null // ✅ Target frame for seeking
    pendingClipTransition: TimelineClip | null
    clipSequence: TimelineClip[]
    currentSequenceIndex: number
  }
  
  timeline: {
    clips: TimelineClip[]           // ✅ With frame-based properties
    tracks: Track[]
    scrubber: {
      isDragging: boolean           // ✅ Just the dragging state
      snapEnabled: boolean
      // NO position field - reads currentFrame
    }
    viewport: {
      zoom: number
      scrollLeft: number
      pixelsPerFrame: number        // ✅ For display calculations
    }
  }
}
```

### 2.2 TimelineClip Interface

```typescript
interface TimelineClip {
  id: string
  sourceUrl: string
  
  // Frame-based properties ONLY
  startFrame: number      // ✅ Timeline position in frames
  durationFrames: number  // ✅ Clip length in frames  
  inFrame: number        // ✅ Trim start in frames
  outFrame: number       // ✅ Trim end in frames
  
  // NO derived time properties stored
}
```

### 2.3 Event Types

```typescript
type VideoEditorEvent = 
  | { type: 'FRAME.SET'; frame: number }
  | { type: 'FRAME.ADVANCE'; deltaFrames: number }
  | { type: 'PLAYBACK.SEEK_TO_FRAME'; frame: number }
  | { type: 'SCRUBBER.DRAG_TO_FRAME'; frame: number }
  | { type: 'VIDEO.LOADED'; durationFrames: number }
  | { type: 'VIDEO.FRAME_UPDATE'; frame: number }  // From time-based video element
```

---

## 3. Layer Responsibilities

### 3.1 State Machine Layer
**Responsibility**: Store EITHER time OR frames (never both), handle state transitions

```typescript
// State Machine actions - Update ONLY the active source
actions: {
  setCurrentFrame: assign(({ context, event }) => {
    // Only update if we're in frame-based mode
    if ('currentFrame' in context) {
      return { currentFrame: event.frame }
    }
    // Otherwise convert to time for legacy mode
    return { currentTime: event.frame / (context.projectFrameRate || 30) }
  }),
  
  handleScrubberDrag: assign(({ context, event }) => {
    // Update based on current system
    if ('currentFrame' in context) {
      return {
        currentFrame: event.frame,
        timeline: {
          ...context.timeline,
          scrubber: {
            ...context.timeline.scrubber,
            isDragging: true
            // NO position update - scrubber reads currentFrame
          }
        }
      }
    } else {
      // Legacy: Update currentTime
      return {
        currentTime: event.frame / (context.projectFrameRate || 30),
        timeline: {
          ...context.timeline,
          scrubber: {
            ...context.timeline.scrubber,
            position: event.frame / (context.projectFrameRate || 30),
            isDragging: true
          }
        }
      }
    }
  })
}
```

### 3.2 Query Layer
**Responsibility**: Read state, calculate derived values for display

```typescript
class VideoEditorQueries {
  // Primary query
  getCurrentFrame(): number {
    return this.stateMachine.getSnapshot().context.currentFrame
  }
  
  // Calculated queries (pure, deterministic)
  getCurrentTime(): number {
    const { currentFrame, projectFrameRate } = this.stateMachine.getSnapshot().context
    return currentFrame / projectFrameRate  // Simple calculation
  }
  
  getScrubberPosition(): number {
    // Scrubber position IS current frame
    return this.getCurrentFrame()
  }
  
  getScrubberPixels(): number {
    const { currentFrame, timeline } = this.stateMachine.getSnapshot().context
    return currentFrame * timeline.viewport.pixelsPerFrame
  }
  
  // Format for display
  getTimecode(): string {
    const frame = this.getCurrentFrame()
    const fps = this.stateMachine.getSnapshot().context.projectFrameRate
    return formatTimecode(frame, fps)  // "00:00:01:15" format
  }
}
```

### 3.3 Command Layer
**Responsibility**: Send frame-based commands only

```typescript
class VideoEditorCommands {
  // All commands use frames
  seekToFrame(frame: number): void {
    this.stateMachine.send({ type: 'PLAYBACK.SEEK_TO_FRAME', frame })
  }
  
  scrubToFrame(frame: number): void {
    this.stateMachine.send({ type: 'SCRUBBER.DRAG_TO_FRAME', frame })
  }
  
  // UI might provide time, convert at boundary
  seekToTime(seconds: number): void {
    const frame = Math.round(seconds * 30)  // Convert at entry point
    this.seekToFrame(frame)
  }
}
```

### 3.4 Integration Layer (VideoEditorSingleton)
**Responsibility**: Convert frames to time for services

```typescript
// Integration Layer - Simple conversion at service boundary
const handlePlaybackActions = () => {
  const { currentFrame, projectFrameRate, playback } = snapshot.context
  
  // Pending seek? Convert frame to time for video element
  if (playback.pendingSeekFrame !== null) {
    const seekTime = playback.pendingSeekFrame / projectFrameRate
    await playbackService.seek(seekTime)  // Service uses time
  }
}

// Convert incoming time events to frames
eventBus.on('playback.timeUpdate', ({ currentTime }) => {
  const frame = Math.round(currentTime * projectFrameRate)
  stateMachine.send({ type: 'VIDEO.FRAME_UPDATE', frame })
})
```

### 3.5 Service Layer
**Responsibility**: Work with external resources using their natural units (time)

```typescript
class PlaybackService {
  // Services use time (HTML5 video requirement)
  async seek(time: number): Promise<void> {
    this.videoElement.currentTime = time
  }
  
  // Emit time-based events (will be converted to frames)
  private handleTimeUpdate = () => {
    this.eventBus.emit('playback.timeUpdate', { 
      currentTime: this.videoElement.currentTime 
    })
  }
}
```

---

## 4. Implementation Steps (Revised)

### Phase 1: Core Frame Infrastructure (2 hours)

#### Step 1.1: Create Frame Utilities
```typescript
// src/lib/video-editor/utils/FrameCalculations.ts
export const PROJECT_FRAME_RATE = 30  // Standard web video

export const timeToFrame = (seconds: number, fps: number = PROJECT_FRAME_RATE): number => {
  return Math.round(seconds * fps)
}

export const frameToTime = (frame: number, fps: number = PROJECT_FRAME_RATE): number => {
  return frame / fps
}

export const alignTimeToFrame = (seconds: number, fps: number = PROJECT_FRAME_RATE): number => {
  // Ensures time aligns to frame boundary
  return frameToTime(timeToFrame(seconds, fps), fps)
}

export const formatTimecode = (frame: number, fps: number = PROJECT_FRAME_RATE): string => {
  const totalSeconds = frame / fps
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const frames = frame % fps
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}
```

#### Step 1.2: Add currentFrame to Context
```typescript
// Add frame-based properties to context
context: {
  currentFrame: 0,           // NEW: Primary source
  projectFrameRate: 30,      // NEW: Frame rate
  // currentTime stays for now but DON'T update both
  // ...
}
```

### Phase 2: State Machine Migration (3 hours)

#### Step 2.1: Update Actions to Use Frames
```typescript
// NEW: Frame-based actions - NEVER store both!
'FRAME.SET': {
  actions: assign(({ event }) => ({
    currentFrame: event.frame
    // DON'T set currentTime - let queries handle compatibility
  }))
},

'VIDEO.FRAME_UPDATE': {
  actions: assign(({ context, event }) => ({
    currentFrame: event.frame,
    // DON'T update currentTime
    timeline: {
      ...context.timeline,
      scrubber: {
        ...context.timeline.scrubber
        // No position update needed - scrubber reads currentFrame!
      }
    }
  }))
},

// During migration, update ONLY ONE based on migration phase
'VIDEO.TIME_UPDATE': {
  actions: assign(({ context, event }) => {
    // CRITICAL: Check migration phase to maintain SSOT
    if ('currentFrame' in context) {
      // Frame-based system active - update ONLY frame
      return {
        currentFrame: timeToFrame(event.time, context.projectFrameRate)
        // DO NOT touch currentTime even if it exists
      }
    } else {
      // Legacy system - update ONLY time
      return {
        currentTime: event.time
        // DO NOT add currentFrame here
      }
    }
  })
}
```

#### Step 2.2: Update Clip Interfaces
```typescript
// Convert existing clips to frame-based
const migrateClip = (clip: TimelineClip, fps: number): TimelineClip => ({
  ...clip,
  startFrame: timeToFrame(clip.startTime, fps),
  durationFrames: timeToFrame(clip.duration, fps),
  inFrame: timeToFrame(clip.inPoint, fps),
  outFrame: timeToFrame(clip.outPoint, fps)
})
```

### Phase 3: Integration Layer Updates (2 hours)

#### Step 3.1: Convert Events at Boundaries
```typescript
// VideoEditorSingleton.ts
eventBus.on('playback.timeUpdate', ({ currentTime }) => {
  const frame = timeToFrame(currentTime, snapshot.context.projectFrameRate)
  stateMachine.send({ type: 'VIDEO.FRAME_UPDATE', frame })
})

// Convert frame to time for seeks
if (playback.pendingSeekFrame !== null) {
  const seekTime = frameToTime(playback.pendingSeekFrame, context.projectFrameRate)
  await playbackService.seek(seekTime)
}
```

### Phase 4: Query/Command Updates (2 hours)

#### Step 4.1: Compatibility Queries (Critical for Migration)
```typescript
class VideoEditorQueries {
  // COMPATIBILITY LAYER - Handles both old and new systems
  getCurrentTime(): number {
    const context = this.stateMachine.getSnapshot().context
    
    // Migration Strategy: Try frame-based first, fall back to time-based
    if ('currentFrame' in context && context.currentFrame !== undefined) {
      // NEW SYSTEM: Calculate from frames
      return frameToTime(context.currentFrame, context.projectFrameRate || 30)
    } else if ('currentTime' in context) {
      // OLD SYSTEM: Use stored time
      return context.currentTime
    }
    
    // Fallback
    return 0
  }
  
  getCurrentFrame(): number {
    const context = this.stateMachine.getSnapshot().context
    
    // Try to get frame directly
    if ('currentFrame' in context && context.currentFrame !== undefined) {
      return context.currentFrame
    }
    
    // Fall back to calculating from time
    if ('currentTime' in context) {
      return timeToFrame(context.currentTime, context.projectFrameRate || 30)
    }
    
    return 0
  }
  
  // Scrubber compatibility
  getScrubberPosition(): number {
    const context = this.stateMachine.getSnapshot().context
    
    // NEW: Scrubber reads currentFrame
    if ('currentFrame' in context && context.currentFrame !== undefined) {
      return context.currentFrame
    }
    
    // OLD: Check if scrubber has position
    if (context.timeline?.scrubber?.position !== undefined) {
      return timeToFrame(context.timeline.scrubber.position, context.projectFrameRate || 30)
    }
    
    // FALLBACK: Use currentTime
    if ('currentTime' in context) {
      return timeToFrame(context.currentTime, context.projectFrameRate || 30)
    }
    
    return 0
  }
  
  // Helper to check migration status
  isUsingFrameBasedSystem(): boolean {
    const context = this.stateMachine.getSnapshot().context
    return 'currentFrame' in context && context.currentFrame !== undefined
  }
}
```

This compatibility layer allows:
1. Components don't need to change immediately
2. Can migrate State Machine incrementally  
3. No breaking changes during transition
4. Can verify system working before removing old properties

### Phase 5: UI Updates (3 hours)

#### Step 5.1: Update Timeline Display
```typescript
// Show both frame and time
<div className="timeline-position">
  <span>{currentFrame}f</span>
  <span>{formatTimecode(currentFrame, frameRate)}</span>
</div>
```

#### Step 5.2: Update Scrubber Component
```typescript
const Scrubber = () => {
  const currentFrame = queries.getCurrentFrame()
  const pixelsPerFrame = queries.getPixelsPerFrame()
  const position = currentFrame * pixelsPerFrame
  
  return <div className="scrubber" style={{ left: position }} />
}
```

### Phase 6: Cleanup (1 hour)

#### Step 6.1: Remove currentTime from Context
```typescript
// Remove all references to context.currentTime
// Remove timeline.scrubber.position
// Remove duplicate time tracking
```

#### Step 6.2: Remove Time-Based Event Handlers
```typescript
// Change all to frame-based
'VIDEO.TIME_UPDATE' -> 'VIDEO.FRAME_UPDATE'
'SCRUBBER.DRAG' position -> frame
```

---

## 5. Migration Strategy (TRUE SSOT Throughout)

### Safe Migration Path - NO DUAL STORAGE:
1. **Day 1**: Implement Phase 1 (utilities) + Compatibility Queries
2. **Day 2**: Start updating State Machine actions to use frames ONLY
3. **Day 3**: Integration Layer converts at boundaries
4. **Day 4**: Test with compatibility queries confirming frame system works
5. **Day 5**: Update UI components to use frame-based queries
6. **Day 6**: Remove `currentTime` and `scrubber.position` completely

### Migration Rules:
```typescript
// CRITICAL: Never update both in same action
if (MIGRATION_PHASE === 'FRAMES_ONLY') {
  // Update ONLY currentFrame
  context.currentFrame = newFrame
} else {
  // Update ONLY currentTime (legacy)
  context.currentTime = newTime
}

// Queries handle compatibility, NOT State Machine
```

### Feature Flags:
```typescript
const FEATURE_FLAGS = {
  USE_FRAME_BASED_SSOT: false,  // Switches queries to frame mode
  SHOW_FRAME_NUMBERS: false,    // UI shows frames
  // REMOVED: DEBUG_DUAL_SYSTEM - we never store both!
}
```

### Compatibility Query Strategy:
The queries act as an adapter layer during migration:
- State Machine can switch to frames immediately
- Queries provide backward compatibility
- Components continue working unchanged
- No dual storage violating SSOT

---

## 6. Testing Strategy

### Unit Tests:
```typescript
describe('Frame Calculations', () => {
  test('timeToFrame precision', () => {
    expect(timeToFrame(1.0, 30)).toBe(30)
    expect(timeToFrame(0.5, 30)).toBe(15)
    expect(timeToFrame(1.001, 30)).toBe(30)  // Rounds correctly
  })
  
  test('frame alignment', () => {
    const time = 1.034  // Misaligned
    const aligned = alignTimeToFrame(time, 30)
    expect(aligned).toBe(1.0333...)  // Exactly frame 31
  })
})
```

### Integration Tests:
```typescript
test('scrubber stays synced with video', async () => {
  // Play video
  commands.play()
  await wait(1000)
  
  // Check sync
  const currentFrame = queries.getCurrentFrame()
  const scrubberFrame = queries.getScrubberFrame()
  expect(scrubberFrame).toBe(currentFrame)  // Perfect sync!
})
```

---

## 7. Benefits of This Approach

### 1. **TRUE Single Source of Truth**
- currentFrame is THE ONLY time position stored
- Everything else calculated on demand
- No stale derived values

### 2. **Perfect Synchronization**
- Scrubber can't drift from video position
- All components read same source
- Frame-accurate precision

### 3. **Simple Mental Model**
- "Where are we? Check currentFrame"
- "Need time? Calculate from currentFrame"
- No confusion about which value to use

### 4. **Professional Features**
- Frame stepping (← → keys)
- Jump to specific frame
- SMPTE timecode display
- Frame-accurate editing

---

## 8. Common Pitfalls to Avoid

### ❌ DON'T: Store Calculated Values
```typescript
// BAD
context: {
  currentFrame: 30,
  currentTime: 1.0,  // Redundant!
  scrubberPosition: 1.0  // Also redundant!
}
```

### ✅ DO: Calculate When Needed
```typescript
// GOOD
context: {
  currentFrame: 30  // Only source
}
// Calculate time when needed
const time = currentFrame / frameRate
```

### ❌ DON'T: Let Services Store Position
```typescript
// BAD
playbackService.currentTime  // Service tracking position
```

### ✅ DO: Services Are Stateless
```typescript
// GOOD
playbackService.seek(time)  // Service just executes
```

---

## 9. Quick Reference

### State Machine:
- Stores: `currentFrame` only
- Receives: Frame-based events
- Calculates: Nothing (just stores)

### Query Layer:
- Reads: `currentFrame` from state
- Calculates: Time, pixels, timecode for display
- Stores: Nothing

### Command Layer:
- Accepts: Frames (or converts time to frames)
- Sends: Frame-based events
- Calculates: Time-to-frame conversion if needed

### Integration Layer:
- Converts: Frames to time for services
- Converts: Time to frames from services
- Stores: Nothing

### Service Layer:
- Uses: Time (HTML5 requirement)
- Stores: Nothing
- Emits: Time-based events (converted to frames)

---

## 10. SSOT Maintenance During Migration

### The Challenge:
How to migrate from time-based to frame-based without ever storing both?

### The Solution: Compatibility Queries
```typescript
// State Machine stores EITHER time OR frames, never both
context: {
  // Phase 1: Has currentTime only
  // Phase 2: Has currentFrame only  
  // NEVER: Has both at same time
}

// Queries provide consistent interface regardless of storage
queries.getCurrentTime()   // Works in both phases
queries.getCurrentFrame()  // Works in both phases
```

### Migration Sequence:
1. **Before Migration**: `currentTime` only exists
2. **Add Compatibility Queries**: Components keep working
3. **Switch State Machine**: Replace `currentTime` with `currentFrame` 
4. **Queries Adapt**: Automatically use new source
5. **Components Unchanged**: Still call same queries
6. **Remove Old Properties**: Clean up after verification

### What Makes This TRUE SSOT:
- At any moment, position is stored in EXACTLY ONE place
- During Phase 1: `currentTime` is the source
- During Phase 2: `currentFrame` is the source  
- NEVER both simultaneously
- Queries calculate missing representation on demand

---

## 11. Conclusion

This revised plan achieves TRUE Single Source of Truth by:
1. **Never storing both** time and frames simultaneously
2. **Using compatibility queries** instead of dual storage
3. **Calculating missing values** on demand
4. **Maintaining SSOT** throughout migration

The key insights:
- **Storage is the enemy of SSOT**
- **Calculation is cheap and safe**
- **Compatibility belongs in Query Layer, not State**

Ready for implementation starting with Phase 1 (Frame Infrastructure)!
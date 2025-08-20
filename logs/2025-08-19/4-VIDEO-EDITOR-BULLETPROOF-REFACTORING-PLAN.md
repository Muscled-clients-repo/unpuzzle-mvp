# Video Editor BULLETPROOF Architecture Refactoring Plan

## Current Architecture Violations Analysis

### ❌ **Principle 1 (SSOT) Violations:**
- **PlaybackService**: Stores clips array, currentClipId, globalTimeOffset
- **Services**: Storing business state instead of State Machine

### ❌ **Principle 2 (Event-Driven) Violations:**
- **Commands**: Directly calling service methods (`.play()`, `.seek()`)
- **Commands**: Directly accessing service properties (`.currentTime`)

### ❌ **Principle 4 (Service Boundary) Violations:**
- **PlaybackService**: Making business decisions about clip transitions
- **Services**: Not being stateless executors

## Target BULLETPROOF Architecture

### ✅ **Correct Flow:**
```
User → Component → Command → State Machine → Integration Layer → Service
                                     ↓
Service → Event → Integration Layer → State Machine → Component (via Query)
```

### ✅ **Principles Applied:**
- **P1**: ALL state in State Machine (business + technical)
- **P2**: ALL communication via typed events
- **P3**: State Machine controls all state changes
- **P4**: Services are stateless executors
- **P5**: Components only render

---

## Refactoring Implementation Plan

### Phase 1: Fix State Machine (Principle 1 - SSOT)

#### 1.1 Enhance State Machine Context
**File**: `src/lib/video-editor/state-machine/VideoEditorMachineV5.ts`

**CURRENT** (Partial state):
```typescript
context: {
  timeline: {
    clips: TimelineClip[]
    // Missing technical state
  }
}
```

**TARGET** (ALL state in State Machine per BULLETPROOF Principle 1):
```typescript
context: {
  timeline: {
    clips: TimelineClip[]
    scrubber: { position: number, isDragging: boolean }
    tracks: Track[]
  },
  playback: {
    // Business state
    isPlaying: boolean  
    currentClipId: string | null
    activeClipStartTime: number
    globalTimelinePosition: number
    pendingClipTransition: TimelineClip | null
    pendingSeek: { time: number } | null
    // Technical state (as per BULLETPROOF Principle 1)
    currentVideoTime: number
    videoDuration: number
    loadedVideoUrl: string | null
  },
  recording: {
    startTime: number | null
    duration: number
    isActive: boolean
    // Technical state
    mediaRecorderState: 'inactive' | 'recording' | 'paused'
  }
}
```

#### 1.2 Add State Machine Actions
**Add actions for ALL state (per BULLETPROOF Principle 1):**
```typescript
actions: {
  updateCurrentClip: assign({
    playback: ({ context, event }) => ({
      ...context.playback,
      currentClipId: event.clipId,
      activeClipStartTime: event.startTime
    })
  }),
  
  updateVideoTime: assign({
    playback: ({ context, event }) => ({
      ...context.playback,
      currentVideoTime: event.time,
      globalTimelinePosition: event.time
    })
  }),
  
  updateVideoLoaded: assign({
    playback: ({ context, event }) => ({
      ...context.playback,
      loadedVideoUrl: event.url,
      videoDuration: event.duration
    })
  })
}
```

### Phase 2: Strip Services to Stateless Executors (Principle 4)

#### 2.1 Refactor PlaybackService
**File**: `src/lib/video-editor/services/PlaybackService.ts`

**REMOVE** (Business state storage):
```typescript
// ❌ REMOVE ALL OF THIS
private currentClipId: string | null = null
private clips: Array<...> = []
private globalTimeOffset: number = 0
updateClips(clips: Array<...>): void { ... }
getClipAtPosition(position: number): { ... }
loadClipForPosition(position: number): Promise<void> { ... }
```

**TARGET** (Stateless executor):
```typescript
export class PlaybackService {
  private videoElement: HTMLVideoElement | null = null
  private animationFrameId: number | null = null
  
  constructor(private eventBus: TypedEventBus) {
    this.setupEventListeners()
  }

  setVideoElement(element: HTMLVideoElement): void {
    this.videoElement = element
    this.setupVideoEventListeners()
  }

  // ONLY respond to events, no public methods
  private setupEventListeners(): void {
    // Listen for service commands via events
    this.eventBus.on('service.loadVideo', ({ url }) => {
      if (this.videoElement) {
        this.videoElement.src = url
      }
    })
    
    this.eventBus.on('service.play', () => {
      if (this.videoElement) {
        this.videoElement.play()
        this.startTimeTracking()
      }
    })
    
    this.eventBus.on('service.pause', () => {
      if (this.videoElement) {
        this.videoElement.pause()
        this.stopTimeTracking()
      }
    })
    
    this.eventBus.on('service.seek', ({ time }) => {
      if (this.videoElement) {
        this.videoElement.currentTime = time
      }
    })
  }

  private setupVideoEventListeners(): void {
    if (!this.videoElement) return

    this.videoElement.addEventListener('loadedmetadata', () => {
      this.eventBus.emit('playback.videoLoaded', {
        duration: this.videoElement!.duration,
        url: this.videoElement!.src
      })
    })

    this.videoElement.addEventListener('ended', () => {
      this.eventBus.emit('playback.videoEnded', {})
    })
  }

  private startTimeTracking(): void {
    if (this.animationFrameId) return

    const updateTime = () => {
      if (this.videoElement && !this.videoElement.paused) {
        // Emit technical state to State Machine (SSOT)
        this.eventBus.emit('playback.timeUpdate', {
          currentTime: this.videoElement.currentTime
        })
        this.animationFrameId = requestAnimationFrame(updateTime)
      }
    }
    this.animationFrameId = requestAnimationFrame(updateTime)
  }

  private stopTimeTracking(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  // NO public methods except setVideoElement
  // Service is now a pure event-driven executor
}
```

### Phase 3: Fix Commands Layer (Principle 2 - Event-Driven)

#### 3.1 Remove Direct Service Calls
**File**: `src/lib/video-editor/commands/VideoEditorCommands.ts`

**REMOVE** (Direct service calls):
```typescript
// ❌ REMOVE ALL DIRECT SERVICE ACCESS
await this.playbackService.seek(0)
await this.playbackService.play()
scrubberPosition !== this.playbackService.currentTime
```

**TARGET** (Event-only commands):
```typescript
export class VideoEditorCommands {
  constructor(
    private stateMachine: StateMachine
    // NO service dependencies - commands only talk to State Machine
  ) {}

  // Commands only send events to State Machine
  play(): void {
    this.stateMachine.send({ type: 'PLAYBACK.PLAY' })
    // That's it! State Machine handles the orchestration
  }

  pause(): void {
    this.stateMachine.send({ type: 'PLAYBACK.PAUSE' })
  }

  seek(time: number): void {
    this.stateMachine.send({ type: 'PLAYBACK.SEEK', time })
  }

  deleteSelectedClips(): void {
    this.stateMachine.send({ type: 'CLIPS.DELETE_SELECTED' })
  }

  // NO direct service access
  // NO business logic - just event forwarding
}
```

### Phase 4: Create Integration Layer (Missing Component)

#### 4.1 Enhance VideoEditorSingleton
**File**: `src/lib/video-editor/VideoEditorSingleton.ts`

**ADD** (State Machine observation and event orchestration):
```typescript
export function createVideoEditorInstance(): VideoEditorInstance {
  // ... existing initialization ...

  // ✅ CORRECTED: State Machine-driven orchestration (NO business logic here)
  // Integration layer only forwards State Machine decisions to services
  
  stateMachine.subscribe((snapshot) => {
    // Only forward pre-calculated State Machine decisions
    if (snapshot.matches('playing') && snapshot.changed) {
      // State Machine has already determined what to play
      if (snapshot.context.playback.pendingClipTransition) {
        const clip = snapshot.context.playback.pendingClipTransition
        eventBus.emit('service.loadVideo', { url: clip.sourceUrl })
        const localTime = snapshot.context.playback.globalTimelinePosition - clip.startTime
        eventBus.emit('service.seek', { time: Math.max(0, localTime) })
        eventBus.emit('service.play', {})
      }
    }
    
    if (snapshot.matches('paused') && snapshot.changed) {
      eventBus.emit('service.pause', {})
    }
    
    // Forward seek decisions (State Machine calculates, Integration forwards)
    if (snapshot.context.playback.pendingSeek) {
      eventBus.emit('service.seek', { time: snapshot.context.playback.pendingSeek.time })
    }
  })

  // Forward service events to State Machine
  eventBus.on('playback.timeUpdate', ({ currentTime }) => {
    stateMachine.send({ type: 'VIDEO.TIME_UPDATE', time: currentTime })
  })

  eventBus.on('playback.videoEnded', () => {
    stateMachine.send({ type: 'VIDEO.ENDED' })
  })

  eventBus.on('playback.videoLoaded', ({ duration, url }) => {
    stateMachine.send({ type: 'VIDEO.LOADED', duration, url })
  })

  return { commands, queries, cleanup, stateMachine }
}

// ❌ REMOVED: Business logic moved to State Machine actions
// Integration layer has NO business logic
```

### Phase 5: Update Event Types (Principle 2)

#### 5.1 Add Service Command Events
**File**: `src/lib/video-editor/events/EventBus.ts`

**ADD** (Service command events):
```typescript
export interface VideoEditorEvents {
  // ... existing events ...
  
  // Service command events (State Machine → Service)
  'service.loadVideo': { url: string }
  'service.play': {}
  'service.pause': {}
  'service.seek': { time: number }
  
  // Service status events (Service → State Machine)
  'playback.timeUpdate': { currentTime: number }
  'playback.videoLoaded': { duration: number; url: string }
  'playback.videoEnded': {}
  
  // State Machine events
  'VIDEO.TIME_UPDATE': { time: number }
  'VIDEO.LOADED': { duration: number; url: string }
  'VIDEO.ENDED': {}
}
```

### Phase 6: Multi-Clip Playback Logic

#### 6.1 Add State Machine Actions for Multi-Clip
**File**: `src/lib/video-editor/state-machine/VideoEditorMachineV5.ts`

**ADD** (Multi-clip orchestration - ALL business logic in State Machine):
```typescript
actions: {
  handleVideoEnded: assign(({ context }) => {
    // State Machine decides clip transitions (business logic)
    const currentClip = context.timeline.clips.find(c => c.id === context.playback.currentClipId)
    if (currentClip) {
      const nextClip = context.timeline.clips.find(c => 
        c.startTime >= currentClip.startTime + currentClip.duration
      )
      if (nextClip) {
        // Pre-calculate transition for Integration layer
        return {
          ...context,
          playback: {
            ...context.playback,
            currentClipId: nextClip.id,
            activeClipStartTime: nextClip.startTime,
            pendingClipTransition: nextClip,
            globalTimelinePosition: nextClip.startTime
          }
        }
      }
    }
    // No more clips, stop playback
    return {
      ...context,
      playback: { 
        ...context.playback, 
        isPlaying: false,
        pendingClipTransition: null
      }
    }
  }),
  
  handlePlayRequest: assign(({ context }) => {
    // State Machine calculates which clip should play
    const position = context.timeline.scrubber.position
    const targetClip = context.timeline.clips.find(clip => 
      position >= clip.startTime && position < clip.startTime + clip.duration
    )
    
    return {
      ...context,
      playback: {
        ...context.playback,
        isPlaying: true,
        currentClipId: targetClip?.id || null,
        pendingClipTransition: targetClip || null,
        globalTimelinePosition: position
      }
    }
  })
}

on: {
  'VIDEO.ENDED': {
    actions: 'handleVideoEnded'
  },
  'PLAYBACK.PLAY': {
    actions: 'handlePlayRequest'
  }
}
```

---

## Incremental Implementation Plan

**IMPORTANT**: Each phase requires manual testing and user approval before proceeding to the next phase.

### Phase 1: Strip PlaybackService Business State
**Changes**: Remove `clips`, `currentClipId`, `globalTimeOffset` from PlaybackService
**Expected Functionality**: Single clip playback, recording, basic video controls still work
**Manual Tests Required**:
- ✅ Record a video clip
- ✅ Play the recorded clip (full playback)
- ✅ Pause the clip
- ✅ Seek within the clip
- ✅ UI controls respond correctly

**⚠️ USER APPROVAL REQUIRED BEFORE PHASE 2**

---

### Phase 2: Remove Direct Service Calls from Commands
**Changes**: Commands only send events to State Machine (no direct service calls)
**Expected Functionality**: All current features work but via events
**Manual Tests Required**:
- ✅ Play/pause buttons work
- ✅ Seeking works
- ✅ Recording start/stop works
- ✅ No functionality regression

**⚠️ USER APPROVAL REQUIRED BEFORE PHASE 3**

---

### Phase 3: Enhance State Machine with Missing State
**Changes**: Add technical state (video time, duration) to State Machine
**Expected Functionality**: Same as Phase 2 but with centralized state
**Manual Tests Required**:
- ✅ All Phase 2 tests pass
- ✅ State Machine reflects correct video time
- ✅ Queries return correct state

**⚠️ USER APPROVAL REQUIRED BEFORE PHASE 4**

---

### Phase 4: Create Event-Driven Integration Layer
**Changes**: Singleton orchestrates between State Machine and Services via events
**Expected Functionality**: Same as Phase 3 but fully event-driven
**Manual Tests Required**:
- ✅ All previous functionality preserved
- ✅ No direct service dependencies
- ✅ Event flow working correctly

**⚠️ USER APPROVAL REQUIRED BEFORE PHASE 5**

---

### Phase 5: Add Multi-Clip Transition Logic
**Changes**: State Machine handles clip-to-clip transitions
**Expected Functionality**: Multi-clip playback works seamlessly
**Manual Tests Required**:
- ✅ Record multiple clips
- ✅ Clips play in sequence without gaps
- ✅ Scrubber moves smoothly across clips
- ✅ Play/pause works during multi-clip playback
- ✅ Seeking works across clip boundaries

**⚠️ FINAL APPROVAL REQUIRED FOR COMPLETION**

---

## Expected Outcomes

### ✅ **After Refactoring:**
- **Principle 1**: ALL state in State Machine (no duplicate state)
- **Principle 2**: ALL communication via events (no direct calls)
- **Principle 3**: State Machine controls all state (full authority)
- **Principle 4**: Services are stateless (pure executors)
- **Principle 5**: Components stay pure (no change needed)

### ✅ **Architecture Flow:**
```
User clicks play → Component → Command → State Machine
                                    ↓
State Machine updates state → Singleton observes → Service gets event
                                    ↓
Service manipulates video → Video changes → Service emits event
                                    ↓
Event → Singleton → State Machine → Component (via Query)
```

### ✅ **Multi-Clip Playback:**
- State Machine decides which clip should play
- Singleton orchestrates clip transitions
- Services just play what they're told
- Seamless playback across multiple clips

## Implementation Rules

1. **No Phase Skipping**: Each phase must be completed and approved before the next
2. **Manual Testing Required**: User must manually test all specified functionality
3. **Approval Gate**: Explicit user approval required to proceed to next phase
4. **Rollback Ready**: Each phase can be rolled back if issues found
5. **Incremental Progress**: UI/functionality changes visible after each phase

This incremental approach ensures the refactoring brings the codebase into 100% compliance with BULLETPROOF architecture principles while maintaining all existing functionality at every step.
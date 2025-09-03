# Video Editor Refactor Plan

**Date:** 2025-08-22
**Time:** 04:00 AM EST
**Purpose:** Comprehensive refactor plan to fix scrubber/preview desync and simplify architecture

## Current State Assessment

### Critical Issues
1. **Scrubber resets to 0 while preview continues playing** - Fundamental state desync
2. **Multiple competing time update systems** - Race conditions between PlaybackService, GapPlaybackService, and State Machine
3. **500+ line Integration Layer** - Monolithic VideoEditorSingleton acting as "God Object"
4. **1000+ line State Machine** - Mixing business logic with technical concerns
5. **Circular dependencies** - Events flow in circles causing timing conflicts

### Complexity Metrics
- **47 event types** across the system
- **3 different time calculation systems** (frames, seconds, timeline position)
- **Multiple boundary detection mechanisms** competing with each other
- **Duplicate prevention logic** indicating underlying race conditions

## Root Cause: Conflicting Control Systems

```
Current Flow (PROBLEMATIC):
PlaybackService → timeUpdate → Integration Layer → State Machine → Update Scrubber
     ↑                                                   ↓
     └────── Integration Layer processes pending ────────┘
              actions and calls PlaybackService
```

This circular flow causes:
- Scrubber updates from multiple sources simultaneously
- Preview and scrubber using different state sources
- Race conditions during clip transitions

## Refactor Strategy

### Phase 1: Immediate Stabilization (1 hour)
**Goal:** Stop the bleeding - fix critical desync issues

#### 1.1 Consolidate Time Updates
- **Remove** competing time update systems
- **Single source**: PlaybackService forwards native video element timeupdate events only
- **Disable** Option A boundary monitoring (it's redundant)
- **Remove** GapPlaybackService time updates (use state machine instead)
- **Note**: PlaybackService acts as event forwarder, not event generator

#### 1.2 Fix Scrubber Reset Issue
- **Track** which system is updating scrubber position
- **Prevent** automatic reset to 0 during clip transitions
- **Synchronize** scrubber with actual video currentTime

#### 1.3 Simplify Clip Transitions
- **Remove** complex clip reuse logic
- **Always** load fresh video for each clip
- **Clear** all pending operations before transitions

### Phase 2: Architecture Simplification (2 hours)
**Goal:** Reduce complexity and establish clear responsibilities

#### 2.1 Slim Down Integration Layer (VideoEditorSingleton)
**From 500+ lines to <150 lines**

Current responsibilities (TOO MANY):
- Event forwarding
- State observation
- Business logic
- Clip transition management
- Boundary detection
- Gap coordination
- Seek optimization

**New responsibility (SINGLE):**
- Wire services to state machine (pure adapter)

```typescript
// NEW VideoEditorSingleton - Just wiring
class VideoEditorSingleton {
  constructor() {
    // Wire service events to state machine
    playbackService.on('timeUpdate', (time) => 
      stateMachine.send({ type: 'TIME_UPDATE', time })
    )
    
    // Wire state machine to services
    stateMachine.subscribe((state) => {
      if (state.changed.playbackUrl) {
        playbackService.loadVideo(state.context.playbackUrl)
      }
    })
  }
}
```

#### 2.2 State Machine Refactor
**Split into smaller, focused machines**

```typescript
// Main coordinator
const editorMachine = createMachine({
  // Only coordinates between sub-machines
})

// Playback-specific machine
const playbackMachine = createMachine({
  states: {
    idle: {},
    loading: {},
    playing: {},
    paused: {}
  }
})

// Timeline-specific machine
const timelineMachine = createMachine({
  // Manages clips, tracks, segments
})

// Scrubber-specific machine
const scrubberMachine = createMachine({
  // Manages position, dragging
})
```

#### 2.3 Service Simplification
**Make services mostly stateless (minimal state for event forwarding)**

```typescript
// BEFORE: Services have complex state and business logic
class PlaybackService {
  private currentTime = 0
  private isPlaying = false
  private clipBoundaries = []
  // Complex state management and business logic
}

// AFTER: Services are thin wrappers that only forward events
class PlaybackService {
  private videoElement: HTMLVideoElement | null = null
  private eventBus: EventBus
  
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }
  
  setVideoElement(element: HTMLVideoElement) {
    this.videoElement = element
    // Only forward native events, no business logic
    element.addEventListener('timeupdate', () => {
      this.eventBus.emit('timeUpdate', element.currentTime)
    })
    element.addEventListener('ended', () => {
      this.eventBus.emit('videoEnded')
    })
  }
  
  // Simple commands that delegate to video element
  play(): Promise<void> {
    return this.videoElement?.play() ?? Promise.reject()
  }
  
  pause(): void {
    this.videoElement?.pause()
  }
  
  seek(time: number): void {
    if (this.videoElement) {
      this.videoElement.currentTime = time
    }
  }
}
```

**Key principle:** Services only need minimal state to:
- Hold reference to resources (video element)
- Forward native events to state machine
- Execute commands from state machine
- NO business logic or complex state

### Phase 3: Time System Unification (1 hour)
**Goal:** Single, consistent time calculation system

#### 3.1 Choose One System
**Decision: Use FRAMES as the single source of truth**
- All positions stored as frame numbers
- Convert to seconds only for display/video element
- Eliminates floating-point precision issues

#### 3.2 Create Time Translation Layer
```typescript
class TimeCoordinator {
  // Single place for all time conversions
  frameToTimeline(frame: number, clip: Clip): number
  timelineToFrame(position: number, clip: Clip): number
  frameToVideo(frame: number): number
  videoToFrame(time: number): number
}
```

#### 3.3 Update All Components
- Store scrubber position as frames
- Store clip boundaries as frames
- Convert only at boundaries (UI display, video element)

### Phase 4: Event System Redesign (1 hour)
**Goal:** Clear, unidirectional event flow

#### 4.1 Reduce Event Types
**From 47 to ~15 core events**

```typescript
// Core events only
type EditorEvents = 
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SEEK'; frame: number }
  | { type: 'TIME_UPDATE'; frame: number }
  | { type: 'CLIP_ENDED' }
  | { type: 'ADD_CLIP'; clip: Clip }
  | { type: 'DELETE_CLIP'; id: string }
  | { type: 'SPLIT_CLIP'; frame: number }
  // ... minimal set
```

#### 4.2 Unidirectional Flow
```
UI → Commands → State Machine → Services → UI Updates
                      ↑
                      │
                 Queries (read-only)
```

**No circular dependencies!**

### Phase 5: Gap Handling Simplification (30 min)
**Goal:** Integrate gaps into normal playback flow

#### 5.1 Remove GapPlaybackService
Gaps are just timeline positions without clips

#### 5.2 Handle in State Machine
```typescript
// In playback machine
playing: {
  always: [
    {
      target: 'playingGap',
      cond: 'isInGap'
    }
  ]
},
playingGap: {
  // Update scrubber position with requestAnimationFrame
  // No video playing, just position updates
}
```

## Implementation Order

### Day 1: Critical Fixes
1. **Hour 1-2:** Fix scrubber reset issue
   - Identify exact code causing reset to 0
   - Add guards to prevent unwanted resets
   - Test with trimmed clips

2. **Hour 3-4:** Consolidate time updates
   - Disable Option A boundary monitoring
   - Remove GapPlaybackService updates
   - Single source: PlaybackService

### Day 2: Architecture Refactor
1. **Hour 1-2:** Slim down Integration Layer
   - Extract business logic to state machine
   - Remove optimization attempts
   - Pure event forwarding only

2. **Hour 3-4:** Split state machine
   - Create focused sub-machines
   - Clear separation of concerns
   - Remove technical state from business logic

### Day 3: Polish & Testing
1. **Hour 1-2:** Event system cleanup
   - Reduce event types
   - Ensure unidirectional flow
   - Remove circular dependencies

2. **Hour 3-4:** Comprehensive testing
   - Test all trim scenarios
   - Test gap transitions
   - Test seeking during playback

## Success Metrics

### Must Fix
✅ Scrubber never resets to 0 unexpectedly
✅ Preview and scrubber always in sync
✅ Smooth clip transitions
✅ Gaps handled without special services

### Code Quality
✅ Integration Layer < 150 lines
✅ No circular dependencies
✅ Services are stateless
✅ Single time system (frames)

### Performance
✅ No race conditions
✅ Predictable state updates
✅ Smooth 30fps scrubber updates

## Risk Mitigation

### Backup Current State
```bash
git add -A
git commit -m "Pre-refactor backup"
git checkout -b refactor-backup
```

### Incremental Changes
- Each phase can be tested independently
- Rollback points after each phase
- Keep existing code until new code proven

### Testing Strategy
1. Manual testing after each change
2. Console logging for state transitions
3. Video recording of issues for comparison

## Alternative: Minimal Fix

If full refactor is too risky, minimal fix:

1. **Add scrubber position lock** during clip transitions
2. **Debounce all position updates** to prevent races
3. **Sequence operations** with Promise chains
4. **Disable problematic optimizations**

```typescript
let scrubberLocked = false

function updateScrubber(position: number) {
  if (scrubberLocked) return
  // Update position
}

function transitionClip() {
  scrubberLocked = true
  await loadVideo()
  await seek()
  scrubberLocked = false
}
```

## Decision Points

### Option A: Full Refactor (Recommended)
**Pros:**
- Fixes root causes
- Sustainable architecture
- Easier future development

**Cons:**
- 3 days of work
- Risk of new bugs
- Testing overhead

### Option B: Minimal Fix
**Pros:**
- Quick (few hours)
- Less risky
- Immediate relief

**Cons:**
- Technical debt remains
- Issues will resurface
- Harder to maintain

## Next Steps

1. **Review this plan** and decide on approach
2. **Create backup branch** for safety
3. **Start with Phase 1** (critical fixes)
4. **Test thoroughly** after each phase
5. **Document changes** for future reference

## Conclusion

The video editor has accumulated significant technical debt due to:
- Multiple systems trying to control the same state
- Circular dependencies creating race conditions
- Lack of clear separation of concerns

This refactor plan addresses these issues systematically, starting with critical fixes and progressing to architectural improvements. The goal is a simpler, more maintainable system where the scrubber and preview are always in sync.
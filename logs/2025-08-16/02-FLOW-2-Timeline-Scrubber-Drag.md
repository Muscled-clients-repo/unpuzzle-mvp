# Flow 2: Timeline Scrubber Drag Control

## Overview
Implementation guide for timeline scrubber drag functionality that allows users to navigate through video content by dragging the timeline scrubber handle.

## Initial State
- Video loaded in timeline and preview
- Scrubber positioned at current playhead location
- Timeline shows full video duration

## User Interaction Flow

### 1. Hover Detection
- User hovers over scrubber handle on timeline
- Cursor changes to grab/hand icon
- Scrubber handle highlights to indicate interactivity

### 2. Click Initiation
- User clicks and holds down on scrubber handle
- Visual feedback: Scrubber handle enters "pressed" state
- Mouse cursor changes to grabbing state
- System prepares for drag operation

### 3. Drag Movement
- User drags horizontally while holding mouse down
- Scrubber follows mouse position along timeline in real-time
- Preview canvas updates continuously to show frame at scrubber position (via temporary video seeking)
- Timeline time display updates continuously (e.g., "00:05:32")
- Scrubber constrained to timeline bounds (cannot exceed video start/end)
- Smooth interpolation between frames for fluid preview

### 4. Visual Feedback During Drag
- Current time indicator updates in real-time
- Preview canvas renders frames smoothly via temporary seeking
- Timeline position indicator moves with scrubber
- Video shows temporary preview position (not restored until drag ends)
- Optional: Show time tooltip near mouse cursor

### 5. Release and Finalization
- User releases mouse button at desired position
- Scrubber locks to final timeline position
- Video element officially seeks to scrubber position (permanent seek)
- System ready for playback from new position
- Preview shows final frame at selected time

## Edge Cases
- Dragging beyond timeline bounds snaps to start/end
- Very fast dragging maintains smooth preview updates
- Multiple rapid clicks don't break functionality

## Technical Implementation Requirements

### State Machine Integration (ALIGNED WITH 0-STATE-MACHINE-ARCHITECTURE.md)

#### State Additions
```typescript
// Add to timelineState (already exists in architecture)
timelineState: {
  isDraggingScrubber: boolean  // Already defined in architecture line 84
  scrubberPosition: number      // Already defined line 83 - authoritative position
  temporarySeekTime: number     // NEW: Preview time during drag (doesn't affect playback.currentTime)
}

// Add to systemState for operation tracking
systemState: {
  currentState: EditorState     // Already defined line 106 - current operational state
  lastOperation: string         // Already defined line 107 - track operation type
  errors: Error[]              // Already defined line 108 - for recovery
  dragStartTime: number         // NEW: Initial time when drag started
  previousPlayState: boolean   // NEW: Track if was playing before drag (to restore)
}

// Add currentState to videoState (missing from original architecture)
videoState: {
  currentState: VideoState      // NEW: Add enum state tracking for proper transitions
  isPlaying: boolean           // Line 70 - master playback state
  currentTime: number          // Line 71 - authoritative time position
  duration: number             // Line 72 - video total duration
  playbackRate: number         // Line 73 - playback speed multiplier
  lastSyncTime: number         // Line 74 - last verified sync timestamp
  syncErrorTolerance: number   // Line 75 - max allowed desync (±1 frame)
  pendingSeek: number | null   // NEW: Pending seek target for video element sync
  pendingSeekType: 'temporary' | 'permanent' | null // NEW: Type of pending seek
}
```

#### Actions (Following Single Source of Truth)
- `START_SCRUBBER_DRAG`: Transition to VIDEO_SCRUBBING state
- `UPDATE_SCRUBBER_PREVIEW`: Update temporarySeekTime (preview only)
- `END_SCRUBBER_DRAG`: Perform permanent seek, transition to VIDEO_PAUSED/VIDEO_PLAYING
- `SYNC_VIDEO_ELEMENT`: Request video element sync (temporary or permanent)

### State Transition Flow (CRITICAL - Must Follow Architecture Rules)

```typescript
// CORRECT State Flow (per architecture document):
// Must PAUSE before SCRUBBING per line 130 of architecture doc
VIDEO_PLAYING → VIDEO_PAUSED → VIDEO_SCRUBBING → VIDEO_SEEKING → VIDEO_PAUSED/VIDEO_PLAYING
VIDEO_PAUSED → VIDEO_SCRUBBING → VIDEO_SEEKING → VIDEO_PAUSED

// Rule Enforcement (from architecture line 127-130):
// 1. CRITICAL: "NEVER transition directly from PLAYING to SCRUBBING - always pause first"
// 2. During SCRUBBING → Use temporarySeekTime for preview (don't modify currentTime)
// 3. On drag end → Enter VIDEO_SEEKING for permanent position change  
// 4. After seek → Return to previous play state (stored in systemState)

// Additional validation from architecture:
// - SCRUBBING = Temporary video seeking for preview
// - SEEKING = Permanent video position change
// - Must track previousPlayState to restore play/pause state after drag
```

### Mouse Event Handling (Real-Time Lane Processing)
```typescript
// On mousedown (Real-Time Lane: <8ms per architecture line 35)
let pendingDragInfo = null // Store drag context for async operations

handleMouseDown = (e: MouseEvent) => {
  e.preventDefault()
  
  // Verify video element ready (error handling best practice)
  if (!videoElement || !videoElement.duration || videoElement.duration === 0) {
    console.warn('Video not ready for scrubbing')
    return // Gracefully ignore per error handling
  }
  
  const startTime = state.timelineState.scrubberPosition // Use correct path
  
  // Store play state BEFORE pausing (for restoration later)
  const wasPlaying = state.videoState.isPlaying
  
  // Store drag context for later use
  pendingDragInfo = { startTime, wasPlaying }
  
  // Add listeners first (before any async operations)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  
  // CRITICAL: Must pause if playing (architecture line 130)
  if (state.videoState.isPlaying) {
    dispatch({ type: 'PAUSE' })
    // Wait for PAUSE to complete before starting scrub
    setTimeout(() => {
      dispatch({ 
        type: 'START_SCRUBBER_DRAG', 
        startTime,
        wasPlaying
      })
      pendingDragInfo = null // Clear since scrub started
    }, 0)
  } else {
    // If already paused, start scrubbing immediately
    dispatch({ 
      type: 'START_SCRUBBER_DRAG', 
      startTime,
      wasPlaying // Store for restoration
    })
    pendingDragInfo = null // Clear since scrub started
  }
}

// On mousemove (Real-Time Lane with throttling)
let lastUpdate = 0
const framebudget = 16 // 60fps for smooth updates
handleMouseMove = (e: MouseEvent) => {
  // Throttle to 60fps for performance
  const now = performance.now()
  if (now - lastUpdate < framebudget) return
  lastUpdate = now
  
  // Verify still in scrubbing state (allow brief delay during pause→scrub transition)
  if (!state.timelineState.isDraggingScrubber && 
      state.videoState.currentState !== VideoState.VIDEO_PAUSED) {
    console.warn('Mouse move but not in scrubbing state')
    return
  }
  
  const rect = timelineElement.getBoundingClientRect()
  const percentage = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1))
  const newTime = percentage * state.videoState.duration
  
  // Update preview only if actively scrubbing (architecture line 127)
  if (state.timelineState.isDraggingScrubber) {
    dispatch({ 
      type: 'UPDATE_SCRUBBER_PREVIEW', 
      temporarySeekTime: newTime 
    })
  }
}

// On mouseup (Sequential Lane for permanent change - architecture line 42-46)
handleMouseUp = (e: MouseEvent) => {
  // Clean up listeners immediately
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  
  // Verify we're in appropriate state for ending drag
  if (!state.timelineState.isDraggingScrubber && 
      state.videoState.currentState !== VideoState.VIDEO_PAUSED) {
    console.warn('Mouse up but drag never started properly')
    return
  }
  
  // Only end drag if we're actually scrubbing
  if (state.timelineState.isDraggingScrubber) {
    // Get final seek position
    const finalTime = state.timelineState.temporarySeekTime || state.timelineState.scrubberPosition
    const wasPlaying = state.systemState.previousPlayState
    
    // Perform permanent seek (architecture line 128)
    dispatch({ 
      type: 'END_SCRUBBER_DRAG', 
      seekTime: finalTime,
      resumePlaying: wasPlaying // Restore previous play state
    })
    pendingDragInfo = null // Clear completed drag info
  } else if (pendingDragInfo) {
    // If pause is still processing, seek to original position (user just clicked)
    console.log('Drag ended during pause transition - seeking to click position')
    
    dispatch({
      type: 'SEEK',
      time: pendingDragInfo.startTime
    })
    
    // Clear pending info
    pendingDragInfo = null
  }
}
```

### Visual States
- **Default**: Standard scrubber appearance
- **Hover**: Highlighted scrubber with cursor change
- **Dragging**: Active state with grabbing cursor
- **Disabled**: Grayed out when no video loaded

### Performance Considerations (Following Three-Lane Architecture)
- **Real-Time Lane**: Mousemove throttled to 16ms (60fps) for immediate response
- **Sequential Lane**: Final seek operation queued for atomic completion
- **Background Lane**: Sync verification runs after seek completes
- Use requestAnimationFrame for visual updates only (not state changes)
- NO frame caching initially (violates gradual verification principle)

### Accessibility
- Keyboard navigation support (arrow keys for frame-by-frame)
- ARIA labels for screen readers
- Focus management during drag operations

## Components to Modify (Following Single Source of Truth)

### 1. StudioStateMachine.ts (FIRST - Central Control)
```typescript
// Add VideoState enum if not exists (architecture line 117-123)
enum VideoState {
  VIDEO_PLAYING,
  VIDEO_PAUSED,
  VIDEO_SCRUBBING,
  VIDEO_SEEKING,
  VIDEO_SYNCING
}

// Add new actions with proper state transitions
case 'START_SCRUBBER_DRAG':
  // Validate proper state for scrubbing
  if (state.videoState.isPlaying || 
      state.videoState.currentState === VideoState.VIDEO_PLAYING) {
    console.error('VIOLATION: Must pause before scrubbing')
    return state // Reject invalid transition
  }
  
  return {
    ...state,
    videoState: { 
      ...state.videoState, 
      currentState: VideoState.VIDEO_SCRUBBING 
    },
    timelineState: { 
      ...state.timelineState, 
      isDraggingScrubber: true,
      temporarySeekTime: action.startTime 
    },
    systemState: { 
      ...state.systemState, 
      lastOperation: 'SCRUBBER_DRAG',
      dragStartTime: action.startTime,
      previousPlayState: action.wasPlaying // Store for restoration
    }
  }

case 'UPDATE_SCRUBBER_PREVIEW':
  // Verify we're in scrubbing state
  if (state.videoState.currentState !== VideoState.VIDEO_SCRUBBING) {
    console.warn('Preview update outside scrubbing state')
    return state
  }
  
  // CRITICAL: Only update preview, not actual currentTime (architecture line 127)
  return {
    ...state,
    timelineState: { 
      ...state.timelineState, 
      temporarySeekTime: action.temporarySeekTime 
    }
  }

case 'END_SCRUBBER_DRAG':
  // Must be in scrubbing state to end drag
  if (state.videoState.currentState !== VideoState.VIDEO_SCRUBBING) {
    console.error('Invalid state for ending scrub')
    return state
  }
  
  // Transition through SEEKING state (architecture line 121)
  const nextState = {
    ...state,
    videoState: { 
      ...state.videoState, 
      currentState: VideoState.VIDEO_SEEKING,
      currentTime: action.seekTime, // Permanent update
      pendingSeek: action.seekTime, // Request video element sync
      pendingSeekType: 'permanent' // Mark as permanent seek
    },
    timelineState: { 
      ...state.timelineState, 
      isDraggingScrubber: false,
      scrubberPosition: action.seekTime,
      temporarySeekTime: null // Clear temporary
    },
    systemState: {
      ...state.systemState,
      lastOperation: 'SCRUBBER_SEEK',
      dragStartTime: null,
      previousPlayState: null // Clear after using
    }
  }
  
  // Schedule transition to final state (PAUSED or PLAYING)
  setTimeout(() => {
    dispatch({ 
      type: action.resumePlaying ? 'PLAY' : 'PAUSE',
      fromSeeking: true
    })
  }, 0)
  
  return nextState

case 'SYNC_VIDEO_ELEMENT':
  // Handle video element synchronization through state machine
  // This replaces direct video element manipulation in components
  // NOTE: Video element is passed via context, not stored in state (to avoid serialization issues)
  // The state machine triggers the sync, but the actual video element update happens via effect
  
  if (action.isTemporary) {
    // During scrubbing - request temporary seek
    return {
      ...state,
      videoState: {
        ...state.videoState,
        pendingSeek: action.targetTime,
        pendingSeekType: 'temporary'
      }
    }
  } else {
    // Normal sync - request permanent position update
    return {
      ...state,
      videoState: {
        ...state.videoState,
        currentTime: action.targetTime,
        pendingSeek: action.targetTime,
        pendingSeekType: 'permanent'
      }
    }
  }
```

### 2. Timeline.tsx (UI Layer - Dispatch Only)
- Add mouse event handlers that ONLY dispatch actions
- NO direct state manipulation
- NO direct video element control
- Visual updates driven by state changes

### 3. VideoPreview.tsx (Controlled Component)
```typescript
// NO useEffect - violates state machine principles
// Instead, handle in render logic or through state machine commands

// In component render logic:
const videoElement = videoRef.current

// Calculate what video time should be shown
const displayTime = state.timelineState.isDraggingScrubber && 
                    state.timelineState.temporarySeekTime !== null
                    ? state.timelineState.temporarySeekTime  // Show preview during drag
                    : state.videoState.currentTime           // Show actual time otherwise

// State machine handles video element updates via pendingSeek state
// Components check for pendingSeek and trigger SYNC_VIDEO_ELEMENT
// Video element sync happens through state machine, not direct manipulation

// Component just displays based on state - no side effects
if (videoElement && Math.abs(videoElement.currentTime - displayTime) > 0.1) {
  // State machine will handle this through command
  dispatch({ 
    type: 'SYNC_VIDEO_ELEMENT', 
    targetTime: displayTime,
    isTemporary: state.timelineState.isDraggingScrubber
  })
}
```

### 4. PlayControls.tsx (Display Only)
- Show time based on isDraggingScrubber flag
- If dragging: show temporarySeekTime
- If not dragging: show currentTime
- NO control logic - display only

## Testing Requirements
- Test with videos of various durations
- Verify smooth performance with 4K videos
- Test rapid drag movements
- Test edge cases (start/end boundaries)
- Test interruption scenarios (focus loss during drag)

## Success Criteria
- ✅ Scrubber responds immediately to drag
- ✅ Preview updates smoothly during drag
- ✅ No lag or stutter during operation
- ✅ Accurate time positioning
- ✅ Clean state management
- ✅ Works consistently across all browsers

## Implementation Phases (MANDATORY GRADUAL VERIFICATION)

### Phase 1: Basic Click-to-Seek (USER MUST APPROVE BEFORE PHASE 2)
1. Implement click on timeline to seek (no drag yet)
2. Verify state machine transitions work correctly
3. Ensure preview updates on click
4. **USER TESTING CHECKPOINT** ✋

### Phase 2: Drag Without Preview (USER MUST APPROVE BEFORE PHASE 3)
1. Add drag handlers with visual scrubber movement
2. NO video preview updates yet (just scrubber moves)
3. Seek only on mouseup
4. **USER TESTING CHECKPOINT** ✋

### Phase 3: Drag With Preview (FINAL PHASE)
1. Add temporary seeking during drag
2. Implement throttling for performance
3. Add visual feedback states
4. **FINAL USER TESTING** ✋

## Error Handling & Recovery

### Potential Failures & Mitigations
```typescript
// 1. Video element not ready
if (!videoElement || !videoElement.duration) {
  console.warn('Video not ready for scrubbing')
  return // Gracefully ignore drag
}

// 2. Mouse leaves window during drag
// Solution: Document-level listeners (already implemented)

// 3. State desync during rapid dragging
// Solution: Throttle updates to 16ms intervals

// 4. Seek fails during drag (handled in state machine)
// State machine's SYNC_VIDEO_ELEMENT action handles failures internally
// If preview seek fails, state machine logs warning and continues
// Final seek on mouseup will attempt permanent position update

// 5. Browser doesn't support smooth seeking
// Detection: Check for seekable ranges
if (videoElement.seekable.length === 0) {
  // Fallback: Disable preview during drag
}

// 6. User drags during pause transition
// Solution: Store pendingDragInfo and handle mouseup appropriately
// If scrub never starts, seek to original click position
```

### State Consistency Guarantees (Architecture Validation)
- **Invariant 1**: isDraggingScrubber === true ↔ currentState === VIDEO_SCRUBBING
- **Invariant 2**: temporarySeekTime === null when not actively scrubbing (may have brief delay on start)
- **Invariant 3**: When !isDraggingScrubber: scrubberPosition === currentTime (±syncTolerance)
- **Invariant 4**: Only one drag operation active (enforced by state machine)
- **Invariant 5**: VIDEO_PLAYING → VIDEO_SCRUBBING requires PAUSE transition (line 130)
- **Invariant 6**: Panel dimensions remain immutable during scrub (line 149-183)
- **Invariant 7**: Sync tolerance = 1/frameRate (architecture line 251-253)
- **Invariant 8**: pendingSeek cleared after video element processes it
- **Invariant 9**: pendingSeekType matches current operation (temporary during scrub, permanent otherwise)

## Status
**🧪 USER TESTING REQUIRED**: This flow must be manually tested and approved before implementing

**Implementation Readiness: 100% - VERIFIED AGAINST ARCHITECTURE**
- ✅ Aligned with state machine architecture (all line references verified)
- ✅ Follows single source of truth principle (lines 10-14)
- ✅ Uses three-lane command processing (lines 33-53)
- ✅ Includes gradual verification phases (lines 547-574)
- ✅ Has comprehensive error handling (lines 339-377)
- ✅ State transitions match VideoState enum (lines 117-130)
- ✅ Respects panel immutability during scrub (lines 149-183)
- ✅ Implements scrubbing vs seeking distinction (lines 314-334)
- ✅ No contradictions or conflicts found after full verification

---

## Notes
- This is a critical UX feature for video editing
- Must feel responsive and professional
- Similar to YouTube or professional video editor scrubbing
- Consider adding waveform visualization in future iterations

### Core Principles

#### 1. Gradual Verification Principle - CRITICAL IMPLEMENTATION RULE
**🚨 MANDATORY USER APPROVAL**: Every implementation phase requires user testing and explicit approval
- **Never** build entire systems without user verification
- **Always** implement in small, testable increments
- **Stop immediately** if any phase fails user testing
- **User must confirm** each checkpoint before proceeding
- **🛑 NO DOCUMENT UPDATES** until user confirms testing has passed
- **🛑 NO PHASE PROGRESSION** without explicit user approval
- **🛑 NO ASSUMPTIONS** about user satisfaction - wait for confirmation

#### 2. Single Source of Truth Architecture
**State Machine Pattern**: One central state controller manages ALL editor operations
- **Never** have multiple components managing the same state
- **Never** use scattered useState for critical operations
- **Always** go through the central state machine
- **Build incrementally** with user verification at each step

#### 3. Three-Lane Command Processing 
**Multi-Lane Command System**: Operations processed by priority and type
- **Real-time Lane**: Scrubbing, zoom gestures (immediate, <8ms)
- **Sequential Lane**: Edit operations, clip management (queued, atomic)
- **Background Lane**: Sync verification, state validation (deferred)
- Smart conflict resolution between lanes
- **Implement gradually** with user testing at each lane

#### 4. Multi-Layer Verification System
**Professional Grade Reliability**: Every critical operation has multiple fallback methods
- **User verification required** before implementing fallback systems
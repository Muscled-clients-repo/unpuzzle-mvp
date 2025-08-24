# RCA: Single Source of Truth Analysis - Preview Panel & Scrubber Sync Issues

## Executive Summary

The video editor has **MULTIPLE conflicting sources of truth** for time/position, creating sync issues between the scrubber and preview panel. The state machine is declared as SSOT but operates as a **facade** in practice.

## Critical Findings

### 1. **State Machine is NOT the True SSOT**

Despite claims in the code comments that the state machine is the "Single Source of Truth", it's actually a facade:

**Evidence from VideoEditorQueries.ts:35:**
```typescript
getCurrentTime(): number {
  return this.playbackService.currentTime  // ❌ Reads from PlaybackService, not state machine
}
```

**vs State Machine Context (VideoEditorMachineV5.ts:47):**
```typescript
export interface VideoEditorContext {
  currentTime: number  // ✅ State machine HAS currentTime but it's ignored
}
```

### 2. **Two Competing Time Systems**

#### System A: PlaybackService (Video Element Based)
- **Source**: `PlaybackService.ts:262` - `this.videoElement?.currentTime ?? 0`
- **Used by**: Preview panel via `queries.getCurrentTime()`
- **Nature**: DOM video element's native currentTime
- **Updates**: Via video element timeupdate events

#### System B: State Machine (Timeline Based)  
- **Source**: `VideoEditorMachineV5.ts:877` - `currentTime: ({ event }) => event.position`
- **Used by**: Scrubber via `queries.getScrubberPosition()`
- **Nature**: Timeline position calculations
- **Updates**: Via user interactions (clicks, drags)

### 3. **Sync Failure Root Cause**

The sync failure occurs because:

1. **Scrubber clicks** update state machine: `currentTime: ({ event }) => event.position` (line 877)
2. **Preview panel reads** from PlaybackService: `this.videoElement?.currentTime` (line 262)
3. **No bridge** between these two systems
4. **Different calculation methods**: Timeline position vs video element time

### 4. **Evidence of Facade Pattern**

**VideoEditorQueries.ts shows the facade:**
```typescript
// Line 35: Claims to be SSOT but reads from service
getCurrentTime(): number {
  return this.playbackService.currentTime  // ❌ Not from state machine
}

// Line 107: Actually reads from state machine for scrubber
getScrubberPosition(): number {
  const snapshot = this.stateMachine.getSnapshot()
  return snapshot.context.timeline.scrubber.position  // ✅ From state machine
}
```

### 5. **Timeline Click Implementation Analysis**

**TimelineNew.tsx:108-109:**
```typescript
const position = x / pixelsPerSecond
onScrubberClick(Math.max(0, Math.min(position, totalDuration)))
```

This calculates time from pixel position, but there's no guarantee this matches the video element's time interpretation.

## Architecture Problems

### Problem 1: Dual State Management
- State machine claims authority but doesn't enforce it
- Services maintain their own state independently
- No synchronization mechanism between systems

### Problem 2: Inconsistent Data Flow
```
User clicks scrubber → State machine updates → Scrubber position changes
                                            ↘
                                             Preview panel still reads PlaybackService
                                                        ↓
                                                   Video element unchanged
                                                        ↓
                                                  Visual desync
```

### Problem 3: False SSOT Claims
The architecture documents claim state machine is SSOT, but implementation shows:
- 50% of queries read from state machine
- 50% of queries read from services
- No enforcement of SSOT principle

## Recommended Solution

### Phase 1: Establish True SSOT
1. **All time queries** must read from state machine only
2. **State machine** becomes the authoritative time source
3. **Services** become passive executors that sync TO state machine

### Phase 2: Unified Time Management
```typescript
// ✅ Correct pattern
getCurrentTime(): number {
  const snapshot = this.stateMachine.getSnapshot()
  return snapshot.context.currentTime  // Always from state machine
}

getScrubberPosition(): number {
  const snapshot = this.stateMachine.getSnapshot()
  return snapshot.context.currentTime  // Same source as currentTime
}
```

### Phase 3: Sync Mechanism
1. When scrubber updates state machine → Emit event to update video element
2. When video element time changes → Emit event to update state machine
3. Maintain single source with bidirectional sync

## Test Cases to Verify Fix

1. **Scrubber Click Test**: Click at 10s → Preview shows 10s video frame
2. **Video Playback Test**: Video plays to 15s → Scrubber shows at 15s position  
3. **Drag Test**: Drag scrubber → Preview follows in real-time
4. **Multi-clip Test**: Transition between clips → Both stay in sync

## Current Risk Level: **HIGH**

The dual time systems create unpredictable behavior and poor user experience. Users cannot trust that scrubber position matches video content, making precise editing impossible.

## Files Requiring Changes

1. `VideoEditorQueries.ts` - Fix getCurrentTime() to read from state machine
2. `PlaybackService.ts` - Make it sync TO state machine, not maintain own state
3. `VideoEditorMachineV5.ts` - Ensure all time updates properly propagate
4. `TimelineContainer.tsx` - Ensure unified time source for all UI updates

## Conclusion

The video editor's "Single Source of Truth" is currently a **myth**. True SSOT requires making the state machine the authoritative source for ALL time-related queries and ensuring services synchronize TO it, not maintain parallel state.
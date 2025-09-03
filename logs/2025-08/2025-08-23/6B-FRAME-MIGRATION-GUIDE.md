# File 6B: Frame-Based Migration Guide (Maintaining SSOT)

## Purpose

This document describes how to migrate from the current time-based system to the frame-based architecture (File 6A) while **maintaining SSOT throughout the migration**.

---

## 1. Migration Philosophy

### The Challenge
- Current system stores time (`currentTime`, `scrubber.position`)
- Target system stores frames (`currentFrame` only)
- Must maintain SSOT during transition

### The Solution
**Compatibility Queries** - Let the Query Layer handle both systems while State Machine migrates

### The Rule
**NEVER store both time and frames simultaneously in State Machine** *(except during controlled migration Phase 3-4 with guaranteed cleanup)*

---

## 2. Current System Analysis

### What We Have Now
```typescript
interface CurrentContext {
  currentTime: number                    // Primary position (seconds)
  timeline: {
    scrubber: {
      position: number                   // Duplicate position (seconds)
    }
  }
  // No frame awareness
}
```

### The Problems
1. Position stored in TWO places (currentTime and scrubber.position)
2. Floating-point precision issues
3. Scrubber can desync from video

---

## 3. Migration Phases

### Phase 1: Add Frame Infrastructure (Day 1)

#### Step 1.1: Create Frame Utilities
```typescript
// src/lib/video-editor/utils/FrameCalculations.ts
export const PROJECT_FRAME_RATE = 30

export const timeToFrame = (seconds: number, fps: number = PROJECT_FRAME_RATE): number => {
  return Math.round(seconds * fps)
}

export const frameToTime = (frame: number, fps: number = PROJECT_FRAME_RATE): number => {
  return frame / fps
}
```

#### Step 1.2: Add Compatibility Query Layer
```typescript
// src/lib/video-editor/queries/VideoEditorQueries.ts

class VideoEditorQueries {
  // PHASE 1: Initial queries - basic compatibility layer
  // NOTE: These will be enhanced in Phase 3 when USE_FRAME_BASED and projectFrameRate are added
  
  getCurrentFrame(): number {
    const context = this.stateMachine.getSnapshot().context
    
    // Phase 1: Only time-based exists, use hardcoded frame rate
    // This will be updated in Phase 3 to check USE_FRAME_BASED
    if ('currentTime' in context && context.currentTime !== undefined) {
      return timeToFrame(context.currentTime, PROJECT_FRAME_RATE)  // Using constant from FrameCalculations.ts
    }
    
    // Error case
    console.error('SSOT Query Error: No valid position source found', context)
    return 0
  }
  
  getCurrentTime(): number {
    const context = this.stateMachine.getSnapshot().context
    
    // Phase 1: Simple passthrough since we're still time-based
    // This will be updated in Phase 3 to handle frame-based mode
    if ('currentTime' in context) {
      return context.currentTime
    }
    
    // Error case
    console.error('SSOT Query Error: No valid time source found', context)
    return 0
  }
  
  // Helper to know which system is active
  // Phase 1: Always returns false (will be updated in Phase 3)
  isFrameBased(): boolean {
    return false  // Will check context.USE_FRAME_BASED in Phase 3
  }
}
```

**Why This Maintains SSOT**: Queries read from ONE source, whichever exists.

---

### Phase 2: Stop Updating Duplicate State (Day 2)

#### Step 2.1: Fix Scrubber Position Duplication
```typescript
// BEFORE (VIOLATES SSOT):
'VIDEO.TIME_UPDATE': {
  actions: assign(({ context, event }) => ({
    currentTime: event.time,                    // Update 1
    timeline: {
      ...context.timeline,
      scrubber: {
        ...context.timeline.scrubber,
        position: event.time                    // Update 2 (DUPLICATE!)
      }
    }
  }))
}

// AFTER (MAINTAINS SSOT):
'VIDEO.TIME_UPDATE': {
  actions: assign(({ context, event }) => ({
    currentTime: event.time                     // Update ONLY primary source
    // Remove scrubber.position update
  }))
}
```

#### Step 2.2: Update Scrubber Query
```typescript
// PHASE 2: Simple query - just read from currentTime
// (USE_FRAME_BASED doesn't exist yet in Phase 2)
getScrubberPositionInFrames(): number {
  const context = this.stateMachine.getSnapshot().context
  // Use hardcoded frame rate in Phase 2 (projectFrameRate doesn't exist yet)
  const fps = PROJECT_FRAME_RATE  // 30 from FrameCalculations.ts
  
  // For now, just convert currentTime to frames
  // This will be updated in Phase 3 to check USE_FRAME_BASED
  if ('currentTime' in context) {
    return timeToFrame(context.currentTime, fps)
  }
  
  return 0
}
```

**Result**: Scrubber now reads from single source (currentTime), no more duplicate position property.

---

### Phase 3: Switch to Frame Storage (Day 3)

#### Step 3.0: Update ALL Queries for Dual-Mode Support
```typescript
// UPDATE from Phase 1 & 2 - Now supports both modes with USE_FRAME_BASED flag

class VideoEditorQueries {
  getCurrentFrame(): number {
    const context = this.stateMachine.getSnapshot().context
    
    // NOW check if frame-based system is active
    if (context.USE_FRAME_BASED && 'currentFrame' in context && context.currentFrame !== undefined) {
      return context.currentFrame
    }
    
    // Fall back to converting from time
    if (!context.USE_FRAME_BASED && 'currentTime' in context && context.currentTime !== undefined) {
      const fps = context.projectFrameRate || 30
      return timeToFrame(context.currentTime, fps)
    }
    
    console.error('SSOT Query Error: No valid position source found', context)
    return 0
  }
  
  getCurrentTime(): number {
    const context = this.stateMachine.getSnapshot().context
    
    // Check if frame-based system is active
    if (context.USE_FRAME_BASED && 'currentFrame' in context && context.currentFrame !== undefined) {
      const fps = context.projectFrameRate || 30
      return frameToTime(context.currentFrame, fps)
    }
    
    // Fall back to time-based system
    if (!context.USE_FRAME_BASED && 'currentTime' in context) {
      return context.currentTime
    }
    
    console.error('SSOT Query Error: No valid time source found', context)
    return 0
  }
  
  isFrameBased(): boolean {
    const context = this.stateMachine.getSnapshot().context
    return context.USE_FRAME_BASED === true
  }
  
  getScrubberPositionInFrames(): number {
    const context = this.stateMachine.getSnapshot().context
    const fps = context.projectFrameRate || 30
    
    // Check which system is active
    if (context.USE_FRAME_BASED && 'currentFrame' in context && context.currentFrame !== undefined) {
      return context.currentFrame
    }
    
    if (!context.USE_FRAME_BASED && 'currentTime' in context) {
      return timeToFrame(context.currentTime, fps)
    }
    
    return 0
  }
}
```

#### Step 3.1: Add Frame Properties to Context
```typescript
// TEMPORARY VIOLATION: Both exist during migration
// CRITICAL: This is a transient state that MUST be cleaned up
interface TransitionContext {
  currentTime: number                    // DEPRECATED - will be removed in Phase 5
  currentFrame?: number                  // NEW - will become ONLY source
  projectFrameRate: number              // NEW - needed for conversion
  USE_FRAME_BASED: boolean              // NEW - starts as false, set to true in Step 3.3
  MIGRATION_IN_PROGRESS: true           // Flag to track cleanup requirement
}
```

**VIOLATION ACKNOWLEDGMENT**: Having both properties violates SSOT temporarily. This is acceptable ONLY because:
1. Queries read from only ONE source based on migration flag
2. Only ONE property updates at a time
3. Phase 5 GUARANTEES complete cleanup

#### Step 3.2: Update Actions to Use Frames
```typescript
// Create frame-aware actions
'VIDEO.TIME_UPDATE': {
  actions: assign(({ context, event }) => {
    const fps = context.projectFrameRate || 30
    const frame = timeToFrame(event.time, fps)
    
    // CRITICAL: Update ONLY ONE based on migration flag
    if (context.USE_FRAME_BASED) {
      return {
        currentFrame: frame
        // DO NOT update currentTime
      }
    } else {
      return {
        currentTime: event.time
        // DO NOT update currentFrame
      }
    }
  })
}
```

#### Step 3.3: Atomic Migration Switch
```typescript
// Call this AFTER Step 3.1 and 3.2 are complete
// CRITICAL: Must populate currentFrame BEFORE flipping flag
function switchToFrameBased(context: any): void {
  // 1. Calculate initial frame value from current time
  const currentTimeValue = context.currentTime || 0
  const fps = context.projectFrameRate || 30
  const initialFrame = Math.round(currentTimeValue * fps)
  
  // 2. Set currentFrame FIRST
  context.currentFrame = initialFrame
  
  // 3. THEN flip the flag
  context.USE_FRAME_BASED = true
  
  // 4. Verify it worked
  if (context.currentFrame === undefined) {
    throw new Error('Migration failed: currentFrame not set')
  }
  
  console.log(`✅ Switched to frame-based: ${initialFrame}f (was ${currentTimeValue}s)`)
}
```

**CRITICAL ORDER**: 
1. Calculate frame from current time
2. Set currentFrame
3. Flip flag
4. Verify

**SSOT Maintained**: At switch moment, both exist briefly but queries immediately start using frames.

---

### Phase 4: Update Integration Layer (Day 4)

#### Step 4.1: Convert at Service Boundaries
```typescript
// VideoEditorSingleton.ts

// Read from whichever system is active
const getCurrentPosition = (context) => {
  if (context.USE_FRAME_BASED && context.currentFrame !== undefined) {
    return {
      frame: context.currentFrame,
      time: frameToTime(context.currentFrame, context.projectFrameRate)
    }
  } else {
    return {
      frame: timeToFrame(context.currentTime, context.projectFrameRate || 30),
      time: context.currentTime
    }
  }
}

// Use for seeks
if (context.USE_FRAME_BASED && playback.pendingSeekFrame !== null) {
  const seekTime = frameToTime(playback.pendingSeekFrame, context.projectFrameRate)
  await playbackService.seek(seekTime)
} else if (!context.USE_FRAME_BASED && playback.pendingSeek?.time !== null) {
  await playbackService.seek(playback.pendingSeek.time)
}
```

---

### Phase 5: MANDATORY CLEANUP - Restore TRUE SSOT (Day 5-6)

**CRITICAL**: This phase is NOT OPTIONAL. The system is in SSOT violation until this completes.

#### Step 5.1: Pre-Cleanup Verification
```typescript
// MUST PASS before cleanup
test('Frame system fully operational', () => {
  expect(context.USE_FRAME_BASED).toBe(true)
  expect(context.currentFrame).toBeDefined()
  expect(queries.isFrameBased()).toBe(true)
})

test('No dependencies on legacy properties', () => {
  // Temporarily null out legacy properties
  const tempTime = context.currentTime
  const tempPos = context.timeline.scrubber.position
  
  context.currentTime = undefined
  context.timeline.scrubber.position = undefined
  
  // Verify everything still works
  commands.play()
  commands.seekToFrame(100)
  expect(queries.getCurrentFrame()).toBe(100)
  expect(queries.getCurrentTime()).toBeCloseTo(100/30)
  
  // Restore for now
  context.currentTime = tempTime
  context.timeline.scrubber.position = tempPos
})
```

#### Step 5.2: EXECUTE CLEANUP - Remove ALL Legacy Properties
```typescript
// ATOMIC CLEANUP OPERATION
function executeCleanup(context: any): void {
  // 1. Verify migration flag is true
  if (!context.USE_FRAME_BASED) {
    throw new Error('Cannot cleanup: Frame system not active')
  }
  
  // 2. Verify frame system working
  if (context.currentFrame === undefined) {
    throw new Error('Cannot cleanup: currentFrame not established')
  }
  
  // 3. DELETE all legacy properties
  delete context.currentTime
  delete context.timeline.scrubber.position
  delete context.USE_FRAME_BASED  // No longer needed
  delete context.MIGRATION_IN_PROGRESS
  
  // 4. Verify deletion
  if ('currentTime' in context) {
    throw new Error('Cleanup failed: currentTime still exists')
  }
  
  if ('position' in context.timeline.scrubber) {
    throw new Error('Cleanup failed: scrubber.position still exists')
  }
  
  console.log('✅ CLEANUP COMPLETE: TRUE SSOT RESTORED')
}

// Final context matches File 6A exactly
interface FinalContext {
  currentFrame: number               // The ONLY source
  projectFrameRate: number
  
  timeline: {
    scrubber: {
      isDragging: boolean
      // NO position property
    }
  }
  // NO currentTime property
  // NO migration flags
}
```

#### Step 5.3: Post-Cleanup Verification
```typescript
test('TRUE SSOT achieved', () => {
  // Verify single source
  expect(context.currentFrame).toBeDefined()
  expect(context.currentTime).toBeUndefined()
  expect(context.timeline.scrubber.position).toBeUndefined()
  
  // Verify queries still work
  expect(queries.getCurrentFrame()).toBe(context.currentFrame)
  expect(queries.getCurrentTime()).toBe(context.currentFrame / context.projectFrameRate)
  
  // Verify no migration artifacts
  expect(context.USE_FRAME_BASED).toBeUndefined()
  expect(context.MIGRATION_IN_PROGRESS).toBeUndefined()
})
```

---

## 4. Migration Script

### Automated Migration Helper
```typescript
// IMPORTANT: This is for FINAL migration after all phases complete
// NOT for use during phased migration
function finalMigrationToFrameBased(context: any): any {
  // Only use this AFTER verifying system works with both properties
  if (!context.USE_FRAME_BASED) {
    throw new Error('Cannot run final migration: System not ready')
  }
  
  if (context.currentFrame === undefined) {
    throw new Error('Cannot run final migration: currentFrame not established')
  }
  
  const fps = context.projectFrameRate || 30
  
  // Create clean context with ONLY frame-based properties
  const newContext = {
    ...context,
    currentFrame: context.currentFrame,  // Already set from phased migration
    projectFrameRate: fps,
    // Remove ALL legacy properties
    currentTime: undefined,
    timeline: {
      ...context.timeline,
      scrubber: {
        ...context.timeline.scrubber,
        position: undefined
      }
    }
  }
  
  // Clean up undefined and flags
  delete newContext.currentTime
  delete newContext.timeline.scrubber.position
  delete newContext.USE_FRAME_BASED  // No longer needed after final migration
  delete newContext.MIGRATION_IN_PROGRESS
  
  return newContext
}
```

---

## 5. Rollback Plan

### If Issues Arise
```typescript
// Emergency rollback
context.USE_FRAME_BASED = false  // Revert to time-based

// Queries automatically adapt
getCurrentTime()  // Still works
getCurrentFrame() // Still works
```

### Feature Flag Control
```typescript
const FEATURE_FLAGS = {
  USE_FRAME_BASED_SSOT: process.env.ENABLE_FRAMES === 'true'
}

// Gradual rollout
if (FEATURE_FLAGS.USE_FRAME_BASED_SSOT) {
  context.USE_FRAME_BASED = true
}
```

---

## 6. Common Pitfalls to Avoid

### ❌ DON'T: Update Both Systems
```typescript
// NEVER DO THIS
return {
  currentFrame: frame,
  currentTime: time  // VIOLATES SSOT!
}
```

### ✅ DO: Update Only Active System
```typescript
// ALWAYS DO THIS
if (context.USE_FRAME_BASED) {
  return { currentFrame: frame }
} else {
  return { currentTime: time }
}
```

### ❌ DON'T: Read from Wrong Source
```typescript
// BAD
const time = context.currentTime  // Might not exist!
```

### ✅ DO: Use Queries
```typescript
// GOOD
const time = queries.getCurrentTime()  // Handles both systems
```

---

## 7. Testing Migration

### Phase Testing
```typescript
describe('Migration Phases', () => {
  test('Phase 1: Queries work with time-based (before migration flags)', () => {
    const context = { 
      currentTime: 1.0
      // No USE_FRAME_BASED or projectFrameRate yet in Phase 1
    }
    // Phase 1 queries use hardcoded PROJECT_FRAME_RATE constant
    expect(queries.getCurrentFrame()).toBe(30)  // Using PROJECT_FRAME_RATE = 30
    expect(queries.getCurrentTime()).toBe(1.0)
  })
  
  test('Phase 2: Scrubber reads from currentTime only (no duplicate position)', () => {
    const context = { 
      currentTime: 1.0,
      timeline: {
        scrubber: {
          // NO position property - removed in Phase 2
          isDragging: false
        }
      }
    }
    expect(queries.getScrubberPositionInFrames()).toBe(30)
  })
  
  test('Phase 3: Queries work with dual properties during migration', () => {
    // During migration, both exist but only one is used based on flag
    const contextTimeBased = { 
      currentTime: 1.0,
      currentFrame: undefined,  // Not used when USE_FRAME_BASED is false
      USE_FRAME_BASED: false,
      projectFrameRate: 30,
      MIGRATION_IN_PROGRESS: true
    }
    expect(queries.getCurrentFrame()).toBe(30)  // Converts from currentTime
    expect(queries.getCurrentTime()).toBe(1.0)
    
    const contextFrameBased = { 
      currentTime: 1.0,  // Still exists but not used
      currentFrame: 30,
      USE_FRAME_BASED: true,  // Now using frames
      projectFrameRate: 30,
      MIGRATION_IN_PROGRESS: true
    }
    expect(queries.getCurrentFrame()).toBe(30)  // Direct from currentFrame
    expect(queries.getCurrentTime()).toBe(1.0)  // Converts from currentFrame
  })
  
  test('SSOT maintained: Only one updates', () => {
    // With flag false
    context.USE_FRAME_BASED = false
    handleTimeUpdate(1.5)
    expect(context.currentTime).toBe(1.5)
    expect(context.currentFrame).toBeUndefined()
    
    // With flag true
    context.USE_FRAME_BASED = true
    handleTimeUpdate(2.0)
    expect(context.currentFrame).toBe(60)
    // currentTime not updated
  })
})
```

---

## 8. Timeline

### Week 1
- Day 1: Add frame utilities and compatibility queries
- Day 2: Fix scrubber position duplication
- Day 3: Add frame storage with migration flag

### Week 2  
- Day 4: Update Integration Layer
- Day 5: Testing and verification
- Day 6: Remove legacy properties

---

## 9. Success Criteria

Migration is complete when:
- [ ] All position data stored as frames only
- [ ] No currentTime in context
- [ ] No scrubber.position in context
- [ ] All tests pass with frame-based system
- [ ] Scrubber perfectly synced
- [ ] Frame-accurate seeking works
- [ ] UI shows frame numbers

---

## 10. SSOT Violation Tracking

### Temporary Violations During Migration

| Phase | Violation | Duration | Resolution |
|-------|-----------|----------|------------|
| Phase 2 | `scrubber.position` exists but not updated | Day 2-5 | Deleted in Phase 5 |
| Phase 3-4 | Both `currentTime` and `currentFrame` exist | Day 3-5 | `currentTime` deleted in Phase 5 |
| Phase 3-4 | Migration flags in context | Day 3-6 | All flags deleted in Phase 5 |

### Cleanup Guarantee

**CONTRACT**: By end of Phase 5:
- ✅ `currentFrame` is the ONLY position storage
- ✅ No `currentTime` in context
- ✅ No `scrubber.position` in context
- ✅ No migration flags remain
- ✅ Context matches File 6A exactly

### Enforcement Mechanism

```typescript
// Add to CI/CD pipeline after migration
function enforceSSSOT(context: any): void {
  const violations = []
  
  if ('currentTime' in context) {
    violations.push('currentTime still exists')
  }
  
  if (context.timeline?.scrubber?.position !== undefined) {
    violations.push('scrubber.position still exists')
  }
  
  if ('USE_FRAME_BASED' in context) {
    violations.push('Migration flag still exists')
  }
  
  if (violations.length > 0) {
    throw new Error(`SSOT VIOLATIONS FOUND: ${violations.join(', ')}`)
  }
}
```

## 11. Conclusion

This migration guide:
1. **ACKNOWLEDGES temporary SSOT violations** during migration
2. **GUARANTEES complete cleanup** in Phase 5
3. **PROVIDES verification** to ensure cleanup happened
4. **ACHIEVES TRUE SSOT** by the end

The key insight: **Temporary violations are acceptable IF cleanup is guaranteed and verified**.

After Phase 5 completion, the system will have TRUE SSOT matching File 6A exactly.
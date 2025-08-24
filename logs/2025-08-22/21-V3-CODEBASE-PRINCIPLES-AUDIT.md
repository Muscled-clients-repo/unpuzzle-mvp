# V3 Architecture Principles - Codebase Audit Report

*Comprehensive review of video editor codebase against V3 Architecture Principles*

---

## 🚨 CRITICAL VIOLATIONS

### 1. Principle 0 Violation: No Frame-Based Implementation
**Principle**: "ALL time calculations use frame numbers as the primary source of truth"
**Reality**: Zero frame-based implementation found

**Evidence**:
- No `frameRate`, `currentFrame`, or `totalFrames` in entire codebase
- State Machine context uses floating-point `currentTime: number` (line 47, VideoEditorMachineV5.ts)
- All calculations use time-based floating-point math

**Impact**: 
- Root cause of scrubber/preview sync issues
- Floating-point precision errors accumulate
- Non-deterministic behavior across devices

**Files Affected**:
- `VideoEditorMachineV5.ts` - uses time-based state
- `VideoEditorQueries.ts` - returns time values
- `TimelineNew.tsx` - pixel calculations from time

---

### 2. Principle 6 Violation: Query Layer Reads from Services
**Principle**: "Query Layer reads from State Machine ONLY"
**Reality**: Queries read from BOTH State Machine AND Services

**Evidence** (VideoEditorQueries.ts):
```typescript
// Line 35 - VIOLATION: Reading from PlaybackService
getCurrentTime(): number {
  return this.playbackService.currentTime
}

// Line 39 - VIOLATION: Reading from PlaybackService  
isPlaying(): boolean {
  return this.playbackService.isPlaying
}

// Line 26 - VIOLATION: Reading from RecordingService
isRecording(): boolean {
  return this.recordingService.isRecording
}
```

**Impact**:
- Dual sources of truth causing sync issues
- Preview panel and scrubber read from different sources
- Guaranteed desynchronization

**Files Affected**:
- `VideoEditorQueries.ts` - 3 methods violate SSOT

---

### 3. Principle 3 Violation: Services Expose Queryable State
**Principle**: "Services are stateless executors that only manipulate external resources"
**Reality**: Services expose state through getters

**Evidence**:

**PlaybackService.ts (lines 261-272)**:
```typescript
get currentTime(): number {
  return this.videoElement?.currentTime ?? 0
}

get duration(): number {
  return this.videoElement?.duration ?? 0
}

get isPlaying(): boolean {
  return this.videoElement ? !this.videoElement.paused : false
}
```

**RecordingService.ts (lines 145-152)**:
```typescript
get isRecording(): boolean {
  return this.mediaRecorder?.state === 'recording'
}

get recordingDuration(): number {
  if (!this.startTime) return 0
  return (performance.now() - this.startTime) / 1000
}
```

**Impact**:
- Services become secondary sources of truth
- Violates stateless executor pattern
- Enables Query Layer violations

---

### 4. Principle 7 Violation: Commands Call Services Directly
**Principle**: "Commands only send events to State Machine, never call services directly"
**Reality**: Commands make direct service calls

**Evidence** (VideoEditorCommands.ts):
```typescript
// Line 117 - VIOLATION: Direct service call
this.timelineService.requestAddSegment(segment)

// Line 128 - VIOLATION: Direct service call  
this.timelineService.requestSelectSegment(segmentId)
```

**Impact**:
- Bypasses State Machine authority
- Creates inconsistent state updates
- Violates unidirectional flow

---

## ⚠️ ARCHITECTURAL INCONSISTENCIES

### 5. Duplicate Time Storage
**Issue**: Multiple time representations in State Machine context

**Evidence** (VideoEditorMachineV5.ts):
```typescript
context: {
  currentTime: number,  // Line 47
  playback: {
    currentVideoTime: number,  // Line 60 - Duplicate
    globalTimelinePosition: number  // Line 66 - Another time representation
  }
}
```

**Impact**:
- Confusion about which time is authoritative
- Potential for state inconsistencies
- Violates single source of truth

---

### 6. Integration Layer DOM Manipulation
**Issue**: Integration Layer directly manipulates DOM

**Evidence** (VideoEditorSingleton.ts):
```typescript
// Lines 141-157 - Direct DOM manipulation
const videoElement = document.getElementById('preview-video')
videoElement.currentTime = 0  // Line 152
```

**Impact**:
- Integration Layer exceeds its responsibility
- Should coordinate through services
- Violates separation of concerns

---

### 7. EventBus Creates Indirection
**Issue**: EventBus adds unnecessary complexity

**Evidence**:
- Services communicate through EventBus instead of Integration Layer
- Creates indirect state flow: Service → EventBus → State Machine
- Complicates debugging and tracing

**Files**:
- `EventBus.ts` - defines 30+ event types
- `TimelineService.ts` - uses EventBus for communication
- `VideoEditorSingleton.ts` - subscribes to EventBus events

---

## 📊 COMPLIANCE SUMMARY

| Principle | Status | Severity |
|-----------|---------|----------|
| Principle 0: Frame-Based SSOT | ❌ Not Implemented | CRITICAL |
| Principle 1: Single Source of Truth | ❌ Violated | CRITICAL |
| Principle 2: State Machine Authority | ✅ Mostly Compliant | - |
| Principle 3: Service Isolation | ❌ Violated | HIGH |
| Principle 4: Integration Layer | ✅ Implemented | - |
| Principle 5: Pure Components | ✅ Compliant | - |
| Principle 6: Query Layer SSOT | ❌ Violated | CRITICAL |
| Principle 7: Command Layer Flow | ❌ Violated | MEDIUM |

**Overall Compliance**: 3/8 Principles (37.5%)

---

## 🔧 RECOMMENDATIONS

### Priority 1: Fix Query Layer (Immediate)
**Root cause of sync issues - 1 day effort**

1. Update `VideoEditorQueries.ts`:
```typescript
getCurrentTime(): number {
  const snapshot = this.stateMachine.getSnapshot()
  return snapshot.context.currentTime
}

isPlaying(): boolean {
  const snapshot = this.stateMachine.getSnapshot()
  return snapshot.value === 'playing'
}
```

2. Remove getters from services:
- Delete `PlaybackService` getters (lines 261-272)
- Delete `RecordingService` getters (lines 145-152)

---

### Priority 2: Implement Frame-Based Calculations (Critical)
**Prevents future sync issues - 2-3 days effort**

1. Update State Machine context:
```typescript
interface VideoEditorContext {
  currentFrame: number,  // Primary
  totalFrames: number,
  frameRate: number,
  currentTime: number,  // Calculated from currentFrame
}
```

2. Create frame utilities:
- Frame-to-time conversion
- Time-to-frame conversion
- Pixel-to-frame mapping

3. Update all time calculations to use frames

---

### Priority 3: Remove Service State Exposure (High)
**Enforce service isolation - 1 day effort**

1. Remove all getters from services
2. Move state queries to State Machine
3. Services become pure executors

---

### Priority 4: Fix Command Layer (Medium)
**Stop direct service calls - 0.5 day effort**

1. Remove `this.timelineService` calls from Commands
2. Send all actions as State Machine events
3. Let Integration Layer handle service coordination

---

### Priority 5: Simplify Architecture (Low)
**Remove EventBus complexity - 1 day effort**

1. Remove EventBus dependency
2. Use Integration Layer for all coordination
3. Simplify to: State Machine → Integration Layer → Services

---

## 🎯 QUICK WINS

### Immediate Fix (30 minutes):
Fix `getCurrentTime()` and `isPlaying()` in VideoEditorQueries.ts
- This alone should significantly improve sync issues

### Day 1 Fix:
- Fix all Query Layer violations
- Remove service getters
- Test scrubber/preview sync

### Week 1 Fix:
- Implement frame-based calculations
- Remove EventBus
- Achieve 100% principle compliance

---

## 📈 EXPECTED OUTCOMES

After implementing recommendations:

1. **Scrubber/Preview Sync**: Perfect synchronization
2. **Frame Accuracy**: Professional-grade precision
3. **Simplified Debugging**: Clear, traceable data flow
4. **Maintainability**: Easier to add features
5. **Performance**: Reduced redundant calculations
6. **Reliability**: Deterministic behavior

---

## 🚫 DO NOT PROCEED WITH

- Adding more features until Query Layer is fixed
- Any time-based calculations (use frames)
- Direct service communication
- EventBus for new features

---

## ✅ VALIDATION CHECKLIST

After fixes, verify:
- [ ] All queries read from State Machine only
- [ ] Services have no getters
- [ ] Commands only send events
- [ ] Frame-based calculations implemented
- [ ] Single source of truth maintained
- [ ] Scrubber/preview perfectly synced
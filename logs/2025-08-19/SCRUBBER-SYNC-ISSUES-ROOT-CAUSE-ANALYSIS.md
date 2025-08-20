# Video Editor Scrubber Synchronization Issues - Root Cause Analysis

**Date:** 2025-08-19
**Analysis:** Deep investigation of two critical playback synchronization issues

## Issue 1: Play Button Not Working After Clip Ends

### Symptoms
- Single clip scenario: When playback reaches the end, clicking play shows pause icon
- Scrubber moves to beginning but video doesn't actually play
- Need to click pause then play again to make it work
- State appears correct but playback doesn't start

### Root Cause Analysis

#### State Machine Flow Investigation
1. **When video ends**: `VIDEO.ENDED` event fires
2. **State transition**: `playing` → `paused` (via handleVideoEnded action)
3. **State update**: `isPlaying: false`, scrubber resets to beginning
4. **User clicks play**: State machine transitions back to `playing`
5. **Problem**: resumePlayback action sets up pendingClipTransition but...

#### The Bug Location
In `resumePlayback` action, when resuming from end:
```typescript
// This logic triggers when at end and clicking play
const shouldResetAll = position >= allClipsEndTime - 0.1
if (shouldResetAll) {
  // Sets up pendingClipTransition for first clip
  // BUT the Integration Layer may not process it correctly
}
```

#### Integration Layer Issue
In VideoEditorSingleton.ts, the Integration Layer checks:
```typescript
if (hasNewClipTransition && snapshot.matches('playing')) {
  // Process clip transition
}
```

**Problem**: When clicking play from end, there's a race condition:
1. State machine transitions to 'playing' and sets pendingClipTransition
2. Integration Layer runs subscription callback
3. BUT the callback may run before state has fully updated
4. So hasNewClipTransition is true but snapshot might not match 'playing' yet

### Solution Strategy
- Fix race condition in Integration Layer
- Ensure pendingClipTransition is always processed regardless of exact timing
- Add fallback logic for play-from-end scenarios

## Issue 2: Scrubber-Preview Desync After Trimming Multiple Clips

### Symptoms
- Multiple trimmed clips: Preview and scrubber position don't match
- Preview shows correct clip content
- Scrubber position is offset (ahead or behind actual video time)
- Occurs specifically after trimming/splitting clips

### Root Cause Analysis

#### The Trimming Flow
1. **Split action**: Creates two clips with adjusted startTime, duration, inPoint, outPoint
2. **Clip placement**: Each clip has correct boundaries on timeline
3. **Playback starts**: resumePlayback calculates which clip to play
4. **Time updates**: VIDEO.TIME_UPDATE events come from raw video time

#### The Core Problem: Multiple Time Calculation Systems

**System 1 - State Machine (updateVideoTime)**:
```typescript
// My recent fix
const rawTimelinePosition = context.playback.activeClipStartTime + event.time
const clampedTimelinePosition = Math.min(rawTimelinePosition, clipEndTime)
```

**System 2 - Integration Layer Boundary Check**:
```typescript
// Also my recent addition
const rawTimelinePosition = playback.activeClipStartTime + currentTime
if (rawTimelinePosition >= clipEndTime - 0.05) {
  stateMachine.send({ type: 'VIDEO.ENDED' })
}
```

**System 3 - resumePlayback Logic**:
```typescript
// Calculates pendingSeek based on timeline position
pendingSeek: { time: position - targetClip.startTime }
```

#### The Bug: Inconsistent Time Calculations
1. **Trimmed clips have adjusted inPoint/outPoint**
2. **Video service plays from inPoint to outPoint** (correct)
3. **But time calculations don't account for inPoint offset**

For example, trimmed clip:
- Original video: 0-10 seconds
- After trim: inPoint=2, outPoint=5, duration=3
- Timeline position: clip starts at 0, ends at 3
- **But video element still reports 0-3 seconds of the TRIMMED portion**
- **We calculate timeline position as: startTime + videoTime**
- **Should be: startTime + (videoTime - inPoint adjustment)**

#### Missing Logic: inPoint/outPoint Translation
The video element plays the trimmed portion (inPoint to outPoint) but reports time relative to the trimmed segment, not the original video. We need to translate between:
- **Video element time** (0 to trimmedDuration)  
- **Original video time** (inPoint to outPoint)
- **Timeline position** (startTime to startTime + duration)

### Solution Strategy
- Add proper inPoint/outPoint handling in time calculations
- Ensure all three time systems (State Machine, Integration Layer, resumePlayback) use consistent math
- Account for trimmed clip offsets in scrubber position updates

## Technical Debt Identified

### Architecture Problem
We have **3 different places** calculating time positions:
1. State Machine (updateVideoTime)
2. Integration Layer (boundary checking) 
3. resumePlayback action (seek calculation)

**Each uses slightly different logic** = guaranteed sync issues

### Missing Abstraction
Need a **centralized time calculation utility** that handles:
- Timeline position ↔ Video element time conversion
- inPoint/outPoint offset calculations  
- Clip boundary detection
- Consistent rounding/tolerance handling

## Next Steps
1. Fix Integration Layer race condition (Issue 1)
2. Create centralized time calculation utility
3. Refactor all three time calculation systems to use the utility
4. Add comprehensive testing for edge cases

## Test Cases Needed
- [ ] Play from end with single clip
- [ ] Play from end with multiple clips  
- [ ] Trim clip and play from beginning
- [ ] Trim multiple clips and play through all
- [ ] Split clip multiple times and verify each segment plays correctly
- [ ] Pause/resume at various points in trimmed clips
# Virtual Timeline Implementation Plan
**Date:** 2025-08-24  
**Purpose:** Design a robust virtual timeline system that handles complex editing scenarios  
**Status:** Planning

## Overview

The Virtual Timeline approach inverts the current playback model. Instead of video events driving timeline position, the timeline position drives video playback. This eliminates synchronization issues and handles complex editing scenarios elegantly.

## Core Concept

### Current Model (Event-Driven)
```
Video plays → emits timeupdate → updates scrubber
Video ends → load next → update position
```
**Problem:** Multiple sources of truth, race conditions, sync issues

### Virtual Timeline Model (Position-Driven)
```
Timeline position changes → calculate what to show → update video
Scrubber IS the position → video follows
```
**Solution:** Single source of truth (timeline position), no sync needed

## Architecture

### 1. Data Structure

```typescript
interface TimelineSegment {
  id: string
  startFrame: number        // Position on timeline
  endFrame: number          // End position on timeline
  sourceUrl: string         // Video file URL
  sourceInFrame: number     // Start frame within source video
  sourceOutFrame: number    // End frame within source video
  track: 'video1' | 'video2' | 'audio1'
}

interface VirtualTimeline {
  segments: TimelineSegment[]
  currentFrame: number
  totalFrames: number
  fps: number
  isPlaying: boolean
}
```

### 2. Core Concept

The engine maintains a playback loop that:
1. Tracks current frame position
2. Maps frame to appropriate segment
3. Syncs video element to show correct content
4. Handles gaps, transitions, and seeking

**Key principles:**
- Timeline position is the single source of truth
- Video element follows timeline, never leads
- Frame-based calculations throughout
- Graceful handling of gaps and transitions

**Implementation approach:**
```typescript
// Pseudocode - adapt as needed during implementation
function virtualPlaybackLoop() {
  // Track elapsed time
  // Calculate current frame based on elapsed time
  // Find segment at current frame
  // Sync video to show correct content
  // Handle transitions smoothly
  // Continue loop if playing
}

function syncVideoToTimeline(frame) {
  // Find what should be shown at this frame
  // Load new video if needed
  // Seek to correct position
  // Handle gaps gracefully
  // Ensure smooth playback
}
```

**Note:** Exact implementation will evolve during coding. The key is maintaining the principle that timeline drives video, not specific code structure.

## Scenarios Addressed

### 1. Basic Sequential Playback
**Scenario:** Two clips play one after another
```
Timeline: [Clip A: 0-150] [Clip B: 150-300]
```
**Virtual Timeline Handling:**
- Frame 0-149: Load and play Clip A
- Frame 150: Detect segment change, load Clip B
- Frame 150-299: Play Clip B
- No race conditions, perfect sync

### 2. Gaps in Timeline
**Scenario:** Empty space between clips
```
Timeline: [Clip A: 0-150] <gap> [Clip B: 200-350]
```
**Virtual Timeline Handling:**
- Frame 0-149: Play Clip A
- Frame 150-199: No segment found, video pauses, scrubber continues
- Frame 200: Load and play Clip B
- User sees black/placeholder during gap

### 3. Trimmed Clips
**Scenario:** Use only middle portion of a video
```
Source video: 10 seconds (300 frames)
Timeline: [Trim: frames 90-180 of source]
```
**Virtual Timeline Handling:**
```typescript
segment = {
  startFrame: 0,
  endFrame: 90,
  sourceUrl: 'video.mp4',
  sourceInFrame: 90,   // Start at 3 seconds in
  sourceOutFrame: 180  // End at 6 seconds in
}
```
- Automatically seeks to correct position in source
- Stops at out point even if video is longer

### 4. Same Clip Multiple Times
**Scenario:** Reuse same video at different timeline positions
```
Timeline: [Clip A] [Clip B] [Clip A again] [Clip A trimmed]
```
**Virtual Timeline Handling:**
- Efficiently reuses loaded video when possible
- Each segment independent with own in/out points
- No need to duplicate video files

### 5. Complex Multi-Track Editing
**Scenario:** Picture-in-picture, multiple tracks
```
Video1: [Clip A: 0-150] [Clip C: 150-300]
Video2: [----] [Clip B: 50-200] [----]
Audio1: [Music: 0-300]
```
**Virtual Timeline Handling:**
```typescript
// For each track, find active segment
const video1Segment = findSegmentAt(frame, 'video1')
const video2Segment = findSegmentAt(frame, 'video2')

// Composite or switch between tracks based on priority
if (video2Segment && video2Segment.isPrimary) {
  syncVideoToSegment(video2Segment)
} else if (video1Segment) {
  syncVideoToSegment(video1Segment)
}
```

### 6. Frame-Accurate Seeking
**Scenario:** User drags scrubber to exact frame
```
User drags to frame 1247
```
**Virtual Timeline Handling:**
- Immediately calculate segment at frame 1247
- Load video if needed
- Seek to exact frame position
- No async delays or race conditions

### 7. Clip Deletion Mid-Playback
**Scenario:** User deletes clip while it's playing
```
Playing: [Clip A] [*Clip B*] [Clip C]
User deletes Clip B during playback
```
**Virtual Timeline Handling:**
- Timeline updates immediately
- Next tick checks for segment at current frame
- Seamlessly continues to Clip C or shows gap
- No crashes or undefined behavior

### 8. Speed Changes/Time Remapping
**Scenario:** Slow motion or speed up sections
```
Timeline: [Clip A: normal] [Clip B: 0.5x speed] [Clip C: 2x speed]
```
**Virtual Timeline Handling:**
```typescript
segment = {
  startFrame: 150,
  endFrame: 300,
  sourceUrl: 'video.mp4',
  sourceInFrame: 0,
  sourceOutFrame: 75,  // Only 75 source frames for 150 timeline frames
  playbackRate: 0.5
}
```
- Adjust frame mapping based on playback rate
- Timeline advances normally, source plays at different rate

## Implementation Strategy

### Phase 1: Core Engine (2 hours)
1. Create `VirtualTimelineEngine` class
2. Implement frame-to-segment mapping
3. Build basic playback loop with requestAnimationFrame
4. Handle video loading and seeking

### Phase 2: Integration (1 hour)
1. Replace current `useVideoEditor` playback logic
2. Convert existing clips to segments
3. Update UI to use virtual timeline

### Phase 3: Advanced Features (2 hours)
1. Add gap handling with placeholder
2. Implement trim support (in/out points)
3. Add multi-track logic
4. Handle edge cases

## Benefits Over Current Approach

### 1. Perfect Synchronization
- Scrubber position IS the truth
- Video follows timeline, not vice versa
- No possibility of desync

### 2. Predictable Behavior
- Frame X always shows same content
- No race conditions
- Deterministic playback

### 3. Complex Editing Support
- Gaps handled naturally
- Trims work perfectly
- Reuse clips efficiently
- Multi-track ready

### 4. Simpler Mental Model
- Timeline is just an array of segments
- Current position determines everything
- No event coordination needed

## Potential Challenges

### 1. Frame Accuracy Limitations
**Challenge:** HTML video seeking is not perfectly frame-accurate
**Reality:** 
- We can request specific times but browser may seek to nearest keyframe
- Good enough for MVP (within 1-2 frames)
- Professional tools use frame servers or WebCodecs for perfect accuracy
- Our approach will be "frame-intended" rather than "frame-perfect"

### 2. Loading Delays
**Challenge:** Video source changes cause brief pause
**Solution:**
- Preload next segment during current playback
- Use multiple video elements for seamless transition
- Cache recently used videos

### 3. Performance Considerations
**Challenge:** Maintaining smooth playback with frame-accurate tracking
**Approach:**
- Use requestAnimationFrame but throttle to target FPS
- Only sync video when necessary (not every frame)
- Let video play naturally, correct drift periodically
- Optimize segment lookups as needed

## Comparison with Current Implementation

| Aspect | Current (Event-Driven) | Virtual Timeline |
|--------|----------------------|------------------|
| Sync Issues | Common during transitions | Impossible by design |
| Code Complexity | Medium (200 lines) | Similar (250 lines) |
| Mental Model | Complex (multiple states) | Simple (position → content) |
| Gap Support | Difficult | Natural |
| Trim Support | Very difficult | Natural |
| Multi-track | Would require rewrite | Built-in |
| Debug Difficulty | Hard (async events) | Easy (single loop) |
| Frame Accuracy | Approximate | Frame-intended |

## Migration Path

### Step 1: Parallel Implementation
- Build VirtualTimelineEngine alongside current code
- Feature flag to switch between them
- Test with same UI

### Step 2: Gradual Migration
- Start with single-clip playback
- Add multi-clip support
- Add gaps and trims
- Remove old implementation

### Step 3: Optimization
- Add preloading
- Implement frame cache
- Optimize for large timelines

## Implementation Philosophy

Rather than prescriptive code, here are the key patterns to follow:

### Pattern 1: Timeline-Driven Updates
```typescript
// Timeline position determines everything
currentFrame → findSegment(frame) → updateVideo(segment, frame)
```

### Pattern 2: Smooth Playback Loop
```typescript
// Use time-based frame advancement
lastTime = performance.now()
// ... in loop:
deltaTime = now - lastTime
framesElapsed = deltaTime * fps / 1000
currentFrame += framesElapsed
```

### Pattern 3: Smart Video Syncing
```typescript
// Don't seek every frame, only when needed:
- When switching segments
- When drift exceeds threshold
- When user seeks manually
```

### Pattern 4: Handle Segments Cleanly
```typescript
segment = {
  startFrame,      // Timeline position
  endFrame,        // Timeline end
  sourceInFrame,   // Where to start in source
  sourceOutFrame,  // Where to stop in source (respect this!)
}

// Always check bounds:
if (frameInSegment > segment.sourceOutFrame - segment.sourceInFrame) {
  // Move to next segment
}
```

**Note:** The actual implementation will adapt based on what works best in practice. The key is maintaining the conceptual model where timeline drives video.

## Conclusion

The Virtual Timeline approach solves fundamental synchronization issues by inverting the control flow. Instead of trying to keep multiple systems in sync, we have a single source of truth (timeline position) that drives everything else.

This is how professional video editors work internally - the timeline is the authority, and video playback is just a visualization of the current timeline position.

For our simple editor, this approach would:
1. Eliminate all sync bugs
2. Enable advanced features naturally
3. Simplify the mental model
4. Make debugging straightforward

The implementation effort is similar to fixing the current system, but the result is far more robust and extensible.
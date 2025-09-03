# Virtual Trim Playback Strategy

**Date**: August 20, 2025  
**Time**: 05:28 AM EST  
**Description**: Strategy for fixing trim playback without processing - Keep original videos, track segments virtually

**NOTE**: New file creation must adhere to format: `#-TimeEST-Description.md` (Run `TZ=America/New_York date "+%I%M%p"` for time)

## Deep Analysis: Will This Work?

After deep consideration, this approach has **challenges but is feasible**. Here's why:

### What We're Trying to Solve
```
Current: [Clip1-trim1] → [Clip1-trim2] → [Clip2-trim1]
           ↓                ↓                ↓
    Different IDs,    Treated as       Coordination
    Same source      separate clips     nightmare
```

### The Virtual Approach
```
Better: One video, multiple segment markers
Video1: |--trim1--|  gap  |--trim2--|
Video2:                              |--trim1--|
```

## Implementation Strategy

### Core Concept: Segment Tracker
```javascript
class VirtualSegmentPlayer {
  constructor() {
    this.segments = [
      // Instead of separate clips, track segments
      { 
        sourceUrl: 'blob:video1.mp4',
        timelineStart: 0,      // Where on timeline
        videoInPoint: 0,       // Where in video to start
        videoOutPoint: 2.5,    // Where in video to stop
        duration: 2.5
      },
      { 
        sourceUrl: 'blob:video1.mp4',  // SAME video
        timelineStart: 2.5,
        videoInPoint: 5.0,     // Different part of same video
        videoOutPoint: 8.0,
        duration: 3.0
      }
    ];
    
    this.currentVideo = null;
    this.currentSegmentIndex = 0;
  }
```

### Key Improvements Over Current System

1. **Single Video Load per Source**
```javascript
async loadSegment(segment) {
  // Only reload if different source
  if (this.currentVideo?.src !== segment.sourceUrl) {
    this.currentVideo = document.createElement('video');
    this.currentVideo.src = segment.sourceUrl;
    await this.waitForLoad();
  }
  
  // Just seek for same source
  this.currentVideo.currentTime = segment.videoInPoint;
}
```

2. **Precise OutPoint Monitoring**
```javascript
playSegment(segment) {
  let lastTime = segment.videoInPoint;
  
  const monitorEnd = () => {
    const currentTime = this.currentVideo.currentTime;
    
    // Check if we've reached or passed outPoint
    if (currentTime >= segment.videoOutPoint || 
        currentTime < lastTime) {  // Detect loop/seek
      this.onSegmentEnd();
      return;
    }
    
    lastTime = currentTime;
    
    if (!this.currentVideo.paused) {
      requestAnimationFrame(monitorEnd);
    }
  };
  
  this.currentVideo.play();
  monitorEnd();
}
```

3. **Scrubber Synchronization**
```javascript
class ScrubberSync {
  // Map scrubber position to video position
  scrubberToVideo(scrubberPos) {
    let accumulated = 0;
    
    for (const segment of this.segments) {
      if (scrubberPos < accumulated + segment.duration) {
        const offsetInSegment = scrubberPos - accumulated;
        return {
          video: segment.sourceUrl,
          time: segment.videoInPoint + offsetInSegment
        };
      }
      accumulated += segment.duration;
    }
  }
  
  // Map video position to scrubber position  
  videoToScrubber(videoTime, segmentIndex) {
    const segment = this.segments[segmentIndex];
    const offsetInSegment = videoTime - segment.videoInPoint;
    return segment.timelineStart + offsetInSegment;
  }
}
```

## Will It Actually Work?

### ✅ What Will Work
1. **Same-source segments**: No reloading, just seeking
2. **Scrubber accuracy**: Direct position mapping
3. **Extending trim edges**: Just update numbers
4. **Memory efficiency**: Reuse video elements

### ⚠️ Challenges to Solve
1. **Frame-accurate stopping**: Need precise outPoint detection
2. **Seamless transitions**: Slight pause between segments
3. **Seek performance**: Browser seeking can be slow
4. **Loop detection**: Need to handle video loop edge case

### 🔧 Critical Implementation Details

1. **Use requestAnimationFrame for monitoring**
   - More precise than timeupdate events
   - Can detect frame-by-frame

2. **Preload next segment**
```javascript
// While playing segment 1, prepare segment 2
if (nextSegment.sourceUrl === currentSegment.sourceUrl) {
  // Same video, just prepare seek point
  this.nextSeekPoint = nextSegment.videoInPoint;
} else {
  // Different video, preload in hidden element
  this.hiddenVideo.src = nextSegment.sourceUrl;
}
```

3. **Handle Edge Cases**
```javascript
// Detect if video loops back (reaches end)
if (currentTime < lastTime && currentTime < 1) {
  // Video looped, force stop
  this.handleSegmentEnd();
}

// Detect stuck playback
if (Math.abs(currentTime - lastTime) < 0.001) {
  stuckCounter++;
  if (stuckCounter > 10) {
    this.forceNextSegment();
  }
}
```

## Implementation Plan

### Phase 1: Proof of Concept (2 hours)
```javascript
// Minimal implementation to test approach
class SimpleSegmentPlayer {
  async play() {
    for (const segment of this.segments) {
      await this.playSegment(segment);
    }
  }
  
  async playSegment(segment) {
    if (this.video.src !== segment.sourceUrl) {
      this.video.src = segment.sourceUrl;
    }
    
    this.video.currentTime = segment.videoInPoint;
    await this.video.play();
    
    // Simple monitoring
    while (this.video.currentTime < segment.videoOutPoint) {
      await new Promise(r => setTimeout(r, 100));
    }
    
    this.video.pause();
  }
}
```

### Phase 2: Integration (2 hours)
- Replace current clip transition logic
- Update scrubber synchronization
- Handle pause/resume

### Phase 3: Polish (1 hour)
- Preloading for smooth transitions
- Progress indicators
- Error handling

## Honest Assessment

**Success Probability: 70%**

**Why it might work:**
- Simpler than current approach
- No blob URL management
- Direct position mapping

**Why it might fail:**
- Browser seeking limitations
- Frame accuracy issues
- Transition smoothness

**Fallback Plan:**
If virtual trimming has issues, implement "Apply Edits" button that processes clips when user is ready, keeping editing non-destructive.

## Recommendation

Try this approach for 4 hours. If we hit fundamental browser limitations, pivot to the "Process on Apply" approach from the earlier document.

The key insight: **Don't create new blobs for trims, reuse original videos with virtual segments.**
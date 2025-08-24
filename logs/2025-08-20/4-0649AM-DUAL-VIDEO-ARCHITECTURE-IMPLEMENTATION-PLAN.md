# Dual Video Architecture Implementation Plan

**Date**: August 20, 2025  
**Time**: 06:49 AM EST  
**Purpose**: Eliminate 1-2 second delays in trimmed clip playback through industry-standard dual video element architecture

## Problem Analysis

### Current Issues
- **Event-based timing**: `timeUpdate` events fire every 100-250ms (too slow for precise timing)
- **Natural video end delays**: Browser waits for full video duration instead of stopping at outPoint
- **Source switching gaps**: Single video element requires loading new sources, causing visual gaps
- **Race conditions**: Async event handling creates unpredictable timing

### Root Cause
Fighting against browser's natural video behavior instead of working with it. Professional video editors solve this with **dual video elements** and **frame-accurate monitoring**.

## Proposed Solution: Dual Video Element Architecture

### Core Concept
- **Primary Video**: Currently visible and playing
- **Buffer Video**: Hidden, preloading next clip
- **Instant Switching**: Toggle visibility instead of changing sources
- **Frame-Accurate Monitoring**: Use `requestVideoFrameCallback` for precise timing

## Implementation Strategy

### Phase 1: Enhanced PlaybackService

#### 1.1 Dual Video Element Setup
```typescript
class DualVideoPlaybackService {
  private primaryVideo: HTMLVideoElement
  private bufferVideo: HTMLVideoElement  
  private activeVideo: HTMLVideoElement
  private preloadedClips: Map<string, HTMLVideoElement> = new Map()
  
  constructor() {
    this.primaryVideo = this.createVideoElement('primary-video')
    this.bufferVideo = this.createVideoElement('buffer-video', true) // hidden
    this.activeVideo = this.primaryVideo
  }

  private createVideoElement(id: string, hidden = false): HTMLVideoElement {
    const video = document.createElement('video')
    video.id = id
    video.style.width = '100%'
    video.style.height = '100%'
    if (hidden) video.style.display = 'none'
    return video
  }
}
```

#### 1.2 Frame-Accurate Monitoring System
```typescript
private startFrameAccuratePlayback(clipSequence: TimelineClip[], startIndex: number) {
  let currentIndex = startIndex
  
  const monitorFrame = () => {
    const currentClip = clipSequence[currentIndex]
    const video = this.activeVideo
    
    // Use requestVideoFrameCallback for frame precision
    if ('requestVideoFrameCallback' in video) {
      video.requestVideoFrameCallback((now, metadata) => {
        const currentTime = video.currentTime
        
        // Check outPoint with frame-level precision
        if (currentTime >= currentClip.outPoint - (1 / (metadata.expectedDisplayTime || 60))) {
          this.executeSeamlessTransition(clipSequence, currentIndex + 1)
          return
        }
        
        // Continue monitoring if not paused
        if (!video.paused) monitorFrame()
      })
    } else {
      // Fallback to RAF with higher precision
      requestAnimationFrame(() => {
        if (video.currentTime >= currentClip.outPoint - 0.033) { // ~1 frame at 30fps
          this.executeSeamlessTransition(clipSequence, currentIndex + 1)
          return
        }
        if (!video.paused) monitorFrame()
      })
    }
  }
  
  // Start playback and monitoring
  this.activeVideo.play()
  monitorFrame()
}
```

#### 1.3 Seamless Transition System
```typescript
private async executeSeamlessTransition(clipSequence: TimelineClip[], nextIndex: number) {
  if (nextIndex >= clipSequence.length) {
    this.eventBus.emit('sequence.completed')
    return
  }

  const nextClip = clipSequence[nextIndex]
  const inactiveVideo = this.getInactiveVideo()
  
  // Switch active video elements instantly
  this.toggleActiveVideo()
  
  // Seek to inPoint of next clip
  inactiveVideo.currentTime = nextClip.inPoint
  
  // Wait for seek to complete
  await this.waitForSeek(inactiveVideo)
  
  // Start playback
  inactiveVideo.play()
  
  // Preload following clip in background
  if (clipSequence[nextIndex + 1]) {
    this.preloadClipInBackground(clipSequence[nextIndex + 1])
  }
  
  // Continue monitoring
  this.startFrameAccuratePlayback(clipSequence, nextIndex)
}

private toggleActiveVideo() {
  const previousActive = this.activeVideo
  this.activeVideo = this.getInactiveVideo()
  
  // Visual switch
  this.activeVideo.style.display = 'block'
  previousActive.style.display = 'none'
  
  // Update preview container reference
  this.updatePreviewContainer()
}
```

#### 1.4 Background Preloading
```typescript
private async preloadClipInBackground(clip: TimelineClip) {
  const inactiveVideo = this.getInactiveVideo()
  
  // Check if clip is already preloaded
  if (inactiveVideo.src === clip.sourceUrl) {
    return // Already loaded
  }
  
  // Load new source
  inactiveVideo.src = clip.sourceUrl
  
  return new Promise<void>((resolve, reject) => {
    const onLoaded = () => {
      inactiveVideo.removeEventListener('loadedmetadata', onLoaded)
      inactiveVideo.removeEventListener('error', onError)
      
      // Pre-seek to inPoint for instant playback
      inactiveVideo.currentTime = clip.inPoint
      resolve()
    }
    
    const onError = (e: Event) => {
      inactiveVideo.removeEventListener('loadedmetadata', onLoaded)
      inactiveVideo.removeEventListener('error', onError)
      reject(e)
    }
    
    inactiveVideo.addEventListener('loadedmetadata', onLoaded)
    inactiveVideo.addEventListener('error', onError)
  })
}
```

### Phase 2: Integration Layer Updates

#### 2.1 VideoEditorSingleton Modifications
```typescript
// Replace current playback monitoring
// OLD: Event-based timeUpdate monitoring
unsubscribers.push(
  eventBus.on('playback.timeUpdate', ({ currentTime }) => {
    // Remove this entire block - causes delays
  })
)

// NEW: Direct sequence execution
const dualVideoService = new DualVideoPlaybackService(eventBus)

// Handle clip sequences through enhanced service
if (playback.pendingClipTransition && snapshot.matches('playing')) {
  const clipSequence = this.calculateClipSequence(context.timeline.clips, playback.currentTime)
  
  // Execute entire sequence at once
  dualVideoService.executeClipSequence(clipSequence)
    .then(() => {
      stateMachine.send({ type: 'PLAYBACK.SEQUENCE_COMPLETED' })
    })
    .catch(error => {
      stateMachine.send({ type: 'PLAYBACK.ERROR', error })
    })
}
```

#### 2.2 State Machine Enhancements
```typescript
// Add new events to VideoEditorMachineV5.ts
export type VideoEditorEvents = 
  | { type: 'PLAYBACK.SEQUENCE_STARTED'; clipSequence: TimelineClip[] }
  | { type: 'PLAYBACK.CLIP_TRANSITION'; fromClipId: string; toClipId: string }
  | { type: 'PLAYBACK.SEQUENCE_COMPLETED' }
  | { type: 'PLAYBACK.ERROR'; error: any }
  // ... existing events

// Simplify playing state transitions
playing: {
  on: {
    'PAUSE': { target: 'paused' },
    'PLAYBACK.SEQUENCE_COMPLETED': { 
      target: 'paused',
      actions: 'handleSequenceCompleted' 
    },
    'PLAYBACK.CLIP_TRANSITION': {
      actions: 'updateCurrentClip' // Just track state, no timing logic
    },
    'PLAYBACK.ERROR': {
      target: 'error',
      actions: 'logPlaybackError'
    }
  }
}
```

### Phase 3: UI Component Updates

#### 3.1 VideoPreview Component Enhancement
```typescript
// Update VideoPreview.tsx to handle dual video elements
export function VideoPreview() {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const dualVideoService = getDualVideoPlaybackService()
    
    // Mount both video elements in container
    if (containerRef.current) {
      containerRef.current.appendChild(dualVideoService.primaryVideo)
      containerRef.current.appendChild(dualVideoService.bufferVideo)
    }
    
    return () => {
      // Cleanup on unmount
      dualVideoService.cleanup()
    }
  }, [])
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-lg overflow-hidden"
    >
      {/* Video elements will be mounted here */}
    </div>
  )
}
```

#### 3.2 Scrubber Synchronization
```typescript
// Update scrubber to work with active video element
private syncScrubberWithActiveVideo() {
  const activeVideo = dualVideoService.getActiveVideo()
  const timeline = this.getTimelineContext()
  
  // Use timeline position calculation instead of video currentTime
  const timelinePosition = this.calculateTimelinePosition(
    activeVideo.currentTime, 
    timeline.currentClip
  )
  
  this.updateScrubberPosition(timelinePosition)
}
```

## Implementation Timeline

### Week 1: Core Infrastructure
- [ ] Create `DualVideoPlaybackService` class
- [ ] Implement frame-accurate monitoring system
- [ ] Build seamless transition mechanism
- [ ] Add background preloading logic

### Week 2: Integration & Testing  
- [ ] Integrate with existing VideoEditorSingleton
- [ ] Update state machine events and transitions
- [ ] Modify UI components for dual video elements
- [ ] Test with multiple clip sequences

### Week 3: Optimization & Polish
- [ ] Optimize memory usage and cleanup
- [ ] Add error handling and fallbacks
- [ ] Performance tuning for smooth 60fps playback
- [ ] Cross-browser compatibility testing

## Expected Outcomes

### Performance Improvements
- **Transition Time**: From 1-2 seconds to <100ms
- **Timing Precision**: From ±250ms to ±16ms (1 frame)
- **Memory Usage**: Controlled with smart preloading
- **CPU Usage**: Lower than current event-driven approach

### User Experience Enhancements
- **Seamless Playback**: No gaps between trimmed clips
- **Responsive Scrubber**: Real-time position updates
- **Smooth Transitions**: Professional video editor feel
- **Reliable Timing**: No more unexpected pauses

## Risk Mitigation

### Browser Compatibility
- **Primary**: `requestVideoFrameCallback` (supported in all modern browsers)
- **Fallback**: `requestAnimationFrame` with higher precision timing
- **Graceful Degradation**: Fall back to current system if dual video fails

### Memory Management
- **Preload Limit**: Maximum 2-3 clips buffered at once  
- **Automatic Cleanup**: Release unused video elements promptly
- **Memory Monitoring**: Track and limit total video memory usage

### Error Recovery
- **Video Load Failures**: Retry with exponential backoff
- **Seek Failures**: Reset to last known good position
- **Transition Errors**: Fall back to single video element temporarily

## Success Metrics

1. **Timing Precision**: 95%+ of transitions within 1 frame accuracy
2. **User Experience**: Zero perceived gaps during playback
3. **Performance**: Maintain 60fps during all transitions  
4. **Reliability**: <1% failure rate in production usage
5. **Memory Usage**: <200MB for typical editing sessions

## Next Steps

1. **Get approval** for this implementation plan
2. **Create feature branch** for dual video architecture
3. **Implement Phase 1** (Enhanced PlaybackService)
4. **Test with existing clips** to validate approach
5. **Iterate based on results** before full integration

---

**Note**: This approach represents a fundamental shift from event-driven timing to proactive video management, following industry best practices used by professional web-based video editors.
# Flow 3: Spacebar Play/Pause Synchronization
## Nuclear-Grade Keyboard Control Implementation

> **Implementation Status**: READY FOR DEVELOPMENT
> **Prerequisites**: Flow 1 (Panel Stability) must be completed and user-approved
> **User Testing Required**: MANDATORY after implementation

---

## 🎯 Flow Overview

This flow implements professional-grade spacebar keyboard control for video playback with frame-accurate synchronization between video, timeline scrubber, and UI state.

### Core Requirements
- **Keyboard Focus Management**: Ensure spacebar only affects video when editor is focused
- **Perfect Synchronization**: Video, scrubber, and UI must move in perfect sync
- **Frame Accuracy**: ±1 frame tolerance for sync verification
- **Reliable Toggle**: Consistent play/pause behavior under all conditions
- **Edge Case Handling**: Robust behavior for all scenarios

---

## 📋 Initial State

**System State Before User Interaction:**
- Video editor interface has keyboard focus
- Video can be in either playing or paused state
- Timeline scrubber shows current position
- Play/pause button reflects current state
- Audio system is ready (muted or unmuted)

**State Machine Context:**
```typescript
interface SpacebarFlowState {
  videoState: {
    isPlaying: boolean
    currentTime: number
    hasVideoLoaded: boolean
  }
  uiState: {
    hasFocus: boolean
    playButtonState: 'play' | 'pause'
  }
  timelineState: {
    scrubberPosition: number
    isInSync: boolean
  }
}
```

---

## 🔄 User Interaction Flow

### 1. Focus Verification
**System Behavior:**
- System ensures video editor has keyboard focus
- If not focused, first click establishes focus
- Spacebar events only registered when editor is focused
- Focus state tracked in UI state

**Implementation Requirements:**
```typescript
// Focus verification before spacebar handling
handleKeyDown(event: KeyboardEvent) {
  if (!this.hasEditorFocus()) {
    return // Ignore spacebar if editor not focused
  }
  
  if (event.code === 'Space') {
    event.preventDefault() // Prevent page scroll
    this.handleSpacebarPress()
  }
}
```

### 2. Keypress Detection
**System Behavior:**
- User presses spacebar key
- System captures keydown event
- Prevents browser default behavior (page scroll)
- Validates that video is loaded and ready

**Technical Implementation:**
- Use `keydown` event (not `keypress` for better browser support)
- Prevent default behavior immediately
- Check for video element availability
- Verify state machine is ready for playback control

### 3. State Evaluation
**System Behavior:**
- System checks current video playback state
- Determines appropriate action (play or pause)
- Validates video element is responsive
- Ensures state machine is synchronized

**State Machine Pattern:**
```typescript
enum VideoPlaybackState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  LOADING = 'loading',
  ENDED = 'ended',
  ERROR = 'error'
}

handleSpacebarPress() {
  const currentState = this.getVideoState()
  
  switch (currentState) {
    case VideoPlaybackState.PLAYING:
      this.executePause()
      break
    case VideoPlaybackState.PAUSED:
      this.executePlay()
      break
    case VideoPlaybackState.ENDED:
      this.executeRestart()
      break
    default:
      this.showWarning('Video not ready for playback')
  }
}
```

### 4. Play Action (if currently paused)
**System Behavior:**
- Video begins playback from current scrubber position
- Preview video starts playing with audio (if present)
- Timeline scrubber begins smooth movement across timeline
- Play button UI updates to show pause icon
- Playback rate follows user-defined speed settings

**Nuclear-Grade Implementation:**
```typescript
async executePlay() {
  // Phase 1: Prepare for playback
  const scrubberTime = this.state.timelineState.scrubberPosition
  
  // Phase 2: Sync video to scrubber position
  await this.videoController.seekToTime(scrubberTime)
  
  // Phase 3: Start playback
  const success = await this.videoController.playVideo()
  if (!success) {
    throw new Error('Video play operation failed')
  }
  
  // Phase 4: Update UI state
  this.dispatch({ type: 'PLAYBACK_STARTED' })
  
  // Phase 5: Start sync monitoring
  this.startSyncMonitoring()
  
  // Phase 6: Verify perfect sync
  await this.verifySyncAccuracy()
}
```

**Synchronization Requirements:**
- Video element starts playing
- Scrubber movement animation begins
- Time display updates start
- Play button switches to pause icon
- Audio starts if enabled
- All changes happen atomically

### 5. Pause Action (if currently playing)
**System Behavior:**
- Video playback stops immediately
- Timeline scrubber freezes at current position
- Preview video shows static frame
- Pause button UI updates to show play icon
- Audio stops cleanly without pops/clicks

**Nuclear-Grade Implementation:**
```typescript
async executePause() {
  // Phase 1: Stop sync monitoring
  this.stopSyncMonitoring()
  
  // Phase 2: Pause video
  const success = await this.videoController.pauseVideo()
  if (!success) {
    throw new Error('Video pause operation failed')
  }
  
  // Phase 3: Update scrubber to exact video position
  const finalTime = this.videoElement.currentTime
  this.dispatch({ 
    type: 'UPDATE_SCRUBBER_POSITION', 
    time: finalTime 
  })
  
  // Phase 4: Update UI state
  this.dispatch({ type: 'PLAYBACK_PAUSED' })
  
  // Phase 5: Verify final sync
  await this.verifyFinalSync(finalTime)
}
```

### 6. Synchronized Movement During Playback
**System Behavior:**
- Preview video and timeline scrubber move in perfect sync
- Time display updates continuously (e.g., "00:05:32 / 00:15:45")
- Scrubber position accurately reflects video position
- Frame-accurate synchronization maintained

**Perfect Sync Implementation:**
```typescript
class VideoScrubberSync {
  private readonly SYNC_CHECK_INTERVAL = 16 // 60fps monitoring
  private syncTolerance = 1/60              // ±1 frame tolerance (dynamic)
  
  startSyncMonitoring() {
    this.syncInterval = setInterval(() => {
      this.verifySyncAndCorrect()
    }, this.SYNC_CHECK_INTERVAL)
  }
  
  verifySyncAndCorrect() {
    const videoTime = this.videoElement.currentTime
    const scrubberTime = this.state.timelineState.scrubberPosition
    const timeDiff = Math.abs(videoTime - scrubberTime)
    
    // Dynamic tolerance based on video frame rate
    const videoFrameRate = this.getVideoFrameRate() || 60
    this.syncTolerance = 1 / videoFrameRate
    
    if (timeDiff > this.syncTolerance) {
      // Sync drift detected - correct immediately
      this.correctSyncDrift(videoTime, scrubberTime)
    }
    
    // Update UI with current position
    this.updateTimeDisplay(videoTime)
    this.updateScrubberPosition(videoTime)
  }
}
```

---

## ⚠️ Edge Cases

### At Video End
**Behavior**: Spacebar restarts playback from beginning
```typescript
handleVideoEnded() {
  this.dispatch({ type: 'VIDEO_ENDED' })
  
  // Next spacebar press should restart
  this.spacebarAction = 'restart'
}

executeRestart() {
  this.dispatch({ type: 'SEEK', time: 0 })
  this.executePlay()
}
```

### No Video Loaded
**Behavior**: Spacebar has no effect, shows warning
```typescript
handleSpacebarWithoutVideo() {
  this.showUserFeedback({
    type: 'warning',
    message: 'No video loaded. Add a video to timeline first.',
    duration: 2000
  })
}
```

### Rapid Spacebar Presses
**Behavior**: Toggle play/pause reliably
```typescript
private lastSpacebarTime = 0
private readonly SPACEBAR_DEBOUNCE = 100 // 100ms debounce

handleSpacebarPress() {
  const now = performance.now()
  if (now - this.lastSpacebarTime < this.SPACEBAR_DEBOUNCE) {
    return // Ignore rapid presses
  }
  this.lastSpacebarTime = now
  
  this.executeSpacebarAction()
}
```

### Loss of Focus
**Behavior**: Spacebar stops affecting video
```typescript
handleFocusLoss() {
  this.editorHasFocus = false
  // Spacebar events will be ignored until focus returns
}

handleFocusGain() {
  this.editorHasFocus = true
  // Re-enable spacebar control
}
```

---

## 🎯 Technical Requirements

### Video Control Layer
- **Multi-method fallback** for play/pause operations
- **Verification** after each video control operation
- **Error recovery** when video operations fail
- **State consistency** maintained at all costs

### Synchronization System
- **60fps monitoring** during playback
- **Dynamic tolerance** based on video frame rate (±1 frame)
- **Automatic correction** for sync drift
- **Perfect accuracy** verification

### UI State Management
- **Atomic state updates** - all UI changes happen together
- **Consistent visual feedback** across all play/pause triggers
- **Focus state tracking** for keyboard event handling
- **Error state display** for user feedback

### Performance Requirements
- **< 50ms response time** for spacebar press to video action
- **< 16ms sync verification** during playback
- **Smooth scrubber movement** without frame drops
- **Clean audio transitions** without pops/clicks

---

## 🧪 User Testing Checklist

### Basic Functionality
- [ ] Spacebar toggles play/pause when editor has focus
- [ ] Video and scrubber move in perfect sync during playback
- [ ] Play button UI updates correctly with spacebar
- [ ] Time display updates continuously during playback

### Focus Management
- [ ] Spacebar ignored when editor doesn't have focus
- [ ] Clicking editor area establishes focus
- [ ] Focus loss stops spacebar control
- [ ] Focus regain re-enables spacebar control

### Edge Cases
- [ ] Rapid spacebar presses work reliably
- [ ] Spacebar at video end restarts from beginning
- [ ] Spacebar with no video shows appropriate warning
- [ ] Audio starts/stops cleanly without artifacts

### Synchronization
- [ ] Video and scrubber never drift apart
- [ ] Time display matches video position exactly
- [ ] Sync maintained after seeking operations
- [ ] Sync restored automatically if drift occurs

### Error Conditions
- [ ] Graceful handling when video fails to play
- [ ] Recovery when video element becomes unresponsive
- [ ] Clear user feedback for error conditions
- [ ] State consistency maintained during errors

---

## 🚀 Implementation Strategy

### Phase 3.1: Basic Spacebar Control (30 min)
1. Implement keyboard event detection
2. Add focus management
3. Basic play/pause toggle
4. UI state synchronization

### Phase 3.2: Perfect Synchronization (45 min)
1. Implement sync monitoring system
2. Add drift detection and correction
3. Dynamic tolerance calculation
4. Continuous verification

### Phase 3.3: Edge Case Handling (30 min)
1. Video end restart behavior
2. No video warning system
3. Rapid press debouncing
4. Focus loss handling

### Phase 3.4: Error Recovery (15 min)
1. Video control fallback methods
2. State recovery mechanisms
3. User feedback system
4. Verification and testing

---

## 🔗 Integration Points

### State Machine Integration
```typescript
// New actions for Flow 3
type SpacebarActions = 
  | { type: 'SPACEBAR_PLAY' }
  | { type: 'SPACEBAR_PAUSE' }
  | { type: 'SPACEBAR_RESTART' }
  | { type: 'FOCUS_GAINED' }
  | { type: 'FOCUS_LOST' }
  | { type: 'SYNC_DRIFT_DETECTED'; drift: number }
  | { type: 'SYNC_CORRECTED' }
```

### Video Controller Integration
```typescript
// Enhanced video controller for Flow 3
interface VideoController {
  playVideo(): Promise<boolean>
  pauseVideo(): Promise<boolean>
  getCurrentTime(): number
  isPlaying(): boolean
  getFrameRate(): number
  verifySyncAccuracy(): Promise<boolean>
}
```

---

## ✅ Success Criteria

Flow 3 is considered complete when:

1. **Perfect Synchronization**: Video and scrubber maintain frame-accurate sync (±1 frame)
2. **Reliable Control**: Spacebar consistently toggles playback under all conditions
3. **Focus Management**: Keyboard control only active when editor has focus
4. **Edge Case Handling**: All edge cases handled gracefully with user feedback
5. **Performance**: All operations complete within specified time limits
6. **User Approval**: Manual testing checklist completed and approved by user

**🚨 MANDATORY**: This flow requires explicit user testing and approval before proceeding to Flow 4

---

**Next Flow**: Flow 4 - Timeline Zoom with MacBook Touchpad
**Dependencies**: This flow builds upon the video control and state management established in Flow 1
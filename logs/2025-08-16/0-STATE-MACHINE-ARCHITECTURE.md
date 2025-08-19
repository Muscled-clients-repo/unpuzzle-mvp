# Video Editor State Machine Architecture
## Nuclear-Grade Implementation Guide

> **For Claude Code**: This document defines the core principles and architecture for the video editor state machine. Follow these principles exactly when implementing any new features.

---

## 🎯 Core Principles

### 1. Single Source of Truth (CRITICAL)
- **ONE** state machine controls ALL editor operations
- **NEVER** use scattered `useState` for critical operations
- **ALL** state changes go through the central state machine
- **NO** direct state mutations outside the state machine

```typescript
// ✅ CORRECT: All state through central machine
dispatch({ type: 'PLAY' })
dispatch({ type: 'SEEK', time: 10.5 })

// ❌ WRONG: Direct state manipulation
setState({ isPlaying: true })
videoElement.currentTime = 10.5
```

### 2. Immutable State Architecture
- State objects are **IMMUTABLE** unless explicitly modified via actions
- Panel dimensions are **LOCKED** unless in explicit resize mode
- Video element properties sync FROM state, never TO state
- React re-renders triggered by shallow state copies only

### 3. Three-Lane Command Processing
Operations are processed by priority and conflict resolution:

#### Real-Time Lane (< 8ms response)
- Scrubbing operations
- Zoom gestures  
- UI feedback updates
- **Bypasses queue** for immediate execution
- **Cancels outdated** commands for freshness

#### Sequential Lane (< 16ms response)
- Edit operations (trim, delete, move)
- Clip management
- **Queued and atomic** - complete fully or fail completely
- **Exponential backoff** retry on failure

#### Background Lane (deferred, non-blocking)
- Sync verification
- State validation
- Performance monitoring
- **Never blocks** user interactions

### 4. Multi-Layer Verification System
Every critical operation has multiple fallback methods:
- **Primary method** → **Fallback method** → **Emergency recovery**
- Video control: Direct API → Video.js API → DOM simulation → Emergency reset
- State sync: Automatic correction → Manual correction → Full state reconstruction

---

## 🏗️ State Machine Design

### Core State Structure

```typescript
interface EditorState {
  // Video Control State
  videoState: {
    isPlaying: boolean           // Master playback state
    currentTime: number          // Authoritative time position
    duration: number             // Video total duration
    playbackRate: number         // Playback speed multiplier
    lastSyncTime: number         // Last verified sync timestamp
    syncErrorTolerance: number   // Max allowed desync (±1 frame)
  }
  
  // Timeline State  
  timelineState: {
    zoomLevel: number            // Current zoom level (1x = full video visible)
    viewportStart: number        // Timeline viewport start time
    viewportEnd: number          // Timeline viewport end time
    scrubberPosition: number     // Current scrubber time position
    isDraggingScrubber: boolean  // Critical for preventing conflicts
    selectedClips: string[]      // Currently selected clip IDs
  }
  
  // UI State (IMMUTABLE unless explicit resize)
  uiState: {
    leftPanelWidth: number       // LOCKED at 400px unless resizing
    bottomPanelHeight: number    // LOCKED at 320px unless resizing
    videoScale: number           // Preview zoom level
    showGrid: boolean            // Grid overlay visibility
    currentSegmentVideo: string  // Currently displayed video URL
  }
  
  // Content State
  contentState: {
    videoSegments: VideoSegment[]  // Timeline video clips
    audioSegments: AudioSegment[]  // Timeline audio clips
    textSegments: TextSegment[]    // Timeline text overlays
  }
  
  // System State
  systemState: {
    currentState: EditorState    // Current operational state
    lastOperation: string        // Last successful operation
    errors: Error[]              // Error stack for recovery
  }
}
```

### State Transition Rules

#### Video State Transitions
```typescript
enum VideoState {
  VIDEO_PLAYING,    // Video actively playing
  VIDEO_PAUSED,     // Video paused/stopped
  VIDEO_SCRUBBING,  // Real-time scrub during drag (preview updates)
  VIDEO_SEEKING,    // Seeking to specific time (permanent seek)
  VIDEO_SYNCING,    // Ensuring video-scrubber sync
}
```

**Critical Rules:**
- `SCRUBBING` → Temporary video seeking for preview, restore on release
- `SEEKING` → Permanent video position change
- `SYNCING` → Background sync verification, never blocks user interaction
- **NEVER** transition directly from `PLAYING` to `SCRUBBING` - always pause first

#### Timeline State Transitions
```typescript
enum TimelineState {
  TIMELINE_IDLE,        // Normal state, ready for input
  TIMELINE_ZOOMING,     // Zoom operation in progress (always scrubber-centered)
  TIMELINE_SELECTING,   // Clip selection in progress
  TIMELINE_DRAGGING,    // Clip drag operation in progress
}
```

**Critical Rules:**
- Zoom **ALWAYS** centers around scrubber position (never cursor)
- Drag operations are **atomic** - complete fully or revert completely
- Multiple selection requires explicit multi-select mode

---

## 🛡️ Panel Stability System

### Nuclear-Grade Panel Locking

Panels are **COMPLETELY IMMUNE** to content changes:

```typescript
class PanelStabilityManager {
  // Immutable dimensions - only changeable during explicit resize
  private lockedDimensions = {
    leftPanelWidth: 400,    // NEVER changes except during resize
    bottomPanelHeight: 320  // NEVER changes except during resize
  }
  
  // Resize state tracking
  private isResizing = false
  private resizeTarget: 'left' | 'bottom' | null = null
}
```

### Panel Modification Rules

**✅ ALLOWED:**
- Mouse down on resize handle → `startResize(target)` → dimensions unlocked
- Mouse drag → dimensions update with constraints
- Mouse up → `endResize()` → dimensions locked again

**❌ FORBIDDEN:**
- Content loading affecting panel size
- Video changes affecting panel size  
- Recording operations affecting panel size
- Programmatic panel resizing outside resize handles
- Percentage-based panel sizing
- Auto-resize based on content

### Implementation Pattern

```typescript
// CORRECT: Panel resize through stability manager
onMouseDown={() => {
  panelManager.startResize('left')
  // Now panel width changes are allowed
}}

onMouseUp={() => {
  panelManager.endResize()  
  // Panel dimensions locked again
}}

// WRONG: Direct panel manipulation
onSomeEvent={() => {
  dispatch({ type: 'SET_LEFT_PANEL_WIDTH', width: 500 }) // BLOCKED
}}
```

---

## ⚡ Performance Architecture

### Command Queue System

```typescript
interface Command {
  type: CommandType
  payload: any
  priority: 'realtime' | 'sequential' | 'background'
  timestamp: number
  timeout: number
}
```

#### Real-Time Commands (< 8ms)
- **Immediate execution** - bypass queue
- **Cancel outdated** commands if newer ones arrive
- **Frame budget** monitoring - defer if exceeding 8ms
- Used for: scrubbing, zoom, immediate UI feedback

#### Sequential Commands (< 16ms)  
- **FIFO queue** processing
- **Atomic operations** - complete or rollback
- **Retry logic** with exponential backoff
- Used for: edit operations, segment management

#### Background Commands (deferred)
- **Lowest priority** processing
- **Never block** user interactions
- **Batch processing** when idle
- Used for: sync verification, performance monitoring

### Video-Scrubber Synchronization

```typescript
class VideoScrubberSync {
  private readonly SYNC_CHECK_INTERVAL = 16  // 60fps monitoring
  private syncTolerance = 1/60               // ±1 frame tolerance (dynamic)
  
  verifySyncAndCorrect() {
    const videoTime = this.videoElement.currentTime
    const scrubberTime = this.state.timelineState.scrubberPosition
    const timeDiff = Math.abs(videoTime - scrubberTime)
    
    // Dynamic tolerance based on video frame rate
    const videoFrameRate = this.getVideoFrameRate() || 60
    this.syncTolerance = 1 / videoFrameRate
    
    if (timeDiff > this.syncTolerance) {
      this.correctSyncDrift(videoTime, scrubberTime, timeDiff)
    }
  }
}
```

**Sync Rules:**
- **Continuous monitoring** at 60fps during playback
- **Dynamic tolerance** based on video frame rate (±1 frame)
- **Automatic correction** for small drifts (< 100ms)
- **Video seeking** for large drifts (> 100ms)
- **Perfect sync** during scrubbing operations

---

## 🎬 Video Control Layer

### Nuclear-Grade Video Control

```typescript
class VideoController {
  // Multi-method video control with fallbacks
  async pauseVideo(): Promise<boolean> {
    // Method 1: Direct video element control
    try {
      this.videoElement.pause()
      if (await this.verifyPaused()) return true
    } catch (e) { /* Continue to next method */ }
    
    // Method 2: Video.js API (if available)
    try {
      this.videoPlayer.pause()
      if (await this.verifyPaused()) return true
    } catch (e) { /* Continue to next method */ }
    
    // Method 3: DOM event simulation  
    try {
      this.simulateSpacebarPress()
      if (await this.verifyPaused()) return true
    } catch (e) { /* Continue to next method */ }
    
    // Method 4: Emergency state reset
    this.performEmergencyReset()
    throw new Error('All pause methods failed')
  }
}
```

**Control Principles:**
- **Multiple methods** for every critical operation
- **Verification** after each attempt
- **Graceful degradation** through fallback methods
- **Emergency recovery** when all methods fail
- **State consistency** maintained at all costs

### Scrubbing vs Seeking Distinction

```typescript
// SCRUBBING: Temporary seeking for preview updates
handleScrubMove(time: number) {
  // Store original position
  const originalTime = this.videoElement.currentTime
  
  // Temporary seek for preview rendering
  this.videoElement.currentTime = time
  this.renderPreviewFrame()
  
  // Restore original position (during scrubbing)
  if (this.isDragging) {
    this.videoElement.currentTime = originalTime
  }
}

// SEEKING: Permanent position change
handleScrubEnd(finalTime: number) {
  // Permanent seek to final position
  this.videoElement.currentTime = finalTime
  this.verifyTimeSet(finalTime)
}
```

---

## 🧪 Error Recovery System

### Nuclear-Grade Error Handling

```typescript
class ErrorRecoverySystem {
  private readonly MAX_RECOVERY_ATTEMPTS = 3
  
  async handleCriticalError(error: Error, context: EditorState) {
    if (this.recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
      return this.performEmergencyReset()
    }
    
    try {
      // Step 1: Emergency stop all operations
      await this.emergencyStop()
      
      // Step 2: Verify video element integrity  
      await this.verifyVideoElementIntegrity()
      
      // Step 3: Reconstruct state from video element
      await this.reconstructStateFromVideo()
      
      // Step 4: Resume normal operation
      await this.resumeOperation()
      
    } catch (recoveryError) {
      this.scheduleRetry()
    }
  }
}
```

**Recovery Principles:**
- **Immediate isolation** - stop all operations
- **State reconstruction** from reliable sources
- **Graceful degradation** - preserve user work
- **User notification** without technical details
- **Automatic retry** with exponential backoff

---

## 📐 Implementation Patterns

### Action Pattern

```typescript
// CORRECT: Descriptive action with clear intent
dispatch({ 
  type: 'VIDEO_SCRUB_MOVE', 
  payload: { 
    time: newTime,
    updatePreview: true,
    continuous: true 
  }
})

// WRONG: Generic action without context
dispatch({ type: 'UPDATE', value: newTime })
```

### State Update Pattern

```typescript
// CORRECT: Immutable update with validation
private handleSeek(time: number) {
  const constrainedTime = Math.max(0, Math.min(time, this.state.videoState.duration))
  
  this.state = {
    ...this.state,
    videoState: {
      ...this.state.videoState,
      currentTime: constrainedTime,
      lastSyncTime: performance.now()
    }
  }
  
  this.verifyAndSync()
}

// WRONG: Direct mutation
private handleSeek(time: number) {
  this.state.videoState.currentTime = time  // NEVER DO THIS
}
```

### Component Integration Pattern

```typescript
// CORRECT: State machine integration
export function useVideoEditor() {
  const [context, setContext] = useState<EditorContext>()
  const editorRef = useRef<VideoEditorStateMachine | null>(null)
  
  useEffect(() => {
    if (!editorRef.current) {
      editorRef.current = new VideoEditorStateMachine()
    }
    
    const unsubscribe = editorRef.current.subscribe(setContext)
    setContext(editorRef.current.getContext())
    
    return () => {
      unsubscribe()
      editorRef.current?.cleanup()
    }
  }, [])
  
  const dispatch = useCallback((action: EditorAction) => {
    editorRef.current?.dispatch(action)
  }, [])
  
  return { context, dispatch }
}
```

---

## ⚠️ Critical "DO NOT" Rules

### State Management
- ❌ **NEVER** use multiple state machines for the same domain
- ❌ **NEVER** mutate state directly outside the state machine
- ❌ **NEVER** use localStorage/sessionStorage for critical state
- ❌ **NEVER** trust video element state as source of truth

### Panel Management  
- ❌ **NEVER** resize panels based on content
- ❌ **NEVER** use percentage-based panel sizing
- ❌ **NEVER** allow flex layout to override explicit dimensions
- ❌ **NEVER** programmatically resize panels outside resize handles

### Video Control
- ❌ **NEVER** assume video element operations succeed
- ❌ **NEVER** rely on single-method video control
- ❌ **NEVER** use video element events as primary state source
- ❌ **NEVER** perform video operations without verification

### Performance
- ❌ **NEVER** block the main thread for > 16ms
- ❌ **NEVER** perform sync operations during real-time operations
- ❌ **NEVER** use setTimeout/setInterval for critical timing
- ❌ **NEVER** perform DOM queries during high-frequency operations

### Timeline Operations
- ❌ **NEVER** zoom around cursor position on timeline (always scrubber)
- ❌ **NEVER** allow timeline operations without clip selection
- ❌ **NEVER** perform non-atomic edit operations
- ❌ **NEVER** update timeline without segment verification

---

## ✅ Expected Behaviors

### Panel Stability
- Panels maintain exact pixel dimensions during ALL operations
- Only resize handle drag can modify panel sizes
- Recording has ZERO effect on panel dimensions
- Content loading has ZERO effect on panel dimensions

### Video-Timeline Sync
- Video and scrubber maintain perfect sync (±1 frame tolerance)
- Scrubbing shows real-time preview without affecting playback position
- Seeking permanently changes video position
- Sync verification runs continuously at 60fps

### Performance Guarantees  
- Scrubber dragging: < 8ms response time (120fps+ smoothness)
- Edit operations: < 16ms response time
- Timeline zoom: Always centers around scrubber position
- No frame drops during normal operation

### Error Recovery
- System recovers gracefully from any error
- User work is preserved during recovery
- No data loss occurs during error conditions
- Clear user feedback without technical details

---

## 🔧 Integration Guidelines

When implementing new features:

1. **Check existing state structure** - extend, don't replace
2. **Follow three-lane architecture** - choose appropriate priority
3. **Implement multi-method fallbacks** for critical operations
4. **Verify panel stability** - ensure no unintended resize
5. **Test error conditions** - implement graceful recovery
6. **Maintain sync accuracy** - video-scrubber must remain synchronized
7. **Follow immutable patterns** - no direct state mutations
8. **Document state transitions** - clear before/after states

### New Feature Checklist

- [ ] Identifies appropriate command lane (realtime/sequential/background)
- [ ] Implements multi-method fallback for critical operations
- [ ] Preserves panel dimension immutability
- [ ] Maintains video-scrubber synchronization
- [ ] Includes error recovery mechanisms
- [ ] Follows immutable state update patterns
- [ ] Provides clear user feedback
- [ ] Includes performance monitoring
- [ ] Documents state transitions
- [ ] Tests edge cases and error conditions

---

## 🔍 Testing and Verification Patterns

### User Testing Integration
Following the gradual verification principle:

```typescript
// ALWAYS implement with user testing checkpoints
class FeatureImplementation {
  implementPhase1() {
    // Implement basic functionality
    this.markPhaseComplete('1.1')
    this.waitForUserApproval() // MANDATORY - never proceed without approval
  }
  
  implementPhase2() {
    // Only proceed after explicit user confirmation
    if (!this.hasUserApproval('1.1')) {
      throw new Error('Cannot proceed without Phase 1 approval')
    }
  }
}
```

**Testing Requirements:**
- Each feature phase requires explicit user testing and approval
- No progression without confirmation of previous phase
- Manual testing checklist for each feature
- Performance verification at each checkpoint

### State Verification Patterns

```typescript
// ALWAYS verify state consistency after operations
private verifyStateConsistency() {
  // Panel stability verification
  const panelDims = this.panelManager.getDimensions()
  assert(this.state.ui.leftPanelWidth === panelDims.leftPanelWidth)
  assert(this.state.ui.bottomPanelHeight === panelDims.bottomPanelHeight)
  
  // Video-timeline sync verification
  const timeDiff = Math.abs(this.videoElement.currentTime - this.state.timelineState.scrubberPosition)
  assert(timeDiff <= this.syncTolerance)
  
  // Content integrity verification
  assert(this.state.content.videoSegments.every(segment => segment.duration > 0))
}
```

---

## 🎨 UI State Management Principles

### Zoom Behavior (Critical Implementation Rule)

```typescript
// Timeline zoom ALWAYS centers around scrubber (NEVER cursor)
handleTimelineZoom(zoomDelta: number) {
  const anchorTime = this.state.timelineState.scrubberPosition  // ALWAYS scrubber
  const newZoom = this.calculateNewZoom(zoomDelta)
  
  // FORBIDDEN: Cursor-based zoom on timeline
  // const anchorTime = this.pixelToTime(cursorX)  // NEVER DO THIS
  
  this.executeZoom(newZoom, anchorTime)
}

// Preview zoom centers around cursor (DIFFERENT from timeline)
handlePreviewZoom(zoomDelta: number, cursorX: number, cursorY: number) {
  const anchorX = cursorX  // Cursor position is correct for preview
  const anchorY = cursorY
  this.executePreviewZoom(newZoom, anchorX, anchorY)
}
```

### Grid and Snapping Systems

```typescript
interface SnapSystem {
  magneticThreshold: 8        // Pixels for magnetic snap
  magneticForce: boolean      // Auto-connection in snap zones
  guidanceOnly: boolean       // Visual guidance without auto-snap
  snapToGrid: boolean         // Grid-based snapping
  snapToClips: boolean        // Clip-to-clip snapping
}

// Magnetic timeline behavior
enum GapManagementMode {
  MAGNETIC = 'magnetic',      // Auto-connection when released in snap zone
  GUIDANCE = 'guidance',      // Visual guidance only
  OFF = 'off'                 // No magnetic behavior
}
```

---

## 📁 File and Asset Management

### Asset Loading Patterns

```typescript
class AssetManager {
  // ALWAYS verify asset integrity before adding to timeline
  async addAssetToTimeline(asset: Asset) {
    // Verify asset exists and is accessible
    await this.verifyAssetIntegrity(asset)
    
    // Create segment with proper validation
    const segment = this.createValidatedSegment(asset)
    
    // Add through state machine (never direct)
    this.dispatch({ type: 'ADD_VIDEO_SEGMENT', segment })
    
    // Update preview (explicit URL setting)
    this.dispatch({ type: 'UPDATE_CURRENT_SEGMENT_VIDEO', videoUrl: asset.url })
  }
  
  // Test video integration
  createTestVideoSegment(testVideoKey: string): VideoSegment {
    const testVideo = TEST_VIDEOS[testVideoKey]
    return {
      id: `segment-test-${Date.now()}`,
      startTime: this.getNextStartTime(),  // Use state machine method
      duration: testVideo.duration,
      videoUrl: testVideo.url,
      name: testVideo.name,
      trackIndex: 0
    }
  }
}
```

### Memory Management

```typescript
// ALWAYS cleanup resources when removing assets
handleDeleteSegment(segmentId: string) {
  const segment = this.findSegment(segmentId)
  
  // Cleanup video URL if it's a blob
  if (segment.videoUrl.startsWith('blob:')) {
    URL.revokeObjectURL(segment.videoUrl)
  }
  
  // Remove from state
  this.state.content.videoSegments = this.state.content.videoSegments.filter(
    s => s.id !== segmentId
  )
  
  // Verify cleanup
  this.verifyMemoryCleanup()
}
```

---

## 🔄 Undo/Redo System Architecture

### Command History Pattern

```typescript
interface EditorCommand {
  type: string
  execute(): void
  undo(): void
  redo?(): void
  canUndo(): boolean
  description: string
  timestamp: number
}

class UndoRedoManager {
  private undoStack: EditorCommand[] = []
  private redoStack: EditorCommand[] = []
  private readonly MAX_HISTORY = 50
  
  executeCommand(command: EditorCommand) {
    // Execute the command
    command.execute()
    
    // Add to undo stack
    this.undoStack.push(command)
    
    // Clear redo stack (new action invalidates redo)
    this.redoStack = []
    
    // Maintain stack size
    if (this.undoStack.length > this.MAX_HISTORY) {
      this.undoStack.shift()
    }
    
    // Verify state consistency after command
    this.verifyStateConsistency()
  }
}
```

---

## 🎵 Audio System Integration

### Audio-Video Synchronization

```typescript
interface AudioState {
  audioSegments: AudioSegment[]
  masterVolume: number
  isMuted: boolean
  audioContext: AudioContext
  syncOffset: number           // Audio-video sync offset
}

class AudioVideoSync {
  // ALWAYS maintain audio-video sync
  syncAudioToVideo() {
    const videoTime = this.videoElement.currentTime
    const audioTime = this.audioContext.currentTime
    const syncDiff = Math.abs(videoTime - audioTime)
    
    if (syncDiff > this.AUDIO_SYNC_TOLERANCE) {
      this.correctAudioSync(videoTime)
    }
  }
  
  // Handle audio during scrubbing
  handleScrubAudio(isScrubbingActive: boolean) {
    if (isScrubbingActive) {
      // Mute audio during scrubbing for smooth experience
      this.temporaryMuteAudio()
    } else {
      // Restore audio when scrubbing ends
      this.restoreAudioState()
    }
  }
}
```

---

## 🚀 Performance Optimization Patterns

### Virtualization for Large Projects

```typescript
class TimelineVirtualization {
  // Only render visible segments for performance
  getVisibleSegments(): VideoSegment[] {
    const viewportStart = this.state.timelineState.viewportStart
    const viewportEnd = this.state.timelineState.viewportEnd
    
    return this.state.content.videoSegments.filter(segment => {
      const segmentEnd = segment.startTime + segment.duration
      return (
        segment.startTime < viewportEnd && 
        segmentEnd > viewportStart
      )
    })
  }
  
  // Efficient rendering with frame budgeting
  renderTimeline() {
    const startTime = performance.now()
    const visibleSegments = this.getVisibleSegments()
    
    // Render only what's visible
    const renderedElements = visibleSegments.map(this.renderSegment)
    
    const renderTime = performance.now() - startTime
    if (renderTime > this.FRAME_BUDGET) {
      console.warn(`Timeline render exceeded budget: ${renderTime.toFixed(2)}ms`)
      this.optimizeNextRender()
    }
    
    return renderedElements
  }
}
```

### Memory Usage Monitoring

```typescript
class MemoryMonitor {
  private readonly MEMORY_WARNING_THRESHOLD = 100 * 1024 * 1024  // 100MB
  
  checkMemoryUsage() {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      if (memInfo.usedJSHeapSize > this.MEMORY_WARNING_THRESHOLD) {
        this.performMemoryCleanup()
      }
    }
  }
  
  performMemoryCleanup() {
    // Cleanup unused blob URLs
    this.cleanupBlobURLs()
    // Clear undo history if needed
    this.optimizeUndoHistory()
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc()
    }
  }
}
```

---

## 🔐 Security and Validation Patterns

### Input Validation

```typescript
class InputValidator {
  // ALWAYS validate user inputs
  validateTimeInput(time: number): number {
    // Sanitize and constrain
    if (!isFinite(time) || isNaN(time)) return 0
    return Math.max(0, Math.min(time, this.maxDuration))
  }
  
  validateSegmentData(segment: Partial<VideoSegment>): VideoSegment {
    return {
      id: segment.id || `segment-${Date.now()}`,
      startTime: this.validateTimeInput(segment.startTime || 0),
      duration: Math.max(0.1, this.validateTimeInput(segment.duration || 1)),
      videoUrl: this.sanitizeURL(segment.videoUrl || ''),
      name: this.sanitizeString(segment.name || 'Untitled'),
      trackIndex: Math.max(0, Math.floor(segment.trackIndex || 0))
    }
  }
  
  sanitizeURL(url: string): string {
    // Only allow specific URL patterns
    const allowedPatterns = [
      /^\/test-assets\//,     // Local test assets
      /^blob:/,               // Blob URLs for recordings
      /^data:/                // Data URLs for generated content
    ]
    
    if (allowedPatterns.some(pattern => pattern.test(url))) {
      return url
    }
    
    throw new Error(`Invalid URL pattern: ${url}`)
  }
}
```

---

## 📱 Responsive Design Considerations

### Breakpoint Management

```typescript
interface ViewportState {
  width: number
  height: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

class ResponsiveManager {
  // Adapt panel sizes for different screen sizes
  getAdaptivePanelSizes(viewport: ViewportState) {
    if (viewport.isMobile) {
      return {
        leftPanelWidth: Math.min(300, viewport.width * 0.8),
        bottomPanelHeight: Math.min(200, viewport.height * 0.4)
      }
    }
    
    if (viewport.isTablet) {
      return {
        leftPanelWidth: 350,
        bottomPanelHeight: 280
      }
    }
    
    // Desktop default
    return {
      leftPanelWidth: 400,
      bottomPanelHeight: 320
    }
  }
}
```

---

## 🎯 Feature Flag System

### Gradual Feature Rollout

```typescript
interface FeatureFlags {
  advancedEditing: boolean      // Trim, split, magnetic timeline
  audioEditing: boolean         // Audio tracks and editing
  multiTrack: boolean          // Multiple video tracks
  aiFeatures: boolean          // AI-powered features
  betaFeatures: boolean        // Experimental features
}

class FeatureManager {
  private flags: FeatureFlags
  
  // ALWAYS check feature flags before implementing
  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature] ?? false
  }
  
  // Graceful degradation when features are disabled
  executeWithFeatureCheck<T>(
    feature: keyof FeatureFlags,
    enabledFn: () => T,
    disabledFn: () => T
  ): T {
    return this.isFeatureEnabled(feature) ? enabledFn() : disabledFn()
  }
}
```

---

**Remember: This is nuclear-grade video editing software. Every operation must be reliable, every state change must be verified, and every error must be recoverable. User work preservation is paramount.**
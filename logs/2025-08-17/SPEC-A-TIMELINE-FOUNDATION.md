# Specification A: Timeline Foundation
## Implementation Following Bulletproof Video Editor Architecture

> **Reference**: This specification strictly follows principles from `1-0909AM-BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md`

---

## 📋 Overview

**Group A Features to Implement:**
- Phase A1: Basic Timeline & Clip Population
- Phase A2: Timeline Scrubber & Navigation

**Architecture Principles Applied:**
1. ✅ Single Source of Truth (Timeline state in XState context only)
2. ✅ Event-Driven Communication (All updates via EventBus)
3. ✅ State Machine Authority (XState validates all timeline transitions)
4. ✅ Service Boundary Isolation (TimelineService has single responsibility)
5. ✅ Pure Component Pattern (Timeline components only render)

---

## 🏗️ State Machine Extensions

### 1. Update VideoEditorContext (SSOT Principle)

```typescript
// src/lib/video-editor/state-machine/VideoEditorMachine.ts
// EXTENDS lines 68-80 from architecture document

export interface VideoEditorContext {
  // Existing state...
  currentTime: number
  totalDuration: number
  isPlaying: boolean
  segments: VideoSegment[]
  selectedSegmentId: string | null
  recording: {
    startTime: number | null
    duration: number
    isActive: boolean
  }
  
  // NEW: Timeline-specific state (Phase A1 & A2)
  timeline: {
    clips: TimelineClip[]
    tracks: Track[]
    scrubber: {
      position: number  // Position in seconds
      isDragging: boolean
      snapEnabled: boolean
    }
    viewport: {
      zoom: number  // 1 = 100%, 2 = 200%, etc.
      scrollLeft: number  // Horizontal scroll position
      pixelsPerSecond: number  // Base: 50px/s
    }
  }
}

// NEW: Timeline types
export interface TimelineClip {
  id: string
  trackId: string
  sourceUrl: string  // Video URL from recording
  startTime: number  // Position on timeline (seconds)
  duration: number   // Clip duration (seconds)
  inPoint: number    // Start point in source (seconds)
  outPoint: number   // End point in source (seconds)
  label: string
  isSelected: boolean
}

export interface Track {
  id: string
  type: 'video' | 'audio'
  index: number
  height: number
  isLocked: boolean
  isVisible: boolean
}
```

### 2. New State Machine Events

```typescript
// EXTENDS lines 82-89 from architecture document

export type VideoEditorEvent = 
  // Existing events...
  | { type: 'RECORDING.START'; mode: 'screen' | 'camera' | 'audio' }
  | { type: 'RECORDING.STOP' }
  | { type: 'PLAYBACK.PLAY' }
  | { type: 'PLAYBACK.PAUSE' }
  | { type: 'PLAYBACK.SEEK'; time: number }
  | { type: 'TIMELINE.ADD_SEGMENT'; segment: VideoSegment }
  | { type: 'TIMELINE.SELECT_SEGMENT'; segmentId: string }
  
  // NEW: Timeline events (Phase A1)
  | { type: 'TIMELINE.CLIP_ADDED'; clip: TimelineClip }
  | { type: 'TIMELINE.CLIP_SELECTED'; clipId: string }
  | { type: 'TIMELINE.TRACK_ADDED'; track: Track }
  
  // NEW: Scrubber events (Phase A2)
  | { type: 'SCRUBBER.START_DRAG' }
  | { type: 'SCRUBBER.DRAG'; position: number }
  | { type: 'SCRUBBER.END_DRAG' }
  | { type: 'SCRUBBER.CLICK'; position: number }
  | { type: 'SCRUBBER.UPDATE_POSITION'; position: number }
```

### 3. State Machine Actions

```typescript
// EXTENDS lines 161-192 from architecture document

{
  actions: {
    // Existing actions...
    
    // NEW: Timeline actions (Phase A1)
    addClipToTimeline: assign({
      timeline: (context, event) => ({
        ...context.timeline,
        clips: [...context.timeline.clips, event.clip]
      }),
      totalDuration: (context, event) => Math.max(
        context.totalDuration,
        event.clip.startTime + event.clip.duration
      )
    }),
    
    selectClip: assign({
      timeline: (context, event) => ({
        ...context.timeline,
        clips: context.timeline.clips.map(clip => ({
          ...clip,
          isSelected: clip.id === event.clipId
        }))
      })
    }),
    
    // NEW: Scrubber actions (Phase A2)
    startScrubberDrag: assign({
      timeline: (context) => ({
        ...context.timeline,
        scrubber: { ...context.timeline.scrubber, isDragging: true }
      })
    }),
    
    updateScrubberPosition: assign({
      timeline: (context, event) => ({
        ...context.timeline,
        scrubber: { 
          ...context.timeline.scrubber, 
          position: Math.max(0, Math.min(event.position, context.totalDuration))
        }
      }),
      currentTime: (_, event) => event.position
    }),
    
    endScrubberDrag: assign({
      timeline: (context) => ({
        ...context.timeline,
        scrubber: { ...context.timeline.scrubber, isDragging: false }
      })
    })
  }
}
```

---

## 📡 Event Bus Extensions

### New Event Definitions

```typescript
// src/lib/video-editor/events/EventBus.ts
// EXTENDS lines 202-218 from architecture document

export interface VideoEditorEvents {
  // Existing events...
  'recording.started': { startTime: number; mode: string }
  'recording.stopped': { duration: number; videoBlob: Blob; videoUrl: string }
  'recording.error': { error: Error }
  'playback.play': { currentTime: number }
  'playback.pause': { currentTime: number }
  'playback.seek': { time: number }
  'playback.timeUpdate': { currentTime: number }
  'timeline.segmentAdded': { segment: VideoSegment }
  'timeline.segmentSelected': { segmentId: string }
  'timeline.segmentMoved': { segmentId: string; newStartTime: number }
  
  // NEW: Timeline events (Phase A1)
  'timeline.clipAdded': { clip: TimelineClip }
  'timeline.clipSelected': { clipId: string }
  'timeline.clipMoved': { clipId: string; newStartTime: number; trackId: string }
  'timeline.trackAdded': { track: Track }
  'timeline.trackRemoved': { trackId: string }
  
  // NEW: Scrubber events (Phase A2)
  'scrubber.positionChanged': { position: number; source: 'drag' | 'click' | 'playback' }
  'scrubber.dragStarted': { position: number }
  'scrubber.dragEnded': { position: number }
}
```

---

## 🎬 Enhanced TimelineService

### TimelineService Updates

```typescript
// src/lib/video-editor/services/TimelineService.ts
// EXTENDS lines 559-658 from architecture document
// CRITICAL: Service DOES NOT store state - only processes events
// All state lives in XState machine context (SSOT Principle)

export class TimelineService {
  // NO STATE STORAGE - Service is stateless
  // Service only transforms data and emits events
  
  constructor(private eventBus: TypedEventBus) {
    this.setupEventListeners()
    this.initializeDefaultTracks()
  }
  
  // Phase A1: Initialize default tracks via events only
  private initializeDefaultTracks(): void {
    const defaultTracks = [
      { id: 'video-1', type: 'video' as const, index: 0, height: 80, isLocked: false, isVisible: true },
      { id: 'video-2', type: 'video' as const, index: 1, height: 80, isLocked: false, isVisible: true },
      { id: 'audio-1', type: 'audio' as const, index: 0, height: 60, isLocked: false, isVisible: true }
    ]
    
    // Emit events for state machine to handle
    defaultTracks.forEach(track => {
      this.eventBus.emit('timeline.trackAdded', { track })
    })
  }
  
  // Phase A1: Auto-add clip when recording stops
  private setupEventListeners(): void {
    // CRITICAL: Listen for recording stopped event
    this.eventBus.on('recording.stopped', ({ duration, videoUrl }) => {
      // Create clip data and emit event for state machine
      const clip: TimelineClip = {
        id: `clip-${Date.now()}`,
        trackId: 'video-1', // Default to first video track
        sourceUrl: videoUrl,
        startTime: 0, // Will be calculated by state machine based on existing clips
        duration: duration,
        inPoint: 0,
        outPoint: duration,
        label: `Recording ${new Date().toLocaleTimeString()}`,
        isSelected: false
      }
      
      // Emit event - state machine will handle placement
      this.eventBus.emit('timeline.clipAdded', { clip })
    })
    
    // Phase A2: Playback sync is handled via state machine
    // Service doesn't manage scrubber position
  }
  
  // Phase A1: Process clip creation request
  createClipFromRecording(duration: number, videoUrl: string): TimelineClip {
    // Service only creates the data structure
    // State machine handles validation and placement
    return {
      id: `clip-${Date.now()}`,
      trackId: 'video-1',
      sourceUrl: videoUrl,
      startTime: 0, // State machine will calculate
      duration: duration,
      inPoint: 0,
      outPoint: duration,
      label: `Recording ${new Date().toLocaleTimeString()}`,
      isSelected: false
    }
  }
  
  // Utility function for state machine to use
  calculateNextAvailablePosition(clips: TimelineClip[], trackId: string): number {
    const trackClips = clips.filter(c => c.trackId === trackId)
    if (trackClips.length === 0) return 0
    
    // Find the end of the last clip
    const lastClip = trackClips.reduce((latest, clip) => 
      (clip.startTime > latest.startTime) ? clip : latest
    )
    
    return lastClip.startTime + lastClip.duration
  }
  
  // Phase A2: Scrubber event handling (no state storage)
  handleScrubberInteraction(position: number, source: 'drag' | 'click'): void {
    // Emit events for state machine to process
    this.eventBus.emit('scrubber.positionChanged', { 
      position, 
      source 
    })
    
    // Request playback seek
    this.eventBus.emit('playback.seek', { time: position })
  }
  
  startScrubberDrag(position: number): void {
    this.eventBus.emit('scrubber.dragStarted', { position })
  }
  
  endScrubberDrag(position: number): void {
    this.eventBus.emit('scrubber.dragEnded', { position })
  }
  
  // Phase A1: Validation utility for state machine
  validateClipPlacement(clip: TimelineClip, existingClips: TimelineClip[]): boolean {
    const trackClips = existingClips.filter(c => c.trackId === clip.trackId)
    const clipEnd = clip.startTime + clip.duration
    
    const hasOverlap = trackClips.some(existing => {
      if (existing.id === clip.id) return false
      const existingEnd = existing.startTime + existing.duration
      return !(clipEnd <= existing.startTime || clip.startTime >= existingEnd)
    })
    
    return !hasOverlap
  }
  
  // Utility calculations for state machine
  calculateTotalDuration(clips: TimelineClip[]): number {
    return clips.reduce((max, clip) => 
      Math.max(max, clip.startTime + clip.duration), 0
    )
  }
}
```

---

## 🎨 Pure Timeline Components

### 1. Timeline Container Component (Pure)

```typescript
// src/components/studio/timeline/TimelineContainer.tsx
// Following Principle 5: Pure Component Pattern
// CRITICAL: NO useState - get all state from queries

import { useVideoEditor } from '@/lib/video-editor'
import { Timeline } from './Timeline'

export function TimelineContainer() {
  const { queries, commands } = useVideoEditor()
  
  // NO useState! Get state directly from queries
  const clips = queries.getTimelineClips()
  const tracks = queries.getTimelineTracks()
  const scrubberPosition = queries.getScrubberPosition()
  const totalDuration = queries.getTotalDuration()
  const isDraggingScrubber = queries.isDraggingScrubber()
  
  const handleScrubberClick = (position: number) => {
    commands.execute('SCRUBBER.CLICK', { position })
  }
  
  const handleScrubberDragStart = () => {
    commands.execute('SCRUBBER.START_DRAG', {})
  }
  
  const handleScrubberDrag = (position: number) => {
    commands.execute('SCRUBBER.DRAG', { position })
  }
  
  const handleScrubberDragEnd = () => {
    commands.execute('SCRUBBER.END_DRAG', {})
  }
  
  const handleClipSelect = (clipId: string) => {
    commands.execute('TIMELINE.CLIP_SELECTED', { clipId })
  }
  
  return (
    <Timeline
      clips={clips}
      tracks={tracks}
      scrubberPosition={scrubberPosition}
      totalDuration={totalDuration}
      isDraggingScrubber={isDraggingScrubber}
      onScrubberClick={handleScrubberClick}
      onScrubberDragStart={handleScrubberDragStart}
      onScrubberDrag={handleScrubberDrag}
      onScrubberDragEnd={handleScrubberDragEnd}
      onClipSelect={handleClipSelect}
    />
  )
}
```

### 2. Pure Timeline Component

```typescript
// src/components/studio/timeline/Timeline.tsx
// PURE COMPONENT - No state management, only rendering

interface TimelineProps {
  clips: TimelineClip[]
  tracks: Track[]
  scrubberPosition: number
  totalDuration: number
  isDraggingScrubber: boolean
  onScrubberClick: (position: number) => void
  onScrubberDragStart: () => void
  onScrubberDrag: (position: number) => void
  onScrubberDragEnd: () => void
  onClipSelect: (clipId: string) => void
}

export function Timeline({
  clips,
  tracks,
  scrubberPosition,
  totalDuration,
  onScrubberClick,
  onScrubberDrag
}: TimelineProps) {
  const pixelsPerSecond = 50
  const timelineWidth = Math.max(totalDuration * pixelsPerSecond, 1000)
  
  return (
    <div className="timeline-container h-full flex flex-col bg-gray-900">
      {/* Timeline Header with Time Ruler */}
      <TimeRuler 
        totalDuration={totalDuration}
        pixelsPerSecond={pixelsPerSecond}
        onClick={onScrubberClick}
      />
      
      {/* Tracks Container */}
      <div className="flex-1 relative overflow-x-auto">
        <div style={{ width: timelineWidth }}>
          {/* Scrubber */}
          <Scrubber
            position={scrubberPosition}
            pixelsPerSecond={pixelsPerSecond}
            onDrag={onScrubberDrag}
          />
          
          {/* Render Tracks */}
          {tracks.map((track, index) => (
            <TimelineTrack
              key={track.id}
              track={track}
              clips={clips.filter(c => c.trackId === track.id)}
              pixelsPerSecond={pixelsPerSecond}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```

### 3. Scrubber Component (Pure)

```typescript
// src/components/studio/timeline/Scrubber.tsx

interface ScrubberProps {
  position: number
  pixelsPerSecond: number
  onDrag: (position: number) => void
}

export function Scrubber({ position, pixelsPerSecond, onDrag }: ScrubberProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    
    const startX = e.clientX
    const startPosition = position
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaSeconds = deltaX / pixelsPerSecond
      onDrag(startPosition + deltaSeconds)
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
  
  return (
    <div 
      className="scrubber absolute top-0 bottom-0 w-0.5 bg-red-500 cursor-ew-resize z-20"
      style={{ left: position * pixelsPerSecond }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
    </div>
  )
}
```

### 4. Timeline Clip Component (Pure)

```typescript
// src/components/studio/timeline/TimelineClip.tsx

interface TimelineClipProps {
  clip: TimelineClip
  pixelsPerSecond: number
  onClick?: (clipId: string) => void
}

export function TimelineClip({ clip, pixelsPerSecond, onClick }: TimelineClipProps) {
  const width = clip.duration * pixelsPerSecond
  const left = clip.startTime * pixelsPerSecond
  
  return (
    <div
      className={`
        timeline-clip absolute h-full bg-blue-600 rounded cursor-pointer
        ${clip.isSelected ? 'ring-2 ring-yellow-400' : ''}
        hover:bg-blue-500 transition-colors
      `}
      style={{ width, left }}
      onClick={() => onClick?.(clip.id)}
    >
      <div className="p-1 text-xs text-white truncate">
        {clip.label}
      </div>
      <div className="absolute bottom-0 left-0 right-0 text-xs text-gray-200 p-1">
        {clip.duration.toFixed(1)}s
      </div>
    </div>
  )
}
```

---

## 📊 Commands and Queries Extensions

### Update VideoEditorCommands

```typescript
// src/lib/video-editor/commands/VideoEditorCommands.ts
// EXTENDS lines 703-785 from architecture document

export class VideoEditorCommands {
  constructor(
    private stateMachine: VideoEditorStateMachine,
    private eventBus: TypedEventBus
  ) {}
  
  execute(command: string, params: any = {}): void {
    switch (command) {
      // Existing commands...
      case 'RECORDING.START':
      case 'RECORDING.STOP':
      case 'PLAYBACK.PLAY':
      case 'PLAYBACK.PAUSE':
      case 'PLAYBACK.SEEK':
        this.stateMachine.send({ type: command, ...params })
        break
        
      // NEW: Timeline commands (Phase A1)
      case 'TIMELINE.CLIP_ADDED':
      case 'TIMELINE.CLIP_SELECTED':
      case 'TIMELINE.TRACK_ADDED':
        this.stateMachine.send({ type: command, ...params })
        break
        
      // NEW: Scrubber commands (Phase A2)
      case 'SCRUBBER.START_DRAG':
      case 'SCRUBBER.DRAG':
      case 'SCRUBBER.END_DRAG':
      case 'SCRUBBER.CLICK':
        this.stateMachine.send({ type: command, ...params })
        break
        
      default:
        console.warn(`Unknown command: ${command}`)
    }
  }
}
```

### Update VideoEditorQueries

```typescript
// src/lib/video-editor/queries/VideoEditorQueries.ts  
// EXTENDS lines 787-850 from architecture document

export class VideoEditorQueries {
  constructor(
    private stateMachine: VideoEditorStateMachine,
    private playbackService: PlaybackService,
    private recordingService: RecordingService,
    private timelineService: TimelineService
  ) {}
  
  // Existing queries...
  
  // NEW: Timeline queries (Phase A1)
  getTimelineClips(): ReadonlyArray<TimelineClip> {
    const state = this.stateMachine.getSnapshot()
    return state.context.timeline?.clips || []
  }
  
  getTimelineTracks(): ReadonlyArray<Track> {
    const state = this.stateMachine.getSnapshot()
    return state.context.timeline?.tracks || []
  }
  
  // NEW: Scrubber queries (Phase A2)
  getScrubberPosition(): number {
    const state = this.stateMachine.getSnapshot()
    return state.context.timeline?.scrubber?.position || 0
  }
  
  isDraggingScrubber(): boolean {
    const state = this.stateMachine.getSnapshot()
    return state.context.timeline?.scrubber?.isDragging || false
  }
  
  getTotalDuration(): number {
    const state = this.stateMachine.getSnapshot()
    return state.context.totalDuration || 0
  }
  
  // Utility query for finding clips
  getClipById(clipId: string): TimelineClip | undefined {
    const clips = this.getTimelineClips()
    return clips.find(c => c.id === clipId)
  }
}
```

---

## 🔌 Integration with VideoStudioNew

```typescript
// Update src/components/studio/VideoStudioNew.tsx
// Replace the existing timeline section (around line 156-182)

{/* Timeline Panel - 80% width with horizontal scroll */}
<div className="flex-1 bg-gray-850 overflow-hidden" style={{ width: '80%' }}>
  <TimelineContainer />
</div>
```

---

## ✅ Test Scenarios

### Phase A1 Tests: Clip Population
1. **Start recording** → Stop recording → **Verify clip appears on timeline**
2. **Record multiple times** → **Verify clips don't overlap**
3. **Check clip duration** matches recording duration
4. **Click on clip** → **Verify selection state**

### Phase A2 Tests: Scrubber Navigation
1. **Click anywhere on timeline** → **Scrubber jumps to position**
2. **Drag scrubber** → **Video seeks to new position**
3. **Play video** → **Scrubber moves with playback**
4. **Pause video** → **Scrubber stops**
5. **Scrubber at end** → **Can't drag beyond duration**

---

## 🚀 Implementation Checklist with Manual Testing Checkpoints

### CRITICAL: Implementation & Testing Protocol
⚠️ **DO NOT proceed to the next checkpoint until receiving user confirmation that tests pass**

### Phase A1: Basic Timeline & Clip Population

#### **Checkpoint 1: State Machine Extensions** (25% complete)
- [ ] Extend VideoEditorContext with timeline state
- [ ] Add TimelineClip and Track types  
- [ ] Add new timeline events to VideoEditorEvent type
- [ ] Implement timeline actions in state machine
**STOP HERE - Manual Test Required:**
```
Test: Verify existing recording/playback still works
- Can still start/stop recording
- Can still play/pause video
- No console errors
User must confirm: "Checkpoint 1 passed" before continuing
```

#### **Checkpoint 2: TimelineService Setup** (40% complete)
- [ ] Implement stateless TimelineService
- [ ] Setup event listeners for recording.stopped
- [ ] Add utility functions (calculateNextAvailablePosition, validateClipPlacement)
**STOP HERE - Manual Test Required:**
```
Test: Record a video and check console logs
- Record for 3-5 seconds
- Check console for "timeline.clipAdded" event
- Verify no errors in console
User must confirm: "Checkpoint 2 passed" before continuing
```

#### **Checkpoint 3: First Visual Component** (60% complete)
- [ ] Create Timeline container component (pure)
- [ ] Create basic Timeline component structure
- [ ] Integrate TimelineContainer into VideoStudioNew
**STOP HERE - Manual Test Required:**
```
Test: Timeline panel visible in UI
- Navigate to /instructor/studio
- Bottom panel (80% width) should show timeline area
- May be empty but should have gray-900 background
User must confirm: "Checkpoint 3 passed" before continuing
```

#### **⭐ Checkpoint 4: Clip Population** (75% complete) - CRITICAL
- [ ] Create TimelineClip component
- [ ] Create TimelineTrack component
- [ ] Implement Commands/Queries for timeline
- [ ] Wire up clip rendering in Timeline
**STOP HERE - Manual Test Required:**
```
Test: Clips appear on timeline after recording
1. Record a 5-second video → Stop
   - Clip should appear on timeline with duration "5.0s"
2. Record another 3-second video → Stop  
   - Second clip should appear after first (no overlap)
   - Second clip shows "3.0s"
3. Click on clips
   - Selected clip should have yellow ring
User must confirm: "Checkpoint 4 passed" before continuing
```

### Phase A2: Timeline Scrubber & Navigation

#### **⭐ Checkpoint 5: Scrubber Implementation** (90% complete) - CRITICAL
- [ ] Add scrubber state to context
- [ ] Implement scrubber events and actions
- [ ] Create Scrubber component with drag handling
- [ ] Create TimeRuler component
- [ ] Add click-to-seek functionality
- [ ] Add drag-to-seek functionality
**STOP HERE - Manual Test Required:**
```
Test: Scrubber navigation works
1. Click anywhere on timeline ruler
   - Red scrubber line jumps to clicked position
   - Video seeks to that time
2. Drag scrubber left/right
   - Scrubber follows mouse
   - Video updates position while dragging
3. Play video
   - Scrubber moves smoothly with playback
   - Stops at video end
4. Pause video
   - Scrubber stops immediately
User must confirm: "Checkpoint 5 passed" before continuing
```

#### **Final Checkpoint: Complete Integration** (100%)
- [ ] Sync scrubber with playback (ensure smooth updates)
- [ ] Test all navigation scenarios
- [ ] Verify no performance issues
**STOP HERE - Manual Test Required:**
```
Test: Full timeline workflow
1. Record 3 different clips (various durations)
2. All clips visible on timeline
3. Click to select different clips
4. Scrubber navigation works smoothly
5. Playback syncs with timeline
6. No console errors throughout
User must confirm: "Final checkpoint passed - Phase A complete"
```

### ⚠️ Implementation Rules
1. **NEVER skip a checkpoint** - Each builds on the previous
2. **ALWAYS wait for user confirmation** before proceeding
3. **If a test fails**, debug and fix before moving forward
4. **Document any issues** encountered at each checkpoint

---

## 📝 Architecture Compliance Checklist

- ✅ **Single Source of Truth**: Timeline state only in XState context
- ✅ **Event-Driven**: All updates through EventBus events
- ✅ **State Machine Authority**: XState validates timeline transitions
- ✅ **Service Isolation**: TimelineService only manages timeline logic
- ✅ **Pure Components**: Timeline components have no useState

---

## 🔄 Next Steps

After Group A is implemented and tested:
1. Move to **Group B: Playback Synchronization**
2. Implement spacebar play/pause (Flow 3)
3. Ensure perfect sync between preview and timeline
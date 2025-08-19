# Group C: Clip Operations Implementation Specification

## Overview
Implement core clip editing operations following bulletproof architecture principles: select clips, split at playhead, and delete segments.

## Architecture Alignment

### Principle 1: Single Source of Truth (SSOT)
- **selectedClipId** stored ONLY in State Machine context
- **Split operation** creates two clips in State Machine
- **Delete operation** removes clip from State Machine array
- NO clip state stored in services or components

### Principle 2: Event-Driven Communication
- All clip operations emit events via TypedEventBus
- Services notify state machine of clip changes
- Components never directly manipulate clips

### Principle 3: State Machine Authority
- All clip operations validated through XState transitions
- Prevent operations in invalid states (e.g., can't split while recording)
- State machine decides if operation is allowed

### Principle 4: Service Boundary Isolation  
- TimelineService handles clip logic (technical state)
- State Machine owns timeline structure (business state)
- Clear separation of concerns

### Principle 5: Pure Component Pattern
- Components receive clip data as props
- Container components handle all click events
- Pure components only render visual selection

## State Machine Extensions

### New Context Properties
```typescript
// Add to VideoEditorContext in VideoEditorMachineV5.ts
export interface VideoEditorContext {
  // ... existing properties ...
  selectedClipId: string | null  // Selected clip for operations
  timeline: {
    clips: TimelineClip[]
    tracks: Track[]
    scrubber: {
      position: number
      isDragging: boolean
    }
  }
}
```

### New Events
```typescript
// Add to VideoEditorEvent in VideoEditorMachineV5.ts
export type VideoEditorEvent = 
  // ... existing events ...
  | { type: 'CLIP.SELECT'; clipId: string }
  | { type: 'CLIP.DESELECT' }
  | { type: 'CLIP.SPLIT'; clipId: string; splitTime: number }
  | { type: 'CLIP.DELETE'; clipId: string }
  | { type: 'CLIP.SPLIT_COMPLETE'; originalId: string; newClips: [TimelineClip, TimelineClip] }
  | { type: 'CLIP.DELETE_COMPLETE'; clipId: string }
```

### New Actions
```typescript
// Add to actions in VideoEditorMachineV5.ts
actions: {
  // ... existing actions ...
  
  selectClip: assign({
    selectedClipId: ({ event }) => {
      if (event.type === 'CLIP.SELECT') {
        return event.clipId
      }
      return null
    }
  }),
  
  deselectClip: assign({
    selectedClipId: () => null
  }),
  
  splitClip: assign({
    timeline: ({ context, event }) => {
      if (event.type !== 'CLIP.SPLIT_COMPLETE') return context.timeline
      
      const { originalId, newClips } = event
      const clips = context.timeline.clips.filter(c => c.id !== originalId)
      
      return {
        ...context.timeline,
        clips: [...clips, ...newClips]
      }
    },
    selectedClipId: ({ event }) => {
      // Select first new clip after split
      if (event.type === 'CLIP.SPLIT_COMPLETE') {
        return event.newClips[0].id
      }
      return null
    }
  }),
  
  deleteClip: assign({
    timeline: ({ context, event }) => {
      if (event.type !== 'CLIP.DELETE_COMPLETE') return context.timeline
      
      return {
        ...context.timeline,
        clips: context.timeline.clips.filter(c => c.id !== event.clipId)
      }
    },
    selectedClipId: () => null // Deselect after delete
  })
}
```

### New State Event Handlers
```typescript
// Update existing states to handle clip events
idle: {
  on: {
    // ... existing events ...
    'CLIP.SELECT': { actions: 'selectClip' },
    'CLIP.DESELECT': { actions: 'deselectClip' },
    'CLIP.SPLIT': { actions: 'requestClipSplit' },
    'CLIP.DELETE': { actions: 'requestClipDelete' }
  }
},

paused: {
  on: {
    // ... existing events ...
    'CLIP.SELECT': { actions: 'selectClip' },
    'CLIP.DESELECT': { actions: 'deselectClip' },
    'CLIP.SPLIT': { actions: 'requestClipSplit' },
    'CLIP.DELETE': { actions: 'requestClipDelete' }
  }
},

// Note: No clip operations allowed while recording or playing
```

## Service Layer Changes

### TimelineService Extensions
```typescript
// Add to TimelineService.ts

// Split clip at specific time
requestSplitClip(clipId: string, splitTime: number): void {
  // Find clip in current timeline (read from state machine via queries)
  const clip = this.findClipById(clipId)
  if (!clip) {
    this.eventBus.emit('clip.error', { error: 'Clip not found' })
    return
  }
  
  // Validate split time is within clip bounds
  if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
    this.eventBus.emit('clip.error', { error: 'Invalid split time' })
    return
  }
  
  // Calculate split
  const splitOffset = splitTime - clip.startTime
  
  // Create two new clips
  const clip1: TimelineClip = {
    ...clip,
    id: `${clip.id}-part1-${Date.now()}`,
    duration: splitOffset,
    outPoint: clip.inPoint + splitOffset
  }
  
  const clip2: TimelineClip = {
    ...clip,
    id: `${clip.id}-part2-${Date.now()}`,
    startTime: splitTime,
    duration: clip.duration - splitOffset,
    inPoint: clip.inPoint + splitOffset
  }
  
  // Emit completion event
  this.eventBus.emit('clip.splitComplete', { 
    originalId: clipId, 
    newClips: [clip1, clip2] as [TimelineClip, TimelineClip]
  })
}

// Delete clip
requestDeleteClip(clipId: string): void {
  // Validate clip exists (read from state machine via queries)  
  const clip = this.findClipById(clipId)
  if (!clip) {
    this.eventBus.emit('clip.error', { error: 'Clip not found' })
    return
  }
  
  // Emit deletion event
  this.eventBus.emit('clip.deleteComplete', { clipId })
}

// Helper method (reads from state machine via queries)
private findClipById(clipId: string): TimelineClip | null {
  // This will be injected via constructor to avoid circular dependency
  return this.queries.getTimelineClips().find(c => c.id === clipId) || null
}
```

### New EventBus Events
```typescript
// Add to VideoEditorEvents interface in EventBus.ts
export interface VideoEditorEvents {
  // ... existing events ...
  
  // Clip operation events
  'clip.splitComplete': { originalId: string; newClips: [TimelineClip, TimelineClip] }
  'clip.deleteComplete': { clipId: string }
  'clip.error': { error: string }
}
```

## Command Layer Extensions

### New Commands
```typescript
// Add to VideoEditorCommands.ts

// Select clip
selectClip(clipId: string): void {
  // Validate state allows selection
  const snapshot = this.stateMachine.getSnapshot()
  if (snapshot.value === 'recording') {
    console.warn('Cannot select clips while recording')
    return
  }
  
  // Send to state machine
  this.stateMachine.send({ type: 'CLIP.SELECT', clipId })
}

// Deselect clip  
deselectClip(): void {
  this.stateMachine.send({ type: 'CLIP.DESELECT' })
}

// Split clip at current scrubber position
splitClipAtPlayhead(): void {
  const snapshot = this.stateMachine.getSnapshot()
  const selectedClipId = snapshot.context.selectedClipId
  const scrubberPosition = snapshot.context.timeline.scrubber.position
  
  if (!selectedClipId) {
    console.warn('No clip selected for splitting')
    return
  }
  
  if (snapshot.value !== 'idle' && snapshot.value !== 'paused') {
    console.warn('Can only split clips when idle or paused')
    return
  }
  
  // Request split via service
  this.timelineService.requestSplitClip(selectedClipId, scrubberPosition)
}

// Delete selected clip
deleteSelectedClip(): void {
  const snapshot = this.stateMachine.getSnapshot()
  const selectedClipId = snapshot.context.selectedClipId
  
  if (!selectedClipId) {
    console.warn('No clip selected for deletion')
    return
  }
  
  if (snapshot.value !== 'idle' && snapshot.value !== 'paused') {
    console.warn('Can only delete clips when idle or paused')
    return
  }
  
  // Request delete via service
  this.timelineService.requestDeleteClip(selectedClipId)
}

// Generic execute method updates
execute(command: string, params: Record<string, unknown> = {}): void {
  switch (command) {
    // ... existing commands ...
    case 'CLIP.SELECT':
      this.selectClip(params.clipId as string)
      break
    case 'CLIP.DESELECT':
      this.deselectClip()
      break
    case 'CLIP.SPLIT':
      this.splitClipAtPlayhead()
      break
    case 'CLIP.DELETE':
      this.deleteSelectedClip()
      break
    default:
      console.warn(`Unknown command: ${command}`)
  }
}
```

## Query Layer Extensions

### New Queries
```typescript
// Add to VideoEditorQueries.ts

// Get selected clip ID
getSelectedClipId(): string | null {
  const snapshot = this.stateMachine.getSnapshot()
  return snapshot.context.selectedClipId
}

// Get selected clip data
getSelectedClip(): TimelineClip | null {
  const selectedId = this.getSelectedClipId()
  if (!selectedId) return null
  
  const clips = this.getTimelineClips()
  return clips.find(c => c.id === selectedId) || null
}

// Check if clip operations are allowed
canExecuteClipOperation(): boolean {
  const snapshot = this.stateMachine.getSnapshot()
  return snapshot.value === 'idle' || snapshot.value === 'paused'
}

// Check if a clip contains the scrubber position
getClipAtScrubberPosition(): TimelineClip | null {
  const scrubberPosition = this.getScrubberPosition()
  const clips = this.getTimelineClips()
  
  return clips.find(clip => 
    scrubberPosition >= clip.startTime && 
    scrubberPosition < clip.startTime + clip.duration
  ) || null
}
```

## Component Layer Extensions

### Timeline Component Updates
```typescript
// Update TimelineNew.tsx to handle selection

interface TimelineNewProps {
  // ... existing props ...
  selectedClipId: string | null
  onClipSelect: (clipId: string) => void
  onClipDeselect: () => void
}

export function TimelineNew({
  clips,
  tracks,
  scrubberPosition,
  totalDuration,
  isDraggingScrubber,
  selectedClipId,
  onScrubberClick,
  onScrubberDragStart,
  onScrubberDrag,
  onScrubberDragEnd,
  onClipSelect,
  onClipDeselect
}: TimelineNewProps) {
  
  const handleClipClick = (clipId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Don't trigger timeline click
    
    if (selectedClipId === clipId) {
      onClipDeselect()
    } else {
      onClipSelect(clipId)
    }
  }
  
  const handleTimelineClick = () => {
    // Clicking empty timeline area deselects clips
    if (selectedClipId) {
      onClipDeselect()
    }
  }
  
  return (
    <div className="timeline-new" onClick={handleTimelineClick}>
      {/* ... existing scrubber and tracks ... */}
      
      {/* Updated clips with selection */}
      {clips.map((clip) => (
        <div
          key={clip.id}
          className={`clip ${selectedClipId === clip.id ? 'selected' : ''}`}
          style={{
            left: (clip.startTime / totalDuration) * 100 + '%',
            width: (clip.duration / totalDuration) * 100 + '%'
          }}
          onClick={(e) => handleClipClick(clip.id, e)}
        >
          <div className="clip-content">{clip.label}</div>
          {selectedClipId === clip.id && (
            <div className="selection-outline" />
          )}
        </div>
      ))}
    </div>
  )
}
```

### Timeline Container Updates
```typescript
// Update TimelineContainer.tsx

export function TimelineContainer() {
  const { queries, commands } = useVideoEditor()
  
  const [uiState, updateUIState] = useReducer(timelineReducer, {
    clips: [],
    tracks: [],
    scrubberPosition: 0,
    totalDuration: 0,
    isDraggingScrubber: false,
    selectedClipId: null // Add selected clip ID
  })
  
  useEffect(() => {
    const updateState = () => {
      updateUIState({
        clips: queries.getTimelineClips(),
        tracks: queries.getTimelineTracks(),
        scrubberPosition: queries.getScrubberPosition(),
        totalDuration: queries.getTotalDuration(),
        isDraggingScrubber: queries.isDraggingScrubber(),
        selectedClipId: queries.getSelectedClipId() // Add this
      })
    }
    
    updateState()
    const interval = setInterval(updateState, 100)
    
    return () => clearInterval(interval)
  }, [queries])
  
  const handleClipSelect = (clipId: string) => {
    commands.execute('CLIP.SELECT', { clipId })
  }
  
  const handleClipDeselect = () => {
    commands.execute('CLIP.DESELECT')
  }
  
  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* ... existing header ... */}
      
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <TimelineNew
          clips={uiState.clips}
          tracks={uiState.tracks}
          scrubberPosition={uiState.scrubberPosition}
          totalDuration={uiState.totalDuration}
          isDraggingScrubber={uiState.isDraggingScrubber}
          selectedClipId={uiState.selectedClipId}
          onScrubberClick={handleScrubberClick}
          onScrubberDragStart={handleScrubberDragStart}
          onScrubberDrag={handleScrubberDrag}
          onScrubberDragEnd={handleScrubberDragEnd}
          onClipSelect={handleClipSelect}
          onClipDeselect={handleClipDeselect}
        />
      </div>
    </div>
  )
}
```

### Keyboard Shortcut Handler
```typescript
// Create new component: ClipOperationsHandler.tsx

export function ClipOperationsHandler() {
  const { commands, queries } = useVideoEditor()
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // Cmd+K / Ctrl+K - Split at playhead
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        commands.execute('CLIP.SPLIT')
        return
      }
      
      // Delete key - Delete selected clip
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        commands.execute('CLIP.DELETE')
        return
      }
      
      // Escape - Deselect clip
      if (event.key === 'Escape') {
        commands.execute('CLIP.DESELECT')
        return
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [commands])
  
  return null // No UI, just keyboard handling
}
```

## Event Bus Connections

### Singleton Updates
```typescript
// Add to VideoEditorSingleton.ts

// Forward clip operation events
unsubscribers.push(
  eventBus.on('clip.splitComplete', ({ originalId, newClips }) => {
    stateMachine.send({ type: 'CLIP.SPLIT_COMPLETE', originalId, newClips })
  })
)

unsubscribers.push(
  eventBus.on('clip.deleteComplete', ({ clipId }) => {
    stateMachine.send({ type: 'CLIP.DELETE_COMPLETE', clipId })
  })
)

unsubscribers.push(
  eventBus.on('clip.error', ({ error }) => {
    console.error('Clip operation error:', error)
    // Could add error handling state to state machine if needed
  })
)
```

## CSS Styling

### Selection Styles
```css
/* Add to timeline styles */
.clip.selected {
  border: 2px solid #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
  z-index: 10;
}

.selection-outline {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px solid #3b82f6;
  pointer-events: none;
}

.clip:hover:not(.selected) {
  border: 1px solid rgba(59, 130, 246, 0.6);
}
```

## Testing Strategy

### Manual Testing Checkpoints
1. **Clip Selection**
   - Click clip → should highlight with blue border
   - Click different clip → should move selection
   - Click timeline background → should deselect
   - Escape key → should deselect

2. **Clip Splitting**
   - Select clip → position scrubber in middle → Cmd+K → should create two clips
   - Try splitting while recording → should be blocked
   - Try splitting with no selection → should show warning

3. **Clip Deletion**
   - Select clip → Delete key → should remove clip
   - Try deleting while recording → should be blocked
   - Try deleting with no selection → should show warning

### Architecture Verification
1. **SSOT Check**: selectedClipId only in state machine context
2. **Event Flow**: All operations go through state machine first
3. **Service Isolation**: TimelineService doesn't store selection state
4. **Component Purity**: No state in TimelineNew component

## Implementation Order

1. **State Machine Extensions** (1 hour)
   - Add selectedClipId to context
   - Add new events and actions
   - Update state handlers

2. **Service Layer** (2 hours)
   - Add split/delete methods to TimelineService
   - Add new EventBus events
   - Update singleton connections

3. **Command/Query Layer** (1 hour)
   - Add clip operation commands
   - Add selection queries
   - Update execute method

4. **Component Updates** (2 hours)
   - Update TimelineNew for selection
   - Update TimelineContainer with handlers
   - Add keyboard shortcut handler

5. **Testing & Polish** (1 hour)
   - Manual testing of all operations
   - CSS styling for selection
   - Bug fixes and edge cases

**Total Estimated Time: 7 hours**

## Success Criteria

✅ Click clips to select them with visual feedback
✅ Cmd+K splits selected clip at scrubber position
✅ Delete key removes selected clip
✅ Operations blocked during recording/playback
✅ All state managed by state machine (SSOT)
✅ Event-driven communication maintained
✅ Components remain pure (no state)

This implementation provides the foundation for all future clip operations while maintaining strict adherence to bulletproof architecture principles.
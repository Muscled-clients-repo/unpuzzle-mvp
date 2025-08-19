# Feature-Driven Architecture for Video Editor

## Purpose
This architecture enables systematic implementation of the 12 feature groups (Groups A-L) while maintaining consistency, preventing regressions, and allowing parallel development.

## Core Architecture Layers

### Layer 1: State Machine (Business Logic)
- **Owns**: All timeline state, playback state, recording state, edit history
- **Pattern**: XState v5 with typed events and guards
- **Extension**: Each feature group extends the machine with new states/events

### Layer 2: Event Bus (Communication)
- **Purpose**: Decoupled communication between all layers
- **Pattern**: TypedEventBus with discriminated unions
- **Extension**: Each feature adds new event types

### Layer 3: Services (Technical Operations)
- **Types**: Recording, Playback, Timeline, Import, Export, Storage
- **Pattern**: Stateless business logic, owns technical state (e.g., MediaRecorder, VideoElement)
- **Extension**: New services added for new technical capabilities

### Layer 4: Commands & Queries (API)
- **Commands**: Mutate state through state machine
- **Queries**: Read state from appropriate sources
- **Extension**: Each feature adds relevant commands/queries

### Layer 5: React Components (UI)
- **Pattern**: Pure components with container orchestration
- **State**: UI-only state in containers via useReducer
- **Extension**: New components per feature group

## Feature Implementation Framework

### Rate Limiting & Throttling Strategy
```typescript
// Event throttling for high-frequency updates
const THROTTLE_RATES = {
  'PLAYBACK.TIME_UPDATE': 1000/60,  // 60fps max
  'ZOOM.CHANGED': 100,               // 10fps for zoom
  'SCRUBBER.DRAG': 1000/60,         // 60fps for smooth dragging
  'THUMBNAIL.GENERATE': 500         // 2 per second max
}

// Debouncing for user input
const DEBOUNCE_DELAYS = {
  'SEARCH.INPUT': 300,              // Wait 300ms after typing stops
  'ZOOM.PINCH': 150,                // Pinch gesture debounce
  'PREVIEW.UPDATE': 100             // Preview render debounce
}
```

### For Each Feature Group:

#### 1. State Machine Extension
```typescript
// Example for Group C: Clip Operations
interface ClipOperationsContext {
  selectedClips: string[]
  clipboard: Clip[]
  // Note: undoStack and redoStack are owned by Group I (Undo/Redo)
  // Group C operations will emit events that Group I records
}

interface ClipOperationsEvents {
  'CLIP.SELECT': { clipId: string }
  'CLIP.SPLIT': { clipId: string; position: number }
  'CLIP.DELETE': { clipIds: string[] }
  'CLIP.COPY': { clipIds: string[] }
  'CLIP.PASTE': { trackId: string; position: number }
  // All events follow CATEGORY.ACTION naming convention
}
```

#### 2. Service Requirements
```typescript
// Example for Group F: Import & Media
class ImportService {
  // Technical operations only (all async for consistency)
  async validateFile(file: File): Promise<ValidationResult>
  async extractMetadata(file: File): Promise<MediaMetadata>
  async createThumbnail(video: File): Promise<Blob>
  async generateWaveform(audio: File): Promise<Float32Array>
  
  // Cleanup method for memory management
  dispose(): void
}
```

#### 3. Event Specifications
```typescript
// Example for Group D: Timeline Zoom
interface ZoomEvents {
  'ZOOM.CHANGED': { level: number; center: number }
  'ZOOM.RESET': {}
  'ZOOM.FIT_TO_TIMELINE': {}
  // Consistent CATEGORY.ACTION naming convention
}
```

## Concurrency Control

### Operation Locking
```typescript
// Prevent concurrent operations on same resource
interface OperationLock {
  resource: string      // e.g., 'clip:123', 'track:v1'
  operation: string     // e.g., 'trim', 'move', 'delete'
  timestamp: number
  release: () => void
}

// State machine guards check locks before transitions
const canEditClip = (context, event) => {
  return !isLocked(event.clipId)
}
```

### Queue Management
```typescript
// Operations queue for serialization
class OperationQueue {
  private queue: Operation[] = []
  private processing = false
  
  async add(op: Operation): Promise<void> {
    this.queue.push(op)
    if (!this.processing) {
      await this.process()
    }
  }
  
  private async process(): Promise<void> {
    this.processing = true
    while (this.queue.length > 0) {
      const op = this.queue.shift()
      if (op) await this.execute(op)  // Type guard for undefined
    }
    this.processing = false
  }
  
  private async execute(op: Operation): Promise<void> {
    // Implementation delegates to state machine
    // This is just the queue mechanism
  }
}
```

## Feature Group Dependencies

### Dependency Graph:
```
Group A (Timeline Foundation) ─┐
                               ├─> Group C (Clip Operations)
Group B (Playback Sync) ───────┘
                               
Group E (Multi-Track) ─────────> Group C (Clip Operations)

Group I (Undo/Redo) ──────────> ALL editing groups (C, D, E, F)

Group J (Keyboard) ───────────> Groups B, C, D (shortcuts)
```

### Implementation Order Rules:
1. **Foundation First**: Groups A, K, L must be complete
2. **Dependencies Respected**: Cannot implement dependent features first
3. **Parallel Safe**: Groups without dependencies can be developed in parallel

## State Machine Patterns by Feature Type

### Pattern 1: Timeline Operations (Groups A, C, E)
```typescript
states: {
  timeline: {
    states: {
      idle: {
        on: {
          'TIMELINE.SELECT_START': 'selecting',
          'TIMELINE.DRAG_START': 'dragging',
          'TIMELINE.TRIM_START': 'trimming'
        }
      },
      selecting: {
        on: {
          'TIMELINE.SELECT_END': 'idle',
          'TIMELINE.SELECT_CANCEL': 'idle'
        }
      },
      dragging: {
        on: {
          'TIMELINE.DRAG_END': 'idle',
          'TIMELINE.DRAG_CANCEL': 'idle'
        }
      },
      trimming: {
        on: {
          'TIMELINE.TRIM_END': 'idle',
          'TIMELINE.TRIM_CANCEL': 'idle'
        }
      }
    }
  }
}
```

### Pattern 2: Playback Operations (Group B)
```typescript
states: {
  playback: {
    states: {
      stopped: {
        on: {
          'PLAYBACK.PLAY': 'playing',
          'PLAYBACK.SEEK': 'seeking'
        }
      },
      playing: {
        on: {
          'PLAYBACK.PAUSE': 'paused',
          'PLAYBACK.STOP': 'stopped',
          'PLAYBACK.SEEK': 'seeking',
          'PLAYBACK.END': 'stopped'
        }
      },
      paused: {
        on: {
          'PLAYBACK.PLAY': 'playing',
          'PLAYBACK.STOP': 'stopped',
          'PLAYBACK.SEEK': 'seeking'
        }
      },
      seeking: {
        on: {
          'PLAYBACK.SEEK_COMPLETE': {
            target: 'paused',
            guard: 'wasNotPlaying'
          },
          'PLAYBACK.SEEK_COMPLETE': {
            target: 'playing',
            guard: 'wasPlaying'
          }
        }
      }
    }
  }
}
```

### Pattern 3: Modal Operations (Groups F, Import)
```typescript
states: {
  importing: {
    states: {
      idle: {
        on: {
          'IMPORT.START': 'selecting'
        }
      },
      selecting: {
        on: {
          'IMPORT.FILES_SELECTED': 'validating',
          'IMPORT.CANCEL': 'idle'
        }
      },
      validating: {
        on: {
          'IMPORT.VALIDATION_ERROR': 'error',
          'IMPORT.VALIDATION_SUCCESS': 'processing'
        }
      },
      processing: {
        on: {
          'IMPORT.PROCESSING_ERROR': 'error',
          'IMPORT.PROCESSING_COMPLETE': 'complete'
        }
      },
      complete: {
        on: {
          'IMPORT.DONE': 'idle'
        }
      },
      error: {
        on: {
          'IMPORT.RETRY': 'selecting',
          'IMPORT.CANCEL': 'idle'
        }
      }
    }
  }
}
```

## Event Flow Patterns

### Error Handling Pattern
```
Operation -> Try -> Success Event | Error Event -> State Machine -> Recovery or Rollback
Example: Import fails -> IMPORT.ERROR -> Show error UI -> Retry or Cancel
```

### Pattern 1: User-Initiated Operations
```
User Action -> Component -> Command -> State Machine -> Service -> EventBus
Example: Split clip at playhead
```

### Pattern 2: System-Initiated Updates
```
Service -> EventBus -> State Machine -> Query -> Component Update
Example: Recording auto-creates clip
```

### Pattern 3: Continuous Updates (Throttled)
```
Service Loop -> Throttled EventBus -> Queries -> Component Render
Example: Playback time updates (max 60fps)
Throttling: requestAnimationFrame for visual updates
Debouncing: User input events (zoom, search)
```

## Feature-Specific Architectures

### Group C: Clip Operations Architecture
```
Requirements:
- Atomic operations (all-or-nothing)
- Undo/redo support
- Multi-selection support
- Magnetic timeline behavior

State Machine:
- selectedClips: string[] // Array for ordered selection
- clipboard: Clip[]
- magneticSnapPoints: number[]
- magneticEnabled: boolean

Events:
- CLIP.* events for all operations
- SELECTION.* events for multi-select
- MAGNETIC.* events for snapping

Services:
- ClipOperationsService (calculations and validations)
- Technical state only (e.g., temporary calculation caches)
```

### Group D: Timeline Zoom Architecture
```
Requirements:
- Smooth zoom transitions
- Maintain focus point during zoom
- Sync with scroll position
- Performance (no re-render everything)

State Machine:
- zoomLevel: number // 0.1 to 10, default 1
- focusPoint: number // Time in seconds, center of zoom
- viewportRange: { start: number; end: number } // Visible time range
- pixelsPerSecond: number // Calculated from zoomLevel

Events:
- ZOOM.* events (with debouncing)
- VIEWPORT.* events (with throttling)

Components:
- Virtualized timeline (react-window for performance)
- Zoom controls component (with keyboard support)
- Overview timeline (minimap with viewport indicator)
```

### Group I: Undo/Redo Architecture
```
Requirements:
- Memory efficient
- Selective undo (per track option)
- Undo groups (multiple operations as one)
- Persistable history

State Machine:
- undoStack: EditOperation[]
- redoStack: EditOperation[]
- currentTransaction: EditOperation[]

Command Pattern:
interface EditOperation {
  type: string           // Event type that caused this operation
  payload: unknown      // Event payload for replay (typed at usage)
  timestamp: number     // When operation occurred
  description: string   // Human-readable description
  // Operations are replayed by re-sending events to state machine
  // No execute/undo/redo methods - state machine handles all transitions
}

// Type-safe event replay
function replayOperation<T>(op: EditOperation): T {
  return op.payload as T  // Cast with type guard at call site
}

Memory Management:
- Max stack size: 100 operations
- Compress operations older than 50 (store only events, not state)
- Clear redo stack on new operation
- Persist to IndexedDB for session recovery
```

## Testing Strategy by Feature Group

### Error Scenario Testing
```typescript
// Test error recovery for each feature
test('handles import failure gracefully')
test('recovers from corrupted undo stack')
test('handles out-of-memory during thumbnail generation')
test('recovers from lost WebRTC connection during recording')
```

### Group A-B (Timeline & Playback): Integration Tests
```typescript
// Test sync between timeline and playback
test('scrubber follows playback position')
test('click on timeline seeks video')
test('playback stops at end of timeline')
```

### Group C (Clip Operations): Unit + Integration
```typescript
// Unit test state transitions
test('split creates two clips from one')
test('delete removes clip and closes gap')

// Integration test with undo
test('undo reverses split operation')
```

### Group I (Undo/Redo): State Machine Tests
```typescript
test('undo stack grows with operations')
test('redo cleared on new operation')
test('undo/redo maintains timeline consistency')
```

## Performance Considerations by Feature

### Heavy Operations (Web Workers):
- Video thumbnail generation (Group G) - OffscreenCanvas in Worker
- Audio waveform generation (Group H) - AudioWorklet API
- Export/render (future) - WebCodecs API in Worker
- Import validation (Group F) - File parsing in Worker

### Virtualization Required:
- Timeline clips (Group A)
- Track list (Group E)
- Asset library (Group F)

### Caching Strategy:
- Thumbnail cache (Group G) - LRU with 100 item limit
- Waveform cache (Group H) - IndexedDB for persistence
- Computed frame positions (Group B) - Memory cache, cleared on seek
- Validation results (Group F) - Session cache with TTL

## Data Models by Feature Group

### Group A: Timeline Foundation
```typescript
interface TimelineClip {
  id: string
  trackId: string
  sourceId: string  // Reference to media asset
  startTime: number // Position on timeline (seconds)
  duration: number  // Length on timeline (seconds)
  inPoint: number   // Start point in source (seconds)
  outPoint: number  // End point in source (seconds)
  locked?: boolean  // Prevent accidental edits
  disabled?: boolean // Temporarily hide from render
}
```

### Group E: Multi-Track System
```typescript
interface Track {
  id: string
  type: 'video' | 'audio'
  index: number     // Display order
  height: number    // Pixels
  locked: boolean   // Prevent edits
  visible: boolean  // Show/hide in timeline
  solo: boolean     // Solo this track (audio)
  muted: boolean    // Mute this track
  name?: string     // Custom track name
  color?: string    // Track color for UI
}
```

### Group F: Import & Media
```typescript
interface MediaAsset {
  id: string
  url: string                          // Object URL or remote URL
  type: 'video' | 'audio' | 'image'
  duration: number                     // Seconds (0 for images)
  metadata: MediaMetadata               // Width, height, codec, etc.
  thumbnail?: string                    // Data URL for preview
  waveform?: Float32Array              // Audio visualization data
  fileSize?: number                    // Bytes
  lastModified?: number                // Timestamp
  status: 'loading' | 'ready' | 'error' // Asset state
}
```

## Feature Flag System

### Implementation:
```typescript
const FEATURES = {
  MULTI_TRACK: true,        // Group E
  IMPORT_MEDIA: false,      // Group F
  AUDIO_WAVEFORMS: false,   // Group G
  UNDO_REDO: true,         // Group I
  KEYBOARD_SHORTCUTS: true // Group J
}

// Usage in state machine with cleanup
if (FEATURES.UNDO_REDO) {
  // Add undo/redo states and events
  stateMachine.withContext((ctx) => ({
    ...ctx,
    undoStack: [],
    redoStack: []
  }))
} else {
  // Clean up any existing undo/redo state
  stateMachine.withContext((ctx) => {
    const { undoStack, redoStack, ...rest } = ctx
    return rest
  })
}
```

### Benefits:
- Ship incomplete features behind flags
- A/B test different implementations
- Gradual rollout to users
- Quick rollback if issues
- Reduce bundle size (tree-shaking disabled features)

## Migration Strategy

### Breaking Change Management
```typescript
// Version state schema
interface StateVersion<OldState = unknown, NewState = unknown> {
  version: number
  migrate: (oldState: OldState) => NewState
}

// Support old state formats during migration
const migrations: StateVersion[] = [
  { 
    version: 1, 
    migrate: (old: unknown) => ({ ...(old as object), version: 2 }) 
  },
  { 
    version: 2, 
    migrate: (old: unknown) => convertToNewFormat(old as LegacyState) 
  }
]

// Type guard for migration
function isValidState(state: unknown): state is CurrentState {
  return typeof state === 'object' && state !== null && 'version' in state
}
```

### From Current State to Feature Group:
1. Identify what's working (don't break it)
2. Map to feature groups
3. Fill gaps with new implementations
4. Test extensively before replacing

### Incremental Approach:
```
Current -> Add Group C -> Test -> Add Group D -> Test -> etc.
Never do: Current -> Add All Groups -> Hope it works
```

## Success Metrics by Feature

### Group A (Timeline): 
- Render 1,000 visible clips smoothly (virtualization for more)
- Smooth scroll at 60fps
- Support up to 10,000 total clips with virtualization

### Group B (Playback):
- Frame-accurate sync < 1 frame drift
- No audio/video desync over 1 hour

### Group C (Clip Operations):
- Split/delete/copy < 16ms (single frame)
- Multi-select operations < 100ms
- Undo/redo < 16ms

### Group I (Undo/Redo):
- Support 100+ operations
- Memory usage < 10MB for history (event-based, not snapshot-based)
- Persist across sessions (optional)

## Common Pitfalls & Solutions

### Pitfall 1: State Synchronization
**Problem**: Timeline state differs from playback state
**Solution**: Single source of truth in state machine
**Implementation**: All state queries go through state machine snapshot

### Pitfall 2: Performance Degradation
**Problem**: Adding features slows everything
**Solution**: Virtualization and lazy loading from start
**Implementation**: React.memo, useMemo, virtualized lists, Web Workers

### Pitfall 3: Memory Leaks
**Problem**: Video/audio resources not cleaned up
**Solution**: Explicit cleanup in service destructors
**Implementation**: AbortController for fetch, revokeObjectURL for blobs, track all listeners

### Pitfall 4: Race Conditions
**Problem**: Multiple operations on same clip
**Solution**: State machine serializes all operations
**Implementation**: Queue events, process one at a time, use guards to prevent invalid transitions

## Implementation Checklist Template

For each feature group implementation:

### Pre-Implementation:
- [ ] Review dependencies
- [ ] Check for conflicts with existing features
- [ ] Design state machine extensions
- [ ] Define new events (including error events)
- [ ] Plan service requirements
- [ ] Define error recovery strategies

### Implementation:
- [ ] Extend state machine (including error states)
- [ ] Add event types (success and error variants)
- [ ] Implement service with error handling
- [ ] Create commands/queries with validation
- [ ] Build React components with loading/error states
- [ ] Add keyboard shortcuts with conflict detection

### Post-Implementation:
- [ ] Unit tests for state transitions (including error paths)
- [ ] Integration tests for workflows
- [ ] Performance profiling (must meet metrics)
- [ ] Memory leak checking (Chrome DevTools)
- [ ] Update documentation
- [ ] Error recovery testing

## Accessibility & Security Considerations

### Accessibility Requirements
```typescript
// All interactive elements must be keyboard accessible
interface AccessibleComponent {
  ariaLabel: string
  tabIndex: number
  role: string
  onKeyDown: (e: KeyboardEvent) => void
}

// Announce state changes to screen readers
const announceChange = (message: string) => {
  const announcement = document.getElementById('aria-live')
  if (announcement) announcement.textContent = message
}
```

### Security Best Practices
```typescript
// Sanitize all user inputs
const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input)
}

// Validate file uploads
const validateUpload = (file: File): boolean => {
  const MAX_SIZE = 5 * 1024 * 1024 * 1024 // 5GB
  const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'audio/mp3']
  
  return file.size <= MAX_SIZE && ALLOWED_TYPES.includes(file.type)
}

// Use Content Security Policy
const CSP_HEADER = "default-src 'self'; media-src 'self' blob:; worker-src 'self' blob:"
```

## Conclusion

This architecture provides:
1. **Clear boundaries** between feature groups - no feature coupling
2. **Systematic approach** to implementation - consistent patterns
3. **Protection against regressions** - state validation prevents corruption
4. **Parallel development** capability - independent feature work
5. **Performance built-in** from start - virtualization and workers

When implementing a feature group, follow the patterns here and create a specific implementation document that maps the feature requirements to these architectural patterns.
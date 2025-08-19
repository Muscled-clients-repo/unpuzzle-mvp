# Video Editor Architecture Principles

## Domain Reality: Video Editing is Inherently Complex

Video editing cannot be simplified below a certain threshold. Unlike CRUD apps where you can start simple and iterate, video editors have irreducible complexity that must be handled correctly from the start.

## Core Principles for Video Editing

### 1. State Consistency is Non-Negotiable
- **Timeline State**: Must ALWAYS be consistent across all views
- **Single Source of Truth**: State Machine owns all timeline state, no exceptions
- **Atomic Operations**: All edits must complete fully or roll back entirely
- **No Partial States**: A clip is either split or not, trimmed or not - no in-between

### 2. Synchronization is Foundational
- **Frame-Accurate**: All operations must be frame-accurate from day one
- **Multi-Track Coordination**: Audio/video tracks must maintain perfect sync
- **Scrubber Truth**: Scrubber position drives all playback and edit operations
- **Real-Time Updates**: Changes must reflect immediately across all UI components

### 3. Performance Architecture Must Be Built-In
- **Streaming Architecture**: Don't load entire videos into memory
- **Virtualized Timeline**: Only render visible timeline segments
- **Worker Threads**: Heavy operations must not block UI
- **Progressive Loading**: Load video segments on demand
- **Cannot Refactor Later**: Performance must be designed in, not bolted on

### 4. Edit Operations Require Proper Patterns
- **Command Pattern**: Every edit must be undoable/redoable
- **Event Sourcing**: All edits must be replayable for recovery
- **Validation First**: Check if operation is valid before attempting
- **Rollback Capability**: Every operation needs a reversal strategy

### 5. User Data Protection is Paramount
- **Auto-Save**: Continuously persist edit state
- **Crash Recovery**: Must be able to restore from any crash
- **Export Safety**: Never corrupt source files
- **Undo Stack**: Maintain complete edit history
- **Version Control**: Track project versions for recovery

## What Can Be Simplified vs What Cannot

### ✅ CAN Simplify Initially:
- Effects and filters (add later)
- Advanced transitions (start with cuts only)
- Color grading tools
- Audio effects beyond basic volume
- Multiple export formats (start with one)
- Collaborative features
- Cloud storage integration
- AI-powered features

### ❌ CANNOT Simplify (Day 1 Requirements):
- State management architecture
- Timeline synchronization
- Playback engine design
- Frame-accurate seeking
- Basic edit operations (cut, trim, split)
- Undo/redo system
- Memory management strategy
- Event-driven architecture
- Multi-track support structure

## Implementation Priorities

### Phase 1: Foundation (Must Be Perfect)
```
Week 1-2: Core Architecture
- State machine for timeline state
- Event bus for all timeline operations  
- Frame-accurate playback engine
- Basic timeline with scrubber
- Memory-efficient video loading
```

### Phase 2: Essential Editing (Must Be Solid)
```
Week 3-4: Basic Operations  
- Split at playhead
- Trim start/end
- Delete segments
- Move clips
- Undo/redo stack
```

### Phase 3: Usability (Can Iterate)
```
Week 5-6: User Experience
- Keyboard shortcuts
- Zoom controls
- Track management
- Basic transitions
- Export functionality
```

### Phase 4: Enhancement (Can Simplify)
```
Week 7+: Advanced Features
- Effects library
- Advanced transitions  
- Color correction
- Audio processing
- Templates
```

## Critical Architectural Decisions

### Decision 1: State Machine is Mandatory
**Why**: Video editing has complex state interactions that are impossible to manage with simple React state
**Trade-off**: Higher initial complexity, but prevents exponential complexity growth
**Alternative**: There is no viable alternative for production video editors

### Decision 2: Event-Driven Timeline Operations
**Why**: Timeline operations affect multiple systems (preview, timeline, properties panel)
**Trade-off**: More initial setup, but enables extensibility
**Alternative**: Direct coupling leads to unmaintainable spaghetti code

### Decision 3: Command Pattern for Edits
**Why**: Undo/redo is not optional in video editing
**Trade-off**: Every operation needs more code
**Alternative**: Users will abandon an editor without undo

### Decision 4: Frame-Level Precision
**Why**: Professional expectation, one frame off is unacceptable
**Trade-off**: More complex calculations and state management
**Alternative**: This would not be a viable video editor

## Fast Development Within Constraints

### How to Move Fast:
1. **Skip features, not architecture** - Leave out effects, not state management
2. **Use proven patterns** - Don't reinvent video editing paradigms
3. **Prototype UI, not core** - Mock UI flows, but build real timeline engine
4. **Incremental features** - Add effects incrementally, but timeline must work perfectly
5. **Test critical paths** - Skip testing UI, never skip testing edit operations

### Acceptable Shortcuts:
- Hard-code video codec support initially
- Simple UI without polish
- Basic export options only
- Limited file format support
- No cloud features initially

### Unacceptable Shortcuts:
- Skipping state management "for now"
- Direct DOM manipulation for timeline
- Storing timeline state in React component state
- Synchronous operations that should be async
- No undo/redo system
- Imprecise frame calculations

## Testing Strategy for Video Editors

### Must Test from Day 1:
- Timeline state consistency
- Frame-accurate seeking
- Multi-track synchronization
- Edit operation atomicity
- Undo/redo operations
- Memory leaks in video handling

### Can Test Later:
- UI component rendering
- Export format variations
- Effects parameter ranges
- Keyboard shortcut conflicts
- Theme consistency

## Common Pitfalls to Avoid

### 1. "We'll add state management later"
- **Reality**: You'll rebuild everything from scratch
- **Do Instead**: Start with state machine, even if simple

### 2. "Let's just use React state for timeline"
- **Reality**: Race conditions and sync issues within days
- **Do Instead**: Separate timeline state from UI state immediately

### 3. "We don't need frame accuracy for MVP"
- **Reality**: All timing logic will need rewriting
- **Do Instead**: Build frame-accurate from the start

### 4. "Undo/redo can come in v2"
- **Reality**: Requires fundamental architecture changes
- **Do Instead**: Build command pattern from day one

### 5. "We'll optimize performance later"
- **Reality**: Architecture determines performance ceiling
- **Do Instead**: Design for streaming and virtualization initially

## The Golden Rules

1. **Timeline State is Sacred** - Never compromise timeline consistency for speed
2. **Frames are Atomic** - Never allow partial frame states
3. **Sync is King** - Audio/video sync errors are unforgivable  
4. **User Work is Protected** - Never lose user edits
5. **Performance is Architecture** - Can't optimize a bad architecture

## Conclusion

Building a video editor requires accepting irreducible complexity upfront. The architecture must be solid from day one for timeline operations, state management, and synchronization. You can skip features but not foundational patterns.

**Remember**: Users will forgive missing features but not broken core editing functionality. A video editor that loses sync, drops frames, or corrupts edits is not a video editor at all.
# Feature Architecture Principles for Video Editor

## Purpose
These principles guide the implementation of all feature groups (A-L) to build a professional-grade video editor comparable to CapCut or Canva. These are NON-NEGOTIABLE rules - violating them will result in an unusable editor. Implementation details belong in separate feature-specific documents.

## Core Architecture Layers

### Event Bus (Central Communication)
- All cross-boundary communication via typed events
- Services never call each other directly (enforced at compile-time)
- Events are immutable and logged
- New features add new event types
- Contains all services and components within its boundary

### Services (Technical Operations)
- Own ONLY technical state (MediaRecorder instance, video element DOM state, file blobs)
- NEVER store or query business state - only process operations
- Process commands without business logic
- Emit domain events (CLIP.SPLIT, CLIP.DELETE) following CATEGORY.ACTION format
- Disposable and replaceable

### State Machine (Business Authority)
- Owns ALL business state (timeline clips, user selections, modes)
- Validates ALL state transitions - prevents impossible states
- Single source of truth for business decisions
- Features extend the machine, never replace it
- Processes events before services execute (prevents race conditions)
- Provides state visualizer for debugging all possible flows

### Event Store (State History)
- Maintains complete history of all state changes
- Enables undo/redo functionality
- Provides time-travel debugging
- Stores events, not snapshots, for efficiency
- Can be persisted for session recovery

### Commands & Queries (API Layer)
- Commands mutate state through state machine validation
- Queries read state from appropriate sources
- Clear separation of read and write operations
- Each feature extends with its own commands/queries

### React Components (Presentation)
- Pure presentational components only
- No useState for business logic (enforced by ESLint)
- UI state managed locally where appropriate
- No business logic in components
- Emit events, receive data

## Enforcement & Validation

### Automated Enforcement
- TypeScript interfaces prevent duplicate data storage
- NO `any` types allowed - full type safety required
- All events and state must have type guards
- Direct service calls result in compile-time errors
- ESLint rules prevent business logic in components
- Dependency analysis ensures clean separation

### Validation Requirements
- Automated tests verify no data duplication
- Event bus provides audit logging
- State machine visualizer shows all possible flows
- Component tests verify rendering only, not business logic

## Feature Development Principles

### 1. Dependency Management
- Features must declare dependencies explicitly
- Cannot implement dependent features before dependencies
- Independent features can be developed in parallel
- Breaking dependencies requires architecture review

### 2. State Ownership (Single Source of Truth)
- Each piece of data exists in exactly ONE place
- Business state (timeline clips, user selections, modes) → State Machine exclusively
- Technical state (MediaRecorder, video element DOM state, file blobs) → Services exclusively
- No state duplication across features - enforced by TypeScript
- State conflicts must be resolved at design time
- Shared state requires explicit coordination

### 3. Event Naming Convention
- All events follow CATEGORY.ACTION format
- Categories match feature groups
- Actions describe the event clearly
- Error events use CATEGORY.ACTION_ERROR format

### 4. Performance Requirements
- Heavy operations must use Web Workers
- UI updates must be virtualized for large datasets
- Continuous updates must be throttled/debounced
- Memory limits must be defined upfront

### 5. Error Handling & Recovery
- Every operation must have error recovery
- Services emit errors, don't throw
- State machine handles all error states
- Compensating events required for all failures
- User data must be protected from corruption
- Event logs enable debugging failures

### 6. Testing Strategy
- State transitions must be unit tested
- Event flows require integration tests
- Performance metrics must be validated
- Error scenarios must be covered

### 7. Memory Management
- All resources must be explicitly cleaned up
- Caches must have size limits
- Event listeners must be tracked and removed
- Object URLs must be revoked

### 8. Concurrency Control
- Operations on same resource must be serialized
- State machine prevents race conditions through validated transitions
- Clear initialization sequence prevents startup race conditions
- Queues handle operation ordering
- Locks prevent conflicting operations
- Event flow order enforced: State Machine → Services → Components

### 9. Migration Strategy
- State schema must be versioned
- Migrations must be reversible
- Old formats supported during transition
- Breaking changes require explicit migration

### 10. Feature Flags
- New features ship behind flags
- Disabled features clean up resources
- Flags enable gradual rollout
- Quick rollback without deployment

## Feature Group Dependencies

### Dependency Rules:
1. Timeline Foundation (A) is prerequisite for most features
2. Playback Sync (B) required for preview features
3. Clip Operations (C) requires both A and B
4. Multi-Track (E) extends Clip Operations
5. Undo/Redo (I) monitors all editing operations
6. Keyboard Shortcuts (J) integrates with all interactive features

### Parallel Development:
- Groups without dependencies can be developed simultaneously
- Shared resources require coordination
- API contracts must be defined upfront
- Integration points need explicit testing

## Quality Standards

### Must Have (Blocks Release):
- Feature works as intended
- No runtime errors in happy path
- Error handling implemented
- No security vulnerabilities
- Performance metrics met

### Should Have (Technical Debt):
- Comprehensive error handling
- Full test coverage
- Performance optimization
- Complete documentation
- Accessibility support

## Implementation Process

### Before Starting:
1. Review these principles
2. Check feature dependencies
3. Identify potential conflicts
4. Define success metrics
5. Plan error recovery

### During Development:
1. Follow layer separation strictly
2. Use established event patterns
3. Implement error handling
4. Test incrementally
5. Profile performance regularly

### After Implementation:
1. Validate against principles
2. Run integration tests
3. Check performance metrics
4. Verify memory cleanup
5. Document deviations

## Success Metrics

### Performance:
- 60fps UI interactions
- Sub-100ms operations for user actions
- Memory growth < 1MB per minute
- No memory leaks after 1 hour usage

### Reliability:
- Minimize data loss on crash
- Recovery from common error states
- Prevent state corruption
- Graceful degradation where possible

### Scalability:
- 1000+ clips without degradation
- 10+ tracks without slowdown
- 1-hour+ videos supported
- Multiple format support

## Common Pitfalls to Avoid

1. **Mixing Layers** - Keep business and technical state separate
2. **Direct Service Calls** - Always use events for communication
3. **State Duplication** - Single source of truth only
4. **Skipping Error Handling** - Always implement error recovery
5. **Ignoring Performance** - Profile early and often
6. **Memory Leaks** - Clean up all resources
7. **Race Conditions** - Serialize through state machine
8. **Breaking Dependencies** - Respect feature prerequisites

## Principles for Specific Domains

### Timeline Operations:
- All operations must be atomic
- Timeline state is sacred
- Frame accuracy is non-negotiable
- Sync must be maintained

### Playback Operations:
- Audio/video sync is critical
- Seek must be frame-accurate
- State follows playback position
- Performance over features

### Import/Export:
- Validate before processing
- Stream large files
- Progress must be trackable
- Cancellation must be clean

### Editing Operations:
- All edits must be undoable
- Atomic operations required
- Selection drives operations
- Feedback must be immediate

## Extension Guidelines

When adding new features:
1. Start with principles, not implementation
2. Define events before code
3. Extend, don't modify existing systems
4. Test integration points thoroughly
5. Document principle violations

## Conclusion

These principles ensure:
- **Professional Quality** - Comparable to CapCut/Canva
- **Zero Race Conditions** - Through proper event ordering
- **Complete Recovery** - From any failure state
- **Event History** - For debugging and undo/redo
- **Type Safety** - Prevents runtime errors
- **Performance** at scale

Violating these principles will result in an unusable video editor. For implementation details, create feature-specific documents that reference these principles.

## Core Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    EVENT BUS (Central Nervous System)   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   RECORD    │  │   PLAYBACK  │  │   TIMELINE  │     │
│  │   SERVICE   │  │   SERVICE   │  │   SERVICE   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│              STATE MACHINE (Single State Authority)     │
├─────────────────────────────────────────────────────────┤
│                   EVENT STORE (State History)           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ RECORDING   │  │ PLAYBACK    │  │ TIMELINE    │     │
│  │ COMPONENTS  │  │ COMPONENTS  │  │ COMPONENTS  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

Events flow: Components → State Machine → Services → Components (cycle)

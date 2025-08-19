# Event System Guide

## Overview
The video editor uses two complementary event systems that serve different purposes:

1. **State Machine Events** - For state transitions and business logic
2. **EventBus Events** - For cross-boundary communication and side effects

## When to Use State Machine Events

Use State Machine events (sent via `stateMachine.send()`) when:
- **Triggering state transitions** (e.g., idle → recording)
- **Updating business state** in the State Machine context
- **Enforcing business rules** through guards
- **Commands need to mutate state**

### Examples:
```typescript
// Starting recording - changes state from idle to recording
stateMachine.send({ type: 'RECORDING.START', mode: 'screen' })

// Adding a clip - updates timeline context
stateMachine.send({ type: 'TIMELINE.CLIP_ADDED', clip })

// Scrubber movement - updates position in context
stateMachine.send({ type: 'SCRUBBER.DRAG', position: 10.5 })
```

## When to Use EventBus Events

Use EventBus events (via `eventBus.emit()`) when:
- **Services need to notify about technical events**
- **Components need to react to state changes**
- **Triggering side effects** (UI updates, logging, analytics)
- **Cross-boundary communication** between isolated services

### Examples:
```typescript
// Service completed a technical operation
eventBus.emit('RECORDING.STOPPED', { duration, videoBlob, videoUrl })

// Playback service reports time updates
eventBus.emit('PLAYBACK.TIME_UPDATE', { currentTime })

// User interactions that don't directly change state
eventBus.emit('CLIP.SELECT', { clipId })
```

## Event Flow Pattern

```
User Action → Command → State Machine Event → State Change
                ↓
         EventBus Event → Side Effects/UI Updates
```

### Example Flow:
1. User clicks "Start Recording"
2. Command: `commands.startRecording('screen')`
3. Command sends State Machine event: `RECORDING.START`
4. State Machine transitions: `idle → recording`
5. RecordingService emits EventBus event: `RECORDING.STARTED`
6. UI components listen and update recording indicator

## Key Principles

1. **State Machine is the authority** - All state changes go through State Machine
2. **EventBus is for notifications** - Services notify about completed operations
3. **Commands use both** - Send to State Machine for state changes, emit to EventBus for notifications
4. **Queries read from State Machine** - Never from services or EventBus

## Event Naming Convention

Both systems use the same naming convention:
- Format: `CATEGORY.ACTION`
- All uppercase
- Categories: `RECORDING`, `PLAYBACK`, `TIMELINE`, `SCRUBBER`, `CLIP`

## Integration Points

The VideoEditorSingleton connects both systems:
```typescript
// Forward EventBus events to State Machine when needed
eventBus.on('TIMELINE.CLIP_ADDED', ({ clip }) => {
  stateMachine.send({ type: 'TIMELINE.CLIP_ADDED', clip })
})

// Update scrubber during playback
eventBus.on('PLAYBACK.TIME_UPDATE', ({ currentTime }) => {
  stateMachine.send({ type: 'SCRUBBER.DRAG', position: currentTime })
})
```

## Common Patterns

### Pattern 1: Service Operation with State Update
```typescript
// Command initiates
stateMachine.send({ type: 'RECORDING.START', mode })

// Service performs operation
recordingService.start(mode)

// Service emits completion
eventBus.emit('RECORDING.STARTED', { startTime, mode })
```

### Pattern 2: UI Interaction
```typescript
// User clicks on timeline
eventBus.emit('SCRUBBER.CLICK', { position })

// Forward to State Machine
stateMachine.send({ type: 'SCRUBBER.CLICK', position })

// State Machine updates context
// UI components re-render based on new state
```

### Pattern 3: Validation Through Guards
```typescript
// Command attempts state change
stateMachine.send({ type: 'CLIP.SPLIT' })

// State Machine guard checks if valid
guard: canSplitAtPosition

// Only proceeds if guard passes
// EventBus notifies if successful or failed
```
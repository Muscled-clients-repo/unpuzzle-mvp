# Video State Machine Architecture Guide

**Pattern ID:** 22
**Created:** 2025-09-29
**Purpose:** Comprehensive guide for leveraging state machine architecture in video page improvements
**Complexity:** Advanced

## 🎯 Overview

The Video State Machine is the core orchestration layer for StudentVideoPlayerV2, managing complex interactions between video playback, AI agents, segment selection, transcript integration, and user interactions through a centralized command/action pattern.

## 🏗️ Architecture Components

### Core Components
```
VideoAgentStateMachine
├── SystemContext (Single Source of Truth)
├── CommandQueue (Action Processing)
├── VideoController (Video Operations)
├── MessageManager (AI Chat Integration)
└── Subscribers (State Change Notifications)
```

### State Categories
```typescript
interface SystemContext {
  state: SystemState              // Overall system state
  videoState: VideoState          // Playback state
  agentState: AgentState         // AI agent activation
  aiState: AIState               // AI generation status
  segmentState: SegmentState     // In/Out points, selection
  recordingState: RecordingState // Voice memo recording
  messages: Message[]            // Chat messages
  quizState: QuizState          // Quiz interactions
}
```

## 🔄 Command/Action Pattern

### Action Dispatch Flow
```
UI Component → dispatch(action) → Command Creation → CommandQueue →
State Machine Processing → Context Update → Subscriber Notification → UI Refresh
```

### Key Action Types
```typescript
// Video Controls
'VIDEO_PLAYED' | 'VIDEO_MANUALLY_PAUSED' | 'VIDEO_SEEK'

// Segment Management
'SET_IN_POINT' | 'SET_OUT_POINT' | 'UPDATE_SEGMENT' | 'CLEAR_SEGMENT'

// AI Interactions
'AGENT_BUTTON_CLICKED' | 'AI_GENERATION_STARTED' | 'AI_GENERATION_COMPLETED'

// Recording Operations
'RECORDING_STARTED' | 'RECORDING_PAUSED' | 'RECORDING_STOPPED'

// Quiz/Reflection
'QUIZ_ANSWER_SELECTED' | 'REFLECTION_SUBMITTED'
```

## 🎯 Implementation Patterns

### Pattern 1: Single Atomic Actions
**Use Case:** Transcript selection to I/O points
**Problem:** Avoiding race conditions between multiple timed operations
**Solution:** Single UPDATE_SEGMENT action with both start/end times

```typescript
// ❌ Bad: Multiple timed actions
onSeek(startTime)
setTimeout(() => onSetInPoint(), 200)
setTimeout(() => {
  onSeek(endTime)
  setTimeout(() => onSetOutPoint(), 200)
}, 400)

// ✅ Good: Single atomic action
dispatch({
  type: 'UPDATE_SEGMENT',
  payload: { inPoint: startTime, outPoint: endTime }
})
```

### Pattern 2: Command Queue Processing
**Use Case:** Ensuring operations complete in order
**Problem:** Async video operations interfering with each other
**Solution:** Queued command processing with retry logic

```typescript
// Commands are processed sequentially
private async executeCommand(command: Command): Promise<void> {
  switch (command.type) {
    case CommandType.SET_IN_POINT:
      await this.handleSetInPoint()
      break
    case CommandType.UPDATE_SEGMENT:
      await this.handleUpdateSegment(command)
      break
  }
}
```

### Pattern 3: Context-Based State Updates
**Use Case:** Coordinated state changes across multiple components
**Problem:** Keeping UI components in sync with video state
**Solution:** Centralized context updates with subscriber notifications

```typescript
private updateContext(newContext: SystemContext) {
  this.context = newContext
  this.notifySubscribers()
}

// All components subscribe to context changes
const { context } = useVideoAgentSystem()
```

## 🔧 Integration Guidelines

### For New Video Features

#### Step 1: Define Actions
```typescript
// Add to action types
'NEW_FEATURE_ACTION'

// Add to command creation
case 'NEW_FEATURE_ACTION':
  return {
    id: `cmd-${Date.now()}`,
    type: CommandType.NEW_FEATURE,
    payload: action.payload,
    timestamp: Date.now(),
    attempts: 0,
    maxAttempts: 3,
    status: 'pending'
  }
```

#### Step 2: Implement Handler
```typescript
// Add to executeCommand switch
case CommandType.NEW_FEATURE:
  await this.handleNewFeature(command)
  break

// Implement handler method
private async handleNewFeature(command: Command) {
  // 1. Perform operations (video control, API calls, etc.)
  // 2. Update context atomically
  this.updateContext({
    ...this.context,
    // Update relevant state
  })
}
```

#### Step 3: Connect UI Components
```typescript
// In component
const { context, dispatch } = useVideoAgentSystem()

const handleFeatureAction = (data) => {
  dispatch({
    type: 'NEW_FEATURE_ACTION',
    payload: data
  })
}

// Use context state for rendering
const featureState = context.newFeatureState
```

### For Transcript Integration Features

#### Pattern: Text Selection → Time Calculation → Segment Update
```typescript
const handleTranscriptSelection = () => {
  // 1. Parse selected text
  const selectedText = window.getSelection().toString().trim()

  // 2. Calculate time boundaries from transcript segments
  const { startTime, endTime } = calculateTimeBoundaries(selectedText, transcriptSegments)

  // 3. Single atomic update
  dispatch({
    type: 'UPDATE_SEGMENT',
    payload: { inPoint: startTime, outPoint: endTime }
  })
}
```

#### Pattern: Context-Driven UI Updates
```typescript
// VideoControls reads from context
const inPoint = context.segmentState.inPoint
const outPoint = context.segmentState.outPoint

// Automatic visual updates when context changes
<Button
  className={inPoint !== null ? "bg-green-500/30" : ""}
>
  I {inPoint !== null && formatTime(inPoint)}
</Button>
```

## 🎨 State Machine Benefits

### 1. **Atomic Operations**
- Single source of truth prevents state inconsistencies
- Atomic updates eliminate race conditions
- Rollback capability for failed operations

### 2. **Predictable State Transitions**
- Clear action → state change mapping
- Debuggable state flow with action logging
- Testable state transitions

### 3. **Separation of Concerns**
- UI components focus on rendering and user interaction
- State machine handles business logic and coordination
- Video controller manages low-level video operations

### 4. **Async Operation Management**
- Command queue ensures proper sequencing
- Retry logic for unreliable operations (video pausing)
- Error handling and recovery

## 🔍 Debugging Patterns

### State Machine Logging
```typescript
// All actions are logged with [SM] prefix
console.log('[SM] Dispatching action:', action.type, action.payload)
console.log('[SM] Context updated:', this.context)
console.log('[SM] Command executed:', command.type)
```

### Context Inspection
```typescript
// Access full state machine context in DevTools
const { context } = useVideoAgentSystem()
console.log('Current context:', context)
```

### Action Tracing
```typescript
// Track action flow through the system
dispatch({ type: 'DEBUG_ACTION', payload: { trace: true } })
```

## 🚀 Performance Considerations

### Subscriber Management
```typescript
// Efficient subscriber updates
private notifySubscribers() {
  this.subscribers.forEach(callback => callback(this.context))
}

// Component-level optimization
const segmentState = useCallback(
  (context) => context.segmentState,
  []
)
```

### Command Queue Optimization
```typescript
// Batch similar commands
// Debounce rapid user actions
// Skip redundant commands
```

## 📋 Migration Checklist

### From Legacy Video Components
- [ ] Identify current state management patterns
- [ ] Map UI actions to state machine actions
- [ ] Replace direct state mutations with dispatch calls
- [ ] Update components to read from context
- [ ] Test state transitions thoroughly

### For New Features
- [ ] Define action types and payloads
- [ ] Implement command handlers
- [ ] Update context structure if needed
- [ ] Connect UI components via useVideoAgentSystem
- [ ] Add comprehensive logging

## 🎯 Real-World Examples

### Example 1: Transcript Selection Integration
**Problem:** User selects transcript text, wants I/O points set automatically
**Implementation:**
```typescript
// Component action
const handleTranscriptSelection = (startTime, endTime) => {
  dispatch({
    type: 'UPDATE_SEGMENT',
    payload: { inPoint: startTime, outPoint: endTime }
  })
}

// State machine handler (existing)
private async handleUpdateSegment(command: Command) {
  const { inPoint, outPoint } = command.payload
  this.updateContext({
    ...this.context,
    segmentState: {
      ...this.context.segmentState,
      inPoint,
      outPoint,
      isComplete: inPoint !== null && outPoint !== null && inPoint < outPoint
    }
  })
}

// UI automatically updates from context
const { inPoint, outPoint } = context.segmentState
```

### Example 2: AI Agent Coordination
**Problem:** Video pauses when AI agent is activated
**Implementation:**
```typescript
// Agent activation triggers video pause
dispatch({
  type: 'AGENT_BUTTON_CLICKED',
  payload: { agentType: 'EXPLAIN', time: currentTime }
})

// State machine coordinates both operations
private async handleAgentButtonClicked(payload: any) {
  // 1. Pause video
  await this.videoController.pauseVideo()

  // 2. Update agent state
  this.updateContext({
    ...this.context,
    state: SystemState.AGENT_ACTIVE,
    agentState: {
      activeType: payload.agentType,
      currentSystemMessageId: messageId
    }
  })
}
```

## 🔮 Future Patterns

### Planned Enhancements
1. **Multi-Video Synchronization** - State machine coordination across multiple video players
2. **Advanced Segment Operations** - Nested segments, segment tagging, segment library
3. **Real-time Collaboration** - Shared state machine context across users
4. **Performance Analytics** - State transition timing and optimization

### Extension Points
- Custom action middleware for logging/analytics
- Plugin system for additional state machine features
- External state synchronization (Redux DevTools integration)

## 📖 References

- **File:** `/src/lib/video-agent-system/core/StateMachine.ts` - Core implementation
- **File:** `/src/components/video/student/StudentVideoPlayerV2.tsx` - Integration example
- **Hook:** `useVideoAgentSystem` - React integration layer
- **Types:** `/src/lib/video-agent-system/types/` - Type definitions

---

**Best Practice:** Always use the state machine for video-related state changes. Direct state mutations bypass the coordination layer and can cause inconsistencies.

**Warning:** Avoid async operations outside of command handlers. The state machine ensures proper sequencing and error handling.

**Tip:** Use the `[SM]` logging prefix to distinguish state machine operations from component-level logging.
# 3a: Group C Architecture Refactoring Plan
## Aligning Clip Operations with Bulletproof Architecture Standards

> **STATUS**: DRAFT - Awaiting Review  
> **COMPLIANCE SCORE**: Currently 2/5 Principles ❌  
> **TARGET SCORE**: 5/5 Principles ✅

---

## 🚨 Current Architecture Violations

### **CRITICAL Violation 1: Circular Event Flow**
**File**: `VideoEditorSingleton.ts:135-157`  
**Principle**: Event-Driven Communication (Principle 2)  
**Issue**: State machine subscribes to its own transitions and emits events

```typescript
// CURRENT BROKEN PATTERN ❌
stateMachine.subscribe((state) => {
    if (state.event.type === 'CLIP.SPLIT_REQUEST') {
      eventBus.emit('clip.splitRequest', { clipId, splitTime, clipData: clip })
    }
})
```

### **CRITICAL Violation 2: State Machine Overreach**
**File**: `VideoEditorMachineV5.ts:412-448`  
**Principle**: State Machine Authority (Principle 3)  
**Issue**: State machine trying to coordinate service execution

```typescript
// CURRENT BROKEN PATTERN ❌
requestClipSplit: ({ context, event }) => {
  // State machine shouldn't coordinate services
  // This violates separation of concerns
}
```

### **MAJOR Violation 3: Wrong Event Types**
**File**: `VideoEditorMachineV5.ts:81-82`  
**Principle**: Event-Driven Communication (Principle 2)  
**Issue**: Using REQUEST events instead of COMMAND events

```typescript
// CURRENT BROKEN PATTERN ❌
| { type: 'CLIP.SPLIT_REQUEST'; clipId: string; splitTime: number }
| { type: 'CLIP.DELETE_REQUEST'; clipId: string }
```

### **MINOR Violation 4: Component Logic Placement**
**File**: `ClipOperationsHandler.tsx`  
**Principle**: Pure Component Pattern (Principle 5)  
**Issue**: Component contains keyboard handling logic

---

## 🎯 Refactoring Strategy

### **Phase 1: Fix Event Flow Architecture**

#### **Step 1.1: Remove Circular Event Pattern**
**File**: `VideoEditorSingleton.ts`

```typescript
// REMOVE THIS ENTIRE SECTION ❌
stateMachine.subscribe((state) => {
    if (state.event.type === 'CLIP.SPLIT_REQUEST') {
      const { clipId, splitTime } = state.event
      const clip = state.context.timeline.clips.find(c => c.id === clipId)
      
      if (clip && splitTime > clip.startTime && splitTime < clip.startTime + clip.duration) {
        eventBus.emit('clip.splitRequest', { clipId, splitTime, clipData: clip })
      }
    }
    
    if (state.event.type === 'CLIP.DELETE_REQUEST') {
      const { clipId } = state.event
      const clip = state.context.timeline.clips.find(c => c.id === clipId)
      
      if (clip) {
        eventBus.emit('clip.deleteRequest', { clipId })
      }
    }
})
```

#### **Step 1.2: Implement Direct Service Listening**
**File**: `TimelineService.ts`

```typescript
// NEW CORRECT PATTERN ✅
private setupEventListeners(): void {
  // Listen directly to state machine events (no circular flow)
  const clipSplitUnsubscribe = this.eventBus.on('clip.split', ({ clipId, splitTime }) => {
    // Get clip data from current state
    const clips = this.getCurrentClipsFromStateQuery()
    const clip = clips.find(c => c.id === clipId)
    
    if (clip && this.validateSplitTime(clip, splitTime)) {
      this.processSplitClip(clipId, splitTime, clip)
    }
  })
  
  const clipDeleteUnsubscribe = this.eventBus.on('clip.delete', ({ clipId }) => {
    this.processDeleteClip(clipId)
  })
}
```

### **Phase 2: Correct State Machine Authority**

#### **Step 2.1: Remove Service Coordination Actions**
**File**: `VideoEditorMachineV5.ts`

```typescript
// REMOVE THESE ACTIONS ❌
requestClipSplit: ({ context, event }) => {
  // This entire action violates Principle 3
}

requestClipDelete: ({ context, event }) => {
  // This entire action violates Principle 3  
}
```

#### **Step 2.2: Simplify to Pure State Updates**
**File**: `VideoEditorMachineV5.ts`

```typescript
// NEW CORRECT PATTERN ✅
actions: {
  // State machine ONLY updates its own state
  selectClip: assign({
    selectedClipId: ({ event }) => {
      if (event.type === 'CLIP.SELECT') {
        return event.clipId
      }
      return null
    }
  }),
  
  // State machine receives completion events from services
  splitClip: assign({
    timeline: ({ context, event }) => {
      if (event.type !== 'CLIP.SPLIT_COMPLETE') return context.timeline
      
      const { originalId, newClips } = event
      const clips = context.timeline.clips.filter(c => c.id !== originalId)
      
      return {
        ...context.timeline,
        clips: [...clips, ...newClips]
      }
    }
  })
}
```

### **Phase 3: Fix Event Types**

#### **Step 3.1: Change REQUEST Events to COMMAND Events**
**File**: `VideoEditorMachineV5.ts`

```typescript
// CHANGE FROM ❌
| { type: 'CLIP.SPLIT_REQUEST'; clipId: string; splitTime: number }
| { type: 'CLIP.DELETE_REQUEST'; clipId: string }

// CHANGE TO ✅  
| { type: 'CLIP.SPLIT'; clipId: string; splitTime: number }
| { type: 'CLIP.DELETE'; clipId: string }
```

#### **Step 3.2: Update State Handlers**
**File**: `VideoEditorMachineV5.ts`

```typescript
// CHANGE EVENT HANDLERS
idle: {
  on: {
    'CLIP.SPLIT': { 
      // No action needed - EventBus will handle
      // State machine just allows the event
    },
    'CLIP.DELETE': {
      // No action needed - EventBus will handle  
    }
  }
}
```

#### **Step 3.3: Update Commands to Use Direct Events**
**File**: `VideoEditorCommands.ts`

```typescript
// CHANGE FROM ❌
this.stateMachine.send({ 
  type: 'CLIP.SPLIT_REQUEST', 
  clipId: clip.id, 
  splitTime: scrubberPosition 
})

// CHANGE TO ✅
// Send to EventBus first, then state machine
this.eventBus.emit('clip.split', { clipId: clip.id, splitTime: scrubberPosition })
this.stateMachine.send({ type: 'CLIP.SPLIT', clipId: clip.id, splitTime: scrubberPosition })
```

### **Phase 4: Fix Service Dependencies**

#### **Step 4.1: Add State Query Method to Services**
**File**: `TimelineService.ts`

```typescript
// NEW METHOD ✅
private getCurrentClipsFromStateQuery(): TimelineClip[] {
  // Services should query state, not store it
  // This maintains SSOT while allowing validation
  return this.stateQueryCallback?.() || []
}

// NEW CONSTRUCTOR ✅
constructor(
  private eventBus: TypedEventBus,
  private stateQueryCallback?: () => TimelineClip[] // Inject query function
) {
  this.setupEventListeners()
}
```

#### **Step 4.2: Update Service Initialization**
**File**: `VideoEditorSingleton.ts`

```typescript
// NEW CORRECT PATTERN ✅
const timelineService = new TimelineService(
  eventBus,
  () => stateMachine.getSnapshot().context.timeline.clips // Query function
)
```

### **Phase 5: Component Purity**

#### **Step 5.1: Extract Keyboard Logic to Container**
**File**: Create `ClipOperationsContainer.tsx`

```typescript
// NEW CONTAINER COMPONENT ✅
export function ClipOperationsContainer() {
  const { commands } = useVideoEditor()
  
  // Container handles all keyboard logic
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete') {
        commands.deleteSelectedClip()
      }
      if (event.metaKey && event.key === 'k') {
        event.preventDefault()
        commands.splitClipAtPlayhead()
      }
      // ... other keyboard handlers
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commands])
  
  return <ClipOperationsHandler /> // Pure component
}
```

#### **Step 5.2: Simplify Handler to Pure Component**
**File**: `ClipOperationsHandler.tsx`

```typescript
// REMOVE ALL KEYBOARD LOGIC ❌
// Keep only pure rendering logic ✅
export function ClipOperationsHandler() {
  // Pure component - no logic, only rendering
  return null // This is just a handler component
}
```

---

## 🔄 Correct Architecture Flow

### **NEW Event Flow (Bulletproof Pattern)**

```
1. User Action (Cmd+K)
   ↓
2. Container Component → Commands.splitClipAtPlayhead()
   ↓  
3. Commands → EventBus.emit('clip.split') + StateMachine.send('CLIP.SPLIT')
   ↓
4. TimelineService listens to EventBus → validates + processes split
   ↓
5. TimelineService → EventBus.emit('clip.splitComplete')  
   ↓
6. StateMachine listens to EventBus → updates timeline.clips
   ↓
7. Components re-render from state changes
```

### **Key Benefits of This Flow**

- ✅ **No Circular Dependencies**: Clear unidirectional flow
- ✅ **State Machine Authority**: Only validates and updates state  
- ✅ **Service Isolation**: Services handle technical operations independently
- ✅ **Event-Driven**: All communication via typed events
- ✅ **Pure Components**: Logic in containers, rendering in components

---

## 📋 Implementation Checklist

### **Phase 1: Event Flow Architecture** 
- [ ] Remove `stateMachine.subscribe()` circular pattern from Singleton
- [ ] Add direct EventBus listeners to TimelineService
- [ ] Add state query injection to services
- [ ] Update service initialization with query callbacks

### **Phase 2: State Machine Authority**
- [ ] Remove `requestClipSplit` and `requestClipDelete` actions
- [ ] Keep only pure state update actions (`selectClip`, `splitClip`, `deleteClip`)
- [ ] Update state event handlers to allow commands without actions

### **Phase 3: Event Types**  
- [ ] Change `CLIP.SPLIT_REQUEST` → `CLIP.SPLIT`
- [ ] Change `CLIP.DELETE_REQUEST` → `CLIP.DELETE`
- [ ] Update all event handlers and command senders
- [ ] Update EventBus type definitions

### **Phase 4: Service Dependencies**
- [ ] Add `getCurrentClipsFromStateQuery()` method to TimelineService
- [ ] Update TimelineService constructor with query callback
- [ ] Remove any remaining circular dependencies
- [ ] Test service isolation

### **Phase 5: Component Purity**
- [ ] Create `ClipOperationsContainer.tsx` with keyboard logic
- [ ] Extract all logic from `ClipOperationsHandler.tsx`  
- [ ] Update component imports in Studio page
- [ ] Test keyboard shortcuts still work

---

## ⚠️ Migration Risks

### **High Risk Changes**
1. **Event Flow Refactoring**: May break existing clip operations temporarily
2. **Event Type Changes**: All event listeners need updating
3. **Service Dependencies**: Constructor changes affect initialization

### **Low Risk Changes** 
1. **Component Extraction**: Pure refactor, no logic changes
2. **State Machine Simplification**: Removes unused code
3. **Query Injection**: Additive change, maintains backward compatibility

---

## 🧪 Testing Strategy

### **Unit Tests Required**
- [ ] Event flow: Commands → EventBus → Services → StateMachine
- [ ] Service isolation: TimelineService operates independently  
- [ ] State machine authority: Only updates state, doesn't coordinate
- [ ] Component purity: Container has logic, handler only renders

### **Integration Tests Required**  
- [ ] Full clip split workflow
- [ ] Full clip delete workflow
- [ ] Keyboard shortcuts via container
- [ ] State consistency after operations

### **Manual Testing Required**
- [ ] Record video → split clips → verify UI updates
- [ ] Select clips → delete → verify timeline updates  
- [ ] Keyboard shortcuts work in container
- [ ] No console errors or infinite loops

---

## 📊 Expected Compliance Score

**BEFORE**: 2/5 Principles Compliant ❌  
**AFTER**: 5/5 Principles Compliant ✅

- ✅ **Principle 1 (SSOT)**: Already compliant, maintained
- ✅ **Principle 2 (Event-Driven)**: Fixed circular flow, direct EventBus  
- ✅ **Principle 3 (State Authority)**: Simplified to pure state updates
- ✅ **Principle 4 (Service Isolation)**: Query injection maintains boundaries
- ✅ **Principle 5 (Pure Components)**: Logic extracted to containers

**This refactoring will achieve full bulletproof architecture compliance.**
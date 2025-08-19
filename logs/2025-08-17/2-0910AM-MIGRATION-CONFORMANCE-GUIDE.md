# MIGRATION CONFORMANCE GUIDE - BULLETPROOF VIDEO EDITOR
## Exact Mapping from Current Architecture to Bulletproof Architecture

> **PURPOSE**: Prevent AI drift by providing exact file-by-file migration instructions that strictly conform to `/logs/2025-08-17/1-0909AM-BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md`

---

## 🚨 CRITICAL RULES (NEVER VIOLATE)

1. **BEFORE touching ANY file**: Read `/logs/2025-08-17/1-0909AM-BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md` lines 10-34 (Principles)
2. **AFTER implementing EACH file**: Verify against the 5 principles
3. **IF you write `useState` in a component**: STOP - You've violated Principle 5
4. **IF you import a service into a component**: STOP - You've violated Principle 2
5. **IF same data exists in 2 places**: STOP - You've violated Principle 1

---

## 📁 FILE-BY-FILE MIGRATION MAP

### ❌ FILES TO REPLACE COMPLETELY

#### 1. `/src/lib/studio-system/core/StudioStateMachine.ts`
**Current Problems**: 
- Fake state machine (just a reducer)
- Multiple sources of truth
- Nuclear patterns everywhere

**Replace With**: `/src/lib/video-editor/state-machine/VideoEditorMachine.ts`
**Architecture Reference**: Lines 61-193
**Key Changes**:
```typescript
// OLD (WRONG):
this.state.recording.isRecording = true // Direct mutation

// NEW (CORRECT):
stateMachine.send({ type: 'RECORDING.START' }) // Validated transition
```
**Validation**: Can't transition from recording to playing? ✅

---

#### 2. `/src/components/studio/recorder/ScreenRecorder.tsx`
**Current Problems**:
- Business logic in component
- Local state with useRef
- Direct MediaRecorder handling

**Split Into**:
- `/src/lib/video-editor/services/RecordingService.ts` (Logic)
- `/src/components/studio/recorder/RecordingControls.tsx` (Pure UI)

**Architecture Reference**: Lines 298-443 (Service), Lines 850-908 (Component)
**Key Changes**:
```typescript
// OLD (WRONG):
const [isRecording, setIsRecording] = useState(false)
const mediaRecorder = useRef<MediaRecorder>()

// NEW (CORRECT):
// Component (Pure):
interface RecordingControlsProps {
  isRecording: boolean // From queries
  onStart: () => void // Calls commands
}

// Service (Logic):
class RecordingService {
  private mediaRecorder: MediaRecorder // Service owns this
}
```
**Validation**: Component has zero business logic? ✅

---

#### 3. `/src/lib/studio-system/providers/StudioSystemProvider.tsx`
**Current Problems**:
- Provides dispatch (allows mutations anywhere)
- Mixes state and actions

**Replace With**: `/src/lib/video-editor/VideoEditorProvider.tsx`
**Architecture Reference**: Lines 816-847
**Key Changes**:
```typescript
// OLD (WRONG):
const { state, dispatch } = useStudioSystem()
dispatch({ type: 'STOP_RECORDING' })

// NEW (CORRECT):
const { commands, queries } = useVideoEditor()
commands.stopRecording() // Command (validated)
queries.isRecording() // Query (read-only)
```
**Validation**: Clear separation of read/write? ✅

---

### 🔄 FILES TO REFACTOR (Keep UI, Change Data)

#### 4. `/src/components/studio/VideoStudioContent.tsx`
**Keep**: Layout, styling, structure
**Change**: Data source and event handling

**Migration Steps**:
```typescript
// STEP 1: Change imports
// OLD:
import { useStudioSystem } from '@/lib/studio-system'
// NEW:
import { useVideoEditor } from '@/lib/video-editor'

// STEP 2: Change data access
// OLD:
const { state, dispatch } = useStudioSystem()
if (state.recording.isRecording) {...}
// NEW:
const { queries } = useVideoEditor()
if (queries.isRecording()) {...}

// STEP 3: Change mutations
// OLD:
dispatch({ type: 'PLAY' })
// NEW:
commands.play()
```
**Architecture Validation**: Component only renders? ✅

---

#### 5. `/src/components/studio/timeline/Timeline.tsx`
**Keep**: Visual timeline rendering
**Change**: State management

**Migration Steps**:
```typescript
// OLD:
const handleSegmentClick = (segment) => {
  dispatch({ type: 'SELECT_SEGMENT', id: segment.id })
  videoRef.current.currentTime = segment.startTime
}

// NEW:
const handleSegmentClick = (segmentId: string) => {
  commands.selectSegment(segmentId) // Goes through state machine
  // PlaybackService handles video element internally
}
```
**Architecture Reference**: Lines 910-984
**Validation**: No direct video element access? ✅

---

#### 6. `/src/components/studio/preview/VideoPreview.tsx`
**Keep**: Video display UI
**Change**: Remove state management

**Migration Steps**:
```typescript
// OLD:
const [currentTime, setCurrentTime] = useState(0)
useEffect(() => { /* sync logic */ })

// NEW:
interface VideoPreviewProps {
  videoUrl: string
  currentTime: number // From queries
  isPlaying: boolean // From queries
}
// No useState, no useEffect for state sync!
```
**Validation**: Props only, no state? ✅

---

### ✅ FILES TO KEEP AS-IS

#### 7. `/src/components/studio/panels/ScriptPanel.tsx`
**Status**: Can stay mostly the same
**Minor Change**: Use commands for dispatch
```typescript
// Just change:
dispatch({ type: 'ADD_SCRIPT_SECTION' })
// To:
commands.addScriptSection()
```

#### 8. `/src/components/studio/panels/AssetsPanel.tsx`
**Status**: Keep the UI
**Minor Change**: Use commands/queries

#### 9. All UI Components in `/src/components/ui/`
**Status**: KEEP - These are pure UI components already

---

## 🎯 NEW FILES TO CREATE (In Order)

### Phase 1: Core Architecture
1. `/src/lib/video-editor/state-machine/VideoEditorMachine.ts` (Lines 61-193)
2. `/src/lib/video-editor/events/EventBus.ts` (Lines 200-281)
3. `/src/lib/video-editor/events/types.ts` (Lines 202-218)

### Phase 2: Services
4. `/src/lib/video-editor/services/RecordingService.ts` (Lines 298-443)
5. `/src/lib/video-editor/services/PlaybackService.ts` (Lines 449-556)
6. `/src/lib/video-editor/services/TimelineService.ts` (Lines 561-658)

### Phase 3: CQRS Layer
7. `/src/lib/video-editor/commands/VideoEditorCommands.ts` (Lines 667-751)
8. `/src/lib/video-editor/queries/VideoEditorQueries.ts` (Lines 757-808)

### Phase 4: React Integration
9. `/src/lib/video-editor/VideoEditorProvider.tsx` (Lines 816-847)
10. `/src/lib/video-editor/hooks/useVideoEditor.ts` (Lines 840-846)

---

## 🔍 VALIDATION CHECKLIST (Run After Each File)

### After Creating State Machine:
```typescript
// TEST: Impossible states prevented?
const machine = interpret(videoEditorMachine)
machine.start()
machine.send({ type: 'RECORDING.START' })
machine.send({ type: 'PLAYBACK.PLAY' }) // Should NOT transition
console.assert(machine.state.value === 'recording', '✅ State machine working')
```

### After Creating EventBus:
```typescript
// TEST: Events flowing?
const testBus = new TypedEventBus()
let received = false
testBus.on('recording.started', () => { received = true })
testBus.emit('recording.started', { startTime: 0, mode: 'screen' })
console.assert(received, '✅ Event bus working')
```

### After Creating Services:
```typescript
// TEST: Service isolation?
import { RecordingService } from './RecordingService'
import { PlaybackService } from './PlaybackService'
// These should NOT import each other
// These should ONLY communicate via eventBus
```

### After Creating Components:
```typescript
// TEST: Component purity?
// Search for 'useState' in component files
// Should return 0 results (except containers)
grep -r "useState" src/components/studio/ | grep -v Container
// Should return NOTHING
```

---

## 🚫 COMMON PITFALLS TO AVOID

### PITFALL 1: "Just a quick useState"
```typescript
// NEVER DO THIS in a component:
const [duration, setDuration] = useState(0)

// ALWAYS DO THIS:
const duration = queries.getRecordingDuration()
```

### PITFALL 2: "Direct service import"
```typescript
// NEVER DO THIS:
import { RecordingService } from '@/lib/video-editor/services'
const recorder = new RecordingService()

// ALWAYS DO THIS:
const { commands } = useVideoEditor()
commands.startRecording()
```

### PITFALL 3: "Quick sync between components"
```typescript
// NEVER DO THIS:
useEffect(() => {
  if (videoRef.current) {
    videoRef.current.currentTime = state.currentTime
  }
}, [state.currentTime])

// ALWAYS: Let PlaybackService handle the video element
```

### PITFALL 4: "Bypassing state machine"
```typescript
// NEVER DO THIS:
setState({ ...state, isPlaying: true })

// ALWAYS:
stateMachine.send({ type: 'PLAYBACK.PLAY' })
```

---

## 📊 MIGRATION PROGRESS TRACKER

### Phase 1: Foundation [0/3]
- [ ] XState Machine implemented
- [ ] EventBus implemented  
- [ ] Event types defined

### Phase 2: Services [0/3]
- [ ] RecordingService implemented
- [ ] PlaybackService implemented
- [ ] TimelineService implemented

### Phase 3: CQRS [0/2]
- [ ] Commands implemented
- [ ] Queries implemented

### Phase 4: React Integration [0/2]
- [ ] Provider implemented
- [ ] Hooks implemented

### Phase 5: Component Migration [0/6]
- [ ] VideoStudioContent migrated
- [ ] ScreenRecorder → RecordingControls
- [ ] Timeline migrated
- [ ] VideoPreview migrated
- [ ] ScriptPanel migrated
- [ ] AssetsPanel migrated

---

## 🎯 SUCCESS CRITERIA

1. **grep "useState" in components returns 0** (except containers)
2. **No component imports services directly**
3. **State machine prevents impossible states** (can't play while recording)
4. **All data has single source** (only in state machine context)
5. **Services don't know about each other** (only events)
6. **Commands validate before executing**
7. **Queries never mutate**
8. **Components only receive props**
9. **Event log shows complete system flow**
10. **No "nuclear" patterns remain**

---

## 🔄 CONFORMANCE VERIFICATION SCRIPT

```bash
#!/bin/bash
# Run this after each migration step

echo "Checking for useState in components..."
grep -r "useState" src/components/studio/ --include="*.tsx" | grep -v Container

echo "Checking for direct service imports in components..."
grep -r "from.*services" src/components/studio/ --include="*.tsx"

echo "Checking for dispatch in new code..."
grep -r "dispatch" src/lib/video-editor/ --include="*.ts"

echo "Checking for nuclear patterns..."
grep -r "nuclear" src/ --include="*.ts" --include="*.tsx"

echo "If all above return nothing, you're conforming to architecture ✅"
```

---

**USE THIS GUIDE FOR EVERY FILE YOU TOUCH. NO EXCEPTIONS.**
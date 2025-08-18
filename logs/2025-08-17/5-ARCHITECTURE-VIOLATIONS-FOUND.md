# Bulletproof Architecture - Violations Found

## Document Review Date: 2025-08-17

After a complete review of the bulletproof architecture document, the following violations of the stated principles were found:

---

## 🔴 Critical Issues (Break Core Principles)

### 1. **Missing Event Type Definition** (Line 176)
```typescript
'SERVICES.READY': {
  target: 'idle'
}
```
- **Problem**: `SERVICES.READY` event is used but NOT defined in `VideoEditorEvent` type union
- **Violates**: Principle 1 - Type Safety
- **Fix**: Add to event type definition

### 2. **Using `any` Types** (Lines 305, 347, 1222)
```typescript
private eventLog: Array<{ type: string; payload: any; timestamp: number }> = []
// and
} as any
```
- **Problem**: Document explicitly says "NO `any` types" but uses them
- **Violates**: Principle 1 - Type Safety
- **Fix**: Use proper generic types or unknown

### 3. **Services Exposing State** (Lines 530-537)
```typescript
get isRecording(): boolean {
  return this.mediaRecorder?.state === 'recording'
}
get recordingDuration(): number {
  if (!this.startTime) return 0
  return (performance.now() - this.startTime) / 1000
}
```
- **Problem**: Services have state getters but shouldn't expose state
- **Violates**: Principle 4 - Services shouldn't be source of truth
- **Contradiction**: These getters are then used in queries (lines 868-872)
- **Fix**: Either remove getters OR acknowledge services can expose computed state

### 4. **Queries Getting State from Services** (Lines 868-872)
```typescript
isRecording(): boolean {
  return this.recordingService.isRecording
}
getRecordingDuration(): number {
  return this.recordingService.recordingDuration
}
```
- **Problem**: Queries reading from services instead of state machine
- **Violates**: Principle 1 - Single Source of Truth
- **Fix**: Get from `snapshot.context.recording.isActive`

### 5. **Service References Non-existent Properties** (Lines 676-735)
```typescript
const segment = this.segments.find(s => s.id === segmentId)
// but TimelineService has no segments property!
```
- **Problem**: TimelineService methods reference `this.segments` which doesn't exist
- **Violates**: Basic TypeScript - code won't compile
- **Fix**: Remove these methods or add segments back

---

## 🟡 Type Safety Issues

### 6. **Event Property Access Without Guards** (Lines 257-260, 263)
```typescript
totalDuration: (context, event) => Math.max(
  context.totalDuration,
  event.segment.startTime + event.segment.duration
)
// and
currentTime: (_, event) => event.time
```
- **Problem**: Accessing event properties without type checking
- **Fix**: Use type guards before accessing

### 7. **Wrong Error Type** (Lines 774, 793)
```typescript
error: error.message
```
- **Problem**: `error` is unknown type in catch block
- **Fix**: Type assertion or proper error handling

### 8. **Malformed Interface Definition** (Lines 386-398)
```typescript
export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null
  
  interface ServiceEventBus {  // Interface inside class!
```
- **Problem**: Interface defined inside class body
- **Fix**: Move interface outside class

---

## 🟠 API Mismatches

### 9. **Wrong XState v5 Import** (Line 973)
```typescript
const stateMachine = interpret(videoEditorMachine)
```
- **Problem**: XState v5 uses `createActor` not `interpret`
- **Fix**: Use `createActor`

### 10. **Duplicate Actions Definition** (Lines 269-274)
```typescript
}, {
  actions: {
    validateContext: (context) => {
```
- **Problem**: Actions already defined at line 235
- **Fix**: Remove duplicate or merge

### 11. **Wrong EventBus Type** (Line 548)
```typescript
constructor(private eventBus: TypedEventBus) {
```
- **Problem**: Should be `ServiceEventBus` based on line 387
- **Fix**: Use consistent type

### 12. **Missing Import** (Line 955)
```typescript
useEffect(() => {
```
- **Problem**: `useEffect` not imported
- **Fix**: Add to imports

---

## 🔵 Logic Issues

### 13. **Service Providing State in Events** (Lines 566, 579)
```typescript
this.eventBus.emit('playback.play', {
  currentTime: this.videoElement.currentTime
})
```
- **Problem**: Service is source of currentTime
- **Violates**: Principle 1 - SSOT
- **Fix**: Don't include state in events or get from state machine

### 14. **Methods Calling Non-existent Functions** (Lines 729, 834, 845)
```typescript
this.addSegment({  // doesn't exist
const newSegment = this.timelineService.addSegment(segment)  // doesn't exist
this.timelineService.selectSegment(segmentId)  // can't work without segments
```
- **Problem**: Calling methods that don't exist or can't work
- **Fix**: Update to use correct method names

### 15. **Test Using Wrong Initial State** (Line 1172)
```typescript
it('should start in idle state', () => {
  expect(service.state.value).toBe('idle')
})
```
- **Problem**: Initial state is `initializing` not `idle` (line 169)
- **Fix**: Update test expectation

---

## 📊 Summary

- **Critical Violations**: 5 (break core principles)
- **Type Safety Issues**: 3 (use `any` or wrong types)
- **API Mismatches**: 4 (wrong function names/imports)
- **Logic Issues**: 3 (inconsistent behavior)

**Total**: 15 major issues that contradict the stated principles

---

## 🔧 Recommended Fix Order

1. **Fix type definitions first** - Add missing event types, remove `any`
2. **Resolve SSOT violations** - Decide where state truly lives
3. **Fix service methods** - Either add state or remove methods
4. **Update API calls** - Use correct XState v5 functions
5. **Fix tests** - Match actual implementation

---

## 💡 Root Cause

The document appears to have been updated piecemeal, with some parts updated for XState v5 and proper patterns while others still show old patterns. This creates confusion about what the "correct" implementation should be.

## 🎯 Decision Made

**Going with Option A**: Services can have computed/derived state

### Rationale:
- **Performance**: Recording duration updates 60+ times/second - shouldn't go through state machine
- **Source of Truth**: MediaRecorder.state IS the truth for recording status
- **Separation**: State Machine owns business state, Services own technical state
- **Professional Pattern**: How CapCut/Premiere handle it

### New Architecture Rule:
```
State Machine = Business Logic State (segments, timeline, modes)
Services = Technical Implementation State (MediaRecorder status, video currentTime)
Queries = Unified Interface (reads from both sources)
```

This is MORE bulletproof because each system owns what it knows best.
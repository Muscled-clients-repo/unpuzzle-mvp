# Scrubber-Preview Sync Issue: Root Cause Analysis

*Deep investigation into why scrubber and preview panel remain out of sync despite Query Layer fixes*

---

## 🔴 CRITICAL DISCOVERY

**The State Machine NEVER updates `context.currentTime`!**

Despite fixing the Query Layer to read from State Machine, we have a fundamental issue: the State Machine doesn't actually track playback time.

---

## 📊 DATA FLOW ANALYSIS

### 1. Preview Panel Time Source Chain
```
Preview Panel (PlaybackControls.tsx)
↓ polls every 100ms
queries.getCurrentTime()
↓ reads from
snapshot.context.currentTime
↓ value is
ALWAYS 0 (never updated!)
```

### 2. Scrubber Position Source Chain
```
Timeline Scrubber (TimelineContainer.tsx)
↓ polls every 100ms
queries.getScrubberPosition()
↓ reads from
snapshot.context.timeline.scrubber.position
↓ updated by
SCRUBBER.DRAG events (user interaction only)
```

### 3. Actual Video Time
```
Video Element (<video> tag)
↓ emits timeupdate events
PlaybackService
↓ emits via EventBus
'playback.timeUpdate'
↓ forwarded by VideoEditorSingleton as
'VIDEO.TIME_UPDATE'
↓ sent to State Machine but...
NOT HANDLED! (no action defined)
```

---

## 🔍 EVIDENCE

### Evidence 1: VIDEO.TIME_UPDATE Event Defined but Ignored

**VideoEditorMachineV5.ts (line 100)**
```typescript
export type VideoEditorEvent = 
  // ...
  | { type: 'VIDEO.TIME_UPDATE'; time: number }  // Defined
```

**VideoEditorSingleton.ts (line 74)**
```typescript
eventBus.on('playback.timeUpdate', ({ currentTime }) => {
  stateMachine.send({ type: 'VIDEO.TIME_UPDATE', time: currentTime })  // Sent
})
```

**State Machine States**
```typescript
// Searched entire file - NO handler for VIDEO.TIME_UPDATE
// Event is sent but completely ignored!
```

### Evidence 2: context.currentTime Never Updated

**Initial Value (line 124)**
```typescript
function getInitialContext(): VideoEditorContext {
  return {
    currentTime: 0,  // Set to 0
    // ...
  }
}
```

**Update Mechanism**
```typescript
// NONE FOUND!
// No assign() action updates currentTime
// No event handler modifies it
// It stays at 0 forever
```

### Evidence 3: Multiple Time Fields (Confusion)

The State Machine context has MULTIPLE time-related fields:
```typescript
context: {
  currentTime: 0,                          // Never updated
  playback: {
    currentVideoTime: 0,                    // Also never updated
    globalTimelinePosition: 0,              // Also never updated
  },
  timeline: {
    scrubber: {
      position: number                      // Updated by user drag only
    }
  }
}
```

**Four different time fields, none synchronized!**

---

## 🎯 WHY QUERY LAYER FIX DIDN'T HELP

Our Query Layer fix made things read from State Machine:
```typescript
// VideoEditorQueries.ts
getCurrentTime(): number {
  return snapshot.context.currentTime  // Now reads from State Machine ✅
}
```

But `context.currentTime` is always 0 because:
1. PlaybackService no longer exposes `currentTime` getter (we removed it)
2. State Machine never updates `context.currentTime` (no handler for VIDEO.TIME_UPDATE)
3. Result: Preview always shows 0:00

Meanwhile, scrubber position only updates when user drags it:
```typescript
'SCRUBBER.DRAG': {
  actions: 'updateScrubberPosition'  // But this action isn't implemented!
}
```

---

## 🚨 MISSING ACTION IMPLEMENTATIONS

The State Machine references many actions that **don't exist**:
- `updateScrubberPosition` - Referenced but not implemented
- `clickScrubber` - Referenced but not implemented  
- `startScrubberDrag` - Referenced but not implemented
- `endScrubberDrag` - Referenced but not implemented
- `pausePlayback` - Referenced but not implemented
- `resumePlayback` - Referenced but not implemented
- No handler for `VIDEO.TIME_UPDATE` event at all

---

## 💡 ROOT CAUSES

### Primary Cause
**State Machine is incomplete** - It's a skeleton that references actions without implementing them. The Integration Layer sends events, but the State Machine doesn't process them properly.

### Secondary Cause
**Multiple time representations** - Even if we fixed the primary cause, we have 4 different time fields that could get out of sync:
1. `context.currentTime`
2. `context.playback.currentVideoTime`
3. `context.playback.globalTimelinePosition`
4. `context.timeline.scrubber.position`

### Tertiary Cause
**No synchronization mechanism** - Scrubber and playback time are independent:
- Scrubber updates from user interaction
- Playback time should update from video element
- No mechanism ties them together

---

## 🔧 SOLUTION REQUIREMENTS

### 1. Implement VIDEO.TIME_UPDATE Handler
```typescript
playing: {
  on: {
    'VIDEO.TIME_UPDATE': {
      actions: assign({
        currentTime: (_, event) => event.time,
        timeline: ({ timeline }) => ({
          ...timeline,
          scrubber: {
            ...timeline.scrubber,
            position: event.time  // Keep scrubber in sync
          }
        })
      })
    }
  }
}
```

### 2. Consolidate Time Fields
Remove redundant time fields and use ONE source:
- Delete `playback.currentVideoTime`
- Delete `playback.globalTimelinePosition`
- Use `currentTime` as the single source
- Keep `scrubber.position` synced with `currentTime`

### 3. Implement Missing Actions
Either:
- Define action implementations using `assign()`
- Or convert action references to inline `assign()` calls

---

## 📈 VALIDATION

### Current State
- Preview Panel: Always shows 0:00 ❌
- Scrubber: Only moves when dragged ❌
- Sync: Non-existent ❌

### After Fix
- Preview Panel: Shows actual video time ✅
- Scrubber: Follows video playback ✅
- Sync: Perfect alignment ✅

---

## 🎬 CONCLUSION

**We achieved Single Source of Truth architecturally, but the source contains no truth!**

The State Machine is the authority, but it doesn't track video time. It's like having a perfectly organized filing cabinet that's completely empty.

### The Irony
1. We removed service state getters ✅
2. We made queries read from State Machine ✅
3. But State Machine doesn't update its state ❌

**Result**: Preview panel now reliably shows the wrong value (0:00) instead of potentially showing the right value from the service.

### Next Steps
1. Implement VIDEO.TIME_UPDATE handler in State Machine
2. Sync scrubber.position with currentTime
3. Implement missing action handlers
4. Remove redundant time fields

Without these fixes, the State Machine is just a facade - it claims authority but doesn't exercise it.
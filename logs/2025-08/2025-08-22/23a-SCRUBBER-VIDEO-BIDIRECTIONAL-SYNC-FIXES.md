# Scrubber-Video Bidirectional Sync Fixes

*Detailed implementation guide for completing the preview panel / scrubber synchronization*

---

## 🎯 Current Sync Status

### What's Working ✅
- Video plays → Scrubber follows (via VIDEO.TIME_UPDATE)
- Preview panel shows correct time
- Scrubber position updates during playback

### What's Missing ❌
- Clicking timeline ruler doesn't seek video
- Dragging scrubber doesn't update video
- Missing action implementations in State Machine
- No bidirectional sync

---

## 🔧 Fix 1: Implement Scrubber Click → Video Seek

### Problem
When user clicks on timeline ruler, `clickScrubber` action is triggered but does nothing.

### Solution
```typescript
// In State Machine - Replace 'clickScrubber' reference with:
'SCRUBBER.CLICK': {
  actions: assign((context, event) => ({
    currentTime: event.position,
    timeline: {
      ...context.timeline,
      scrubber: {
        ...context.timeline.scrubber,
        position: event.position
      }
    },
    playback: {
      ...context.playback,
      pendingSeek: { time: event.position }  // Trigger Integration Layer
    }
  }))
}
```

### Integration Layer Handler
```typescript
// In VideoEditorSingleton.ts subscription:
if (playback.pendingSeek && playback.pendingSeek.time !== processedSeek) {
  processedSeek = playback.pendingSeek.time
  playbackService.seek(playback.pendingSeek.time)
  stateMachine.send({ type: 'PLAYBACK.ACTIONS_PROCESSED' })
}
```

---

## 🔧 Fix 2: Implement Scrubber Drag → Live Preview Update

### Problem
`updateScrubberPosition` only updates scrubber position, not the video currentTime.

### Solution
```typescript
// In State Machine - Replace 'updateScrubberPosition' with:
'SCRUBBER.DRAG': {
  actions: assign((context, event) => ({
    currentTime: event.position,  // Update time too!
    timeline: {
      ...context.timeline,
      scrubber: {
        ...context.timeline.scrubber,
        position: event.position,
        isDragging: true  // Keep drag state
      }
    },
    playback: {
      ...context.playback,
      // Only set pendingSeek if we want real-time preview during drag
      // Option A: Live preview (might be choppy)
      pendingSeek: { time: event.position }
      // Option B: Preview on release only (smoother)
      // pendingSeek: null  // Don't seek until drag ends
    }
  }))
}
```

### Optimization Options
- **Option A**: Seek on every drag update (real-time but potentially choppy)
- **Option B**: Only seek when drag ends (smooth dragging, delayed preview)
- **Option C**: Throttle seeks during drag (balance between responsiveness and performance)

---

## 🔧 Fix 3: Complete Bidirectional Sync

### Current Flow (One Direction Only)
```
Video Playback → timeUpdate event → State Machine → Scrubber Position
```

### Required Flow (Both Directions)
```
Video Playback ←→ State Machine ←→ Scrubber Position
```

### Implementation
1. **Scrubber → Video Direction**
   - User drags scrubber
   - State Machine updates currentTime + sets pendingSeek
   - Integration Layer detects pendingSeek
   - Calls playbackService.seek()
   - Video jumps to position

2. **Prevent Feedback Loop**
   ```typescript
   // In VIDEO.TIME_UPDATE handler, check if time change is from scrubber
   'VIDEO.TIME_UPDATE': {
     guard: ({ context, event }) => {
       // Only update if not currently dragging scrubber
       return !context.timeline.scrubber.isDragging ||
              Math.abs(event.time - context.currentTime) < 0.1
     },
     actions: assign((context, event) => ({
       currentTime: event.time,
       timeline: {
         ...context.timeline,
         scrubber: {
           ...context.timeline.scrubber,
           position: event.time
         }
       }
     }))
   }
   ```

---

## 🔧 Fix 4: Optimize Polling Frequency

### Current Issue
Components poll every 100ms, causing potential visual lag.

### Solution Options

#### Option A: Reduce Polling Interval
```typescript
// In TimelineContainer.tsx and PlaybackControls.tsx
const interval = setInterval(updateState, 50)  // Was 100ms
```

#### Option B: Use requestAnimationFrame for Smooth Updates
```typescript
useEffect(() => {
  let rafId: number
  
  const updateState = () => {
    // Update UI state
    updateUIState({
      scrubberPosition: queries.getScrubberPosition(),
      currentTime: queries.getCurrentTime()
    })
    rafId = requestAnimationFrame(updateState)
  }
  
  rafId = requestAnimationFrame(updateState)
  return () => cancelAnimationFrame(rafId)
}, [queries])
```

#### Option C: Implement Reactive Subscriptions (Best)
```typescript
// Add subscription capability to State Machine
// Components subscribe to specific state slices
// Updates only when that slice changes
```

---

## 🔧 Fix 5: Implement Proper Seek Mechanism

### Required Flow
1. User interaction (click/drag) → Update currentTime
2. Set pendingSeek in context
3. Integration Layer detects pendingSeek
4. Call playbackService.seek()
5. Clear pendingSeek after execution

### State Machine Implementation
```typescript
// Add to context interface
playback: {
  pendingSeek: { time: number } | null
}

// In scrubber actions
actions: assign((context, event) => ({
  currentTime: event.position,
  playback: {
    ...context.playback,
    pendingSeek: { time: event.position }
  }
}))
```

### Integration Layer Implementation
```typescript
// In VideoEditorSingleton subscription
const { pendingSeek } = snapshot.context.playback

if (pendingSeek && !isProcessingSeek) {
  isProcessingSeek = true
  
  try {
    await playbackService.seek(pendingSeek.time)
    stateMachine.send({ type: 'PLAYBACK.ACTIONS_PROCESSED' })
  } finally {
    isProcessingSeek = false
  }
}
```

### Clear Pending Actions
```typescript
// Add PLAYBACK.ACTIONS_PROCESSED handler
'PLAYBACK.ACTIONS_PROCESSED': {
  actions: assign({
    playback: (context) => ({
      ...context.playback,
      pendingSeek: null  // Clear after execution
    })
  })
}
```

---

## 🔧 Fix 6: Implement All Missing Actions

### startScrubberDrag
```typescript
'SCRUBBER.START_DRAG': {
  actions: assign({
    timeline: (context) => ({
      ...context.timeline,
      scrubber: {
        ...context.timeline.scrubber,
        isDragging: true
      }
    })
  })
}
```

### endScrubberDrag
```typescript
'SCRUBBER.END_DRAG': {
  actions: assign((context) => ({
    timeline: {
      ...context.timeline,
      scrubber: {
        ...context.timeline.scrubber,
        isDragging: false
      }
    },
    // Trigger final seek when drag ends
    playback: {
      ...context.playback,
      pendingSeek: { time: context.timeline.scrubber.position }
    }
  }))
}
```

### updateScrubberPosition (Complete Version)
```typescript
'SCRUBBER.DRAG': {
  actions: assign((context, event) => ({
    currentTime: event.position,
    timeline: {
      ...context.timeline,
      scrubber: {
        ...context.timeline.scrubber,
        position: event.position,
        isDragging: true
      }
    },
    playback: {
      ...context.playback,
      // Throttle seeks or only seek on drag end
      pendingSeek: context.timeline.scrubber.isDragging 
        ? null  // Don't seek during drag
        : { time: event.position }  // Seek on first drag
    }
  }))
}
```

### clickScrubber (Complete Version)
```typescript
'SCRUBBER.CLICK': {
  actions: assign((context, event) => ({
    currentTime: event.position,
    timeline: {
      ...context.timeline,
      scrubber: {
        ...context.timeline.scrubber,
        position: event.position,
        isDragging: false
      }
    },
    playback: {
      ...context.playback,
      pendingSeek: { time: event.position }
    }
  }))
}
```

---

## 📈 Implementation Priority

### Phase 1: Critical (Immediate)
1. Fix `clickScrubber` - Users expect clicking to seek
2. Implement pendingSeek mechanism
3. Add Integration Layer seek handler

### Phase 2: Important (Next)
1. Fix `updateScrubberPosition` for drag
2. Implement `startScrubberDrag` and `endScrubberDrag`
3. Add feedback loop prevention

### Phase 3: Optimization (Later)
1. Reduce polling frequency or implement subscriptions
2. Add throttling for drag updates
3. Optimize seek performance

---

## ✅ Success Criteria

After implementing all fixes:
- [ ] Clicking timeline ruler seeks video to that position
- [ ] Dragging scrubber updates video position
- [ ] Video playback moves scrubber
- [ ] No feedback loops or stuttering
- [ ] Smooth, responsive interaction
- [ ] Preview and scrubber always in perfect sync

---

## ⚠️ Edge Cases to Test

1. **Rapid clicking** - Multiple clicks in quick succession
2. **Drag during playback** - Dragging while video is playing
3. **Seek to end** - Clicking at video end
4. **Seek to start** - Clicking at position 0
5. **Fast dragging** - Quick scrubber movements
6. **Release outside** - Drag scrubber and release mouse outside timeline

---

## 🎬 End Result

Perfect bidirectional synchronization where:
- User can control video by clicking/dragging timeline
- Video playback automatically updates scrubber
- Preview panel always shows correct time
- All interactions feel instant and responsive
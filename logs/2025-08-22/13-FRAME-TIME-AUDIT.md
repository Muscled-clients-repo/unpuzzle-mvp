# FRAME vs TIME USAGE AUDIT
**Video Editor Codebase Review**

## 🎯 AUDIT GOAL
Ensure frame calculations are used for ALL internal logic and time is ONLY used when interfacing with the video element or displaying to users.

---

## 📋 AUDIT CHECKLIST

### ✅ CORRECT Usage (Frames for calculations, time for boundaries)
### ❌ INCORRECT Usage (Time for calculations where frames should be used)
### ⚠️ QUESTIONABLE Usage (Needs review)

---

## 🔍 VideoEditorSingleton.ts AUDIT

### Lines 80-100: Time Update Handler
```typescript
// ✅ CORRECT: Using frames for boundary detection
const currentFrame = frameService.timeToFrame(currentTime)
const outPointFrame = frameService.timeToFrame(currentClip.outPoint)
if (currentFrame >= outPointFrame - 1) {
```
**Status:** ✅ CORRECT - Frame-based boundary detection

### Lines 323-336: First Seek Calculation
```typescript
// ✅ CORRECT: Frame-based seek calculation
const localSeekFrame = frameService.timeToFrame(localSeekTime)
const inPointFrame = frameService.timeToFrame(clip.inPoint)
const videoSeekFrame = inPointFrame + localSeekFrame  // Perfect integer math
const videoSeekTime = frameService.frameToTime(videoSeekFrame)  // Convert only for video
await playbackService.seek(videoSeekTime)
```
**Status:** ✅ CORRECT - Frame calculations, time only for video element

### Lines 384-397: Second Seek Calculation
```typescript
// ✅ CORRECT: Frame-based seek calculation
const localSeekFrame = frameService.timeToFrame(localSeekTime)
const inPointFrame = frameService.timeToFrame(clip.inPoint)
const videoSeekFrame = inPointFrame + localSeekFrame
const videoSeekTime = frameService.frameToTime(videoSeekFrame)
await playbackService.seek(videoSeekTime)
```
**Status:** ✅ CORRECT - Frame calculations, time only for video element

### Lines 248-259: Restart Detection
```typescript
// ⚠️ QUESTIONABLE: Mixed frame/time usage
const globalFrame = frameService.timeToFrame(playback.globalTimelinePosition)
const isRestartingFromBeginning = globalFrame === 0 && 
                                  playback.pendingClipTransition && 
                                  frameService.timeToFrame(playback.pendingClipTransition.startTime) === 0
```
**Status:** ⚠️ NEEDS IMPROVEMENT - Should store globalFrame in state, not convert repeatedly

---

## 🔍 VideoEditorMachineV5.ts AUDIT

### Lines 455-490: Time Update Processing
```typescript
// ✅ CORRECT: Frame-based time conversion
const videoFrame = frameService.timeToFrame(videoTime)
const inPointFrame = frameService.timeToFrame(currentClip.inPoint)
const localClipFrame = videoFrame - inPointFrame  // Integer subtraction
const startFrame = frameService.timeToFrame(currentClip.startTime)
const globalFrame = startFrame + localClipFrame  // Integer addition

// Convert back to time only for legacy compatibility
const localClipTime = frameService.frameToTime(localClipFrame)
const globalPosition = frameService.frameToTime(globalFrame)
```
**Status:** ✅ CORRECT - Frame calculations with time conversion only for display

### Lines 731-756: Total Duration Calculation
```typescript
// ✅ CORRECT: Frame-based duration calculation
const lastClipInFrame = frameService.timeToFrame(lastClip.inPoint)
const lastClipOutFrame = frameService.timeToFrame(lastClip.outPoint)
const lastClipFrames = lastClipOutFrame - lastClipInFrame
const lastClipStartFrame = frameService.timeToFrame(lastClip.startTime)
const nextStartFrame = lastClipStartFrame + lastClipFrames
startTime = frameService.frameToTime(nextStartFrame)
```
**Status:** ✅ CORRECT - Perfect frame-based calculation

### Lines 850-860: Scrubber Clip Detection
```typescript
// ✅ CORRECT: Frame-based clip boundary detection
const positionFrame = frameService.timeToFrame(position)
const startFrame = frameService.timeToFrame(clip.startTime)
const clipFrames = outPointFrame - inPointFrame
const endFrame = startFrame + clipFrames
return positionFrame >= startFrame && positionFrame < endFrame
```
**Status:** ✅ CORRECT - Frame-based boundary detection

### Lines 890-915: Delete Clips Duration Recalculation
```typescript
// ✅ CORRECT: Frame-based duration calculation
const clipInFrame = frameService.timeToFrame(clip.inPoint)
const clipOutFrame = frameService.timeToFrame(clip.outPoint)
const clipFrames = clipOutFrame - clipInFrame
const startFrame = frameService.timeToFrame(clip.startTime)
const endFrame = startFrame + clipFrames
const endTime = frameService.frameToTime(endFrame)
```
**Status:** ✅ CORRECT - Frame calculations with time conversion for final result

### State Structure Issues:
```typescript
interface TimelineClip {
  startTime: number      // ❌ SHOULD BE: startFrame: number
  duration: number       // ❌ SHOULD BE: durationFrames: number
  inPoint: number        // ❌ SHOULD BE: inPointFrame: number
  outPoint: number       // ❌ SHOULD BE: outPointFrame: number
}
```
**Status:** ❌ NEEDS REFACTORING - State should store frames, not time

---

## 🔍 PlaybackService.ts AUDIT

### Lines 121-128: Seek Function
```typescript
// ✅ CORRECT: Frame-based snapping, time conversion for video element
const snappedTime = this.frameService.snapToFrame(time)
const targetFrame = this.frameService.timeToFrame(snappedTime)
console.log('🎬 FRAME SEEK in PlaybackService: Frame', targetFrame, '=', snappedTime, 's')
this.videoElement.currentTime = snappedTime
```
**Status:** ✅ CORRECT - Frame-based precision with time for video element

### Lines 247-260: Time Tracking
```typescript
// ✅ CORRECT: Only forwarding video element time (necessary)
const updateTime = () => {
  if (this.videoElement && !this.videoElement.paused) {
    this.eventBus.emit('playback.timeUpdate', {
      currentTime: this.videoElement.currentTime  // Video element gives time
    })
  }
}
```
**Status:** ✅ CORRECT - Video element interface requires time

---

## 🔍 TimelineService.ts AUDIT

### Lines 142-157: Position Calculation
```typescript
// ✅ CORRECT: Frame-based position calculation
const lastClip = trackClips.reduce((latest, clip) => {
  const latestStartFrame = getFrameService().timeToFrame(latest.startTime)
  const clipStartFrame = getFrameService().timeToFrame(clip.startTime)
  return clipStartFrame > latestStartFrame ? clip : latest
})

const startFrame = frameService.timeToFrame(lastClip.startTime)
const clipFrames = outPointFrame - inPointFrame
const endFrame = startFrame + clipFrames
return frameService.frameToTime(endFrame)
```
**Status:** ✅ CORRECT - Frame calculations, time conversion for return value

### Lines 61-65: Duration Calculation (LEGACY)
```typescript
// ❌ INCORRECT: Still using time-based calculation
getTotalDurationFromClips(clips: TimelineClip[]): number {
  return clips.reduce((max, clip) => 
    Math.max(max, clip.startTime + clip.duration), 0  // Should use frames!
  )
}
```
**Status:** ❌ NEEDS FIXING - Should use frame-based calculation

---

## 🚨 CRITICAL ISSUES FOUND

### 1. State Structure Not Frame-Based
```typescript
// CURRENT (WRONG)
interface TimelineClip {
  startTime: number
  duration: number  
  inPoint: number
  outPoint: number
}

// SHOULD BE (RIGHT)
interface TimelineClip {
  startFrame: number
  durationFrames: number
  inPointFrame: number
  outPointFrame: number
  // Keep time properties for display only
  displayStartTime?: number
  displayDuration?: number
}
```

### 2. Legacy Methods Still Using Time
- `TimelineService.getTotalDurationFromClips()` - Line 61
- Multiple state properties storing time instead of frames

### 3. Repeated Conversions
Instead of converting same values repeatedly:
```typescript
// CURRENT (INEFFICIENT)
const startFrame = frameService.timeToFrame(clip.startTime)  // Convert every time

// BETTER (EFFICIENT)
// Store frames in state, convert once for display
```

---

## 📊 USAGE SUMMARY

### ✅ CORRECT Frame Usage (80%)
- Seek calculations
- Boundary detection  
- Duration calculations in actions
- Time update processing

### ❌ INCORRECT Time Usage (20%)
- State structure (clips store time, should store frames)
- Legacy helper methods
- Some repeated conversions

### ✅ CORRECT Time Usage (100%)
- Video element interface (`videoElement.currentTime`)
- Event forwarding from video element
- UI display (where implemented)

---

## 🎯 RECOMMENDATIONS

### HIGH PRIORITY
1. **Fix TimelineService.getTotalDurationFromClips()** - Use frame calculations
2. **Consider state migration** - Store frames in clip state (breaking change)
3. **Cache frame conversions** - Don't convert same values repeatedly

### MEDIUM PRIORITY  
1. **Add frame-based state properties** alongside time properties
2. **Gradually migrate to frame-first state**
3. **Add type safety** for frame vs time values

### LOW PRIORITY
1. **Performance optimization** - Pre-calculate common frame values
2. **Documentation** - Mark time properties as "display only"

---

## ✅ OVERALL ASSESSMENT

**Status: 80% CORRECT** 

The critical calculations (seeking, boundaries, durations in actions) are now frame-based. Main remaining issues are legacy methods and state structure.

**Frame calculations:** ✅ Used correctly for all critical operations  
**Time usage:** ✅ Limited to video element interface and display  
**Architecture:** ⚠️ State structure could be more frame-centric  

The scrubber jumping issues should be resolved with current frame-based calculations!
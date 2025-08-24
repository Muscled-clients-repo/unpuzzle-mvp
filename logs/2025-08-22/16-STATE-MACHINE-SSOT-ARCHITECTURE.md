# STATE MACHINE AS SINGLE SOURCE OF TRUTH
**Simple Fix to All Our Problems + Multi-Track Support**

---

## 🎯 THE PROBLEM

Multiple systems are fighting for control:
- State machine thinks it's in charge
- Video element does its own thing
- Scrubber has its own position
- Integration layer tries to coordinate
- Everything is out of sync

---

## ✅ THE SOLUTION

**State Machine is the ONLY boss. Everything else just follows orders.**
**+ Thin helper layers for multi-track and trim features**

---

## 📦 STATE MACHINE OWNS EXACTLY 5 THINGS

```typescript
{
  currentFrame: number,      // Where we are (0, 1, 2, 3...)
  totalFrames: number,       // Total timeline length
  isPlaying: boolean,        // Are we playing or not
  tracks: Array<Track>,      // Multi-track timeline data
  showBlackPanel: boolean    // Show black when no clips
}
```

**That's it. Nothing else.**

---

## 🤖 HOW IT WORKS

### **When Playing:**
1. State machine has a timer (30fps)
2. Every 33ms: `currentFrame++`
3. **TrackCompositor.findActiveClip()** - Which clip at this frame?
4. **TrimCalculator.getVideoTime()** - Account for inPoint/outPoint
5. Tell video element: "Show frame X of clip Y at trimmed time Z"
6. Tell scrubber: "Move to position based on global timeline"
7. If no clips at frame → show black panel
8. When timeline done, stop

### **When User Seeks:**
1. User drags scrubber to position
2. Calculate frame from position: `frame = (percent / 100) * totalFrames`
3. Set `currentFrame = calculatedFrame`
4. **TrackCompositor.findActiveClip()** - Find clip at new frame
5. **TrimCalculator.getVideoTime()** - Calculate correct video time
6. Tell video element: "Show frame X of clip Y at trimmed time Z"
7. Done

### **When Recording:**
1. Start recording
2. When done, create new clip with startFrame/endFrame
3. Add clip to selected track
4. Update totalFrames
5. Done

---

## 🗑️ WHAT WE DELETE

### **1. VideoEditorSingleton.ts**
- 540 lines of coordination logic
- DELETE THE ENTIRE FILE
- State machine does this job now

### **2. All Video Event Listeners**
- No more `timeupdate` events
- No more `ended` events  
- No more `loadedmetadata` events
- Video element NEVER talks back

### **3. EventBus**
- Delete the entire event system
- Use XState events only (components can send events TO state machine)
- No more event forwarding between systems

### **4. Boundary Detection**
- Delete all boundary detection code
- State machine knows when clips end (it has the frame count)

### **5. Complex State**
- Delete `globalTimelinePosition`
- Delete `localClipTime`
- Delete `pendingClipTransition`
- Delete `isTransitioning`
- Delete all duplicate position tracking

---

## 🔨 WHAT WE SIMPLIFY

### **Track Data Structure:**
```typescript
interface Track {
  id: string
  priority: number  // Higher number wins when clips overlap
  clips: Array<{
    id: string
    startFrame: number    // Global timeline position (frame-based)
    endFrame: number      // Global timeline position (frame-based) 
    url: string
    inPoint: number       // Trim start (seconds)
    outPoint: number      // Trim end (seconds)
  }>
}
```

### **Pure Helper Functions (No State):**
```typescript
class TrackCompositor {
  findActiveClip(frame: number, tracks: Track[]): Clip | null {
    let activeClip = null
    let highestPriority = -1
    
    tracks.forEach(track => {
      const clip = track.clips.find(c => frame >= c.startFrame && frame < c.endFrame)
      if (clip && track.priority > highestPriority) {
        activeClip = clip
        highestPriority = track.priority
      }
    })
    
    return activeClip
  }
}

class TrimCalculator {
  getVideoTime(clip: Clip, localFrame: number): number {
    return clip.inPoint + (localFrame / 30)
  }
}
```

### **State Machine Timer (Enhanced):**
```typescript
setInterval(() => {
  if (!isPlaying) return
  
  currentFrame++
  
  // Use helper functions
  const activeClip = trackCompositor.findActiveClip(currentFrame, tracks)
  
  if (activeClip) {
    const localFrame = currentFrame - activeClip.startFrame
    const videoTime = trimCalculator.getVideoTime(activeClip, localFrame)
    
    videoElement.src = activeClip.url
    videoElement.currentTime = videoTime
    showVideo()
  } else {
    showBlackPanel()
  }
  
  // Scrubber unchanged - always smooth
  scrubber.style.left = ((currentFrame / totalFrames) * 100) + '%'
  
}, 33)  // 30fps
```

### **React components just display:**
```typescript
function Scrubber() {
  const position = (currentFrame / totalFrames) * 100
  return <div style={{left: position + '%'}} />
}
```

---

## 🚫 RULES

### **NEVER:**
- Check video element's currentTime
- Listen to video events
- Calculate position from video state
- Have multiple position values
- Let services change state

### **ALWAYS:**
- State machine decides everything
- Services just execute
- Components just display
- One source of truth
- Simple and direct

---

## 🎯 RESULT

### **What this fixes:**
- ✅ No more scrubber jumping (one position source)
- ✅ No more multiple play presses (state machine controls play)
- ✅ No more desync (nothing to sync)
- ✅ No more race conditions (one controller)
- ✅ No more boundary issues (state machine knows boundaries)
- ✅ **Multi-track composition** (track priority system)
- ✅ **Trim support** (inPoint/outPoint handling)
- ✅ **Gap handling** (black panels when no clips)
- ✅ **Frame-accurate editing** (no floating point errors)

### **Code reduction:**
- Remove 540 lines (VideoEditorSingleton)
- Remove 200 lines (EventBus)
- Remove 500 lines (coordination logic)
- **Total: ~1,200 lines deleted**

### **What remains:**
- Simple state machine timer (150 lines)
- TrackCompositor helper (50 lines)
- TrimCalculator helper (30 lines)
- Simple services (50 lines)
- Simple components (existing)
- **Total: ~280 lines of core logic**

---

## 🚀 INCREMENTAL IMPLEMENTATION (Single Track Only)

### **MANDATORY CHECKPOINT SYSTEM:**
- **STOP AFTER EVERY 2 PHASES** 
- **CANNOT PROCEED WITHOUT USER MANUAL CONFIRMATION**
- **User must test and approve before continuing**

---

## 📋 PHASE-BY-PHASE IMPLEMENTATION

### **Phase 1: Basic Frame Counter (15 mins)**
```typescript
// Just prove the timer concept works
setInterval(() => {
  currentFrame++
  console.log('Frame:', currentFrame)
}, 33)
```
**Test**: Does frame counter advance smoothly?
**Success Criteria**: Console logs show steady frame progression

### **Phase 2: Scrubber Sync (15 mins)**
```typescript
// Connect frame to scrubber position
const position = (currentFrame / totalFrames) * 100
scrubber.style.left = position + '%'
```
**Test**: Does scrubber move smoothly without jumping?
**Success Criteria**: Scrubber moves continuously across timeline

---
**🛑 CHECKPOINT 1: MUST STOP HERE FOR USER CONFIRMATION**
**User must manually test Phases 1-2 and confirm working before Phase 3-4**

---

### **Phase 3: Single Clip Playback (30 mins)**
```typescript
// Play one clip based on frames
if (currentFrame < clip.durationFrames) {
  videoElement.currentTime = currentFrame / 30
} else {
  isPlaying = false  // Stop at end
}
```
**Test**: Does single clip play smoothly with synced scrubber?
**Success Criteria**: Video plays, scrubber stays in sync, stops at end

### **Phase 4: Multiple Clips Sequence (30 mins)**
```typescript
// Find which clip should play at current frame
const clip = clips.find(c => currentFrame >= c.startFrame && currentFrame < c.endFrame)
if (clip) {
  const localFrame = currentFrame - clip.startFrame
  videoElement.src = clip.url
  videoElement.currentTime = localFrame / 30
}
```
**Test**: Do clips transition smoothly without pausing?
**Success Criteria**: Clips play in sequence, no multiple play button presses needed

---
**🛑 CHECKPOINT 2: MUST STOP HERE FOR USER CONFIRMATION**
**User must manually test Phases 3-4 and confirm working before Phase 5-6**

---

### **Phase 5: User Scrubbing (15 mins)**
```typescript
// When user drags scrubber
onScrubberDrag((percent) => {
  currentFrame = Math.round((percent / 100) * totalFrames)
  // Timer logic handles the rest
})
```
**Test**: Can user seek to any position smoothly?
**Success Criteria**: Dragging scrubber jumps to correct video position

### **Phase 6: Recording Integration (30 mins)**
```typescript
// When recording finishes
onRecordingComplete((blob, duration) => {
  clips.push({
    url: URL.createObjectURL(blob),
    startFrame: totalFrames,
    endFrame: totalFrames + (duration * 30)
  })
  totalFrames += (duration * 30)
})
```
**Test**: Can record new clips and play them in sequence?
**Success Criteria**: New recordings automatically play after existing clips

---
**🛑 CHECKPOINT 3: MUST STOP HERE FOR USER CONFIRMATION**
**User must manually test Phases 5-6 and confirm working before Phase 7**

---

### **Phase 7: Delete VideoEditorSingleton (15 mins)**
```typescript
// Remove the 540-line coordination layer
// Keep only: State Machine + Services
```
**Test**: Does everything still work without integration layer?
**Success Criteria**: All previous functionality works without VideoEditorSingleton

---

## ⚠️ IMPLEMENTATION RULES

### **MANDATORY STOPS:**
1. **After Phase 2** - User confirms basic timer + scrubber sync
2. **After Phase 4** - User confirms video playback + transitions  
3. **After Phase 6** - User confirms scrubbing + recording
4. **After Phase 7** - User confirms cleanup successful

### **IF ANY PHASE FAILS:**
- STOP immediately
- Fix the specific phase issue
- Re-test that phase only
- Do NOT proceed to next phase until current works

### **SIMPLIFIED STATE CONTEXT:**
```typescript
{
  currentFrame: number,     // THE position (0, 1, 2, 3...)
  totalFrames: number,      // Total timeline length  
  isPlaying: boolean,       // Play/pause state
  clips: Array<{            // Simple clip list (no tracks yet)
    id: string,
    url: string,
    startFrame: number,     // Global position
    endFrame: number,       // Global position
    duration: number        // For convenience
  }>
}
```

---

## ✨ THE END

**One boss + Two pure helpers. Simple rules. No contradictions. All features supported.**
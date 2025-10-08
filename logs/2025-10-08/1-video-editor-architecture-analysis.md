# Video Editor Architecture Analysis

**Date:** October 8, 2025
**Status:** Critical Architecture Review
**Problem:** Preview/Timeline sync broken, dual video display issues, trim transitions failing

---

## Current System Issues

### Observable Symptoms
1. **Preview doesn't sync with timeline** - Clips play at wrong times or show wrong frames
2. **Dual video display bug** - Two identical clips shown side-by-side in preview panel
3. **Trim transitions fail** - Playing from gap into trimmed clip causes freezing
4. **Seek thrashing** - Multiple concurrent seek operations block each other
5. **Container size issues** - Preview panel randomly expands to show multiple videos

### Root Causes

#### 1. **Misuse of HTML5 Video Element**
**Problem:** Using `<video>` elements as if they're frame buffers
**Reality:** HTML5 video is designed for linear playback, not frame-accurate editing

**Why it fails:**
- Setting `currentTime` triggers async seek operation (50-200ms latency)
- No way to force synchronous frame access
- Browser decoding pipeline not designed for random access
- Playback loop runs at 60fps (16ms), seeks take 150ms → immediate desync

#### 2. **Dual Video Architecture Misconception**
**Problem:** Using two `<video>` elements for "seamless" transitions
**Reality:** This doesn't solve the async seek problem, just moves it

**Why it fails:**
- Buffer video still needs to seek (async)
- Switching between videos doesn't eliminate decode time
- Creates additional complexity: visibility toggling, src management, memory overhead
- **The CSS visibility swap bug:** Both videos render simultaneously when not properly hidden

#### 3. **Virtual Timeline Mismatch**
**Problem:** Timeline operates in "virtual frames" (timeline position) while video operates in "source frames" (video currentTime)
**Reality:** Two different time domains with no proper synchronization layer

**Why it fails:**
```
Timeline: [Clip A: 0-100] [GAP] [Clip B (trimmed): 150-200]
          Timeline frames: 0-100, 150-200

Video A:  Source frames: 0-100 (full video)
Video B:  Source frames: 30-80 (trimmed section)

Mapping: Timeline frame 150 → Video B source frame 30
Problem: Requires constant frame → time conversion with trim offsets
         Conversion happens in playback loop (every 16ms)
         One async seek blocks entire conversion pipeline
```

#### 4. **Seek Throttling Bandaid**
**Problem:** Added flag to prevent concurrent seeks
**Reality:** This prevents thrashing but causes dropped frames

**Why it's insufficient:**
- Blocks playback loop while seek completes
- Playhead advances but video freezes
- User sees "lag" instead of "thrash"
- Doesn't address root cause: async seeking in sync playback loop

---

## How Professional Video Editors Work

### Industry Standard Architecture: **Decode-Once, Playback-Many**

#### Principle 1: **Separate Decode from Playback**
**Concept:** Video decoding and frame rendering are completely separate operations

```
┌─────────────────────────────────────────────────┐
│           DECODE LAYER (Background)             │
│  - Decode video files into raw frame buffers   │
│  - Store frames in memory/GPU/cache             │
│  - Happens BEFORE playback starts               │
│  - Asynchronous, interruptible                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│         PLAYBACK LAYER (Synchronous)            │
│  - Read pre-decoded frames from buffer          │
│  - Direct memory access (no I/O)                │
│  - Happens during playback                      │
│  - Synchronous, real-time                       │
└─────────────────────────────────────────────────┘
```

**Key insight:** Seeking is instantaneous because frames are already decoded in memory.

#### Principle 2: **Frame Buffer Cache**
**Concept:** Maintain a sliding window of decoded frames around playhead

```
Video Timeline: [------|====PLAYHEAD====|------]
                       ↑                ↑
                   Cache Start      Cache End
                   (Current - 2s)   (Current + 5s)

Memory:  [Frame N-60] [Frame N-59] ... [Frame N] ... [Frame N+150]
         ↑                                             ↑
    Already played                          Pre-decoded for smooth playback
    (can discard)                           (ready to show instantly)
```

**Buffer strategy:**
- Pre-decode 5 seconds ahead of playhead (predictive)
- Keep 2 seconds behind playhead (for scrubbing back)
- Discard frames outside window (memory management)
- Continuously update window as playhead moves

#### Principle 3: **Composite Rendering Pipeline**
**Concept:** Don't play multiple videos; render one composite frame at a time

```
Timeline: [Clip A] [Clip B] [Clip C]

Playback at timeline frame 150 (inside Clip B):

Step 1: Determine which clip contains frame 150
        → Clip B (timeline frames 100-200)

Step 2: Calculate source frame in Clip B
        → Timeline frame 150 = 50 frames into Clip B
        → Clip B starts at source frame 30 (trim point)
        → Need source frame: 30 + 50 = 80

Step 3: Fetch decoded frame 80 from Clip B's frame buffer
        → Direct memory access (instant)
        → No video element seeking required

Step 4: Render frame to canvas
        → Single composite output
        → No "two videos side by side" possible
```

#### Principle 4: **Stateless Frame Lookup**
**Concept:** Every frame render is independent; no state carried between frames

**Traditional approach (stateful):**
```javascript
// WRONG: Carries state between frames
currentSegment = findSegment(frame)
if (currentSegment.id !== lastSegment.id) {
    video.src = currentSegment.url  // State change
    video.currentTime = targetTime   // Async operation
}
```

**Professional approach (stateless):**
```javascript
// RIGHT: Each frame is independent
function renderFrame(timelineFrame) {
    const clip = getClipAtFrame(timelineFrame)
    const sourceFrame = calculateSourceFrame(clip, timelineFrame)
    const decodedFrame = frameCache.get(clip.id, sourceFrame)
    canvas.drawImage(decodedFrame)  // Instant
}
```

**Why stateless wins:**
- No async operations in playback path
- Scrubbing forward/backward identical cost
- Trim edits don't break anything (just math changes)
- No "transition" concept needed

---

## Technologies Required for Proper Implementation

### Option 1: **WebCodecs API** (Modern, Recommended)
**What it is:** Browser API for direct video decode/encode access
**Browser support:** Chrome 94+, Edge 94+, Safari 16.4+

**Key capabilities:**
- `VideoDecoder` - Decode video frames to ImageBitmap
- Direct access to raw decoded frames
- Frame-accurate seeking
- GPU-accelerated
- Works with MP4, WebM, etc.

**Architecture:**
```
MP4 File → VideoDecoder → ImageBitmap[] → Canvas
                          ↑
                     Frame Buffer Cache
```

**Example flow:**
```javascript
// 1. Decode phase (happens once per clip)
const decoder = new VideoDecoder({
  output: (frame) => {
    frameCache.store(clipId, frame.timestamp, frame)
  },
  error: (e) => console.error(e)
})

// 2. Playback phase (happens every frame)
function render(timelineFrame) {
  const frame = frameCache.get(clipId, sourceFrame)
  canvas.drawImage(frame)  // Instant
  frame.close()  // Free memory
}
```

### Option 2: **FFmpeg.wasm** (Most Powerful)
**What it is:** WebAssembly port of FFmpeg video processing library
**Browser support:** All modern browsers

**Key capabilities:**
- Extract individual frames as images
- Pre-render timeline segments
- Handle any video format
- Apply effects, transitions, filters
- Generate final export video

**Architecture:**
```
MP4 File → FFmpeg → PNG Frames → Canvas
                    ↑
              Frame Sequence Cache
```

**Tradeoffs:**
- Large bundle size (25MB+)
- Initial load time
- More control, more complexity

### Option 3: **Canvas Frame-by-Frame** (Simplest)
**What it is:** Use video element ONLY for decoding, render to canvas
**Browser support:** Universal

**Key capabilities:**
- Draw video frames to canvas at specific times
- Composite multiple sources
- Single preview output

**Architecture:**
```
Video Element → Canvas → Display
(hidden)        (visible)
```

**Limitations:**
- Still relies on async seeking
- Mitigates but doesn't eliminate sync issues
- Works for small projects, breaks at scale

---

## Architectural Principles for Robust Solution

### Principle 1: **Separation of Concerns**
```
┌────────────────────────────────────────────────────┐
│              TIMELINE LAYER                        │
│  - Clip metadata (start, duration, trim points)   │
│  - Track management                                │
│  - Edit operations (split, trim, move)            │
│  - Undo/redo history                               │
│  - State management (Zustand/TanStack)             │
└────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────┐
│           PLAYBACK ENGINE                          │
│  - Frame cache management                          │
│  - Decode scheduling                               │
│  - Playhead position tracking                      │
│  - Frame lookup and retrieval                      │
└────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────┐
│             RENDER LAYER                           │
│  - Canvas rendering                                │
│  - Composite frame assembly                        │
│  - Effects application                             │
│  - Display output                                  │
└────────────────────────────────────────────────────┘
```

### Principle 2: **Timeline is Source of Truth**
- Timeline data structure defines what plays when
- Playback engine reads timeline data (never modifies it)
- Edit operations update timeline immediately
- Preview reflects timeline state (not video state)

### Principle 3: **Frame-Centric Model**
- Everything operates in frames (not seconds)
- Timeline frames: 0, 1, 2, 3...
- Source frames: specific frame index in source video
- FPS is constant (30fps default)
- Frame → Time conversion only happens at render boundaries

### Principle 4: **Predictive Pre-Decoding**
- Decode frames ahead of playhead
- Maintain sliding window cache
- Background worker for decode (doesn't block UI)
- Cache eviction policy (LRU, memory-based)

### Principle 5: **Synchronous Playback Loop**
```javascript
// Playback loop must NEVER have async operations
function playbackLoop(timestamp) {
  const timelineFrame = calculateCurrentFrame(timestamp)
  const frame = getDecodedFrame(timelineFrame)  // MUST be instant
  renderToCanvas(frame)                          // MUST be instant
  requestAnimationFrame(playbackLoop)
}
```

### Principle 6: **Fail-Fast Rendering**
- If frame not in cache: show last good frame + loading indicator
- Never block playback waiting for decode
- Let playhead continue moving
- Catch up when frame becomes available

---

## Comparison: Current vs. Proper Architecture

### Current (Broken)
```
Timeline Clip → Video Element → Async Seek → Display
                ↑
            State Management
            (currentSegment, switching logic)
```

**Playback path:**
1. Playback loop calculates timeline frame (16ms intervals)
2. Find which clip contains frame
3. Calculate source time in clip
4. Set video.currentTime (triggers 150ms async seek)
5. Wait for seeked event
6. Play video
7. **Problem:** Steps 4-6 take longer than 16ms → lag

**Trim operation:**
1. Update clip.sourceInFrame, clip.sourceOutFrame
2. Timeline recalculates clip boundaries
3. Next playback loop sees new boundaries
4. Tries to seek video to new trim point
5. **Problem:** Async seek in playback loop → freeze

### Proper (Professional)
```
Timeline Clips → Frame Buffer Cache → Canvas → Display
                      ↑
                 Background Decoder
                 (pre-populates cache)
```

**Playback path:**
1. Playback loop calculates timeline frame (16ms intervals)
2. Find which clip contains frame
3. Calculate source frame in clip
4. Lookup decoded frame in cache (instant memory access)
5. Draw frame to canvas
6. **Solution:** All operations synchronous and sub-millisecond

**Trim operation:**
1. Update clip.sourceInFrame, clip.sourceOutFrame
2. Timeline recalculates clip boundaries
3. Frame cache invalidates affected region
4. Background decoder re-decodes trim range
5. Next playback loop uses new frames from cache
6. **Solution:** Trim is just metadata change, playback unaffected

---

## Why This Matters for Your Use Case

### Your Requirements
1. **Record screen/camera** → Create clips
2. **Import from media library** → Add existing videos to timeline
3. **Trim clips** → Adjust in/out points
4. **Arrange on timeline** → Multi-track editing
5. **Preview in real-time** → Smooth playback of edited timeline
6. **Export final video** → Render to single file

### What You Need
- **Clips from different sources** (recordings, uploads) playing seamlessly
- **Trimmed sections** playing without gaps or freezes
- **Frame-accurate preview** that matches timeline exactly
- **Responsive editing** - trim/move operations feel instant

### Why Current Architecture Fails
- Using video elements for playback (async seeking)
- Dual video "trick" doesn't solve decode latency
- Seek throttling masks problem but doesn't fix it
- No frame buffer = every playback loop hits I/O

---

## Decision Framework

### Questions to Answer

#### 1. **Scale Requirements**
- Max clips per timeline? (5? 20? 100?)
- Max timeline duration? (1 min? 10 min? 1 hour?)
- Concurrent users? (1 user editing? Multiple?)

#### 2. **Performance Requirements**
- Must playback be 60fps smooth? Or acceptable with occasional stutters?
- Is real-time preview critical? Or can we show "rendering preview..."?
- Scrubbing latency tolerance? (Instant? 100ms? 500ms?)

#### 3. **Feature Priorities**
- Is basic playback enough? Or need effects, transitions, filters?
- Export quality matters more than preview quality?
- Mobile support needed? (WebCodecs not on iOS)

#### 4. **Development Resources**
- Time available? (Days? Weeks?)
- Team size? (Solo? Team?)
- Maintenance burden acceptable?

### Recommended Path Based on Answers

**If: Small projects (5-10 clips), MVP timeline, solo dev**
→ **Use Canvas + Hidden Video (Option 3)**
- Decode phase: Load videos, wait for canplaythrough
- Playback: Draw current video frame to canvas at requestAnimationFrame rate
- Accept some stutter on transitions
- Simple, works in all browsers

**If: Medium projects (20-50 clips), smooth preview critical, modern browsers**
→ **Use WebCodecs API (Option 1)**
- Decode phase: Extract frames to ImageBitmap cache
- Playback: Draw cached frames to canvas
- Smooth, frame-accurate, performant
- Requires Chrome/Edge/Safari 16.4+

**If: Large projects (100+ clips), professional features, any browser**
→ **Use FFmpeg.wasm (Option 2)**
- Decode phase: Extract all frames to PNG/WebP
- Playback: Display frame sequence
- Most control, heaviest implementation
- Universal browser support

---

## Next Steps

### Before Writing Any Code

1. **Define success metrics**
   - What FPS must preview maintain? (30fps? 60fps?)
   - What latency is acceptable for scrubbing? (50ms? 200ms?)
   - How many concurrent clips must support?

2. **Choose architecture path**
   - Based on scale, performance, browser support needs
   - Document decision and rationale

3. **Build proof of concept**
   - Single clip playback with chosen technology
   - Verify it meets performance requirements
   - Test trim operations, scrubbing, multi-clip

4. **Design frame cache**
   - Memory budget (100MB? 500MB? 1GB?)
   - Cache eviction policy
   - Background decode worker

5. **Implement playback engine**
   - Frame lookup interface
   - Timeline → Frame mapping
   - Synchronous render loop

6. **Integrate with timeline**
   - Connect edit operations to cache invalidation
   - Preview reflects timeline state
   - Test complex scenarios (trim during playback, rapid scrubbing)

### Red Flags to Avoid

❌ **Don't:** Add more complexity to existing video element approach
✅ **Do:** Choose one of three proven paths above

❌ **Don't:** Try to make async seeking synchronous
✅ **Do:** Decode frames upfront, make playback synchronous

❌ **Don't:** Use multiple video elements for smooth transitions
✅ **Do:** Use single canvas with frame buffer cache

❌ **Don't:** Implement custom seek throttling / queueing
✅ **Do:** Eliminate seeking from playback loop entirely

---

## Conclusion

The current architecture is fundamentally incompatible with professional video editing requirements. The issues you're experiencing (preview desync, dual video bugs, trim freezes) are symptoms of trying to use HTML5 video elements as frame buffers.

**Core Problem:** Mixing async operations (video seeking) with sync requirements (60fps playback loop)

**Solution:** Adopt decode-once, playback-many architecture used by all professional video editors

**Recommendation:** Start with WebCodecs API for modern browser support, fall back to Canvas approach for simplicity if needed

**Critical Success Factor:** Make playback loop 100% synchronous by pre-decoding frames into memory cache

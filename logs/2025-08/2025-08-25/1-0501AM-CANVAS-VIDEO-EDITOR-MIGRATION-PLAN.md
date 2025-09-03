# Canvas-Based Video Editor Migration Plan
**Date:** 2025-08-25  
**Time:** 05:01 AM EST  
**Purpose:** Migrate from HTML5 video seeking to Canvas-based frame caching for smooth trim operations  
**Problem:** HTML5 video cannot seek backward fast enough during edge dragging, causing black screens

## Executive Summary

After 5+ failed attempts to fix the black screen issue when extending clip edges, we've identified that HTML5 video's seek limitations are insurmountable. Professional editors like CapCut and Canva use Canvas with frame caching, not direct video manipulation. This plan outlines migrating our video editor to a Canvas-based architecture.

## Current Architecture vs Canvas Architecture

### Current (HTML5 Video Direct Manipulation)
```
User Drags Edge → Update Clip Boundaries → Update Segments → Seek Video → BLACK SCREEN → Display Frame
                     ↑                                           ↑
                     └─────── 60+ times per second ─────────────┘
```

### Proposed (Canvas Frame Cache)
```
Video Load → Extract Key Frames → Store in Memory
                                      ↓
User Drags Edge → Show Cached Frame → Instant Display
                      ↓
          Mouse Release → Single Video Seek
```

## Technical Implementation Plan

### Phase 1: Frame Extraction System
**New Files:**
- `/src/lib/video-editor/FrameExtractor.ts` - Extract frames from video
- `/src/lib/video-editor/FrameCache.ts` - Manage frame storage

**Key Components:**
```typescript
class FrameExtractor {
  // Extract frames at intervals (every 0.5s or 15 frames)
  async extractFrames(videoUrl: string): Promise<FrameData[]> {
    // Create offscreen video element
    // Seek to intervals and extract to canvas
    // Return array of {frame, imageData} pairs
  }
}

class FrameCache {
  private cache: Map<string, Map<number, ImageData>>
  
  // Store frames for a clip
  setFrames(clipId: string, frames: FrameData[])
  
  // Get nearest frame for position
  getNearestFrame(clipId: string, frame: number): ImageData
}
```

### Phase 2: Canvas Preview Component
**Modified Files:**
- `/src/components/video-studio/VideoStudio.tsx` - Add canvas element
- `/src/components/video-studio/CanvasPreview.tsx` - New component

**Canvas Preview During Trim:**
```typescript
function CanvasPreview({ 
  clipId, 
  frameNumber,
  frameCache 
}: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>()
  
  useEffect(() => {
    const frame = frameCache.getNearestFrame(clipId, frameNumber)
    const ctx = canvasRef.current.getContext('2d')
    ctx.putImageData(frame, 0, 0)
  }, [frameNumber])
  
  return <canvas ref={canvasRef} />
}
```

### Phase 3: Dual-Mode Display System
**Strategy:** Keep video for playback, use canvas for editing

1. **Playback Mode:** Use existing VirtualTimelineEngine with video element
2. **Edit Mode:** Show canvas with cached frames during trimming
3. **Transition:** Seamless switch between modes

## Impact on Existing Codebase

### What Stays the Same
✅ **VirtualTimelineEngine** - Still handles playback (no changes needed)  
✅ **useVideoEditor hook** - Core logic remains, add frame cache management  
✅ **Timeline UI components** - Visual components unchanged  
✅ **Clip data structure** - Same clip properties  
✅ **History/Undo system** - Works identically  

### What Changes
⚠️ **useVideoEditor** - Add frame extraction on clip creation
```typescript
const handleClipCreated = useCallback(async (clip: Clip) => {
  // NEW: Extract frames when clip is created
  const frames = await frameExtractor.extractFrames(clip.url)
  frameCache.setFrames(clip.id, frames)
  
  // Existing code continues...
  setClips(prev => [...prev, clip])
}, [])
```

⚠️ **Preview Display** - Conditional rendering
```typescript
// In VideoStudio.tsx
{isDraggingTrim ? (
  <CanvasPreview 
    clipId={draggedClipId}
    frameNumber={scrubberFrame}
    frameCache={frameCache}
  />
) : (
  <video ref={editor.videoRef} />
)}
```

⚠️ **Memory Management** - New cleanup requirements
```typescript
// Clean up frame cache when clips deleted
const deleteClip = useCallback((clipId: string) => {
  frameCache.removeFrames(clipId) // NEW
  URL.revokeObjectURL(clip.url)   // Existing
})
```

### What We Risk Breaking
❌ **Performance** - Initial load slower (frame extraction time)  
❌ **Memory usage** - ~2-5MB per clip for frame cache  
❌ **Browser compatibility** - Need to test canvas performance  

## Migration Strategy

### Step 1: Parallel Implementation (Safe)
1. Keep existing video-based system working
2. Build frame extraction in parallel
3. Add feature flag to toggle between systems
4. Test thoroughly before switching

### Step 2: Gradual Rollout
1. **Week 1:** Implement frame extraction (background process)
2. **Week 2:** Add canvas preview component
3. **Week 3:** Wire up trim operations to use canvas
4. **Week 4:** Optimize and handle edge cases

### Step 3: Performance Optimization
- Lazy load frames (extract on-demand)
- Use WebWorkers for extraction (non-blocking)
- Implement frame pooling (reuse ImageData objects)
- Add progressive loading (low-res first, high-res later)

## Memory & Performance Considerations

### Memory Usage Calculation
```
Per Frame: 1920 × 1080 × 4 bytes = ~8MB (full res)
Per Frame: 320 × 180 × 4 bytes = ~230KB (thumbnail)
Per Clip (30 frames): ~7MB (thumbnails)
10 Clips: ~70MB total
```

### Optimization Strategies
1. **Resolution scaling** - Use lower resolution for scrubbing
2. **Selective caching** - Only cache visible timeline portion
3. **LRU eviction** - Remove least recently used frames
4. **Compression** - Store as JPEG blobs instead of raw ImageData

## Fallback Strategy

If Canvas approach fails or is too complex:

### Alternative 1: Throttled Updates
- Only update video every 100ms during drag
- Much simpler but less smooth

### Alternative 2: Two Video Elements
- One for current position, one for preview
- Seek preview video while keeping main video stable

### Alternative 3: Server-Side Frames
- Pre-generate frames on server
- Fetch during edit session
- Higher bandwidth but lower client CPU

## Success Metrics

✅ **No black screens** when extending clips  
✅ **Smooth scrubbing** in both directions  
✅ **Memory usage** under 100MB for 10 clips  
✅ **Frame extraction** under 2s per minute of video  
✅ **No regression** in playback performance  

## Risk Assessment

### High Risk
- Frame extraction might be too slow for long videos
- Memory usage could exceed mobile browser limits
- Canvas performance on low-end devices

### Medium Risk
- Sync issues between canvas preview and actual video
- Browser compatibility with OffscreenCanvas
- Increased complexity for developers

### Low Risk
- Visual quality difference between canvas and video
- Edge cases with different video codecs

## Conclusion

Moving to Canvas-based frame caching is a significant architectural change but aligns with industry standards (CapCut, Canva, DaVinci Resolve Web). The migration can be done incrementally without breaking existing functionality.

**Key Insight:** We've been trying to make HTML5 video do something it's not designed for. Canvas + frame caching is the correct approach for professional video editing on the web.

## Next Steps

1. ✅ Get approval for this approach
2. ⬜ Create proof of concept with single clip
3. ⬜ Benchmark frame extraction performance
4. ⬜ Implement frame cache system
5. ⬜ Integrate with existing trim operations
6. ⬜ Optimize and handle edge cases

---

**Note:** This is a major architectural decision. The current Virtual Timeline architecture is solid for playback but needs Canvas augmentation for smooth editing operations. This hybrid approach keeps the best of both worlds.
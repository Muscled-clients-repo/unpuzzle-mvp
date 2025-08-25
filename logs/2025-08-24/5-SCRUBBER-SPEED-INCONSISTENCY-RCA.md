# Scrubber Speed Inconsistency - Deep Root Cause Analysis
**Date:** 2025-08-24
**Issue:** Scrubber slows down and speeds up around second markers during playback

## Issue Description
The scrubber movement is not consistent - it appears to slow down near second markers (0:01, 0:02, etc.) and speeds up in between them. This creates a jerky, non-linear playback experience.

## Root Cause Analysis

### 1. Frame Calculation Issue
**Location:** `VirtualTimelineEngine.ts:71`
```typescript
const framesElapsed = (deltaTime * this.fps) / 1000
```
**Analysis:** This calculation is correct, but floating-point precision may accumulate errors.

### 2. Transform vs Left Position
**Location:** `SimpleTimeline.tsx:334`
```typescript
transform: `translateX(${(currentFrame / FPS) * pixelsPerSecond + 70}px) translateZ(0)`
```
**Issue:** Using transform instead of left position, but calculation may cause sub-pixel rendering issues.

### 3. Pixel Boundary Snapping
**Root Cause Identified:** The browser rounds pixel values differently at certain positions:
- At 50px per second zoom, 1 second = 50px
- Frame 30 (1 second) = exactly 50px
- Frame 15 (0.5 seconds) = 25px
- Frame 29.5 = 49.166...px (gets rounded)

The issue is that fractional pixel positions get rounded by the browser, causing visual stuttering.

## Simple Architecture Principles Audit

### ✅ Following Principles:
1. **Single Source of Truth** - `currentFrame` in VirtualTimelineEngine
2. **Frame-based calculations** - Everything uses frames as base unit
3. **No complex state management** - Simple React hooks
4. **Direct event handling** - No abstraction layers

### ❌ Violations Found:

#### 1. Unnecessary Async in syncVideoToTimeline
**Location:** `VirtualTimelineEngine.ts:98`
```typescript
private async syncVideoToTimeline() {
```
**Issue:** Function is marked async but never uses await. This violates "no unnecessary complexity".

#### 2. Mixed State Management
**Location:** `useVideoEditor.ts:30-31`
```typescript
onFrameUpdate: (frame) => setCurrentFrame(frame),
onPlayStateChange: (playing) => setIsPlaying(playing)
```
**Issue:** State is managed both in VirtualTimelineEngine AND React component, creating potential sync issues.

#### 3. Cleanup Issue
**Location:** `useVideoEditor.ts:225`
```typescript
clips.forEach(clip => URL.revokeObjectURL(clip.url))
```
**Issue:** Accessing `clips` from closure, not from current state. Potential memory leak.

## The Real Problem: Frame-to-Pixel Conversion

The core issue is in the pixel position calculation:
```typescript
(currentFrame / FPS) * pixelsPerSecond + 70
```

When `currentFrame` is fractional (e.g., 29.5):
- Position = (29.5 / 30) * 50 + 70 = 119.166...px
- Browser rounds to 119px or 120px inconsistently

## Solution Options

### Option 1: Smooth Interpolation (Recommended)
Use CSS animation with linear timing to smooth between frame positions:
```css
transition: transform 16.67ms linear; /* 1 frame at 60fps */
```

### Option 2: Higher Precision Positioning
Use subpixel positioning with will-change:
```typescript
transform: `translate3d(${position}px, 0, 0)`
willChange: 'transform'
```

### Option 3: Frame Snapping
Round to nearest frame for consistent positioning:
```typescript
const snappedFrame = Math.round(currentFrame * 2) / 2 // Snap to half-frames
```

## Recommended Fix

1. Remove async from syncVideoToTimeline
2. Use CSS transitions for smooth movement
3. Keep fractional frames but use translate3d for GPU acceleration
4. Consider using CSS custom properties for smoother updates

## Performance Impact

Current implementation triggers:
- Layout recalculation on every frame
- Potential paint operations
- Style recalculation

Optimized approach would:
- Use transform-only changes (no layout)
- GPU acceleration via translate3d
- Batch updates via requestAnimationFrame (already doing)

## Conclusion

The issue stems from browser pixel rounding combined with fractional frame positions. While we're following most Simple Architecture principles, the implementation needs optimization for smooth visual playback. The solution should maintain simplicity while adding minimal CSS for smoothing.
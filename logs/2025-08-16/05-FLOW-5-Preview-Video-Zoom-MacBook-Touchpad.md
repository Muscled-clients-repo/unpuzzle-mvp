# Flow 5: Preview Video Zoom with MacBook Touchpad
## Cursor-Centered Zoom Implementation

> **Implementation Status**: READY FOR DEVELOPMENT
> **Prerequisites**: Flows 1-4 must be completed and user-approved
> **User Testing Required**: MANDATORY after implementation
> **Critical Rule**: Preview zoom ALWAYS centers around CURSOR position (DIFFERENT from timeline)

---

## 🎯 Flow Overview

This flow implements professional-grade pinch-to-zoom functionality for the video preview using MacBook touchpad gestures. The zoom is ALWAYS centered around the cursor position, which is the opposite of timeline zoom behavior.

### Core Requirements
- **Cursor-Centered Zoom**: All zoom operations center around cursor position
- **Image Quality Preservation**: Maintain video quality at all zoom levels
- **Pan Functionality**: Click and drag to pan when zoomed in
- **Playback Continuity**: Video continues playing during zoom
- **Overview Indicator**: Show current view area when zoomed

---

## 📋 Initial State

**System State Before User Interaction:**
- Video preview window showing current frame
- Video displayed at default size (100% or fit-to-window)
- Mouse cursor positioned over preview area
- Playback state (playing or paused) maintained
- No zoom or pan applied

**State Machine Context:**
```typescript
interface PreviewZoomState {
  previewState: {
    zoomLevel: number           // Current zoom level (1.0 = 100%)
    minZoom: number            // Minimum zoom (fit to window)
    maxZoom: number            // Maximum zoom (pixel-level detail)
    panX: number               // Horizontal pan offset
    panY: number               // Vertical pan offset
    cursorX: number            // Cursor X position (zoom anchor)
    cursorY: number            // Cursor Y position (zoom anchor)
  }
  videoState: {
    isPlaying: boolean
    currentFrame: number
    videoWidth: number
    videoHeight: number
    aspectRatio: number
  }
  gestureState: {
    isZooming: boolean
    isPanning: boolean
    startZoomLevel: number
    lastGestureScale: number
  }
  uiState: {
    showScrollbars: boolean
    showOverview: boolean
    cursorOverPreview: boolean
  }
}
```

---

## 🔄 User Interaction Flow

### 1. Gesture Detection
**System Behavior:**
- User places two fingers on MacBook touchpad
- Cursor must be hovering over preview video area
- System detects pinch gesture for video zoom
- Gesture state activated for zoom operation

**Implementation Requirements:**
```typescript
class PreviewZoomController {
  private readonly ZOOM_ANCHOR_MODE = 'cursor' // DIFFERENT from timeline
  
  handleWheelEvent(event: WheelEvent) {
    // Check if cursor is over preview
    if (!this.isCursorOverPreview(event)) {
      return // Ignore gesture if not over preview
    }
    
    // Detect pinch gesture (MacBook touchpad)
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      
      // CRITICAL: Get cursor position as anchor point
      const cursorX = event.clientX
      const cursorY = event.clientY
      
      // Convert to video coordinates
      const videoPoint = this.screenToVideoCoordinates(cursorX, cursorY)
      
      // Calculate zoom delta
      const zoomDelta = -event.deltaY * 0.01
      
      // Execute zoom around cursor
      this.executePreviewZoom(zoomDelta, videoPoint.x, videoPoint.y)
    }
  }
}
```

### 2. Zoom In (Pinch Out)
**System Behavior:**
- User spreads fingers apart on touchpad
- Video preview scales up progressively
- Image quality maintained during zoom
- **Zoom centers around cursor position in preview**
- Scrollbars appear if video exceeds preview bounds

**Nuclear-Grade Implementation:**
```typescript
executeZoomIn(zoomDelta: number, cursorX: number, cursorY: number) {
  // CRITICAL: Use cursor as anchor point (different from timeline)
  const currentZoom = this.state.previewState.zoomLevel
  
  // Calculate new zoom level
  const newZoom = Math.min(
    this.state.previewState.maxZoom,
    currentZoom * (1 + zoomDelta)
  )
  
  // Calculate zoom point in normalized coordinates (0-1)
  const normalizedX = cursorX / this.state.videoState.videoWidth
  const normalizedY = cursorY / this.state.videoState.videoHeight
  
  // Calculate new pan to keep cursor point fixed
  const zoomRatio = newZoom / currentZoom
  const newPanX = cursorX - (cursorX - this.state.previewState.panX) * zoomRatio
  const newPanY = cursorY - (cursorY - this.state.previewState.panY) * zoomRatio
  
  // Apply zoom with smooth animation
  this.applyPreviewZoom({
    zoomLevel: newZoom,
    panX: newPanX,
    panY: newPanY,
    animate: true
  })
  
  // Update UI elements
  this.updateScrollbars(newZoom)
  this.updateOverviewIndicator(newZoom, newPanX, newPanY)
}
```

### 3. Zoom Out (Pinch In)
**System Behavior:**
- User brings fingers together on touchpad
- Video preview scales down progressively
- Maintains aspect ratio during scaling
- Returns toward fit-to-window size

**Implementation:**
```typescript
executeZoomOut(zoomDelta: number, cursorX: number, cursorY: number) {
  const currentZoom = this.state.previewState.zoomLevel
  
  // Calculate new zoom level
  const newZoom = Math.max(
    this.state.previewState.minZoom,
    currentZoom * (1 - Math.abs(zoomDelta))
  )
  
  // Special case: Snap to fit-to-window when near minimum
  if (newZoom < 1.1 && newZoom > 0.9) {
    this.fitToWindow()
    return
  }
  
  // Otherwise, maintain cursor-centered zoom
  this.executeZoomIn(-Math.abs(zoomDelta), cursorX, cursorY)
}

fitToWindow() {
  // Calculate zoom to fit video in preview area
  const previewWidth = this.getPreviewWidth()
  const previewHeight = this.getPreviewHeight()
  const videoAspect = this.state.videoState.aspectRatio
  const previewAspect = previewWidth / previewHeight
  
  let fitZoom: number
  if (videoAspect > previewAspect) {
    // Video wider than preview - fit width
    fitZoom = previewWidth / this.state.videoState.videoWidth
  } else {
    // Video taller than preview - fit height
    fitZoom = previewHeight / this.state.videoState.videoHeight
  }
  
  this.applyPreviewZoom({
    zoomLevel: fitZoom,
    panX: 0,
    panY: 0,
    animate: true
  })
}
```

### 4. Pan Functionality (when zoomed)
**System Behavior:**
- User can click and drag to pan around zoomed video
- Smooth panning without affecting playback
- Visual boundaries show full video extents
- Corner overview shows current view area

**Pan Implementation:**
```typescript
class PanController {
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private startPanX = 0
  private startPanY = 0
  
  handleMouseDown(event: MouseEvent) {
    if (this.state.previewState.zoomLevel <= 1.0) {
      return // No panning when not zoomed
    }
    
    this.isDragging = true
    this.dragStartX = event.clientX
    this.dragStartY = event.clientY
    this.startPanX = this.state.previewState.panX
    this.startPanY = this.state.previewState.panY
    
    // Change cursor to indicate dragging
    this.setCursor('grabbing')
  }
  
  handleMouseMove(event: MouseEvent) {
    if (!this.isDragging) return
    
    const deltaX = event.clientX - this.dragStartX
    const deltaY = event.clientY - this.dragStartY
    
    // Apply pan with boundaries
    const newPanX = this.constrainPan(
      this.startPanX + deltaX,
      'horizontal'
    )
    const newPanY = this.constrainPan(
      this.startPanY + deltaY,
      'vertical'
    )
    
    // Update preview transform
    this.updatePreviewTransform(
      this.state.previewState.zoomLevel,
      newPanX,
      newPanY
    )
  }
}
```

### 5. Visual Feedback During Zoom
**System Behavior:**
- Smooth scaling animation during gesture
- Zoom percentage indicator (e.g., "150%")
- Cursor position maintained as zoom center
- Preview quality maintained at all zoom levels

**Visual Indicators:**
```typescript
renderZoomIndicator() {
  const zoomPercent = Math.round(this.state.previewState.zoomLevel * 100)
  
  return (
    <div className="zoom-indicator">
      <span>{zoomPercent}%</span>
      <button onClick={this.fitToWindow}>Fit</button>
      <button onClick={this.zoom100}>100%</button>
    </div>
  )
}

renderOverviewMap() {
  if (this.state.previewState.zoomLevel <= 1.0) {
    return null // No overview when not zoomed
  }
  
  // Mini-map showing current view area
  const viewportRect = this.calculateViewportRect()
  
  return (
    <div className="overview-map">
      <canvas ref={this.minimapCanvas} />
      <div 
        className="viewport-rect"
        style={{
          left: viewportRect.x + 'px',
          top: viewportRect.y + 'px',
          width: viewportRect.width + 'px',
          height: viewportRect.height + 'px'
        }}
      />
    </div>
  )
}
```

### 6. Playback During Zoom
**System Behavior:**
- Video playback continues normally when zoomed
- Audio remains synchronized
- Scrubber continues normal operation
- All video controls remain functional

**Playback Continuity:**
```typescript
maintainPlaybackDuringZoom() {
  // Store playback state before zoom
  const wasPlaying = this.state.videoState.isPlaying
  const currentTime = this.videoElement.currentTime
  
  // Apply zoom transform
  this.applyZoomTransform()
  
  // Ensure playback continues if it was playing
  if (wasPlaying && this.videoElement.paused) {
    this.videoElement.play()
  }
  
  // Verify sync
  if (Math.abs(this.videoElement.currentTime - currentTime) > 0.1) {
    this.videoElement.currentTime = currentTime
  }
}
```

---

## ⚠️ Edge Cases

### Maximum Zoom
**Behavior**: Pixel-level detail (reasonable limit)
```typescript
calculateMaxZoom() {
  // Maximum 10x zoom or pixel-perfect, whichever is smaller
  const pixelPerfectZoom = this.getPreviewWidth() / this.state.videoState.videoWidth * 2
  this.state.previewState.maxZoom = Math.min(10.0, pixelPerfectZoom)
}
```

### Minimum Zoom
**Behavior**: Fit entire video in preview area
```typescript
calculateMinZoom() {
  // Minimum zoom to fit video in preview
  const fitZoom = this.calculateFitToWindowZoom()
  this.state.previewState.minZoom = Math.min(fitZoom, 0.1) // At least 10%
}
```

### Fast Zoom Gestures
**Behavior**: Smooth interpolation maintained
```typescript
handleRapidZoom(zoomEvents: WheelEvent[]) {
  // Accumulate rapid zoom events
  const totalDelta = zoomEvents.reduce((sum, e) => sum + e.deltaY, 0)
  
  // Apply smoothed zoom
  requestAnimationFrame(() => {
    this.executeSmoothedZoom(totalDelta)
  })
}
```

### Cursor Outside Preview
**Behavior**: Gesture has no effect
```typescript
validateCursorLocation(event: WheelEvent) {
  const previewBounds = this.getPreviewBounds()
  
  if (!this.isPointInBounds(event.clientX, event.clientY, previewBounds)) {
    return false // Ignore gesture
  }
  
  return true
}
```

---

## 🎯 Technical Requirements

### Zoom System Architecture
- **Cursor-centered anchoring** for all zoom operations
- **CSS transform** for hardware-accelerated scaling
- **Request Animation Frame** for smooth animations
- **Gesture accumulation** for rapid pinch handling

### Performance Requirements
- **60fps zoom animation** during gesture
- **Hardware acceleration** using CSS transforms
- **Efficient video rendering** without re-decoding
- **Memory-efficient** zoom without duplicating video

### Visual Quality
- **No pixelation** at reasonable zoom levels
- **Smooth interpolation** during zoom animation
- **Maintain aspect ratio** at all zoom levels
- **Clear pan boundaries** when zoomed

### Interaction Design
- **Intuitive pan gesture** with click and drag
- **Visual feedback** for zoom limits
- **Overview map** for navigation when zoomed
- **Keyboard shortcuts** as fallback (Cmd/Ctrl +/-)

---

## 🧪 User Testing Checklist

### Basic Functionality
- [ ] Pinch gesture zooms preview when cursor over video
- [ ] Zoom centers around cursor position (NOT scrubber)
- [ ] Pinch out increases zoom level smoothly
- [ ] Pinch in decreases zoom level smoothly

### Pan Functionality
- [ ] Click and drag pans zoomed video
- [ ] Pan boundaries prevent scrolling beyond video edges
- [ ] Pan cursor changes to indicate dragging
- [ ] Pan doesn't affect video playback

### Visual Feedback
- [ ] Zoom percentage indicator shows current level
- [ ] Overview map appears when zoomed
- [ ] Scrollbars appear when video exceeds bounds
- [ ] Video quality maintained at all zoom levels

### Playback Integration
- [ ] Video continues playing during zoom
- [ ] Audio remains synchronized
- [ ] Scrubber operates normally when zoomed
- [ ] All controls remain functional

### Edge Cases
- [ ] Zoom stops at maximum (pixel-level detail)
- [ ] Zoom stops at minimum (fit to window)
- [ ] Rapid zoom gestures handled smoothly
- [ ] Gesture ignored when cursor outside preview

---

## 🚀 Implementation Strategy

### Phase 5.1: Gesture Detection (30 min)
1. Implement wheel event handler for preview area
2. Add cursor position tracking
3. Create gesture state management
4. Add pinch gesture detection

### Phase 5.2: Cursor-Centered Zoom (45 min)
1. Implement zoom calculation with cursor anchor
2. Add pan offset calculation
3. Create CSS transform application
4. Maintain cursor point during zoom

### Phase 5.3: Pan Functionality (30 min)
1. Implement click and drag detection
2. Add pan movement with boundaries
3. Create cursor state management
4. Integrate with zoom state

### Phase 5.4: Visual Feedback (30 min)
1. Add zoom percentage indicator
2. Create overview map component
3. Implement scrollbar visibility
4. Add zoom limit feedback

---

## 🔗 Integration Points

### State Machine Integration
```typescript
// New actions for Flow 5
type PreviewZoomActions = 
  | { type: 'PREVIEW_ZOOM_START' }
  | { type: 'PREVIEW_ZOOM_UPDATE'; zoomLevel: number; panX: number; panY: number }
  | { type: 'PREVIEW_ZOOM_END' }
  | { type: 'PREVIEW_PAN_START' }
  | { type: 'PREVIEW_PAN_UPDATE'; panX: number; panY: number }
  | { type: 'PREVIEW_PAN_END' }
  | { type: 'PREVIEW_FIT_TO_WINDOW' }
```

### Critical Architecture Rule
```typescript
// REQUIRED: Preview zoom uses cursor position
const anchorPoint = this.getCursorPosition() // ✅ CORRECT for preview

// FORBIDDEN: Never use scrubber position for preview zoom
// const anchorPoint = this.state.scrubberPosition // ❌ WRONG for preview
```

---

## ✅ Success Criteria

Flow 5 is considered complete when:

1. **Cursor-Centered Zoom**: All zoom operations center around cursor position
2. **Pan Functionality**: Click and drag successfully pans zoomed video
3. **Visual Quality**: Video quality maintained at all zoom levels
4. **Playback Continuity**: Video continues playing during zoom
5. **Performance**: Zoom animation maintains 60fps
6. **User Approval**: Manual testing checklist completed and approved by user

**🚨 MANDATORY**: This flow requires explicit user testing and approval before proceeding to Flow 6

---

**Next Flow**: Flow 6 - Dummy Video Asset Management
**Dependencies**: This flow is independent but benefits from the video control established in previous flows
'use client'

import { useState, useRef, useEffect } from 'react'
import { FPS } from '@/lib/video-editor/types'

interface SimpleTimelineProps {
  clips: Array<{
    id: string
    startFrame: number
    durationFrames: number
  }>
  currentFrame: number
  totalFrames: number
  onSeekToFrame: (frame: number) => void
  selectedClipId: string | null
  onSelectClip: (clipId: string | null) => void
  onMoveClip?: (clipId: string, newStartFrame: number) => void
}

export function SimpleTimeline({ 
  clips, 
  currentFrame, 
  totalFrames, 
  onSeekToFrame, 
  selectedClipId, 
  onSelectClip, 
  onMoveClip 
}: SimpleTimelineProps) {
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = 100%, 2 = 200%, etc.
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const dragStartPosRef = useRef<{x: number, y: number} | null>(null)
  
  // Scale pixels per second based on zoom
  const basePixelsPerSecond = 50
  const pixelsPerSecond = basePixelsPerSecond * zoomLevel
  const totalSeconds = Math.max(120, totalFrames / FPS) // Extended to 120 seconds for better zoom out
  const timelineWidth = totalSeconds * pixelsPerSecond
  
  const handleClipPointerDown = (clip: any, e: React.PointerEvent) => {
    e.stopPropagation()
    
    // Record start position to detect drag vs click
    dragStartPosRef.current = { x: e.clientX, y: e.clientY }
    
    // Setup for potential dragging
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    setDragOffset(clickX)
    setDraggedClipId(clip.id)
    
    // Capture pointer for drag
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  
  const handleClipPointerUp = (clipId: string, e: React.PointerEvent) => {
    e.stopPropagation()
    
    // Check if it was a click (minimal movement) or drag
    const dragThreshold = 5 // pixels
    const startPos = dragStartPosRef.current
    const wasDrag = startPos && (
      Math.abs(e.clientX - startPos.x) > dragThreshold ||
      Math.abs(e.clientY - startPos.y) > dragThreshold
    )
    
    if (!wasDrag) {
      // It was a click - toggle selection
      onSelectClip(clipId === selectedClipId ? null : clipId)
    }
    
    // Clean up
    dragStartPosRef.current = null
    setDraggedClipId(null)
  }
  
  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - 70
    if (x < 0) return
    
    const scrubberX = (currentFrame / FPS) * pixelsPerSecond
    const magneticRange = 15
    
    // Jump to click position if not near scrubber
    if (Math.abs(x - scrubberX) > magneticRange) {
      const clickedFrame = Math.round((x / pixelsPerSecond) * FPS)
      const maxFrame = Math.max(totalFrames, totalSeconds * FPS)
      onSeekToFrame(Math.min(clickedFrame, maxFrame))
    }
    
    setIsDraggingScrubber(true)
  }
  
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingScrubber) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - 70
    if (x < 0) return
    
    const frame = Math.round((x / pixelsPerSecond) * FPS)
    const maxFrame = Math.max(totalFrames, totalSeconds * FPS)
    onSeekToFrame(Math.min(frame, maxFrame))
  }
  
  // Global scrubber dragging
  useEffect(() => {
    if (!isDraggingScrubber) return
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const container = scrollContainerRef.current
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left + container.scrollLeft - 70
      const frame = Math.round(Math.max(0, x / pixelsPerSecond) * FPS)
      const maxFrame = Math.max(totalFrames, totalSeconds * FPS)
      onSeekToFrame(Math.min(frame, maxFrame))
    }
    
    const handleGlobalMouseUp = () => setIsDraggingScrubber(false)
    
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDraggingScrubber, pixelsPerSecond, totalFrames, totalSeconds, onSeekToFrame])
  
  const handleMouseUp = () => {
    setDraggedClipId(null)
    setDragOffset(0)
  }
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Handle zoom with wheel event (Ctrl/Cmd + scroll or pinch)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const handleWheel = (e: WheelEvent) => {
      // Always prevent default horizontal scrolling to avoid browser navigation
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
      }
      
      // Check if Ctrl (Windows/Linux) or Cmd (Mac) is pressed, or if it's a pinch gesture
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        
        // Get mouse position relative to timeline for zoom anchoring
        const rect = container.getBoundingClientRect()
        const mouseX = e.clientX - rect.left + container.scrollLeft
        const timeAtMouse = (mouseX - 70) / pixelsPerSecond // Time in seconds at mouse position
        
        // Calculate new zoom level
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1 // Zoom out or in
        const newZoom = Math.min(Math.max(0.25, zoomLevel * zoomDelta), 10) // Clamp between 25% and 1000%
        
        setZoomLevel(newZoom)
        
        // After zoom, scroll to keep the same time position under the mouse
        setTimeout(() => {
          const newPixelsPerSecond = basePixelsPerSecond * newZoom
          const newMouseX = (timeAtMouse * newPixelsPerSecond) + 70
          container.scrollLeft = newMouseX - (e.clientX - rect.left)
        }, 0)
      }
    }
    
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [zoomLevel, pixelsPerSecond, basePixelsPerSecond])
  
  // Prevent browser back/forward navigation gestures
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    // Prevent touchpad swipe gestures that trigger browser navigation
    const preventSwipeNavigation = (e: Event) => {
      e.preventDefault()
    }
    
    // Add listeners for various swipe/gesture events
    container.addEventListener('gesturestart', preventSwipeNavigation)
    container.addEventListener('gesturechange', preventSwipeNavigation)
    container.addEventListener('gestureend', preventSwipeNavigation)
    
    return () => {
      container.removeEventListener('gesturestart', preventSwipeNavigation)
      container.removeEventListener('gesturechange', preventSwipeNavigation)
      container.removeEventListener('gestureend', preventSwipeNavigation)
    }
  }, [])
  
  return (
    <div className="h-full flex flex-col bg-gray-900" style={{ overscrollBehaviorX: 'contain' }}>
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-2">
        <span className="text-xs text-gray-400">Timeline ({clips.length} clips)</span>
        <span className="text-xs text-gray-400">Zoom: {Math.round(zoomLevel * 100)}%</span>
      </div>
      
      <div 
        className="flex-1 relative overflow-x-auto overflow-y-hidden" 
        ref={scrollContainerRef}
        style={{ overscrollBehaviorX: 'contain' }}
      >
        <div 
          className="relative select-none"
          style={{ width: timelineWidth, height: '100%' }}
        >
          {/* Time Ruler - Clickable and draggable for scrubber */}
          <div 
            className="h-10 bg-gray-900 border-b border-gray-800 relative sticky top-0 z-10 cursor-pointer"
            onMouseDown={handleRulerMouseDown}
            onClick={handleRulerClick}
          >
            {/* Major time marks - adjust interval based on zoom */}
            {(() => {
              // Calculate interval between markers based on zoom level
              let interval = 1 // Default 1 second
              if (zoomLevel < 0.5) {
                interval = 10 // Show every 10 seconds when zoomed out a lot
              } else if (zoomLevel < 0.75) {
                interval = 5 // Show every 5 seconds when moderately zoomed out
              } else if (zoomLevel < 1) {
                interval = 2 // Show every 2 seconds when slightly zoomed out
              }
              
              const markers = []
              for (let i = 0; i <= totalSeconds; i += interval) {
                markers.push(
                  <div key={i} className="absolute pointer-events-none" style={{ left: i * pixelsPerSecond + 70 }}>
                    <div className="h-2 w-px bg-gray-600" />
                    <span className="absolute top-2 left-0 text-xs text-gray-400 transform -translate-x-1/2" style={{ minWidth: '40px' }}>
                      {formatTime(i)}
                    </span>
                    
                    {/* Minor marks only when zoomed in enough */}
                    {zoomLevel >= 0.75 && interval === 1 && [1, 2, 3, 4].map(j => (
                      <div 
                        key={j}
                        className="absolute h-1 w-px bg-gray-700"
                        style={{ left: j * (pixelsPerSecond / 5) }}
                      />
                    ))}
                  </div>
                )
              }
              return markers
            })()}
          </div>
          
          {/* Track Lanes */}
          <div 
            className="relative" 
            style={{ height: 'calc(100% - 40px)' }} 
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Video Track 1 */}
            <div className="h-20 border-b border-gray-800 relative flex items-center">
              <div className="absolute left-2 text-xs text-gray-400 z-10" style={{ width: '60px' }}>
                Video 1
              </div>
              {/* Render clips on track 1 */}
              {clips.map((clip, index) => {
                const isSelected = clip.id === selectedClipId
                const isDragging = clip.id === draggedClipId
                return (
                  <div
                    key={clip.id}
                    className={`absolute h-14 rounded cursor-move ${
                      isSelected 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-400 border-2 border-yellow-400 shadow-md shadow-yellow-400/20' 
                        : 'bg-gradient-to-r from-blue-600 to-blue-500 border border-blue-400 hover:from-blue-500 hover:to-blue-400'
                    } ${isDragging ? 'opacity-75' : ''}`}
                    style={{
                      left: (clip.startFrame / FPS) * pixelsPerSecond + 70,
                      width: (clip.durationFrames / FPS) * pixelsPerSecond,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      transition: isDragging ? 'none' : 'left 0.1s ease-out'
                    }}
                    onPointerDown={(e) => handleClipPointerDown(clip, e)}
                    onPointerUp={(e) => handleClipPointerUp(clip.id, e)}
                    onPointerMove={(e) => {
                      if (draggedClipId === clip.id && onMoveClip) {
                        const rect = e.currentTarget.parentElement!.getBoundingClientRect()
                        const x = e.clientX - rect.left - dragOffset - 70
                        const newStartFrame = Math.round(Math.max(0, x / pixelsPerSecond) * FPS)
                        onMoveClip(draggedClipId, newStartFrame)
                      }
                    }}
                  >
                    <div className="text-xs p-1 text-white truncate pointer-events-none select-none">
                      Clip {index + 1}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Video Track 2 */}
            <div className="h-20 border-b border-gray-800 relative flex items-center">
              <div className="absolute left-2 text-xs text-gray-400 z-10" style={{ width: '60px' }}>
                Video 2
              </div>
            </div>
            
            {/* Audio Track */}
            <div className="h-16 border-b border-gray-800 relative flex items-center">
              <div className="absolute left-2 text-xs text-gray-400 z-10" style={{ width: '60px' }}>
                Audio 1
              </div>
            </div>
          </div>
          
          {/* Scrubber/Playhead */}
          <div
            className="absolute top-0 w-0.5 bg-red-500 pointer-events-none z-20"
            style={{ 
              left: (currentFrame / FPS) * pixelsPerSecond + 70,
              height: '100%'
            }}
          >
            {/* Scrubber head */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-red-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
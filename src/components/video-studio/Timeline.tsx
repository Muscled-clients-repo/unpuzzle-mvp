'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { FPS } from '@/lib/video-editor/types'
import { Minus, Plus } from 'lucide-react'

interface TimelineProps {
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

export function Timeline({ 
  clips, 
  currentFrame, 
  totalFrames, 
  onSeekToFrame, 
  selectedClipId, 
  onSelectClip, 
  onMoveClip 
}: TimelineProps) {
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = 100%, 2 = 200%, etc.
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(1000) // Track viewport width for real-time updates
  const [scrollPosition, setScrollPosition] = useState(0) // Track scroll position for viewport indicator
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const dragStartPosRef = useRef<{x: number, y: number} | null>(null)
  
  // Scale pixels per second based on zoom
  const basePixelsPerSecond = 50
  const pixelsPerSecond = basePixelsPerSecond * zoomLevel
  // Dynamic timeline length
  const [totalSeconds, setTotalSeconds] = useState(60) // Start with 60 seconds
  const timelineWidth = totalSeconds * pixelsPerSecond
  
  // Calculate min zoom to fit entire timeline (max zoom stays at 200%)
  const minZoom = useMemo(() => {
    const minZoomToFitTimeline = viewportWidth / (totalSeconds * basePixelsPerSecond)
    return Math.max(0.1, Math.min(0.25, minZoomToFitTimeline))  // Allow zooming out more as timeline grows
  }, [viewportWidth, totalSeconds, basePixelsPerSecond])
  
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
      const maxFrame = totalSeconds * FPS
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
    const maxFrame = totalSeconds * FPS
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
      const maxFrame = totalSeconds * FPS
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
  
  // Update viewport width on mount and resize
  useEffect(() => {
    const updateViewportWidth = () => {
      if (scrollContainerRef.current) {
        setViewportWidth(scrollContainerRef.current.clientWidth)
      }
    }
    
    updateViewportWidth()
    window.addEventListener('resize', updateViewportWidth)
    
    // Also update after a short delay to ensure container is rendered
    const timer = setTimeout(updateViewportWidth, 100)
    
    return () => {
      window.removeEventListener('resize', updateViewportWidth)
      clearTimeout(timer)
    }
  }, [])
  
  // Track scroll position for viewport indicator
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const handleScroll = () => {
      setScrollPosition(container.scrollLeft)
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Dynamic timeline extension based on clip positions and viewport
  useEffect(() => {
    // Find the end of the last clip
    const lastClipEnd = clips.reduce((max, clip) => 
      Math.max(max, clip.startFrame + clip.durationFrames), 0
    ) / FPS // Convert to seconds
    
    // Calculate minimum seconds needed to fill viewport
    const minSecondsForViewport = Math.ceil(viewportWidth / pixelsPerSecond)
    
    // Ensure timeline is at least as wide as viewport
    const minRequired = Math.max(60, minSecondsForViewport, lastClipEnd + 10)
    
    // Check if we need to extend
    if (lastClipEnd > totalSeconds - 10 || totalSeconds < minRequired) {
      // Calculate extension based on visible area
      const visibleSeconds = viewportWidth / pixelsPerSecond
      const extensionAmount = Math.ceil(visibleSeconds / 3)
      
      setTotalSeconds(Math.max(minRequired, totalSeconds + extensionAmount))
    }
    
    // Contract if there's too much empty space (but keep minimum requirements)
    if (lastClipEnd < totalSeconds - 60 && totalSeconds > minRequired) {
      setTotalSeconds(Math.max(minRequired, lastClipEnd + 30))
    }
  }, [clips, totalSeconds, pixelsPerSecond, viewportWidth])
  
  // Handle pinch/scroll zoom only
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const handleZoom = (e: WheelEvent) => {
      // Only handle zoom with Ctrl/Cmd + scroll or pinch gesture
      if (!e.ctrlKey && !e.metaKey) return
      
      e.preventDefault()
      
      // Get scrubber position for zoom anchoring
      const scrubberTime = currentFrame / FPS  // Time in seconds at scrubber
      
      // Calculate new zoom level (match dynamic slider limits)
      const zoomDelta = e.deltaY > 0 ? 0.95 : 1.05
      const newZoom = Math.min(Math.max(minZoom, zoomLevel * zoomDelta), 2)
      
      setZoomLevel(newZoom)
      
      // Keep the scrubber centered after zoom
      setTimeout(() => {
        const newPixelsPerSecond = basePixelsPerSecond * newZoom
        const scrubberX = (scrubberTime * newPixelsPerSecond) + 70
        // Center scrubber in viewport
        container.scrollLeft = scrubberX - (container.clientWidth / 2)
      }, 0)
    }
    
    container.addEventListener('wheel', handleZoom, { passive: false })
    return () => container.removeEventListener('wheel', handleZoom)
  }, [zoomLevel, pixelsPerSecond, basePixelsPerSecond, minZoom, currentFrame])
  
  // Calculate viewport indicator position and width
  const viewportIndicatorWidth = (viewportWidth / timelineWidth) * 100  // Percentage
  const viewportIndicatorLeft = (scrollPosition / timelineWidth) * 100  // Percentage
  
  return (
    <div className="h-full flex flex-col bg-gray-900 relative">
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-2">
        <span className="text-xs text-gray-400">Timeline ({clips.length} clips)</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setZoomLevel(Math.max(minZoom, zoomLevel - 0.1))}
            className="text-gray-400 hover:text-white p-0.5"
          >
            <Minus className="h-3 w-3" />
          </button>
          <input 
            type="range"
            min={minZoom * 100}
            max={200}
            value={zoomLevel * 100}
            onChange={(e) => setZoomLevel(parseInt(e.target.value) / 100)}
            className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #ffffff 0%, #ffffff ${((zoomLevel * 100 - minZoom * 100) / (200 - minZoom * 100)) * 100}%, #374151 ${((zoomLevel * 100 - minZoom * 100) / (200 - minZoom * 100)) * 100}%, #374151 100%)`
            }}
          />
          <button 
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
            className="text-gray-400 hover:text-white p-0.5"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      <div 
        className="flex-1 relative overflow-x-auto overflow-y-hidden" 
        ref={scrollContainerRef}
        data-timeline-scroll="true"
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
              
              // Calculate how many seconds the timeline actually covers visually
              const visibleTimelineSeconds = Math.ceil(timelineWidth / pixelsPerSecond)
              
              const markers = []
              for (let i = 0; i <= visibleTimelineSeconds; i += interval) {
                markers.push(
                  <div key={i} className="absolute pointer-events-none" style={{ left: i * pixelsPerSecond + 70 }}>
                    <div className="h-2 w-px bg-gray-600" />
                    <span className="absolute top-2 left-0 text-xs text-gray-400 transform -translate-x-1/2" style={{ minWidth: '40px' }}>
                      {formatTime(i)}
                    </span>
                    
                    {/* Minor marks disabled for performance - was creating 480+ DOM elements
                    {zoomLevel >= 0.75 && interval === 1 && [1, 2, 3, 4].map(j => (
                      <div 
                        key={j}
                        className="absolute h-1 w-px bg-gray-700"
                        style={{ left: j * (pixelsPerSecond / 5) }}
                      />
                    ))} */}
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
              transform: `translateX(${(currentFrame / FPS) * pixelsPerSecond + 70}px)`,
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
      
      {/* Viewport Indicator Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-800 border-t border-gray-700">
        <div 
          className="absolute top-0 h-full bg-gray-600 transition-all duration-75"
          style={{
            left: `${viewportIndicatorLeft}%`,
            width: `${Math.min(100, viewportIndicatorWidth)}%`
          }}
        />
      </div>
    </div>
  )
}
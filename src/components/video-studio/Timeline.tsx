'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { FPS } from '@/lib/video-editor/types'
import { TimelineControls } from './timeline/TimelineControls'
import { TimelineRuler } from './timeline/TimelineRuler'
import { TimelineClips } from './timeline/TimelineClips'
import { TimelineScrubber } from './timeline/TimelineScrubber'

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
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = 100%, 2 = 200%, etc.
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(1000)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(60) // Start with 60 seconds
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Scale pixels per second based on zoom
  const basePixelsPerSecond = 50
  const pixelsPerSecond = basePixelsPerSecond * zoomLevel
  const timelineWidth = totalSeconds * pixelsPerSecond
  
  // Calculate min/max zoom
  const minZoom = useMemo(() => {
    const minZoomToFitTimeline = viewportWidth / (totalSeconds * basePixelsPerSecond)
    return Math.max(0.1, Math.min(0.25, minZoomToFitTimeline))
  }, [viewportWidth, totalSeconds, basePixelsPerSecond])
  
  const maxZoom = 2
  
  // Handle ruler interactions for scrubber
  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - 70
    if (x < 0) return
    
    const scrubberX = (currentFrame / FPS) * pixelsPerSecond
    const magneticRange = 15
    
    // Only start dragging if clicking near the scrubber
    if (Math.abs(x - scrubberX) <= magneticRange) {
      setIsDraggingScrubber(true)
    }
  }
  
  const handleRulerClick = (frame: number) => {
    const maxFrame = totalSeconds * FPS
    onSeekToFrame(Math.min(frame, maxFrame))
  }
  
  // Handle scrubber dragging
  useEffect(() => {
    if (!isDraggingScrubber || !scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left + container.scrollLeft - 70) / pixelsPerSecond
      const frame = Math.round(Math.max(0, x) * FPS)
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
  }, [isDraggingScrubber, pixelsPerSecond, onSeekToFrame, totalSeconds])
  
  // Update viewport width on resize
  useEffect(() => {
    const updateViewportWidth = () => {
      if (scrollContainerRef.current) {
        setViewportWidth(scrollContainerRef.current.clientWidth)
      }
    }
    
    updateViewportWidth()
    window.addEventListener('resize', updateViewportWidth)
    
    // Also update after a short delay to catch any layout shifts
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
  
  // Auto-extend timeline as clips are added
  useEffect(() => {
    const lastClipEnd = clips.reduce((max, clip) => 
      Math.max(max, Math.ceil((clip.startFrame + clip.durationFrames) / FPS)), 0
    )
    
    // Calculate minimum seconds needed to show viewport
    const minSecondsForViewport = Math.ceil(viewportWidth / pixelsPerSecond)
    
    // Ensure timeline is at least 60 seconds or enough to show all clips plus buffer
    const minRequired = Math.max(60, minSecondsForViewport, lastClipEnd + 10)
    
    if (totalSeconds < minRequired) {
      // Extend by chunks for smoother experience
      const visibleSeconds = viewportWidth / pixelsPerSecond
      const extensionAmount = Math.ceil(visibleSeconds / 3)
      setTotalSeconds(Math.max(minRequired, totalSeconds + extensionAmount))
    }
  }, [clips, viewportWidth, pixelsPerSecond, totalSeconds])
  
  // Handle zoom with mouse wheel
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const handleZoom = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      
      e.preventDefault()
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.min(Math.max(minZoom, zoomLevel * zoomDelta), maxZoom)
      
      if (newZoom !== zoomLevel) {
        // Calculate scrubber position for maintaining view
        const scrubberTime = currentFrame / FPS
        const newPixelsPerSecond = basePixelsPerSecond * newZoom
        const scrubberX = (scrubberTime * newPixelsPerSecond) + 70
        
        setZoomLevel(newZoom)
        
        // Center on scrubber after zoom
        setTimeout(() => {
          container.scrollLeft = scrubberX - (container.clientWidth / 2)
        }, 0)
      }
    }
    
    container.addEventListener('wheel', handleZoom, { passive: false })
    return () => container.removeEventListener('wheel', handleZoom)
  }, [zoomLevel, minZoom, maxZoom, currentFrame, basePixelsPerSecond])
  
  // Viewport indicator calculations
  const viewportIndicatorWidth = (viewportWidth / timelineWidth) * 100
  const viewportIndicatorLeft = (scrollPosition / timelineWidth) * 100
  
  return (
    <div className="h-full flex flex-col bg-gray-900 relative">
      <TimelineControls
        zoomLevel={zoomLevel}
        minZoom={minZoom}
        maxZoom={maxZoom}
        onZoomChange={setZoomLevel}
        clipCount={clips.length}
      />
      
      <div 
        className="flex-1 relative overflow-x-auto overflow-y-hidden" 
        ref={scrollContainerRef}
        data-timeline-scroll="true"
      >
        <div 
          className="relative select-none"
          style={{ width: timelineWidth, height: '100%' }}
        >
          <TimelineRuler
            pixelsPerSecond={pixelsPerSecond}
            timelineWidth={timelineWidth}
            zoomLevel={zoomLevel}
            onRulerClick={handleRulerClick}
            onRulerMouseDown={handleRulerMouseDown}
          />
          
          <TimelineClips
            clips={clips}
            pixelsPerSecond={pixelsPerSecond}
            selectedClipId={selectedClipId}
            onSelectClip={onSelectClip}
            onMoveClip={onMoveClip}
          />
          
          <TimelineScrubber
            currentFrame={currentFrame}
            pixelsPerSecond={pixelsPerSecond}
            totalSeconds={totalSeconds}
          />
        </div>
      </div>
      
      {/* Viewport indicator mini-map */}
      <div className="h-2 bg-gray-800 relative">
        <div 
          className="absolute h-full bg-gray-600"
          style={{
            left: `${viewportIndicatorLeft}%`,
            width: `${viewportIndicatorWidth}%`
          }}
        />
      </div>
    </div>
  )
}
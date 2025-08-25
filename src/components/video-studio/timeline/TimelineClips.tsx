'use client'

import { useState, useRef } from 'react'
import { FPS } from '@/lib/video-editor/types'

interface Clip {
  id: string
  startFrame: number
  durationFrames: number
  originalDurationFrames?: number
  sourceInFrame?: number
  sourceOutFrame?: number
}

interface TimelineClipsProps {
  clips: Clip[]
  pixelsPerSecond: number
  selectedClipId: string | null
  currentFrame?: number  // Add currentFrame for magnetic effect
  onSelectClip: (clipId: string | null) => void
  onMoveClip?: (clipId: string, newStartFrame: number) => void
  onMoveClipComplete?: () => void
  onTrimClipStart?: (clipId: string, newStartOffset: number) => void
  onTrimClipStartComplete?: () => void
  onTrimClipEnd?: (clipId: string, newEndOffset: number) => void
  onTrimClipEndComplete?: () => void
  onSeekToFrame?: (frame: number) => void
}

export function TimelineClips({ 
  clips, 
  pixelsPerSecond,
  selectedClipId,
  currentFrame = 0,
  onSelectClip,
  onMoveClip,
  onMoveClipComplete,
  onTrimClipStart,
  onTrimClipStartComplete,
  onTrimClipEnd,
  onTrimClipEndComplete,
  onSeekToFrame
}: TimelineClipsProps) {
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragMode, setDragMode] = useState<'move' | 'trim-start' | 'trim-end' | null>(null)
  const dragStartPosRef = useRef<{x: number, y: number} | null>(null)
  const dragStartFrameRef = useRef<number>(0)
  const lastUpdateTimeRef = useRef<number>(0)
  const throttleMs = 100 // 100ms = 10 updates per second
  
  const handleClipPointerDown = (clip: Clip, e: React.PointerEvent, mode: 'move' | 'trim-start' | 'trim-end') => {
    e.stopPropagation()
    
    // Record start position
    dragStartPosRef.current = { x: e.clientX, y: e.clientY }
    setDragMode(mode)
    setDraggedClipId(clip.id)
    
    if (mode === 'move') {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      setDragOffset(clickX)
    } else if (mode === 'trim-start') {
      dragStartFrameRef.current = clip.sourceInFrame ?? 0
    } else if (mode === 'trim-end') {
      dragStartFrameRef.current = clip.sourceOutFrame ?? (clip.originalDurationFrames ?? clip.durationFrames)
    }
    
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
    
    if (!wasDrag && dragMode === 'move') {
      // It was a click on the main clip - toggle selection
      onSelectClip(clipId === selectedClipId ? null : clipId)
    } else if (wasDrag) {
      // It was a drag - call the complete callback to save history
      if (dragMode === 'move' && onMoveClipComplete) {
        onMoveClipComplete()
      } else if (dragMode === 'trim-start' && onTrimClipStartComplete) {
        onTrimClipStartComplete()
      } else if (dragMode === 'trim-end' && onTrimClipEndComplete) {
        onTrimClipEndComplete()
      }
    }
    
    // Clean up
    dragStartPosRef.current = null
    setDraggedClipId(null)
    setDragMode(null)
  }
  
  const handleClipPointerMove = (clip: Clip, e: React.PointerEvent) => {
    if (draggedClipId !== clip.id || !dragMode) return
    
    // Throttle updates to 10 per second (100ms)
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current
    
    // For trim operations, throttle to reduce black screens
    // For move operations, keep smooth (no throttle)
    const shouldThrottle = dragMode === 'trim-start' || dragMode === 'trim-end'
    if (shouldThrottle && timeSinceLastUpdate < throttleMs) {
      return
    }
    
    const deltaX = e.clientX - (dragStartPosRef.current?.x ?? e.clientX)
    const deltaFrames = Math.round((deltaX / pixelsPerSecond) * FPS)
    
    if (dragMode === 'move' && onMoveClip) {
      const rect = e.currentTarget.parentElement!.getBoundingClientRect()
      const x = e.clientX - rect.left - dragOffset - 70
      const newStartFrame = Math.round(Math.max(0, x / pixelsPerSecond) * FPS)
      onMoveClip(clip.id, newStartFrame)
    } else if (dragMode === 'trim-start' && onTrimClipStart) {
      let newInFrame = Math.max(0, dragStartFrameRef.current + deltaFrames)
      
      // Magnetic effect: snap to scrubber position
      const magneticRangeFrames = 3 // Snap within 3 frames (0.1 seconds at 30fps)
      const scrubberOffsetInClip = currentFrame - clip.startFrame
      
      // Check if we're close to the scrubber position within the clip
      if (Math.abs(newInFrame - scrubberOffsetInClip) <= magneticRangeFrames && scrubberOffsetInClip >= 0) {
        newInFrame = scrubberOffsetInClip
      }
      
      onTrimClipStart(clip.id, newInFrame)
      // Don't move scrubber during trim - let it stay where it is
      lastUpdateTimeRef.current = now
    } else if (dragMode === 'trim-end' && onTrimClipEnd) {
      let newOutFrame = Math.max(1, dragStartFrameRef.current + deltaFrames)
      
      // Magnetic effect: snap to scrubber position
      const magneticRangeFrames = 3 // Snap within 3 frames (0.1 seconds at 30fps)
      const scrubberOffsetInClip = currentFrame - clip.startFrame
      const scrubberOutFrame = (clip.sourceInFrame ?? 0) + scrubberOffsetInClip
      
      // Check if we're close to the scrubber position within the clip
      if (Math.abs(newOutFrame - scrubberOutFrame) <= magneticRangeFrames && scrubberOffsetInClip >= 0) {
        newOutFrame = scrubberOutFrame
      }
      
      onTrimClipEnd(clip.id, newOutFrame)
      // Don't move scrubber during trim - let it stay where it is
      lastUpdateTimeRef.current = now
    }
  }
  
  return (
    <div className="relative" style={{ height: 'calc(100% - 40px)' }}>
      {/* Video Track 1 */}
      <div className="h-20 border-b border-gray-800 relative flex items-center">
        <div className="absolute left-2 text-xs text-gray-400 z-10" style={{ width: '60px' }}>
          Video 1
        </div>
        
        {/* Render clips */}
        {clips.map((clip) => {
          const isSelected = clip.id === selectedClipId
          const clipX = (clip.startFrame / FPS) * pixelsPerSecond
          const clipWidth = (clip.durationFrames / FPS) * pixelsPerSecond
          
          // Calculate trim indicators
          const originalDuration = clip.originalDurationFrames ?? clip.durationFrames
          const currentInFrame = clip.sourceInFrame ?? 0
          const currentOutFrame = clip.sourceOutFrame ?? originalDuration
          const canTrimStart = currentInFrame > 0 // Can extend left
          const canTrimEnd = currentOutFrame < originalDuration // Can extend right
          const trimmedStart = currentInFrame > 0
          const trimmedEnd = currentOutFrame < originalDuration
          
          return (
            <div
              key={clip.id}
              className={`absolute h-16 rounded ${
                isSelected 
                  ? 'ring-2 ring-yellow-500 shadow-lg z-20' 
                  : 'hover:ring-1 hover:ring-gray-400'
              } ${draggedClipId === clip.id && dragMode === 'move' ? 'opacity-50' : ''}`}
              style={{
                left: clipX + 70,
                width: clipWidth,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
              onPointerDown={(e) => handleClipPointerDown(clip, e, 'move')}
              onPointerUp={(e) => handleClipPointerUp(clip.id, e)}
              onPointerMove={(e) => handleClipPointerMove(clip, e)}
            >
              {/* Trim indicators */}
              {(trimmedStart || canTrimStart) && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400 opacity-75" />
              )}
              {(trimmedEnd || canTrimEnd) && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-yellow-400 opacity-75" />
              )}
              
              {/* Edge handles for trimming */}
              {isSelected && (
                <>
                  {/* Left edge handle */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white hover:bg-opacity-20"
                    style={{ marginLeft: '-6px' }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      handleClipPointerDown(clip, e, 'trim-start')
                    }}
                  >
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded opacity-50" />
                  </div>
                  
                  {/* Right edge handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white hover:bg-opacity-20"
                    style={{ marginRight: '-6px' }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      handleClipPointerDown(clip, e, 'trim-end')
                    }}
                  >
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded opacity-50" />
                  </div>
                </>
              )}
              
              <div className="p-1 text-xs text-white truncate select-none pointer-events-none">
                Clip {clips.indexOf(clip) + 1}
                {trimmedStart || trimmedEnd ? ' (trimmed)' : ''}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Video Track 2 - Empty for now */}
      <div className="h-20 border-b border-gray-800 relative flex items-center">
        <div className="absolute left-2 text-xs text-gray-400 z-10" style={{ width: '60px' }}>
          Video 2
        </div>
      </div>
      
      {/* Audio Track - Empty for now */}
      <div className="h-16 border-b border-gray-800 relative flex items-center">
        <div className="absolute left-2 text-xs text-gray-400 z-10" style={{ width: '60px' }}>
          Audio
        </div>
      </div>
    </div>
  )
}
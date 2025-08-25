'use client'

import { useState, useRef, useEffect } from 'react'
import { Clip, Track, FPS, DEFAULT_TRACK_HEIGHT } from '@/lib/video-editor/types'
import { Film, Music, Volume2, VolumeX } from 'lucide-react'

interface TimelineClipsProps {
  clips: Clip[]
  tracks: Track[]
  pixelsPerSecond: number
  selectedClipId: string | null
  selectedTrackIndex: number | null
  currentFrame?: number  // Add currentFrame for magnetic effect
  onSelectClip: (clipId: string | null) => void
  onSelectTrack: (trackIndex: number | null) => void
  onMoveClip?: (clipId: string, newStartFrame: number) => void
  onMoveClipComplete?: () => void
  onMoveClipToTrack?: (clipId: string, newTrackIndex: number) => void
  onTrimClipStart?: (clipId: string, newStartOffset: number) => void
  onTrimClipStartComplete?: () => void
  onTrimClipEnd?: (clipId: string, newEndOffset: number) => void
  onTrimClipEndComplete?: () => void
  onSeekToFrame?: (frame: number) => void
  onToggleTrackMute?: (trackIndex: number) => void
}

export function TimelineClips({ 
  clips,
  tracks,
  pixelsPerSecond,
  selectedClipId,
  selectedTrackIndex,
  currentFrame = 0,
  onSelectClip,
  onSelectTrack,
  onMoveClip,
  onMoveClipComplete,
  onMoveClipToTrack,
  onTrimClipStart,
  onTrimClipStartComplete,
  onTrimClipEnd,
  onTrimClipEndComplete,
  onSeekToFrame,
  onToggleTrackMute
}: TimelineClipsProps) {
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragMode, setDragMode] = useState<'move' | 'trim-start' | 'trim-end' | null>(null)
  const dragStartPosRef = useRef<{x: number, y: number} | null>(null)
  const dragStartFrameRef = useRef<number>(0)
  const lastUpdateTimeRef = useRef<number>(0)
  const throttleMs = 100 // 100ms = 10 updates per second
  const draggedClipRef = useRef<Clip | null>(null)
  
  // Handle global pointer events for drag operations
  useEffect(() => {
    if (!draggedClipId || !dragMode) return
    
    const handleGlobalPointerMove = (e: PointerEvent) => {
      const clip = draggedClipRef.current
      if (!clip) return
      
      // Throttle updates for trim operations
      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current
      const shouldThrottle = dragMode === 'trim-start' || dragMode === 'trim-end'
      if (shouldThrottle && timeSinceLastUpdate < throttleMs) {
        return
      }
      
      const deltaX = e.clientX - (dragStartPosRef.current?.x ?? e.clientX)
      const deltaFrames = Math.round((deltaX / pixelsPerSecond) * FPS)
      
      if (dragMode === 'move' && onMoveClip) {
        // Get the timeline container for proper coordinate calculation
        const timelineContainer = document.querySelector('[data-timeline-clips-container]')
        if (!timelineContainer) return
        
        const rect = timelineContainer.getBoundingClientRect()
        const x = e.clientX - rect.left - dragOffset - 70
        let newStartFrame = Math.round(Math.max(0, x / pixelsPerSecond) * FPS)
        
        // Magnetic effect: snap to scrubber, whole seconds, and clip edges
        const magneticRangeFrames = 3
        
        // 1. Snap to scrubber position
        if (Math.abs(newStartFrame - currentFrame) <= magneticRangeFrames) {
          newStartFrame = currentFrame
        } else if (Math.abs((newStartFrame + clip.durationFrames) - currentFrame) <= magneticRangeFrames) {
          newStartFrame = currentFrame - clip.durationFrames
        }
        // 2. Snap to whole seconds
        else {
          const nearestSecondFrame = Math.round(newStartFrame / FPS) * FPS
          if (Math.abs(newStartFrame - nearestSecondFrame) <= magneticRangeFrames) {
            newStartFrame = nearestSecondFrame
          }
          // Also check if clip end would snap to a whole second
          const clipEndFrame = newStartFrame + clip.durationFrames
          const nearestEndSecondFrame = Math.round(clipEndFrame / FPS) * FPS
          if (Math.abs(clipEndFrame - nearestEndSecondFrame) <= magneticRangeFrames) {
            newStartFrame = nearestEndSecondFrame - clip.durationFrames
          }
        }
        
        onMoveClip(clip.id, newStartFrame)
        
        // Update vertical position (track change)
        if (onMoveClipToTrack) {
          const trackElements = document.querySelectorAll('[data-track-index]')
          
          for (const trackEl of trackElements) {
            const trackRect = trackEl.getBoundingClientRect()
            if (e.clientY >= trackRect.top && e.clientY <= trackRect.bottom) {
              const targetTrackIndex = parseInt(trackEl.getAttribute('data-track-index') || '0')
              
              // Check if target track is compatible (video clips can only go to video tracks)
              const targetTrack = tracks.find(t => t.index === targetTrackIndex)
              if (targetTrack && targetTrack.type === 'audio') {
                // Don't allow video clips to be moved to audio tracks
                console.log('Cannot move video clip to audio track')
                break
              }
              
              if (targetTrackIndex !== clip.trackIndex) {
                console.log(`Moving clip from track ${clip.trackIndex} to track ${targetTrackIndex}`)
                onMoveClipToTrack(clip.id, targetTrackIndex)
                // Update the ref so we have the latest track index
                draggedClipRef.current = { ...clip, trackIndex: targetTrackIndex }
                break
              }
            }
          }
        }
      } else if (dragMode === 'trim-start' && onTrimClipStart) {
        let newInFrame = Math.max(0, dragStartFrameRef.current + deltaFrames)
        
        const magneticRangeFrames = 3
        const scrubberOffsetInClip = currentFrame - clip.startFrame
        
        if (Math.abs(newInFrame - scrubberOffsetInClip) <= magneticRangeFrames && scrubberOffsetInClip >= 0) {
          newInFrame = scrubberOffsetInClip
        }
        
        onTrimClipStart(clip.id, newInFrame)
        lastUpdateTimeRef.current = now
      } else if (dragMode === 'trim-end' && onTrimClipEnd) {
        let newOutFrame = Math.max(1, dragStartFrameRef.current + deltaFrames)
        
        const magneticRangeFrames = 3
        const scrubberOffsetInClip = currentFrame - clip.startFrame
        const scrubberOutFrame = (clip.sourceInFrame ?? 0) + scrubberOffsetInClip
        
        if (Math.abs(newOutFrame - scrubberOutFrame) <= magneticRangeFrames && scrubberOffsetInClip >= 0) {
          newOutFrame = scrubberOutFrame
        }
        
        onTrimClipEnd(clip.id, newOutFrame)
        lastUpdateTimeRef.current = now
      }
    }
    
    const handleGlobalPointerUp = (e: PointerEvent) => {
      // Check if it was a click (minimal movement) or drag
      const dragThreshold = 5
      const startPos = dragStartPosRef.current
      const wasDrag = startPos && (
        Math.abs(e.clientX - startPos.x) > dragThreshold ||
        Math.abs(e.clientY - startPos.y) > dragThreshold
      )
      
      if (!wasDrag && dragMode === 'move' && draggedClipId) {
        // It was a click on the main clip - toggle selection
        onSelectClip(draggedClipId === selectedClipId ? null : draggedClipId)
        onSelectTrack(null)
      } else if (wasDrag) {
        // It was a drag - call the complete callback to save history
        if (dragMode === 'move' && onMoveClipComplete) {
          onMoveClipComplete()
          if (draggedClipId !== selectedClipId) {
            onSelectClip(draggedClipId)
          }
        } else if (dragMode === 'trim-start' && onTrimClipStartComplete) {
          onTrimClipStartComplete()
          if (draggedClipId !== selectedClipId) {
            onSelectClip(draggedClipId)
          }
        } else if (dragMode === 'trim-end' && onTrimClipEndComplete) {
          onTrimClipEndComplete()
          if (draggedClipId !== selectedClipId) {
            onSelectClip(draggedClipId)
          }
        }
      }
      
      // Clean up
      dragStartPosRef.current = null
      setDraggedClipId(null)
      setDragMode(null)
      draggedClipRef.current = null
    }
    
    // Add global listeners
    document.addEventListener('pointermove', handleGlobalPointerMove)
    document.addEventListener('pointerup', handleGlobalPointerUp)
    
    return () => {
      document.removeEventListener('pointermove', handleGlobalPointerMove)
      document.removeEventListener('pointerup', handleGlobalPointerUp)
    }
  }, [
    draggedClipId, 
    dragMode, 
    dragOffset, 
    pixelsPerSecond, 
    currentFrame,
    selectedClipId,
    onMoveClip,
    onMoveClipComplete,
    onMoveClipToTrack,
    onTrimClipStart,
    onTrimClipStartComplete,
    onTrimClipEnd,
    onTrimClipEndComplete,
    onSelectClip,
    onSelectTrack
  ])
  
  const handleClipPointerDown = (clip: Clip, e: React.PointerEvent, mode: 'move' | 'trim-start' | 'trim-end') => {
    e.stopPropagation()
    
    // Record start position
    dragStartPosRef.current = { x: e.clientX, y: e.clientY }
    setDragMode(mode)
    setDraggedClipId(clip.id)
    draggedClipRef.current = clip
    
    if (mode === 'move') {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      setDragOffset(clickX)
    } else if (mode === 'trim-start') {
      dragStartFrameRef.current = clip.sourceInFrame ?? 0
    } else if (mode === 'trim-end') {
      dragStartFrameRef.current = clip.sourceOutFrame ?? (clip.originalDurationFrames ?? clip.durationFrames)
    }
    
    // Don't capture pointer - we'll use global document events instead
  }
  
  // Simplified handlers - actual logic is in the global event listeners above
  
  // Handle clicking on empty timeline area to select track and deselect clips
  const handleTrackClick = (trackIndex: number, e: React.MouseEvent) => {
    // Only handle if clicking directly on the track, not on a clip
    if (e.target === e.currentTarget) {
      console.log('Track clicked, selecting track index:', trackIndex)
      onSelectClip(null) // Deselect any selected clip
      onSelectTrack(trackIndex) // Select this track
    }
  }
  
  return (
    <div className="relative" style={{ minHeight: 'calc(100% - 32px)' }} data-timeline-clips-container>
      {/* Render all tracks */}
      {tracks.map((track) => (
        <div 
          key={track.id}
          data-track-index={track.index}
          className={`border-b border-gray-800 relative flex items-center cursor-pointer transition-colors ${
            selectedTrackIndex === track.index && !selectedClipId 
              ? 'bg-gray-800 bg-opacity-50' 
              : 'hover:bg-gray-800 hover:bg-opacity-25'
          }`}
          style={{ height: `${DEFAULT_TRACK_HEIGHT}px` }}
          onClick={(e) => handleTrackClick(track.index, e)}
        >
          <div className="absolute left-2 z-10 flex flex-col items-center" style={{ width: '60px' }}>
            <div 
              className="text-xs text-gray-400 cursor-pointer hover:text-white transition-colors flex items-center gap-1" 
              onClick={(e) => {
                e.stopPropagation() // Prevent triggering the track container click
                console.log('Track label clicked, selecting track index:', track.index)
                onSelectClip(null) // Deselect any clip
                onSelectTrack(track.index) // Select this track
              }}
            >
              {track.type === 'video' ? (
                <Film className="h-3 w-3" />
              ) : (
                <Music className="h-3 w-3" />
              )}
              {track.name}
            </div>
            
            {/* Mute button for audio tracks - below the name, centered */}
            {track.type === 'audio' && onToggleTrackMute && (
              <button
                className="text-gray-400 hover:text-white transition-colors p-0.5 mt-1 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleTrackMute(track.index)
                }}
                title={track.muted ? 'Unmute track' : 'Mute track'}
              >
                {track.muted ? (
                  <VolumeX className="h-4 w-4 text-red-500" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          
          {/* Render clips for this track */}
          {clips.filter(clip => clip.trackIndex === track.index).map((clip) => {
          const isSelected = clip.id === selectedClipId
          const clipX = (clip.startFrame / FPS) * pixelsPerSecond
          const clipWidth = (clip.durationFrames / FPS) * pixelsPerSecond
          
          // Calculate trim indicators
          const originalDuration = clip.originalDurationFrames ?? clip.durationFrames
          const currentInFrame = clip.sourceInFrame ?? 0
          const currentOutFrame = clip.sourceOutFrame ?? originalDuration
          
          // Check if this is a split clip (has -1 or -2 suffix)
          const isSplitClip = clip.id.includes('-1') || clip.id.includes('-2')
          
          const canTrimStart = currentInFrame > 0 // Can extend left
          const canTrimEnd = currentOutFrame < originalDuration // Can extend right
          
          // Only show trim indicators for manually trimmed clips, not split clips
          // And only show when the clip is selected to reduce visual noise
          const trimmedStart = !isSplitClip && currentInFrame > 0 && isSelected
          const trimmedEnd = !isSplitClip && currentOutFrame < originalDuration && isSelected
          
          return (
            <div
              key={clip.id}
              className={`absolute h-16 rounded ${
                isSelected 
                  ? 'ring-2 ring-yellow-500 shadow-lg z-[5]' 
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
            >
              {/* Trim indicators - thin lines only for selected trimmed clips */}
              {trimmedStart && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-yellow-400 opacity-90" />
              )}
              {trimmedEnd && (
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-yellow-400 opacity-90" />
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
      ))}
    </div>
  )
}
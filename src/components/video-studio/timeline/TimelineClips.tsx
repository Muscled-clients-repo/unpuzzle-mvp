'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Clip, Track, FPS, DEFAULT_TRACK_HEIGHT } from '@/lib/video-editor/types'
import { frameToPixel, pixelToFrame, getClipLeftPosition, getClipWidth, getSnappedPosition, getSnapTargets, findTrackFromElement, getNextTrackIndex, findTrackByIndex, getClipsForTrack } from '@/lib/video-editor/utils'
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
  onAddTrack?: (type: 'video' | 'audio', position?: 'above' | 'between' | 'below') => void
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
  onToggleTrackMute,
  onAddTrack
}: TimelineClipsProps) {
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragMode, setDragMode] = useState<'move' | 'trim-start' | 'trim-end' | null>(null)
  const [showNewTrackPreview, setShowNewTrackPreview] = useState(false)
  const [previewTrackType, setPreviewTrackType] = useState<'video' | 'audio'>('video')
  const [previewPosition, setPreviewPosition] = useState<'above' | 'between' | 'below'>('below')
  const [previewClipPosition, setPreviewClipPosition] = useState<number>(0) // Frame position for clip in preview track
  const lastPreviewStateRef = useRef<{show: boolean, type: 'video' | 'audio', position: 'above' | 'between' | 'below'}>({
    show: false, type: 'video', position: 'below'
  })
  const dragStartPosRef = useRef<{x: number, y: number} | null>(null)
  const dragStartFrameRef = useRef<number>(0)
  const lastUpdateTimeRef = useRef<number>(0)
  const throttleMs = 100 // 100ms = 10 updates per second
  const draggedClipRef = useRef<Clip | null>(null)
  
  // Helper function to update preview state only when necessary
  const updatePreviewState = (shouldShow: boolean, type: 'video' | 'audio' = 'video', position: 'above' | 'between' | 'below' = 'below') => {
    const lastState = lastPreviewStateRef.current
    const stateChanged = lastState.show !== shouldShow || 
                        lastState.type !== type || 
                        lastState.position !== position
    
    if (stateChanged) {
      lastPreviewStateRef.current = { show: shouldShow, type, position }
      setShowNewTrackPreview(shouldShow)
      if (shouldShow) {
        setPreviewTrackType(type)
        setPreviewPosition(position)
      }
    }
  }
  
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
      const deltaFrames = pixelToFrame(deltaX, pixelsPerSecond) - pixelToFrame(0, pixelsPerSecond)
      
      if (dragMode === 'move' && onMoveClip) {
        // Get the timeline container for proper coordinate calculation
        const timelineContainer = document.querySelector('[data-timeline-clips-container]')
        if (!timelineContainer) return
        
        const rect = timelineContainer.getBoundingClientRect()
        const x = e.clientX - rect.left - dragOffset - 70
        let newStartFrame = Math.max(0, pixelToFrame(x, pixelsPerSecond))
        
        // Magnetic effect: snap to scrubber, whole seconds, and clip edges
        const snapTargets = getSnapTargets(clips, currentFrame, clip.id)
        
        // Check snap for clip start position
        const snappedStart = getSnappedPosition(newStartFrame, snapTargets)
        if (snappedStart !== newStartFrame) {
          newStartFrame = snappedStart
        } else {
          // Check snap for clip end position
          const clipEndFrame = newStartFrame + clip.durationFrames
          const snappedEnd = getSnappedPosition(clipEndFrame, snapTargets)
          if (snappedEnd !== clipEndFrame) {
            newStartFrame = snappedEnd - clip.durationFrames
          }
        }
        
        // Store the calculated position for preview track rendering
        setPreviewClipPosition(newStartFrame)
        
        // Only update clip position if not showing preview track
        if (!showNewTrackPreview) {
          onMoveClip(clip.id, newStartFrame)
        }
        
        // Update vertical position (track change and new track preview)
        if (onMoveClipToTrack) {
          // Check if mouse is over a preview track first
          const previewTrackElements = document.querySelectorAll('[data-preview-track="true"]')
          let isOverPreviewTrack = false
          
          for (const previewEl of previewTrackElements) {
            const previewRect = previewEl.getBoundingClientRect()
            if (e.clientY >= previewRect.top && e.clientY <= previewRect.bottom) {
              isOverPreviewTrack = true
              break
            }
          }
          
          // If over preview track, just maintain current preview state and return
          if (isOverPreviewTrack) {
            return
          }
          
          // Only query actual track elements, not preview tracks
          const trackElements = document.querySelectorAll('[data-track-index]:not([data-preview-track])')
          let foundExistingTrack = false
          
          // Check if dragging over existing tracks
          for (const trackEl of trackElements) {
            const trackRect = trackEl.getBoundingClientRect()
            if (e.clientY >= trackRect.top && e.clientY <= trackRect.bottom) {
              foundExistingTrack = true
              const targetTrackIndex = parseInt(trackEl.getAttribute('data-track-index') || '0')
              
              // Check if target track is compatible (video clips can only go to video tracks)
              const targetTrack = findTrackByIndex(tracks, targetTrackIndex)
              const draggedClipTrack = findTrackByIndex(tracks, clip.trackIndex)
              
              if (targetTrack && draggedClipTrack && 
                  targetTrack.type === 'audio' && draggedClipTrack.type === 'video') {
                // Video clip over audio track - show V2 preview between video and audio tracks
                updatePreviewState(true, 'video', 'between')
                break
              } else if (targetTrack && targetTrack.type === draggedClipTrack?.type) {
                // Compatible track types - allow normal move
                if (targetTrackIndex !== clip.trackIndex) {
                  onMoveClipToTrack(clip.id, targetTrackIndex)
                  // Update the ref so we have the latest track index
                  draggedClipRef.current = { ...clip, trackIndex: targetTrackIndex }
                  break
                }
              }
            }
          }
          
          // Hide preview only if over compatible existing track
          if (foundExistingTrack && showNewTrackPreview) {
            const targetTrackElement = Array.from(trackElements).find(trackEl => {
              const trackRect = trackEl.getBoundingClientRect()
              return e.clientY >= trackRect.top && e.clientY <= trackRect.bottom
            })
            
            if (targetTrackElement) {
              const targetTrackIndex = parseInt(targetTrackElement.getAttribute('data-track-index') || '0')
              const targetTrack = findTrackByIndex(tracks, targetTrackIndex)
              const draggedClipTrack = findTrackByIndex(tracks, clip.trackIndex)
              
              // Hide preview only if hovering over compatible track
              if (targetTrack && draggedClipTrack && targetTrack.type === draggedClipTrack.type) {
                updatePreviewState(false)
              }
            }
          }
          
          // Check if dragging below video tracks to create new video track
          if (!foundExistingTrack && trackElements.length > 0) {
            const draggedClipTrack = findTrackByIndex(tracks, clip.trackIndex)
            
            // Only allow creating new video tracks from video clips
            if (draggedClipTrack?.type === 'video') {
              // Find all video tracks and get the last one
              const videoTracks = tracks.filter(t => t.type === 'video').sort((a, b) => a.index - b.index)
              
              if (videoTracks.length > 0) {
                const lastVideoTrack = videoTracks[videoTracks.length - 1]
                
                // Find the DOM element for the last video track
                const lastVideoTrackElement = Array.from(trackElements).find(el => 
                  parseInt(el.getAttribute('data-track-index') || '0') === lastVideoTrack.index
                )
                
                if (lastVideoTrackElement) {
                  const lastVideoRect = lastVideoTrackElement.getBoundingClientRect()
                  // Add small buffer to make it easier to trigger
                  const draggedBelowLastVideo = e.clientY > (lastVideoRect.bottom - 10)
                  
                  if (draggedBelowLastVideo) {
                    // Check if we're not over an audio track
                    const audioTracks = tracks.filter(t => t.type === 'audio')
                    let overAudioTrack = false
                    
                    for (const audioTrack of audioTracks) {
                      const audioTrackElement = Array.from(trackElements).find(el => 
                        parseInt(el.getAttribute('data-track-index') || '0') === audioTrack.index
                      )
                      if (audioTrackElement) {
                        const audioRect = audioTrackElement.getBoundingClientRect()
                        if (e.clientY >= audioRect.top && e.clientY <= audioRect.bottom) {
                          overAudioTrack = true
                          break
                        }
                      }
                    }
                    
                    if (!overAudioTrack) {
                      updatePreviewState(true, 'video', 'below')
                    } else {
                      updatePreviewState(false)
                    }
                  } else {
                    updatePreviewState(false)
                  }
                }
              }
            } else {
              // Audio clips or other types - hide preview
              updatePreviewState(false)
            }
          }
        }
      } else if (dragMode === 'trim-start' && onTrimClipStart) {
        let newInFrame = Math.max(0, dragStartFrameRef.current + deltaFrames)
        
        const scrubberOffsetInClip = currentFrame - clip.startFrame
        
        if (scrubberOffsetInClip >= 0) {
          const snappedInFrame = getSnappedPosition(newInFrame, [scrubberOffsetInClip])
          newInFrame = snappedInFrame
        }
        
        onTrimClipStart(clip.id, newInFrame)
        lastUpdateTimeRef.current = now
      } else if (dragMode === 'trim-end' && onTrimClipEnd) {
        let newOutFrame = Math.max(1, dragStartFrameRef.current + deltaFrames)
        
        const scrubberOffsetInClip = currentFrame - clip.startFrame
        const scrubberOutFrame = (clip.sourceInFrame ?? 0) + scrubberOffsetInClip
        
        if (scrubberOffsetInClip >= 0) {
          const snappedOutFrame = getSnappedPosition(newOutFrame, [scrubberOutFrame])
          newOutFrame = snappedOutFrame
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
        // Handle new track creation if dropping on preview
        if (dragMode === 'move' && showNewTrackPreview && onAddTrack && onMoveClipToTrack && draggedClipId) {
          
          // Get the clip being dragged
          const draggedClip = draggedClipRef.current
          if (!draggedClip) return
          
          // Use the preview clip position that was calculated during drag
          const dropStartFrame = previewClipPosition
          
          // Store current track indices to find the new one
          const currentTrackIndices = tracks.map(t => t.index)
          
          // Create the new track
          onAddTrack(previewTrackType, previewPosition)
          
          // Wait for track creation, then move clip to the newly created track
          setTimeout(() => {
            // The new video track will have been inserted at the end of video tracks
            // Find all video tracks and get the one with the highest index
            const videoTracks = tracks.filter(t => t.type === 'video')
            const maxVideoTrackIndex = Math.max(...videoTracks.map(t => t.index))
            
            // But we need to get the updated tracks after the new one was added
            // Since we can't access the updated tracks state here, let's find it from DOM
            const trackElements = document.querySelectorAll('[data-track-index]')
            let highestVideoTrackIndex = -1
            
            for (const trackEl of trackElements) {
              const trackIndex = parseInt(trackEl.getAttribute('data-track-index') || '0')
              
              // Check if this track has a video track label (V1, V2, etc.)
              const trackLabels = trackEl.querySelectorAll('.text-gray-400')
              for (const label of trackLabels) {
                if (label.textContent && label.textContent.match(/^V\d+$/)) {
                  highestVideoTrackIndex = Math.max(highestVideoTrackIndex, trackIndex)
                  break
                }
              }
            }
            
            
            if (highestVideoTrackIndex >= 0) {
              
              // Move clip to the new video track
              onMoveClipToTrack(draggedClipId, highestVideoTrackIndex)
              
              // Position the clip at the drop location
              onMoveClip?.(draggedClipId, dropStartFrame)
            } else {
            }
          }, 200)
        }
        
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
      setShowNewTrackPreview(false)
      setPreviewPosition('below')
      setPreviewClipPosition(0)
      lastPreviewStateRef.current = { show: false, type: 'video', position: 'below' }
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
    tracks,
    showNewTrackPreview,
    previewTrackType,
    previewPosition,
    previewClipPosition,
    onMoveClip,
    onMoveClipComplete,
    onMoveClipToTrack,
    onTrimClipStart,
    onTrimClipStartComplete,
    onTrimClipEnd,
    onTrimClipEndComplete,
    onSelectClip,
    onSelectTrack,
    onAddTrack
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
      onSelectClip(null) // Deselect any selected clip
      onSelectTrack(trackIndex) // Select this track
    }
  }
  
  return (
    <div className="relative" style={{ minHeight: 'calc(100% - 32px)' }} data-timeline-clips-container>
      {/* Render all tracks with preview track inserted in correct position */}
      {tracks.map((track, index) => {
        // Check if we should insert preview track before this track (between video and audio)
        const shouldInsertPreviewBetween = showNewTrackPreview && 
          previewPosition === 'between' &&
          previewTrackType === 'video' && 
          track.type === 'audio' && 
          index === tracks.findIndex(t => t.type === 'audio')
        
        return (
          <React.Fragment key={track.id}>
            {/* Insert preview track between video and audio tracks */}
            {shouldInsertPreviewBetween && (
              <div 
                className="border-b border-gray-600 border-dashed relative flex items-center bg-gray-800 bg-opacity-30 transition-all duration-200"
                style={{ height: `${DEFAULT_TRACK_HEIGHT}px` }}
                data-preview-track="true"
              >
                <div className="absolute left-2 z-10 flex flex-col items-center" style={{ width: '60px' }}>
                  <div className="text-xs text-gray-400 flex items-center gap-1 opacity-75">
                    <Film className="h-3 w-3" />
                    V{tracks.filter(t => t.type === 'video').length + 1}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">(new)</div>
                </div>
                
                {/* Dotted line to indicate it's a preview */}
                <div className="absolute inset-0 border-2 border-yellow-400 border-dashed opacity-50 rounded"></div>
                
                {/* Show dragged clip in preview track position */}
                {draggedClipId && dragMode === 'move' && (
                  <div
                    className="absolute h-16 rounded opacity-80"
                    style={{
                      left: frameToPixel(previewClipPosition, pixelsPerSecond) + 70,
                      width: frameToPixel(draggedClipRef.current?.durationFrames || 0, pixelsPerSecond),
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: '2px solid #fbbf24'
                    }}
                  >
                    <div className="p-1 text-xs text-white truncate select-none pointer-events-none">
                      Moving to V{tracks.filter(t => t.type === 'video').length + 1}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Render the actual track */}
            <div 
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
          {getClipsForTrack(clips, track.index).map((clip) => {
          const isSelected = clip.id === selectedClipId
          const clipX = getClipLeftPosition(clip, pixelsPerSecond)
          const clipWidth = getClipWidth(clip, pixelsPerSecond)
          
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
              } ${draggedClipId === clip.id && dragMode === 'move' && showNewTrackPreview ? 'opacity-20' : draggedClipId === clip.id && dragMode === 'move' ? 'opacity-50' : ''}`}
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
          </React.Fragment>
        )
      })}
      
      {/* Preview track for new track creation (at the end) */}
      {showNewTrackPreview && previewPosition === 'below' && (
        <div 
          className="border-b border-gray-600 border-dashed relative flex items-center bg-gray-800 bg-opacity-30 transition-all duration-200"
          style={{ height: `${DEFAULT_TRACK_HEIGHT}px` }}
          data-preview-track="true"
        >
          <div className="absolute left-2 z-10 flex flex-col items-center" style={{ width: '60px' }}>
            <div className="text-xs text-gray-400 flex items-center gap-1 opacity-75">
              {previewTrackType === 'video' ? <Film className="h-3 w-3" /> : <Music className="h-3 w-3" />}
              {previewTrackType === 'video' ? `V${tracks.filter(t => t.type === 'video').length + 1}` : `A${tracks.filter(t => t.type === 'audio').length + 1}`}
            </div>
            <div className="text-xs text-gray-500 mt-1">(new)</div>
          </div>
          
          {/* Dotted line to indicate it's a preview */}
          <div className="absolute inset-0 border-2 border-yellow-400 border-dashed opacity-50 rounded"></div>
          
          {/* Show dragged clip in preview track position */}
          {draggedClipId && dragMode === 'move' && (
            <div
              className="absolute h-16 rounded opacity-80"
              style={{
                left: frameToPixel(previewClipPosition, pixelsPerSecond) + 70,
                width: frameToPixel(draggedClipRef.current?.durationFrames || 0, pixelsPerSecond),
                background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                top: '50%',
                transform: 'translateY(-50%)',
                border: '2px solid #fbbf24'
              }}
            >
              <div className="p-1 text-xs text-white truncate select-none pointer-events-none">
                Moving to {previewTrackType === 'video' ? `V${tracks.filter(t => t.type === 'video').length + 1}` : `A${tracks.filter(t => t.type === 'audio').length + 1}`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
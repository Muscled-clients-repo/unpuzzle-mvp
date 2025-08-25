'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Clip, FPS } from './types'
import { frameToTime } from './utils'
import { VirtualTimelineEngine, TimelineSegment } from './VirtualTimelineEngine'
import { useRecording } from './useRecording'
import { HistoryManager } from './HistoryManager'

export function useVideoEditor() {
  // State
  const [clips, setClips] = useState<Clip[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [visualFrame, setVisualFrame] = useState(0) // Throttled frame for smooth UI
  const [isPlaying, setIsPlaying] = useState(false)
  const [totalFrames, setTotalFrames] = useState(0)
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const engineRef = useRef<VirtualTimelineEngine | null>(null)
  const lastVisualUpdateRef = useRef<number>(0)
  const historyRef = useRef<HistoryManager>(new HistoryManager())

  // Initialize virtual timeline engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new VirtualTimelineEngine()
      
      // Set callbacks
      engineRef.current.setCallbacks({
        onFrameUpdate: (frame) => {
          setCurrentFrame(frame) // Always update precise frame
          
          // Throttle visual updates to 30 FPS (33ms)
          const now = Date.now()
          if (now - lastVisualUpdateRef.current >= 33) {
            setVisualFrame(frame)
            lastVisualUpdateRef.current = now
          }
        },
        onPlayStateChange: (playing) => setIsPlaying(playing)
      })
    }
    
    // Set video element
    if (videoRef.current) {
      engineRef.current.setVideoElement(videoRef.current)
    }
    
    return () => {
      engineRef.current?.destroy()
      engineRef.current = null
    }
  }, [])
  
  // Initialize history with empty state
  useEffect(() => {
    historyRef.current.initialize([], 0)
  }, [])
  
  // Convert clips to segments whenever clips change
  useEffect(() => {
    if (!engineRef.current) return
    
    // Convert clips to timeline segments
    const segments: TimelineSegment[] = clips.map(clip => ({
      id: clip.id,
      startFrame: clip.startFrame,
      endFrame: clip.startFrame + clip.durationFrames,
      sourceUrl: clip.url,
      sourceInFrame: clip.sourceInFrame ?? 0,  // Use trim points if available
      sourceOutFrame: clip.sourceOutFrame ?? (clip.originalDurationFrames ?? clip.durationFrames)
    }))
    
    engineRef.current.setSegments(segments)
  }, [clips])
  
  // Recording hook integration
  const handleClipCreated = useCallback((clip: Clip) => {
    setClips(prev => {
      const newClips = [...prev, clip]
      // Save history immediately when adding a clip
      historyRef.current.saveState(newClips, Math.max(totalFrames, clip.startFrame + clip.durationFrames), 'Add recording')
      return newClips
    })
    setTotalFrames(prev => Math.max(prev, clip.startFrame + clip.durationFrames))
  }, [totalFrames])
  
  const handleTotalFramesUpdate = useCallback((frames: number) => {
    setTotalFrames(frames)
  }, [])
  
  const { isRecording, startRecording, stopRecording } = useRecording({
    totalFrames,
    onClipCreated: handleClipCreated,
    onTotalFramesUpdate: handleTotalFramesUpdate
  })
  
  // Find clip at given frame (kept for compatibility)
  const getCurrentClip = useCallback((frame: number): Clip | null => {
    return clips.find(clip => 
      frame >= clip.startFrame && 
      frame < clip.startFrame + clip.durationFrames
    ) || null
  }, [clips])


  // Play/Pause using virtual timeline
  const play = useCallback(() => {
    // Allow playing even without clips - scrubber will move through empty timeline
    engineRef.current?.play()
  }, [])

  const pause = useCallback(() => {
    engineRef.current?.pause()
  }, [])

  // Refs for debounced seeking
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSeekFrameRef = useRef<number | null>(null)
  
  // Seek to frame using virtual timeline
  const seekToFrame = useCallback((frame: number, immediate = false) => {
    setVisualFrame(frame) // Update visual immediately for responsive UI
    
    if (immediate) {
      // For operations that need immediate seek (like clicking)
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current)
        seekTimeoutRef.current = null
      }
      engineRef.current?.seekToFrame(frame)
    } else {
      // Debounced seek for dragging operations
      pendingSeekFrameRef.current = frame
      
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current)
      }
      
      seekTimeoutRef.current = setTimeout(() => {
        if (pendingSeekFrameRef.current !== null) {
          engineRef.current?.seekToFrame(pendingSeekFrameRef.current)
          pendingSeekFrameRef.current = null
        }
        seekTimeoutRef.current = null
      }, 50) // 50ms debounce - seek only after mouse stops briefly
    }
  }, [])
  
  // Move clip to new position (live update during drag)
  const moveClip = useCallback((clipId: string, newStartFrame: number) => {
    setClips(prevClips => {
      const clipIndex = prevClips.findIndex(c => c.id === clipId)
      if (clipIndex === -1) return prevClips
      
      const clip = prevClips[clipIndex]
      const updatedClip = {
        ...clip,
        startFrame: newStartFrame
      }
      
      const newClips = [...prevClips]
      newClips[clipIndex] = updatedClip
      
      // Update totalFrames if clip extends beyond current total
      const clipEndFrame = newStartFrame + clip.durationFrames
      setTotalFrames(prev => Math.max(prev, clipEndFrame))
      
      return newClips
    })
  }, [])
  
  // Move clip complete (save history on drag end)  
  const moveClipComplete = useCallback(() => {
    // Just save the current state - the move has already been applied
    historyRef.current.saveState(clips, totalFrames, 'Move clip')
  }, [clips, totalFrames])
  
  // Delete a clip by ID (saves history immediately - not a drag operation)
  const deleteClip = useCallback((clipId: string) => {
    setClips(prevClips => {
      const updatedClips = prevClips.filter(c => c.id !== clipId)
      
      // Recalculate total frames after deletion
      const newTotalFrames = updatedClips.reduce((max, clip) => 
        Math.max(max, clip.startFrame + clip.durationFrames), 0
      )
      setTotalFrames(newTotalFrames)
      
      // Save history immediately for delete (not a continuous operation)
      historyRef.current.saveState(updatedClips, newTotalFrames, 'Delete clip')
      
      // Revoke the blob URL of deleted clip
      const deletedClip = prevClips.find(c => c.id === clipId)
      if (deletedClip) {
        URL.revokeObjectURL(deletedClip.url)
      }
      
      return updatedClips
    })
  }, [])
  
  // Trim the start of a clip (live update during drag)
  const trimClipStart = useCallback((clipId: string, newStartOffset: number) => {
    setClips(prevClips => {
      const clipIndex = prevClips.findIndex(c => c.id === clipId)
      if (clipIndex === -1) return prevClips
      
      const clip = prevClips[clipIndex]
      const originalDuration = clip.originalDurationFrames ?? clip.durationFrames
      
      // Ensure we don't trim beyond the clip's end
      const maxTrim = originalDuration - 1 // Keep at least 1 frame
      const clampedOffset = Math.max(0, Math.min(maxTrim, newStartOffset))
      
      // Calculate new values
      const newSourceInFrame = clampedOffset === 0 ? undefined : clampedOffset
      const newDurationFrames = (clip.sourceOutFrame ?? originalDuration) - clampedOffset
      
      // Keep the clip at its current position - trim only affects content, not position
      const updatedClip = {
        ...clip,
        sourceInFrame: newSourceInFrame,
        durationFrames: newDurationFrames
        // startFrame stays the same - position doesn't change
      }
      
      const newClips = [...prevClips]
      newClips[clipIndex] = updatedClip
      
      return newClips
    })
  }, [])
  
  // Trim start complete (save history on drag end)
  const trimClipStartComplete = useCallback(() => {
    // Just save the current state - the trim has already been applied
    historyRef.current.saveState(clips, totalFrames, 'Trim clip start')
  }, [clips, totalFrames])
  
  // Trim the end of a clip (live update during drag)
  const trimClipEnd = useCallback((clipId: string, newEndOffset: number) => {
    setClips(prevClips => {
      const clipIndex = prevClips.findIndex(c => c.id === clipId)
      if (clipIndex === -1) return prevClips
      
      const clip = prevClips[clipIndex]
      const originalDuration = clip.originalDurationFrames ?? clip.durationFrames
      
      // Ensure we don't trim beyond the clip's start
      const currentInFrame = clip.sourceInFrame ?? 0
      const minOutFrame = currentInFrame + 1 // Keep at least 1 frame
      const clampedOutFrame = Math.max(minOutFrame, Math.min(originalDuration, newEndOffset))
      
      // Calculate new duration
      const newDurationFrames = clampedOutFrame - currentInFrame
      
      // If extending back to original, clear sourceOutFrame
      const updatedClip = {
        ...clip,
        sourceOutFrame: clampedOutFrame === originalDuration ? undefined : clampedOutFrame,
        durationFrames: newDurationFrames
      }
      
      const newClips = [...prevClips]
      newClips[clipIndex] = updatedClip
      
      return newClips
    })
  }, [])
  
  // Trim end complete (save history on drag end)
  const trimClipEndComplete = useCallback(() => {
    // Just save the current state - the trim has already been applied
    historyRef.current.saveState(clips, totalFrames, 'Trim clip end')
  }, [clips, totalFrames])
  
  // Split clip at specific frame (saves history immediately - not a drag operation)
  const splitClip = useCallback((clipId: string, splitFrame: number) => {
    setClips(prevClips => {
      const clipIndex = prevClips.findIndex(c => c.id === clipId)
      if (clipIndex === -1) return prevClips
      
      const clip = prevClips[clipIndex]
      
      // Don't split if frame is outside clip bounds
      if (splitFrame <= clip.startFrame || splitFrame >= clip.startFrame + clip.durationFrames) {
        return prevClips
      }
      
      // Calculate split point within the clip
      const splitPoint = splitFrame - clip.startFrame
      
      // Get the source frame positions (handle clips that are already trimmed)
      const sourceInFrame = clip.sourceInFrame ?? 0
      const sourceOutFrame = clip.sourceOutFrame ?? clip.durationFrames
      
      // Create two new clips from the original
      const firstClip: Clip = {
        ...clip,
        id: `${clip.id}-1`,
        durationFrames: splitPoint,
        originalDurationFrames: clip.originalDurationFrames ?? clip.durationFrames,
        sourceInFrame: sourceInFrame,
        sourceOutFrame: sourceInFrame + splitPoint
      }
      
      const secondClip: Clip = {
        ...clip,
        id: `${clip.id}-2`,
        startFrame: splitFrame,
        durationFrames: clip.durationFrames - splitPoint,
        originalDurationFrames: clip.originalDurationFrames ?? clip.durationFrames,
        sourceInFrame: sourceInFrame + splitPoint,
        sourceOutFrame: sourceOutFrame
      }
      
      // Replace original clip with two new clips
      const newClips = [...prevClips]
      newClips.splice(clipIndex, 1, firstClip, secondClip)
      
      // Save history immediately for split (not a continuous operation)
      historyRef.current.saveState(newClips, totalFrames, 'Split clip')
      
      return newClips
    })
  }, [totalFrames])

  // Undo function
  const undo = useCallback(() => {
    const previousState = historyRef.current.undo()
    if (previousState) {
      setClips(previousState.clips)
      setTotalFrames(previousState.totalFrames)
    }
  }, [])
  
  // Redo function
  const redo = useCallback(() => {
    const nextState = historyRef.current.redo()
    if (nextState) {
      setClips(nextState.clips)
      setTotalFrames(nextState.totalFrames)
    }
  }, [])
  
  // Check if undo/redo available
  const canUndo = useCallback(() => historyRef.current.canUndo(), [])
  const canRedo = useCallback(() => historyRef.current.canRedo(), [])

  // No longer need video event listeners - virtual timeline handles everything!

  // Cleanup blob URLs only on unmount
  useEffect(() => {
    return () => {
      // Only cleanup when component unmounts, not on clips change
      clips.forEach(clip => URL.revokeObjectURL(clip.url))
    }
  }, []) // Empty deps - only runs on unmount

  return {
    // State
    clips,
    currentFrame,      // Precise frame for editing operations
    visualFrame,       // Throttled frame for smooth UI
    isPlaying,
    isRecording,
    totalFrames,
    videoRef,
    
    // Actions
    startRecording,
    stopRecording,
    play,
    pause,
    seekToFrame,
    splitClip,
    trimClipStart,
    trimClipStartComplete,
    trimClipEnd,
    trimClipEndComplete,
    moveClip,
    moveClipComplete,
    deleteClip,
    
    // Undo/Redo
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Utilities
    getCurrentClip
  }
}
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Clip, Track, FPS } from './types'
import { frameToTime } from './utils'
import { VirtualTimelineEngine, TimelineSegment } from './VirtualTimelineEngine'
import { useRecording } from './useRecording'
import { HistoryManager } from './HistoryManager'

export function useVideoEditor() {
  // State
  const [clips, setClips] = useState<Clip[]>([])
  const [tracks, setTracks] = useState<Track[]>([
    { id: 'track-0', index: 0, name: 'V1', type: 'video', visible: true, locked: false },
    { id: 'track-1', index: 1, name: 'A1', type: 'audio', visible: true, locked: false, muted: false }
  ])
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number | null>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [visualFrame, setVisualFrame] = useState(0) // Throttled frame for smooth UI
  const [isPlaying, setIsPlaying] = useState(false)
  const [totalFrames, setTotalFrames] = useState(0)
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const engineRef = useRef<VirtualTimelineEngine | null>(null)
  const lastVisualUpdateRef = useRef<number>(0)
  const historyRef = useRef<HistoryManager>(new HistoryManager())
  
  // Refs for current state to avoid stale closures in callbacks
  const clipsRef = useRef<Clip[]>([])
  const totalFramesRef = useRef<number>(0)
  
  // Custom setters that update refs synchronously
  const setClipsWithRef = useCallback((newClips: Clip[] | ((prev: Clip[]) => Clip[])) => {
    setClips(prev => {
      const updated = typeof newClips === 'function' ? newClips(prev) : newClips
      clipsRef.current = updated // Update ref synchronously
      return updated
    })
  }, [])
  
  const setTotalFramesWithRef = useCallback((newFrames: number | ((prev: number) => number)) => {
    setTotalFrames(prev => {
      const updated = typeof newFrames === 'function' ? newFrames(prev) : newFrames
      totalFramesRef.current = updated // Update ref synchronously
      return updated
    })
  }, [])

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
  
  // Store recording data for later processing
  const recordingDataRef = useRef<{ clipId: string; blob: Blob; durationMs: number } | null>(null)

  // Recording hook integration
  const handleClipCreated = useCallback((clip: Clip, blob: Blob, durationMs: number) => {
    // Store recording data for parent component to access
    recordingDataRef.current = { clipId: clip.id, blob, durationMs }

    // Add clip to timeline immediately with blob URL
    setClipsWithRef(prev => {
      const newClips = [...prev, clip]
      // Save history immediately when adding a clip
      historyRef.current.saveState(newClips, Math.max(totalFramesRef.current, clip.startFrame + clip.durationFrames), 'Add recording')
      return newClips
    })
    setTotalFramesWithRef(prev => Math.max(prev, clip.startFrame + clip.durationFrames))
  }, [])
  
  const handleTotalFramesUpdate = useCallback((frames: number) => {
    setTotalFramesWithRef(frames)
  }, [])
  
  const { isRecording, startRecording, stopRecording } = useRecording({
    totalFrames,
    selectedClipId,
    selectedTrackIndex,
    clips,
    tracks,
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
    setClipsWithRef(prevClips => {
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
      setTotalFramesWithRef(prev => Math.max(prev, clipEndFrame))
      
      return newClips
    })
  }, [])
  
  // Move clip complete (save history on drag end)  
  const moveClipComplete = useCallback(() => {
    // Just save the current state - the move has already been applied
    historyRef.current.saveState(clipsRef.current, totalFramesRef.current, 'Move clip')
  }, [])
  
  // Delete a clip by ID (saves history immediately - not a drag operation)
  const deleteClip = useCallback((clipId: string) => {
    setClipsWithRef(prevClips => {
      const updatedClips = prevClips.filter(c => c.id !== clipId)
      
      // Recalculate total frames after deletion
      const newTotalFrames = updatedClips.reduce((max, clip) => 
        Math.max(max, clip.startFrame + clip.durationFrames), 0
      )
      setTotalFramesWithRef(newTotalFrames)
      
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

  // Update clip URL (used to replace blob URL with CDN URL after saving recording)
  const updateClipUrl = useCallback((clipId: string, newUrl: string) => {
    setClipsWithRef(prevClips => {
      const clipIndex = prevClips.findIndex(c => c.id === clipId)
      if (clipIndex === -1) return prevClips

      const updatedClips = [...prevClips]
      updatedClips[clipIndex] = {
        ...updatedClips[clipIndex],
        url: newUrl
      }

      console.log(`✅ Updated clip ${clipId} URL to CDN URL`)
      return updatedClips
    })
  }, [])

  // Get latest recording data
  const getLatestRecording = useCallback(() => {
    const data = recordingDataRef.current
    recordingDataRef.current = null // Clear after reading
    return data
  }, [])

  // Trim the start of a clip (live update during drag)
  const trimClipStart = useCallback((clipId: string, newStartOffset: number) => {
    setClipsWithRef(prevClips => {
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
    historyRef.current.saveState(clipsRef.current, totalFramesRef.current, 'Trim clip start')
  }, [])
  
  // Trim the end of a clip (live update during drag)
  const trimClipEnd = useCallback((clipId: string, newEndOffset: number) => {
    setClipsWithRef(prevClips => {
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
    historyRef.current.saveState(clipsRef.current, totalFramesRef.current, 'Trim clip end')
  }, [])
  
  // Split clip at specific frame (saves history immediately - not a drag operation)
  const splitClip = useCallback((clipId: string, splitFrame: number) => {
    setClipsWithRef(prevClips => {
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
      historyRef.current.saveState(newClips, totalFramesRef.current, 'Split clip')
      
      // Auto-select the left (first) clip after splitting
      // Using setTimeout to ensure state update completes first
      setTimeout(() => {
        console.log('Setting selected clip after split:', firstClip.id)
        setSelectedClipId(firstClip.id)
      }, 0)
      
      return newClips
    })
  }, [setSelectedClipId])

  // Trim left side of selected clip (E key) - remove everything before current frame
  const trimClipLeft = useCallback((clipId: string, currentFrame: number) => {
    setClipsWithRef(prevClips => {
      const clipIndex = prevClips.findIndex(c => c.id === clipId)
      if (clipIndex === -1) return prevClips
      
      const clip = prevClips[clipIndex]
      
      // Don't trim if frame is outside or at the edges
      if (currentFrame <= clip.startFrame || currentFrame >= clip.startFrame + clip.durationFrames) {
        return prevClips
      }
      
      // Calculate how much to trim from the start
      const framesToTrim = currentFrame - clip.startFrame
      const sourceInFrame = clip.sourceInFrame ?? 0
      
      const updatedClip: Clip = {
        ...clip,
        startFrame: currentFrame,
        durationFrames: clip.durationFrames - framesToTrim,
        sourceInFrame: sourceInFrame + framesToTrim
      }
      
      const newClips = [...prevClips]
      newClips[clipIndex] = updatedClip
      
      // Save history
      historyRef.current.saveState(newClips, totalFramesRef.current, 'Trim clip left')
      
      return newClips
    })
  }, [])

  // Trim right side of selected clip (R key) - remove everything after current frame  
  const trimClipRight = useCallback((clipId: string, currentFrame: number) => {
    setClipsWithRef(prevClips => {
      const clipIndex = prevClips.findIndex(c => c.id === clipId)
      if (clipIndex === -1) return prevClips
      
      const clip = prevClips[clipIndex]
      
      // Don't trim if frame is outside or at the edges
      if (currentFrame <= clip.startFrame || currentFrame >= clip.startFrame + clip.durationFrames) {
        return prevClips
      }
      
      // Calculate new duration up to current frame
      const newDuration = currentFrame - clip.startFrame
      const sourceInFrame = clip.sourceInFrame ?? 0
      
      const updatedClip: Clip = {
        ...clip,
        durationFrames: newDuration,
        sourceOutFrame: sourceInFrame + newDuration
      }
      
      const newClips = [...prevClips]
      newClips[clipIndex] = updatedClip
      
      // Save history
      historyRef.current.saveState(newClips, totalFramesRef.current, 'Trim clip right')
      
      return newClips
    })
  }, [])

  // Undo function
  const undo = useCallback(() => {
    const previousState = historyRef.current.undo()
    if (previousState) {
      setClipsWithRef(previousState.clips)
      setTotalFramesWithRef(previousState.totalFrames)
    }
  }, [])
  
  // Redo function
  const redo = useCallback(() => {
    const nextState = historyRef.current.redo()
    if (nextState) {
      setClipsWithRef(nextState.clips)
      setTotalFramesWithRef(nextState.totalFrames)
    }
  }, [])
  
  // Check if undo/redo available
  const canUndo = useCallback(() => historyRef.current.canUndo(), [])
  const canRedo = useCallback(() => historyRef.current.canRedo(), [])

  // No longer need video event listeners - virtual timeline handles everything!
  
  // Track management functions
  const addTrack = useCallback((type: 'video' | 'audio' = 'video', position?: 'above' | 'between' | 'below') => {
    setTracks(prev => {
      // Get video and audio tracks separately, sorted by index
      const videoTracks = prev.filter(t => t.type === 'video').sort((a, b) => a.index - b.index)
      const audioTracks = prev.filter(t => t.type === 'audio').sort((a, b) => a.index - b.index)
      
      let newTracks: Track[]
      
      // Insert new track based on position
      if (position === 'between' || !position) {
        // Insert between video and audio tracks (for video tracks) or at appropriate position
        if (type === 'video') {
          newTracks = [videoTracks, audioTracks].flat()
          // Insert new video track at the end of video tracks (before audio)
          const insertIndex = videoTracks.length
          newTracks.splice(insertIndex, 0, { 
            id: `track-temp`,
            index: -1,
            name: '',
            type, 
            visible: true, 
            locked: false
          })
        } else {
          // Insert audio track at the end
          newTracks = [...videoTracks, ...audioTracks, { 
            id: `track-temp`,
            index: -1,
            name: '',
            type, 
            visible: true, 
            locked: false,
            muted: false
          }]
        }
      } else {
        // Default case (below)
        if (type === 'video') {
          newTracks = [videoTracks, audioTracks].flat()
          const insertIndex = videoTracks.length
          newTracks.splice(insertIndex, 0, { 
            id: `track-temp`,
            index: -1,
            name: '',
            type, 
            visible: true, 
            locked: false
          })
        } else {
          newTracks = [...videoTracks, ...audioTracks, { 
            id: `track-temp`,
            index: -1,
            name: '',
            type, 
            visible: true, 
            locked: false,
            muted: false
          }]
        }
      }
      
      // Reassign indices and names based on the new order
      let videoCount = 0
      let audioCount = 0
      
      return newTracks.map((track, index) => {
        if (track.type === 'video') {
          videoCount++
          return {
            ...track,
            id: track.id === 'track-temp' ? `track-${Date.now()}-${index}` : track.id,
            index,
            name: `V${videoCount}`
          }
        } else {
          audioCount++
          return {
            ...track,
            id: track.id === 'track-temp' ? `track-${Date.now()}-${index}` : track.id,
            index,
            name: `A${audioCount}`
          }
        }
      })
    })
  }, [])
  
  const removeTrack = useCallback((trackIndex: number) => {
    // Don't allow removing if only one track remains
    if (tracks.length <= 1) return
    
    setTracks(prev => prev.filter(t => t.index !== trackIndex))
    // Also remove clips from this track
    setClipsWithRef(prev => prev.filter(c => c.trackIndex !== trackIndex))
  }, [tracks.length])
  
  const moveClipToTrack = useCallback((clipId: string, newTrackIndex: number) => {
    setClipsWithRef(prev => prev.map(clip => 
      clip.id === clipId ? { ...clip, trackIndex: newTrackIndex } : clip
    ))
  }, [])
  
  const toggleTrackMute = useCallback((trackIndex: number) => {
    setTracks(prev => prev.map(track => 
      track.index === trackIndex && track.type === 'audio'
        ? { ...track, muted: !track.muted }
        : track
    ))
  }, [])

  // Cleanup blob URLs only on unmount
  useEffect(() => {
    return () => {
      // Only cleanup when component unmounts, not on clips change
      clips.forEach(clip => URL.revokeObjectURL(clip.url))
    }
  }, []) // Empty deps - only runs on unmount

  // Load timeline from database (restore saved project)
  const loadTimeline = useCallback((
    loadedClips: Clip[],
    loadedTracks: Track[],
    loadedTotalFrames: number
  ) => {
    // Stop playback if playing
    if (isPlaying) {
      pause()
    }

    // Clear existing clips and tracks
    setClipsWithRef(loadedClips)
    setTracks(loadedTracks)
    setTotalFramesWithRef(loadedTotalFrames)

    // Reset playhead to start
    setCurrentFrame(0)
    setVisualFrame(0)

    // Clear selection
    setSelectedClipId(null)
    setSelectedTrackIndex(null)

    // Initialize history with loaded state
    historyRef.current.initialize(loadedClips, loadedTotalFrames)

    console.log('✅ Timeline loaded:', {
      clips: loadedClips.length,
      tracks: loadedTracks.length,
      totalFrames: loadedTotalFrames
    })
  }, [isPlaying, pause])

  return {
    // State
    clips,
    tracks,
    selectedClipId,
    setSelectedClipId,
    selectedTrackIndex,
    setSelectedTrackIndex,
    currentFrame,      // Precise frame for editing operations
    visualFrame,       // Throttled frame for smooth UI
    isPlaying,
    isRecording,
    totalFrames,
    videoRef,
    
    // Actions
    loadTimeline,
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
    trimClipLeft,
    trimClipRight,
    moveClip,
    moveClipComplete,
    deleteClip,
    updateClipUrl,
    getLatestRecording,
    
    // Track management
    addTrack,
    removeTrack,
    moveClipToTrack,
    toggleTrackMute,
    
    // Undo/Redo
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Utilities
    getCurrentClip
  }
}
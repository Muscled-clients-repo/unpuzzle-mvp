'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Clip, FPS } from './types'
import { frameToTime } from './utils'
import { VirtualTimelineEngine, TimelineSegment } from './VirtualTimelineEngine'
import { useRecording } from './useRecording'

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
      sourceOutFrame: clip.sourceOutFrame ?? clip.durationFrames
    }))
    
    engineRef.current.setSegments(segments)
  }, [clips])
  
  // Recording hook integration
  const handleClipCreated = useCallback((clip: Clip) => {
    setClips(prev => [...prev, clip])
  }, [])
  
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

  // Seek to frame using virtual timeline
  const seekToFrame = useCallback((frame: number) => {
    engineRef.current?.seekToFrame(frame)
    setVisualFrame(frame) // Update visual immediately when seeking
  }, [])
  
  // Move clip to new position
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
  
  // Delete a clip by ID
  const deleteClip = useCallback((clipId: string) => {
    setClips(prevClips => {
      const updatedClips = prevClips.filter(c => c.id !== clipId)
      
      // Recalculate total frames after deletion
      const newTotalFrames = updatedClips.reduce((max, clip) => 
        Math.max(max, clip.startFrame + clip.durationFrames), 0
      )
      setTotalFrames(newTotalFrames)
      
      // Revoke the blob URL of deleted clip
      const deletedClip = prevClips.find(c => c.id === clipId)
      if (deletedClip) {
        URL.revokeObjectURL(deletedClip.url)
      }
      
      return updatedClips
    })
  }, [])
  
  // Split clip at specific frame
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
        sourceInFrame: sourceInFrame,
        sourceOutFrame: sourceInFrame + splitPoint
      }
      
      const secondClip: Clip = {
        ...clip,
        id: `${clip.id}-2`,
        startFrame: splitFrame,
        durationFrames: clip.durationFrames - splitPoint,
        sourceInFrame: sourceInFrame + splitPoint,
        sourceOutFrame: sourceOutFrame
      }
      
      // Replace original clip with two new clips
      const newClips = [...prevClips]
      newClips.splice(clipIndex, 1, firstClip, secondClip)
      
      return newClips
    })
  }, [])

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
    moveClip,
    deleteClip,
    
    // Utilities
    getCurrentClip
  }
}
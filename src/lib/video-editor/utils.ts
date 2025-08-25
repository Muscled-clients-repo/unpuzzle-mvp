// Frame-based utility functions
import { FPS, Clip } from './types'

export const timeToFrame = (seconds: number): number => {
  return Math.round(seconds * FPS)
}

export const frameToTime = (frame: number): number => {
  return frame / FPS
}

// Timeline pixel/frame conversion utilities
export const frameToPixel = (frame: number, pixelsPerSecond: number): number => {
  return (frame / FPS) * pixelsPerSecond
}

export const pixelToFrame = (pixel: number, pixelsPerSecond: number): number => {
  return Math.round((pixel / pixelsPerSecond) * FPS)
}

export const getClipLeftPosition = (clip: Clip, pixelsPerSecond: number): number => {
  return frameToPixel(clip.startFrame, pixelsPerSecond)
}

export const getClipWidth = (clip: Clip, pixelsPerSecond: number): number => {
  return frameToPixel(clip.durationFrames, pixelsPerSecond)
}

// Magnetic snapping utilities
export const getSnappedPosition = (
  position: number, 
  snapTargets: number[], 
  tolerance: number = 3
): number => {
  // Find the closest snap target within tolerance
  for (const target of snapTargets) {
    if (Math.abs(position - target) <= tolerance) {
      return target
    }
  }
  return position
}

export const getSnapTargets = (
  clips: Clip[], 
  currentFrame: number, 
  excludeClipId?: string
): number[] => {
  const targets: number[] = []
  
  // Add scrubber position
  targets.push(currentFrame)
  
  // Add whole second positions (every FPS frames)
  const nearestSecond = Math.round(currentFrame / FPS) * FPS
  targets.push(nearestSecond)
  
  // Add clip start/end positions
  clips.forEach(clip => {
    if (clip.id !== excludeClipId) {
      targets.push(clip.startFrame)
      targets.push(clip.startFrame + clip.durationFrames)
    }
  })
  
  return targets
}

// Track helper utilities
export const findTrackFromElement = (element: HTMLElement): number | null => {
  const trackElement = element.closest('[data-track-index]')
  if (trackElement) {
    const trackIndex = trackElement.getAttribute('data-track-index')
    return trackIndex ? parseInt(trackIndex) : null
  }
  return null
}

export const getNextTrackIndex = (tracks: any[], trackType: 'video' | 'audio' = 'video'): number => {
  // Find the highest track index for the specified type
  let highestIndex = -1
  
  tracks.forEach(track => {
    if (track.type === trackType) {
      highestIndex = Math.max(highestIndex, track.index)
    }
  })
  
  return highestIndex + 1
}

export const findTrackByIndex = (tracks: any[], trackIndex: number): any | null => {
  return tracks.find(track => track.index === trackIndex) || null
}

export const getClipsForTrack = (clips: Clip[], trackIndex: number): Clip[] => {
  return clips.filter(clip => clip.trackIndex === trackIndex)
}
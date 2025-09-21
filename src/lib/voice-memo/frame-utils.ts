// Frame-based utilities for voice memos (reusing studio architecture)
import { timeToFrame, frameToTime } from '@/lib/video-editor/utils'
import { FPS } from '@/lib/video-editor/types'

/**
 * Convert voice memo duration in seconds to frame count
 * Uses the same FPS (30) as the studio video editor for consistency
 */
export const voiceMemoToFrames = (seconds: number): number => {
  return timeToFrame(seconds)
}

/**
 * Convert frame count back to seconds for voice memo duration
 */
export const framesToVoiceMemo = (frames: number): number => {
  return frameToTime(frames)
}

/**
 * Convert video timestamp in seconds to frame position
 */
export const videoTimestampToFrames = (seconds: number): number => {
  return timeToFrame(seconds)
}

/**
 * Convert frame position back to video timestamp in seconds
 */
export const framesToVideoTimestamp = (frames: number): number => {
  return frameToTime(frames)
}

/**
 * Get frame-perfect progress percentage
 */
export const getFrameProgress = (currentFrames: number, totalFrames: number): number => {
  if (totalFrames <= 0) return 0
  return (currentFrames / totalFrames) * 100
}

/**
 * Convert current audio time to frame position for accurate progress tracking
 */
export const audioTimeToFrames = (seconds: number): number => {
  return timeToFrame(seconds)
}

/**
 * Debug helper to compare frame vs time accuracy
 */
export const debugFrameAccuracy = (seconds: number) => {
  const frames = voiceMemoToFrames(seconds)
  const backToSeconds = framesToVoiceMemo(frames)
  console.log(`[FRAME_DEBUG] ${seconds}s → ${frames} frames → ${backToSeconds}s (diff: ${Math.abs(seconds - backToSeconds)}s)`)
  return { frames, backToSeconds, accuracy: Math.abs(seconds - backToSeconds) }
}

export { FPS } // Re-export FPS constant for consistency
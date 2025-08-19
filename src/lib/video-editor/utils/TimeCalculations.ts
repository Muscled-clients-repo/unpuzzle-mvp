// Centralized time calculation utility to prevent sync issues
// Handles conversions between video element time, timeline position, and clip boundaries

import type { TimelineClip } from '../state-machine/VideoEditorMachineV5'

export class TimeCalculations {
  /**
   * Convert video element time to timeline position
   * Accounts for clip startTime and inPoint offset
   */
  static videoTimeToTimelinePosition(
    videoElementTime: number,
    clip: TimelineClip
  ): number {
    // Video element time is relative to the clip's inPoint
    // Timeline position = clip start + video time
    return clip.startTime + videoElementTime
  }

  /**
   * Convert timeline position to video element time  
   * Accounts for clip startTime and inPoint offset
   */
  static timelinePositionToVideoTime(
    timelinePosition: number,
    clip: TimelineClip
  ): number {
    // Video time = timeline position - clip start
    return Math.max(0, timelinePosition - clip.startTime)
  }

  /**
   * Check if timeline position is within clip boundaries
   */
  static isPositionInClip(
    timelinePosition: number,
    clip: TimelineClip
  ): boolean {
    return timelinePosition >= clip.startTime && 
           timelinePosition < (clip.startTime + clip.duration)
  }

  /**
   * Get the clip that contains a specific timeline position
   */
  static findClipAtPosition(
    timelinePosition: number,
    clips: TimelineClip[]
  ): TimelineClip | null {
    return clips.find(clip => 
      this.isPositionInClip(timelinePosition, clip)
    ) || null
  }

  /**
   * Check if we've reached or exceeded a clip's end boundary
   * Uses small tolerance for timing precision
   */
  static hasReachedClipEnd(
    timelinePosition: number,
    clip: TimelineClip,
    tolerance: number = 0.05
  ): boolean {
    const clipEndTime = clip.startTime + clip.duration
    return timelinePosition >= (clipEndTime - tolerance)
  }

  /**
   * Clamp timeline position to clip boundaries
   */
  static clampToClipBoundaries(
    timelinePosition: number,
    clip: TimelineClip
  ): number {
    const clipEndTime = clip.startTime + clip.duration
    return Math.max(
      clip.startTime,
      Math.min(timelinePosition, clipEndTime)
    )
  }

  /**
   * Calculate seek time for video element when switching clips
   * Handles trimmed clips with inPoint/outPoint
   */
  static calculateSeekTime(
    targetTimelinePosition: number,
    clip: TimelineClip
  ): number {
    // For trimmed clips, we need to seek to the relative position within the clip
    const relativePosition = targetTimelinePosition - clip.startTime
    
    // Clamp to clip duration to prevent seeking beyond trimmed boundaries
    return Math.max(0, Math.min(relativePosition, clip.duration))
  }
}
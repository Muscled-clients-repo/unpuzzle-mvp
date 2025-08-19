// ARCHITECTURE: Following Principle 4 - Service Boundary Isolation (lines 25-28)
// Single responsibility: ONLY handles timeline/segments
// Implementation from lines 559-658 of BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md
// Service DOES NOT store state for clips - only processes events

import type { TypedEventBus } from '../events/EventBus'
import type { VideoSegment } from '../types'
import type { TimelineClip, Track } from '../state-machine/VideoEditorMachineV5'

export class TimelineService {
  // ARCHITECTURE: Services are STATELESS (line 668 of bulletproof architecture)
  // NO state storage - only process events and emit new ones
  private unsubscribe: (() => void) | null = null

  constructor(private eventBus: TypedEventBus) {
    this.setupEventListeners()
    // Service only processes events, doesn't store state (SSOT principle)
  }
  
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  // Request to add segment - service only creates and emits, doesn't store
  requestAddSegment(segment: Omit<VideoSegment, 'id'>): void {
    const newSegment: VideoSegment = {
      ...segment,
      id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    
    // Emit event for state machine to handle
    // State machine will validate and store if valid
    this.eventBus.emit('timeline.segmentAdded', { segment: newSegment })
  }

  // Request to move segment - service only emits events
  requestMoveSegment(segmentId: string, newStartTime: number): void {
    // Service doesn't validate - state machine will handle validation
    this.eventBus.emit('timeline.segmentMoved', {
      segmentId,
      newStartTime
    })
  }

  // Request to select segment - service only emits events
  requestSelectSegment(segmentId: string): void {
    // No validation needed - state machine handles it
    this.eventBus.emit('timeline.segmentSelected', { segmentId })
  }

  // REMOVED: getSegments() and getTotalDuration()
  // These should be read from State Machine via Queries (architecture line 902)
  // Services don't store state, so can't provide getters
  
  // New method to get total duration from clips (used for proper clip placement)
  getTotalDurationFromClips(clips: TimelineClip[]): number {
    return clips.reduce((max, clip) => 
      Math.max(max, clip.startTime + clip.duration), 0
    )
  }

  // Validation helper - takes segments as parameter, doesn't store them
  validateSegmentPlacement(segment: VideoSegment, existingSegments: VideoSegment[], excludeId?: string): boolean {
    const segmentEnd = segment.startTime + segment.duration
    
    const hasOverlap = existingSegments
      .filter(s => s.id !== excludeId && s.trackIndex === segment.trackIndex)
      .some(existingSegment => {
        const existingEnd = existingSegment.startTime + existingSegment.duration
        return !(segmentEnd <= existingSegment.startTime || segment.startTime >= existingEnd)
      })

    return !hasOverlap
  }

  private setupEventListeners(): void {
    // ARCHITECTURE: Service listens to events (Principle 2)
    // Cleanup any existing listener first
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    
    // Track if we've already processed a recording to prevent duplicates
    let lastProcessedRecording: string | null = null
    
    // Create unsubscribe function to prevent duplicate listeners
    this.unsubscribe = this.eventBus.on('recording.stopped', ({ duration, videoUrl }) => {
      // V2 BULLETPROOF: Prevent duplicate processing of the same recording
      const recordingId = `${videoUrl}-${duration}`
      if (lastProcessedRecording === recordingId) {
        console.warn('⚠️ Timeline: Duplicate recording event detected, skipping')
        return
      }
      lastProcessedRecording = recordingId
      
      // Request to add segment (service doesn't store, just emits)
      // State machine will calculate position and validate
      this.requestAddSegment({
        startTime: 0, // State machine will calculate actual position
        duration,
        videoUrl,
        name: `Recording ${new Date().toLocaleTimeString()}`,
        trackIndex: 0
      })
      
      // ALSO create a clip for the new timeline system
      console.log('🎬 Timeline: Recording stopped, creating clip', { duration, videoUrl })
      
      const uniqueId = `clip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      const clip: TimelineClip = {
        id: uniqueId,
        trackId: 'video-1', // Default to first video track
        sourceUrl: videoUrl,
        startTime: 0, // State machine will calculate actual position
        duration: duration,
        inPoint: 0,
        outPoint: duration,
        label: `Recording ${new Date().toLocaleTimeString()}`,
        isSelected: false
      }
      
      // Emit event - state machine will handle placement
      this.eventBus.emit('timeline.clipAdded', { clip })
      
      // Clear the tracking after a short delay (to handle any immediate duplicates)
      setTimeout(() => {
        if (lastProcessedRecording === recordingId) {
          lastProcessedRecording = null
        }
      }, 100)
    })
  }
  
  // Phase A1: Utility functions for state machine
  calculateNextAvailablePosition(clips: TimelineClip[], trackId: string): number {
    const trackClips = clips.filter(c => c.trackId === trackId)
    if (trackClips.length === 0) return 0
    
    // Find the end of the last clip
    const lastClip = trackClips.reduce((latest, clip) => 
      (clip.startTime > latest.startTime) ? clip : latest
    )
    
    return lastClip.startTime + lastClip.duration
  }
  
  validateClipPlacement(clip: TimelineClip, existingClips: TimelineClip[]): boolean {
    const trackClips = existingClips.filter(c => c.trackId === clip.trackId)
    const clipEnd = clip.startTime + clip.duration
    
    const hasOverlap = trackClips.some(existing => {
      if (existing.id === clip.id) return false
      const existingEnd = existing.startTime + existing.duration
      return !(clipEnd <= existing.startTime || clip.startTime >= existingEnd)
    })
    
    return !hasOverlap
  }
}
/**
 * BULLETPROOF Video Editor State Machine - XState v5 Implementation
 * 
 * This is THE ONLY state machine for the video editor.
 * Contains ALL business and technical state following BULLETPROOF principles.
 * 
 * KEY FEATURES:
 * - Multi-clip recording and seamless playback transitions
 * - Complete state authority (business + technical state)
 * - Event-driven integration with stateless services
 * - Type-safe with comprehensive error handling
 * 
 * @see /src/lib/video-editor/README.md for architecture guide
 * @see /logs/2025-08-19/BULLETPROOF-ARCHITECTURE-V2-LESSONS-LEARNED.md
 */

import { setup, assign } from 'xstate'
import type { VideoSegment } from '../types'

// ============================================
// PRINCIPLE 1: Single Source of Truth (SSOT)
// All types fully defined, NO 'any' types
// ============================================

export interface TimelineClip {
  id: string
  trackId: string
  sourceUrl: string
  startTime: number
  duration: number
  inPoint: number
  outPoint: number
  label: string
  isSelected: boolean
}

export interface Track {
  id: string
  type: 'video' | 'audio'
  index: number
  height: number
  isLocked: boolean
  isVisible: boolean
}

export interface VideoEditorContext {
  currentTime: number
  totalDuration: number
  isPlaying: boolean
  segments: VideoSegment[]
  selectedSegmentId: string | null
  recording: {
    startTime: number | null
    duration: number
    isActive: boolean
  }
  // Enhanced playback state for multi-clip functionality
  playback: {
    // Technical state (following BULLETPROOF architecture)
    currentVideoTime: number
    videoDuration: number
    loadedVideoUrl: string | null
    // Business state
    currentClipId: string | null
    activeClipStartTime: number
    globalTimelinePosition: number
    // State Machine pre-calculated decisions for Integration Layer
    pendingClipTransition: TimelineClip | null
    pendingSeek: { time: number } | null
    // NEW: Proactive clip sequencing (Option A implementation)
    clipSequence: TimelineClip[]
    currentSequenceIndex: number
  }
  timeline: {
    clips: TimelineClip[]
    tracks: Track[]
    scrubber: {
      position: number
      isDragging: boolean
      snapEnabled: boolean
    }
    viewport: {
      zoom: number
      scrollLeft: number
      pixelsPerSecond: number
    }
  }
}

// Fully typed events - NO any types
export type VideoEditorEvent = 
  | { type: 'RECORDING.START'; mode: 'screen' | 'camera' | 'audio' }
  | { type: 'RECORDING.STOP' }
  | { type: 'RECORDING.CANCELLED' }
  | { type: 'PLAYBACK.PLAY' }
  | { type: 'PLAYBACK.PAUSE' }
  | { type: 'PLAYBACK.SEEK'; time: number }
  | { type: 'PLAYBACK.ACTIONS_PROCESSED' }  // Clear pending actions
  | { type: 'VIDEO.LOADED'; duration: number; url: string }  // Video loaded event
  | { type: 'VIDEO.TIME_UPDATE'; time: number }  // Video time updates from service
  | { type: 'VIDEO.ENDED' }  // Video playback ended
  | { type: 'TIMELINE.ADD_SEGMENT'; segment: VideoSegment }
  | { type: 'TIMELINE.SELECT_SEGMENT'; segmentId: string }
  | { type: 'TIMELINE.CLIP_ADDED'; clip: TimelineClip }
  | { type: 'TIMELINE.CLIP_SELECTED'; clipId: string; multiSelect?: boolean }
  | { type: 'TIMELINE.TRACK_ADDED'; track: Track }
  | { type: 'SCRUBBER.START_DRAG' }
  | { type: 'SCRUBBER.DRAG'; position: number }
  | { type: 'SCRUBBER.END_DRAG' }
  | { type: 'SCRUBBER.CLICK'; position: number }
  | { type: 'CLIPS.DELETE_SELECTED' }
  | { type: 'CLIPS.DESELECT_ALL' }
  | { type: 'CLIPS.SPLIT_AT_PLAYHEAD' }

// Default state following SSOT principle
const DEFAULT_TRACKS: Track[] = [
  { id: 'video-1', type: 'video', index: 0, height: 80, isLocked: false, isVisible: true },
  { id: 'video-2', type: 'video', index: 1, height: 80, isLocked: false, isVisible: true },
  { id: 'audio-1', type: 'audio', index: 0, height: 60, isLocked: false, isVisible: true }
]

function getInitialContext(): VideoEditorContext {
  return {
    currentTime: 0,
    totalDuration: 0,
    isPlaying: false,
    segments: [],
    selectedSegmentId: null,
    recording: {
      startTime: null,
      duration: 0,
      isActive: false
    },
    // Initialize playback state
    playback: {
      currentVideoTime: 0,
      videoDuration: 0,
      loadedVideoUrl: null,
      currentClipId: null,
      activeClipStartTime: 0,
      globalTimelinePosition: 0,
      pendingClipTransition: null,
      pendingSeek: null,
      // Initialize clip sequencing
      clipSequence: [],
      currentSequenceIndex: -1
    },
    timeline: {
      clips: [],
      tracks: DEFAULT_TRACKS,
      scrubber: {
        position: 0,
        isDragging: false,
        snapEnabled: true
      },
      viewport: {
        zoom: 1,
        scrollLeft: 0,
        pixelsPerSecond: 50
      }
    }
  }
}

// ============================================
// OPTION A: Clip Sequence Pre-calculation Helper
// ============================================

/**
 * Calculate the complete playbook sequence from the current position
 * This replaces reactive boundary monitoring with proactive planning
 * 
 * CRITICAL: For trimmed clips, each trim should be treated as a separate playback segment
 * even if they share the same source URL. The key is the inPoint/outPoint values.
 */
function calculateClipSequence(clips: TimelineClip[], startPosition: number): { sequence: TimelineClip[], startIndex: number } {
  if (clips.length === 0) {
    return { sequence: [], startIndex: -1 }
  }
  
  // Sort clips by timeline position (this handles trimmed clips correctly)
  const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime)
  
  // Find the starting clip based on position
  const startClipIndex = sortedClips.findIndex(clip => 
    startPosition >= clip.startTime && startPosition < clip.startTime + clip.duration
  )
  
  if (startClipIndex === -1) {
    // No clip at current position, start from the first clip
    console.log('🎯 No clip at position', startPosition, 'starting from first clip')
    return { sequence: sortedClips, startIndex: 0 }
  }
  
  // Create sequence starting from the current clip
  const sequence = sortedClips.slice(startClipIndex)
  
  console.log('🎯 Calculated clip sequence for trimmed clips:', {
    startPosition,
    startClipIndex,
    totalClips: clips.length,
    sequenceLength: sequence.length,
    sequence: sequence.map((c, idx) => ({ 
      index: idx,
      id: c.id, 
      startTime: c.startTime, 
      duration: c.duration,
      inPoint: c.inPoint,
      outPoint: c.outPoint,
      sourceUrl: c.sourceUrl.substring(0, 20) + '...' // Truncate for readability
    }))
  })
  
  return { sequence, startIndex: 0 }
}

// ============================================
// PRINCIPLE 3: State Machine Authority
// XState v5 setup pattern for proper typing
// ============================================

export const videoEditorMachine = setup({
  types: {
    context: {} as VideoEditorContext,
    events: {} as VideoEditorEvent,
  },
  actions: {
    // Recording actions
    startRecording: assign({
      recording: ({ context }) => ({
        ...context.recording,
        startTime: performance.now(),
        isActive: true
      })
    }),
    
    stopRecording: assign({
      recording: ({ context }) => {
        const duration = context.recording?.startTime 
          ? (performance.now() - context.recording.startTime) / 1000 
          : 0
        return {
          startTime: null,
          duration,
          isActive: false
        }
      },
      totalDuration: ({ context }) => {
        const duration = context.recording?.startTime 
          ? (performance.now() - context.recording.startTime) / 1000 
          : 0
        return Math.max(context.totalDuration, duration)
      }
    }),
    
    // Enhanced playback actions with business logic
    pausePlayback: assign({
      isPlaying: false,
      playback: ({ context }) => ({
        ...context.playback,
        pendingClipTransition: null,
        pendingSeek: null
        // Preserve clipSequence and currentSequenceIndex for resume
      })
    }),
    
    resumePlayback: assign(({ context }) => {
      // OPTION A: Proactive clip sequencing - calculate the complete playback sequence
      const position = context.timeline.scrubber.position
      
      console.log('🎯 OPTION A: Starting playback at position', position)
      console.log('🎯 Available clips:', context.timeline.clips.map(c => ({
        id: c.id,
        startTime: c.startTime,
        duration: c.duration,
        sourceUrl: c.sourceUrl
      })))
      
      // Calculate the complete clip sequence from current position
      const { sequence, startIndex } = calculateClipSequence(context.timeline.clips, position)
      
      if (sequence.length === 0) {
        console.log('🎯 No clips available for playback')
        return {
          ...context,
          isPlaying: false
        }
      }
      
      const firstClip = sequence[startIndex]
      const localTime = position - firstClip.startTime
      
      console.log('🎯 OPTION A: Starting with clip sequence:', {
        clipId: firstClip.id,
        sequenceLength: sequence.length,
        startIndex,
        localTime
      })
      
      return {
        ...context,
        isPlaying: true,
        timeline: {
          ...context.timeline,
          scrubber: {
            ...context.timeline.scrubber,
            position
          }
        },
        playback: {
          ...context.playback,
          currentClipId: firstClip.id,
          activeClipStartTime: firstClip.startTime,
          globalTimelinePosition: position,
          pendingClipTransition: firstClip,
          pendingSeek: { time: Math.max(0, localTime) },
          // NEW: Set the pre-calculated sequence
          clipSequence: sequence,
          currentSequenceIndex: startIndex
        }
      }
    }),
    
    // Update totalDuration when video loads
    updateVideoDuration: assign({
      totalDuration: ({ event, context }) => {
        if (event.type === 'VIDEO.LOADED') {
          // Use the greater of current totalDuration or video duration
          return Math.max(context.totalDuration, event.duration)
        }
        return context.totalDuration
      }
    }),
    
    seek: assign(({ context, event }) => {
      if (event.type !== 'PLAYBACK.SEEK') {
        return context
      }
      
      const seekTime = event.time
      
      // DEBUG: Log seek operation details
      console.log('🎯 State Machine SEEK: Looking for clip at time', seekTime)
      console.log('🎯 Available clips:', context.timeline.clips.map(c => ({
        id: c.id,
        startTime: c.startTime,
        duration: c.duration,
        sourceUrl: c.sourceUrl
      })))
      
      // BUSINESS LOGIC: Find which clip contains this time
      const targetClip = context.timeline.clips.find(clip => 
        seekTime >= clip.startTime && seekTime < clip.startTime + clip.duration
      )
      
      if (targetClip) {
        console.log('🎯 State Machine SEEK: Found target clip:', {
          id: targetClip.id,
          sourceUrl: targetClip.sourceUrl,
          currentClipId: context.playback.currentClipId,
          isClipChange: context.playback.currentClipId !== targetClip.id
        })
      }
      
      if (targetClip) {
        const localTime = seekTime - targetClip.startTime
        
        // CRITICAL FIX #3: Only trigger clip transition if switching to a different clip
        const isClipChange = context.playback.currentClipId !== targetClip.id
        
        return {
          ...context,
          currentTime: seekTime,
          timeline: {
            ...context.timeline,
            scrubber: {
              ...context.timeline.scrubber,
              position: seekTime
            }
          },
          playback: {
            ...context.playback,
            currentClipId: targetClip.id,
            activeClipStartTime: targetClip.startTime,
            globalTimelinePosition: seekTime,
            pendingClipTransition: isClipChange ? targetClip : null,
            pendingSeek: { time: localTime }
          }
        }
      } else {
        return {
          ...context,
          currentTime: seekTime,
          timeline: {
            ...context.timeline,
            scrubber: {
              ...context.timeline.scrubber,
              position: seekTime
            }
          },
          playback: {
            ...context.playback,
            pendingSeek: null,
            pendingClipTransition: null
          }
        }
      }
    }),
    
    // Actions to handle video events from services
    updateVideoTime: assign(({ context, event }) => {
      if (event.type === 'VIDEO.TIME_UPDATE') {
        return {
          ...context,
          playback: {
            ...context.playback,
            currentVideoTime: event.time,
            globalTimelinePosition: context.playback.activeClipStartTime + event.time
          },
          currentTime: context.playback.activeClipStartTime + event.time,
          timeline: {
            ...context.timeline,
            scrubber: {
              ...context.timeline.scrubber,
              position: context.playback.activeClipStartTime + event.time
            }
          }
        }
      }
      return context
    }),
    
    updateVideoLoaded: assign(({ context, event }) => {
      if (event.type === 'VIDEO.LOADED') {
        return {
          ...context,
          playback: {
            ...context.playback,
            videoDuration: event.duration,
            loadedVideoUrl: event.url
          }
        }
      }
      return context
    }),
    
    handleVideoEnded: assign(({ context }) => {
      // OPTION A: Use pre-calculated clip sequence for natural progression
      const { clipSequence, currentSequenceIndex } = context.playback
      
      console.log('🎯 OPTION A: Video ended, checking sequence:', {
        currentIndex: currentSequenceIndex,
        sequenceLength: clipSequence.length,
        currentClipId: context.playback.currentClipId
      })
      
      // Check if there's a next clip in the sequence
      const nextIndex = currentSequenceIndex + 1
      
      if (nextIndex < clipSequence.length) {
        const nextClip = clipSequence[nextIndex]
        
        console.log('🎯 OPTION A: Moving to next clip in sequence:', {
          nextClip: nextClip.id,
          nextIndex,
          startTime: nextClip.startTime
        })
        
        return {
          ...context,
          isPlaying: true, // Keep playing for seamless transition
          timeline: {
            ...context.timeline,
            scrubber: {
              ...context.timeline.scrubber,
              position: nextClip.startTime
            }
          },
          playback: {
            ...context.playback,
            currentClipId: nextClip.id,
            activeClipStartTime: nextClip.startTime,
            globalTimelinePosition: nextClip.startTime,
            pendingClipTransition: nextClip,
            pendingSeek: { time: 0 }, // Start from beginning of next clip
            currentSequenceIndex: nextIndex // Advance in sequence
          }
        }
      } else {
        console.log('🎯 OPTION A: End of clip sequence reached, stopping playback')
        return {
          ...context,
          isPlaying: false,
          playback: {
            ...context.playback,
            pendingClipTransition: null,
            pendingSeek: null,
            // Reset sequence
            clipSequence: [],
            currentSequenceIndex: -1
          }
        }
      }
    }),
    
    // Clear pending actions after Integration Layer processes them
    clearPendingActions: assign(({ context }) => ({
      ...context,
      playback: {
        ...context.playback,
        pendingClipTransition: null,
        pendingSeek: null
      }
    })),
    
    // Segment actions
    addSegment: assign({
      segments: ({ context, event }) => {
        if (event.type === 'TIMELINE.ADD_SEGMENT') {
          return [...context.segments, event.segment]
        }
        return context.segments
      },
      totalDuration: ({ context, event }) => {
        if (event.type === 'TIMELINE.ADD_SEGMENT') {
          return Math.max(
            context.totalDuration,
            event.segment.startTime + event.segment.duration
          )
        }
        return context.totalDuration
      }
    }),
    
    // Timeline clip actions - PROPER XState v5 pattern
    addClipToTimeline: assign({
      timeline: ({ context, event }) => {
        
        // Type guard for the specific event
        if (event.type !== 'TIMELINE.CLIP_ADDED') {
          return context.timeline
        }
        
        const clip = event.clip
        const currentTimeline = context.timeline
        
        // V2 BULLETPROOF: Check for duplicate clips (SSOT principle)
        const existingClip = currentTimeline.clips.find(c => c.id === clip.id)
        if (existingClip) {
          return currentTimeline
        }
        
        // Calculate position for non-overlapping clips
        const trackClips = currentTimeline.clips.filter(c => c.trackId === clip.trackId)
        let startTime = clip.startTime
        
        // Always calculate the correct position based on existing clips
        if (trackClips.length > 0) {
          // Find the end of the last clip on this track
          const maxEndTime = trackClips.reduce((max, c) => 
            Math.max(max, c.startTime + c.duration), 0
          )
          // Place new clip after all existing clips
          startTime = maxEndTime
        }
        
        const clipWithPosition = { ...clip, startTime }
        
        return {
          ...currentTimeline,
          clips: [...currentTimeline.clips, clipWithPosition]
        }
      },
      totalDuration: ({ context, event }) => {
        if (event.type !== 'TIMELINE.CLIP_ADDED') {
          return context.totalDuration
        }
        
        const clip = event.clip
        const trackClips = context.timeline.clips.filter(c => c.trackId === clip.trackId)
        let startTime = clip.startTime
        
        if (startTime === 0 && trackClips.length > 0) {
          const lastClip = trackClips.reduce((latest, c) => 
            (c.startTime > latest.startTime) ? c : latest
          )
          startTime = lastClip.startTime + lastClip.duration
        }
        
        return Math.max(context.totalDuration, startTime + clip.duration)
      }
    }),
    
    selectClip: assign({
      timeline: ({ context, event }) => {
        if (event.type !== 'TIMELINE.CLIP_SELECTED') {
          return context.timeline
        }
        
        
        // V2 BULLETPROOF: Support multi-select with Cmd/Ctrl key
        const updatedClips = context.timeline.clips.map(clip => {
          if (clip.id === event.clipId) {
            // Toggle selection if multi-select, otherwise select
            return {
              ...clip,
              isSelected: event.multiSelect ? !clip.isSelected : true
            }
          } else if (!event.multiSelect) {
            // Clear other selections if not multi-selecting
            return {
              ...clip,
              isSelected: false
            }
          }
          // Keep existing selection state if multi-selecting
          return clip
        })
        
        
        return {
          ...context.timeline,
          clips: updatedClips
        }
      }
    }),
    
    addTrackToTimeline: assign({
      timeline: ({ context, event }) => {
        if (event.type !== 'TIMELINE.TRACK_ADDED') {
          return context.timeline
        }
        
        const track = event.track
        const trackExists = context.timeline.tracks.some(t => t.id === track.id)
        
        if (trackExists) {
          return context.timeline
        }
        
        return {
          ...context.timeline,
          tracks: [...context.timeline.tracks, track]
        }
      }
    }),
    
    // Scrubber actions
    startScrubberDrag: assign({
      timeline: ({ context }) => ({
        ...context.timeline,
        scrubber: { ...context.timeline.scrubber, isDragging: true }
      })
    }),
    
    updateScrubberPosition: assign({
      timeline: ({ context, event }) => {
        if (event.type !== 'SCRUBBER.DRAG') {
          return context.timeline
        }
        
        return {
          ...context.timeline,
          scrubber: {
            ...context.timeline.scrubber,
            position: Math.max(0, Math.min(event.position, context.totalDuration))
          }
        }
      },
      currentTime: ({ event }) => {
        if (event.type === 'SCRUBBER.DRAG') {
          return event.position
        }
        return 0
      }
    }),
    
    endScrubberDrag: assign(({ context }) => {
      const position = context.timeline.scrubber.position
      
      // Find which clip should be at this position
      const targetClip = context.timeline.clips.find(clip => 
        position >= clip.startTime && position < clip.startTime + clip.duration
      )
      
      console.log('🎯 Scrubber drag ended at position:', position, 'target clip:', targetClip?.id)
      
      if (targetClip) {
        // Check if we need to switch clips or just seek within current clip
        const isClipChange = context.playback.currentClipId !== targetClip.id
        const localTime = position - targetClip.startTime
        
        return {
          ...context,
          timeline: {
            ...context.timeline,
            scrubber: { ...context.timeline.scrubber, isDragging: false }
          },
          playback: {
            ...context.playback,
            currentClipId: targetClip.id,
            activeClipStartTime: targetClip.startTime,
            globalTimelinePosition: position,
            // Set pending actions to trigger clip load and seek for preview
            pendingClipTransition: isClipChange ? targetClip : null,
            pendingSeek: { time: localTime }
          }
        }
      } else {
        return {
          ...context,
          timeline: {
            ...context.timeline,
            scrubber: { ...context.timeline.scrubber, isDragging: false }
          }
        }
      }
    }),
    
    deleteSelectedClips: assign(({ context }) => {
      const selectedClips = context.timeline.clips.filter(clip => clip.isSelected)
      const remainingClips = context.timeline.clips.filter(clip => !clip.isSelected)
      
      // V2 BULLETPROOF: State Machine must update ALL state (business + technical)
      // Check if we're deleting the currently playing clip
      const deletingCurrentClip = selectedClips.some(clip => clip.id === context.playback.currentClipId)
      
      // Calculate new total duration
      const newTotalDuration = remainingClips.length === 0 
        ? 0 
        : remainingClips.reduce((max, clip) => Math.max(max, clip.startTime + clip.duration), 0)
      
      // Reset playback state if current clip was deleted or no clips remain
      const shouldResetPlayback = deletingCurrentClip || remainingClips.length === 0
      
      return {
        ...context,
        timeline: {
          ...context.timeline,
          clips: remainingClips,
          scrubber: {
            ...context.timeline.scrubber,
            position: shouldResetPlayback ? 0 : context.timeline.scrubber.position
          }
        },
        totalDuration: newTotalDuration,
        currentTime: shouldResetPlayback ? 0 : context.currentTime,
        isPlaying: false, // Stop playback when deleting clips
        playback: shouldResetPlayback ? {
          ...context.playback,
          currentClipId: null,
          loadedVideoUrl: null,
          currentVideoTime: 0,
          videoDuration: 0,
          activeClipStartTime: 0,
          globalTimelinePosition: 0,
          pendingClipTransition: null,
          pendingSeek: null,
          // Reset clip sequence when playback is reset
          clipSequence: [],
          currentSequenceIndex: -1
        } : context.playback
      }
    }),
    
    deselectAllClips: assign({
      timeline: ({ context }) => ({
        ...context.timeline,
        clips: context.timeline.clips.map(clip => ({
          ...clip,
          isSelected: false
        }))
      })
    }),
    
    splitClipAtPlayhead: assign(({ context }) => {
      const playheadPosition = context.timeline.scrubber.position
      
      console.log('🔪 SPLIT: Playhead at position', playheadPosition)
      console.log('🔪 SPLIT: Available clips:', context.timeline.clips.map(c => ({
        id: c.id,
        startTime: c.startTime,
        duration: c.duration,
        sourceUrl: c.sourceUrl
      })))
      
      // Find the clip that contains the playhead position
      const clipToSplit = context.timeline.clips.find(clip => 
        playheadPosition > clip.startTime && 
        playheadPosition < clip.startTime + clip.duration
      )
      
      if (clipToSplit) {
        console.log('🔪 SPLIT: Found clip to split:', {
          id: clipToSplit.id,
          sourceUrl: clipToSplit.sourceUrl,
          startTime: clipToSplit.startTime,
          duration: clipToSplit.duration
        })
      }
      
      if (!clipToSplit) {
        // No clip at playhead position, nothing to split
        return context
      }
      
      // Calculate split point relative to clip start
      const splitPoint = playheadPosition - clipToSplit.startTime
      
      // Create two new clips from the original
      const firstClip: TimelineClip = {
        ...clipToSplit,
        duration: splitPoint,
        outPoint: clipToSplit.inPoint + splitPoint,
        isSelected: true // Select only the first (left) part after split
      }
      
      const secondClip: TimelineClip = {
        ...clipToSplit,
        id: `${clipToSplit.id}-split-${Date.now()}`,
        startTime: playheadPosition,
        duration: clipToSplit.duration - splitPoint,
        inPoint: clipToSplit.inPoint + splitPoint,
        label: `${clipToSplit.label} (2)`,
        isSelected: false // Don't select the second part
      }
      
      // Replace the original clip with the two new clips
      // Also deselect all other clips - only the left part should be selected
      const updatedClips = context.timeline.clips
        .filter(c => c.id !== clipToSplit.id)
        .map(c => ({ ...c, isSelected: false })) // Deselect all existing clips
        .concat([firstClip, secondClip])
        .sort((a, b) => a.startTime - b.startTime)
      
      console.log('🔪 SPLIT: Created clips:', {
        original: clipToSplit.id,
        first: { id: firstClip.id, sourceUrl: firstClip.sourceUrl },
        second: { id: secondClip.id, sourceUrl: secondClip.sourceUrl }
      })
      console.log('🔪 SPLIT: Final clip list:', updatedClips.map(c => ({
        id: c.id,
        sourceUrl: c.sourceUrl,
        startTime: c.startTime,
        duration: c.duration
      })))
      
      // CRITICAL FIX: Update total duration after split
      const newTotalDuration = updatedClips.length === 0 
        ? 0 
        : Math.max(...updatedClips.map(c => c.startTime + c.duration))
      
      return {
        ...context,
        totalDuration: newTotalDuration,
        timeline: {
          ...context.timeline,
          clips: updatedClips
        }
      }
    }),
    
    clickScrubber: assign({
      timeline: ({ context, event }) => {
        if (event.type !== 'SCRUBBER.CLICK') {
          return context.timeline
        }
        
        return {
          ...context.timeline,
          scrubber: {
            ...context.timeline.scrubber,
            position: Math.max(0, Math.min(event.position, context.totalDuration))
          }
        }
      },
      currentTime: ({ event }) => {
        if (event.type === 'SCRUBBER.CLICK') {
          return event.position
        }
        return 0
      }
    })
  },
  guards: {
    hasSegments: ({ context }) => {
      return (context?.segments?.length > 0) || 
             (context?.timeline?.clips?.length > 0) ||
             (context?.totalDuration > 0)
    },
    hasMoreClips: ({ context }) => {
      // Check if there are more clips after the current one
      const currentClip = context.timeline.clips.find(c => c.id === context.playback.currentClipId)
      if (!currentClip) return false
      
      const currentClipEndTime = currentClip.startTime + currentClip.duration
      const nextClip = context.timeline.clips.find(clip => 
        clip.startTime >= currentClipEndTime && clip.id !== currentClip.id
      )
      
      return !!nextClip
    }
  }
}).createMachine({
  id: 'videoEditor',
  initial: 'idle',
  context: getInitialContext(),
  states: {
    idle: {
      on: {
        'RECORDING.START': {
          target: 'recording',
          actions: 'startRecording'
        },
        'PLAYBACK.PLAY': {
          target: 'playing',
          guard: 'hasSegments',
          actions: 'resumePlayback'
        },
        'TIMELINE.ADD_SEGMENT': {
          actions: 'addSegment'
        },
        'TIMELINE.CLIP_ADDED': {
          actions: 'addClipToTimeline'
        },
        'TIMELINE.CLIP_SELECTED': {
          actions: 'selectClip'
        },
        'TIMELINE.TRACK_ADDED': {
          actions: 'addTrackToTimeline'
        },
        'SCRUBBER.START_DRAG': {
          actions: 'startScrubberDrag'
        },
        'SCRUBBER.DRAG': {
          actions: 'updateScrubberPosition'
        },
        'SCRUBBER.END_DRAG': {
          actions: 'endScrubberDrag'
        },
        'SCRUBBER.CLICK': {
          actions: 'clickScrubber'
        },
        'VIDEO.LOADED': {
          actions: 'updateVideoDuration'
        },
        'CLIPS.DELETE_SELECTED': {
          actions: 'deleteSelectedClips'
        },
        'CLIPS.DESELECT_ALL': {
          actions: 'deselectAllClips'
        },
        'CLIPS.SPLIT_AT_PLAYHEAD': {
          actions: 'splitClipAtPlayhead'
        }
      }
    },
    recording: {
      on: {
        'RECORDING.STOP': {
          target: 'idle',
          actions: 'stopRecording'
        },
        'RECORDING.CANCELLED': {
          target: 'idle',
          // V2 BULLETPROOF: Reset state without creating segment
          actions: assign({
            recording: () => ({
              startTime: null,
              duration: 0,
              isActive: false
            })
          })
        }
      }
    },
    playing: {
      on: {
        'RECORDING.START': {
          target: 'recording',
          actions: ['pausePlayback', 'startRecording']
        },
        'PLAYBACK.PAUSE': {
          target: 'paused',
          actions: 'pausePlayback'
        },
        'PLAYBACK.SEEK': {
          target: 'seeking',
          actions: 'seek'
        },
        'PLAYBACK.ACTIONS_PROCESSED': {
          actions: 'clearPendingActions'
        },
        'TIMELINE.CLIP_SELECTED': {
          actions: 'selectClip'
        },
        'SCRUBBER.CLICK': {
          actions: 'clickScrubber'
        },
        // Add SCRUBBER.DRAG to update position during playback
        'SCRUBBER.DRAG': {
          actions: 'updateScrubberPosition'
        },
        // Handle video events from services
        'VIDEO.TIME_UPDATE': {
          actions: 'updateVideoTime'
        },
        'VIDEO.LOADED': {
          actions: ['updateVideoLoaded', 'clearPendingActions']
        },
        'VIDEO.ENDED': [
          {
            target: 'playing',
            guard: 'hasMoreClips',
            actions: 'handleVideoEnded'
          },
          {
            target: 'paused', 
            actions: 'handleVideoEnded'
          }
        ]
      }
    },
    paused: {
      on: {
        'RECORDING.START': {
          target: 'recording',
          actions: 'startRecording'
        },
        'PLAYBACK.PLAY': {
          target: 'playing',
          actions: 'resumePlayback'
        },
        'PLAYBACK.SEEK': {
          target: 'seeking',
          actions: 'seek'
        },
        'PLAYBACK.ACTIONS_PROCESSED': {
          actions: 'clearPendingActions'
        },
        'TIMELINE.CLIP_ADDED': {
          actions: 'addClipToTimeline'
        },
        'TIMELINE.CLIP_SELECTED': {
          actions: 'selectClip'
        },
        'SCRUBBER.START_DRAG': {
          actions: 'startScrubberDrag'
        },
        'SCRUBBER.DRAG': {
          actions: 'updateScrubberPosition'
        },
        'SCRUBBER.END_DRAG': {
          actions: 'endScrubberDrag'
        },
        'SCRUBBER.CLICK': {
          actions: 'clickScrubber'
        },
        'CLIPS.DELETE_SELECTED': {
          actions: 'deleteSelectedClips'
        },
        'CLIPS.SPLIT_AT_PLAYHEAD': {
          actions: 'splitClipAtPlayhead'
        }
      }
    },
    seeking: {
      after: {
        100: { target: 'paused' }
      }
    }
  }
})
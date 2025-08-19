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
      pendingSeek: null
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
      })
    }),
    
    resumePlayback: assign(({ context }) => {
      // BUSINESS LOGIC: Determine which clip should play
      const position = context.timeline.scrubber.position
      const targetClip = context.timeline.clips.find(clip => 
        position >= clip.startTime && position < clip.startTime + clip.duration
      )
      
      // Enhanced multi-clip logic
      if (!targetClip) {
        // If no clip at current position, check if we should start from the beginning
        const firstClip = context.timeline.clips.sort((a, b) => a.startTime - b.startTime)[0]
        if (firstClip) {
          return {
            ...context,
            isPlaying: true,
            timeline: {
              ...context.timeline,
              scrubber: {
                ...context.timeline.scrubber,
                position: firstClip.startTime
              }
            },
            playback: {
              ...context.playback,
              currentClipId: firstClip.id,
              activeClipStartTime: firstClip.startTime,
              globalTimelinePosition: firstClip.startTime,
              pendingClipTransition: firstClip,
              pendingSeek: { time: 0 }
            }
          }
        } else {
          return {
            ...context,
            isPlaying: false
          }
        }
      }
      
      // Check if at end of current clip and need to reset to beginning of all clips
      const allClipsEndTime = Math.max(...context.timeline.clips.map(c => c.startTime + c.duration))
      const shouldResetAll = position >= allClipsEndTime - 0.1
      
      if (shouldResetAll) {
        const firstClip = context.timeline.clips.sort((a, b) => a.startTime - b.startTime)[0]
        return {
          ...context,
          isPlaying: true,
          timeline: {
            ...context.timeline,
            scrubber: {
              ...context.timeline.scrubber,
              position: firstClip.startTime
            }
          },
          playback: {
            ...context.playback,
            currentClipId: firstClip.id,
            activeClipStartTime: firstClip.startTime,
            globalTimelinePosition: firstClip.startTime,
            pendingClipTransition: firstClip,
            pendingSeek: { time: 0 }
          }
        }
      }
      
      // Normal clip playback
      // Check if we're resuming the same clip or switching clips
      const isResuming = context.playback.currentClipId === targetClip.id && 
                        !context.playback.pendingClipTransition
      
      if (isResuming) {
        return {
          ...context,
          isPlaying: true,
          playback: {
            ...context.playback,
            globalTimelinePosition: position,
            // Set pending seek but no clip transition (already loaded)
            pendingSeek: { time: position - targetClip.startTime },
            pendingClipTransition: null
          }
        }
      } else {
        return {
          ...context,
          isPlaying: true,
          playback: {
            ...context.playback,
            currentClipId: targetClip.id,
            activeClipStartTime: targetClip.startTime,
            globalTimelinePosition: position,
            pendingClipTransition: targetClip,
            pendingSeek: { time: position - targetClip.startTime }
          }
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
      
      // BUSINESS LOGIC: Find which clip contains this time
      const targetClip = context.timeline.clips.find(clip => 
        seekTime >= clip.startTime && seekTime < clip.startTime + clip.duration
      )
      
      if (targetClip) {
        const localTime = seekTime - targetClip.startTime
        
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
            pendingClipTransition: targetClip,
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
      
      // Multi-clip transition logic
      const currentClip = context.timeline.clips.find(c => c.id === context.playback.currentClipId)
      if (currentClip) {
        const currentClipEndTime = currentClip.startTime + currentClip.duration
        
        // Find the next clip that starts at or after the current clip ends
        const nextClip = context.timeline.clips.find(clip => 
          clip.startTime >= currentClipEndTime && clip.id !== currentClip.id
        )
        
        if (nextClip) {
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
              pendingSeek: { time: 0 } // Start from beginning of next clip
            }
          }
        } else {
          return {
            ...context,
            isPlaying: false,
            playback: {
              ...context.playback,
              pendingClipTransition: null,
              pendingSeek: null
            }
          }
        }
      } else {
        return {
          ...context,
          isPlaying: false,
          playback: {
            ...context.playback,
            pendingClipTransition: null,
            pendingSeek: null
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
    
    endScrubberDrag: assign({
      timeline: ({ context }) => ({
        ...context.timeline,
        scrubber: { ...context.timeline.scrubber, isDragging: false }
      })
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
          pendingSeek: null
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
      
      // Find the clip that contains the playhead position
      const clipToSplit = context.timeline.clips.find(clip => 
        playheadPosition > clip.startTime && 
        playheadPosition < clip.startTime + clip.duration
      )
      
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
      
      return {
        ...context,
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
// ARCHITECTURE: Following Principle 3 - State Machine Authority (lines 20-23)
// All state changes go through validated state machine transitions
// Implementation from lines 61-193 of BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md

import { createMachine, assign } from 'xstate'
import type { VideoSegment } from '../types'

// Timeline types
export interface TimelineClip {
  id: string
  trackId: string
  sourceUrl: string  // Video URL from recording
  startTime: number  // Position on timeline (seconds)
  duration: number   // Clip duration (seconds)
  inPoint: number    // Start point in source (seconds)
  outPoint: number   // End point in source (seconds)
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
  // Single source of truth for all editor state
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
  // NEW: Timeline-specific state (Phase A1 & A2)
  timeline: {
    clips: TimelineClip[]
    tracks: Track[]
    scrubber: {
      position: number  // Position in seconds
      isDragging: boolean
      snapEnabled: boolean
    }
    viewport: {
      zoom: number  // 1 = 100%, 2 = 200%, etc.
      scrollLeft: number  // Horizontal scroll position
      pixelsPerSecond: number  // Base: 50px/s
    }
  }
}

export type VideoEditorEvent = 
  | { type: 'RECORDING.START'; mode: 'screen' | 'camera' | 'audio' }
  | { type: 'RECORDING.STOP' }
  | { type: 'PLAYBACK.PLAY' }
  | { type: 'PLAYBACK.PAUSE' }
  | { type: 'PLAYBACK.SEEK'; time: number }
  | { type: 'TIMELINE.ADD_SEGMENT'; segment: VideoSegment }
  | { type: 'TIMELINE.SELECT_SEGMENT'; segmentId: string }
  // NEW: Timeline events (Phase A1)
  | { type: 'TIMELINE.CLIP_ADDED'; clip: TimelineClip }
  | { type: 'TIMELINE.CLIP_SELECTED'; clipId: string }
  | { type: 'TIMELINE.TRACK_ADDED'; track: Track }
  // NEW: Scrubber events (Phase A2)
  | { type: 'SCRUBBER.START_DRAG' }
  | { type: 'SCRUBBER.DRAG'; position: number }
  | { type: 'SCRUBBER.END_DRAG' }
  | { type: 'SCRUBBER.CLICK'; position: number }
  | { type: 'SCRUBBER.UPDATE_POSITION'; position: number }

// Default timeline state for defensive programming
const DEFAULT_TRACKS: Track[] = [
  { id: 'video-1', type: 'video', index: 0, height: 80, isLocked: false, isVisible: true },
  { id: 'video-2', type: 'video', index: 1, height: 80, isLocked: false, isVisible: true },
  { id: 'audio-1', type: 'audio', index: 0, height: 60, isLocked: false, isVisible: true }
]

const DEFAULT_TIMELINE = {
  clips: [],
  tracks: DEFAULT_TRACKS,
  scrubber: { position: 0, isDragging: false, snapEnabled: true },
  viewport: { zoom: 1, scrollLeft: 0, pixelsPerSecond: 50 }
}

// Type guards for event types (following Principle 1: SSOT with TypeScript enforcement) - NO ANY TYPES
function hasClip(event: VideoEditorEvent): event is { type: 'TIMELINE.CLIP_ADDED'; clip: TimelineClip } {
  return event && event.type === 'TIMELINE.CLIP_ADDED' && 'clip' in event
}

function hasTrack(event: VideoEditorEvent): event is { type: 'TIMELINE.TRACK_ADDED'; track: Track } {
  return event && event.type === 'TIMELINE.TRACK_ADDED' && 'track' in event
}

function hasClipId(event: VideoEditorEvent): event is { type: 'TIMELINE.CLIP_SELECTED'; clipId: string } {
  return event && event.type === 'TIMELINE.CLIP_SELECTED' && 'clipId' in event
}

function hasPosition(event: VideoEditorEvent): event is { type: 'SCRUBBER.DRAG'; position: number } | { type: 'SCRUBBER.CLICK'; position: number } | { type: 'SCRUBBER.UPDATE_POSITION'; position: number } {
  return event && (event.type === 'SCRUBBER.DRAG' || event.type === 'SCRUBBER.CLICK' || event.type === 'SCRUBBER.UPDATE_POSITION') && 'position' in event
}

export const videoEditorMachine = createMachine<VideoEditorContext, VideoEditorEvent>({
  id: 'videoEditor',
  initial: 'idle',
  context: {
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
    // Initialize timeline state with defaults
    timeline: DEFAULT_TIMELINE
  },
  states: {
    idle: {
      on: {
        'RECORDING.START': {
          target: 'recording',
          actions: 'startRecording'
        },
        'PLAYBACK.PLAY': {
          target: 'playing',
          guard: 'hasSegments'
        },
        'TIMELINE.ADD_SEGMENT': {
          actions: 'addSegment'
        },
        // Timeline events
        'TIMELINE.CLIP_ADDED': {
          actions: 'addClipToTimeline'
        },
        'TIMELINE.CLIP_SELECTED': {
          actions: 'selectClip'
        },
        'TIMELINE.TRACK_ADDED': {
          actions: 'addTrackToTimeline'
        },
        // Scrubber events
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
        }
      }
    },
    recording: {
      on: {
        'RECORDING.STOP': {
          target: 'idle',
          actions: 'stopRecording'
        }
      }
    },
    playing: {
      on: {
        'PLAYBACK.PAUSE': {
          target: 'paused',
          actions: 'pausePlayback'
        },
        'PLAYBACK.SEEK': {
          target: 'seeking',
          actions: 'seek'
        },
        // Timeline events allowed during playback
        'TIMELINE.CLIP_SELECTED': {
          actions: 'selectClip'
        },
        'SCRUBBER.CLICK': {
          actions: 'clickScrubber'
        }
      }
    },
    paused: {
      on: {
        'PLAYBACK.PLAY': {
          target: 'playing',
          actions: 'resumePlayback'
        },
        'PLAYBACK.SEEK': {
          target: 'seeking',
          actions: 'seek'
        },
        // Timeline events allowed when paused
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
        }
      }
    },
    seeking: {
      after: {
        100: { target: 'paused' } // Auto-transition after seek
      }
    }
  }
}, {
  actions: {
    startRecording: assign({
      recording: (context, event) => ({
        ...context.recording,
        startTime: performance.now(),
        isActive: true
      })
    }),
    stopRecording: assign({
      recording: (context) => {
        const duration = context.recording?.startTime 
          ? (performance.now() - context.recording.startTime) / 1000 
          : 0
        return {
          startTime: null,
          duration,
          isActive: false
        }
      },
      // Set totalDuration when recording stops so play button becomes enabled
      totalDuration: (context) => {
        const duration = context.recording?.startTime 
          ? (performance.now() - context.recording.startTime) / 1000 
          : 0
        return Math.max(context.totalDuration, duration)
      }
    }),
    addSegment: assign({
      segments: (context, event) => [...context.segments, event.segment],
      totalDuration: (context, event) => Math.max(
        context.totalDuration,
        event.segment.startTime + event.segment.duration
      )
    }),
    seek: assign({
      currentTime: (_, event) => event.time
    }),
    pausePlayback: assign({
      isPlaying: false
    }),
    resumePlayback: assign({
      isPlaying: true
    }),
    // NEW: Timeline actions (Phase A1)
    addClipToTimeline: assign({
      timeline: (context, event) => {
        console.log('🔍 addClipToTimeline called with:', { context, event })
        
        // Ensure timeline exists
        const currentTimeline = context.timeline || DEFAULT_TIMELINE
        
        // Type check for TIMELINE.CLIP_ADDED event
        if (!event || !('clip' in event)) {
          console.warn('addClipToTimeline: No clip in event', event)
          return currentTimeline
        }
        
        const clip = hasClip(event) ? event.clip : null
        if (!clip) return currentTimeline
        console.log('📎 Processing clip:', clip)
        
        // Calculate the next available position for the clip
        const trackClips = currentTimeline.clips.filter(c => c.trackId === clip.trackId)
        let startTime = clip.startTime
        
        if (startTime === 0 && trackClips.length > 0) {
          // Auto-position after the last clip on this track
          const lastClip = trackClips.reduce((latest, c) => 
            (c.startTime > latest.startTime) ? c : latest
          )
          startTime = lastClip.startTime + lastClip.duration
        }
        
        const clipWithPosition = { ...clip, startTime }
        
        return {
          ...currentTimeline,
          clips: [...currentTimeline.clips, clipWithPosition]
        }
      },
      totalDuration: (context, event) => {
        // Ensure timeline exists
        const currentTimeline = context.timeline || DEFAULT_TIMELINE
        
        if (!event || !('clip' in event)) {
          return context.totalDuration || 0
        }
        
        const clip = hasClip(event) ? event.clip : null
        if (!clip) return context.totalDuration || 0
        
        // Recalculate total duration including the new clip
        const trackClips = currentTimeline.clips.filter(c => c.trackId === clip.trackId)
        let startTime = clip.startTime
        
        if (startTime === 0 && trackClips.length > 0) {
          const lastClip = trackClips.reduce((latest, c) => 
            (c.startTime > latest.startTime) ? c : latest
          )
          startTime = lastClip.startTime + lastClip.duration
        }
        
        return Math.max(
          context.totalDuration || 0,
          startTime + clip.duration
        )
      }
    }),
    selectClip: assign({
      timeline: (context, event) => {
        if (!hasClipId(event)) {
          return context.timeline
        }
        return {
          ...context.timeline,
          clips: context.timeline.clips.map(clip => ({
            ...clip,
            isSelected: clip.id === event.clipId
          }))
        }
      }
    }),
    addTrackToTimeline: assign({
      timeline: (context, event) => {
        // Ensure timeline exists with safe defaults
        const currentTimeline = context.timeline || DEFAULT_TIMELINE
        
        if (!hasTrack(event)) {
          console.warn('addTrackToTimeline: Invalid event type', event)
          return currentTimeline
        }
        
        const track = event.track
        
        // Check if track already exists
        const trackExists = currentTimeline.tracks.some(t => t.id === track.id)
        if (trackExists) {
          return currentTimeline
        }
        
        return {
          ...currentTimeline,
          tracks: [...currentTimeline.tracks, track]
        }
      }
    }),
    // NEW: Scrubber actions (Phase A2)
    startScrubberDrag: assign({
      timeline: (context) => {
        const currentTimeline = context.timeline || DEFAULT_TIMELINE
        return {
          ...currentTimeline,
          scrubber: { ...currentTimeline.scrubber, isDragging: true }
        }
      }
    }),
    updateScrubberPosition: assign({
      timeline: (context, event) => {
        const currentTimeline = context.timeline || DEFAULT_TIMELINE
        
        if (!hasPosition(event)) {
          return currentTimeline
        }
        
        return {
          ...currentTimeline,
          scrubber: { 
            ...currentTimeline.scrubber, 
            position: Math.max(0, Math.min(event.position, context.totalDuration || 0))
          }
        }
      },
      currentTime: (_, event) => hasPosition(event) ? event.position : 0
    }),
    endScrubberDrag: assign({
      timeline: (context) => {
        const currentTimeline = context.timeline || DEFAULT_TIMELINE
        return {
          ...currentTimeline,
          scrubber: { ...currentTimeline.scrubber, isDragging: false }
        }
      }
    }),
    clickScrubber: assign({
      timeline: (context, event) => {
        const currentTimeline = context.timeline || DEFAULT_TIMELINE
        
        if (!hasPosition(event)) {
          return currentTimeline
        }
        
        return {
          ...currentTimeline,
          scrubber: { 
            ...currentTimeline.scrubber, 
            position: Math.max(0, Math.min(event.position, context.totalDuration || 0))
          }
        }
      },
      currentTime: (_, event) => hasPosition(event) ? event.position : 0
    })
  },
  guards: {
    hasSegments: (context) => {
      // Can play if we have segments OR timeline clips OR a duration
      return (context?.segments?.length > 0) || 
             (context?.timeline?.clips?.length > 0) ||
             (context?.totalDuration > 0)
    }
  }
})
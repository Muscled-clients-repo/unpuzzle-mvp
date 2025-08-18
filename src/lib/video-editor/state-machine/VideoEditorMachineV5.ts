// BULLETPROOF ARCHITECTURE COMPLIANT - XState v5 Implementation
// Following all 5 principles with NO contradictions

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
  | { type: 'PLAYBACK.PLAY' }
  | { type: 'PLAYBACK.PAUSE' }
  | { type: 'PLAYBACK.SEEK'; time: number }
  | { type: 'VIDEO.LOADED'; duration: number }  // New event for video loaded
  | { type: 'TIMELINE.ADD_SEGMENT'; segment: VideoSegment }
  | { type: 'TIMELINE.SELECT_SEGMENT'; segmentId: string }
  | { type: 'TIMELINE.CLIP_ADDED'; clip: TimelineClip }
  | { type: 'TIMELINE.CLIP_SELECTED'; clipId: string }
  | { type: 'TIMELINE.TRACK_ADDED'; track: Track }
  | { type: 'SCRUBBER.START_DRAG' }
  | { type: 'SCRUBBER.DRAG'; position: number }
  | { type: 'SCRUBBER.END_DRAG' }
  | { type: 'SCRUBBER.CLICK'; position: number }

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
    
    // Playback actions
    pausePlayback: assign({
      isPlaying: false
    }),
    
    resumePlayback: assign({
      isPlaying: true
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
    
    seek: assign({
      currentTime: ({ event }) => {
        if (event.type === 'PLAYBACK.SEEK') {
          return event.time
        }
        return 0
      },
      timeline: ({ context, event }) => {
        if (event.type === 'PLAYBACK.SEEK') {
          return {
            ...context.timeline,
            scrubber: {
              ...context.timeline.scrubber,
              position: event.time
            }
          }
        }
        return context.timeline
      }
    }),
    
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
        console.log('✅ XState v5 addClipToTimeline:', { event })
        
        // Type guard for the specific event
        if (event.type !== 'TIMELINE.CLIP_ADDED') {
          return context.timeline
        }
        
        const clip = event.clip
        const currentTimeline = context.timeline
        
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
        console.log('📎 Adding clip to timeline:', clipWithPosition)
        
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
          guard: 'hasSegments'
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
        'TIMELINE.CLIP_SELECTED': {
          actions: 'selectClip'
        },
        'SCRUBBER.CLICK': {
          actions: 'clickScrubber'
        },
        // Add SCRUBBER.DRAG to update position during playback
        'SCRUBBER.DRAG': {
          actions: 'updateScrubberPosition'
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
        100: { target: 'paused' }
      }
    }
  }
})
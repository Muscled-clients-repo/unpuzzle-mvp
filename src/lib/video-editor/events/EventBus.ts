// ARCHITECTURE: Following Principle 2 - Event-Driven Communication (lines 15-18)
// All inter-service communication happens via typed events
// Implementation from lines 197-281 of BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md

import type { VideoSegment } from '../types'
import type { TimelineClip, Track } from '../state-machine/VideoEditorMachineV5'

export interface VideoEditorEvents {
  // Recording events
  'recording.started': { startTime: number; mode: string }
  'recording.stopped': { duration: number; videoBlob: Blob; videoUrl: string }
  'recording.error': { error: Error }
  
  // Playback events
  'playback.play': { currentTime: number }
  'playback.pause': { currentTime: number }
  'playback.seek': { time: number }
  'playback.timeUpdate': { currentTime: number }
  'playback.videoLoaded': { duration: number }
  
  // Timeline events
  'timeline.segmentAdded': { segment: VideoSegment }
  'timeline.segmentSelected': { segmentId: string }
  'timeline.segmentMoved': { segmentId: string; newStartTime: number }
  
  // NEW: Timeline events (Phase A1)
  'timeline.clipAdded': { clip: TimelineClip } // Properly typed
  'timeline.clipSelected': { clipId: string }
  'timeline.clipMoved': { clipId: string; newStartTime: number; trackId: string }
  'timeline.trackAdded': { track: Track } // Properly typed
  'timeline.trackRemoved': { trackId: string }
  
  // NEW: Scrubber events (Phase A2)
  'scrubber.positionChanged': { position: number; source: 'drag' | 'click' | 'playback' }
  'scrubber.dragStarted': { position: number }
  'scrubber.dragEnded': { position: number }
  
  // Clip management events
  'clips.deleted': { remainingClips: number }
  'preview.clear': {}
}

export class TypedEventBus {
  private listeners = new Map<keyof VideoEditorEvents, Set<Function>>()
  private eventLog: Array<{ type: keyof VideoEditorEvents; payload: VideoEditorEvents[keyof VideoEditorEvents]; timestamp: number }> = []

  emit<K extends keyof VideoEditorEvents>(
    type: K, 
    payload: VideoEditorEvents[K]
  ): void {
    // Log event for debugging/replay
    this.eventLog.push({
      type: type as string,
      payload,
      timestamp: performance.now()
    })

    // Notify listeners
    const typeListeners = this.listeners.get(type)
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(payload)
        } catch (error) {
          console.error(`Event listener error for ${type}:`, error)
        }
      })
    }
  }

  on<K extends keyof VideoEditorEvents>(
    type: K,
    listener: (payload: VideoEditorEvents[K]) => void
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    
    this.listeners.get(type)!.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(listener)
    }
  }

  getEventLog(): ReadonlyArray<{ type: keyof VideoEditorEvents; payload: VideoEditorEvents[keyof VideoEditorEvents]; timestamp: number }> {
    return [...this.eventLog]
  }

  replay(fromTimestamp?: number): void {
    const eventsToReplay = fromTimestamp 
      ? this.eventLog.filter(e => e.timestamp >= fromTimestamp)
      : this.eventLog

    eventsToReplay.forEach(event => {
      this.emit(event.type as keyof VideoEditorEvents, event.payload)
    })
  }
}

// Singleton instance (with enhancement from review)
class EventBusSingleton {
  private static instance: TypedEventBus

  static getInstance(): TypedEventBus {
    if (!this.instance) {
      this.instance = new TypedEventBus()
    }
    return this.instance
  }
}

export const eventBus = EventBusSingleton.getInstance()
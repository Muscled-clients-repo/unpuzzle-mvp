// ARCHITECTURE: CQRS Pattern - Queries are read-only
// Implementation from lines 754-808 of BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md

import type { RecordingService } from '../services/RecordingService'
import type { PlaybackService } from '../services/PlaybackService'
import type { TimelineService } from '../services/TimelineService'
import type { VideoSegment } from '../types'
import type { TimelineClip, Track } from '../state-machine/VideoEditorMachineV5'

// PRINCIPLE 1: NO 'any' types - Proper XState v5 typing
import type { Actor } from 'xstate'
import type { videoEditorMachine } from '../state-machine/VideoEditorMachineV5'

type StateMachine = Actor<typeof videoEditorMachine>

export class VideoEditorQueries {
  constructor(
    private recordingService: RecordingService,
    private playbackService: PlaybackService,
    private timelineService: TimelineService,
    private stateMachine: StateMachine
  ) {}

  // Recording Queries
  isRecording(): boolean {
    return this.recordingService.isRecording
  }

  getRecordingDuration(): number {
    return this.recordingService.recordingDuration
  }

  // Playback Queries
  getCurrentTime(): number {
    return this.playbackService.currentTime
  }

  isPlaying(): boolean {
    return this.playbackService.isPlaying
  }

  getDuration(): number {
    // Following architecture: State Machine owns business state (totalDuration)
    const snapshot = this.stateMachine.getSnapshot()
    return snapshot.context.totalDuration
  }

  // Timeline Queries - Read from State Machine (SSOT Principle)
  getSegments(): ReadonlyArray<VideoSegment> {
    // ARCHITECTURE: Read business state from State Machine (line 902)
    const snapshot = this.stateMachine.getSnapshot()
    return snapshot.context.segments
  }

  getTotalDuration(): number {
    // ARCHITECTURE: Read business state from State Machine (line 908)
    const snapshot = this.stateMachine.getSnapshot()
    return snapshot.context.totalDuration
  }

  getSelectedSegmentId(): string | null {
    const snapshot = this.stateMachine.getSnapshot()
    return snapshot.context.selectedSegmentId
  }

  // State Machine Queries
  getCurrentState(): string {
    const snapshot = this.stateMachine.getSnapshot()
    return snapshot.value as string
  }

  canExecuteCommand(command: string): boolean {
    const snapshot = this.stateMachine.getSnapshot()
    const currentState = snapshot.value
    
    // Validate based on current state and command
    switch (command) {
      case 'RECORDING.START':
        return currentState === 'idle'
      case 'RECORDING.STOP':
        return currentState === 'recording'
      case 'PLAYBACK.PLAY':
        return currentState === 'idle' || currentState === 'paused'
      case 'PLAYBACK.PAUSE':
        return currentState === 'playing'
      default:
        return true // Allow other commands
    }
  }

  // NEW: Timeline queries (Phase A1)
  getTimelineClips(): ReadonlyArray<TimelineClip> {
    const snapshot = this.stateMachine.getSnapshot()
    const clips = snapshot.context.timeline.clips
    // Removed verbose logging - this is called frequently by polling
    return clips
  }
  
  getTimelineTracks(): ReadonlyArray<Track> {
    const snapshot = this.stateMachine.getSnapshot()
    return snapshot.context.timeline.tracks
  }
  
  // NEW: Scrubber queries (Phase A2)
  getScrubberPosition(): number {
    const snapshot = this.stateMachine.getSnapshot()
    return snapshot.context.timeline.scrubber.position
  }
  
  isDraggingScrubber(): boolean {
    const snapshot = this.stateMachine.getSnapshot()
    return snapshot.context.timeline.scrubber.isDragging
  }
  
  // Utility query for finding clips
  getClipById(clipId: string): TimelineClip | undefined {
    const clips = this.getTimelineClips()
    return clips.find(c => c.id === clipId)
  }
}
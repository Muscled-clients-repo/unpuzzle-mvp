// ARCHITECTURE: CQRS Pattern - Commands mutate state
// Implementation from lines 663-751 of BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md
// FIX: Line 690 return type corrected to Promise<RecordingResult>

import type { RecordingService } from '../services/RecordingService'
import type { TimelineService } from '../services/TimelineService'
import type { VideoSegment, RecordingResult } from '../types'
import type { TimelineClip, Track } from '../state-machine/VideoEditorMachineV5'
import { eventBus } from '../events/EventBus'

// PRINCIPLE 1: NO 'any' types - Proper XState v5 typing
import type { Actor } from 'xstate'
import type { videoEditorMachine } from '../state-machine/VideoEditorMachineV5'

type StateMachine = Actor<typeof videoEditorMachine>

export class VideoEditorCommands {
  constructor(
    private recordingService: RecordingService,
    private timelineService: TimelineService,
    private stateMachine: StateMachine
    // Keep services for recording and timeline operations
  ) {}

  // Recording Commands
  async startRecording(mode: 'screen' | 'camera' | 'audio'): Promise<void> {
    // PRINCIPLE 2: Event flow - State machine FIRST, service SECOND
    const snapshot = this.stateMachine.getSnapshot()
    
    if (snapshot.value === 'recording') {
      throw new Error('Already recording')
    }

    // 1. Update state machine FIRST
    this.stateMachine.send({ type: 'RECORDING.START', mode })
    
    try {
      // 2. Execute service action SECOND
      await this.recordingService.start(mode)
    } catch (error: any) {
      // V2 BULLETPROOF: Compensating action on failure
      
      // If user cancelled (NotAllowedError), revert state machine
      if (error.name === 'NotAllowedError') {
        // V2 BULLETPROOF: Use proper cancellation event
        this.stateMachine.send({ type: 'RECORDING.CANCELLED' })
        // Don't throw for user cancellation
        return
      }
      
      // Only log actual errors, not cancellations
      console.error('Recording start failed:', error)
      throw error
    }
    
    const newSnapshot = this.stateMachine.getSnapshot()
    console.log('Recording started, state should be:', newSnapshot.value)
  }

  async stopRecording(): Promise<RecordingResult> {
    // PRINCIPLE 2: Event flow - State machine FIRST, service SECOND
    const snapshot = this.stateMachine.getSnapshot()
    
    if (snapshot.value !== 'recording') {
      console.warn('Not recording, but will attempt to stop')
    }

    // 1. Update state machine FIRST
    this.stateMachine.send({ type: 'RECORDING.STOP' })
    
    try {
      // 2. Execute service action SECOND
      const result = await this.recordingService.stop()
      
      const newSnapshot = this.stateMachine.getSnapshot()
      console.log('Recording stopped, state should be:', newSnapshot.value)
      
      return result
    } catch (error) {
      console.error('Recording stop failed:', error)
      throw error
    }
  }

  // Playback Commands  
  play(): void {
    this.stateMachine.send({ type: 'PLAYBACK.PLAY' })
  }

  pause(): void {
    this.stateMachine.send({ type: 'PLAYBACK.PAUSE' })
  }

  seek(time: number): void {
    if (time < 0) {
      throw new Error('Seek time cannot be negative')
    }

    this.stateMachine.send({ type: 'PLAYBACK.SEEK', time })
  }

  // Timeline Commands
  addSegment(segment: Omit<VideoSegment, 'id'>): void {
    // Create segment with ID
    const newSegment: VideoSegment = {
      ...segment,
      id: `segment-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    }
    
    // Send to state machine (single source of truth)
    this.stateMachine.send({ 
      type: 'TIMELINE.ADD_SEGMENT', 
      segment: newSegment 
    })
    
    // Service will be notified via event bus if needed
    this.timelineService.requestAddSegment(segment)
  }

  selectSegment(segmentId: string): void {
    // Send to state machine first (single source of truth)
    this.stateMachine.send({ 
      type: 'TIMELINE.SELECT_SEGMENT', 
      segmentId 
    })
    
    // Service will be notified via event bus if needed
    this.timelineService.requestSelectSegment(segmentId)
  }

  // Delete selected clips
  deleteSelectedClips(): void {
    // Get current state to check what we're deleting
    const snapshot = this.stateMachine.getSnapshot()
    const remainingClips = snapshot.context.timeline.clips.filter(c => !c.isSelected)
    
    // Delete the clips
    this.stateMachine.send({ type: 'CLIPS.DELETE_SELECTED' })
    
    // Following BULLETPROOF architecture: emit event for services to react
    eventBus.emit('clips.deleted', { remainingClips: remainingClips.length })
    
    // If no clips remain, notify to clear the preview
    if (remainingClips.length === 0) {
      eventBus.emit('preview.clear', {})
    }
  }

  // Split clip at playhead position
  splitClipAtPlayhead(): void {
    this.stateMachine.send({ type: 'CLIPS.SPLIT_AT_PLAYHEAD' })
  }

  // Generic execute method for all commands
  execute(command: string, params: Record<string, unknown> = {}): void {
    switch (command) {
      case 'RECORDING.START':
        this.startRecording((params.mode as 'screen' | 'camera' | 'audio') || 'screen')
        break
      case 'RECORDING.STOP':
        this.stopRecording()
        break
      case 'PLAYBACK.PLAY':
        this.play()
        break
      case 'PLAYBACK.PAUSE':
        this.pause()
        break
      case 'PLAYBACK.SEEK':
        this.seek((params.time as number) || 0)
        break
      case 'TIMELINE.ADD_SEGMENT':
        this.addSegment(params.segment as Omit<VideoSegment, 'id'>)
        break
      case 'TIMELINE.SELECT_SEGMENT':
        this.selectSegment(params.segmentId as string)
        break
      // NEW: Timeline commands (Phase A1)
      case 'TIMELINE.CLIP_ADDED':
        this.stateMachine.send({ type: 'TIMELINE.CLIP_ADDED', clip: params.clip as TimelineClip })
        break
      case 'TIMELINE.CLIP_SELECTED':
        this.stateMachine.send({ 
          type: 'TIMELINE.CLIP_SELECTED', 
          clipId: params.clipId as string,
          multiSelect: params.multiSelect as boolean
        })
        break
      case 'TIMELINE.TRACK_ADDED':
        this.stateMachine.send({ type: 'TIMELINE.TRACK_ADDED', track: params.track as Track })
        break
      // NEW: Scrubber commands (Phase A2)
      case 'SCRUBBER.START_DRAG':
        this.stateMachine.send({ type: 'SCRUBBER.START_DRAG' })
        break
      case 'SCRUBBER.DRAG':
        this.stateMachine.send({ type: 'SCRUBBER.DRAG', position: params.position as number })
        // State Machine will handle seeking during drag
        break
      case 'SCRUBBER.END_DRAG':
        this.stateMachine.send({ type: 'SCRUBBER.END_DRAG' })
        break
      case 'SCRUBBER.CLICK':
        this.stateMachine.send({ type: 'SCRUBBER.CLICK', position: params.position as number })
        // State Machine will handle seeking on click
        break
      case 'CLIPS.DELETE_SELECTED':
        this.deleteSelectedClips()
        break
      case 'CLIPS.SPLIT_AT_PLAYHEAD':
        this.splitClipAtPlayhead()
        break
      default:
        console.warn(`Unknown command: ${command}`)
    }
  }
}
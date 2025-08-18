// ARCHITECTURE: CQRS Pattern - Commands mutate state
// Implementation from lines 663-751 of BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md
// FIX: Line 690 return type corrected to Promise<RecordingResult>

import type { RecordingService } from '../services/RecordingService'
import type { PlaybackService } from '../services/PlaybackService'
import type { TimelineService } from '../services/TimelineService'
import type { VideoSegment, RecordingResult } from '../types'

// PRINCIPLE 1: NO 'any' types - Proper XState v5 typing
import type { Actor, SnapshotFrom } from 'xstate'
import type { videoEditorMachine } from '../state-machine/VideoEditorMachineV5'

type StateMachine = Actor<typeof videoEditorMachine>

export class VideoEditorCommands {
  constructor(
    private recordingService: RecordingService,
    private playbackService: PlaybackService,
    private timelineService: TimelineService,
    private stateMachine: StateMachine
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
    } catch (error) {
      // Compensating action on failure (future enhancement)
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
    const snapshot = this.stateMachine?.getSnapshot()
    const currentState = snapshot?.value || 'idle'
    console.log('🎮 Current state before play:', currentState)
    
    if (currentState === 'playing' || currentState === 'recording') {
      console.warn('Already playing or recording, ignoring play command')
      return
    }

    // Check if we're at the end using state machine's totalDuration (single source of truth)
    const totalDuration = snapshot.context.totalDuration
    const scrubberPosition = snapshot.context.timeline.scrubber.position
    
    console.log('🎬 Play command:', {
      totalDuration,
      scrubberPosition,
      isAtEnd: totalDuration > 0 && scrubberPosition >= totalDuration - 0.1
    })
    
    // If scrubber is at the end (or beyond), reset to beginning
    if (totalDuration > 0 && scrubberPosition >= totalDuration - 0.1) {
      console.log('At end of video, resetting to beginning')
      this.stateMachine.send({ type: 'PLAYBACK.SEEK', time: 0 })
      this.playbackService.seek(0)
    } else if (scrubberPosition !== this.playbackService.currentTime) {
      // Otherwise sync video position with scrubber position
      console.log('Syncing video to scrubber position:', scrubberPosition)
      this.playbackService.seek(scrubberPosition)
    }

    // Send state machine event first to ensure state transition (BEFORE service)
    this.stateMachine.send({ type: 'PLAYBACK.PLAY' })
    
    // Then execute the service action
    this.playbackService.play()
  }

  pause(): void {
    const snapshot = this.stateMachine?.getSnapshot()
    const currentState = snapshot?.value || 'idle'
    if (currentState !== 'playing') {
      console.warn('Cannot pause in current state:', currentState)
      return // Don't throw error, just return
    }

    this.stateMachine.send({ type: 'PLAYBACK.PAUSE' })
    this.playbackService.pause()
  }

  seek(time: number): void {
    if (time < 0) {
      throw new Error('Seek time cannot be negative')
    }

    this.stateMachine.send({ type: 'PLAYBACK.SEEK', time })
    this.playbackService.seek(time)
  }

  // Timeline Commands
  addSegment(segment: Omit<VideoSegment, 'id'>): void {
    // Create segment with ID
    const newSegment: VideoSegment = {
      ...segment,
      id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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

  // Generic execute method for all commands
  execute(command: string, params: Record<string, unknown> = {}): void {
    switch (command) {
      case 'RECORDING.START':
        this.startRecording(params.mode || 'screen')
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
        this.seek(params.time || 0)
        break
      case 'TIMELINE.ADD_SEGMENT':
        this.addSegment(params.segment)
        break
      case 'TIMELINE.SELECT_SEGMENT':
        this.selectSegment(params.segmentId)
        break
      // NEW: Timeline commands (Phase A1)
      case 'TIMELINE.CLIP_ADDED':
      case 'TIMELINE.CLIP_SELECTED':
      case 'TIMELINE.TRACK_ADDED':
        this.stateMachine.send({ type: command, ...params })
        break
      // NEW: Scrubber commands (Phase A2)
      case 'SCRUBBER.START_DRAG':
        this.stateMachine.send({ type: command, ...params })
        break
      case 'SCRUBBER.DRAG':
        this.stateMachine.send({ type: command, ...params })
        // Also seek video to this position during drag
        if (params.position !== undefined) {
          this.playbackService.seek(params.position)
        }
        break
      case 'SCRUBBER.END_DRAG':
        this.stateMachine.send({ type: command, ...params })
        break
      case 'SCRUBBER.CLICK':
        this.stateMachine.send({ type: command, ...params })
        // Also seek video to clicked position
        if (params.position !== undefined) {
          this.playbackService.seek(params.position)
        }
        break
      default:
        console.warn(`Unknown command: ${command}`)
    }
  }
}
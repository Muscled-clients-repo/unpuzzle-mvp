// PRINCIPLE 4: Service Boundary Isolation
// Singleton to prevent duplicate initialization in React StrictMode

import { createActor } from 'xstate'
import { videoEditorMachine } from './state-machine/VideoEditorMachineV5'
import { eventBus } from './events/EventBus'
import { RecordingService } from './services/RecordingService'
import { PlaybackService } from './services/PlaybackService'
import { TimelineService } from './services/TimelineService'
import { VideoEditorCommands } from './commands/VideoEditorCommands'
import { VideoEditorQueries } from './queries/VideoEditorQueries'

let instance: VideoEditorInstance | null = null

interface VideoEditorInstance {
  commands: VideoEditorCommands
  queries: VideoEditorQueries
  cleanup: () => void
}

export function getVideoEditorInstance(): VideoEditorInstance {
  if (instance) {
    console.log('♻️ Reusing existing video editor instance')
    return instance
  }

  console.log('🚀 Creating new video editor instance')
  
  // 1. Create state machine actor (XState v5 pattern)
  const stateMachine = createActor(videoEditorMachine)
  
  // 2. Start the actor
  stateMachine.start()
  
  // 3. Log initial state
  console.log('State machine initialized:', {
    state: stateMachine.getSnapshot().value,
    context: stateMachine.getSnapshot().context
  })

  // Initialize services with event bus
  const recordingService = new RecordingService(eventBus)
  const playbackService = new PlaybackService(eventBus)
  const timelineService = new TimelineService(eventBus)
  
  // Connect EventBus to State Machine for timeline events
  // Store unsubscribe functions to prevent duplicate listeners
  const unsubscribers: Array<() => void> = []
  
  // Forward segment events (for SSOT - State Machine stores segments)
  unsubscribers.push(
    eventBus.on('timeline.segmentAdded', ({ segment }) => {
      console.log('🔗 Forwarding segmentAdded event to state machine', segment)
      stateMachine.send({ type: 'TIMELINE.ADD_SEGMENT', segment })
    })
  )
  
  unsubscribers.push(
    eventBus.on('timeline.segmentSelected', ({ segmentId }) => {
      stateMachine.send({ type: 'TIMELINE.SELECT_SEGMENT', segmentId })
    })
  )
  
  // Forward clip events
  unsubscribers.push(
    eventBus.on('timeline.clipAdded', ({ clip }) => {
      console.log('🔗 Forwarding clipAdded event to state machine', clip)
      stateMachine.send({ type: 'TIMELINE.CLIP_ADDED', clip })
    })
  )
  
  unsubscribers.push(
    eventBus.on('timeline.trackAdded', ({ track }) => {
      stateMachine.send({ type: 'TIMELINE.TRACK_ADDED', track })
    })
  )
  
  // Connect playback time updates to scrubber position
  unsubscribers.push(
    eventBus.on('playback.timeUpdate', ({ currentTime }) => {
      // Update scrubber position during playback
      stateMachine.send({ type: 'SCRUBBER.DRAG', position: currentTime })
    })
  )
  
  
  // Keep scrubber at end position when video ends
  unsubscribers.push(
    eventBus.on('playback.ended', ({ currentTime }) => {
      // Update position and pause state machine
      stateMachine.send({ type: 'SCRUBBER.DRAG', position: currentTime })
      stateMachine.send({ type: 'PLAYBACK.PAUSE' })
    })
  )
  
  // Handle seek events (including reset to beginning)
  unsubscribers.push(
    eventBus.on('playback.seek', ({ time }) => {
      // Update scrubber position when seeking
      stateMachine.send({ type: 'SCRUBBER.DRAG', position: time })
    })
  )
  
  // Handle video loaded event to update totalDuration in state machine
  unsubscribers.push(
    eventBus.on('playback.videoLoaded', ({ duration }) => {
      console.log('📹 Video loaded, updating totalDuration:', duration)
      stateMachine.send({ type: 'VIDEO.LOADED', duration })
    })
  )
  
  // Set video source when recording completes
  unsubscribers.push(
    eventBus.on('recording.complete', ({ videoUrl }) => {
      console.log('📹 Setting video source from recording:', videoUrl)
      const videoElement = document.getElementById('preview-video') as HTMLVideoElement
      if (videoElement && videoUrl) {
        videoElement.src = videoUrl
        videoElement.style.display = 'block'
        // Hide placeholder
        const placeholder = document.getElementById('preview-placeholder')
        if (placeholder) {
          placeholder.style.display = 'none'
        }
      }
    })
  )
  
  // Connect video element once it's available
  if (typeof window !== 'undefined') {
    const checkVideoElement = setInterval(() => {
      const videoElement = document.getElementById('preview-video') as HTMLVideoElement
      if (videoElement && !videoElement.dataset.connected) {
        console.log('Connecting video element to PlaybackService')
        playbackService.setVideoElement(videoElement)
        videoElement.dataset.connected = 'true'
        clearInterval(checkVideoElement)
      }
    }, 100)
    
    // Clear after 5 seconds if not found
    setTimeout(() => clearInterval(checkVideoElement), 5000)
  }

  // Initialize commands and queries
  const commands = new VideoEditorCommands(
    recordingService,
    playbackService,
    timelineService,
    stateMachine
  )

  const queries = new VideoEditorQueries(
    recordingService,
    playbackService,
    timelineService,
    stateMachine
  )
  
  // Create cleanup function
  const cleanup = () => {
    console.log('🧹 Cleaning up video editor instance')
    unsubscribers.forEach(unsubscribe => unsubscribe())
    stateMachine.stop()
    instance = null
  }
  
  instance = { commands, queries, cleanup }
  return instance
}

export function cleanupVideoEditor() {
  if (instance) {
    instance.cleanup()
  }
}
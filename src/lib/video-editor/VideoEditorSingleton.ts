// PRINCIPLE 4: Service Boundary Isolation
// Singleton to prevent duplicate initialization in React StrictMode

import { createActor, type Actor } from 'xstate'
import { videoEditorMachine } from './state-machine/VideoEditorMachineV5'
import { eventBus } from './events/EventBus'
import { RecordingService } from './services/RecordingService'
import { PlaybackService } from './services/PlaybackService'
import { TimelineService } from './services/TimelineService'
import { VideoEditorCommands } from './commands/VideoEditorCommands'
import { VideoEditorQueries } from './queries/VideoEditorQueries'
import { TimeCalculations } from './utils/TimeCalculations'

let instance: VideoEditorInstance | null = null

interface VideoEditorInstance {
  commands: VideoEditorCommands
  queries: VideoEditorQueries
  cleanup: () => void
  stateMachine: Actor<typeof videoEditorMachine>
}

export function getVideoEditorInstance(): VideoEditorInstance {
  if (instance) {
    return instance
  }
  
  // 1. Create state machine actor (XState v5 pattern)
  // Initial context comes from machine definition
  const stateMachine = createActor(videoEditorMachine)
  
  // 2. Start the actor
  stateMachine.start()
  

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
      stateMachine.send({ type: 'TIMELINE.CLIP_ADDED', clip })
    })
  )
  
  unsubscribers.push(
    eventBus.on('timeline.trackAdded', ({ track }) => {
      stateMachine.send({ type: 'TIMELINE.TRACK_ADDED', track })
    })
  )
  
  // Forward service events to State Machine
  unsubscribers.push(
    eventBus.on('playback.timeUpdate', ({ currentTime }) => {
      // Forward to State Machine for technical state updates
      stateMachine.send({ type: 'VIDEO.TIME_UPDATE', time: currentTime })
      
      // V2 BULLETPROOF: Check if we've reached clip boundary using centralized utility
      const snapshot = stateMachine.getSnapshot()
      const { playback, timeline } = snapshot.context
      
      if (playback.currentClipId && snapshot.matches('playing')) {
        const currentClip = timeline.clips.find(c => c.id === playback.currentClipId)
        if (currentClip) {
          const timelinePosition = TimeCalculations.videoTimeToTimelinePosition(currentTime, currentClip)
          
          // Use centralized boundary checking
          if (TimeCalculations.hasReachedClipEnd(timelinePosition, currentClip)) {
            stateMachine.send({ type: 'VIDEO.ENDED' })
          }
        }
      }
    })
  )
  
  
  // Forward video ended events to State Machine
  unsubscribers.push(
    eventBus.on('playback.ended', ({ currentTime }) => {
      stateMachine.send({ type: 'VIDEO.ENDED' })
    })
  )
  
  // Handle seek events (including reset to beginning)
  unsubscribers.push(
    eventBus.on('playback.seek', ({ time }) => {
      // Update scrubber position when seeking
      stateMachine.send({ type: 'SCRUBBER.DRAG', position: time })
    })
  )
  
  // Forward video loaded events to State Machine
  unsubscribers.push(
    eventBus.on('playback.videoLoaded', ({ duration }) => {
      // Get current video URL from the video element
      const videoElement = document.getElementById('preview-video') as HTMLVideoElement
      const url = videoElement?.src || ''
      stateMachine.send({ type: 'VIDEO.LOADED', duration, url })
    })
  )
  
  // Set video source when recording completes
  unsubscribers.push(
    eventBus.on('recording.complete', ({ videoUrl }) => {
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
  
  // V2 BULLETPROOF Integration Layer: Clear preview when all clips deleted
  unsubscribers.push(
    eventBus.on('preview.clear', () => {
      const videoElement = document.getElementById('preview-video') as HTMLVideoElement
      if (videoElement) {
        // V2 BULLETPROOF: Properly clear video to avoid errors
        videoElement.pause()
        videoElement.removeAttribute('src') // Remove src instead of setting to empty
        videoElement.load() // Reset the video element
        videoElement.style.display = 'none'
        // Show placeholder
        const placeholder = document.getElementById('preview-placeholder')
        if (placeholder) {
          placeholder.style.display = 'block'
        }
      }
    })
  )
  
  // Connect video element once it's available
  if (typeof window !== 'undefined') {
    const checkVideoElement = setInterval(() => {
      const videoElement = document.getElementById('preview-video') as HTMLVideoElement
      if (videoElement && !videoElement.dataset.connected) {
        playbackService.setVideoElement(videoElement)
        videoElement.dataset.connected = 'true'
        clearInterval(checkVideoElement)
      }
    }, 100)
    
    // Clear after 5 seconds if not found
    setTimeout(() => clearInterval(checkVideoElement), 5000)
  }

  // State Machine observer - Integration Layer
  // This observes State Machine decisions and forwards them to services
  
  let previousState: string | null = null
  let processedClipTransition: string | null = null
  let processedSeek: number | null = null
  let lastLogTime = 0
  
  const subscription = stateMachine.subscribe((snapshot) => {
    const currentState = snapshot.value as string
    const { playback } = snapshot.context
    
    // Safety check for playback state
    if (!playback) {
      console.warn('Integration Layer: playback state is undefined in context')
      previousState = currentState
      return
    }
    
    // XState v5: Track changes manually
    const stateChanged = previousState !== currentState
    
    // Reset processed tracking when state changes to ensure fresh detection
    if (stateChanged && currentState === 'playing') {
      processedClipTransition = null
      processedSeek = null
    }
    
    // Check if we have new pending actions to process (after potential reset)
    const hasNewClipTransition = playback.pendingClipTransition && 
      processedClipTransition !== playback.pendingClipTransition.id
    const hasNewSeek = playback.pendingSeek && 
      processedSeek !== playback.pendingSeek.time
    
    // Debounce logging to avoid spam (only log every 500ms or on significant changes)
    const now = Date.now()
    const shouldLog = stateChanged || hasNewClipTransition || hasNewSeek || (now - lastLogTime > 500)
    
    // Reduced debug logging - only log significant state changes
    if (stateChanged || hasNewClipTransition || hasNewSeek) {
      lastLogTime = now
    }
    
    // Forward State Machine decisions to services
    if (stateChanged || hasNewClipTransition || hasNewSeek) {
      
      // Handle clip transitions - Now works for any state, not just playing
      if (hasNewClipTransition) {
        const clip = playback.pendingClipTransition!
        
        // Mark as processed to prevent infinite loop
        processedClipTransition = clip.id
        
        // Sequential execution with proper await chain
        playbackService.loadVideo(clip.sourceUrl)
          .then(async () => {
            if (playback.pendingSeek) {
              processedSeek = playback.pendingSeek.time
              await playbackService.seek(playback.pendingSeek.time)
            }
            
            // Check state again after async operations (fix race condition)
            const currentSnapshot = stateMachine.getSnapshot()
            if (currentSnapshot.matches('playing')) {
              await playbackService.play()
            }
            
            // Clear pending actions after successful execution
            stateMachine.send({ type: 'PLAYBACK.ACTIONS_PROCESSED' })
          })
          .catch(error => {
            console.error('❌ Integration Layer: Playback failed', error)
            // Clear pending actions even on error to prevent stuck state
            stateMachine.send({ type: 'PLAYBACK.ACTIONS_PROCESSED' })
          })
      }
      
      // Handle standalone seeks (without clip transitions) 
      else if (hasNewSeek && !hasNewClipTransition && playback.currentClipId) {
        processedSeek = playback.pendingSeek!.time
        playbackService.seek(playback.pendingSeek!.time)
          .then(async () => {
            // If we're in playing state, also start playback after seek
            if (snapshot.matches('playing')) {
              await playbackService.play()
            }
            // Clear pending actions after successful execution
            stateMachine.send({ type: 'PLAYBACK.ACTIONS_PROCESSED' })
          })
          .catch(error => {
            console.error('❌ Integration Layer: Seek failed', error)
          })
      }
      
      // Handle pause requests (only on state change to paused)
      if (currentState === 'paused' && stateChanged) {
        playbackService.pause()
      }
    }
    
    // Update previous state for next comparison
    previousState = currentState
  })

  // Initialize commands and queries
  const commands = new VideoEditorCommands(
    recordingService,
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
    unsubscribers.forEach(unsubscribe => unsubscribe())
    stateMachine.stop()
    instance = null
  }
  
  instance = { commands, queries, cleanup, stateMachine }
  
  // Make instance available globally for services
  if (typeof window !== 'undefined') {
    (window as any).videoEditorInstance = instance
  }
  
  return instance
}

export function cleanupVideoEditor() {
  if (instance) {
    instance.cleanup()
    // Clean up global reference
    if (typeof window !== 'undefined') {
      delete (window as any).videoEditorInstance
    }
  }
}
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
      
      // OPTION A: Monitor outPoint for trimmed clips
      const snapshot = stateMachine.getSnapshot()
      const { playback, timeline } = snapshot.context
      
      if (snapshot.matches('playing') && playback.currentClipId) {
        const currentClip = timeline.clips.find(c => c.id === playback.currentClipId)
        if (currentClip) {
          // For trimmed clips, check if we've reached the outPoint
          // currentTime is the video's actual time, outPoint is also in video time
          const hasReachedEnd = currentTime >= currentClip.outPoint - 0.05 // Small buffer for precision
          const notYetTriggered = playback.currentClipId !== lastTriggeredEndClipId
          
          if (hasReachedEnd && notYetTriggered) {
            lastTriggeredEndClipId = playback.currentClipId
            console.log('🎯 OPTION A: Reached outPoint for trimmed clip:', {
              clipId: currentClip.id,
              currentTime,
              outPoint: currentClip.outPoint,
              duration: currentClip.outPoint - currentClip.inPoint
            })
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
  
  // REMOVED: Automatic boundary detection system that caused trim playback loops
  // This was causing conflicts between reactive auto-advancement and normal playback flow
  // Now using proactive clip sequencing with natural VIDEO.ENDED events instead
  
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
  
  // Set video source and initial preview when recording stops
  unsubscribers.push(
    eventBus.on('recording.stopped', ({ videoUrl }) => {
      const videoElement = document.getElementById('preview-video') as HTMLVideoElement
      if (videoElement && videoUrl) {
        console.log('📹 Recording stopped, setting up initial preview at position 0')
        videoElement.src = videoUrl
        videoElement.style.display = 'block'
        
        // Hide placeholder
        const placeholder = document.getElementById('preview-placeholder')
        if (placeholder) {
          placeholder.style.display = 'none'
        }
        
        // CRITICAL FIX: Seek to position 0 to show first frame after recording
        // Wait for the video to load metadata first
        const showFirstFrame = () => {
          if (videoElement.readyState >= 1) {
            videoElement.currentTime = 0
            console.log('✅ Set initial preview to position 0')
          } else {
            videoElement.addEventListener('loadedmetadata', () => {
              videoElement.currentTime = 0
              console.log('✅ Set initial preview to position 0 (after metadata loaded)')
            }, { once: true })
          }
        }
        
        showFirstFrame()
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
  
  // CRITICAL FIX #1: Prevent race conditions with operation locking
  let isProcessingClipTransition = false
  let isProcessingSeek = false
  
  // OPTION A: Track last triggered end to prevent duplicates
  let lastTriggeredEndClipId: string | null = null
  
  const subscription = stateMachine.subscribe((snapshot) => {
    const currentState = snapshot.value as string
    const { playback } = snapshot.context
    
    // DEBUG: Log state changes for recording button debugging
    if (previousState !== currentState) {
      console.log('🔄 State Machine transition:', previousState, '→', currentState)
      console.log('📹 Recording should be available:', ['idle', 'playing', 'paused'].includes(currentState))
    }
    
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
      // Reset end tracking for new playback session
      lastTriggeredEndClipId = null
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
      
      // Handle clip transitions (for both playing and paused states to enable preview)
      if (hasNewClipTransition && (snapshot.matches('playing') || snapshot.matches('paused'))) {
        const clip = playback.pendingClipTransition!
        
        // CRITICAL FIX #1: Atomic operation - prevent overlapping transitions
        if (isProcessingClipTransition) {
          console.warn('🔒 Clip transition already in progress, skipping')
          // TIMEOUT FIX: Don't block forever, reset after 2 seconds
          setTimeout(() => {
            if (isProcessingClipTransition) {
              console.warn('🔓 Force unlocking stuck clip transition')
              isProcessingClipTransition = false
            }
          }, 2000)
          return
        }
        
        // OPTION A FIX: For trimmed clips from same source, always reuse loaded video
        // Check if we can skip loading based on sourceUrl match OR if it's the same original recording
        let canSkipLoad = false
        
        // First check: exact URL match and clip ID match
        if (playback.currentClipId === clip.id && playback.loadedVideoUrl === clip.sourceUrl) {
          // For blob URLs, check if they're still valid
          if (clip.sourceUrl.startsWith('blob:')) {
            const videoElement = document.getElementById('preview-video') as HTMLVideoElement
            if (videoElement && videoElement.src === clip.sourceUrl && videoElement.readyState >= 1) {
              canSkipLoad = true
            }
          } else {
            // For non-blob URLs, trust the URL comparison
            canSkipLoad = true
          }
        }
        
        // Second check: For sequential trimmed clips from SAME SOURCE
        // Must verify both base ID match AND source URLs match
        if (!canSkipLoad && playback.currentClipId && playback.loadedVideoUrl) {
          const currentBaseId = playback.currentClipId.split('-split-')[0]
          const nextBaseId = clip.id.split('-split-')[0]
          
          // CRITICAL: Also check that source URLs match to avoid reusing wrong video
          const sameBaseId = currentBaseId === nextBaseId
          const sameSourceUrl = playback.loadedVideoUrl === clip.sourceUrl
          
          console.log('🔍 Checking video reuse:', {
            currentBaseId,
            nextBaseId,
            sameBaseId,
            currentUrl: playback.loadedVideoUrl?.substring(0, 30) + '...',
            nextUrl: clip.sourceUrl.substring(0, 30) + '...',
            sameSourceUrl
          })
          
          // Only reuse if BOTH the base ID and source URL match
          if (sameBaseId && sameSourceUrl) {
            const videoElement = document.getElementById('preview-video') as HTMLVideoElement
            if (videoElement && videoElement.readyState >= 1) {
              console.log('🎯 OPTION A: Reusing video for sequential trimmed segments from same source')
              canSkipLoad = true
              // We'll just seek to the new position
            }
          }
        }

        if (canSkipLoad) {
          console.log('🔄 Already playing correct clip, skipping load')
          isProcessingClipTransition = true
          processedClipTransition = clip.id
          // Reset end tracking for the new clip segment
          if (playback.currentClipId !== clip.id) {
            lastTriggeredEndClipId = null
          }
          
          // Just seek within the current video
          if (playback.pendingSeek) {
            processedSeek = playback.pendingSeek.time
            // CRITICAL FIX: For trimmed clips, seek to inPoint + localTime
            const seekTime = clip.inPoint + playback.pendingSeek.time
            console.log('🎯 Seeking (skip load) trimmed clip to:', seekTime, '(inPoint:', clip.inPoint, '+ localTime:', playback.pendingSeek.time, ')')
            playbackService.seek(seekTime)
              .then(async () => {
                // Only play if in playing state, otherwise just seek for preview
                if (snapshot.matches('playing')) {
                  await playbackService.play()
                }
                stateMachine.send({ type: 'PLAYBACK.ACTIONS_PROCESSED' })
              })
              .catch(error => {
                console.error('❌ Integration Layer: Seek failed', error)
              })
              .finally(() => {
                isProcessingClipTransition = false
              })
          } else {
            // Only play if in playing state
            if (snapshot.matches('playing')) {
              playbackService.play()
                .then(() => {
                  stateMachine.send({ type: 'PLAYBACK.ACTIONS_PROCESSED' })
                })
                .finally(() => {
                  isProcessingClipTransition = false
                })
            } else {
              // For paused state, just clear pending actions
              stateMachine.send({ type: 'PLAYBACK.ACTIONS_PROCESSED' })
              isProcessingClipTransition = false
            }
          }
          return
        }
        
        // CRITICAL FIX #3: Enhanced debugging for clip transitions
        console.log('🎬 Processing clip transition:', {
          fromClip: playback.currentClipId,
          fromUrl: playback.loadedVideoUrl?.substring(0, 30) + '...',
          toClip: clip.id,
          toUrl: clip.sourceUrl.substring(0, 30) + '...',
          inPoint: clip.inPoint,
          outPoint: clip.outPoint,
          pendingSeek: playback.pendingSeek
        })
        
        isProcessingClipTransition = true
        processedClipTransition = clip.id
        // Reset end tracking when starting a new clip
        lastTriggeredEndClipId = null
        
        // Sequential execution with proper await chain
        playbackService.loadVideo(clip.sourceUrl)
          .then(async () => {
            if (playback.pendingSeek) {
              processedSeek = playback.pendingSeek.time
              // CRITICAL FIX: For trimmed clips, seek to inPoint + localTime
              const seekTime = clip.inPoint + playback.pendingSeek.time
              console.log('🎯 Seeking trimmed clip to:', seekTime, '(inPoint:', clip.inPoint, '+ localTime:', playback.pendingSeek.time, ')')
              await playbackService.seek(seekTime)
            }
            
            // Only start playing if we're in the 'playing' state
            // For 'paused' state, just load and seek for preview
            if (snapshot.matches('playing')) {
              await playbackService.play()
            } else {
              console.log('🎬 Clip loaded and seeked for preview (staying paused)')
            }
            
            // Clear pending actions after successful execution
            stateMachine.send({ type: 'PLAYBACK.ACTIONS_PROCESSED' })
          })
          .catch(error => {
            console.error('❌ Integration Layer: Playback failed', error)
            
            // If blob URL is invalid, we need to handle this gracefully
            if (error.message.includes('blob URL is invalid')) {
              console.warn('🔄 Blob URL invalid, clip may need re-recording')
              // For now, just clear the pending actions to prevent stuck state
              stateMachine.send({ type: 'PLAYBACK.ACTIONS_PROCESSED' })
              
              // TODO: In future, could implement clip re-recording or show user error
              // For now, user will need to re-record the clips
            }
          })
          .finally(() => {
            // CRITICAL FIX #1: Always unlock after operation completes
            isProcessingClipTransition = false
          })
      }
      
      // Handle standalone seeks (without clip transitions) 
      else if (hasNewSeek && !hasNewClipTransition && playback.currentClipId) {
        // CRITICAL FIX #1: Atomic operation - prevent overlapping seeks
        if (isProcessingSeek) {
          console.warn('🔒 Seek operation already in progress, skipping')
          return
        }
        
        // CRITICAL FIX #3: Ensure we have a valid video loaded before seeking
        const videoElement = document.getElementById('preview-video') as HTMLVideoElement
        if (!videoElement || !videoElement.src || videoElement.src !== playback.loadedVideoUrl) {
          console.warn('🔄 Video not properly loaded for seek, skipping standalone seek')
          return
        }
        
        isProcessingSeek = true
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
          .finally(() => {
            // CRITICAL FIX #1: Always unlock after operation completes
            isProcessingSeek = false
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
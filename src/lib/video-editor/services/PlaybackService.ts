// ARCHITECTURE: Following Principle 4 - Service Boundary Isolation (lines 25-28)
// Single responsibility: ONLY handles playback
// Implementation from lines 446-556 of BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md

import type { TypedEventBus } from '../events/EventBus'

export class PlaybackService {
  private videoElement: HTMLVideoElement | null = null
  private animationFrameId: number | null = null
  private lastEmittedUrl: string | null = null // Prevent duplicate duration events
  // CRITICAL FIX #2: Track listeners to prevent accumulation
  private videoListenersAttached = false
  // ❌ REMOVED: Business state (currentClipId, clips, globalTimeOffset)
  // State Machine will own this data

  constructor(private eventBus: TypedEventBus) {
    this.setupEventListeners()
  }

  setVideoElement(element: HTMLVideoElement): void {
    this.videoElement = element
    // CRITICAL FIX #2: Only attach listeners once to prevent accumulation
    if (!this.videoListenersAttached) {
      this.setupVideoEventListeners()
      this.videoListenersAttached = true
    }
  }

  // Load a specific video source
  async loadVideo(url: string): Promise<void> {
    if (!this.videoElement) {
      throw new Error('No video element set')
    }

    console.log('🎥 Attempting to load video:', url)

    // CRITICAL FIX #2: DO NOT revoke blob URLs here - they might be used by other clips
    // Blob URL cleanup should be handled at the application level when clips are deleted
    // or when the session ends, not during clip transitions
    const previousSrc = this.videoElement.src
    if (previousSrc && previousSrc.startsWith('blob:') && previousSrc !== url) {
      console.log('🔄 Switching from blob URL:', previousSrc, 'to:', url)
      // Note: NOT revoking here to prevent breaking other clips that use the same URL
    }

    // Reset duration tracking for new video
    this.lastEmittedUrl = null
    
    console.log('🎥 Loading video:', url)
    this.videoElement.src = url
    this.videoElement.classList.remove('hidden')
    
    // Wait for metadata to load - let the video element handle validation
    return new Promise<void>((resolve, reject) => {
      const onLoadedMetadata = () => {
        this.videoElement!.removeEventListener('loadedmetadata', onLoadedMetadata)
        this.videoElement!.removeEventListener('error', onError)
        console.log('✅ Video loaded successfully:', url)
        resolve()
      }
      const onError = (error: Event) => {
        this.videoElement!.removeEventListener('loadedmetadata', onLoadedMetadata)
        this.videoElement!.removeEventListener('error', onError)
        console.error('🚫 Video loading failed:', url, error)
        reject(new Error('Cannot load video: blob URL is invalid or revoked'))
      }
      this.videoElement.addEventListener('loadedmetadata', onLoadedMetadata)
      this.videoElement.addEventListener('error', onError)
    })
  }

  // ❌ REMOVED: updateClips() - State Machine owns clips data

  // ❌ REMOVED: getClipAtPosition() - Business logic moved to State Machine

  // ❌ REMOVED: loadClipForPosition() - Business logic moved to State Machine

  async play(): Promise<void> {
    if (!this.videoElement) {
      throw new Error('No video element set')
    }

    if (!this.videoElement.src) {
      console.warn('No video source set - video must be loaded first')
      return
    }

    this.videoElement.play()
      .then(() => {
        this.startTimeTracking()
        this.eventBus.emit('playback.play', {
          currentTime: this.videoElement!.currentTime
        })
      })
      .catch(error => {
        console.error('Failed to play video:', error)
      })
  }

  pause(): void {
    if (!this.videoElement) {
      throw new Error('No video element set')
    }

    this.videoElement.pause()
    this.stopTimeTracking()
    
    this.eventBus.emit('playback.pause', {
      currentTime: this.videoElement.currentTime
    })
  }

  async seek(time: number): Promise<void> {
    if (!this.videoElement) {
      throw new Error('No video element set')
    }

    this.videoElement.currentTime = time
    this.eventBus.emit('playback.seek', { time })
  }

  private setupEventListeners(): void {
    // ❌ REMOVED: Business logic event listeners
    // Service will respond to direct commands only
    
    // Listen for recording stopped for UI updates only
    this.eventBus.on('recording.stopped', ({ videoUrl }) => {
      if (this.videoElement) {
        console.log('Recording stopped, video available for playback')
        // Hide placeholder when content available
        const placeholder = document.getElementById('preview-placeholder')
        if (placeholder) {
          placeholder.classList.add('hidden')
        }
      }
    })
    
    // Listen for preview clear event (when all clips deleted)
    this.eventBus.on('preview.clear', () => {
      if (this.videoElement) {
        console.log('Clearing video preview')
        // Remove src attribute instead of setting to empty string to avoid errors
        this.videoElement.removeAttribute('src')
        this.videoElement.classList.add('hidden')
        // Show placeholder
        const placeholder = document.getElementById('preview-placeholder')
        if (placeholder) {
          placeholder.classList.remove('hidden')
        }
      }
    })
    
    // ❌ REMOVED: Segment selection business logic
  }

  private setupVideoEventListeners(): void {
    if (!this.videoElement) return

    // Try multiple events to get valid duration
    const emitVideoLoaded = () => {
      const currentUrl = this.videoElement!.src
      
      // Prevent duplicate emissions for the same video
      if (this.lastEmittedUrl === currentUrl) {
        return
      }
      
      const duration = this.videoElement!.duration
      console.log('Video event triggered, duration:', duration)
      
      // For recorded videos, try to get duration from different sources
      if (!isFinite(duration) || isNaN(duration) || duration === 0) {
        // For blob URLs, sometimes duration isn't available immediately
        // Try to get it from the video element's buffered property
        if (this.videoElement!.buffered.length > 0) {
          const bufferedDuration = this.videoElement!.buffered.end(0)
          if (isFinite(bufferedDuration) && bufferedDuration > 0) {
            console.log('Using buffered duration:', bufferedDuration)
            this.lastEmittedUrl = currentUrl
            this.eventBus.emit('playback.videoLoaded', {
              duration: bufferedDuration
            })
            return
          }
        }
        
        // For short videos, wait a bit and try again (only if we haven't emitted yet)
        if (this.lastEmittedUrl !== currentUrl) {
          setTimeout(() => {
            if (this.lastEmittedUrl === currentUrl) return // Already emitted
            
            const retryDuration = this.videoElement!.duration
            console.log('Retry duration check:', retryDuration)
            if (isFinite(retryDuration) && retryDuration > 0) {
              this.lastEmittedUrl = currentUrl
              this.eventBus.emit('playback.videoLoaded', {
                duration: retryDuration
              })
            } else {
              // Fallback: emit with a small default duration for very short recordings
              console.warn('Could not determine video duration, using fallback')
              this.lastEmittedUrl = currentUrl
              this.eventBus.emit('playback.videoLoaded', {
                duration: 1.0 // 1 second fallback
              })
            }
          }, 100)
        }
      } else {
        // Valid duration found
        console.log('Valid duration found:', duration)
        this.lastEmittedUrl = currentUrl
        this.eventBus.emit('playback.videoLoaded', {
          duration: duration
        })
      }
    }

    // Listen to multiple events
    this.videoElement.addEventListener('loadedmetadata', emitVideoLoaded)
    this.videoElement.addEventListener('loadeddata', emitVideoLoaded)
    this.videoElement.addEventListener('canplay', emitVideoLoaded)

    this.videoElement.addEventListener('ended', () => {
      this.stopTimeTracking()
      this.eventBus.emit('playback.ended', {
        currentTime: this.videoElement!.currentTime
      })
      this.eventBus.emit('playback.pause', {
        currentTime: this.videoElement!.currentTime
      })
    })

    this.videoElement.addEventListener('error', (error) => {
      console.error('Video error:', error)
    })
  }

  private startTimeTracking(): void {
    if (this.animationFrameId) return

    const updateTime = () => {
      if (this.videoElement && !this.videoElement.paused) {
        this.eventBus.emit('playback.timeUpdate', {
          currentTime: this.videoElement.currentTime
        })
        this.animationFrameId = requestAnimationFrame(updateTime)
      }
    }

    this.animationFrameId = requestAnimationFrame(updateTime)
  }

  private stopTimeTracking(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  get currentTime(): number {
    return this.videoElement?.currentTime ?? 0
  }

  get duration(): number {
    const dur = this.videoElement?.duration ?? 0
    return isNaN(dur) ? 0 : dur
  }

  get isPlaying(): boolean {
    return this.videoElement ? !this.videoElement.paused : false
  }
}
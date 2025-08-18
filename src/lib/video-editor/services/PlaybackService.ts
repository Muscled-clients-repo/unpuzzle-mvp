// ARCHITECTURE: Following Principle 4 - Service Boundary Isolation (lines 25-28)
// Single responsibility: ONLY handles playback
// Implementation from lines 446-556 of BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md

import type { TypedEventBus } from '../events/EventBus'

export class PlaybackService {
  private videoElement: HTMLVideoElement | null = null
  private animationFrameId: number | null = null

  constructor(private eventBus: TypedEventBus) {
    this.setupEventListeners()
  }

  setVideoElement(element: HTMLVideoElement): void {
    this.videoElement = element
    this.setupVideoEventListeners()
  }

  play(): void {
    if (!this.videoElement) {
      throw new Error('No video element set')
    }

    if (!this.videoElement.src) {
      console.warn('No video source set')
      return
    }

    // Note: Reset logic moved to Commands layer for single source of truth
    
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

  seek(time: number): void {
    if (!this.videoElement) {
      throw new Error('No video element set')
    }

    this.videoElement.currentTime = time
    
    this.eventBus.emit('playback.seek', { time })
  }

  private setupEventListeners(): void {
    // Listen for recording stopped to load the video
    this.eventBus.on('recording.stopped', ({ videoUrl }) => {
      if (this.videoElement) {
        console.log('Loading video into preview:', videoUrl)
        this.videoElement.src = videoUrl
        this.videoElement.classList.remove('hidden')
        // Hide the placeholder text
        const placeholder = document.getElementById('preview-placeholder')
        if (placeholder) {
          placeholder.classList.add('hidden')
        }
      }
    })
    
    this.eventBus.on('timeline.segmentSelected', ({ segmentId }) => {
      // Handle segment selection for playback
      // This will be implemented when segments have video URLs
    })
  }

  private setupVideoEventListeners(): void {
    if (!this.videoElement) return

    this.videoElement.addEventListener('loadedmetadata', () => {
      const duration = this.videoElement!.duration
      // Check for invalid duration (Infinity or NaN)
      const validDuration = !isFinite(duration) || isNaN(duration) ? 0 : duration
      
      console.log('Video loaded, duration:', duration, 'valid:', validDuration)
      
      // Only emit if we have a valid duration
      if (validDuration > 0) {
        this.eventBus.emit('playback.videoLoaded', {
          duration: validDuration
        })
      }
    })

    this.videoElement.addEventListener('ended', () => {
      this.stopTimeTracking()
      // Keep scrubber at the end position (don't reset)
      const endTime = this.videoElement!.duration
      this.eventBus.emit('playback.ended', {
        currentTime: endTime
      })
      this.eventBus.emit('playback.pause', {
        currentTime: endTime
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
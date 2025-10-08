import { FPS } from './types'
import { SimpleCanvasRenderer } from './SimpleCanvasRenderer'

export interface TimelineSegment {
  id: string
  startFrame: number        // Position on timeline
  endFrame: number          // End position on timeline
  sourceUrl: string         // Video file URL
  sourceInFrame: number     // Start frame within source video
  sourceOutFrame: number    // End frame within source video
}

export class VirtualTimelineEngine {
  private segments: TimelineSegment[] = []
  private currentFrame: number = 0
  private totalFrames: number = 0
  private isPlaying: boolean = false
  private fps: number = FPS
  private hasReachedEnd: boolean = false  // Track if we've naturally reached the end

  // Playback loop variables
  private animationFrameId: number | null = null
  private lastFrameTime: number = 0

  // CANVAS + HIDDEN VIDEO ARCHITECTURE (Canva approach)
  private renderer: SimpleCanvasRenderer | null = null
  private primaryVideo: HTMLVideoElement | null = null
  private bufferVideo: HTMLVideoElement | null = null
  private activeVideo: HTMLVideoElement | null = null
  private currentSegment: TimelineSegment | null = null

  // SEEK THROTTLING - Prevent seek thrashing
  private isSeeking: boolean = false

  // Callbacks
  private onFrameUpdate?: (frame: number) => void
  private onPlayStateChange?: (isPlaying: boolean) => void

  constructor() {
    this.playbackLoop = this.playbackLoop.bind(this)
  }

  // Set canvas for rendering
  setCanvas(canvas: HTMLCanvasElement) {
    this.renderer = new SimpleCanvasRenderer(canvas)
  }

  // Set hidden video elements (sources for canvas rendering)
  setVideoElements(primary: HTMLVideoElement, buffer: HTMLVideoElement) {
    this.primaryVideo = primary
    this.bufferVideo = buffer
    this.activeVideo = primary // Start with primary as active
  }

  // Legacy support - use primary if only one video provided
  setVideoElement(video: HTMLVideoElement) {
    this.primaryVideo = video
    this.activeVideo = video
  }

  // Get the currently active video element
  private get videoElement(): HTMLVideoElement | null {
    return this.activeVideo
  }

  // Get the inactive (buffer) video element
  private getInactiveVideo(): HTMLVideoElement | null {
    if (this.activeVideo === this.primaryVideo) {
      return this.bufferVideo
    }
    return this.primaryVideo
  }

  // Switch which video is active (no longer changes visibility - just tracking)
  private switchActiveVideo() {
    const inactive = this.getInactiveVideo()
    if (!inactive) return

    // CRITICAL: Pause and mute the old video to stop its audio
    const oldVideo = this.activeVideo
    if (oldVideo) {
      const pausePromise = oldVideo.pause()
      if (pausePromise) {
        pausePromise.catch(() => {})
      }
      // Mute the old video to ensure audio stops
      oldVideo.muted = true
    }

    // Switch to new video
    this.activeVideo = inactive

    // Unmute the new video so its audio plays
    if (this.activeVideo) {
      this.activeVideo.muted = false
    }
  }

  // Set callbacks
  setCallbacks(callbacks: {
    onFrameUpdate?: (frame: number) => void
    onPlayStateChange?: (isPlaying: boolean) => void
  }) {
    this.onFrameUpdate = callbacks.onFrameUpdate
    this.onPlayStateChange = callbacks.onPlayStateChange
  }

  // Add segments from clips
  setSegments(segments: TimelineSegment[]) {
    this.segments = segments
    this.totalFrames = segments.reduce((max, seg) => Math.max(max, seg.endFrame), 0)
  }

  // Find segment at given frame
  private findSegmentAtFrame(frame: number): TimelineSegment | null {
    return this.segments.find(seg => 
      frame >= seg.startFrame && frame < seg.endFrame
    ) || null
  }

  // Main playback loop - runs every animation frame
  private playbackLoop(timestamp: number) {
    if (!this.isPlaying) return

    // Calculate elapsed time and advance frames
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = timestamp
    }
    
    const deltaTime = timestamp - this.lastFrameTime
    const framesElapsed = (deltaTime * this.fps) / 1000
    
    // Advance current frame smoothly
    this.currentFrame += framesElapsed
    
    // Stop at end of last clip if we haven't manually continued
    if (this.totalFrames > 0 && this.currentFrame >= this.totalFrames && !this.hasReachedEnd) {
      // Stop exactly at the end of the last clip
      this.currentFrame = this.totalFrames
      this.hasReachedEnd = true
      this.pause()
      this.onFrameUpdate?.(this.currentFrame)
      return
    }
    
    // Sync video to timeline position
    this.syncVideoToTimeline()

    // Render current video frame to canvas
    if (this.renderer && this.videoElement) {
      this.renderer.renderVideoFrame(this.videoElement)
    }

    // Notify frame update - keep fractional frames for smooth movement
    this.onFrameUpdate?.(this.currentFrame)

    // Continue loop
    this.lastFrameTime = timestamp
    this.animationFrameId = requestAnimationFrame(this.playbackLoop)
  }

  // Sync video element to show correct content for current frame
  private syncVideoToTimeline() {
    if (!this.videoElement) {
      return
    }

    const currentFrameFloored = Math.floor(this.currentFrame)
    const targetSegment = this.findSegmentAtFrame(currentFrameFloored)

    // Handle gaps (no segment)
    if (!targetSegment) {
      if (this.currentSegment) {
        // Pause the video element but DON'T stop playback
        // Let the playhead continue through gaps
        const pausePromise = this.videoElement?.pause()
        if (pausePromise) {
          pausePromise.catch(() => {
            // Ignore pause errors
          })
        }
        // Clear canvas to show black screen in gaps
        if (this.renderer) {
          this.renderer.clear()
        }
        // Clear current segment
        this.currentSegment = null
      }
      // Continue playback - don't pause timeline
      return
    }

    // Check if we need to switch segments
    const isNewSegment = !this.currentSegment || this.currentSegment.id !== targetSegment.id
    const isDifferentVideo = !this.currentSegment || this.currentSegment.sourceUrl !== targetSegment.sourceUrl
    const comingFromGap = !this.currentSegment

    // Calculate position in segment
    const frameInSegment = this.currentFrame - targetSegment.startFrame
    const sourceFrame = targetSegment.sourceInFrame + frameInSegment
    const targetTime = sourceFrame / this.fps

    if (isNewSegment || isDifferentVideo) {
      if (isDifferentVideo) {
        console.log('📹 Loading different video:', {
          from: this.currentSegment?.sourceUrl?.substring(0, 80),
          to: targetSegment.sourceUrl?.substring(0, 80),
          targetTime: targetTime.toFixed(2) + 's'
        })
        // Different video file - use dual video architecture
        // CRITICAL: Set currentSegment IMMEDIATELY to prevent repeated loads
        this.currentSegment = targetSegment

        this.loadSegmentWithDualVideo(targetSegment, targetTime)
        return
      }

      // Same video but different segment or coming from gap
      if (comingFromGap) {
        // CRITICAL: Set currentSegment IMMEDIATELY to prevent repeated transitions
        this.currentSegment = targetSegment

        // THROTTLED SEEK: Don't seek if already seeking
        if (this.isSeeking) {
          return
        }

        // For same video file, just seek directly (it's already loaded!)
        if (this.videoElement) {
          this.performThrottledSeek(targetTime)
          if (this.isPlaying && this.videoElement.paused) {
            this.videoElement.play().catch(() => {})
          }
        }
        return
      }

      // Same video, just different segment (no gap) - can seek directly
      this.currentSegment = targetSegment

      // THROTTLED SEEK: Don't seek if already seeking
      if (this.isSeeking) {
        return
      }

      if (this.videoElement) {
        this.performThrottledSeek(targetTime)
        if (this.isPlaying && this.videoElement.paused) {
          this.videoElement.play().catch(() => {})
        }
      }
      return
    }

    // Same segment - just update reference to get new boundaries (for trims)
    this.currentSegment = targetSegment

    // Reuse frameInSegment, sourceFrame, targetTime already calculated above (lines 178-180)

    // Check if we've exceeded the segment's logical out point (for playback control)
    if (this.isPlaying && sourceFrame >= targetSegment.sourceOutFrame) {
      console.log('⏭️ Reached end of trimmed clip at frame', sourceFrame, 'out of', targetSegment.sourceOutFrame)

      // Move to next segment or pause timeline
      const nextFrame = targetSegment.endFrame
      if (nextFrame < this.totalFrames) {
        // Jump to start of next segment
        this.currentFrame = nextFrame

        // CRITICAL: Clear current segment AND pause video
        // This forces the next sync to load the new segment fresh
        if (this.videoElement) {
          const pausePromise = this.videoElement.pause()
          if (pausePromise) {
            pausePromise.catch(() => {})
          }
        }

        // Clear both canvas and current segment
        if (this.renderer) {
          this.renderer.clear()
        }
        this.currentSegment = null

        // On next frame, syncVideoToTimeline will detect the new segment and load it
        console.log('🔄 Jumping to next segment at frame', nextFrame)
      } else {
        this.pause()
      }
      return
    }

    // Always show the exact frame requested (no boundary restrictions for preview)
    // This allows smooth scrubbing when extending edges
    // targetTime already calculated above
    const currentTime = this.videoElement?.currentTime || 0
    const drift = Math.abs(currentTime - targetTime)

    // Force seek when paused OR when drift is large
    if (!this.isPlaying || drift > 0.1) {
      // THROTTLED SEEK: Don't seek if already seeking
      if (!this.isSeeking) {
        this.performThrottledSeek(targetTime)
      }
    }

    // Ensure video is playing if we should be playing
    if (this.isPlaying && this.videoElement.paused) {
      this.videoElement.play().catch(() => {
        // Ignore play errors - they're usually from rapid play/pause
      })
    }
  }

  // Throttled seek helper - prevents seek thrashing
  private performThrottledSeek(targetTime: number) {
    if (!this.videoElement || this.isSeeking) return

    this.isSeeking = true
    this.videoElement.currentTime = targetTime

    // Wait for seek to complete
    const onSeeked = () => {
      this.isSeeking = false
      this.videoElement?.removeEventListener('seeked', onSeeked)
      this.videoElement?.removeEventListener('error', onError)
    }

    const onError = () => {
      this.isSeeking = false
      this.videoElement?.removeEventListener('seeked', onSeeked)
      this.videoElement?.removeEventListener('error', onError)
    }

    this.videoElement.addEventListener('seeked', onSeeked)
    this.videoElement.addEventListener('error', onError)
  }

  // Load segment using dual video architecture - NON-BLOCKING approach
  private loadSegmentWithDualVideo(segment: TimelineSegment, targetTime: number) {
    const inactiveVideo = this.getInactiveVideo()

    // If no dual video setup, fall back to single video
    if (!inactiveVideo) {
      this.loadSegment(segment, targetTime)
      return
    }

    // If active video is empty (first load), load it directly
    if (!this.videoElement || !this.videoElement.src || this.videoElement.src === '') {
      this.loadSegment(segment, targetTime)
      return
    }

    // Load and seek the inactive video in the background (non-blocking)
    const prepareVideo = async () => {
      try {
        // Load video if needed
        if (inactiveVideo.src !== segment.sourceUrl) {
          inactiveVideo.src = segment.sourceUrl
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              inactiveVideo.removeEventListener('loadedmetadata', onLoaded)
              inactiveVideo.removeEventListener('error', onError)
              reject(new Error('Video load timeout'))
            }, 5000) // 5 second timeout

            const onLoaded = () => {
              clearTimeout(timeout)
              inactiveVideo.removeEventListener('loadedmetadata', onLoaded)
              inactiveVideo.removeEventListener('error', onError)
              resolve()
            }
            const onError = (e: Event) => {
              clearTimeout(timeout)
              inactiveVideo.removeEventListener('loadedmetadata', onLoaded)
              inactiveVideo.removeEventListener('error', onError)
              reject(new Error(`Video load error: ${(e as ErrorEvent).message || 'Unknown error'}`))
            }
            inactiveVideo.addEventListener('loadedmetadata', onLoaded)
            inactiveVideo.addEventListener('error', onError)
          })
        }

        // Seek to position with timeout
        inactiveVideo.currentTime = targetTime
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            inactiveVideo.removeEventListener('seeked', onSeeked)
            reject(new Error('Seek timeout'))
          }, 2000) // 2 second timeout

          const onSeeked = () => {
            clearTimeout(timeout)
            resolve()
          }
          inactiveVideo.addEventListener('seeked', onSeeked, { once: true })
        })

        // Switch videos NOW (this might be after playhead has moved past, but that's OK)
        this.switchActiveVideo()
        this.currentSegment = segment

        // Start playing if we should be
        if (this.isPlaying && this.videoElement) {
          this.videoElement.play().catch(() => {})
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        console.warn('⚠️ Buffer video prep failed:', errorMsg, '- falling back to direct load')
        // Fall back to direct load on active video
        this.loadSegment(segment, targetTime)
      }
    }

    // Start preparation in background (don't await - let playback continue)
    prepareVideo()

    // Meanwhile, show current active video at best position possible
    // This prevents black screen while buffer loads
    if (this.videoElement && this.videoElement.src === segment.sourceUrl) {
      this.videoElement.currentTime = targetTime
      if (this.isPlaying) {
        this.videoElement.play().catch(() => {})
      }
    }
  }

  // Legacy single video load (fallback)
  private loadSegment(segment: TimelineSegment, targetTime: number) {
    if (!this.videoElement) {
      return
    }

    this.currentSegment = segment

    // Load new video if needed
    if (this.videoElement.src !== segment.sourceUrl) {
      this.videoElement.src = segment.sourceUrl

      // When video loads, seek to correct position
      this.videoElement.onloadedmetadata = () => {
        if (!this.videoElement || !this.currentSegment) return

        this.videoElement.currentTime = targetTime

        if (this.isPlaying) {
          this.videoElement.play().catch((err) => {
            console.error('Play error:', err)
          })
        }
      }

      this.videoElement.onerror = (err) => {
        console.error('❌ Video load error:', err)
      }

      // Force load
      this.videoElement.load()
    } else {
      // Same video already loaded - just seek
      this.videoElement.currentTime = targetTime

      if (this.isPlaying && this.videoElement.paused) {
        this.videoElement.play().catch(() => {})
      }
    }
  }

  // Public API
  
  play() {
    if (this.isPlaying) return
    
    // If we're at the end and user presses play, loop back to start
    if (this.currentFrame >= this.totalFrames && this.totalFrames > 0) {
      this.currentFrame = 0
      this.hasReachedEnd = false
    }
    
    this.isPlaying = true
    this.lastFrameTime = 0
    
    // Start playback loop
    this.animationFrameId = requestAnimationFrame(this.playbackLoop)
    
    // Sync video immediately
    this.syncVideoToTimeline()
    
    // Start video if we have a segment
    if (this.videoElement && this.currentSegment) {
      this.videoElement.play().catch(() => {
        // Ignore play errors
      })
    }
    
    this.onPlayStateChange?.(true)
  }

  pause() {
    if (!this.isPlaying) return
    
    this.isPlaying = false
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    
    if (this.videoElement) {
      const pausePromise = this.videoElement.pause()
      if (pausePromise) {
        pausePromise.catch(() => {
          // Ignore pause errors
        })
      }
    }
    
    this.onPlayStateChange?.(false)
  }

  seekToFrame(frame: number) {
    // Allow seeking anywhere, not limited by totalFrames (which is based on clips)
    // This allows scrubber to move in empty timeline regions
    this.currentFrame = Math.max(0, frame)

    // Reset end flag if seeking before the end
    if (frame < this.totalFrames) {
      this.hasReachedEnd = false
    }

    // If playing, the loop will handle syncing
    // If paused, sync immediately
    if (!this.isPlaying) {
      this.syncVideoToTimeline()

      // Render current frame to canvas
      if (this.renderer && this.videoElement) {
        this.renderer.renderVideoFrame(this.videoElement)
      }

      this.onFrameUpdate?.(this.currentFrame)
    }
  }

  getCurrentFrame(): number {
    return Math.round(this.currentFrame)
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  getTotalFrames(): number {
    return this.totalFrames
  }

  // Cleanup
  destroy() {
    this.pause()
    // Clean up dual video references
    this.primaryVideo = null
    this.bufferVideo = null
    this.activeVideo = null
    this.segments = []
    this.currentSegment = null
  }
}
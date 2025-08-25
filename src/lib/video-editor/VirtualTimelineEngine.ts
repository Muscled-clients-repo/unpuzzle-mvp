import { FPS } from './types'

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
  private videoElement: HTMLVideoElement | null = null
  private currentSegment: TimelineSegment | null = null
  
  // Callbacks
  private onFrameUpdate?: (frame: number) => void
  private onPlayStateChange?: (isPlaying: boolean) => void

  constructor() {
    this.playbackLoop = this.playbackLoop.bind(this)
  }

  // Set the video element to control
  setVideoElement(video: HTMLVideoElement) {
    this.videoElement = video
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
    
    // Notify frame update - keep fractional frames for smooth movement
    this.onFrameUpdate?.(this.currentFrame)
    
    // Continue loop
    this.lastFrameTime = timestamp
    this.animationFrameId = requestAnimationFrame(this.playbackLoop)
  }

  // Sync video element to show correct content for current frame
  private syncVideoToTimeline() {
    if (!this.videoElement) return
    
    const targetSegment = this.findSegmentAtFrame(Math.floor(this.currentFrame))
    
    // Handle gaps (no segment)
    if (!targetSegment) {
      if (this.currentSegment) {
        const pausePromise = this.videoElement.pause()
        if (pausePromise) {
          pausePromise.catch(() => {
            // Ignore pause errors
          })
        }
        // Clear the video display
        this.videoElement.src = ''
        this.currentSegment = null
      }
      return
    }
    
    // Check if we need to switch segments
    // Compare by ID to handle trim updates without reloading
    const isNewSegment = !this.currentSegment || this.currentSegment.id !== targetSegment.id
    const isDifferentVideo = !this.currentSegment || this.currentSegment.sourceUrl !== targetSegment.sourceUrl
    
    if (isNewSegment || isDifferentVideo) {
      if (isDifferentVideo) {
        // Different video file - need to load it
        this.loadSegment(targetSegment)
        return
      }
      // Same video file but different segment - just update reference
      this.currentSegment = targetSegment
    } else {
      // Same segment ID - just update the reference to get new boundaries
      // This handles trim operations without any video reload
      this.currentSegment = targetSegment
    }
    
    // Calculate the actual frame we want to show in the source video
    const frameInSegment = this.currentFrame - targetSegment.startFrame
    const sourceFrame = targetSegment.sourceInFrame + frameInSegment
    
    // Check if we've exceeded the segment's logical out point (for playback control)
    if (this.isPlaying && sourceFrame >= targetSegment.sourceOutFrame) {
      // Move to next segment or pause
      const nextFrame = targetSegment.endFrame
      if (nextFrame < this.totalFrames) {
        this.currentFrame = nextFrame
      } else {
        this.pause()
      }
      return
    }
    
    // Always show the exact frame requested (no boundary restrictions for preview)
    // This allows smooth scrubbing when extending edges
    const targetTime = sourceFrame / this.fps
    const currentTime = this.videoElement.currentTime
    const drift = Math.abs(currentTime - targetTime)
    
    // Always seek immediately when paused (for trimming preview)
    // Only use threshold when playing to avoid stuttering
    if (!this.isPlaying || drift > 0.1) {
      this.videoElement.currentTime = targetTime
    }
    
    // Ensure video is playing if we should be playing
    if (this.isPlaying && this.videoElement.paused) {
      this.videoElement.play().catch(() => {
        // Ignore play errors - they're usually from rapid play/pause
      })
    }
  }

  // Load a new segment into the video element
  private loadSegment(segment: TimelineSegment) {
    if (!this.videoElement) return
    
    this.currentSegment = segment
    
    // Load new video if needed - keep full video loaded, not just trimmed portion
    if (this.videoElement.src !== segment.sourceUrl) {
      this.videoElement.src = segment.sourceUrl
      
      // When video loads, seek to correct position
      this.videoElement.onloadedmetadata = () => {
        if (!this.videoElement || !this.currentSegment) return
        
        // Calculate where we should be in the source video
        const frameInSegment = this.currentFrame - this.currentSegment.startFrame
        const sourceFrame = this.currentSegment.sourceInFrame + frameInSegment
        const sourceTime = sourceFrame / this.fps
        
        // Seek to the calculated position
        this.videoElement.currentTime = sourceTime
        
        if (this.isPlaying) {
          this.videoElement.play().catch(() => {
            // Ignore play errors
          })
        }
      }
    } else {
      // Same video already loaded - just seek to the right position
      // This is the key: we always keep the full video loaded
      // and just seek within it based on the logical trim boundaries
      
      const frameInSegment = this.currentFrame - segment.startFrame
      const sourceFrame = segment.sourceInFrame + frameInSegment
      const sourceTime = sourceFrame / this.fps
      
      // Direct seek - the video has the full content buffered
      this.videoElement.currentTime = sourceTime
      
      if (this.isPlaying && this.videoElement.paused) {
        this.videoElement.play().catch(() => {
          // Ignore play errors
        })
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
    this.videoElement = null
    this.segments = []
    this.currentSegment = null
  }
}
import { useAppStore } from '@/stores/app-store'

export interface VideoRef {
  pause: () => void
  play: () => void
  isPaused: () => boolean
  getCurrentTime: () => number
}

export class VideoController {
  private videoRef: VideoRef | null = null
  private verificationAttempts = 0
  private readonly MAX_VERIFY_ATTEMPTS = 10
  private readonly VERIFY_DELAY_MS = 50
  
  setVideoRef(ref: VideoRef) {
    this.videoRef = ref
  }
  
  getCurrentTime(): number {
    // Try multiple sources and log for debugging
    let videoRefTime = 0
    let storeTime = 0
    let domTime = 0
    
    if (this.videoRef) {
      videoRefTime = this.videoRef.getCurrentTime()
    }
    
    // Fallback to Zustand store
    const store = useAppStore.getState()
    storeTime = store.currentTime
    
    // Fallback to DOM
    const videoElement = document.querySelector('video') as HTMLVideoElement
    if (videoElement) {
      domTime = videoElement.currentTime
    }
    
    console.log('[VideoController] getCurrentTime - videoRef:', videoRefTime, 'store:', storeTime, 'dom:', domTime)
    
    // Use the highest value (most recent) that's not zero
    const times = [videoRefTime, storeTime, domTime].filter(t => t > 0)
    if (times.length > 0) {
      return Math.max(...times)
    }
    
    // If all are zero, return store time as fallback
    return storeTime
  }
  
  async pauseVideo(): Promise<boolean> {
    if (!this.videoRef) {
      throw new Error('No video ref available')
    }
    
    // Update state FIRST to prevent race conditions (Issue #1 FIXED)
    const store = useAppStore.getState()
    store.setIsPlaying(false)
    
    // Method 1: Direct ref call
    try {
      this.videoRef.pause()
      if (await this.verifyPaused()) {
        return true
      }
    } catch (e) {
      console.warn('Direct pause failed:', e)
    }
    
    // Method 2: Already updated Zustand, verify
    try {
      if (await this.verifyPaused()) {
        return true
      }
    } catch (e) {
      console.warn('Zustand pause verification failed:', e)
    }
    
    // Method 3: Direct DOM manipulation
    try {
      const videoElement = document.querySelector('video')
      videoElement?.pause()
      if (await this.verifyPaused()) {
        return true
      }
    } catch (e) {
      console.warn('DOM pause failed:', e)
    }
    
    // Method 4: Simulate spacebar press
    try {
      const event = new KeyboardEvent('keydown', { key: ' ' })
      document.dispatchEvent(event)
      if (await this.verifyPaused()) {
        return true
      }
    } catch (e) {
      console.warn('Keyboard pause failed:', e)
    }
    
    throw new Error('All pause methods failed')
  }
  
  async playVideo(): Promise<boolean> {
    if (!this.videoRef) {
      throw new Error('No video ref available')
    }
    
    const store = useAppStore.getState()
    store.setIsPlaying(true)
    
    try {
      this.videoRef.play()
      return true
    } catch (e) {
      console.warn('Play failed:', e)
      return false
    }
  }
  
  private async verifyPaused(): Promise<boolean> {
    for (let i = 0; i < this.MAX_VERIFY_ATTEMPTS; i++) {
      await this.sleep(this.VERIFY_DELAY_MS)
      
      // Check all sources
      const refPaused = this.videoRef?.isPaused() ?? false
      const storePaused = !useAppStore.getState().isPlaying
      
      // For YouTube videos, we might not have a DOM video element
      const videoElement = document.querySelector('video') as HTMLVideoElement
      const domPaused = videoElement ? videoElement.paused : true // If no video element (YouTube), assume paused is what we want
      
      // Check if YouTube iframe exists (indicates YouTube video)
      const isYouTube = document.querySelector('#youtube-player') !== null
      
      if (isYouTube) {
        // For YouTube, trust the ref and store state
        if (refPaused && storePaused) {
          return true
        }
      } else {
        // For regular videos, all must agree
        if (refPaused && domPaused && storePaused) {
          return true
        }
      }
    }
    return false
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
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
      const domPaused = (document.querySelector('video') as HTMLVideoElement)?.paused ?? false
      const storePaused = !useAppStore.getState().isPlaying
      
      // All must agree
      if (refPaused && domPaused && storePaused) {
        return true
      }
    }
    return false
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
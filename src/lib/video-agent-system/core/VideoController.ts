import { useAppStore } from '@/stores/app-store'
import { discoveryLogger } from '@/utils/discovery-logger'
import { videoStateAdapter } from '../adapters/VideoStateAdapter'
import { isFeatureEnabled } from '@/utils/feature-flags'
import { stateUpdateTracker } from '@/lib/video-state/StateUpdateTracker'
import { getServiceWithFallback } from '@/lib/dependency-injection/helpers'

export interface VideoRef {
  pause: () => void
  play: () => void
  isPaused: () => boolean
  getCurrentTime: () => number
}

// Also accept StudentVideoPlayerRef which has the same interface
export type VideoRefLike = VideoRef | {
  pause: () => void
  play: () => void
  isPaused: () => boolean
  getCurrentTime: () => number
}

export class VideoController {
  private videoRef: VideoRefLike | null = null
  private verificationAttempts = 0
  private readonly MAX_VERIFY_ATTEMPTS = 10
  private readonly VERIFY_DELAY_MS = 50

  setVideoRef(ref: VideoRefLike) {
    discoveryLogger.logRefChain('VideoController.setVideoRef', ref)
    console.log('[VideoController] Setting video ref:', ref)
    console.log('[VideoController] Previous ref was:', this.videoRef)
    console.log('[VideoController] New ref methods:', {
      pause: typeof ref.pause,
      play: typeof ref.play,
      isPaused: typeof ref.isPaused,
      getCurrentTime: typeof ref.getCurrentTime
    })
    this.videoRef = ref
    console.log('[VideoController] Video ref successfully set, testing methods...')
    try {
      const currentTime = ref.getCurrentTime()
      const isPaused = ref.isPaused()
      console.log('[VideoController] Test successful - currentTime:', currentTime, 'isPaused:', isPaused)
    } catch (error) {
      console.error('[VideoController] Test failed:', error)
    }
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
    const store = isFeatureEnabled('USE_VIDEO_STATE_ADAPTER') 
      ? videoStateAdapter.getState('VideoController.getCurrentTime')
      : useAppStore.getState()
    discoveryLogger.logGetState('VideoController.getCurrentTime', { currentTime: store.currentTime })
    storeTime = store.currentTime
    
    // Fallback to DOM using DOMService
    const domService = getServiceWithFallback('domService', () => ({
      querySelector: (s: string) => document.querySelector(s)
    }))
    const videoElement = domService.querySelector<HTMLVideoElement>('video')
    discoveryLogger.logDOMAccess('video', !!videoElement)
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
    console.log('[VideoController] pauseVideo called, videoRef:', this.videoRef)
    if (!this.videoRef) {
      console.error('[VideoController] No video ref available when trying to pause')
      throw new Error('No video ref available')
    }
    
    // Update state FIRST to prevent race conditions (Issue #1 FIXED)
    const store = isFeatureEnabled('USE_VIDEO_STATE_ADAPTER') 
      ? videoStateAdapter.getState('VideoController.pauseVideo')
      : useAppStore.getState()
    discoveryLogger.logGetState('VideoController.pauseVideo', { isPlaying: store.isPlaying })
    
    // Check for duplicate update
    if (isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
      // For now, just use direct import to avoid circular dependency
      const isDuplicate = stateUpdateTracker.trackUpdate('isPlaying', false, 'VideoController.pause')
      if (!isDuplicate) {
        store.setIsPlaying(false)
      }
    } else {
      store.setIsPlaying(false)
    }
    
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
      const domService = getServiceWithFallback('domService', () => ({
        querySelector: (s: string) => document.querySelector(s)
      }))
      const videoElement = domService.querySelector<HTMLVideoElement>('video')
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
    
    const store = isFeatureEnabled('USE_VIDEO_STATE_ADAPTER') 
      ? videoStateAdapter.getState('VideoController.play')
      : useAppStore.getState()
    
    // Check for duplicate update
    if (isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
      // For now, just use direct import to avoid circular dependency
      const isDuplicate = stateUpdateTracker.trackUpdate('isPlaying', true, 'VideoController.play')
      if (!isDuplicate) {
        store.setIsPlaying(true)
      }
    } else {
      store.setIsPlaying(true)
    }
    
    try {
      await this.videoRef.play()
      return true
    } catch (e) {
      console.warn('Play failed:', e)

      // Handle AbortError (common after laptop sleep)
      if (e instanceof Error && e.name === 'AbortError') {
        console.log('AbortError detected, attempting recovery...')

        // Wait a bit and try again
        await this.sleep(100)
        try {
          await this.videoRef.play()
          return true
        } catch (retryError) {
          console.error('Retry play failed:', retryError)
          return false
        }
      }

      return false
    }
  }
  
  private async verifyPaused(): Promise<boolean> {
    for (let i = 0; i < this.MAX_VERIFY_ATTEMPTS; i++) {
      await this.sleep(this.VERIFY_DELAY_MS)
      
      // Check all sources
      const refPaused = this.videoRef?.isPaused() ?? false
      const storePaused = !(
        isFeatureEnabled('USE_VIDEO_STATE_ADAPTER') 
          ? videoStateAdapter.getState('VideoController.verifyPaused').isPlaying
          : useAppStore.getState().isPlaying
      )
      
      // For YouTube videos, we might not have a DOM video element
      const domService = getServiceWithFallback('domService', () => ({
        querySelector: (s: string) => document.querySelector(s)
      }))
      const videoElement = domService.querySelector<HTMLVideoElement>('video')
      const domPaused = videoElement ? videoElement.paused : true // If no video element (YouTube), assume paused is what we want
      
      // Check if YouTube iframe exists (indicates YouTube video)
      const isYouTube = domService.querySelector('#youtube-player') !== null
      
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
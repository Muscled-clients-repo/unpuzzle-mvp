/**
 * VideoStateCoordinator
 * 
 * Coordinates multiple video state sources to maintain a single source of truth.
 * Designates Zustand as the primary source with other sources as read-only views.
 * 
 * Phase 2.1 - State Synchronization
 * Created: 2025-08-31
 */

import { useAppStore } from '@/stores/app-store'
import { isFeatureEnabled } from '@/utils/feature-flags'
import { discoveryLogger } from '@/utils/discovery-logger'

export interface VideoState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  playbackRate: number
}

export interface StateSource {
  name: string
  priority: number // Lower number = higher priority
  getState: () => Partial<VideoState>
  setState?: (state: Partial<VideoState>) => void
  isWritable: boolean
}

/**
 * Manages and coordinates multiple video state sources
 */
export class VideoStateCoordinator {
  private static instance: VideoStateCoordinator | null = null
  private sources = new Map<string, StateSource>()
  private lastKnownState: VideoState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    playbackRate: 1
  }
  private reconciliationInProgress = false
  
  private constructor() {
    if (isFeatureEnabled('USE_STATE_COORDINATOR')) {
      console.log('🔄 VideoStateCoordinator: Initializing state coordination')
    }
    this.initializePrimarySource()
  }
  
  static getInstance(): VideoStateCoordinator {
    if (!VideoStateCoordinator.instance) {
      VideoStateCoordinator.instance = new VideoStateCoordinator()
    }
    return VideoStateCoordinator.instance
  }
  
  /**
   * Initialize Zustand as the primary source of truth
   */
  private initializePrimarySource() {
    this.registerSource({
      name: 'zustand-store',
      priority: 1, // Highest priority
      isWritable: true,
      getState: () => {
        const store = useAppStore.getState()
        return {
          isPlaying: store.isPlaying,
          currentTime: store.currentTime,
          duration: store.duration,
          volume: store.volume,
          isMuted: store.isMuted,
          playbackRate: store.playbackRate
        }
      },
      setState: (state: Partial<VideoState>) => {
        const store = useAppStore.getState()
        if (state.isPlaying !== undefined) store.setIsPlaying(state.isPlaying)
        if (state.currentTime !== undefined) store.setCurrentTime(state.currentTime)
        if (state.duration !== undefined) store.setDuration(state.duration)
        if (state.volume !== undefined) store.setVolume(state.volume)
        if (state.isMuted !== undefined) store.setIsMuted(state.isMuted)
        if (state.playbackRate !== undefined) store.setPlaybackRate(state.playbackRate)
      }
    })
  }
  
  /**
   * Register a state source
   */
  registerSource(source: StateSource) {
    if (this.sources.has(source.name)) {
      console.warn(`VideoStateCoordinator: Source ${source.name} already registered`)
      return
    }
    
    this.sources.set(source.name, source)
    
    if (isFeatureEnabled('USE_STATE_COORDINATOR')) {
      console.log(`🔄 Registered state source: ${source.name} (priority: ${source.priority}, writable: ${source.isWritable})`)
    }
    
    // Log registration for discovery
    if (typeof window !== 'undefined' && window.discoveryLogger) {
      discoveryLogger.logStateSync(`register-source-${source.name}`, source.priority)
    }
  }
  
  /**
   * Unregister a state source
   */
  unregisterSource(name: string) {
    if (this.sources.delete(name)) {
      if (isFeatureEnabled('USE_STATE_COORDINATOR')) {
        console.log(`🔄 Unregistered state source: ${name}`)
      }
    }
  }
  
  /**
   * Get the current reconciled state
   */
  getState(): VideoState {
    // Get primary source (Zustand)
    const primarySource = this.sources.get('zustand-store')
    if (primarySource) {
      const state = primarySource.getState() as VideoState
      this.lastKnownState = { ...this.lastKnownState, ...state }
      return this.lastKnownState
    }
    
    return this.lastKnownState
  }
  
  /**
   * Update state through the coordinator
   */
  setState(state: Partial<VideoState>, sourceName: string = 'unknown') {
    if (this.reconciliationInProgress) {
      console.warn('VideoStateCoordinator: Reconciliation in progress, skipping update')
      return
    }
    
    // Log state change attempt
    if (isFeatureEnabled('USE_STATE_COORDINATOR')) {
      console.log(`🔄 State update from ${sourceName}:`, state)
    }
    
    // Always write to primary source (Zustand)
    const primarySource = this.sources.get('zustand-store')
    if (primarySource && primarySource.setState) {
      primarySource.setState(state)
      this.lastKnownState = { ...this.lastKnownState, ...state }
    }
    
    // Trigger reconciliation to update read-only sources
    this.reconcile()
  }
  
  /**
   * Reconcile state across all sources
   */
  private async reconcile() {
    if (this.reconciliationInProgress) return
    
    this.reconciliationInProgress = true
    
    try {
      // Get state from primary source
      const primaryState = this.getState()
      
      // Check for conflicts with other sources
      const conflicts: Array<{source: string, field: string, expected: any, actual: any}> = []
      
      for (const [name, source] of this.sources) {
        if (name === 'zustand-store') continue // Skip primary
        
        const sourceState = source.getState()
        
        // Check for conflicts
        for (const [key, value] of Object.entries(sourceState)) {
          const primaryValue = primaryState[key as keyof VideoState]
          
          // Allow small differences for currentTime (0.1s tolerance)
          if (key === 'currentTime') {
            if (Math.abs((value as number) - (primaryValue as number)) > 0.1) {
              conflicts.push({
                source: name,
                field: key,
                expected: primaryValue,
                actual: value
              })
            }
          } else if (value !== undefined && value !== primaryValue) {
            conflicts.push({
              source: name,
              field: key,
              expected: primaryValue,
              actual: value
            })
          }
        }
      }
      
      // Log conflicts if any
      if (conflicts.length > 0 && isFeatureEnabled('USE_STATE_COORDINATOR')) {
        console.warn('🔄 State conflicts detected:', conflicts)
        
        // Log for discovery
        if (typeof window !== 'undefined' && window.discoveryLogger) {
          discoveryLogger.logStateSync('conflicts', conflicts.length)
        }
      }
      
    } finally {
      this.reconciliationInProgress = false
    }
  }
  
  /**
   * Force reconciliation from a specific source
   */
  forceReconcileFrom(sourceName: string) {
    const source = this.sources.get(sourceName)
    if (!source) {
      console.warn(`VideoStateCoordinator: Source ${sourceName} not found`)
      return
    }
    
    const state = source.getState()
    this.setState(state, `force-${sourceName}`)
  }
  
  /**
   * Get statistics for debugging
   */
  getStats() {
    const sources = Array.from(this.sources.entries()).map(([name, source]) => ({
      name,
      priority: source.priority,
      isWritable: source.isWritable,
      state: source.getState()
    }))
    
    return {
      sources,
      lastKnownState: this.lastKnownState,
      reconciliationInProgress: this.reconciliationInProgress
    }
  }
  
  /**
   * Reset coordinator
   */
  reset() {
    this.sources.clear()
    this.initializePrimarySource()
    this.lastKnownState = {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      playbackRate: 1
    }
    this.reconciliationInProgress = false
  }
}

// Export singleton instance
export const videoStateCoordinator = VideoStateCoordinator.getInstance()

// Make available in browser console for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__VIDEO_STATE_COORDINATOR__ = videoStateCoordinator
}
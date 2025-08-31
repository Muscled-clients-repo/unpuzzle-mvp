/**
 * VideoStateAdapter
 * 
 * Wraps direct getState() calls to provide a safe migration path
 * from global singleton access to proper dependency injection.
 * 
 * Phase 1.1 - Critical Blocker Removal
 * Created: 2025-08-31
 */

import { useAppStore } from '@/stores/app-store'
import { isFeatureEnabled } from '@/utils/feature-flags'
import { discoveryLogger } from '@/utils/discovery-logger'

/**
 * Safe wrapper for getState() calls
 * Provides logging and future migration path
 */
export class VideoStateAdapter {
  private static instance: VideoStateAdapter | null = null
  
  // Track all getState calls for migration
  private getStateCalls = new Map<string, number>()
  
  private constructor() {
    if (isFeatureEnabled('USE_VIDEO_STATE_ADAPTER')) {
      console.log('🔄 VideoStateAdapter: Using new wrapped implementation')
    }
  }
  
  static getInstance(): VideoStateAdapter {
    if (!VideoStateAdapter.instance) {
      VideoStateAdapter.instance = new VideoStateAdapter()
    }
    return VideoStateAdapter.instance
  }
  
  /**
   * Safely get state with logging and migration path
   */
  getState(caller: string = 'unknown') {
    // Track usage
    const count = (this.getStateCalls.get(caller) || 0) + 1
    this.getStateCalls.set(caller, count)
    
    // Log if discovery is enabled
    if (typeof window !== 'undefined' && window.discoveryLogger) {
      discoveryLogger.logGetState(`VideoStateAdapter.${caller}`, 'wrapped-call')
    }
    
    if (isFeatureEnabled('USE_VIDEO_STATE_ADAPTER')) {
      // New implementation: Could inject different store or add validation
      try {
        const state = useAppStore.getState()
        
        // Add validation or transformation here if needed
        return state
      } catch (error) {
        console.error(`VideoStateAdapter: Error getting state for ${caller}:`, error)
        // Fallback to direct access
        return useAppStore.getState()
      }
    } else {
      // Old implementation: Direct access
      return useAppStore.getState()
    }
  }
  
  /**
   * Get video-specific state slice
   */
  getVideoState(caller: string = 'unknown') {
    const state = this.getState(`video.${caller}`)
    return state.video
  }
  
  /**
   * Get agent-specific state slice
   */
  getAgentState(caller: string = 'unknown') {
    const state = this.getState(`agent.${caller}`)
    return state.agent
  }
  
  /**
   * Get UI state slice
   */
  getUIState(caller: string = 'unknown') {
    const state = this.getState(`ui.${caller}`)
    return state.ui
  }
  
  /**
   * Get usage statistics (for debugging)
   */
  getUsageStats() {
    return {
      totalCalls: Array.from(this.getStateCalls.values()).reduce((a, b) => a + b, 0),
      uniqueCallers: this.getStateCalls.size,
      topCallers: Array.from(this.getStateCalls.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([caller, count]) => ({ caller, count }))
    }
  }
  
  /**
   * Reset instance (for testing)
   */
  static reset() {
    VideoStateAdapter.instance = null
  }
}

// Export singleton instance for gradual migration
export const videoStateAdapter = VideoStateAdapter.getInstance()
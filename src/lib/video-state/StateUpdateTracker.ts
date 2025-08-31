/**
 * StateUpdateTracker
 * 
 * Tracks state updates to identify and eliminate duplicates.
 * Ensures single source of truth for state updates.
 * 
 * Phase 2.2 - Eliminate Duplicate State Updates
 * Created: 2025-08-31
 */

import { isFeatureEnabled } from '@/utils/feature-flags'

interface StateUpdate {
  field: string
  value: any
  source: string
  timestamp: number
  stack?: string
}

export class StateUpdateTracker {
  private static instance: StateUpdateTracker | null = null
  private updates: StateUpdate[] = []
  private lastUpdate: Map<string, StateUpdate> = new Map()
  private duplicateThreshold = 100 // ms - updates within this time are considered duplicates
  
  private constructor() {
    if (isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
      console.log('🔍 StateUpdateTracker: Monitoring state updates')
    }
  }
  
  static getInstance(): StateUpdateTracker {
    if (!StateUpdateTracker.instance) {
      StateUpdateTracker.instance = new StateUpdateTracker()
    }
    return StateUpdateTracker.instance
  }
  
  /**
   * Track a state update
   * Returns true if this is a duplicate that should be skipped
   */
  trackUpdate(field: string, value: any, source: string): boolean {
    const now = Date.now()
    const update: StateUpdate = {
      field,
      value,
      source,
      timestamp: now,
      stack: new Error().stack
    }
    
    // Check for duplicate
    const lastUpdateForField = this.lastUpdate.get(field)
    const isDuplicate = this.isDuplicateUpdate(lastUpdateForField, update)
    
    if (isDuplicate && isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
      console.warn(`🚫 Duplicate state update blocked:`, {
        field,
        value,
        source,
        timeSinceLastMs: lastUpdateForField ? now - lastUpdateForField.timestamp : 0
      })
      return true // Signal to skip this update
    }
    
    // Store the update
    this.updates.push(update)
    this.lastUpdate.set(field, update)
    
    // Keep only last 100 updates to prevent memory leak
    if (this.updates.length > 100) {
      this.updates.shift()
    }
    
    if (isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
      console.log(`✅ State update allowed:`, {
        field,
        value,
        source
      })
    }
    
    return false // Not a duplicate, allow update
  }
  
  /**
   * Check if an update is a duplicate
   */
  private isDuplicateUpdate(lastUpdate: StateUpdate | undefined, newUpdate: StateUpdate): boolean {
    if (!lastUpdate) return false
    
    // Different value = not a duplicate
    if (lastUpdate.value !== newUpdate.value) return false
    
    // Same value from same source within threshold = duplicate
    if (lastUpdate.source === newUpdate.source) {
      return (newUpdate.timestamp - lastUpdate.timestamp) < this.duplicateThreshold
    }
    
    // Same value from different source within threshold = duplicate (conflict)
    if (newUpdate.timestamp - lastUpdate.timestamp < this.duplicateThreshold) {
      console.warn(`⚠️ State conflict detected:`, {
        field: newUpdate.field,
        value: newUpdate.value,
        source1: lastUpdate.source,
        source2: newUpdate.source,
        timeDiffMs: newUpdate.timestamp - lastUpdate.timestamp
      })
      return true
    }
    
    return false
  }
  
  /**
   * Get statistics for debugging
   */
  getStats() {
    const updatesByField = new Map<string, number>()
    const updatesBySource = new Map<string, number>()
    
    for (const update of this.updates) {
      updatesByField.set(update.field, (updatesByField.get(update.field) || 0) + 1)
      updatesBySource.set(update.source, (updatesBySource.get(update.source) || 0) + 1)
    }
    
    return {
      totalUpdates: this.updates.length,
      updatesByField: Object.fromEntries(updatesByField),
      updatesBySource: Object.fromEntries(updatesBySource),
      recentUpdates: this.updates.slice(-10)
    }
  }
  
  /**
   * Clear tracking data
   */
  clear() {
    this.updates = []
    this.lastUpdate.clear()
  }
}

// Export singleton instance
export const stateUpdateTracker = StateUpdateTracker.getInstance()

// Make available in browser console for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__STATE_UPDATE_TRACKER__ = stateUpdateTracker
}
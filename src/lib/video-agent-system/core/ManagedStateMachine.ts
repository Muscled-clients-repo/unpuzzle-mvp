/**
 * ManagedStateMachine
 * 
 * Instance-based state machine that replaces the global singleton pattern.
 * Provides proper lifecycle management and cleanup.
 * 
 * Phase 1.2 - Critical Blocker Removal
 * Created: 2025-08-31
 */

import { VideoAgentStateMachine } from './StateMachine'
import { isFeatureEnabled } from '@/utils/feature-flags'
import { discoveryLogger } from '@/utils/discovery-logger'

/**
 * Manages state machine instances with proper cleanup
 */
export class StateMachineManager {
  private static instances = new Map<string, VideoAgentStateMachine>()
  private static instanceCounter = 0
  
  /**
   * Create a managed instance
   */
  static createInstance(id?: string): VideoAgentStateMachine {
    const instanceId = id || `instance-${++StateMachineManager.instanceCounter}`
    
    if (isFeatureEnabled('USE_INSTANCE_STATE_MACHINE')) {
      console.log(`🔄 Creating managed state machine instance: ${instanceId}`)
    }
    
    // Check if instance already exists
    if (StateMachineManager.instances.has(instanceId)) {
      console.warn(`StateMachine instance ${instanceId} already exists, returning existing`)
      return StateMachineManager.instances.get(instanceId)!
    }
    
    // Create new instance
    const instance = new VideoAgentStateMachine()
    StateMachineManager.instances.set(instanceId, instance)
    
    // Log creation
    if (typeof window !== 'undefined' && window.discoveryLogger) {
      discoveryLogger.logSingletonAccess(`ManagedStateMachine-${instanceId}`, instance)
    }
    
    return instance
  }
  
  /**
   * Get an existing instance
   */
  static getInstance(id: string): VideoAgentStateMachine | null {
    return StateMachineManager.instances.get(id) || null
  }
  
  /**
   * Destroy an instance and clean up
   */
  static destroyInstance(id: string): void {
    const instance = StateMachineManager.instances.get(id)
    
    if (instance) {
      if (isFeatureEnabled('USE_INSTANCE_STATE_MACHINE')) {
        console.log(`🗑️ Destroying state machine instance: ${id}`)
      }
      
      // Clean up subscriptions
      instance.destroy?.()
      
      // Remove from registry
      StateMachineManager.instances.delete(id)
    }
  }
  
  /**
   * Destroy all instances (for cleanup)
   */
  static destroyAll(): void {
    if (isFeatureEnabled('USE_INSTANCE_STATE_MACHINE')) {
      console.log(`🗑️ Destroying all ${StateMachineManager.instances.size} state machine instances`)
    }
    
    for (const [id] of StateMachineManager.instances) {
      StateMachineManager.destroyInstance(id)
    }
  }
  
  /**
   * Get statistics (for debugging)
   */
  static getStats() {
    return {
      activeInstances: StateMachineManager.instances.size,
      instanceIds: Array.from(StateMachineManager.instances.keys()),
      totalCreated: StateMachineManager.instanceCounter
    }
  }
}

/**
 * Context provider value for managed state machine
 */
export interface ManagedStateMachineContext {
  instanceId: string
  stateMachine: VideoAgentStateMachine
}

// For backward compatibility during migration
let globalCompatibilityInstance: VideoAgentStateMachine | null = null

/**
 * Get or create the global compatibility instance
 * Used to maintain backward compatibility during migration
 */
export function getGlobalCompatibilityInstance(): VideoAgentStateMachine {
  if (!globalCompatibilityInstance) {
    if (isFeatureEnabled('USE_INSTANCE_STATE_MACHINE')) {
      console.log('🔄 Creating global compatibility instance (managed)')
      globalCompatibilityInstance = StateMachineManager.createInstance('global-compat')
    } else {
      // Fallback to creating a direct instance
      globalCompatibilityInstance = new VideoAgentStateMachine()
    }
  }
  return globalCompatibilityInstance
}

/**
 * Reset global instance (for testing)
 */
export function resetGlobalInstance(): void {
  if (globalCompatibilityInstance) {
    StateMachineManager.destroyInstance('global-compat')
    globalCompatibilityInstance = null
  }
}
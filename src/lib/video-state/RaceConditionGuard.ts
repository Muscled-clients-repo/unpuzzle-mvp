/**
 * RaceConditionGuard
 * 
 * Prevents race conditions in state updates by adding proper sequencing
 * and mutex locks for critical sections.
 * 
 * Phase 2.3 - Fix Race Conditions
 * Created: 2025-08-31
 */

import { isFeatureEnabled } from '@/utils/feature-flags'

interface Operation {
  id: string
  type: string
  startTime: number
  endTime?: number
  completed: boolean
  cancelled: boolean
}

export class RaceConditionGuard {
  private static instance: RaceConditionGuard | null = null
  private operations = new Map<string, Operation>()
  private mutexes = new Map<string, boolean>()
  private operationQueue = new Map<string, Array<() => Promise<void>>>()
  
  private constructor() {
    if (isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
      console.log('🔒 RaceConditionGuard: Protecting against race conditions')
    }
  }
  
  static getInstance(): RaceConditionGuard {
    if (!RaceConditionGuard.instance) {
      RaceConditionGuard.instance = new RaceConditionGuard()
    }
    return RaceConditionGuard.instance
  }
  
  /**
   * Acquire a mutex lock for a critical section
   */
  async acquireLock(resource: string, timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now()
    
    while (this.mutexes.get(resource)) {
      if (Date.now() - startTime > timeoutMs) {
        console.error(`🔒 Failed to acquire lock for ${resource} - timeout`)
        return false
      }
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    this.mutexes.set(resource, true)
    
    if (isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
      console.log(`🔒 Lock acquired: ${resource}`)
    }
    
    return true
  }
  
  /**
   * Release a mutex lock
   */
  releaseLock(resource: string) {
    this.mutexes.set(resource, false)
    
    if (isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
      console.log(`🔓 Lock released: ${resource}`)
    }
    
    // Process any queued operations for this resource
    const queue = this.operationQueue.get(resource)
    if (queue && queue.length > 0) {
      const nextOperation = queue.shift()
      if (nextOperation) {
        nextOperation()
      }
    }
  }
  
  /**
   * Execute an operation with mutex protection
   */
  async executeWithLock<T>(
    resource: string,
    operation: () => Promise<T>,
    operationName: string = 'unknown'
  ): Promise<T | null> {
    const lockAcquired = await this.acquireLock(resource)
    
    if (!lockAcquired) {
      console.error(`🔒 Could not execute ${operationName} - lock not acquired`)
      return null
    }
    
    try {
      const result = await operation()
      return result
    } catch (error) {
      console.error(`🔒 Error in protected operation ${operationName}:`, error)
      throw error
    } finally {
      this.releaseLock(resource)
    }
  }
  
  /**
   * Start tracking an operation to detect conflicts
   */
  startOperation(id: string, type: string): boolean {
    // Check for conflicting operations
    for (const [opId, op] of this.operations) {
      if (op.type === type && !op.completed && !op.cancelled) {
        const timeSinceStart = Date.now() - op.startTime
        
        if (timeSinceStart < 100) { // Operation started less than 100ms ago
          console.warn(`⚠️ Race condition detected: ${type} already in progress`, {
            existingOp: opId,
            newOp: id,
            timeDiff: timeSinceStart
          })
          return false // Don't allow the new operation
        }
      }
    }
    
    const operation: Operation = {
      id,
      type,
      startTime: Date.now(),
      completed: false,
      cancelled: false
    }
    
    this.operations.set(id, operation)
    
    // Clean up old operations
    if (this.operations.size > 50) {
      const oldestId = this.operations.keys().next().value
      this.operations.delete(oldestId)
    }
    
    if (isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
      console.log(`🏁 Operation started: ${type} (${id})`)
    }
    
    return true
  }
  
  /**
   * Complete an operation
   */
  completeOperation(id: string) {
    const operation = this.operations.get(id)
    if (operation) {
      operation.completed = true
      operation.endTime = Date.now()
      
      if (isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
        const duration = operation.endTime - operation.startTime
        console.log(`✅ Operation completed: ${operation.type} (${id}) - ${duration}ms`)
      }
    }
  }
  
  /**
   * Cancel an operation
   */
  cancelOperation(id: string) {
    const operation = this.operations.get(id)
    if (operation) {
      operation.cancelled = true
      operation.endTime = Date.now()
      
      if (isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
        console.log(`❌ Operation cancelled: ${operation.type} (${id})`)
      }
    }
  }
  
  /**
   * Check if an operation type is currently in progress
   */
  isOperationInProgress(type: string): boolean {
    for (const op of this.operations.values()) {
      if (op.type === type && !op.completed && !op.cancelled) {
        const timeSinceStart = Date.now() - op.startTime
        
        // Consider operations older than 5 seconds as stale
        if (timeSinceStart < 5000) {
          return true
        }
      }
    }
    return false
  }
  
  /**
   * Queue an operation to run after current operations complete
   */
  queueOperation(resource: string, operation: () => Promise<void>) {
    if (!this.operationQueue.has(resource)) {
      this.operationQueue.set(resource, [])
    }
    
    this.operationQueue.get(resource)!.push(operation)
    
    if (isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
      console.log(`📋 Operation queued for resource: ${resource}`)
    }
  }
  
  /**
   * Get statistics for debugging
   */
  getStats() {
    const activeOperations = Array.from(this.operations.values())
      .filter(op => !op.completed && !op.cancelled)
    
    const lockedResources = Array.from(this.mutexes.entries())
      .filter(([_, locked]) => locked)
      .map(([resource]) => resource)
    
    return {
      activeOperations: activeOperations.map(op => ({
        id: op.id,
        type: op.type,
        runningMs: Date.now() - op.startTime
      })),
      lockedResources,
      queuedOperations: Array.from(this.operationQueue.entries()).map(([resource, queue]) => ({
        resource,
        queueLength: queue.length
      }))
    }
  }
  
  /**
   * Clear all locks and operations (for cleanup)
   */
  clear() {
    this.operations.clear()
    this.mutexes.clear()
    this.operationQueue.clear()
  }
}

// Export singleton instance
export const raceConditionGuard = RaceConditionGuard.getInstance()

// Make available in browser console for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__RACE_CONDITION_GUARD__ = raceConditionGuard
}
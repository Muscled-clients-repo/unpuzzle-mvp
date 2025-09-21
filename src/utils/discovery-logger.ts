/**
 * Discovery Logger for Refactoring
 * 
 * Non-breaking logging utility to track critical dependencies during refactoring.
 * This helps us understand the system behavior without modifying functionality.
 * 
 * Created: 2025-08-31
 * Purpose: Phase 0 - Pre-Flight Safety
 */

const DISCOVERY_ENABLED = process.env.NEXT_PUBLIC_DISCOVERY_LOGGING === 'true'

export class DiscoveryLogger {
  private static instance: DiscoveryLogger
  private logs: any[] = []
  
  private constructor() {
    if (DISCOVERY_ENABLED) {
      // Make logs accessible in console for debugging
      if (typeof window !== 'undefined') {
        (window as any).__DISCOVERY_LOGS__ = this.logs
      }
    }
  }
  
  static getInstance(): DiscoveryLogger {
    if (!DiscoveryLogger.instance) {
      DiscoveryLogger.instance = new DiscoveryLogger()
    }
    return DiscoveryLogger.instance
  }
  
  /**
   * Log getState() calls with stack trace
   */
  logGetState(location: string, state: any) {
    if (!DISCOVERY_ENABLED) return
    
    const log = {
      type: 'GET_STATE',
      location,
      timestamp: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(state || {})),
      stack: new Error().stack
    }
    
    this.logs.push(log)
  }
  
  /**
   * Log global singleton access
   */
  logSingletonAccess(name: string, instance: any) {
    if (!DISCOVERY_ENABLED) return
    
    const log = {
      type: 'SINGLETON_ACCESS',
      name,
      timestamp: new Date().toISOString(),
      hasInstance: !!instance,
      stack: new Error().stack
    }
    
    this.logs.push(log)
  }
  
  /**
   * Log ref chain passage
   */
  logRefChain(level: string, ref: any) {
    if (!DISCOVERY_ENABLED) return
    
    const log = {
      type: 'REF_CHAIN',
      level,
      timestamp: new Date().toISOString(),
      hasRef: !!ref,
      refType: ref?.constructor?.name || typeof ref,
      stack: new Error().stack
    }
    
    this.logs.push(log)
  }
  
  /**
   * Log event listener registration
   */
  logEventListener(element: string, event: string, action: 'add' | 'remove') {
    if (!DISCOVERY_ENABLED) return
    
    const log = {
      type: 'EVENT_LISTENER',
      element,
      event,
      action,
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    }
    
    this.logs.push(log)
  }
  
  /**
   * Log state synchronization attempts
   */
  logStateSync(source: string, target: string, value: any) {
    if (!DISCOVERY_ENABLED) return
    
    const log = {
      type: 'STATE_SYNC',
      source,
      target,
      value,
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    }
    
    this.logs.push(log)
  }
  
  /**
   * Log circular dependency detection
   */
  logCircularDep(from: string, to: string) {
    if (!DISCOVERY_ENABLED) return
    
    const log = {
      type: 'CIRCULAR_DEP',
      from,
      to,
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    }
    
    this.logs.push(log)
    console.warn('🔴 [CircularDep]', `${from} ↔ ${to}`)
  }
  
  /**
   * Log DOM access
   */
  logDOMAccess(selector: string, found: boolean) {
    if (!DISCOVERY_ENABLED) return
    
    const log = {
      type: 'DOM_ACCESS',
      selector,
      found,
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    }
    
    this.logs.push(log)
  }
  
  /**
   * Export logs for analysis
   */
  exportLogs() {
    if (!DISCOVERY_ENABLED) {
      return
    }
    
    console.group('📋 Discovery Logs Export')
    
    const byType = this.logs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    Object.entries(byType).forEach(([type, count]) => {
    })
    
    console.groupEnd()
    
    return this.logs
  }
  
  /**
   * Log state synchronization events
   */
  logStateSync(action: string, details: any) {
    if (!DISCOVERY_ENABLED) return
    
    const log = {
      type: 'STATE_SYNC',
      action,
      details,
      timestamp: new Date().toISOString()
    }
    
    this.logs.push(log)
  }
  
  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = []
  }
}

// Export singleton instance
export const discoveryLogger = DiscoveryLogger.getInstance()
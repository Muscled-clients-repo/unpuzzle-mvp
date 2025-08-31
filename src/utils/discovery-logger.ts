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
      console.log('🔍 Discovery Logging Enabled - Tracking critical dependencies')
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
    console.log('📊 [GetState]', location, state)
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
    console.log('🌐 [Singleton]', name, !!instance)
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
    console.log('🔗 [RefChain]', level, !!ref)
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
    console.log(`${action === 'add' ? '➕' : '➖'} [EventListener]`, element, event)
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
    console.log('🔄 [StateSync]', `${source} → ${target}`, value)
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
    console.log('🌍 [DOM]', selector, found ? '✓' : '✗')
  }
  
  /**
   * Export logs for analysis
   */
  exportLogs() {
    if (!DISCOVERY_ENABLED) {
      console.log('Discovery logging is disabled')
      return
    }
    
    console.group('📋 Discovery Logs Export')
    console.log('Total logs:', this.logs.length)
    console.log('By type:')
    
    const byType = this.logs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`)
    })
    
    console.log('\nFull logs available at: window.__DISCOVERY_LOGS__')
    console.groupEnd()
    
    return this.logs
  }
  
  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = []
    console.log('🗑️ Discovery logs cleared')
  }
}

// Export singleton instance
export const discoveryLogger = DiscoveryLogger.getInstance()
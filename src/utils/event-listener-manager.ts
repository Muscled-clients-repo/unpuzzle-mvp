/**
 * EventListenerManager
 * 
 * Tracks all event listeners to ensure proper cleanup and prevent memory leaks.
 * Wraps addEventListener/removeEventListener with tracking.
 * 
 * Phase 1.3 - Critical Blocker Removal
 * Created: 2025-08-31
 */

import { isFeatureEnabled } from './feature-flags'
import { discoveryLogger } from './discovery-logger'

interface TrackedListener {
  element: EventTarget | string
  event: string
  handler: EventListenerOrEventListenerObject
  options?: boolean | AddEventListenerOptions
  addedAt: number
  stack?: string
  component?: string
}

export class EventListenerManager {
  private static instance: EventListenerManager | null = null
  private listeners = new Map<string, TrackedListener>()
  private listenerIdCounter = 0
  
  private constructor() {
    if (isFeatureEnabled('USE_EVENT_LISTENER_MANAGER')) {
      console.log('🎯 EventListenerManager: Tracking event listeners')
    }
  }
  
  static getInstance(): EventListenerManager {
    if (!EventListenerManager.instance) {
      EventListenerManager.instance = new EventListenerManager()
    }
    return EventListenerManager.instance
  }
  
  /**
   * Generate unique ID for listener
   */
  private generateId(
    element: EventTarget | string,
    event: string,
    handler: EventListenerOrEventListenerObject
  ): string {
    const elementStr = typeof element === 'string' 
      ? element 
      : element.constructor.name
    return `${elementStr}-${event}-${++this.listenerIdCounter}`
  }
  
  /**
   * Add event listener with tracking
   */
  addEventListener(
    element: EventTarget,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
    component?: string
  ): string {
    const id = this.generateId(element, event, handler)
    
    // Track the listener
    const trackedListener: TrackedListener = {
      element,
      event,
      handler,
      options,
      addedAt: Date.now(),
      component,
      stack: new Error().stack
    }
    
    this.listeners.set(id, trackedListener)
    
    // Log if discovery is enabled
    if (typeof window !== 'undefined' && window.discoveryLogger) {
      const elementStr = element === window ? 'window' 
        : element === document ? 'document'
        : (element as any).tagName || element.constructor.name
      discoveryLogger.logEventListener(elementStr, event, 'add')
    }
    
    if (isFeatureEnabled('USE_EVENT_LISTENER_MANAGER')) {
      console.log(`🎯 Added listener: ${id}`, {
        element: element.constructor.name,
        event,
        component
      })
    }
    
    // Actually add the listener
    element.addEventListener(event, handler, options)
    
    return id
  }
  
  /**
   * Remove event listener with tracking
   */
  removeEventListener(
    element: EventTarget,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): boolean {
    // Find the tracked listener
    let foundId: string | null = null
    
    for (const [id, tracked] of this.listeners.entries()) {
      if (
        tracked.element === element &&
        tracked.event === event &&
        tracked.handler === handler
      ) {
        foundId = id
        break
      }
    }
    
    if (foundId) {
      this.listeners.delete(foundId)
      
      // Log if discovery is enabled
      if (typeof window !== 'undefined' && window.discoveryLogger) {
        const elementStr = element === window ? 'window' 
          : element === document ? 'document'
          : (element as any).tagName || element.constructor.name
        discoveryLogger.logEventListener(elementStr, event, 'remove')
      }
      
      if (isFeatureEnabled('USE_EVENT_LISTENER_MANAGER')) {
        console.log(`🎯 Removed listener: ${foundId}`)
      }
    } else if (isFeatureEnabled('USE_EVENT_LISTENER_MANAGER')) {
      console.warn('🎯 Removing untracked listener:', {
        element: element.constructor.name,
        event
      })
    }
    
    // Actually remove the listener
    element.removeEventListener(event, handler, options)
    
    return foundId !== null
  }
  
  /**
   * Remove listener by ID
   */
  removeById(id: string): boolean {
    const tracked = this.listeners.get(id)
    
    if (!tracked) {
      console.warn(`🎯 Listener not found: ${id}`)
      return false
    }
    
    if (tracked.element instanceof EventTarget) {
      tracked.element.removeEventListener(
        tracked.event,
        tracked.handler,
        tracked.options
      )
    }
    
    this.listeners.delete(id)
    
    if (isFeatureEnabled('USE_EVENT_LISTENER_MANAGER')) {
      console.log(`🎯 Removed listener by ID: ${id}`)
    }
    
    return true
  }
  
  /**
   * Remove all listeners for a component
   */
  removeAllForComponent(component: string): number {
    const toRemove: string[] = []
    
    for (const [id, tracked] of this.listeners.entries()) {
      if (tracked.component === component) {
        toRemove.push(id)
      }
    }
    
    let removed = 0
    for (const id of toRemove) {
      if (this.removeById(id)) {
        removed++
      }
    }
    
    if (isFeatureEnabled('USE_EVENT_LISTENER_MANAGER')) {
      console.log(`🎯 Removed ${removed} listeners for component: ${component}`)
    }
    
    return removed
  }
  
  /**
   * Get active listeners (for debugging)
   */
  getActiveListeners(): TrackedListener[] {
    return Array.from(this.listeners.values())
  }
  
  /**
   * Get statistics
   */
  getStats() {
    const now = Date.now()
    const listeners = Array.from(this.listeners.values())
    
    return {
      total: listeners.length,
      byEvent: listeners.reduce((acc, l) => {
        acc[l.event] = (acc[l.event] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byComponent: listeners.reduce((acc, l) => {
        const comp = l.component || 'unknown'
        acc[comp] = (acc[comp] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      oldestMs: listeners.length > 0 
        ? Math.max(...listeners.map(l => now - l.addedAt))
        : 0,
      potentialLeaks: listeners.filter(l => now - l.addedAt > 60000) // Over 1 minute old
    }
  }
  
  /**
   * Check for potential memory leaks
   */
  checkForLeaks(): TrackedListener[] {
    const now = Date.now()
    const threshold = 60000 // 1 minute
    
    const potentialLeaks = Array.from(this.listeners.values())
      .filter(l => now - l.addedAt > threshold)
    
    if (potentialLeaks.length > 0 && isFeatureEnabled('USE_EVENT_LISTENER_MANAGER')) {
      console.warn(`🎯 Potential memory leaks detected: ${potentialLeaks.length} listeners over 1 minute old`)
      potentialLeaks.forEach(l => {
        console.warn('  - ', {
          event: l.event,
          component: l.component,
          ageMs: now - l.addedAt
        })
      })
    }
    
    return potentialLeaks
  }
  
  /**
   * Clear all listeners (for cleanup)
   */
  clearAll(): void {
    const count = this.listeners.size
    
    // Remove all tracked listeners
    for (const [id, tracked] of this.listeners.entries()) {
      if (tracked.element instanceof EventTarget) {
        tracked.element.removeEventListener(
          tracked.event,
          tracked.handler,
          tracked.options
        )
      }
    }
    
    this.listeners.clear()
    
    if (isFeatureEnabled('USE_EVENT_LISTENER_MANAGER')) {
      console.log(`🎯 Cleared all ${count} listeners`)
    }
  }
}

// Export singleton instance
export const eventListenerManager = EventListenerManager.getInstance()

// Export convenience functions for easier use
export function trackEventListener(
  element: EventTarget,
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
  component?: string
): string {
  if (isFeatureEnabled('USE_EVENT_LISTENER_MANAGER')) {
    return eventListenerManager.addEventListener(element, event, handler, options, component)
  } else {
    // Fallback to normal addEventListener
    element.addEventListener(event, handler, options)
    return 'untracked'
  }
}

export function untrackEventListener(
  element: EventTarget,
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
): boolean {
  if (isFeatureEnabled('USE_EVENT_LISTENER_MANAGER')) {
    return eventListenerManager.removeEventListener(element, event, handler, options)
  } else {
    // Fallback to normal removeEventListener
    element.removeEventListener(event, handler, options)
    return true
  }
}

// Make available in browser console for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__EVENT_LISTENER_MANAGER__ = eventListenerManager
}
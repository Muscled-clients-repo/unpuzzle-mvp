/**
 * useTrackedEventListener
 * 
 * React hook for adding tracked event listeners that are automatically cleaned up.
 * 
 * Phase 1.3 - Event Listener Cleanup Tracking
 * Created: 2025-08-31
 */

import { useEffect, useRef } from 'react'
import { trackEventListener, untrackEventListener } from '@/utils/event-listener-manager'
import { isFeatureEnabled } from '@/utils/feature-flags'

export function useTrackedEventListener(
  element: EventTarget | null | undefined,
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
  componentName?: string
) {
  const listenerIdRef = useRef<string | null>(null)
  const handlerRef = useRef(handler)
  
  // Update handler ref
  handlerRef.current = handler
  
  useEffect(() => {
    if (!element) return
    
    // Create stable handler that uses ref
    const stableHandler: EventListenerOrEventListenerObject = (e) => {
      if (typeof handlerRef.current === 'function') {
        handlerRef.current(e)
      } else if (handlerRef.current && 'handleEvent' in handlerRef.current) {
        handlerRef.current.handleEvent(e)
      }
    }
    
    if (isFeatureEnabled('USE_EVENT_LISTENER_MANAGER') || isFeatureEnabled('USE_CLEANUP_TRACKING')) {
      // Use tracked listener
      listenerIdRef.current = trackEventListener(
        element,
        event,
        stableHandler,
        options,
        componentName || 'unknown'
      )
      
      if (isFeatureEnabled('USE_CLEANUP_TRACKING')) {
        console.log(`🧹 Added tracked listener in ${componentName}:`, event)
      }
    } else {
      // Fallback to normal listener
      element.addEventListener(event, stableHandler, options)
    }
    
    // Cleanup function
    return () => {
      if (isFeatureEnabled('USE_EVENT_LISTENER_MANAGER') || isFeatureEnabled('USE_CLEANUP_TRACKING')) {
        untrackEventListener(element, event, stableHandler, options)
        
        if (isFeatureEnabled('USE_CLEANUP_TRACKING')) {
          console.log(`🧹 Cleaned up listener in ${componentName}:`, event)
        }
      } else {
        element.removeEventListener(event, stableHandler, options)
      }
      
      listenerIdRef.current = null
    }
  }, [element, event, options, componentName])
}

/**
 * Hook for window event listeners
 */
export function useWindowEventListener(
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
  componentName?: string
) {
  useTrackedEventListener(
    typeof window !== 'undefined' ? window : null,
    event,
    handler,
    options,
    componentName
  )
}

/**
 * Hook for document event listeners
 */
export function useDocumentEventListener(
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
  componentName?: string
) {
  useTrackedEventListener(
    typeof document !== 'undefined' ? document : null,
    event,
    handler,
    options,
    componentName
  )
}
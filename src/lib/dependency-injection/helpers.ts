/**
 * Helper functions for dependency injection in React components
 * These are NOT hooks - they can be called conditionally
 * 
 * Phase 3.1 - Dependency Injection (Revised)
 * Created: 2025-08-31
 */

import { isFeatureEnabled } from '@/utils/feature-flags'
import { Services } from './ServiceContainer'

/**
 * Get a service from DI if enabled, otherwise return null
 * This is NOT a hook - can be called conditionally
 * Caller must provide fallback
 */
export function getDIService<K extends keyof Services>(name: K): Services[K] | null {
  if (!isFeatureEnabled('USE_DEPENDENCY_INJECTION')) {
    return null
  }
  
  try {
    // Dynamic import to avoid circular dependencies
    const { getService } = require('./ServiceContainer')
    return getService(name)
  } catch (error) {
    console.warn(`Failed to get service ${name} from DI:`, error)
    return null
  }
}

/**
 * Get a service with automatic fallback
 * This is NOT a hook - can be called conditionally
 */
export function getServiceWithFallback<K extends keyof Services>(
  name: K,
  fallbackFactory: () => Services[K]
): Services[K] {
  const diService = getDIService(name)
  return diService || fallbackFactory()
}
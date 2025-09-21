/**
 * Feature Flags for Safe Refactoring
 * 
 * Kill switches to instantly disable risky changes if they break production.
 * All flags default to false (use old behavior) for safety.
 * 
 * Created: 2025-08-31
 * Purpose: Phase 0 - Pre-Flight Safety
 */

// Feature flag configuration
export const FEATURE_FLAGS = {
  // State Management Refactoring
  USE_NEW_VIDEO_SLICE: process.env.NEXT_PUBLIC_USE_NEW_VIDEO_SLICE === 'true',
  USE_VIDEO_STATE_ADAPTER: false, // Disabled to reduce console noise
  
  // Dependency Injection
  USE_DEPENDENCY_INJECTION: false, // Disabled to reduce console noise
  USE_SERVICE_CONTAINER: false, // Disabled to reduce console noise

  // Singleton Management
  USE_INSTANCE_STATE_MACHINE: false, // Disabled to reduce console noise
  USE_MANAGED_SINGLETONS: false, // Disabled to reduce console noise

  // Event System
  USE_EVENT_LISTENER_MANAGER: false, // Disabled to reduce console noise
  USE_CLEANUP_TRACKING: false, // Disabled to reduce console noise

  // State Synchronization
  USE_STATE_COORDINATOR: false, // Disabled to reduce console noise
  USE_SINGLE_SOURCE_TRUTH: false, // Disabled to reduce console noise

  // DOM Abstraction
  USE_DOM_SERVICE: false, // Disabled to reduce console noise
  USE_ABSTRACT_DOM_ACCESS: process.env.NEXT_PUBLIC_USE_ABSTRACT_DOM_ACCESS === 'true',
  
  // Performance Optimizations
  USE_THROTTLED_HANDLERS: process.env.NEXT_PUBLIC_USE_THROTTLED_HANDLERS === 'true',
  USE_DEBOUNCED_UPDATES: process.env.NEXT_PUBLIC_USE_DEBOUNCED_UPDATES === 'true',
  
  // Error Handling
  USE_ERROR_BOUNDARIES: process.env.NEXT_PUBLIC_USE_ERROR_BOUNDARIES === 'true',
  USE_FALLBACK_UI: process.env.NEXT_PUBLIC_USE_FALLBACK_UI === 'true',
  
  // Debug Mode
  SHOW_REFACTOR_DEBUG: false, // Disabled to reduce console noise
  LOG_STATE_CHANGES: process.env.NEXT_PUBLIC_LOG_STATE_CHANGES === 'true'
} as const

/**
 * Feature flag checker with logging
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  const enabled = FEATURE_FLAGS[flag]
  
  if (FEATURE_FLAGS.SHOW_REFACTOR_DEBUG && enabled) {
  }
  
  return enabled
}

/**
 * Get all enabled features (for debugging)
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => enabled)
    .map(([flag]) => flag)
}

/**
 * Log feature flag status
 */
export function logFeatureFlags() {
  const enabled = getEnabledFeatures()
  
  if (enabled.length > 0) {
    console.group('🚩 Enabled Feature Flags')
    console.groupEnd()
  } else {
  }
}

/**
 * HOC to conditionally use new implementation
 */
export function withFeatureFlag<T>(
  flag: keyof typeof FEATURE_FLAGS,
  newImplementation: T,
  oldImplementation: T
): T {
  if (isFeatureEnabled(flag)) {
    if (FEATURE_FLAGS.SHOW_REFACTOR_DEBUG) {
    }
    return newImplementation
  }
  return oldImplementation
}

/**
 * Hook to check feature flag in components
 */
export function useFeatureFlag(flag: keyof typeof FEATURE_FLAGS): boolean {
  return isFeatureEnabled(flag)
}

// Initialize feature flags in browser (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Make flags accessible in console for debugging
  (window as any).__FEATURE_FLAGS__ = FEATURE_FLAGS
  
  // Log enabled flags after page load to avoid initialization issues
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const enabled = getEnabledFeatures()
        if (enabled.length > 0) {
          console.group('🚩 Enabled Feature Flags')
          console.groupEnd()
        } else {
        }
      })
    } else {
      // DOM already loaded
      const enabled = getEnabledFeatures()
      if (enabled.length > 0) {
        console.group('🚩 Enabled Feature Flags')
        console.groupEnd()
      } else {
      }
    }
  }
}
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
  USE_VIDEO_STATE_ADAPTER: process.env.NEXT_PUBLIC_USE_VIDEO_STATE_ADAPTER === 'true',
  
  // Dependency Injection
  USE_DEPENDENCY_INJECTION: process.env.NEXT_PUBLIC_USE_DEPENDENCY_INJECTION === 'true',
  USE_SERVICE_CONTAINER: process.env.NEXT_PUBLIC_USE_SERVICE_CONTAINER === 'true',
  
  // Singleton Management
  USE_INSTANCE_STATE_MACHINE: process.env.NEXT_PUBLIC_USE_INSTANCE_STATE_MACHINE === 'true',
  USE_MANAGED_SINGLETONS: process.env.NEXT_PUBLIC_USE_MANAGED_SINGLETONS === 'true',
  
  // Event System
  USE_EVENT_LISTENER_MANAGER: process.env.NEXT_PUBLIC_USE_EVENT_LISTENER_MANAGER === 'true',
  USE_CLEANUP_TRACKING: process.env.NEXT_PUBLIC_USE_CLEANUP_TRACKING === 'true',
  
  // State Synchronization
  USE_STATE_COORDINATOR: process.env.NEXT_PUBLIC_USE_STATE_COORDINATOR === 'true',
  USE_SINGLE_SOURCE_TRUTH: process.env.NEXT_PUBLIC_USE_SINGLE_SOURCE_TRUTH === 'true',
  
  // DOM Abstraction
  USE_DOM_SERVICE: process.env.NEXT_PUBLIC_USE_DOM_SERVICE === 'true',
  USE_ABSTRACT_DOM_ACCESS: process.env.NEXT_PUBLIC_USE_ABSTRACT_DOM_ACCESS === 'true',
  
  // Performance Optimizations
  USE_THROTTLED_HANDLERS: process.env.NEXT_PUBLIC_USE_THROTTLED_HANDLERS === 'true',
  USE_DEBOUNCED_UPDATES: process.env.NEXT_PUBLIC_USE_DEBOUNCED_UPDATES === 'true',
  
  // Error Handling
  USE_ERROR_BOUNDARIES: process.env.NEXT_PUBLIC_USE_ERROR_BOUNDARIES === 'true',
  USE_FALLBACK_UI: process.env.NEXT_PUBLIC_USE_FALLBACK_UI === 'true',
  
  // Debug Mode
  SHOW_REFACTOR_DEBUG: process.env.NEXT_PUBLIC_SHOW_REFACTOR_DEBUG === 'true',
  LOG_STATE_CHANGES: process.env.NEXT_PUBLIC_LOG_STATE_CHANGES === 'true'
} as const

/**
 * Feature flag checker with logging
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  const enabled = FEATURE_FLAGS[flag]
  
  if (FEATURE_FLAGS.SHOW_REFACTOR_DEBUG && enabled) {
    console.log(`🚩 Feature Flag: ${flag} is ENABLED`)
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
    enabled.forEach(flag => console.log(`  ✅ ${flag}`))
    console.groupEnd()
  } else {
    console.log('🚩 All feature flags disabled (using original behavior)')
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
      console.log(`🔄 Using NEW implementation for ${flag}`)
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
          enabled.forEach(flag => console.log(`  ✅ ${flag}`))
          console.groupEnd()
        } else {
          console.log('🚩 All feature flags disabled (using original behavior)')
        }
      })
    } else {
      // DOM already loaded
      const enabled = getEnabledFeatures()
      if (enabled.length > 0) {
        console.group('🚩 Enabled Feature Flags')
        enabled.forEach(flag => console.log(`  ✅ ${flag}`))
        console.groupEnd()
      } else {
        console.log('🚩 All feature flags disabled (using original behavior)')
      }
    }
  }
}
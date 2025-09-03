// src/config/features.ts
// Feature flags for gradual migration from mock data to database

/**
 * Feature Flags Configuration
 * 
 * Set these flags to true to enable database features.
 * Keep them false to continue using mock data.
 * 
 * MIGRATION PLAN:
 * Phase 1: Enable USE_DB_FOR_ENROLLMENT (current)
 * Phase 2: Enable USE_DB_FOR_PROGRESS
 * Phase 3: Enable USE_DB_FOR_ANALYTICS
 * Phase 4: Enable USE_DB_FOR_AI_INTERACTIONS
 * Phase 5: Remove mock data completely
 */
export const FEATURE_FLAGS = {
  // Core features
  USE_DB_FOR_ENROLLMENT: false,    // Student course enrollment data
  USE_DB_FOR_PROGRESS: false,      // Video progress tracking
  USE_DB_FOR_ANALYTICS: false,     // Learning analytics (struggles, milestones)
  USE_DB_FOR_AI_INTERACTIONS: false, // AI chat and interactions
  
  // UI features
  SHOW_DATA_SOURCE_BADGE: true,    // Show badge indicating data source
  ENABLE_REAL_TIME_SYNC: false,    // Enable real-time database sync
  
  // Debug features
  LOG_DATABASE_QUERIES: false,     // Log all database queries to console
  SHOW_PERFORMANCE_METRICS: false, // Show performance metrics in UI
} as const

// Helper to check if any database feature is enabled
export const isDatabaseEnabled = () => {
  return Object.entries(FEATURE_FLAGS)
    .filter(([key]) => key.startsWith('USE_DB'))
    .some(([, value]) => value === true)
}

// Helper to get data source label
export const getDataSourceLabel = () => {
  if (isDatabaseEnabled()) {
    const enabledFeatures = Object.entries(FEATURE_FLAGS)
      .filter(([key, value]) => key.startsWith('USE_DB') && value)
      .map(([key]) => key.replace('USE_DB_FOR_', ''))
    
    return `Database (${enabledFeatures.join(', ')})`
  }
  return 'Mock Data'
}

// Environment-based overrides
if (process.env.NODE_ENV === 'production') {
  // In production, you might want to force certain features
  // FEATURE_FLAGS.USE_DB_FOR_ENROLLMENT = true
}

// Allow runtime override from localStorage (for testing)
if (typeof window !== 'undefined') {
  try {
    const overrides = localStorage.getItem('unpuzzle-feature-overrides')
    if (overrides) {
      const parsed = JSON.parse(overrides)
      Object.assign(FEATURE_FLAGS, parsed)
    }
  } catch (e) {
    // Ignore errors in localStorage parsing
  }
}

// Export a function to toggle features at runtime
export const toggleFeature = (feature: keyof typeof FEATURE_FLAGS, value?: boolean) => {
  const newValue = value !== undefined ? value : !FEATURE_FLAGS[feature]
  
  // Update the flag
  FEATURE_FLAGS[feature] = newValue
  
  // Save to localStorage for persistence
  if (typeof window !== 'undefined') {
    const current = JSON.parse(localStorage.getItem('unpuzzle-feature-overrides') || '{}')
    current[feature] = newValue
    localStorage.setItem('unpuzzle-feature-overrides', JSON.stringify(current))
  }
  
  // Log the change
  console.log(`Feature ${feature} is now ${newValue ? 'enabled' : 'disabled'}`)
  
  // Reload the page to apply changes
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

// Export for console debugging
if (typeof window !== 'undefined') {
  (window as any).UNPUZZLE_FEATURES = {
    flags: FEATURE_FLAGS,
    toggle: toggleFeature,
    status: getDataSourceLabel
  }
}
// Feature flag system for gradual backend integration
// Allows safe switching between mock and real data sources

export interface FeatureFlags {
  // Course data source flags
  USE_REAL_COURSES_DATA: boolean
  USE_REAL_COURSE_CREATION: boolean
  USE_REAL_COURSE_UPDATES: boolean
  USE_REAL_COURSE_DELETION: boolean
  
  // Analytics data source flags  
  USE_REAL_ANALYTICS: boolean
  USE_REAL_STUDENT_DATA: boolean
  
  // AI and other service flags
  USE_REAL_AI_SERVICE: boolean
  USE_REAL_VIDEO_PROCESSING: boolean
  
  // Safety and fallback flags
  FALLBACK_TO_MOCK_ON_ERROR: boolean
  ENABLE_DATA_VALIDATION: boolean
  LOG_DATA_SOURCE_SWITCHES: boolean
  
  // Development and debugging flags
  SHOW_DATA_SOURCE_INDICATOR: boolean
  ENABLE_PERFORMANCE_MONITORING: boolean
  ENABLE_ERROR_BOUNDARIES: boolean
}

// Environment-based feature flag configuration
const getEnvironmentFlags = (): FeatureFlags => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'
  
  return {
    // Course data flags - Start with false, enable one by one
    USE_REAL_COURSES_DATA: process.env.NEXT_PUBLIC_USE_REAL_COURSES === 'true',
    USE_REAL_COURSE_CREATION: process.env.NEXT_PUBLIC_USE_REAL_COURSE_CREATION === 'true',
    USE_REAL_COURSE_UPDATES: process.env.NEXT_PUBLIC_USE_REAL_COURSE_UPDATES === 'true', 
    USE_REAL_COURSE_DELETION: process.env.NEXT_PUBLIC_USE_REAL_COURSE_DELETION === 'true',
    
    // Analytics flags
    USE_REAL_ANALYTICS: process.env.NEXT_PUBLIC_USE_REAL_ANALYTICS === 'true',
    USE_REAL_STUDENT_DATA: process.env.NEXT_PUBLIC_USE_REAL_STUDENT_DATA === 'true',
    
    // Service flags  
    USE_REAL_AI_SERVICE: process.env.NEXT_PUBLIC_USE_REAL_AI === 'true',
    USE_REAL_VIDEO_PROCESSING: process.env.NEXT_PUBLIC_USE_REAL_VIDEO === 'true',
    
    // Safety flags - Always enabled for safety
    FALLBACK_TO_MOCK_ON_ERROR: true,
    ENABLE_DATA_VALIDATION: true,
    LOG_DATA_SOURCE_SWITCHES: isDevelopment,
    
    // Development flags
    SHOW_DATA_SOURCE_INDICATOR: isDevelopment && process.env.NEXT_PUBLIC_SHOW_DATA_SOURCE === 'true',
    ENABLE_PERFORMANCE_MONITORING: isDevelopment,
    ENABLE_ERROR_BOUNDARIES: !isProduction, // Always enabled except in production
  }
}

// Export the current feature flags
export const FEATURES = getEnvironmentFlags()

// Helper functions for common feature flag checks
export const useRealData = (feature: keyof FeatureFlags): boolean => {
  return FEATURES[feature] === true
}

export const shouldFallbackToMock = (): boolean => {
  return FEATURES.FALLBACK_TO_MOCK_ON_ERROR
}

export const isDataValidationEnabled = (): boolean => {
  return FEATURES.ENABLE_DATA_VALIDATION
}

// Logging utility for data source switches
export const logDataSourceSwitch = (
  component: string, 
  dataType: string, 
  source: 'mock' | 'api' | 'fallback',
  reason?: string
) => {
  if (!FEATURES.LOG_DATA_SOURCE_SWITCHES) return
  
  const logData = {
    timestamp: new Date().toISOString(),
    component,
    dataType,
    source,
    reason
  }
  
  console.info(`[DATA_SOURCE_SWITCH]`, logData)
}

// Performance monitoring utility
export const logPerformanceMetric = (
  operation: string,
  duration: number,
  dataSource: 'mock' | 'api',
  recordCount?: number
) => {
  if (!FEATURES.ENABLE_PERFORMANCE_MONITORING) return
  
  const logData = {
    timestamp: new Date().toISOString(),
    operation,
    duration,
    dataSource,
    recordCount
  }
  
  console.info(`[PERFORMANCE]`, logData)
}

// Validation utility for ensuring data format consistency
export const validateDataFormat = (
  data: any,
  expectedFormat: string,
  source: 'mock' | 'api'
): boolean => {
  if (!FEATURES.ENABLE_DATA_VALIDATION) return true
  
  try {
    // Add specific validation logic here based on expectedFormat
    if (expectedFormat === 'course' && Array.isArray(data)) {
      return data.every(item => 
        typeof item === 'object' && 
        'id' in item && 
        'title' in item &&
        'status' in item
      )
    }
    
    return true
  } catch (error) {
    console.warn(`[VALIDATION_ERROR] Failed to validate ${expectedFormat} from ${source}:`, error)
    return false
  }
}

// Development helper function to get data source indicator text
export const getDataSourceIndicatorText = (
  feature: keyof FeatureFlags,
  dataType: string
): string | null => {
  if (!FEATURES.SHOW_DATA_SOURCE_INDICATOR) return null
  
  const isUsingRealData = FEATURES[feature]
  return `${dataType}: ${isUsingRealData ? 'API' : 'MOCK'}`
}

// Helper to get human-readable feature status for debugging
export const getFeatureFlagStatus = (): Record<string, boolean> => {
  return Object.entries(FEATURES).reduce((acc, [key, value]) => {
    acc[key] = value
    return acc
  }, {} as Record<string, boolean>)
}

// Environment variable documentation
export const FEATURE_FLAG_ENV_DOCS = `
# Feature Flag Environment Variables
# Add these to your .env.local file to control backend integration

# Course Management (Phase 1)
NEXT_PUBLIC_USE_REAL_COURSES=false
NEXT_PUBLIC_USE_REAL_COURSE_CREATION=false  
NEXT_PUBLIC_USE_REAL_COURSE_UPDATES=false
NEXT_PUBLIC_USE_REAL_COURSE_DELETION=false

# Analytics (Phase 2)
NEXT_PUBLIC_USE_REAL_ANALYTICS=false
NEXT_PUBLIC_USE_REAL_STUDENT_DATA=false

# Services (Phase 3)
NEXT_PUBLIC_USE_REAL_AI=false
NEXT_PUBLIC_USE_REAL_VIDEO=false

# Development Helpers
NEXT_PUBLIC_SHOW_DATA_SOURCE=true

# Set to 'true' to enable each feature gradually
`
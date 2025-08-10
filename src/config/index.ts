/**
 * Configuration Index
 * 
 * Central export point for all configuration modules.
 * Import from '@/config' to access all configuration.
 */

// Environment configuration
export * from './env'

// Application constants
export * from './constants'

// Re-export commonly used values for convenience
export { 
  isDevelopment, 
  isProduction, 
  isBrowser, 
  isServer,
  config 
} from './env'

export { 
  CONSTANTS,
  UI,
  VIDEO,
  AI,
  METRICS,
  ERROR,
  API,
  VALIDATION,
  FILE_UPLOAD,
  PAGINATION,
  STORAGE_KEYS,
  INTERVALS
} from './constants'
/**
 * Environment Configuration
 * 
 * This file safely exposes environment variables to the client-side code.
 * Only non-sensitive, public configuration should be exposed here.
 * 
 * DO NOT expose any secrets, API keys, or sensitive data in this file.
 */

// Safe environment checks
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isProduction = process.env.NODE_ENV === 'production'
export const isTest = process.env.NODE_ENV === 'test'

// Public configuration that's safe to expose to client
export const env = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  isDevelopment,
  isProduction,
  isTest,
  
  // Public API endpoints (these would be public anyway)
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  
  // Feature flags (safe to expose)
  ENABLE_AI_FEATURES: process.env.NEXT_PUBLIC_ENABLE_AI_FEATURES !== 'false',
  ENABLE_DEBUG_MODE: isDevelopment && process.env.NEXT_PUBLIC_DEBUG !== 'false',
  
  // Public app configuration
  APP_NAME: 'Unpuzzle',
  APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Limits and thresholds (safe to expose)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_CHAT_MESSAGE_LENGTH: 1000,
  MAX_ERROR_LOG_SIZE: 100,
  
  // Timeouts and delays
  DEFAULT_DEBOUNCE_DELAY: 300,
  API_TIMEOUT: 30000, // 30 seconds
  RETRY_DELAY: 1000,
  MAX_RETRIES: 3,
} as const

// Type-safe environment configuration
export type EnvConfig = typeof env

// Validate critical environment variables on startup
export function validateEnv(): void {
  if (typeof window === 'undefined') {
    // Server-side validation
    const required = ['NODE_ENV']
    const missing = required.filter(key => !process.env[key])
    
    if (missing.length > 0) {
      console.warn(`Missing environment variables: ${missing.join(', ')}`)
    }
  }
}

// Helper to check if we're in a browser environment
export const isBrowser = typeof window !== 'undefined'

// Helper to check if we're in a server environment  
export const isServer = !isBrowser

// Export a frozen config object to prevent modifications
export const config = Object.freeze(env)
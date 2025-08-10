/**
 * Application Constants
 * 
 * Centralized configuration for all magic numbers and hardcoded values.
 * This makes the application easier to maintain and configure.
 */

// UI Configuration
export const UI = {
  SIDEBAR: {
    DEFAULT_WIDTH: 384,
    MIN_WIDTH: 300,
    MAX_WIDTH: 600,
  },
  MODAL: {
    DEFAULT_WIDTH: 500,
    MAX_WIDTH: 800,
  },
  TOAST: {
    DURATION: 4000,
    MAX_VISIBLE: 3,
  },
  ANIMATION: {
    DURATION: 200,
    EASING: 'ease-in-out',
  },
} as const

// Video Player Configuration
export const VIDEO = {
  SEEK_SECONDS: 10,
  VOLUME_STEP: 0.1,
  PLAYBACK_RATES: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
  DEFAULT_PLAYBACK_RATE: 1,
  MIN_PLAYBACK_RATE: 0.25,
  MAX_PLAYBACK_RATE: 4,
  KEYBOARD_SHORTCUTS: {
    PLAY_PAUSE: ' ',
    SEEK_FORWARD: 'ArrowRight',
    SEEK_BACKWARD: 'ArrowLeft',
    VOLUME_UP: 'ArrowUp',
    VOLUME_DOWN: 'ArrowDown',
    FULLSCREEN: 'f',
    MUTE: 'm',
  },
} as const

// AI Configuration
export const AI = {
  INTERACTIONS: {
    FREE_TIER_LIMIT: 10,
    PRO_TIER_LIMIT: 100,
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    RATE_LIMIT_MAX: 5,
  },
  CHAT: {
    MAX_MESSAGE_LENGTH: 1000,
    MIN_MESSAGE_LENGTH: 1,
    MAX_HISTORY: 50,
    TYPING_INDICATOR_DELAY: 500,
  },
  RESPONSE: {
    MIN_DELAY: 500,
    MAX_DELAY: 2000,
    TIMEOUT: 30000,
  },
} as const

// Learning Metrics Configuration
export const METRICS = {
  LEARN_RATE: {
    POOR: 20,
    AVERAGE: 35,
    GOOD: 50,
    EXCELLENT: 65,
  },
  EXECUTION_RATE: {
    POOR: 60,
    AVERAGE: 75,
    GOOD: 85,
    EXCELLENT: 95,
  },
  UPDATE_INTERVAL: 5000, // 5 seconds
} as const

// Error Handling Configuration
export const ERROR = {
  LOG_MAX_SIZE: 100,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  RETRY_BACKOFF_MULTIPLIER: 2,
  TOAST_DURATION: 5000,
} as const

// API Configuration
export const API = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CACHE_DURATION: 300000, // 5 minutes
  DEBOUNCE_DELAY: 300,
} as const

// Validation Rules
export const VALIDATION = {
  EMAIL: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 255,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
} as const

// File Upload Configuration
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
} as const

// Pagination Configuration
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const

// Local Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'unpuzzle_preferences',
  AUTH_TOKEN: 'unpuzzle_auth_token',
  RECENT_SEARCHES: 'unpuzzle_recent_searches',
  DRAFT_REFLECTION: 'unpuzzle_draft_reflection',
} as const

// Time Intervals
export const INTERVALS = {
  AUTO_SAVE: 30000, // 30 seconds
  SESSION_CHECK: 60000, // 1 minute
  METRICS_UPDATE: 5000, // 5 seconds
  HEARTBEAT: 15000, // 15 seconds
} as const

// Export all constants as a single frozen object
export const CONSTANTS = Object.freeze({
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
  INTERVALS,
} as const)

// Type exports for TypeScript
export type UIConfig = typeof UI
export type VideoConfig = typeof VIDEO
export type AIConfig = typeof AI
export type MetricsConfig = typeof METRICS
export type ErrorConfig = typeof ERROR
export type APIConfig = typeof API
export type ValidationConfig = typeof VALIDATION
export type FileUploadConfig = typeof FILE_UPLOAD
export type PaginationConfig = typeof PAGINATION
export type StorageKeys = typeof STORAGE_KEYS
export type IntervalsConfig = typeof INTERVALS
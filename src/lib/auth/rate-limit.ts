import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

interface RateLimitEntry {
  count: number
  windowStart: number
}

// In-memory store (for production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Simple in-memory rate limiter
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  // Get client IP (fallback to a default for localhost)
  const clientIp = 
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    request.ip ||
    'localhost'

  const key = `rate_limit:${clientIp}`
  const now = Date.now()
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs

  const existing = rateLimitStore.get(key)

  if (!existing || existing.windowStart < windowStart) {
    // New window or first request
    rateLimitStore.set(key, {
      count: 1,
      windowStart
    })
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: windowStart + config.windowMs
    }
  }

  if (existing.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: windowStart + config.windowMs
    }
  }

  // Increment count
  existing.count++
  rateLimitStore.set(key, existing)

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetTime: windowStart + config.windowMs
  }
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now()
  const fiveMinutesAgo = now - (5 * 60 * 1000)

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.windowStart < fiveMinutesAgo) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
  // 10 uploads per hour per IP
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10
  },
  // 50 deletes per hour per IP (more lenient)
  delete: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50
  },
  // General API rate limit
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }
} as const

// Clean up expired entries every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
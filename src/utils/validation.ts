/**
 * Input Validation and Sanitization Utilities
 * 
 * Provides comprehensive validation and sanitization for user inputs
 * to prevent XSS, SQL injection, and other security vulnerabilities.
 */

import { VALIDATION, AI } from '@/config/constants'

// Type definitions
export interface ValidationResult {
  isValid: boolean
  sanitized: string
  errors: string[]
}

export interface ValidationOptions {
  minLength?: number
  maxLength?: number
  allowHtml?: boolean
  allowUrls?: boolean
  allowEmails?: boolean
  customPattern?: RegExp
}

/**
 * Sanitize HTML input to prevent XSS attacks
 * Removes all HTML tags and dangerous characters
 */
export function sanitizeHtml(input: string): string {
  if (!input) return ''
  
  // Remove all HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')
  
  // Escape dangerous characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
  
  return sanitized.trim()
}

/**
 * Validate and sanitize chat messages
 */
export function validateChatMessage(message: string): ValidationResult {
  const errors: string[] = []
  let sanitized = message.trim()
  
  // Check length
  if (!sanitized || sanitized.length < AI.CHAT.MIN_MESSAGE_LENGTH) {
    errors.push('Message is too short')
    return { isValid: false, sanitized: '', errors }
  }
  
  if (sanitized.length > AI.CHAT.MAX_MESSAGE_LENGTH) {
    errors.push(`Message exceeds ${AI.CHAT.MAX_MESSAGE_LENGTH} characters`)
    return { isValid: false, sanitized, errors }
  }
  
  // Sanitize HTML to prevent XSS
  sanitized = sanitizeHtml(sanitized)
  
  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(-{2}|\/\*|\*\/)/g, // SQL comments
    /(;|\||&&)/g, // Command chaining
  ]
  
  for (const pattern of sqlPatterns) {
    if (pattern.test(sanitized)) {
      errors.push('Message contains potentially dangerous patterns')
      return { isValid: false, sanitized, errors }
    }
  }
  
  // Check for script injection
  const scriptPatterns = [
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<script/gi,
    /eval\(/gi,
    /document\./gi,
    /window\./gi,
  ]
  
  for (const pattern of scriptPatterns) {
    if (pattern.test(sanitized)) {
      errors.push('Message contains potentially dangerous scripts')
      return { isValid: false, sanitized, errors }
    }
  }
  
  return { isValid: true, sanitized, errors }
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = []
  const sanitized = email.trim().toLowerCase()
  
  if (!sanitized) {
    errors.push('Email is required')
    return { isValid: false, sanitized: '', errors }
  }
  
  if (sanitized.length < VALIDATION.EMAIL.MIN_LENGTH) {
    errors.push('Email is too short')
    return { isValid: false, sanitized, errors }
  }
  
  if (sanitized.length > VALIDATION.EMAIL.MAX_LENGTH) {
    errors.push('Email is too long')
    return { isValid: false, sanitized, errors }
  }
  
  if (!VALIDATION.EMAIL.PATTERN.test(sanitized)) {
    errors.push('Invalid email format')
    return { isValid: false, sanitized, errors }
  }
  
  return { isValid: true, sanitized, errors }
}

/**
 * Validate username
 */
export function validateUsername(username: string): ValidationResult {
  const errors: string[] = []
  const sanitized = username.trim()
  
  if (!sanitized) {
    errors.push('Username is required')
    return { isValid: false, sanitized: '', errors }
  }
  
  if (sanitized.length < VALIDATION.USERNAME.MIN_LENGTH) {
    errors.push(`Username must be at least ${VALIDATION.USERNAME.MIN_LENGTH} characters`)
    return { isValid: false, sanitized, errors }
  }
  
  if (sanitized.length > VALIDATION.USERNAME.MAX_LENGTH) {
    errors.push(`Username must not exceed ${VALIDATION.USERNAME.MAX_LENGTH} characters`)
    return { isValid: false, sanitized, errors }
  }
  
  if (!VALIDATION.USERNAME.PATTERN.test(sanitized)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens')
    return { isValid: false, sanitized, errors }
  }
  
  return { isValid: true, sanitized, errors }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = []
  
  if (!password) {
    errors.push('Password is required')
    return { isValid: false, sanitized: '', errors }
  }
  
  if (password.length < VALIDATION.PASSWORD.MIN_LENGTH) {
    errors.push(`Password must be at least ${VALIDATION.PASSWORD.MIN_LENGTH} characters`)
  }
  
  if (password.length > VALIDATION.PASSWORD.MAX_LENGTH) {
    errors.push(`Password must not exceed ${VALIDATION.PASSWORD.MAX_LENGTH} characters`)
  }
  
  if (VALIDATION.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (VALIDATION.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (VALIDATION.PASSWORD.REQUIRE_NUMBER && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (VALIDATION.PASSWORD.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return { 
    isValid: errors.length === 0, 
    sanitized: password, // Never modify passwords
    errors 
  }
}

/**
 * Validate generic text input
 */
export function validateTextInput(
  input: string, 
  options: ValidationOptions = {}
): ValidationResult {
  const errors: string[] = []
  let sanitized = input.trim()
  
  const {
    minLength = 0,
    maxLength = 1000,
    allowHtml = false,
    allowUrls = false,
    allowEmails = false,
    customPattern
  } = options
  
  if (!sanitized && minLength > 0) {
    errors.push('Input is required')
    return { isValid: false, sanitized: '', errors }
  }
  
  if (sanitized.length < minLength) {
    errors.push(`Input must be at least ${minLength} characters`)
    return { isValid: false, sanitized, errors }
  }
  
  if (sanitized.length > maxLength) {
    errors.push(`Input must not exceed ${maxLength} characters`)
    return { isValid: false, sanitized, errors }
  }
  
  // Sanitize HTML unless explicitly allowed
  if (!allowHtml) {
    sanitized = sanitizeHtml(sanitized)
  }
  
  // Check for URLs if not allowed
  if (!allowUrls) {
    const urlPattern = /https?:\/\/[^\s]+/gi
    if (urlPattern.test(sanitized)) {
      errors.push('URLs are not allowed')
      return { isValid: false, sanitized, errors }
    }
  }
  
  // Check for emails if not allowed
  if (!allowEmails) {
    const emailPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/gi
    if (emailPattern.test(sanitized)) {
      errors.push('Email addresses are not allowed')
      return { isValid: false, sanitized, errors }
    }
  }
  
  // Apply custom pattern if provided
  if (customPattern && !customPattern.test(sanitized)) {
    errors.push('Input format is invalid')
    return { isValid: false, sanitized, errors }
  }
  
  return { isValid: true, sanitized, errors }
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File): ValidationResult {
  const errors: string[] = []
  
  if (!file) {
    errors.push('File is required')
    return { isValid: false, sanitized: '', errors }
  }
  
  // Check file size
  if (file.size > FILE_UPLOAD.MAX_SIZE) {
    const maxSizeMB = FILE_UPLOAD.MAX_SIZE / (1024 * 1024)
    errors.push(`File size exceeds ${maxSizeMB}MB`)
    return { isValid: false, sanitized: file.name, errors }
  }
  
  // Check file type
  const allowedTypes = FILE_UPLOAD.ALLOWED_TYPES as readonly string[]
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type is not allowed')
    return { isValid: false, sanitized: file.name, errors }
  }
  
  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  const allowedExtensions = FILE_UPLOAD.ALLOWED_EXTENSIONS as readonly string[]
  if (!allowedExtensions.includes(extension)) {
    errors.push('File extension is not allowed')
    return { isValid: false, sanitized: file.name, errors }
  }
  
  // Sanitize filename
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
  
  return { isValid: true, sanitized: sanitizedName, errors }
}

/**
 * Validate URL
 */
export function validateUrl(url: string): ValidationResult {
  const errors: string[] = []
  const sanitized = url.trim()
  
  if (!sanitized) {
    errors.push('URL is required')
    return { isValid: false, sanitized: '', errors }
  }
  
  try {
    const urlObj = new URL(sanitized)
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('Only HTTP and HTTPS URLs are allowed')
      return { isValid: false, sanitized, errors }
    }
    
    // Check for localhost in production
    if (process.env.NODE_ENV === 'production' && 
        (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
      errors.push('Localhost URLs are not allowed')
      return { isValid: false, sanitized, errors }
    }
    
    return { isValid: true, sanitized: urlObj.toString(), errors }
  } catch (err) {
    errors.push('Invalid URL format')
    return { isValid: false, sanitized, errors }
  }
}

/**
 * Sanitize JSON input
 */
export function sanitizeJson(input: string): ValidationResult {
  const errors: string[] = []
  
  try {
    const parsed = JSON.parse(input)
    const sanitized = JSON.stringify(parsed)
    return { isValid: true, sanitized, errors }
  } catch (err) {
    errors.push('Invalid JSON format')
    return { isValid: false, sanitized: input, errors }
  }
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(identifier) || []
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs)
    
    if (validAttempts.length >= this.maxAttempts) {
      return false
    }
    
    // Add current attempt
    validAttempts.push(now)
    this.attempts.set(identifier, validAttempts)
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup()
    }
    
    return true
  }
  
  private cleanup(): void {
    const now = Date.now()
    for (const [key, attempts] of this.attempts.entries()) {
      const validAttempts = attempts.filter(time => now - time < this.windowMs)
      if (validAttempts.length === 0) {
        this.attempts.delete(key)
      } else {
        this.attempts.set(key, validAttempts)
      }
    }
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier)
  }
  
  resetAll(): void {
    this.attempts.clear()
  }
}

// Export a default rate limiter instance
export const defaultRateLimiter = new RateLimiter(
  AI.INTERACTIONS.RATE_LIMIT_MAX,
  AI.INTERACTIONS.RATE_LIMIT_WINDOW
)

// Import missing constant
import { FILE_UPLOAD } from '@/config/constants'
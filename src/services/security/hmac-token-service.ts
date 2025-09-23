/**
 * HMAC Token Service for CDN Authentication
 * Generates and validates HMAC tokens for secure video access
 */

import crypto from 'crypto'

interface TokenOptions {
  includeIp?: string | null
  expirationHours?: number
}

interface TokenValidation {
  valid: boolean
  error?: string
}

/**
 * Generate an HMAC token for secure file access
 * @param filePath - The file path to protect (e.g., /videos/lesson1.mp4)
 * @param secret - The secret key for HMAC signing
 * @param options - Optional parameters like IP binding and expiration
 * @returns HMAC token string
 */
export function generateHMACToken(
  filePath: string,
  secret: string,
  options: TokenOptions = {}
): string {
  const { includeIp = null, expirationHours = 6 } = options

  // Generate timestamp
  const timestamp = Date.now().toString()

  // Optionally include IP address (base64 encoded without padding)
  const ipPart = includeIp
    ? '.' + Buffer.from(includeIp).toString('base64').replace(/=/g, '')
    : ''

  // Create the message to sign
  const message = `${timestamp}.${filePath}${ipPart}`

  // Generate HMAC signature
  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64')
    .replace(/\+/g, '-')  // URL-safe base64
    .replace(/\//g, '_')  // URL-safe base64
    .replace(/=/g, '')    // Remove padding

  // Return token: timestamp.signature[.ip]
  return `${timestamp}.${signature}${ipPart}`
}

/**
 * Validate an HMAC token
 * @param token - The token to validate
 * @param filePath - The file path being accessed
 * @param secret - The secret key for HMAC validation
 * @param clientIp - Optional client IP for validation
 * @returns Validation result
 */
export async function validateHMACToken(
  token: string,
  filePath: string,
  secret: string,
  clientIp: string | null = null
): Promise<TokenValidation> {
  try {
    // Parse token components
    const parts = token.split('.')
    if (parts.length < 2) {
      return { valid: false, error: 'Invalid token format' }
    }

    const [tokenTimestamp, tokenSignature, tokenIp] = parts

    // Check token age (default 6 hours)
    const maxAge = 6 * 60 * 60 * 1000
    const tokenAge = Date.now() - parseInt(tokenTimestamp)
    if (tokenAge > maxAge) {
      return { valid: false, error: 'Token expired' }
    }

    // Verify IP if included in token
    if (tokenIp && clientIp) {
      const expectedIp = Buffer.from(clientIp).toString('base64').replace(/=/g, '')
      if (tokenIp !== expectedIp) {
        return { valid: false, error: 'IP mismatch' }
      }
    }

    // Recreate the message
    const message = `${tokenTimestamp}.${filePath}${tokenIp ? '.' + tokenIp : ''}`

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    // Compare signatures
    if (tokenSignature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    }
  }
}

/**
 * Generate a CDN URL with HMAC token
 * @param cdnBaseUrl - The CDN base URL (e.g., https://cdn.unpuzzle.co)
 * @param filePath - The file path
 * @param secret - The secret key for HMAC signing
 * @param options - Token options
 * @returns Complete CDN URL with token
 */
export function generateCDNUrlWithToken(
  cdnBaseUrl: string,
  filePath: string,
  secret: string,
  options: TokenOptions = {}
): string {
  const token = generateHMACToken(filePath, secret, options)

  // Ensure filePath starts with /
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`

  // Build CDN URL with token
  return `${cdnBaseUrl}${normalizedPath}?token=${token}`
}

/**
 * Extract file path from private URL format
 * @param privateUrl - Format: "private:fileId:fileName"
 * @returns The file name/path
 */
export function extractFilePathFromPrivateUrl(privateUrl: string): string {
  const parts = privateUrl.split(':')
  if (parts.length !== 3 || parts[0] !== 'private') {
    throw new Error('Invalid private URL format')
  }

  // Return the fileName part
  const fileName = parts[2]
  return fileName.startsWith('/') ? fileName : `/${fileName}`
}
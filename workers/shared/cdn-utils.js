/**
 * CDN HMAC Token Utilities for Workers
 * Shared utilities for generating HMAC tokens and CDN URLs
 *
 * Note: This is the CommonJS version for workers.
 * Frontend code should use src/services/security/hmac-token-service.ts
 */

const crypto = require('crypto')

/**
 * Extract file path from private URL format
 * @param {string} privateUrl - Format: "private:fileId:fileName"
 * @returns {string} The file name/path
 */
function extractFilePathFromPrivateUrl(privateUrl) {
  const parts = privateUrl.split(':')
  if (parts.length !== 3 || parts[0] !== 'private') {
    throw new Error('Invalid private URL format')
  }

  const fileName = parts[2]
  return fileName.startsWith('/') ? fileName : `/${fileName}`
}

/**
 * Generate an HMAC token for secure file access
 * @param {string} filePath - The file path to protect
 * @param {string} secret - The secret key for HMAC signing
 * @returns {string} HMAC token string
 */
function generateHMACToken(filePath, secret) {
  const timestamp = Date.now().toString()
  const message = `${timestamp}.${filePath}`

  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64')
    .replace(/\+/g, '-')  // URL-safe base64
    .replace(/\//g, '_')  // URL-safe base64
    .replace(/=/g, '')    // Remove padding

  return `${timestamp}.${signature}`
}

/**
 * Generate a CDN URL with HMAC token
 * @param {string} cdnBaseUrl - The CDN base URL (e.g., https://cdn.unpuzzle.co)
 * @param {string} filePath - The file path
 * @param {string} secret - The secret key for HMAC signing
 * @returns {string} Complete CDN URL with token
 */
function generateCDNUrlWithToken(cdnBaseUrl, filePath, secret) {
  // Ensure filePath starts with /
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`

  // URL-encode the path to handle spaces and special characters
  const pathParts = normalizedPath.split('/')
  const encodedPath = pathParts.map((part, index) =>
    index === 0 ? part : encodeURIComponent(part)
  ).join('/')

  // Generate token for the encoded path
  const token = generateHMACToken(encodedPath, secret)

  // Build CDN URL with the encoded path and token
  return `${cdnBaseUrl}${encodedPath}?token=${token}`
}

/**
 * Generate CDN URL from private URL
 * @param {string} privateUrl - Format: "private:fileId:fileName"
 * @param {string} cdnBaseUrl - The CDN base URL
 * @param {string} secret - The secret key for HMAC signing
 * @returns {string} Complete CDN URL with token
 */
function generateCDNUrlFromPrivateUrl(privateUrl, cdnBaseUrl, secret) {
  const filePath = extractFilePathFromPrivateUrl(privateUrl)
  return generateCDNUrlWithToken(cdnBaseUrl, filePath, secret)
}

module.exports = {
  extractFilePathFromPrivateUrl,
  generateHMACToken,
  generateCDNUrlWithToken,
  generateCDNUrlFromPrivateUrl
}

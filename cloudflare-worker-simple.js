/**
 * Simplified Cloudflare Worker for PUBLIC Backblaze buckets
 * Only use this if you make your Backblaze bucket public
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Handle root path
    if (url.pathname === '/' || url.pathname === '') {
      return new Response('CDN Worker Active - Simple Mode for Public Bucket', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    try {
      // Get the token from query parameters
      const token = url.searchParams.get('token')

      if (!token) {
        return new Response('Unauthorized: Token required', {
          status: 401,
          headers: { 'Content-Type': 'text/plain' }
        })
      }

      // Validate HMAC token
      const isValid = await validateToken(token, url.pathname, env.CDN_AUTH_SECRET)

      if (!isValid) {
        return new Response('Unauthorized: Invalid token', {
          status: 401,
          headers: { 'Content-Type': 'text/plain' }
        })
      }

      // For PUBLIC bucket - just proxy without authorization
      const fileName = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname
      const bucketName = env.BACKBLAZE_BUCKET_NAME || 'unpuzzle-mvp'
      const backblazeUrl = `https://f005.backblazeb2.com/file/${bucketName}/${fileName}`

      console.log('[CDN-WORKER] Proxying to public bucket:', backblazeUrl)

      // Fetch from Backblaze (no auth needed for public bucket)
      const response = await fetch(backblazeUrl, {
        method: 'GET',
        cf: {
          cacheTtl: 3600,
          cacheEverything: true,
          cacheKey: `https://cdn.unpuzzle.co${url.pathname}`
        }
      })

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
          'Content-Length': response.headers.get('Content-Length'),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'CDN-Cache-Status': response.cf?.cacheStatus || 'MISS'
        }
      })

    } catch (error) {
      console.error('[CDN-WORKER] Error:', error)
      return new Response('CDN Error: ' + error.message, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
  }
}

async function validateToken(token, filePath, secret) {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return false

    const [timestamp, signature] = parts

    // Check token age (6 hours max)
    const tokenAge = Date.now() - parseInt(timestamp)
    if (tokenAge > 6 * 60 * 60 * 1000) {
      console.log('[CDN-WORKER] Token expired')
      return false
    }

    // Create the message to validate
    const message = `${timestamp}.${filePath}`

    // Generate expected signature
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    return signature === expectedSignature

  } catch (error) {
    console.error('[CDN-WORKER] Token validation error:', error)
    return false
  }
}
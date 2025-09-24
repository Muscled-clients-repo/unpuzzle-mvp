/**
 * Debug Cloudflare Worker for cdn.unpuzzle.co
 * This version includes detailed logging to help debug token validation
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Handle root path
    if (url.pathname === '/' || url.pathname === '') {
      return new Response('CDN Worker Active - Debug Mode', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache'
        }
      })
    }

    try {
      // Get the token from query parameters
      const token = url.searchParams.get('token')
      const filePath = url.pathname // This is already URL-decoded by the browser

      console.log('[DEBUG] Request received:')
      console.log('  URL:', request.url)
      console.log('  Path (raw):', url.pathname)
      console.log('  Path (encoded):', encodeURI(url.pathname))
      console.log('  Token:', token ? token.substring(0, 20) + '...' : 'MISSING')

      if (!token) {
        return new Response('Unauthorized: Token required', {
          status: 401,
          headers: { 'Content-Type': 'text/plain' }
        })
      }

      // Parse token
      const tokenParts = token.split('.')
      const timestamp = tokenParts[0]
      const signature = tokenParts[1]

      console.log('[DEBUG] Token parts:')
      console.log('  Timestamp:', timestamp)
      console.log('  Signature:', signature ? signature.substring(0, 10) + '...' : 'MISSING')
      console.log('  Age:', Date.now() - parseInt(timestamp), 'ms')

      // Check CDN_AUTH_SECRET
      const secret = env.CDN_AUTH_SECRET
      console.log('[DEBUG] Secret configured:', secret ? 'YES' : 'NO')
      console.log('[DEBUG] Secret length:', secret ? secret.length : 0)

      // Try validation with different path formats
      const validationAttempts = [
        { path: filePath, description: 'Raw path' },
        { path: decodeURIComponent(filePath), description: 'Decoded path' },
        { path: filePath.split('/').map(part => encodeURIComponent(decodeURIComponent(part))).join('/'), description: 'Re-encoded path' }
      ]

      for (const attempt of validationAttempts) {
        console.log(`[DEBUG] Trying validation with ${attempt.description}: ${attempt.path}`)

        const message = `${timestamp}.${attempt.path}`
        console.log('[DEBUG] Message to sign:', message)

        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )

        const signatureBytes = await crypto.subtle.sign(
          'HMAC',
          key,
          encoder.encode(message)
        )

        const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '')

        console.log('[DEBUG] Expected signature:', expectedSignature.substring(0, 10) + '...')
        console.log('[DEBUG] Received signature:', signature.substring(0, 10) + '...')
        console.log('[DEBUG] Match:', expectedSignature === signature)

        if (expectedSignature === signature) {
          console.log('[DEBUG] ✅ Validation successful with', attempt.description)

          // Check token age
          const tokenAge = Date.now() - parseInt(timestamp)
          const maxAge = 6 * 60 * 60 * 1000 // 6 hours

          if (tokenAge > maxAge) {
            return new Response(`Token expired (age: ${Math.round(tokenAge / 1000 / 60)} minutes)`, {
              status: 401,
              headers: { 'Content-Type': 'text/plain' }
            })
          }

          // Success! Get Backblaze URL
          const fileName = filePath.startsWith('/') ? filePath.substring(1) : filePath
          const bucketName = env.BACKBLAZE_BUCKET_NAME || 'unpuzzle-mvp'

          // Try to get Backblaze auth token
          let backblazeUrl
          try {
            const authToken = await getBackblazeAuthToken(env)
            backblazeUrl = `https://f005.backblazeb2.com/file/${bucketName}/${fileName}?Authorization=${authToken}`
          } catch (error) {
            console.error('[DEBUG] Backblaze auth failed:', error)
            // Fallback to direct URL without auth (will work if bucket is public)
            backblazeUrl = `https://f005.backblazeb2.com/file/${bucketName}/${fileName}`
          }

          console.log('[DEBUG] Proxying to:', backblazeUrl)

          // Fetch from Backblaze
          const response = await fetch(backblazeUrl, {
            method: 'GET',
            cf: {
              cacheTtl: 3600,
              cacheEverything: true
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
              'Access-Control-Allow-Origin': '*'
            }
          })
        }
      }

      // If we get here, validation failed
      console.log('[DEBUG] ❌ All validation attempts failed')

      return new Response('Unauthorized: Invalid token (check Worker logs for details)', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' }
      })

    } catch (error) {
      console.error('[DEBUG] Error:', error)
      return new Response('CDN Error: ' + error.message, {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache'
        }
      })
    }
  }
}

async function getBackblazeAuthToken(env) {
  if (!env.BACKBLAZE_KEY_ID || !env.BACKBLAZE_APPLICATION_KEY) {
    throw new Error('Backblaze credentials not configured')
  }

  const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: {
      'Authorization': 'Basic ' + btoa(`${env.BACKBLAZE_KEY_ID}:${env.BACKBLAZE_APPLICATION_KEY}`)
    }
  })

  if (!authResponse.ok) {
    throw new Error('Backblaze authorization failed: ' + authResponse.statusText)
  }

  const authData = await authResponse.json()

  const downloadAuthResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_download_authorization`, {
    method: 'POST',
    headers: {
      'Authorization': authData.authorizationToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      bucketId: authData.allowed.bucketId,
      fileNamePrefix: '',
      validDurationInSeconds: 3600
    })
  })

  if (!downloadAuthResponse.ok) {
    throw new Error('Failed to get download authorization')
  }

  const downloadAuth = await downloadAuthResponse.json()
  return downloadAuth.authorizationToken
}
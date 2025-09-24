async function verifyHMACToken(token, secret, filePath, clientIp = null) {
  try {
    // Parse token components: timestamp.signature[.ip]
    const parts = token.split('.');
    if (parts.length < 2) return { valid: false, error: 'Invalid token format' };

    const [tokenTimestamp, tokenSignature, tokenIp] = parts;

    // Check token age (6 hours max)
    const maxAge = 6 * 60 * 60 * 1000;
    if (Date.now() - parseInt(tokenTimestamp) > maxAge) {
      return { valid: false, error: 'Token expired' };
    }

    // Verify IP if included in token
    if (tokenIp && clientIp && tokenIp !== btoa(clientIp).replace(/=/g, '')) {
      return { valid: false, error: 'IP mismatch' };
    }

    // Recreate signature
    const message = `${tokenTimestamp}.${filePath}${tokenIp ? '.' + tokenIp : ''}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return { valid: tokenSignature === expectedSignature };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

export default {
  async fetch(request, env, ctx) {
    const BUCKET_NAME = env?.BUCKET_NAME || "unpuzzle-mvp";
    const B2_DOMAIN = env?.B2_DOMAIN || "https://f005.backblazeb2.com";
    const AUTH_SECRET = env?.AUTH_SECRET; // Store in Cloudflare environment variables
    const REQUIRE_AUTH = env?.REQUIRE_AUTH !== "false"; // Default to true if AUTH_SECRET exists

    try {
      const url = new URL(request.url);
      const filePath = url.pathname;

      // ============ SECURITY CHECKS ============

      // Block root and directory requests
      if (!filePath || filePath === '/' || filePath === '/index.html' || filePath.endsWith('/')) {
        return new Response('Forbidden - Directory listing not allowed', {
          status: 403,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // Block path traversal attempts
      if (filePath.includes('../') || filePath.includes('..\\') || filePath.includes('%2e%2e')) {
        return new Response('Invalid path - Path traversal detected', {
          status: 400,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // Validate file extension (optional - customize allowed types)
      const allowedExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm3u8', 'ts', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
      const fileExtension = filePath.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        return new Response('Forbidden - File type not allowed', {
          status: 403,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // ============ TOKEN VERIFICATION ============

      if (REQUIRE_AUTH && AUTH_SECRET) {
        // Extract token from query params or authorization header
        const token = url.searchParams.get('token') ||
                     request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
          return new Response('Unauthorized - Missing token', {
            status: 401,
            headers: {
              'Content-Type': 'text/plain',
              'WWW-Authenticate': 'Bearer realm="Video Access"'
            }
          });
        }

        // Get client IP for validation
        const clientIp = request.headers.get('cf-connecting-ip') ||
                        request.headers.get('x-forwarded-for')?.split(',')[0];

        // Verify HMAC token
        const verificationResult = await verifyHMACToken(token, AUTH_SECRET, filePath, clientIp);

        if (!verificationResult.valid) {
          return new Response(`Unauthorized - ${verificationResult.error || 'Invalid token'}`, {
            status: 401,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      }

      // ============ CACHE KEY OPTIMIZATION ============

      // Create normalized cache key (removes auth tokens for better cache hits)
      // This is safe because we've already validated the token above
      const cacheUrl = new URL(request.url);
      cacheUrl.searchParams.delete('token'); // Remove token from cache key
      cacheUrl.searchParams.delete('ts'); // Remove timestamp if present
      const cacheKey = new Request(cacheUrl.toString(), request);

      // Check Cloudflare cache first
      const cache = caches.default;
      let response = await cache.match(cacheKey);

      if (response) {
        // Add cache hit header for debugging
        const headers = new Headers(response.headers);
        headers.set('CF-Cache-Status', 'HIT');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      }

      // ============ UPSTREAM REQUEST ============

      // Build B2 URL
      const b2Url = `${B2_DOMAIN}/file/${BUCKET_NAME}${filePath}`;

      // Prepare headers for upstream request
      const upstreamHeaders = new Headers();

      // ============ RANGE REQUEST SUPPORT ============
      // Critical for video seeking/scrubbing
      const rangeHeader = request.headers.get('range');
      if (rangeHeader) {
        upstreamHeaders.set('range', rangeHeader);
      }

      // Forward other important headers
      const acceptEncoding = request.headers.get('accept-encoding');
      if (acceptEncoding) {
        upstreamHeaders.set('accept-encoding', acceptEncoding);
      }

      // Make upstream request
      const upstreamResponse = await fetch(b2Url, {
        method: request.method,
        headers: upstreamHeaders,
        // Add timeout for large files
        signal: AbortSignal.timeout(30000) // 30 seconds
      });

      // ============ ERROR HANDLING ============

      if (!upstreamResponse.ok) {
        // Don't expose B2 internal errors
        if (upstreamResponse.status === 404) {
          return new Response('File not found', {
            status: 404,
            headers: { 'Content-Type': 'text/plain' }
          });
        }

        return new Response('Service unavailable', {
          status: 503,
          headers: {
            'Content-Type': 'text/plain',
            'Retry-After': '30'
          }
        });
      }

      // ============ RESPONSE HEADERS OPTIMIZATION ============

      const responseHeaders = new Headers(upstreamResponse.headers);

      // CORS configuration (customize as needed)
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'range');
      responseHeaders.set('Access-Control-Expose-Headers', 'content-length, content-range, accept-ranges');

      // Cache control based on content type
      const contentType = upstreamResponse.headers.get('content-type') || '';
      if (contentType.startsWith('video/')) {
        // Long cache for video files
        responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
        // Enable range requests
        responseHeaders.set('Accept-Ranges', 'bytes');
        // Add video-specific optimizations
        responseHeaders.set('X-Content-Type-Options', 'nosniff');
      } else if (contentType.startsWith('image/')) {
        // Long cache for images
        responseHeaders.set('Cache-Control', 'public, max-age=2592000, immutable');
      } else {
        // Shorter cache for other content
        responseHeaders.set('Cache-Control', 'public, max-age=3600');
      }

      // Security headers
      responseHeaders.set('X-Frame-Options', 'SAMEORIGIN');
      responseHeaders.set('X-XSS-Protection', '1; mode=block');

      // Add custom headers for debugging
      responseHeaders.set('CF-Cache-Status', 'MISS');
      responseHeaders.set('X-Worker-Version', '1.0.0');

      // ============ RESPONSE CREATION ============

      // Handle 206 Partial Content responses properly
      const status = upstreamResponse.status;
      const statusText = upstreamResponse.statusText;

      // Create response
      response = new Response(upstreamResponse.body, {
        status,
        statusText,
        headers: responseHeaders
      });

      // ============ CACHE STORAGE ============

      // Only cache successful responses
      if (status === 200 || status === 206) {
        // Clone response for caching (body can only be read once)
        const responseToCache = response.clone();

        // Store in cache (but don't wait for it)
        ctx.waitUntil(
          cache.put(cacheKey, responseToCache)
        );
      }

      // ============ CLOUDFLARE SPECIFIC OPTIONS ============

      // Apply Cloudflare-specific caching rules
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        cf: {
          // Cache everything including 206 responses
          cacheEverything: true,
          // Cache based on content type
          cacheTtl: contentType.startsWith('video/') ? 31536000 : 3600,
          // Cache even on error (for resilience)
          cacheTtlByStatus: {
            '200-299': 31536000, // Success: 1 year
            '404': 3600,         // Not found: 1 hour
            '500-599': 0         // Server errors: don't cache
          },
          // Polish images automatically
          polish: 'lossy',
          // Minify where applicable
          minify: {
            javascript: true,
            css: true,
            html: true
          }
        }
      });

    } catch (error) {
      // Log error (will appear in Cloudflare dashboard)
      console.error('Worker error:', error);

      // Return user-friendly error
      return new Response('Internal server error', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Retry-After': '60'
        }
      });
    }
  }
}

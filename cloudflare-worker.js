/**
 * Cloudflare Worker for cdn.unpuzzle.co
 * Proxies video requests to Backblaze B2 with caching
 *
 * Deploy this to Cloudflare Workers at cdn.unpuzzle.co subdomain
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Only handle file requests, let other requests pass through
    if (!url.pathname.startsWith('/file/')) {
      return new Response('CDN Worker Active - Use /file/bucket/filename for video requests', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache'
        }
      })
    }

    try {
      // Extract the path after /file/
      const filePath = url.pathname.substring('/file/'.length)

      // Get all query parameters (including Authorization)
      const queryString = url.search

      // Construct Backblaze B2 URL
      const backblazeUrl = `https://f005.backblazeb2.com/file/${filePath}${queryString}`

      console.log(`[CDN-WORKER] Proxying: ${url.pathname} -> ${backblazeUrl}`)

      // Fetch from Backblaze with caching
      const response = await fetch(backblazeUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        cf: {
          // Cache video content for 1 hour
          cacheTtl: 3600,
          cacheEverything: true,
          // Cache based on URL including query parameters (for signed URLs)
          cacheKey: request.url
        }
      })

      // Return response with cache headers
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...response.headers,
          // Add cache control headers
          'Cache-Control': 'public, max-age=3600',
          'CDN-Cache-Status': response.cf?.cacheStatus || 'MISS',
          'CDN-Worker': 'unpuzzle-video-proxy'
        }
      })

      return newResponse

    } catch (error) {
      console.error('[CDN-WORKER] Error:', error)

      return new Response('CDN Proxy Error: ' + error.message, {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache'
        }
      })
    }
  }
}
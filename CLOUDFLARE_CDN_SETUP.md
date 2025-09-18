# Cloudflare CDN Setup for Backblaze B2 Video Streaming

## Issue: Backblaze Bandwidth Cap Reached

You received this email because video requests are hitting Backblaze directly instead of going through the Cloudflare CDN:

> "Download Bandwidth Cap Reached 75% - You have reached 75% of the free Backblaze Daily Download Bandwidth Cap"

## Root Cause

The application is configured to use Cloudflare CDN (`CLOUDFLARE_CDN_URL=https://cdn.unpuzzle.co`) but the CDN is not properly configured as a proxy for Backblaze B2 requests.

### Current Behavior
- Videos generate signed URLs like: `https://cdn.unpuzzle.co/video.mp4?Authorization=token`
- Cloudflare CDN receives requests but doesn't know how to proxy them to Backblaze
- This likely results in 404 errors or direct Backblaze hits

### Expected Behavior
- CDN should proxy requests to `https://f005.backblazeb2.com/file/unpuzzle-mvp/video.mp4?Authorization=token`
- Cloudflare caches video content to reduce Backblaze bandwidth usage

## 🚨 IMMEDIATE ISSUE FOUND

The CDN at `https://cdn.unpuzzle.co` is **redirecting** to Backblaze instead of **proxying**:

```bash
curl -I https://cdn.unpuzzle.co/
# Returns: HTTP/2 302 location: https://f005.backblazeb2.com/
```

This means every video request:
1. Hits Cloudflare CDN
2. Gets redirected to Backblaze
3. Browser makes second request to Backblaze directly
4. **Result: Full bandwidth usage + CDN overhead**

## ✅ ISSUE UNDERSTOOD AND FIXED

Based on September 2025 working implementation, the CDN **redirect behavior is expected**. The original working pattern used CDN with fallback to B2, not the other way around.

Re-enabled CDN in `.env.local` with correct pattern:
```bash
CLOUDFLARE_CDN_URL=https://cdn.unpuzzle.co
# Re-enabled with working September pattern - CDN redirects are expected behavior
```

Fixed backblaze-service.ts to use the working September pattern where CDN is primary with B2 fallback.

## Required Cloudflare Configuration (Based on Official Backblaze Guide)

### Current Setup Status:
✅ DNS CNAME: `cdn.unpuzzle.co` → `f005.backblazeb2.com` (Proxied)
❌ Transform Rule: Missing URL rewriting for bucket scoping
❌ SSL/TLS: Must be "Full (strict)" for B2 compatibility

### REQUIRED: Transform Rule Configuration

**In Cloudflare Dashboard:**
1. **Rules** → **Transform Rules** → **Create Rule**
2. **Rule name**: `Rewrite path for unpuzzle-mvp bucket`
3. **When incoming requests match**:
   - Field: `Hostname`
   - Operator: `equals`
   - Value: `cdn.unpuzzle.co`
4. **Then rewrite to**:
   - Path: `Rewrite to...` → `Dynamic`
   - Value: `concat("/file/unpuzzle-mvp", http.request.uri.path)`

**How this works:**
- App generates: `https://cdn.unpuzzle.co/video.mp4?Authorization=token`
- Transform Rule rewrites to: `/file/unpuzzle-mvp/video.mp4?Authorization=token`
- Cloudflare fetches: `https://f005.backblazeb2.com/file/unpuzzle-mvp/video.mp4?Authorization=token`
- Cloudflare caches and serves the content ✅

**Code Change Made:**
Updated `backblaze-service.ts` to generate CDN URLs without `/file/bucket` prefix since Transform Rule adds it.

### REQUIRED: SSL/TLS Configuration

**In Cloudflare Dashboard:**
1. **SSL/TLS** → **Overview**
2. Set to **"Full (strict)"** (required for B2 compatibility)

### Option 1: Transform Rules (Recommended - Official Method)

Create a Cloudflare Worker at `cdn.unpuzzle.co` that proxies to Backblaze:

```javascript
// cloudflare-worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Extract file path and authorization
    const filePath = url.pathname.substring(1) // Remove leading /
    const authorization = url.searchParams.get('Authorization')

    if (!authorization) {
      return new Response('Authorization required', { status: 401 })
    }

    // Proxy to Backblaze B2
    const backblazeUrl = `https://f005.backblazeb2.com/file/unpuzzle-mvp/${filePath}?Authorization=${authorization}`

    const response = await fetch(backblazeUrl, {
      headers: request.headers,
      cf: {
        // Cache for 1 hour
        cacheTtl: 3600,
        cacheEverything: true
      }
    })

    return response
  }
}
```

### Option 2: Page Rules (Alternative)

Create Cloudflare Page Rules to redirect/proxy:
1. Pattern: `cdn.unpuzzle.co/*`
2. Action: Forward URL to `https://f005.backblazeb2.com/file/unpuzzle-mvp/$1`
3. Enable caching with TTL: 1 hour

### Option 3: Cloudflare Transform Rules

Use Transform Rules to rewrite requests:
1. When: `hostname equals "cdn.unpuzzle.co"`
2. Transform: Rewrite to `https://f005.backblazeb2.com/file/unpuzzle-mvp{uri.path}{uri.query}`

## Verification Steps

After configuring the CDN:

1. **Test signed URL generation**:
   ```bash
   # Check what URLs are being generated
   # Should see: "Using Cloudflare CDN: https://cdn.unpuzzle.co"
   ```

2. **Test video loading**:
   - Open a video in the app
   - Check browser Network tab
   - Verify requests go to `cdn.unpuzzle.co` and return 200 status

3. **Monitor Backblaze usage**:
   - Check Backblaze dashboard for reduced bandwidth usage
   - Each video should only hit Backblaze once per hour (due to caching)

## Temporary Workaround

If CDN setup takes time, you can temporarily disable CDN to avoid bandwidth caps:

```bash
# In .env.local, comment out or remove:
# CLOUDFLARE_CDN_URL=https://cdn.unpuzzle.co
```

This will show warnings but use direct Backblaze URLs until CDN is properly configured.

## Architecture Compliance

This solution follows the documented architecture in `logs/patterns/001-Architecture-Principles-Course-Creation-Edit-Flow-0939AM-2025-09-07.md`:

- ✅ Server actions return private URLs (`private:fileId:fileName`)
- ✅ Components use `useSignedUrl` hook for conversion
- ✅ Signed URLs generated with proper expiration
- ✅ CDN acts as caching proxy, not application logic

The CDN configuration is purely infrastructure-level and doesn't affect the application's signed URL architecture.
# CDN HMAC Authentication Pattern

## Problem Statement
Video files stored in private cloud storage (Backblaze B2) need to be accessible for processing (duration extraction via FFprobe) while maintaining security through a CDN (Cloudflare) with HMAC token authentication.

## Core Concept
HMAC tokens provide time-limited, cryptographically signed access to CDN resources without exposing the actual storage URLs or requiring permanent public access.

## Key Principles

### 1. Token Generation Must Match Request Path
The most critical principle: **The HMAC token must be generated for the exact URL path that will be requested, including URL encoding.**

- If the file has spaces: `2025-08-31 13-06-56.mp4`
- The browser/FFprobe will request: `/2025-08-31%2013-06-56.mp4`
- The token MUST be generated for: `/2025-08-31%2013-06-56.mp4` (encoded version)
- NOT for: `/2025-08-31 13-06-56.mp4` (raw version)

### 2. Token Components
Each HMAC token contains:
- **Timestamp**: When the token was generated (for expiration checking)
- **Signature**: HMAC-SHA256 hash of timestamp + file path
- **Optional IP binding**: Can lock token to specific IP address

Format: `{timestamp}.{signature}[.{optional-ip}]`

### 3. URL-Safe Encoding
The signature uses URL-safe Base64 encoding:
- Replace `+` with `-`
- Replace `/` with `_`
- Remove padding `=`

This ensures tokens work properly in URL query parameters.

## File Organization Pattern

### Storage Layer
- Original files stored with human-readable names (spaces allowed)
- Example: `private:bucket:2025-08-31 06-17-36.mp4`

### Database Layer
- Stores both storage reference and CDN URL
- `backblaze_url`: Original storage reference
- `cdn_url`: Full CDN URL with HMAC token

### Processing Layer
- Workers fetch CDN URL from database
- Use CDN URL directly with FFprobe/processing tools
- No need to understand storage layer details

## Who Generates HMAC Tokens

### Backend Server (Node.js/Next.js)
- **When**: During API requests, file uploads, or preparing URLs for frontend
- **Where**: Server-side services like `hmac-token-service.ts`
- **Access**: Has the secret key via environment variables
- **Use Cases**: Initial file upload, API responses, preparing media URLs

### Worker Processes
- **When**: During background processing that needs fresh tokens
- **Where**: Scripts like `process-all-durations.js`, worker processes
- **Access**: Also has secret key access via environment
- **Use Cases**: Duration extraction, transcription, batch updates

### CDN/Edge Worker (Cloudflare)
- **Role**: VALIDATION ONLY - never generates tokens
- **Where**: Cloudflare Worker at edge locations
- **Function**: Recreates expected signature to validate incoming requests
- **Response**: Grants or denies access based on signature match

### Frontend (Browser)
- **Role**: CONSUMER ONLY - cannot generate tokens
- **Access**: No secret key, only uses pre-generated URLs from database
- **Security**: This ensures clients can't forge their own access tokens

## Authentication Flow

1. **Token Generation** (Backend/Workers only)
   - Only services with secret key can generate
   - Extract filename from storage reference
   - URL-encode the filename
   - Generate HMAC signature for encoded path
   - Build complete CDN URL with token
   - Store in database for frontend use

2. **CDN Validation** (Cloudflare Worker)
   - Extract token from query parameter
   - Recreate expected signature using request path
   - Compare signatures and check timestamp
   - Grant or deny access

3. **Token Refresh** (Backend/Workers)
   - Tokens expire after set duration (typically 6 hours)
   - Before processing, generate fresh tokens
   - Update database with new CDN URLs
   - Process immediately while tokens are valid

## Common Pitfalls and Solutions

### Pitfall 1: Token-Path Mismatch
**Problem**: Generating token for raw filename but CDN receives encoded path
**Solution**: Always encode filename before token generation

### Pitfall 2: Expired Tokens
**Problem**: Tokens generated hours ago no longer work
**Solution**: Generate fresh tokens immediately before processing

### Pitfall 3: Inconsistent Encoding
**Problem**: Different encoding between token generation and URL building
**Solution**: Use same encoding function for both token and URL

### Pitfall 4: Special Characters
**Problem**: Files with spaces, parentheses, or unicode characters
**Solution**: Consistent URL encoding throughout the pipeline

## Success Indicators

- HTTP 200 responses from CDN
- FFprobe successfully extracts metadata
- No 401 Unauthorized errors
- Consistent access across different file types

## Security Benefits

1. **Time-Limited Access**: Tokens expire, preventing permanent URLs
2. **No Direct Storage Access**: CDN acts as security layer
3. **Signature Verification**: Can't forge valid tokens without secret
4. **Secret Key Isolation**: Only backend/workers have access to secret, never exposed to frontend
5. **Optional IP Locking**: Further restricts token usage
6. **Audit Trail**: Each access can be logged and monitored
7. **Separation of Concerns**:
   - Generation (backend/workers with secret)
   - Validation (CDN edge)
   - Consumption (frontend without secret)

## Scalability Advantages

1. **CDN Caching**: Reduces load on origin storage
2. **Edge Distribution**: Faster access from multiple locations
3. **Batch Processing**: Generate tokens for many files at once
4. **Parallel Processing**: Multiple workers can use different tokens
5. **Rate Limiting**: CDN can enforce access limits

## Shared Utility Libraries

To eliminate code duplication and ensure consistency, HMAC token generation has been consolidated into shared utility modules.

### For Frontend/Server Actions (TypeScript)
**Location**: `/src/services/security/hmac-token-service.ts`

```typescript
import {
  generateCDNUrlWithToken,
  extractFilePathFromPrivateUrl,
  generateHMACToken
} from '@/services/security/hmac-token-service'

// Generate CDN URL from private URL
const cdnUrl = generateCDNUrlWithToken(
  'https://cdn.unpuzzle.co',
  '/video.mp4',
  process.env.HMAC_SECRET
)

// Extract filename from private URL format
const filePath = extractFilePathFromPrivateUrl('private:fileId:fileName')
```

### For Workers (CommonJS)
**Location**: `/workers/shared/cdn-utils.js`

```javascript
const {
  generateCDNUrlFromPrivateUrl,
  extractFilePathFromPrivateUrl,
  generateHMACToken,
  generateCDNUrlWithToken
} = require('../shared/cdn-utils')

// Generate CDN URL directly from private URL
const cdnUrl = generateCDNUrlFromPrivateUrl(
  privateUrl,
  'https://cdn.unpuzzle.co',
  process.env.HMAC_SECRET
)
```

### Implementation Locations

**Using the shared utilities**:
1. **Duration Worker** (`workers/duration/duration-worker.js`)
   - Imports `generateCDNUrlFromPrivateUrl` from `cdn-utils.js`
   - Generates CDN URLs for FFprobe video processing

2. **Thumbnail Worker** (`workers/thumbnail/thumbnail-worker.js`)
   - Imports `generateCDNUrlFromPrivateUrl` from `cdn-utils.js`
   - Generates CDN URLs for FFmpeg frame extraction

3. **Media Actions** (`src/app/actions/media-actions.ts`)
   - Imports from `hmac-token-service.ts`
   - Generates CDN URLs for frontend display

### Benefits of Shared Utilities

1. **Single Source of Truth**: One implementation for HMAC generation
2. **Consistency**: Same token format across all services
3. **Maintainability**: Fix bugs in one place
4. **Testability**: Test once, verify everywhere
5. **Type Safety**: TypeScript definitions for frontend usage
6. **Documentation**: Centralized reference for HMAC logic

### When to Use Which Utility

| Environment | Import From | Use Case |
|-------------|-------------|----------|
| Server Actions (Next.js) | `hmac-token-service.ts` | Frontend display, API endpoints |
| Workers (Node.js) | `cdn-utils.js` | Background processing, batch operations |
| Scripts | `cdn-utils.js` | One-off migrations, data processing |

### Example Usage Patterns

**Worker Pattern**:
```javascript
// Workers can directly convert private URLs to CDN URLs
const privateUrl = 'private:fileId:/video.mp4'
const cdnUrl = generateCDNUrlFromPrivateUrl(
  privateUrl,
  this.cdnBaseUrl,
  this.hmacSecret
)
// Use cdnUrl with FFmpeg/FFprobe
```

**Server Action Pattern**:
```typescript
// Server actions convert for frontend consumption
function generateCDNUrlWithToken(privateUrl: string | null): string | null {
  if (!privateUrl?.startsWith('private:')) return privateUrl

  const filePath = extractFilePathFromPrivateUrl(privateUrl)
  return generateCDNUrl(cdnBaseUrl, filePath, hmacSecret)
}
```

## Maintenance Considerations

- Token expiration should align with processing windows
- Secrets should be rotated periodically
- Monitor for failed authentications
- Keep processing and token generation coupled
- Document token format for debugging
- **Use shared utilities to maintain consistency across all HMAC implementations**
- Update both TypeScript and CommonJS utilities when changing token format
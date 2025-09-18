# Cloudflare Dashboard Configuration Steps

## Required Actions to Fix CDN Proxying

### 1. Configure Transform Rule
**Location:** Cloudflare Dashboard → Rules → Transform Rules

**Action:** Create Rule
- **Rule name**: `Rewrite path for unpuzzle-mvp bucket`
- **When incoming requests match**:
  - Field: `Hostname`
  - Operator: `equals`
  - Value: `cdn.unpuzzle.co`
- **Then rewrite to**:
  - Path: `Rewrite to...` → `Dynamic`
  - Value: `concat("/file/unpuzzle-mvp", http.request.uri.path)`

### 2. Set SSL/TLS Mode
**Location:** Cloudflare Dashboard → SSL/TLS → Overview

**Action:** Change encryption mode
- Set to: **"Full (strict)"**
- This is required for Backblaze B2 compatibility

### 3. Verify DNS Settings
**Location:** Cloudflare Dashboard → DNS → Records

**Verify existing CNAME record:**
- Name: `cdn`
- Target: `f005.backblazeb2.com`
- Proxy status: ✅ Proxied (orange cloud)

## Expected Result

After these changes:
1. ✅ Videos will be served through Cloudflare CDN
2. ✅ Content will be cached, reducing Backblaze bandwidth
3. ✅ No more bandwidth cap warnings
4. ✅ Faster video loading globally

## Testing

After configuration, test with:
```bash
curl -I https://cdn.unpuzzle.co/test-video.mp4
# Should return 200 OK from Cloudflare, not 302 redirect
```

Video URLs will now work as:
- App generates: `https://cdn.unpuzzle.co/video.mp4?Authorization=token`
- Cloudflare serves cached content or fetches from B2 once
- No more direct B2 bandwidth usage ✅
# Domain Setup Guide for unpuzzle.co

## Current Service URLs
- **Main App**: https://unpuzzle-app-ea277idvqa-uc.a.run.app
- **WebSocket**: https://unpuzzle-websocket-ea277idvqa-uc.a.run.app

## Domain Configuration Plan
- `unpuzzle.co` → Main Next.js application
- `www.unpuzzle.co` → Redirect to unpuzzle.co
- `ws.unpuzzle.co` → WebSocket server
- `cdn.unpuzzle.co` → Already configured with Cloudflare

## Step 1: Verify Domain Ownership with Google

### Option A: Using gcloud CLI (Recommended)
```bash
# 1. Start domain verification
gcloud domains verify unpuzzle.co

# 2. List verification records
gcloud domains list-user-verified

# 3. If not verified, add TXT record to your DNS:
# Type: TXT
# Name: @ (or leave blank)
# Value: google-site-verification=YOUR_VERIFICATION_CODE
```

### Option B: Using Cloud Console
1. Go to: https://console.cloud.google.com/run/domains?project=unpuzzle-473015
2. Click "Add Domain Mapping"
3. Enter `unpuzzle.co`
4. Follow the verification steps

## Step 2: Create Domain Mappings in Cloud Run

### Map unpuzzle.co to the main app
```bash
gcloud run domain-mappings create \
  --service=unpuzzle-app \
  --domain=unpuzzle.co \
  --region=us-central1
```

### Map www.unpuzzle.co (optional)
```bash
gcloud run domain-mappings create \
  --service=unpuzzle-app \
  --domain=www.unpuzzle.co \
  --region=us-central1
```

### Map ws.unpuzzle.co to WebSocket service
```bash
gcloud run domain-mappings create \
  --service=unpuzzle-websocket \
  --domain=ws.unpuzzle.co \
  --region=us-central1
```

## Step 3: Configure DNS Records

After creating the domain mappings, you'll get DNS records to add. They typically look like:

### For unpuzzle.co (root domain)
```
Type: A
Name: @ (or unpuzzle.co)
Value: [IPv4 addresses from Google]

Type: AAAA
Name: @ (or unpuzzle.co)
Value: [IPv6 addresses from Google]
```

### For www.unpuzzle.co
```
Type: CNAME
Name: www
Value: ghs.googlehosted.com.
```

### For ws.unpuzzle.co
```
Type: CNAME
Name: ws
Value: ghs.googlehosted.com.
```

## Step 4: Add DNS Records to Your DNS Provider

### If using Cloudflare:
1. Log in to Cloudflare Dashboard
2. Select your domain (unpuzzle.co)
3. Go to DNS settings
4. Add the records:

#### Root Domain (unpuzzle.co)
- **Type**: A
- **Name**: @
- **IPv4 address**: (Google will provide)
- **Proxy status**: DNS only (gray cloud)
- **TTL**: Auto

#### WWW Subdomain
- **Type**: CNAME
- **Name**: www
- **Target**: ghs.googlehosted.com
- **Proxy status**: DNS only (gray cloud)
- **TTL**: Auto

#### WebSocket Subdomain
- **Type**: CNAME
- **Name**: ws
- **Target**: ghs.googlehosted.com
- **Proxy status**: DNS only (gray cloud)
- **TTL**: Auto

### If using another DNS provider:
Add the same records in your provider's DNS management panel.

## Step 5: Update Environment Variables

### Update your GitHub Secrets:
- `NEXT_PUBLIC_APP_URL`: `https://unpuzzle.co`
- `NEXT_PUBLIC_WEBSOCKET_URL`: `wss://ws.unpuzzle.co`

### Update locally for testing:
```bash
# Edit .env.local
NEXT_PUBLIC_APP_URL=https://unpuzzle.co
NEXT_PUBLIC_WEBSOCKET_URL=wss://ws.unpuzzle.co
```

## Step 6: Redeploy with Updated URLs

```bash
# Trigger a new deployment with updated environment variables
git commit --allow-empty -m "Redeploy with custom domain"
git push origin main
```

## Step 7: SSL Certificates

Google Cloud Run automatically provisions and manages SSL certificates for custom domains. This process:
- Takes 15-30 minutes after DNS propagation
- Is fully automatic
- Provides auto-renewal

## Step 8: Test Your Domain

### Check DNS propagation:
```bash
# Check A records
nslookup unpuzzle.co

# Check CNAME records
nslookup www.unpuzzle.co
nslookup ws.unpuzzle.co

# Test with curl
curl -I https://unpuzzle.co
curl -I https://www.unpuzzle.co
curl -I https://ws.unpuzzle.co/health
```

### Online DNS checker:
- https://www.whatsmydns.net/#A/unpuzzle.co
- https://www.whatsmydns.net/#CNAME/www.unpuzzle.co

## Troubleshooting

### Domain not working after setup:
1. **DNS Propagation**: Can take up to 48 hours (usually 15-30 minutes)
2. **SSL Certificate**: Takes 15-30 minutes after DNS propagation
3. **Check mapping status**:
   ```bash
   gcloud run domain-mappings list --region=us-central1
   ```

### SSL Certificate Issues:
```bash
# Check certificate status
gcloud run domain-mappings describe unpuzzle.co \
  --region=us-central1 \
  --format="get(status.certificates[0].status)"
```

### Remove domain mapping (if needed):
```bash
gcloud run domain-mappings delete \
  --domain=unpuzzle.co \
  --region=us-central1
```

## Expected Timeline
1. Domain verification: 5-10 minutes
2. Domain mapping creation: Instant
3. DNS propagation: 15 minutes to 48 hours (usually fast)
4. SSL certificate: 15-30 minutes after DNS
5. **Total time**: Usually 30-60 minutes

## Security Considerations

### Cloudflare Settings (if using Cloudflare):
1. **SSL/TLS**: Set to "Full (strict)"
2. **Always Use HTTPS**: Enable
3. **Automatic HTTPS Rewrites**: Enable
4. **For Cloud Run domains**: Use "DNS only" (gray cloud), not proxied

### CORS Configuration:
Update your Next.js app to accept requests from the custom domain:
```javascript
// In your API routes or middleware
const allowedOrigins = [
  'https://unpuzzle.co',
  'https://www.unpuzzle.co',
  'https://ws.unpuzzle.co'
]
```

## Quick Setup Script

Save this as `setup-domain.sh`:
```bash
#!/bin/bash

# Verify domain
echo "Verifying domain ownership..."
gcloud domains verify unpuzzle.co

# Create domain mappings
echo "Creating domain mappings..."
gcloud run domain-mappings create \
  --service=unpuzzle-app \
  --domain=unpuzzle.co \
  --region=us-central1

gcloud run domain-mappings create \
  --service=unpuzzle-app \
  --domain=www.unpuzzle.co \
  --region=us-central1

gcloud run domain-mappings create \
  --service=unpuzzle-websocket \
  --domain=ws.unpuzzle.co \
  --region=us-central1

# Show DNS records to add
echo "Add these DNS records to your provider:"
gcloud run domain-mappings describe unpuzzle.co \
  --region=us-central1 \
  --format="get(status.resourceRecords[0])"
```

## Next Steps
1. Verify domain ownership
2. Create domain mappings
3. Add DNS records
4. Wait for propagation
5. Test with your custom domain!

---
Your app will be available at:
- Main app: https://unpuzzle.co
- WebSocket: wss://ws.unpuzzle.co
- CDN: https://cdn.unpuzzle.co (already configured)
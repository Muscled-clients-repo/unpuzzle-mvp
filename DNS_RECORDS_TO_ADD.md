# DNS Records to Add in Cloudflare

## ✅ Current Status
- ✅ Domain verified: `unpuzzle.co`
- ✅ Domain mappings created:
  - `unpuzzle.co` → unpuzzle-app
  - `www.unpuzzle.co` → unpuzzle-app
  - `ws.unpuzzle.co` → unpuzzle-websocket

## 🚨 DNS Records Need to be Updated in Cloudflare

### For unpuzzle.co (Root Domain)

**Delete existing A/AAAA records and add these:**

#### A Records (IPv4):
- Type: A
- Name: @
- IPv4 address: `216.239.32.21`
- Proxy status: DNS only (gray cloud)
- TTL: Auto

- Type: A
- Name: @
- IPv4 address: `216.239.34.21`
- Proxy status: DNS only (gray cloud)
- TTL: Auto

- Type: A
- Name: @
- IPv4 address: `216.239.36.21`
- Proxy status: DNS only (gray cloud)
- TTL: Auto

- Type: A
- Name: @
- IPv4 address: `216.239.38.21`
- Proxy status: DNS only (gray cloud)
- TTL: Auto

#### AAAA Records (IPv6):
- Type: AAAA
- Name: @
- IPv6 address: `2001:4860:4802:32::15`
- Proxy status: DNS only (gray cloud)
- TTL: Auto

- Type: AAAA
- Name: @
- IPv6 address: `2001:4860:4802:34::15`
- Proxy status: DNS only (gray cloud)
- TTL: Auto

- Type: AAAA
- Name: @
- IPv6 address: `2001:4860:4802:36::15`
- Proxy status: DNS only (gray cloud)
- TTL: Auto

- Type: AAAA
- Name: @
- IPv6 address: `2001:4860:4802:38::15`
- Proxy status: DNS only (gray cloud)
- TTL: Auto

### For www.unpuzzle.co

- Type: CNAME
- Name: www
- Target: `ghs.googlehosted.com`
- Proxy status: DNS only (gray cloud)
- TTL: Auto

### For ws.unpuzzle.co

- Type: CNAME
- Name: ws
- Target: `ghs.googlehosted.com`
- Proxy status: DNS only (gray cloud)
- TTL: Auto

## 📝 Step-by-Step Instructions for Cloudflare

1. **Log in to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Select `unpuzzle.co`

2. **Go to DNS Management**
   - Click on "DNS" in the left sidebar

3. **Delete Existing A/AAAA Records for @**
   - Find any A or AAAA records with Name "@" or "unpuzzle.co"
   - Click "Edit" → "Delete"

4. **Add Google Cloud Run A Records**
   - Click "Add record"
   - Add each of the 4 A records listed above
   - **IMPORTANT**: Set Proxy status to "DNS only" (gray cloud, not orange)

5. **Add Google Cloud Run AAAA Records**
   - Add each of the 4 AAAA records listed above
   - Set Proxy status to "DNS only" (gray cloud)

6. **Update/Add CNAME for www**
   - If exists, edit it to point to `ghs.googlehosted.com`
   - If not, create new CNAME record
   - Set Proxy status to "DNS only" (gray cloud)

7. **Update/Add CNAME for ws**
   - Point to `ghs.googlehosted.com`
   - Set Proxy status to "DNS only" (gray cloud)

## ⚠️ Important Notes

- **DO NOT USE CLOUDFLARE PROXY** (orange cloud) for these records
- All records must be **DNS only** (gray cloud)
- Keep your existing CDN record for `cdn.unpuzzle.co` as is

## 🔍 After Adding Records

### Check DNS propagation (wait 5-15 minutes):
```bash
# Should return Google IPs (216.239.x.x)
nslookup unpuzzle.co 8.8.8.8

# Should return ghs.googlehosted.com
nslookup www.unpuzzle.co 8.8.8.8
nslookup ws.unpuzzle.co 8.8.8.8
```

### Test the domains:
```bash
# Test HTTPS (may take 15-30 minutes for SSL)
curl -I https://unpuzzle.co
curl -I https://www.unpuzzle.co
curl -I https://ws.unpuzzle.co/health
```

## 📊 Current DNS Status

Currently, `unpuzzle.co` is pointing to:
- `104.21.22.128` (Cloudflare)
- `172.67.205.10` (Cloudflare)

It needs to point to:
- `216.239.32.21` (Google)
- `216.239.34.21` (Google)
- `216.239.36.21` (Google)
- `216.239.38.21` (Google)

## 🚀 Expected Timeline After DNS Update

- DNS propagation: 5-30 minutes
- SSL certificate provisioning: 15-30 minutes after DNS
- Total: Your site should be live within 1 hour

## 💡 Quick Tip

You can check propagation status at:
- https://www.whatsmydns.net/#A/unpuzzle.co
- https://dnschecker.org/#A/unpuzzle.co

The domain should show Google's IPs (216.239.x.x) when propagated.
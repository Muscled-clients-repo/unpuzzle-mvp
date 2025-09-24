#!/bin/bash

# Domain Verification Script for unpuzzle.co

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}======================================"
echo -e "Domain Verification for unpuzzle.co"
echo -e "======================================${NC}"

echo -e "${YELLOW}\nStep 1: Domain Verification${NC}"
echo -e "${BLUE}You need to verify domain ownership with Google.${NC}"
echo ""
echo -e "${YELLOW}Option A: Use Google Search Console${NC}"
echo "1. Go to: https://search.google.com/search-console"
echo "2. Click 'Add property'"
echo "3. Choose 'Domain' and enter: unpuzzle.co"
echo "4. Add the TXT record shown to your DNS provider"
echo ""
echo -e "${YELLOW}Option B: Use Google Webmaster Central${NC}"
echo "1. Go to: https://www.google.com/webmasters/verification/"
echo "2. Add unpuzzle.co"
echo "3. Choose DNS verification method"
echo "4. Add the TXT record to your DNS"
echo ""
echo -e "${GREEN}Example TXT record:${NC}"
echo "Type: TXT"
echo "Name: @ (or unpuzzle.co)"
echo "Value: google-site-verification=YOUR_VERIFICATION_CODE"
echo "TTL: 3600 (or default)"
echo ""
echo -e "${YELLOW}Step 2: Add TXT Record in Cloudflare${NC}"
echo "1. Log in to Cloudflare Dashboard"
echo "2. Select unpuzzle.co"
echo "3. Go to DNS → Add record"
echo "4. Type: TXT"
echo "5. Name: @"
echo "6. Content: [paste verification code]"
echo "7. TTL: Auto"
echo "8. Save"
echo ""
echo -e "${YELLOW}Step 3: Verify the Domain${NC}"
echo "After adding the TXT record, wait 5-10 minutes, then:"
echo "1. Return to Google verification page"
echo "2. Click 'Verify'"
echo ""
echo -e "${YELLOW}Step 4: Check Verification Status${NC}"
echo -e "${GREEN}Run this command to check if verified:${NC}"
echo "gcloud domains list-user-verified"
echo ""
echo -e "${BLUE}Press Enter when you've added the TXT record to continue...${NC}"
read

echo -e "${YELLOW}\nChecking current domain verification status...${NC}"
gcloud domains list-user-verified || echo "No domains verified yet"

echo -e "${YELLOW}\nOnce verified, run these commands:${NC}"
echo ""
echo "# Create domain mapping for main app"
echo "gcloud beta run domain-mappings create \\"
echo "  --service=unpuzzle-app \\"
echo "  --domain=unpuzzle.co \\"
echo "  --region=us-central1"
echo ""
echo "# Create subdomain mappings"
echo "gcloud beta run domain-mappings create \\"
echo "  --service=unpuzzle-app \\"
echo "  --domain=www.unpuzzle.co \\"
echo "  --region=us-central1"
echo ""
echo "gcloud beta run domain-mappings create \\"
echo "  --service=unpuzzle-websocket \\"
echo "  --domain=ws.unpuzzle.co \\"
echo "  --region=us-central1"
echo ""
echo -e "${GREEN}After creating mappings, you'll get DNS records to add.${NC}"
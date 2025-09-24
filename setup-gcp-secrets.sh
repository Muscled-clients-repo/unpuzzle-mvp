#!/bin/bash

# Script to create GCP Secret Manager secrets for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_message $GREEN "======================================"
print_message $GREEN "Setting up GCP Secret Manager"
print_message $GREEN "======================================"

PROJECT_ID="unpuzzle-473015"
gcloud config set project $PROJECT_ID

print_message $YELLOW "\nCreating secrets in Secret Manager..."
print_message $YELLOW "You'll be prompted to enter each secret value"

# Function to create or update a secret
create_secret() {
    local secret_name=$1
    local secret_desc=$2
    local default_value=$3

    print_message $YELLOW "\n$secret_desc"
    if [ ! -z "$default_value" ]; then
        print_message $BLUE "Press Enter to use default: $default_value"
    fi

    print_message $YELLOW "Enter value for $secret_name:"
    read -rs secret_value
    echo

    # Use default if no value entered
    if [ -z "$secret_value" ] && [ ! -z "$default_value" ]; then
        secret_value=$default_value
        print_message $BLUE "Using default value"
    fi

    if [ ! -z "$secret_value" ]; then
        # Delete existing secret if it exists
        gcloud secrets delete $secret_name --quiet 2>/dev/null || true

        # Create new secret
        echo -n "$secret_value" | gcloud secrets create $secret_name \
            --data-file=- \
            --labels=app=unpuzzle

        # Grant access to default service account
        gcloud secrets add-iam-policy-binding $secret_name \
            --member="serviceAccount:303111338493-compute@developer.gserviceaccount.com" \
            --role="roles/secretmanager.secretAccessor" \
            --quiet

        # Also grant to github-deploy service account
        gcloud secrets add-iam-policy-binding $secret_name \
            --member="serviceAccount:github-deploy@unpuzzle-473015.iam.gserviceaccount.com" \
            --role="roles/secretmanager.secretAccessor" \
            --quiet 2>/dev/null || true

        print_message $GREEN "✓ Created: $secret_name"
    else
        print_message $YELLOW "Skipped: $secret_name (no value provided)"
    fi
}

# Read values from .env.local if available
if [ -f ".env.local" ]; then
    print_message $GREEN "\nFound .env.local file - loading defaults..."
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Create required secrets
print_message $BLUE "\n=== Supabase Configuration ==="
create_secret "supabase-service-key" "Supabase Service Role Key (required)" "$SUPABASE_SERVICE_ROLE_KEY"

print_message $BLUE "\n=== AI Configuration ==="
create_secret "groq-api-key" "Groq API Key (required for AI features)" "$GROQ_API_KEY"

print_message $BLUE "\n=== Backblaze Storage ==="
create_secret "backblaze-key-id" "Backblaze Application Key ID" "$BACKBLAZE_APPLICATION_KEY_ID"
create_secret "backblaze-key" "Backblaze Application Key" "$BACKBLAZE_APPLICATION_KEY"

print_message $BLUE "\n=== CDN Configuration ==="
create_secret "cdn-auth-secret" "CDN Authentication Secret" "$CDN_AUTH_SECRET"

print_message $GREEN "\n======================================"
print_message $GREEN "Secret Manager Setup Complete!"
print_message $GREEN "======================================"

print_message $YELLOW "\nVerifying secrets..."
gcloud secrets list --format="table(name,created)"

print_message $GREEN "\n✅ Secrets are ready for deployment!"
print_message $YELLOW "\nYou can now:"
print_message $YELLOW "1. Push to GitHub to trigger deployment"
print_message $YELLOW "2. Or run: gcloud run deploy manually"
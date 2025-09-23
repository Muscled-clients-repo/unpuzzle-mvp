#!/bin/bash

# GCP Deployment Script for Unpuzzle MVP
# This script helps deploy the application to Google Cloud Platform

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=""
REGION="us-central1"
SERVICE_NAME="unpuzzle-app"
WEBSOCKET_SERVICE_NAME="unpuzzle-websocket"
ARTIFACT_REGISTRY="unpuzzle"

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if gcloud is installed
check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        print_message $RED "Error: gcloud CLI is not installed"
        print_message $YELLOW "Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
}

# Get or set project ID
setup_project() {
    if [ -z "$PROJECT_ID" ]; then
        print_message $YELLOW "Enter your GCP Project ID:"
        read -r PROJECT_ID
    fi

    gcloud config set project $PROJECT_ID
    print_message $GREEN "✓ Project set to: $PROJECT_ID"
}

# Enable required APIs
enable_apis() {
    print_message $YELLOW "Enabling required GCP APIs..."

    gcloud services enable \
        cloudbuild.googleapis.com \
        run.googleapis.com \
        artifactregistry.googleapis.com \
        secretmanager.googleapis.com \
        containerregistry.googleapis.com

    print_message $GREEN "✓ APIs enabled"
}

# Create Artifact Registry repository
create_artifact_registry() {
    print_message $YELLOW "Creating Artifact Registry repository..."

    gcloud artifacts repositories create $ARTIFACT_REGISTRY \
        --repository-format=docker \
        --location=$REGION \
        --description="Docker repository for Unpuzzle" \
        2>/dev/null || print_message $YELLOW "Repository already exists"

    print_message $GREEN "✓ Artifact Registry ready"
}

# Setup secrets in Secret Manager
setup_secrets() {
    print_message $YELLOW "Setting up secrets in Secret Manager..."
    print_message $YELLOW "You'll be prompted to enter each secret value"

    # Function to create or update a secret
    create_secret() {
        local secret_name=$1
        local secret_desc=$2

        print_message $YELLOW "Enter value for $secret_desc:"
        read -rs secret_value
        echo

        # Delete existing secret if it exists
        gcloud secrets delete $secret_name --quiet 2>/dev/null || true

        # Create new secret
        echo -n "$secret_value" | gcloud secrets create $secret_name \
            --data-file=- \
            --labels=app=unpuzzle

        # Grant Cloud Run access
        gcloud secrets add-iam-policy-binding $secret_name \
            --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
            --role="roles/secretmanager.secretAccessor" \
            --quiet
    }

    # Create secrets
    create_secret "supabase-service-key" "Supabase Service Role Key"
    create_secret "groq-api-key" "Groq API Key"
    create_secret "backblaze-key-id" "Backblaze Application Key ID"
    create_secret "backblaze-key" "Backblaze Application Key"
    create_secret "cdn-auth-secret" "CDN Auth Secret (generate with: openssl rand -base64 32)"

    print_message $GREEN "✓ Secrets configured"
}

# Build and deploy with Cloud Build
deploy_with_cloud_build() {
    print_message $YELLOW "Starting Cloud Build deployment..."

    # Get public environment variables
    print_message $YELLOW "Enter NEXT_PUBLIC_SUPABASE_URL:"
    read -r NEXT_PUBLIC_SUPABASE_URL

    print_message $YELLOW "Enter NEXT_PUBLIC_SUPABASE_ANON_KEY:"
    read -r NEXT_PUBLIC_SUPABASE_ANON_KEY

    print_message $YELLOW "Enter NEXT_PUBLIC_GROQ_API_KEY:"
    read -r NEXT_PUBLIC_GROQ_API_KEY

    print_message $YELLOW "Enter NEXT_PUBLIC_APP_URL (your domain, e.g., https://unpuzzle.com):"
    read -r NEXT_PUBLIC_APP_URL

    # WebSocket URL will be set after deployment
    NEXT_PUBLIC_WEBSOCKET_URL="wss://unpuzzle-websocket-xxxxx-uc.a.run.app"

    # Submit build
    gcloud builds submit \
        --config=cloudbuild.yaml \
        --substitutions="\
_PROJECT_ID=$PROJECT_ID,\
_REGION=$REGION,\
_SERVICE_NAME=$SERVICE_NAME,\
_WEBSOCKET_SERVICE_NAME=$WEBSOCKET_SERVICE_NAME,\
_NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,\
_NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY,\
_NEXT_PUBLIC_GROQ_API_KEY=$NEXT_PUBLIC_GROQ_API_KEY,\
_NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL,\
_NEXT_PUBLIC_WEBSOCKET_URL=$NEXT_PUBLIC_WEBSOCKET_URL"

    print_message $GREEN "✓ Deployment complete"
}

# Get service URLs
get_service_urls() {
    print_message $GREEN "\n=========================================="
    print_message $GREEN "Deployment URLs:"
    print_message $GREEN "=========================================="

    APP_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
    WS_URL=$(gcloud run services describe $WEBSOCKET_SERVICE_NAME --region=$REGION --format='value(status.url)')

    print_message $GREEN "Next.js App: $APP_URL"
    print_message $GREEN "WebSocket Server: $WS_URL"

    print_message $YELLOW "\n⚠️  IMPORTANT: Update your app with the WebSocket URL"
    print_message $YELLOW "You need to rebuild with NEXT_PUBLIC_WEBSOCKET_URL=$WS_URL"
}

# Setup Cloud Build trigger
setup_build_trigger() {
    print_message $YELLOW "Do you want to set up automatic deployments from GitHub? (y/n)"
    read -r setup_trigger

    if [ "$setup_trigger" = "y" ]; then
        print_message $YELLOW "Enter your GitHub repository (format: owner/repo):"
        read -r github_repo

        print_message $YELLOW "Enter the branch to deploy from (e.g., main):"
        read -r branch_name

        gcloud builds triggers create github \
            --repo-name="$github_repo" \
            --repo-owner="$(echo $github_repo | cut -d'/' -f1)" \
            --branch-pattern="^${branch_name}$" \
            --build-config="cloudbuild.yaml" \
            --name="unpuzzle-deploy-trigger"

        print_message $GREEN "✓ Build trigger created"
    fi
}

# Main deployment flow
main() {
    print_message $GREEN "=========================================="
    print_message $GREEN "Unpuzzle MVP - GCP Deployment"
    print_message $GREEN "=========================================="

    check_gcloud
    setup_project
    enable_apis
    create_artifact_registry

    print_message $YELLOW "\nDo you want to set up secrets? (y/n)"
    read -r setup_secrets_answer
    if [ "$setup_secrets_answer" = "y" ]; then
        setup_secrets
    fi

    print_message $YELLOW "\nDo you want to deploy now? (y/n)"
    read -r deploy_now
    if [ "$deploy_now" = "y" ]; then
        deploy_with_cloud_build
        get_service_urls
    fi

    setup_build_trigger

    print_message $GREEN "\n=========================================="
    print_message $GREEN "Deployment setup complete!"
    print_message $GREEN "=========================================="

    print_message $YELLOW "\nNext steps:"
    print_message $YELLOW "1. Update NEXT_PUBLIC_WEBSOCKET_URL with the actual WebSocket URL"
    print_message $YELLOW "2. Set up custom domain in Cloud Run console"
    print_message $YELLOW "3. Configure Cloudflare Worker for CDN"
    print_message $YELLOW "4. Monitor logs in Cloud Console"
}

# Run main function
main
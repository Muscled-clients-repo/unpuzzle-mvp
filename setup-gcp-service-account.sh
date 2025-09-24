#!/bin/bash

# Service Account Setup Script for GitHub Actions CI/CD
# This script creates a service account with necessary permissions for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_message $GREEN "======================================"
print_message $GREEN "GCP Service Account Setup for GitHub"
print_message $GREEN "======================================"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_message $RED "Error: gcloud CLI is not installed"
    print_message $YELLOW "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get or set project ID
print_message $YELLOW "\nEnter your GCP Project ID:"
read -r PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    print_message $RED "Project ID is required"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID
print_message $GREEN "✓ Project set to: $PROJECT_ID"

# Variables
SERVICE_ACCOUNT_NAME="github-deploy"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="gcp-service-account-key.json"

print_message $BLUE "\n📋 Configuration:"
print_message $BLUE "  Project ID: $PROJECT_ID"
print_message $BLUE "  Service Account: $SERVICE_ACCOUNT_EMAIL"
print_message $BLUE "  Key File: $KEY_FILE"

# Create service account
print_message $YELLOW "\n1. Creating service account..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &>/dev/null; then
    print_message $YELLOW "   Service account already exists, skipping creation"
else
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="GitHub Actions Deploy Account" \
        --description="Service account for GitHub Actions CI/CD"
    print_message $GREEN "   ✓ Service account created"
fi

# Grant necessary IAM roles
print_message $YELLOW "\n2. Granting IAM permissions..."

ROLES=(
    "roles/run.admin"                # Cloud Run Admin
    "roles/artifactregistry.writer"  # Push Docker images
    "roles/secretmanager.secretAccessor"  # Access secrets
    "roles/iam.serviceAccountUser"   # Act as service account
    "roles/storage.admin"            # Storage access (if needed)
)

for role in "${ROLES[@]}"; do
    print_message $YELLOW "   Adding role: $role"
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="$role" \
        --quiet
done

print_message $GREEN "   ✓ All roles granted"

# Enable required APIs
print_message $YELLOW "\n3. Enabling required APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    containerregistry.googleapis.com

print_message $GREEN "   ✓ APIs enabled"

# Create Artifact Registry repository
print_message $YELLOW "\n4. Creating Artifact Registry repository..."
if gcloud artifacts repositories describe unpuzzle --location=us-central1 &>/dev/null; then
    print_message $YELLOW "   Repository already exists"
else
    gcloud artifacts repositories create unpuzzle \
        --repository-format=docker \
        --location=us-central1 \
        --description="Docker repository for Unpuzzle"
    print_message $GREEN "   ✓ Artifact Registry created"
fi

# Create service account key
print_message $YELLOW "\n5. Creating service account key..."
if [ -f "$KEY_FILE" ]; then
    print_message $YELLOW "   Key file already exists. Do you want to recreate it? (y/n)"
    read -r recreate
    if [ "$recreate" != "y" ]; then
        print_message $YELLOW "   Skipping key creation"
    else
        rm -f $KEY_FILE
        gcloud iam service-accounts keys create $KEY_FILE \
            --iam-account=$SERVICE_ACCOUNT_EMAIL
        print_message $GREEN "   ✓ New key created: $KEY_FILE"
    fi
else
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$SERVICE_ACCOUNT_EMAIL
    print_message $GREEN "   ✓ Key created: $KEY_FILE"
fi

# Create secrets in Secret Manager (optional)
print_message $YELLOW "\n6. Do you want to create secrets in Secret Manager now? (y/n)"
read -r create_secrets

if [ "$create_secrets" = "y" ]; then
    print_message $YELLOW "\nCreating secrets in Secret Manager..."

    # Function to create or update a secret
    create_secret() {
        local secret_name=$1
        local secret_desc=$2

        print_message $YELLOW "Enter value for $secret_desc (or press Enter to skip):"
        read -rs secret_value
        echo

        if [ ! -z "$secret_value" ]; then
            # Delete existing secret version if it exists
            gcloud secrets delete $secret_name --quiet 2>/dev/null || true

            # Create new secret
            echo -n "$secret_value" | gcloud secrets create $secret_name \
                --data-file=- \
                --labels=app=unpuzzle

            # Grant service account access
            gcloud secrets add-iam-policy-binding $secret_name \
                --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
                --role="roles/secretmanager.secretAccessor" \
                --quiet

            print_message $GREEN "   ✓ Created: $secret_name"
        else
            print_message $YELLOW "   Skipped: $secret_name"
        fi
    }

    create_secret "supabase-service-key" "Supabase Service Role Key"
    create_secret "groq-api-key" "Groq API Key"
    create_secret "backblaze-key-id" "Backblaze Application Key ID"
    create_secret "backblaze-key" "Backblaze Application Key"
    create_secret "cdn-auth-secret" "CDN Auth Secret"
fi

# Display the key content for GitHub
print_message $GREEN "\n======================================"
print_message $GREEN "Setup Complete!"
print_message $GREEN "======================================"

print_message $YELLOW "\n📋 Next Steps:"
print_message $YELLOW "1. Copy the service account key below"
print_message $YELLOW "2. Go to GitHub → Settings → Secrets → Actions"
print_message $YELLOW "3. Create a new secret named: GCP_SA_KEY"
print_message $YELLOW "4. Paste the entire JSON content below"

print_message $BLUE "\n🔑 Service Account Key (copy everything between the markers):"
print_message $RED "========== COPY START =========="
cat $KEY_FILE
print_message $RED "\n========== COPY END =========="

print_message $YELLOW "\n5. Also add these GitHub secrets:"
print_message $BLUE "   • GCP_PROJECT_ID: $PROJECT_ID"
print_message $BLUE "   • NEXT_PUBLIC_SUPABASE_URL: Your Supabase URL"
print_message $BLUE "   • NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anon key"
print_message $BLUE "   • NEXT_PUBLIC_GROQ_API_KEY: Your Groq API key"
print_message $BLUE "   • NEXT_PUBLIC_APP_URL: Your app URL (e.g., https://unpuzzle.com)"
print_message $BLUE "   • NEXT_PUBLIC_WEBSOCKET_URL: Will be set after first deploy"

print_message $YELLOW "\n⚠️  Security Notes:"
print_message $YELLOW "   • Keep $KEY_FILE secure and don't commit it to git"
print_message $YELLOW "   • Add $KEY_FILE to .gitignore"
print_message $YELLOW "   • Delete local key file after adding to GitHub"

print_message $GREEN "\n✅ Your service account is ready for GitHub Actions!"

# Ask if user wants to delete the key file
print_message $YELLOW "\nDo you want to delete the local key file now? (y/n)"
read -r delete_key
if [ "$delete_key" = "y" ]; then
    rm -f $KEY_FILE
    print_message $GREEN "✓ Local key file deleted"
else
    print_message $YELLOW "⚠️  Remember to delete $KEY_FILE after adding to GitHub"
    print_message $YELLOW "   Run: rm $KEY_FILE"
fi
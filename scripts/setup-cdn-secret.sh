#!/bin/bash

# Script to set up CDN_AUTH_SECRET in Google Secret Manager
# This ensures the production app has the correct secret for HMAC token generation

set -e

PROJECT_ID="unpuzzle-473015"
SECRET_NAME="cdn-auth-secret"
SECRET_VALUE="eqO0T5krzBJ+H0zb9e4UXTJmj9BSmuZmWGO4Bz5Bhzs="

echo "Setting up CDN_AUTH_SECRET in Google Secret Manager..."
echo "Project: $PROJECT_ID"
echo ""

# Check if the secret exists
if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "Secret '$SECRET_NAME' already exists. Updating with new version..."

    # Create a new version of the secret
    echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME \
        --project=$PROJECT_ID \
        --data-file=-

    echo "✅ Secret updated successfully!"
else
    echo "Creating new secret '$SECRET_NAME'..."

    # Create the secret
    echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME \
        --project=$PROJECT_ID \
        --data-file=- \
        --replication-policy="automatic"

    echo "✅ Secret created successfully!"

    # Grant access to Cloud Run service account
    echo "Granting access to Cloud Run service account..."

    # Get the default compute service account
    SERVICE_ACCOUNT="$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com"

    gcloud secrets add-iam-policy-binding $SECRET_NAME \
        --project=$PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/secretmanager.secretAccessor"

    echo "✅ Permissions granted to: $SERVICE_ACCOUNT"
fi

echo ""
echo "Verifying secret..."
STORED_VALUE=$(gcloud secrets versions access latest --secret=$SECRET_NAME --project=$PROJECT_ID)
if [ "$STORED_VALUE" = "$SECRET_VALUE" ]; then
    echo "✅ Secret verified successfully!"
    echo ""
    echo "The CDN_AUTH_SECRET is now available to your Cloud Run services."
    echo "Your app will use this secret for HMAC token generation."
else
    echo "❌ Secret verification failed!"
    echo "Expected: $SECRET_VALUE"
    echo "Got: $STORED_VALUE"
    exit 1
fi

echo ""
echo "🎉 Setup complete! The secret is configured in Google Secret Manager."
echo ""
echo "Note: You may need to redeploy your Cloud Run service for changes to take effect:"
echo "  - Trigger a new GitHub Actions deployment, or"
echo "  - Run: gcloud run services update unpuzzle-app --region=us-central1"
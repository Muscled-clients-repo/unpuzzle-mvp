# Quick GitHub CI/CD Setup with Service Account

## 🚀 5-Minute Setup Guide

### Step 1: Run the Setup Script
```bash
# Make script executable and run it
chmod +x setup-gcp-service-account.sh
./setup-gcp-service-account.sh

# Follow the prompts:
# 1. Enter your GCP Project ID
# 2. Script will create service account automatically
# 3. Copy the JSON key when displayed
```

### Step 2: Add GitHub Secrets
Go to your GitHub repository:
1. Navigate to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:

| Secret Name | Value |
|------------|--------|
| `GCP_SA_KEY` | Paste the entire JSON key from Step 1 |
| `GCP_PROJECT_ID` | Your GCP project ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL (e.g., `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `NEXT_PUBLIC_GROQ_API_KEY` | Your Groq API key |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g., `https://unpuzzle.com`) |
| `NEXT_PUBLIC_WEBSOCKET_URL` | Leave as `wss://temp.com` for now |

### Step 3: Update .gitignore
```bash
# Add service account key to .gitignore
echo "gcp-service-account-key.json" >> .gitignore
echo "*.json" >> .gitignore
```

### Step 4: Deploy!
```bash
# Commit and push to trigger deployment
git add .
git commit -m "Setup GCP deployment with GitHub Actions"
git push origin main
```

### Step 5: Get Your App URLs
After deployment completes (~5 minutes):

1. Check GitHub Actions tab for deployment status
2. Look for the deployment URLs in the workflow output:
   - **App URL**: `https://unpuzzle-app-xxxxx-uc.a.run.app`
   - **WebSocket URL**: `https://unpuzzle-websocket-xxxxx-uc.a.run.app`

### Step 6: Update WebSocket URL
1. Copy the WebSocket URL from Step 5
2. Update `NEXT_PUBLIC_WEBSOCKET_URL` secret in GitHub with actual URL
3. Push any small change to trigger redeployment

## ✅ That's It! Your App is Live!

## 🔧 Manual GCP Commands (Optional)

If the script doesn't work, run these commands manually:

```bash
# Set project
PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Create service account
gcloud iam service-accounts create github-deploy \
    --display-name="GitHub Actions Deploy"

# Grant permissions (all in one command)
for role in roles/run.admin roles/artifactregistry.writer \
    roles/secretmanager.secretAccessor roles/iam.serviceAccountUser; do
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:github-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="$role"
done

# Enable APIs
gcloud services enable run.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com

# Create Artifact Registry
gcloud artifacts repositories create unpuzzle \
    --repository-format=docker \
    --location=us-central1

# Generate key
gcloud iam service-accounts keys create key.json \
    --iam-account=github-deploy@$PROJECT_ID.iam.gserviceaccount.com

# Display key (copy this to GitHub)
cat key.json
```

## 📊 Monitoring Your Deployment

### Check Deployment Status
- **GitHub**: Actions tab → Latest workflow run
- **GCP Console**: Cloud Run → Services

### View Logs
```bash
# App logs
gcloud logging read "resource.type=cloud_run_revision \
    AND resource.labels.service_name=unpuzzle-app" --limit 50

# WebSocket logs
gcloud logging read "resource.type=cloud_run_revision \
    AND resource.labels.service_name=unpuzzle-websocket" --limit 50
```

### Test Your App
```bash
# Test app endpoint
curl https://unpuzzle-app-xxxxx-uc.a.run.app

# Test WebSocket
npm install -g wscat
wscat -c wss://unpuzzle-websocket-xxxxx-uc.a.run.app
```

## 🚨 Troubleshooting

### Build Fails in GitHub Actions
- Check all secrets are set correctly
- Verify GCP_SA_KEY contains valid JSON
- Check GitHub Actions logs for specific errors

### Permission Denied Errors
```bash
# Add missing permission
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"
```

### Service Won't Start
- Check Cloud Run logs in GCP Console
- Verify all environment variables are set
- Ensure port 8080 is used

### Clean Up Failed Deployments
```bash
# List services
gcloud run services list --region=us-central1

# Delete failed service
gcloud run services delete SERVICE_NAME --region=us-central1
```

## 🎉 Success Checklist

- [ ] Service account created with permissions
- [ ] GitHub secrets configured
- [ ] First deployment successful
- [ ] App URL accessible
- [ ] WebSocket URL updated and redeployed
- [ ] Application fully functional

## 📞 Need Help?

1. Check the [detailed guide](./GCP_DEPLOYMENT.md)
2. Review [GitHub Actions logs](https://github.com/YOUR_USERNAME/unpuzzle-mvp-lts/actions)
3. Check [GCP Cloud Run console](https://console.cloud.google.com/run)

---

**Pro Tip**: Save the service account key securely. You can reuse it for multiple deployments or local testing.
# Google Cloud Platform Deployment Guide for Unpuzzle MVP

## Overview
This guide walks you through deploying the Unpuzzle MVP application to Google Cloud Platform (GCP) using Cloud Run for serverless deployment and Cloud Build for CI/CD.

## Architecture
- **Next.js Application**: Deployed on Cloud Run (auto-scaling, serverless)
- **WebSocket Server**: Deployed on Cloud Run with session affinity
- **Database**: External Supabase (already configured)
- **Storage**: Backblaze B2 + Cloudflare CDN (already configured)
- **Secrets**: GCP Secret Manager
- **CI/CD**: Cloud Build with GitHub triggers

## Prerequisites

### 1. GCP Account Setup
- [ ] GCP account with billing enabled
- [ ] Project created in GCP Console
- [ ] gcloud CLI installed locally

### 2. External Services
- [ ] Supabase project with database configured
- [ ] Backblaze B2 bucket with API keys
- [ ] Cloudflare account with CDN configured
- [ ] Groq API key for AI features

## Quick Start

### Option 1: Automated Deployment Script
```bash
# Run the deployment script
./deploy-gcp.sh

# Follow the prompts to:
# 1. Set your project ID
# 2. Enable required APIs
# 3. Configure secrets
# 4. Deploy the application
```

### Option 2: Manual Deployment

#### Step 1: Configure GCP Project
```bash
# Set your project ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com
```

#### Step 2: Create Artifact Registry
```bash
gcloud artifacts repositories create unpuzzle \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for Unpuzzle"
```

#### Step 3: Configure Secrets
```bash
# Create secrets in Secret Manager
echo -n "your-supabase-service-key" | gcloud secrets create supabase-service-key --data-file=-
echo -n "your-groq-api-key" | gcloud secrets create groq-api-key --data-file=-
echo -n "your-backblaze-key-id" | gcloud secrets create backblaze-key-id --data-file=-
echo -n "your-backblaze-key" | gcloud secrets create backblaze-key --data-file=-
echo -n "your-cdn-secret" | gcloud secrets create cdn-auth-secret --data-file=-
```

#### Step 4: Build and Deploy
```bash
# Submit build to Cloud Build
gcloud builds submit --config=cloudbuild.yaml \
    --substitutions="\
_PROJECT_ID=$PROJECT_ID,\
_NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co,\
_NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx,\
_NEXT_PUBLIC_GROQ_API_KEY=xxx,\
_NEXT_PUBLIC_APP_URL=https://your-domain.com,\
_NEXT_PUBLIC_WEBSOCKET_URL=wss://websocket-url.run.app"
```

## Configuration Files

### Required Files
1. **Dockerfile** - Multi-stage build for Next.js app
2. **Dockerfile.websocket** - WebSocket server container
3. **.dockerignore** - Excludes unnecessary files
4. **.env.example** - Environment variable template
5. **cloudbuild.yaml** - Cloud Build configuration
6. **deploy-gcp.sh** - Automated deployment script

### Environment Variables
Copy `.env.example` to `.env.local` and configure:
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

## Post-Deployment Steps

### 1. Get Service URLs
```bash
# Get deployed service URLs
gcloud run services list --region=us-central1

# Get Next.js app URL
gcloud run services describe unpuzzle-app \
    --region=us-central1 \
    --format='value(status.url)'

# Get WebSocket server URL
gcloud run services describe unpuzzle-websocket \
    --region=us-central1 \
    --format='value(status.url)'
```

### 2. Update WebSocket URL
After deployment, update the NEXT_PUBLIC_WEBSOCKET_URL and redeploy:
```bash
# Update cloudbuild.yaml with actual WebSocket URL
# Then rebuild and deploy
```

### 3. Configure Custom Domain
```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
    --service=unpuzzle-app \
    --domain=your-domain.com \
    --region=us-central1
```

### 4. Set Up CI/CD
```bash
# Create build trigger for automatic deployments
gcloud builds triggers create github \
    --repo-name=your-repo \
    --repo-owner=your-username \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml
```

## Monitoring and Debugging

### View Logs
```bash
# View Next.js app logs
gcloud logging read "resource.type=cloud_run_revision \
    AND resource.labels.service_name=unpuzzle-app" \
    --limit 50

# View WebSocket server logs
gcloud logging read "resource.type=cloud_run_revision \
    AND resource.labels.service_name=unpuzzle-websocket" \
    --limit 50
```

### Check Service Health
```bash
# Check service status
gcloud run services describe unpuzzle-app --region=us-central1

# Test WebSocket connection
wscat -c wss://your-websocket-url.run.app
```

## Cost Optimization

### Recommended Settings
- **Min instances**: 1 (to avoid cold starts)
- **Max instances**: 10 for app, 5 for WebSocket
- **CPU**: 2 vCPU for app, 1 vCPU for WebSocket
- **Memory**: 2Gi for app, 1Gi for WebSocket
- **Concurrency**: 1000 for app, 250 for WebSocket

### Estimated Monthly Costs
- Cloud Run: $20-50 (depends on traffic)
- Cloud Build: Free tier (600 build minutes/month)
- Secret Manager: < $1
- Artifact Registry: < $5

## Troubleshooting

### Common Issues

#### 1. Build Fails
```bash
# Check build logs
gcloud builds log [BUILD_ID]

# Common fixes:
# - Verify all environment variables are set
# - Check Docker build context size
# - Ensure secrets are created
```

#### 2. Service Won't Start
```bash
# Check service logs
gcloud logging read --project=$PROJECT_ID

# Common fixes:
# - Verify port 8080 is exposed
# - Check environment variables
# - Verify secrets are accessible
```

#### 3. WebSocket Connection Fails
```bash
# Ensure session affinity is enabled
gcloud run services update unpuzzle-websocket \
    --session-affinity \
    --region=us-central1

# Check CORS settings in WebSocket server
```

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use Secret Manager** for all sensitive data
3. **Enable VPC** connector for database access
4. **Set up IAM** roles properly
5. **Use HTTPS/WSS** for all connections
6. **Enable Cloud Armor** for DDoS protection
7. **Regular security audits** with Security Command Center

## Backup and Recovery

### Database Backup
- Supabase handles automatic backups
- Configure Point-in-Time Recovery in Supabase

### Application Rollback
```bash
# List all revisions
gcloud run revisions list --service=unpuzzle-app

# Rollback to previous revision
gcloud run services update-traffic unpuzzle-app \
    --to-revisions=REVISION_NAME=100
```

## Performance Optimization

### Cloud CDN Setup (Optional)
```bash
# Enable Cloud CDN for static assets
gcloud compute backend-services update unpuzzle-backend \
    --enable-cdn \
    --cache-mode=CACHE_ALL_STATIC
```

### Monitoring Setup
```bash
# Create uptime checks
gcloud monitoring uptime-check-configs create \
    --display-name="Unpuzzle App Health Check" \
    --resource-type=uptime-url \
    --monitored-resource="{'type':'uptime_url','labels':{'host':'your-domain.com'}}"
```

## Support and Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [GCP Free Tier](https://cloud.google.com/free)
- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)

## Next Steps

1. Deploy the application using the script or manual steps
2. Configure custom domain and SSL
3. Set up monitoring and alerts
4. Configure CI/CD pipeline
5. Test all features in production
6. Monitor costs and optimize

---

For issues or questions, refer to the GCP documentation or contact support.
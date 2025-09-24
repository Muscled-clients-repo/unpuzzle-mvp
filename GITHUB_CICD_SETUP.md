# GitHub CI/CD Setup for GCP Deployment

You have two options for CI/CD from GitHub to GCP:

## Option 1: GitHub Actions (Recommended)

### Prerequisites
1. GitHub repository with your code
2. GCP project with required APIs enabled
3. Service Account or Workload Identity Federation configured

### Setup Steps

#### 1. Create GCP Service Account
```bash
# Create service account
gcloud iam service-accounts create github-deploy \
    --display-name="GitHub Deploy Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

#### 2. Setup Workload Identity Federation (Recommended)
```bash
# Create workload identity pool
gcloud iam workload-identity-pools create "github-pool" \
    --location="global" \
    --display-name="GitHub pool"

# Create provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
    --location="global" \
    --workload-identity-pool="github-pool" \
    --display-name="GitHub provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --issuer-uri="https://token.actions.githubusercontent.com"

# Get provider name
WORKLOAD_IDENTITY_PROVIDER=$(gcloud iam workload-identity-pools providers describe "github-provider" \
    --location="global" \
    --workload-identity-pool="github-pool" \
    --format="value(name)")

# Allow GitHub to impersonate service account
gcloud iam service-accounts add-iam-policy-binding "github-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/$WORKLOAD_IDENTITY_PROVIDER/attribute.repository/YOUR_GITHUB_USERNAME/unpuzzle-mvp-lts"
```

#### 3. Configure GitHub Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:
- `GCP_PROJECT_ID`: Your GCP project ID
- `WIF_PROVIDER`: The workload identity provider name
- `WIF_SERVICE_ACCOUNT`: github-deploy@PROJECT_ID.iam.gserviceaccount.com
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `NEXT_PUBLIC_GROQ_API_KEY`: Your Groq API key
- `NEXT_PUBLIC_APP_URL`: Your production URL
- `NEXT_PUBLIC_WEBSOCKET_URL`: WebSocket server URL (update after first deploy)

#### 4. Alternative: Use Service Account Key (Less Secure)
If you prefer using a service account key instead of Workload Identity:

```bash
# Create key
gcloud iam service-accounts keys create key.json \
    --iam-account=github-deploy@$PROJECT_ID.iam.gserviceaccount.com

# Copy the contents of key.json
cat key.json

# Add to GitHub Secrets as GCP_SA_KEY
# Then update .github/workflows/deploy-gcp.yml to use the key method
```

#### 5. Push to Deploy
```bash
git add .
git commit -m "Add GCP deployment workflow"
git push origin main
```

The workflow will automatically:
- Build Docker images
- Push to Artifact Registry
- Deploy to Cloud Run
- Output service URLs

## Option 2: Cloud Build with GitHub Trigger

### Setup Steps

#### 1. Connect GitHub Repository
```bash
# Install Cloud Build GitHub app
# Visit: https://github.com/apps/google-cloud-build

# Create connection
gcloud builds connections create github unpuzzle-connection \
    --region=$REGION

# Link repository
gcloud builds repositories create unpuzzle-repo \
    --connection=unpuzzle-connection \
    --region=$REGION \
    --github-repo=YOUR_GITHUB_USERNAME/unpuzzle-mvp-lts
```

#### 2. Create Build Trigger
```bash
# Using the configuration file
gcloud builds triggers create github \
    --config-from-file=cloud-build-trigger.json \
    --region=$REGION

# Or manually
gcloud builds triggers create github \
    --repo-name=unpuzzle-mvp-lts \
    --repo-owner=YOUR_GITHUB_USERNAME \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml \
    --name=unpuzzle-deploy \
    --region=$REGION
```

#### 3. Configure Substitution Variables
In GCP Console → Cloud Build → Triggers → Edit trigger

Add substitution variables:
- `_NEXT_PUBLIC_SUPABASE_URL`
- `_NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `_NEXT_PUBLIC_GROQ_API_KEY`
- `_NEXT_PUBLIC_APP_URL`
- `_NEXT_PUBLIC_WEBSOCKET_URL`

#### 4. Test Trigger
```bash
# Manual trigger
gcloud builds triggers run unpuzzle-deploy \
    --branch=main \
    --region=$REGION

# Or push to GitHub
git push origin main
```

## Deployment Environments

### Multiple Environments
Create separate workflows/triggers for different environments:

```yaml
# .github/workflows/deploy-staging.yml
on:
  push:
    branches: [staging]
env:
  SERVICE_NAME: unpuzzle-app-staging

# .github/workflows/deploy-production.yml
on:
  push:
    branches: [main]
env:
  SERVICE_NAME: unpuzzle-app-production
```

### Branch Protection
Protect your main branch:
1. Go to Settings → Branches
2. Add rule for `main`
3. Enable:
   - Require PR reviews
   - Require status checks
   - Require branches to be up to date

## Monitoring Deployments

### GitHub Actions
- Check Actions tab in GitHub
- View workflow runs
- Check logs for each step

### Cloud Build
```bash
# List builds
gcloud builds list --limit=10

# View build logs
gcloud builds log [BUILD_ID]

# Stream logs
gcloud builds log [BUILD_ID] --stream
```

## Rollback Strategy

### Quick Rollback
```bash
# List Cloud Run revisions
gcloud run revisions list --service=unpuzzle-app

# Rollback to previous revision
gcloud run services update-traffic unpuzzle-app \
    --to-revisions=PREVIOUS_REVISION=100 \
    --region=$REGION
```

### GitHub Revert
```bash
# Revert commit
git revert HEAD
git push origin main

# Or revert PR in GitHub UI
```

## Best Practices

1. **Secrets Management**
   - Never commit secrets
   - Use GitHub Secrets for GitHub Actions
   - Use Secret Manager for runtime secrets

2. **Testing**
   - Add test step before deployment
   - Use staging environment first
   - Implement smoke tests

3. **Monitoring**
   - Set up alerts for failed deployments
   - Monitor application after deployment
   - Use Cloud Monitoring

4. **Security**
   - Use Workload Identity Federation over service account keys
   - Regularly rotate secrets
   - Audit deployment permissions

## Troubleshooting

### GitHub Actions Fails
```bash
# Check workflow syntax
act -l  # Using act tool locally

# Validate workflow
# Use GitHub's workflow editor for syntax checking
```

### Cloud Build Fails
```bash
# Check trigger configuration
gcloud builds triggers describe unpuzzle-deploy

# Test locally
gcloud builds submit --config=cloudbuild.yaml
```

### Permission Issues
```bash
# Check service account permissions
gcloud projects get-iam-policy $PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:github-deploy@$PROJECT_ID.iam.gserviceaccount.com"

# Add missing permission
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/MISSING_ROLE"
```

## Next Steps
1. Choose deployment method (GitHub Actions recommended)
2. Set up authentication (Workload Identity recommended)
3. Configure secrets in GitHub
4. Test deployment with a push to main
5. Set up monitoring and alerts

For more information:
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
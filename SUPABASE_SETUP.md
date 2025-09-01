# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or login
3. Click "New Project"
4. Fill in:
   - Project name: `unpuzzle-mvp`
   - Database Password: (save this securely)
   - Region: Choose closest to you
5. Click "Create new project"

## 2. Get Your API Keys

1. Go to Settings → API
2. Copy these values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon/Public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## 3. Create .env.local File

Create `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 4. Run Database Migration

1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `/supabase/migrations/001_initial_schema.sql`
3. Paste and run in SQL Editor
4. Verify tables created:
   - `profiles`
   - `subscriptions`

## 5. Configure Authentication

1. Go to Authentication → Providers
2. Enable Email provider (should be on by default)
3. For Google OAuth:
   - Enable Google
   - Add Google Client ID and Secret
   - Add callback URL: `https://your-project.supabase.co/auth/v1/callback`
4. For GitHub OAuth:
   - Enable GitHub
   - Add GitHub Client ID and Secret
   - Add callback URL: `https://your-project.supabase.co/auth/v1/callback`

## 6. Configure Auth Settings

1. Go to Authentication → URL Configuration
2. Set Site URL: `http://localhost:3000` (for development)
3. Add Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/*`

## 7. Test Authentication

1. Start dev server: `npm run dev`
2. Go to `/signup`
3. Create a test account
4. Verify in Supabase Dashboard:
   - Authentication → Users (should see new user)
   - Table Editor → profiles (should see profile)
   - Table Editor → subscriptions (should see free subscription)

## Troubleshooting

### "Invalid API key" error
- Double-check your .env.local values
- Restart dev server after changing .env.local

### OAuth not redirecting properly
- Check redirect URLs in Supabase dashboard
- Ensure callback URL matches exactly

### User created but no profile
- Check SQL migration ran successfully
- Check trigger `on_auth_user_created` exists

### RLS blocking access
- Check policies in Table Editor → RLS Policies
- Temporarily disable RLS to test (re-enable after!)

## Next Steps

After auth is working:
1. Test all auth flows (signup, login, logout, OAuth)
2. Replace remaining "user-1" hardcoded IDs
3. Implement role-based access control
4. Add protected API routes
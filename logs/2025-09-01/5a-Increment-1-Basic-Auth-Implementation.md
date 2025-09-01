# Increment 1: Basic Auth Implementation Plan
**Date:** September 1, 2025  
**Goal:** Replace "user-1" with real authentication  
**Timeline:** Day 1-2  
**Success Metric:** Users can sign up, log in, and their ID flows through the entire app

---

## 🎯 Objective

Transform the app from hardcoded user IDs to real authentication. After this increment, every "user-1" in the codebase will be replaced with actual authenticated user IDs from Supabase.

---

## 📐 Database Schema

### **Step 1.1: Enable Supabase Auth**

Navigate to Supabase Dashboard → Authentication → Providers

Enable:
- Email/Password (required)
- Google OAuth (optional but recommended)
- Magic Link (optional)

Settings to configure:
- Confirm email: Disabled (for speed)
- Minimum password length: 8
- Enable signup: Yes
- JWT expiry: 604800 (1 week)

### **Step 1.2: Create Profiles Table**

SQL to execute in Supabase SQL Editor:

```sql
-- Create profiles table that extends auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX profiles_role_idx ON public.profiles(role);
CREATE INDEX profiles_email_idx ON public.profiles(email);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view profiles (for instructor info, etc)
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Only the user can insert their own profile (handled by trigger mostly)
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);
```

### **Step 1.3: Create Profile Trigger**

This automatically creates a profile when a user signs up:

```sql
-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update profile timestamp
CREATE OR REPLACE FUNCTION public.handle_profile_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_updated();
```

### **Step 1.4: Create Subscription Table (Minimal)**

For now, just track subscription status:

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'team')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  ai_credits INTEGER DEFAULT 10,
  ai_credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" 
  ON public.subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

-- Trigger to create free subscription on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_subscription();
```

---

## 🔌 Frontend Integration

### **Step 1.5: Install Supabase Client**

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### **Step 1.6: Create Supabase Client**

Create `/src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `/src/lib/supabase/server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

### **Step 1.7: Create Auth Context**

Create `/src/contexts/auth-context.tsx`:

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type AuthContextType = {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, name?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name?: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })
    
    if (error) throw error
    
    // Update profile with name if provided
    if (data.user && name) {
      await supabase
        .from('profiles')
        .update({ name })
        .eq('id', data.user.id)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    router.push('/student') // Default to student dashboard
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### **Step 1.8: Update Root Layout**

Wrap app with AuthProvider in `/src/app/layout.tsx`:

```typescript
import { AuthProvider } from '@/contexts/auth-context'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### **Step 1.9: Update Login Page**

Replace fake login with real auth in `/src/app/login/page.tsx`:

Key changes:
- Import useAuth hook
- Replace setTimeout with actual signIn
- Add error handling
- Add signup flow

### **Step 1.10: Create Protected Route Middleware**

Create `/src/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Protect routes
  if (!session && (
    request.nextUrl.pathname.startsWith('/student') ||
    request.nextUrl.pathname.startsWith('/instructor') ||
    request.nextUrl.pathname.startsWith('/admin')
  )) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

---

## 🔄 Replace Hardcoded User IDs

### **Step 1.11: Find All Hardcoded IDs**

Run this command to find all instances:

```bash
grep -r "user-1\|user-default\|user-demo" src/ --include="*.ts" --include="*.tsx"
```

Expected locations:
- `/src/app/student/courses/page.tsx`
- `/src/app/student/reflections/page.tsx`
- `/src/services/student-video-service.ts`
- `/src/stores/slices/ai-slice.ts`
- Multiple other services

### **Step 1.12: Replace with Auth User**

Pattern to replace everywhere:

**Before:**
```typescript
const userId = 'user-1'
```

**After:**
```typescript
const { user } = useAuth()
const userId = user?.id
```

For services, pass userId from component:

**Before:**
```typescript
loadEnrolledCourses('user-1')
```

**After:**
```typescript
const { user } = useAuth()
if (user) {
  loadEnrolledCourses(user.id)
}
```

### **Step 1.13: Update Store Slices**

Update Zustand stores to accept userId parameter instead of hardcoding.

Key files to update:
- `/src/stores/slices/student-course-slice.ts`
- `/src/stores/slices/instructor-course-slice.ts`
- `/src/stores/slices/ai-slice.ts`

---

## 🧪 Testing Checklist

### **Database Tests**
- [ ] Can create user via Supabase dashboard
- [ ] Profile automatically created on signup
- [ ] Subscription automatically created
- [ ] RLS policies work (test in SQL editor)

### **Auth Flow Tests**
- [ ] Can sign up with email/password
- [ ] Can log in with correct credentials
- [ ] Cannot log in with wrong password
- [ ] Session persists on refresh
- [ ] Logout clears session

### **Frontend Integration Tests**
- [ ] User ID shows in UI (not "user-1")
- [ ] Protected routes redirect to login
- [ ] After login, redirect to correct dashboard
- [ ] Profile data loads correctly
- [ ] No hardcoded IDs remain

### **Data Flow Tests**
- [ ] Courses load for logged-in user
- [ ] Progress saves with real user ID
- [ ] AI chat uses real user ID
- [ ] All services receive correct user ID

---

## 🚨 Common Issues & Solutions

### **Issue: Profile not created on signup**
- Check trigger is enabled
- Check function has SECURITY DEFINER
- Check RLS policies allow insert

### **Issue: Session not persisting**
- Check cookies are being set
- Check middleware is running
- Check auth provider is wrapping app

### **Issue: RLS blocking access**
- Test policies with different user IDs
- Check auth.uid() is being passed
- Temporarily disable RLS to debug

### **Issue: Hardcoded ID still showing**
- Search entire codebase again
- Check mock data files
- Check service layer defaults

---

## 📊 Success Metrics

### **Must Work**
- Zero "user-1" strings in running app
- Login/logout cycle works
- Session persists across refreshes
- Protected routes enforce auth

### **Should Work**
- Google OAuth login
- Profile updates save
- Role field populated correctly
- Subscription created automatically

### **Nice to Have**
- Email verification
- Password reset flow
- Profile picture upload
- Remember me checkbox

---

## 🎬 Demo Script

1. **Show current state:** Open app, show "user-1" everywhere
2. **Sign up:** Create new account with email/password
3. **Check database:** Show profile and subscription created
4. **Log in:** Sign out and back in
5. **Show user ID:** Display real UUID in UI
6. **Test protection:** Try accessing /student while logged out
7. **Check persistence:** Refresh page, still logged in
8. **Different user:** Create second account, show different ID

---

## ✅ Completion Criteria

**Increment 1 is complete when:**

1. All hardcoded user IDs are removed
2. Users can sign up and log in
3. Session persists across refreshes
4. Protected routes require authentication
5. Profile and subscription are auto-created
6. Real user IDs flow through entire app
7. No auth-related errors in console
8. Can demo full auth flow

**Do not proceed to Increment 2 until all criteria are met.**

---

## 🚀 Next Steps (After Completion)

Once Increment 1 is verified working:

1. Commit all changes with message: "Increment 1: Basic auth implementation complete"
2. Deploy to staging environment
3. Have team members test login
4. Document any issues found
5. Fix issues before proceeding
6. Create plan for Increment 2: Role-Based Access

---

## 📝 Notes for Implementation

- Start with database schema first - get it right
- Test RLS policies thoroughly in Supabase dashboard
- Add console.logs during development to track user ID flow
- Keep the old mock auth commented out (don't delete yet)
- Test on multiple browsers to ensure cookies work
- Have fallback to mock data if auth fails (temporarily)

Remember: This increment is the foundation. Take time to get it right. Everything else builds on this.
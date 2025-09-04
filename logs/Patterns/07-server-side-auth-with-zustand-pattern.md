# Server-Side Authentication with Zustand Pattern

## Overview
This document outlines the proper authentication flow using server-side auth with Zustand as the Single Source of Truth (SSOT) for client-side state management in our Next.js 14 App Router application.

## Core Architecture Principles

### 1. Server-Side First
- **All authentication happens on the server** via cookies and middleware
- **No client-side Supabase auth calls** - everything goes through server actions or API routes
- **Cookies store JWT tokens** (httpOnly, secure) - not localStorage or sessionStorage
- **Middleware validates every request** before it reaches pages

### 2. Zustand as Client-Side SSOT
- **Zustand hydrates from server state** - never initiates auth itself
- **Components read from Zustand** - never make direct auth calls
- **State updates through server actions** - maintain consistency

## Current Implementation Flow

### 1. Initial Page Load
```
Browser Request → Middleware → Server Component → Client Hydration
```

**Detailed Steps:**
1. **Middleware** (`/src/middleware.ts`)
   - Reads auth cookies via `createServerClient`
   - Validates session with `supabase.auth.getUser()`
   - Checks role permissions and active-role cookie
   - Redirects if unauthorized or wrong role

2. **Page Loads**
   - Server components can access auth via `createClient()` from `@/lib/supabase/server`
   - Client components initialize via `useAuthInit()` hook

3. **Zustand Hydration** (`/src/stores/slices/auth-slice.ts`)
   ```typescript
   initializeAuth: async () => {
     const response = await fetch('/api/auth/session')
     const data = await response.json()
     
     if (data.user) {
       setUser(data.user)
       setProfile(data.profile)
     }
   }
   ```

4. **Session API** (`/src/app/api/auth/session/route.ts`)
   - Uses server-side `createClient()` to get authenticated user
   - Returns user and profile data
   - No client-side auth needed

### 2. Login Flow
```
Login Form → Server Action → Set Cookies → Redirect → Zustand Hydrates
```

**Implementation:**
```typescript
// Client submits to auth-slice
signIn(email, password)
  → POST /api/auth/signin
    → Server validates with Supabase
    → Sets session cookies
    → Returns user/profile
  → Updates Zustand state
  → Redirects based on role
```

### 3. Role Switching
```
Switch Role → Update Cookie → Hard Navigation → Middleware Validates → Zustand Re-hydrates
```

**Implementation:**
```typescript
// Client calls API
POST /api/switch-role
  → Server validates permissions
  → Updates active-role cookie
  → Returns success
→ window.location.href = '/instructor'
  → Middleware checks new role
  → Page loads with new context
  → Zustand re-initializes
```

### 4. Data Fetching with Auth
```
Component → Zustand User → Server Action → Database Query
```

**Example - Loading Courses:**
```typescript
// Component
const { user, courses, loadCourses } = useAppStore()
useEffect(() => {
  loadCourses(user?.id)  // Pass user ID from Zustand
}, [user?.id])

// Instructor Slice
loadCourses: async (instructorId) => {
  const courses = await getInstructorCourses(instructorId)  // Server action
  set({ courses })
}

// Server Action
'use server'
export async function getInstructorCourses(instructorId: string) {
  const supabase = await createClient()  // Server-side client
  const { data } = await supabase
    .from('instructor_courses_view')
    .select('*')
    .eq('instructor_id', instructorId)
  return data
}
```

## Key Files and Their Roles

### Server-Side Auth
- **`/src/middleware.ts`** - Route protection and role validation
- **`/src/lib/supabase/server.ts`** - Server-side Supabase client
- **`/src/app/api/auth/*`** - Auth API routes (signin, signout, session, switch-role)
- **`/src/app/actions/*`** - Server actions for data fetching

### Client-Side State
- **`/src/stores/slices/auth-slice.ts`** - Auth state management (hydrates from server)
- **`/src/hooks/use-auth-init.ts`** - Initializes auth on mount and focus
- **`/src/stores/app-store.ts`** - Combined Zustand store

## Patterns to Follow

### ✅ DO's

1. **Always use server actions for data fetching**
```typescript
// GOOD - Server action
'use server'
export async function getUserData(userId: string) {
  const supabase = await createClient()
  return await supabase.from('users').select('*').eq('id', userId)
}
```

2. **Get user from Zustand in components**
```typescript
// GOOD - Read from Zustand
const { user } = useAppStore()
```

3. **Use middleware for route protection**
```typescript
// GOOD - Middleware handles auth
// Routes are automatically protected via middleware.ts
```

4. **Pass user ID to server actions**
```typescript
// GOOD - Pass ID, let server validate
await updateProfile(user.id, profileData)
```

### ❌ DON'Ts

1. **Never use client-side Supabase auth**
```typescript
// BAD - Client-side auth
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
const { data } = await supabase.auth.getSession()  // ❌ Don't do this
```

2. **Never store auth in localStorage**
```typescript
// BAD - localStorage for auth
localStorage.setItem('token', token)  // ❌ Use cookies instead
```

3. **Never bypass Zustand for auth state**
```typescript
// BAD - Direct API call in component
const user = await fetch('/api/auth/session')  // ❌ Use Zustand
```

4. **Never trust client-side user data**
```typescript
// BAD - Trust client state for permissions
if (user.role === 'admin') { /* do admin stuff */ }  // ❌ Validate server-side
```

## Adding New Features

### When adding a new authenticated feature:

1. **Create a server action**
```typescript
// /src/app/actions/feature-name.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function getFeatureData(userId: string) {
  const supabase = await createClient()
  
  // Server validates the user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    throw new Error('Unauthorized')
  }
  
  // Fetch data with RLS policies
  return await supabase.from('feature_table').select('*')
}
```

2. **Add to Zustand slice if needed**
```typescript
// /src/stores/slices/feature-slice.ts
interface FeatureSlice {
  data: any[]
  loadData: (userId: string) => Promise<void>
}

export const createFeatureSlice = (set, get) => ({
  data: [],
  
  loadData: async (userId: string) => {
    const data = await getFeatureData(userId)  // Server action
    set({ data })
  }
})
```

3. **Use in component**
```typescript
// /src/app/feature/page.tsx
export default function FeaturePage() {
  const { user, data, loadData } = useAppStore()
  
  useEffect(() => {
    if (user?.id) {
      loadData(user.id)
    }
  }, [user?.id])
  
  return <div>{/* render data */}</div>
}
```

## Common Scenarios

### Checking if user is authenticated
```typescript
const { user, loading } = useAppStore()

if (loading) return <LoadingSpinner />
if (!user) return <Redirect to="/login" />
```

### Getting user role
```typescript
const { profile } = useAppStore()
const userRole = profile?.role || 'student'
```

### Protecting admin features
```typescript
// Server action (always validate server-side)
export async function adminAction(userId: string) {
  const supabase = await createClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
    
  if (profile?.role !== 'admin') {
    throw new Error('Admin access required')
  }
  
  // Proceed with admin action
}
```

### Handling auth errors
```typescript
// In component
try {
  await someAuthAction()
} catch (error) {
  if (error.message === 'Unauthorized') {
    // Re-initialize auth (might have expired)
    await initializeAuth()
  }
}
```

## Benefits of This Pattern

1. **Security** - All auth validation happens server-side
2. **Performance** - No client-side auth delays
3. **Consistency** - Single source of truth (server → Zustand)
4. **SSR Compatible** - Works with Next.js server components
5. **Simple DX** - Components just read from Zustand
6. **Type Safety** - TypeScript types flow through the system

## Migration Notes

If you find old code using client-side auth:

1. **Replace `createClient()` from client with server action**
2. **Move auth logic to API route or server action**
3. **Update component to read from Zustand**
4. **Ensure middleware handles route protection**

## Testing Auth Flows

### Local Development
```bash
# Check auth state
console.log(useAppStore.getState().user)

# Check cookies
document.cookie  # Won't show httpOnly cookies

# Check middleware logs
# See terminal output for [AUTH] prefixed logs
```

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Infinite loading | Client-side auth timeout | Use server-side auth |
| Wrong user data | Stale Zustand state | Call `initializeAuth()` |
| 401 on API calls | Expired session | Middleware will redirect to login |
| Role switch not working | Cookie not updated | Check `/api/switch-role` response |
| Slow page loads | Client-side auth | Use server actions |

## Summary

The key principle: **Server validates, Zustand distributes, Components consume**

- Authentication is a server concern
- Zustand is for client-side state distribution
- Components should be auth-agnostic (just read from store)
- Always validate permissions server-side
- Use cookies for auth tokens, not localStorage
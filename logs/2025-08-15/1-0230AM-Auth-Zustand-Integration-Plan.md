# Auth & Zustand Proper Integration Plan

**Date:** 2025-08-15  
**Time:** 02:30 AM EST  
**Purpose:** Full integration of Supabase Auth with Zustand store following domain.ts types

## Current State Analysis

### What We Have Working
- ✅ Supabase auth functional (signup, login, email confirmation)
- ✅ Profile creation in database
- ✅ Session management with timeout (prevents hanging)
- ✅ Clean UI at `/auth/login`

### What's Missing
- ❌ No Zustand integration - auth state is isolated
- ❌ Not using domain.ts User type properly
- ❌ No subscription object creation
- ❌ Components expecting `useAppStore().profile` get null
- ❌ Header shows wrong auth state

## Integration Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  Supabase Auth  │────▶│ Auth Service │────▶│   Zustand   │
│   (Database)    │     │  (Transform) │     │    Store    │
└─────────────────┘     └──────────────┘     └─────────────┘
                               │                     │
                               ▼                     ▼
                        ┌──────────────┐     ┌─────────────┐
                        │  domain.ts   │     │ Components  │
                        │  User Type   │     │  use store  │
                        └──────────────┘     └─────────────┘
```

## Phase 1: Create Auth Service Layer (45 min)

### 1.1 Create `/src/services/auth/auth-service.ts`
```typescript
// Responsibilities:
// - Handle all Supabase auth operations
// - Transform database types to domain.ts types
// - Update Zustand store on auth changes
// - Single source of truth for auth logic

Key Methods:
- signUp(email, password, name) → User
- signIn(email, password) → User  
- signOut() → void
- getCurrentUser() → User | null
- createUserFromSupabase(supabaseUser, profile) → User
- initializeAuthListener() → void
```

### 1.2 Type Transformations
```typescript
// Database (snake_case) → Domain (camelCase)
profiles table → User interface
subscriptions table → Subscription interface
user_preferences → UIPreferences interface
```

### 1.3 Default Object Creation
```typescript
// When user signs up, create:
const defaultSubscription: Subscription = {
  id: generateId(),
  userId: user.id,
  plan: 'free',
  status: 'trial',
  currentPeriodEnd: addDays(30),
  aiCredits: 10,
  aiCreditsUsed: 0,
  maxCourses: 1,
  features: ['basic_ai', 'single_course']
}
```

## Phase 2: Update Zustand User Slice (30 min)

### 2.1 Enhance `/src/stores/slices/user-slice.ts`
```typescript
interface UserSlice {
  // State
  user: User | null  // Full domain User object
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setUser: (user: User | null) => void
  updateUser: (updates: Partial<User>) => void
  clearUser: () => void
  
  // Auth actions (delegate to service)
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}
```

### 2.2 Initialize Auth on App Start
```typescript
// In app layout or provider:
useEffect(() => {
  authService.initializeAuthListener()
}, [])
```

## Phase 3: Create Auth Hooks (20 min)

### 3.1 Create `/src/hooks/useAuth.ts`
```typescript
export function useAuth() {
  const user = useAppStore(state => state.user)
  const isAuthenticated = useAppStore(state => state.isAuthenticated)
  const signIn = useAppStore(state => state.signIn)
  const signUp = useAppStore(state => state.signUp)
  const signOut = useAppStore(state => state.signOut)
  
  return {
    user,
    isAuthenticated,
    isStudent: user?.role === 'student',
    isInstructor: user?.role === 'instructor',
    isModerator: user?.role === 'moderator',
    signIn,
    signUp,
    signOut
  }
}
```

### 3.2 Create `/src/hooks/useRequireAuth.ts`
```typescript
// Redirect to login if not authenticated
export function useRequireAuth(role?: UserRole) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    } else if (role && user?.role !== role) {
      router.push('/unauthorized')
    }
  }, [isAuthenticated, user, role])
  
  return { user, isAuthenticated }
}
```

## Phase 4: Update Components (30 min)

### 4.1 Update Header Component
```typescript
// /src/components/layout/header.tsx
export function Header() {
  const { user, isAuthenticated, signOut } = useAuth()
  
  return (
    <header>
      {isAuthenticated ? (
        <UserMenu user={user} onSignOut={signOut} />
      ) : (
        <Link href="/auth/login">Sign In</Link>
      )}
    </header>
  )
}
```

### 4.2 Update Protected Routes
```typescript
// /src/app/student/layout.tsx
export default function StudentLayout({ children }) {
  const { user } = useRequireAuth('student')
  
  if (!user) return null // or loading spinner
  
  return (
    <div>
      <Header />
      <Sidebar user={user} />
      {children}
    </div>
  )
}
```

### 4.3 Update Login Page
```typescript
// /src/app/auth/login/page.tsx
export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const router = useRouter()
  
  const handleSubmit = async () => {
    await signIn(email, password)
    router.push('/student')
  }
}
```

## Phase 5: Database Sync (20 min)

### 5.1 Ensure Database Tables Match Domain
```sql
-- profiles table should have:
- id (uuid)
- email (text)
- name (text)
- avatar (text nullable)
- role (user_role)
- created_at (timestamptz)
- updated_at (timestamptz)

-- subscriptions table should have:
- id (uuid)
- user_id (uuid)
- plan (subscription_plan)
- status (subscription_status)
- current_period_end (timestamptz)
- ai_credits (integer)
- ai_credits_used (integer)
- max_courses (integer)
- features (text[])
```

### 5.2 Add RLS Policies
```sql
-- Users can read their own data
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

## Phase 6: Testing & Migration (30 min)

### 6.1 Test Checklist
- [ ] Sign up creates User in Zustand store
- [ ] Sign in populates User in store
- [ ] Sign out clears User from store
- [ ] Header shows correct auth state
- [ ] Protected routes redirect when not authenticated
- [ ] User object matches domain.ts interface
- [ ] Subscription is created with defaults
- [ ] Profile updates sync to store

### 6.2 Migration Steps
1. Deploy database changes
2. Update auth service
3. Update Zustand store
4. Update hooks
5. Update components one by one
6. Test each component after update

## Implementation Order

1. **Start with auth service** - Core logic first
2. **Update Zustand slice** - State management
3. **Create hooks** - Clean API for components
4. **Update Header** - Most visible component
5. **Update login page** - Entry point
6. **Update protected routes** - One at a time
7. **Test everything** - Full flow

## Success Criteria

✅ All auth operations update Zustand store  
✅ User object always matches domain.ts type  
✅ Components get user from store, not props  
✅ No direct Supabase calls in components  
✅ Single source of truth for auth state  
✅ Proper TypeScript types throughout  
✅ Clean separation of concerns  

## Risk Mitigation

- **Keep old auth working** until new is tested
- **Feature flag** for gradual rollout
- **Backup current working code** before changes
- **Test on staging** before production
- **Monitor errors** after deployment

## Estimated Time

**Total: 3 hours**
- Phase 1: 45 minutes
- Phase 2: 30 minutes  
- Phase 3: 20 minutes
- Phase 4: 30 minutes
- Phase 5: 20 minutes
- Phase 6: 30 minutes
- Buffer: 25 minutes

## Next Steps

1. Review this plan
2. Create feature branch `auth-zustand-integration`
3. Implement Phase 1 (auth service)
4. Test Phase 1 thoroughly
5. Continue with subsequent phases

## Notes

- Pattern follows `muscled-desktop-app-2` successful implementation
- Uses `getSession()` not `getUser()` to avoid hanging
- Transforms snake_case to camelCase for domain consistency
- Creates proper Subscription object on signup
- Maintains backwards compatibility during migration
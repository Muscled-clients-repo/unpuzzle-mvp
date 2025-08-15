# Gradual Backend Integration Plan with Manual Verification Gates

**Date:** August 13, 2025  
**Branch:** `supabase-integration`  
**Critical:** This plan includes HARD STOPS that require manual verification before proceeding

---

## 🛑 CRITICAL RULES

1. **NEVER proceed to next step without explicit confirmation**
2. **Each HARD STOP requires user to type "CONFIRMED" before continuing**
3. **If any test fails, STOP immediately and wait for instructions**
4. **Create a PR after each phase and wait for merge approval**
5. **Do NOT assume anything is working - verify everything**

---

# PHASE 1: AUTHENTICATION SETUP

## Step 1.1: Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### Deliverables:
- [ ] Package installed
- [ ] No dependency conflicts
- [ ] Build still works

### 🛑 HARD STOP #1
**DO NOT PROCEED UNTIL USER CONFIRMS:**
- [ ] npm install completed without errors
- [ ] npm run dev starts without errors
- [ ] No console errors in browser

**User must type:** "CONFIRMED STEP 1.1"

---

## Step 1.2: Create Supabase Client Configuration

### Files to create:
1. `src/lib/supabase/client.ts` - Browser client
2. `src/lib/supabase/server.ts` - Server client (if needed)

### Code to implement:
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 🛑 HARD STOP #2
**DO NOT PROCEED UNTIL USER CONFIRMS:**
- [ ] Supabase client file created
- [ ] Environment variables are loaded correctly
- [ ] No TypeScript errors
- [ ] Console.log shows client initialized

**User must type:** "CONFIRMED STEP 1.2"

---

## Step 1.3: Create Basic Auth Service (Hybrid Mode)

### Create `src/services/auth/auth-service.ts`

This service will:
1. Check if Supabase is available
2. Fall back to mock if not
3. Log all operations for debugging

### 🛑 HARD STOP #3
**MANUAL TESTING REQUIRED:**

User must test:
1. Open browser console
2. Try to log in with mock credentials
3. Verify you see: "Using mock auth" in console
4. Verify login still works as before

**User must type:** "CONFIRMED STEP 1.3 - Mock auth still works"

---

## Step 1.4: Implement Supabase Auth (Coexistence Mode)

### Add Supabase auth methods WITHOUT removing mock:

```typescript
// Both systems work side by side
if (email.endsWith('@test.com')) {
  // Use mock for test accounts
  return mockAuth(email, password)
} else {
  // Use Supabase for real accounts
  return supabaseAuth(email, password)
}
```

### 🛑 HARD STOP #4
**CRITICAL VERIFICATION:**

1. **Test Mock Path:**
   - [ ] Login with `test@test.com` → Uses mock
   - [ ] See "Using mock auth" in console
   - [ ] User lands on dashboard

2. **Test Supabase Path:**
   - [ ] Create test account in Supabase dashboard
   - [ ] Login with real email → Uses Supabase
   - [ ] See "Using Supabase auth" in console
   - [ ] Check Supabase dashboard shows active user

**User must type:** "CONFIRMED STEP 1.4 - Both auth systems work"

---

## Step 1.5: Update Zustand User Store for Auth

### Update existing user-slice.ts to handle Supabase auth alongside mock auth

**Required changes to src/stores/slices/user-slice.ts:**
1. Add `isLoading` state to UserState interface (keep existing structure)
2. Add new auth methods to UserActions interface:
   - `checkAuth()` - verify Supabase session on app load
   - `loginWithOAuth()` - handle Google/LinkedIn login
   - Keep existing `setUser()` and `logout()` methods
3. Update implementation in `createUserSlice` to handle both mock and Supabase

**Example following your pattern:**
```typescript
// In user-slice.ts - following your existing pattern
interface UserState {
  id: string | null
  profile: User | null  // Keep as-is
  preferences: UIPreferences
  progress: { [courseId: string]: CourseProgress }
  isLoading?: boolean  // Add this
  // Keep other existing state
}

interface UserActions {
  setUser: (profile: User) => void  // Keep existing
  logout: () => void  // Keep existing
  // Add new auth methods:
  checkAuth: () => Promise<void>
  loginWithOAuth: (provider: 'google' | 'linkedin_oidc') => Promise<void>
  // Keep other existing methods
}

// Components will continue using: useAppStore((state) => state.profile)
```

### 🛑 HARD STOP #5
**FULL APP TEST REQUIRED:**

Navigate through ENTIRE app and verify:
- [ ] Protected routes still work
- [ ] User menu shows correct info
- [ ] Role-based access works
- [ ] Logout works
- [ ] Session persists on refresh

**User must type:** "CONFIRMED STEP 1.5 - Full app navigation works"

---

## Step 1.6: Database Migration for Profiles

### Create migration file: `001_profiles.sql`

```sql
-- Only basic fields first
create table profiles (
  id uuid references auth.users primary key,
  email text unique not null,
  name text,
  role text default 'student'
);
```

### 🛑 HARD STOP #6
**DATABASE VERIFICATION:**

1. Run migration in Supabase dashboard
2. Check table created successfully
3. Create test user via UI
4. Verify profile row created

**User must screenshot Supabase dashboard showing profiles table**
**User must type:** "CONFIRMED STEP 1.6 - Database migration successful"

---

## Step 1.7: Git Commit & PR

### Commands to run:
```bash
git add .
git commit -m "Phase 1: Auth - Hybrid mock/Supabase implementation"
git push origin supabase-integration
```

### Create PR with checklist:
- [ ] Mock auth still works
- [ ] Supabase auth works for new accounts
- [ ] No UI regressions
- [ ] All tests pass
- [ ] Console has no errors

### 🛑 HARD STOP #7
**PR REVIEW REQUIRED:**

DO NOT MERGE UNTIL:
1. User reviews all changed files
2. User tests on fresh clone
3. User confirms ready to merge

**User must type:** "CONFIRMED MERGE PHASE 1"

---

# ⚠️ WAIT FOR MERGE CONFIRMATION

**DO NOT START PHASE 2 UNTIL:**
1. PR is merged to main
2. Main branch is pulled locally
3. Production (if deployed) is verified working

---

# PHASE 2: COURSES (READ-ONLY)

## Step 2.1: Create Courses Table

### 🛑 HARD STOP #8
**PRE-PHASE CHECKPOINT:**

Before starting Phase 2:
- [ ] Phase 1 is merged to main
- [ ] You're on a new branch from updated main
- [ ] Auth is working in production/main

**User must type:** "CONFIRMED READY FOR PHASE 2"

---

## Step 2.2: Migrate Course Data

### Create migration: `002_courses.sql`

### 🛑 HARD STOP #9
**DATA VERIFICATION:**

After migration:
1. Screenshot Supabase showing course data
2. Verify all fields populated correctly
3. Test query in SQL editor

**User must type:** "CONFIRMED STEP 2.2 - Course data migrated"

---

## Step 2.3: Create Hybrid Course Service

### Implement service that:
1. Tries to fetch from Supabase
2. Falls back to mock if error
3. Logs which source is used

### 🛑 HARD STOP #10
**SERVICE VERIFICATION:**

Test scenarios:
1. [ ] With Supabase URL correct → Returns Supabase data
2. [ ] With Supabase URL wrong → Returns mock data
3. [ ] With network disabled → Returns mock data

**User must type:** "CONFIRMED STEP 2.3 - Hybrid service works"

---

## Step 2.4: Update Course Listing Page

### 🛑 HARD STOP #11
**UI VERIFICATION:**

Check course listing page:
- [ ] All courses display
- [ ] Images load
- [ ] Filters work
- [ ] Search works
- [ ] Click to course detail works

**User must type:** "CONFIRMED STEP 2.4 - Course listing works"

---

## Step 2.5: Update Course Detail Page

### 🛑 HARD STOP #12
**DETAILED PAGE CHECK:**

On course detail page verify:
- [ ] Course info displays
- [ ] Video list shows
- [ ] Instructor info shows
- [ ] Enroll button works (even if mock)

**User must type:** "CONFIRMED STEP 2.5 - Course details work"

---

## Step 2.6: Performance Check

### 🛑 HARD STOP #13
**PERFORMANCE VERIFICATION:**

Compare load times:
1. Note time with mock data: _____ms
2. Note time with Supabase: _____ms
3. Difference acceptable? (< 500ms)

**User must type:** "CONFIRMED STEP 2.6 - Performance acceptable"

---

## Step 2.7: Create PR for Phase 2

### 🛑 HARD STOP #14
**PHASE 2 PR REVIEW:**

PR Checklist:
- [ ] Course listing works
- [ ] Course details work
- [ ] Mock fallback works
- [ ] No console errors
- [ ] Performance acceptable

**User must type:** "CONFIRMED MERGE PHASE 2"

---

# ⚠️ STOP PATTERN

**For EVERY subsequent phase:**

1. **Pre-Phase Hard Stop:** Confirm previous phase merged and working
2. **Implementation Hard Stops:** Test each feature
3. **Integration Hard Stop:** Test with full app
4. **Performance Hard Stop:** Verify no degradation
5. **PR Hard Stop:** Review and approve merge

---

# PHASE 3: COURSES (WRITE OPERATIONS)

### 🛑 WILL NOT START UNTIL: "CONFIRMED READY FOR PHASE 3"

---

# PHASE 4: VIDEO PROGRESS

### 🛑 WILL NOT START UNTIL: "CONFIRMED READY FOR PHASE 4"

---

# PHASE 5: AI FEATURES

### 🛑 WILL NOT START UNTIL: "CONFIRMED READY FOR PHASE 5"

---

# PHASE 6: REMOVE MOCK DATA

### 🛑 WILL NOT START UNTIL: "CONFIRMED READY FOR PHASE 6"

**FINAL CLEANUP ONLY AFTER:**
- [ ] All features work with Supabase
- [ ] Mock data no longer needed
- [ ] Full testing completed
- [ ] Backup of mock data saved

---

## Emergency Rollback Procedures

If ANYTHING goes wrong at ANY hard stop:

1. **Immediate Actions:**
   ```bash
   git stash  # Save any uncommitted work
   git checkout main  # Return to stable branch
   ```

2. **If auth breaks:**
   - Set `NEXT_PUBLIC_USE_MOCK_DATA=true` in .env.local
   - Restart dev server
   - Verify mock auth works

3. **If database issues:**
   - Comment out Supabase env variables
   - Restart with mock data
   - Debug Supabase separately

4. **If PR was merged prematurely:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

---

## Success Criteria for Complete Integration

**DO NOT consider integration complete until:**

1. **All phases merged to main**
2. **Production deployed and stable for 24 hours**
3. **No rollbacks needed**
4. **Performance metrics acceptable**
5. **User feedback positive**
6. **Mock data files deleted**
7. **Documentation updated**

---

## Remember:

- **NEVER SKIP A HARD STOP**
- **NEVER ASSUME IT'S WORKING**
- **ALWAYS WAIT FOR CONFIRMATION**
- **TEST EVERYTHING TWICE**
- **ROLLBACK IS ALWAYS AN OPTION**

This plan prioritizes stability over speed. Each hard stop is a safety checkpoint. Respect them.
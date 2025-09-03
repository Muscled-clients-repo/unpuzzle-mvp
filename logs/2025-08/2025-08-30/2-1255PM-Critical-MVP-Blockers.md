# Critical MVP Blockers - Unpuzzle
*Date: August 30, 2025*

## Executive Summary
**The codebase is NOT production-ready. Critical conflicts prevent launching to even 100 users.**

Estimated fix time: **2-3 weeks minimum** with focused development.

---

## 🚨 TOP 5 CRITICAL BLOCKERS

### 1. **Authentication is Completely Fake** ⛔
**Severity: BLOCKER - No user can actually use the app**

**Problems:**
- Login uses `setTimeout()` to simulate authentication
- No Supabase client despite database expecting it
- No session management, tokens, or real auth flow
- Social login buttons are decorative only

**Impact:** 
- Users cannot log in
- No data persistence
- No user isolation
- Security is non-existent

**Fix Required:**
```typescript
// Current (BROKEN):
const handleLogin = () => {
  setLoading(true)
  setTimeout(() => { login(email, password) }, 1500) // FAKE!
}

// Needed:
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
})
```

---

### 2. **Video Player Version Chaos** 🎥
**Severity: CRITICAL - Core feature broken**

**Problems:**
- Two conflicting video players (V1 and V2)
- Different routes use different versions
- Incompatible prop structures
- Mock video URLs that don't exist

**Conflicts Found:**
```
/components/video/student/StudentVideoPlayer.tsx (V1)
/components/video/student/StudentVideoPlayerV2.tsx (V2)
/app/learn/[id]/page.tsx → uses V1
/app/student/course/[id]/video/[videoId]/page.tsx → uses V2
```

**Impact:**
- Video playback fails randomly
- AI agents work in V2 but not V1
- User progress tracked differently

---

### 3. **Data Layer is Schizophrenic** 📊
**Severity: HIGH - Nothing saves correctly**

**Problems:**
- Database expects UUIDs, frontend uses string IDs
- Mock services hardcoded everywhere
- Domain types don't match database schema
- Required fields missing in frontend

**Example Mismatch:**
```typescript
// Database schema:
order_index INTEGER NOT NULL

// Domain type:
order?: number  // Wrong name, optional!

// Mock data:
id: "course-1"  // Not a UUID!
```

**Impact:**
- All CRUD operations will fail
- Data corruption inevitable
- Migration impossible

---

### 4. **State Management Nightmare** 🧠
**Severity: HIGH - Unpredictable behavior**

**Problems:**
- One giant Zustand store with 8+ conflicting slices
- Student and Instructor slices fight over same data
- Video state duplicated in 3 places
- No state isolation between roles

**State Conflicts:**
```typescript
// app-store.ts
- userSlice: manages current user
- studentSlice: ALSO manages current user
- instructorSlice: ALSO manages current user!
- videoSlice: manages video state
- studentVideoSlice: ALSO manages video state!
```

**Impact:**
- Switching roles corrupts data
- UI updates randomly fail
- Memory leaks from duplicate subscriptions

---

### 5. **Routing is Broken** 🗺️
**Severity: HIGH - Users get lost**

**Problems:**
- Duplicate routes with different implementations
- No role-based guards
- Student can access instructor pages
- Navigation expects different user objects

**Route Conflicts:**
```
/course/[id] → Public course page
/student/course/[id] → Student course page (DUPLICATE!)
/instructor/course/[id] → Instructor course page
/learn/[id] → Another course page?!
```

**Impact:**
- Users see wrong content
- Security vulnerabilities
- Navigation breaks randomly
- SEO disaster

---

## 🔧 QUICK FIXES BEFORE LAUNCH

### Week 1: Authentication Emergency Fix
1. Install and configure Supabase client
2. Replace mock login with real auth
3. Add session management
4. Implement logout

### Week 2: Consolidate Video Players
1. Delete StudentVideoPlayer V1
2. Use only StudentVideoPlayerV2 everywhere
3. Fix all imports and routes
4. Test video playback

### Week 3: Data Layer Alignment
1. Update domain types to match database
2. Create real API service layer
3. Remove all mock data flags
4. Test CRUD operations

---

## ⚠️ ADDITIONAL CRITICAL ISSUES

### Missing Production Essentials
- ❌ No error boundaries
- ❌ No loading states in many components
- ❌ No API error handling
- ❌ No rate limiting
- ❌ No input validation
- ❌ No CORS configuration
- ❌ No security headers

### Performance Killers
- ❌ 8MB+ bundle size
- ❌ No code splitting
- ❌ No image optimization
- ❌ Re-renders entire app on any state change
- ❌ Memory leaks in video components

### Security Vulnerabilities
- ❌ API keys in frontend code
- ❌ No input sanitization
- ❌ SQL injection possible
- ❌ XSS vulnerabilities
- ❌ No CSRF protection

---

## ✅ MINIMUM VIABLE FIXES

To launch to 100 users, you MUST:

### Phase 1: Make Login Work (3 days)
```bash
npm install @supabase/supabase-js
```
- Configure Supabase client
- Implement real login/logout
- Add session persistence
- Test with real users

### Phase 2: Pick ONE Video Player (2 days)
- Delete all V1 components
- Standardize on V2
- Fix all route imports
- Test video playback

### Phase 3: Connect Real Database (5 days)
- Align types with schema
- Create API routes
- Remove mock data
- Test all CRUD ops

### Phase 4: Fix State Management (3 days)
- Split monolithic store
- Isolate role-specific state
- Remove duplications
- Test role switching

### Phase 5: Secure Routes (2 days)
- Add middleware guards
- Implement role checks
- Fix navigation
- Test all user flows

---

## 📊 RISK ASSESSMENT

### Can Launch With These Issues? **NO** ❌
- App literally doesn't work
- Users cannot log in
- Data doesn't save
- Videos don't play reliably
- Security is non-existent

### Minimum Time to Fix: **15 working days**
- Assumes 2 developers
- No new features added
- Just fixing blockers
- Basic testing only

### Recommendation: **DO NOT LAUNCH**
The app needs fundamental fixes before ANY users can use it. These aren't bugs - they're architectural failures that make the app non-functional.

---

## 🎯 PRIORITY ORDER

1. **Fix auth first** - Nothing works without it
2. **Then video player** - Core feature must work
3. **Then data layer** - Or nothing saves
4. **Then state** - For predictable behavior
5. **Then routing** - For usable navigation

**After these fixes, you'll have a basic working MVP suitable for 100 beta users.**

---

*Document prepared for emergency development sprint planning*
# Auth User Flows - Detailed Implementation Guide
**Date:** September 1, 2025  
**Purpose:** Step-by-step user flows for Increment 1 authentication  
**Companion to:** 5a-Increment-1-Basic-Auth-Implementation.md

---

## 🎯 Overview

This document details every user interaction with the authentication system, what they see, what happens technically, and how to test each flow.

---

# 📱 USER FLOW 1: First-Time Sign Up

## **User Journey**
```
Landing Page → Sign Up → Create Account → Dashboard
```

## **Step-by-Step Interaction**

### **Step 1: User Lands on Homepage**
**What User Sees:**
- Hero section with "Start Learning" CTA
- "Login" and "Sign Up" buttons in navbar
- Public course previews (no enroll button)

**What User Can't Do:**
- Enroll in courses
- Access AI features
- See personalized content

### **Step 2: User Clicks "Sign Up"**
**URL:** `/signup`

**What User Sees: Split Screen Layout**
```
┌────────────────────────────────────┬─────────────────────────────────┐
│          LEFT COLUMN (60%)          │      RIGHT COLUMN (40%)         │
│          Marketing/Benefits         │         Sign Up Form            │
├────────────────────────────────────┼─────────────────────────────────┤
│                                     │                                 │
│   🚀 Start Your Learning Journey   │       Create Your Account       │
│                                     │                                 │
│   ✓ Learn from Expert Instructors  │ Email:                          │
│   ✓ AI-Powered Learning Assistant  │ [_________________________]     │
│   ✓ Track Your Progress            │                                 │
│   ✓ Get Certified                  │ Password:                       │
│                                     │ [_________________________]     │
│   ┌──────────────────────┐         │                                 │
│   │  [Testimonial Card]   │         │ Full Name:                      │
│   │  "Unpuzzle changed    │         │ [_________________________]     │
│   │  how I learn!"        │         │                                 │
│   │  - Sarah, Student     │         │ [✓] I agree to terms           │
│   └──────────────────────┘         │                                 │
│                                     │ [    Create Account    ]        │
│   📊 Join 10,000+ learners          │                                 │
│                                     │ ──────── OR ─────────           │
│   [Dynamic illustration or          │                                 │
│    animated graphic here]           │ [ 🔷 Continue with Google ]     │
│                                     │ [ 🔷 Continue with GitHub ]     │
│                                     │                                 │
│                                     │ Already have account? Login →   │
└────────────────────────────────────┴─────────────────────────────────┘
```

**Responsive Behavior:**
- Desktop (>1024px): Two columns side-by-side
- Tablet (768-1024px): Two columns, narrower marketing
- Mobile (<768px): Stack vertically, form on top

### **Step 3: User Fills Form**
**User Enters:**
- Email: sarah@example.com
- Password: SecurePass123!
- Full Name: Sarah Johnson

**Frontend Validation:**
- Email format valid ✓
- Password min 8 chars ✓
- Name not empty ✓

### **Step 4: User Clicks "Create Account"**
**What Happens Technically:**

```javascript
1. Frontend calls:
   await supabase.auth.signUp({
     email: 'sarah@example.com',
     password: 'SecurePass123!',
     options: {
       data: { full_name: 'Sarah Johnson' }
     }
   })

2. Supabase creates:
   auth.users → id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

3. Database trigger fires:
   INSERT INTO profiles (id, email, name, role)
   VALUES ('f47ac10b...', 'sarah@example.com', 'Sarah Johnson', 'student')

4. Subscription trigger fires:
   INSERT INTO subscriptions (user_id, plan)
   VALUES ('f47ac10b...', 'free')

5. Session created:
   JWT token set in cookie (expires 7 days)

6. Frontend receives:
   { user: { id: 'f47ac10b...', email: '...' }, session: {...} }
```

### **Step 5: User Redirected to Dashboard**
**URL:** `/student/dashboard`

**What User Sees:**
```
Welcome, Sarah Johnson!
Your learning journey starts here.

[Explore Courses] [Complete Profile]
```

**What's Different:**
- Navbar shows "Hi, Sarah" + avatar placeholder
- "My Courses" link appears
- "Logout" replaces "Login"
- User ID in Redux DevTools: 'f47ac10b...' (not 'user-1')

---

# 📱 USER FLOW 2: Returning User Login

## **User Journey**
```
Homepage → Login → Enter Credentials → Dashboard
```

## **Step-by-Step Interaction**

### **Step 1: User Returns Next Day**
**What User Sees:**
- Homepage (logged out state)
- "Login" button in navbar

### **Step 2: User Clicks "Login"**
**URL:** `/login`

**What User Sees: Split Screen Layout**
```
┌────────────────────────────────────┬─────────────────────────────────┐
│          LEFT COLUMN (60%)          │      RIGHT COLUMN (40%)         │
│        Marketing/Welcome Back       │         Login Form              │
├────────────────────────────────────┼─────────────────────────────────┤
│                                     │                                 │
│   👋 Welcome Back!                  │         Welcome Back            │
│                                     │                                 │
│   Continue where you left off...   │ Email:                          │
│                                     │ [_________________________]     │
│   ┌──────────────────────┐         │                                 │
│   │  Your Progress:       │         │ Password:                       │
│   │  ████████░░ 80%       │         │ [_________________________]     │
│   │  4 courses active     │         │                                 │
│   │  2 certificates earned│         │ [ ] Remember me                 │
│   └──────────────────────┘         │                                 │
│                                     │ [       Sign In       ]         │
│   📈 Your Learning Stats            │                                 │
│   • 47 hours total                  │ Forgot password?                │
│   • 15 day streak                   │                                 │
│   • 3 courses completed             │ ──────── OR ─────────           │
│                                     │                                 │
│   💡 Pro Tip:                       │ [ 🔷 Continue with Google ]     │
│   "Regular practice leads to         │                                 │
│    mastery. Keep your streak!"      │ New here? Create account →      │
│                                     │                                 │
│   [Animated welcome back graphic]   │                                 │
└────────────────────────────────────┴─────────────────────────────────┘
```

**Dynamic Content:**
- For returning users: Show their actual stats
- For new visitors: Show general benefits
- Animation: Subtle fade-in for left column

### **Step 3: User Enters Credentials**
**Correct Credentials:**
- Email: sarah@example.com
- Password: SecurePass123!

### **Step 4: Authentication Process**
```javascript
1. Frontend calls:
   await supabase.auth.signInWithPassword({
     email: 'sarah@example.com',
     password: 'SecurePass123!'
   })

2. Supabase validates:
   - Email exists ✓
   - Password matches hash ✓
   - Account active ✓

3. New session created:
   - JWT token generated
   - Cookie updated
   - Session object returned

4. AuthContext updates:
   setUser({ id: 'f47ac10b...', email: 'sarah@example.com' })

5. Router navigates:
   router.push('/student/dashboard')
```

### **Step 5: Dashboard Loads with User Data**
```javascript
// All API calls now include user context
useEffect(() => {
  if (user) {
    loadEnrolledCourses(user.id)  // 'f47ac10b...' not 'user-1'
    loadProgress(user.id)
    loadSubscription(user.id)
  }
}, [user])
```

---

# 📱 USER FLOW 3: Failed Login Attempts

## **Scenario A: Wrong Password**

### **User Enters:**
- Email: sarah@example.com
- Password: WrongPassword

### **What Happens:**
```javascript
1. Supabase returns:
   { error: { message: 'Invalid login credentials' } }

2. Frontend shows:
   "Invalid email or password. Please try again."

3. Form state:
   - Email field keeps value
   - Password field cleared
   - Error message in red
```

## **Scenario B: Non-existent Email**

### **User Enters:**
- Email: nonexistent@example.com
- Password: AnyPassword

### **What Happens:**
- Same error: "Invalid email or password"
- Doesn't reveal if email exists (security)

## **Scenario C: Too Many Attempts**

### **After 5 Failed Attempts:**
```
"Too many failed attempts. Please try again in 15 minutes."
```

---

# 📱 USER FLOW 4: Protected Route Access

## **Scenario A: Logged Out User Tries Protected Route**

### **Step 1: User Directly Visits**
**URL:** `/student/courses`

### **Step 2: Middleware Intercepts**
```javascript
// middleware.ts
const session = await supabase.auth.getSession()
if (!session) {
  return NextResponse.redirect('/login?redirect=/student/courses')
}
```

### **Step 3: Redirected to Login**
**What User Sees:**
- Login page
- Optional: "Please login to continue" message
- After login: returned to `/student/courses`

## **Scenario B: Logged In User Accessing Wrong Role**

### **Student Tries Instructor Route**
**URL:** `/instructor/courses`

```javascript
1. Middleware checks:
   - Has session ✓
   - Get user role from profile
   - role === 'student', route needs 'instructor'

2. Response:
   - Redirect to `/unauthorized`
   - Or show 403 error page
```

---

# 📱 USER FLOW 5: Session Persistence

## **The Cookie Lifecycle**

### **Day 1: Initial Login**
```javascript
1. Login at 9:00 AM Monday
2. Cookie set:
   - Name: sb-access-token
   - Value: [JWT token]
   - Expires: Next Monday 9:00 AM
   - HttpOnly: true
   - Secure: true (in production)
   - SameSite: Lax
```

### **Day 1: User Closes Browser**
```javascript
1. 5:00 PM - User closes browser
2. Cookie persists (not session cookie)
3. JWT still valid on server
```

### **Day 2: User Returns**
```javascript
1. 10:00 AM Tuesday - Opens site
2. AuthProvider initialization:
   
   useEffect(() => {
     supabase.auth.getSession().then(({ data: { session } }) => {
       if (session) {
         setUser(session.user)  // Auto-logged in!
         setLoading(false)
       }
     })
   }, [])

3. User sees:
   - "Welcome back, Sarah"
   - No login required
   - All personalized content loads
```

### **Day 8: Session Expires**
```javascript
1. Cookie expires after 7 days
2. getSession() returns null
3. User redirected to login
4. Must re-authenticate
```

---

# 📱 USER FLOW 6: Logout Process

## **User Clicks "Logout"**

### **Step 1: User Clicks Logout Button**
**Location:** Dropdown menu in navbar

### **Step 2: Logout Process**
```javascript
const handleLogout = async () => {
  // 1. Call Supabase
  await supabase.auth.signOut()
  
  // 2. What happens:
  //    - Session invalidated on server
  //    - Cookie deleted from browser
  //    - AuthContext user set to null
  
  // 3. Redirect
  router.push('/')
}
```

### **Step 3: Post-Logout State**
**What Changes:**
- Navbar shows "Login" and "Sign Up"
- No access to protected routes
- Personalized content hidden
- Redirected to homepage

### **What Persists:**
- Browser history (privacy mode clears this)
- Any localStorage preferences (theme, etc)
- Cached public content

---

# 📱 USER FLOW 7: Google OAuth Sign Up

## **Alternative Registration Path**

### **Step 1: User Clicks "Continue with Google"**

### **Step 2: OAuth Flow**
```javascript
1. Frontend calls:
   await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: `${window.location.origin}/auth/callback`
     }
   })

2. User redirected to:
   accounts.google.com

3. User authorizes:
   - Selects Google account
   - Grants permissions
   - Google redirects back

4. Callback handling:
   /auth/callback receives tokens

5. Profile creation:
   - Same trigger fires
   - Name from Google profile
   - Email from Google account
   - Profile picture URL saved
```

### **Step 3: First-Time OAuth User**
```javascript
// Check if profile exists
const { data: profile } = await supabase
  .from('profiles')
  .select()
  .eq('id', user.id)
  .single()

if (!profile) {
  // First time - redirect to complete profile
  router.push('/onboarding')
} else {
  // Returning user
  router.push('/student/dashboard')
}
```

---

# 📱 USER FLOW 8: Role Switching (Future)

## **Student Becomes Instructor**

### **Current State:**
- User registered as 'student'
- Wants to create courses

### **Application Flow:**
```
1. Student clicks "Become an Instructor"
2. Fills application form
3. Admin reviews and approves
4. Role updated to 'instructor'
5. New UI options appear
```

### **Technical Implementation:**
```sql
-- Admin updates role
UPDATE profiles 
SET role = 'instructor' 
WHERE id = 'user-uuid';

-- User must re-login to refresh JWT claims
-- Or force token refresh
await supabase.auth.refreshSession()
```

---

# 🧪 TESTING CHECKLIST

## **Sign Up Flow Tests**
- [ ] Valid email/password creates account
- [ ] Invalid email shows error
- [ ] Weak password rejected
- [ ] Duplicate email prevented
- [ ] Profile auto-created
- [ ] Subscription auto-created
- [ ] Redirects to dashboard
- [ ] Welcome message shows name

## **Login Flow Tests**
- [ ] Correct credentials work
- [ ] Wrong password shows error
- [ ] Non-existent email handled
- [ ] Remember me works
- [ ] Forgot password link works
- [ ] OAuth login works
- [ ] Redirects to intended page

## **Session Tests**
- [ ] Session persists on refresh
- [ ] Session persists after browser close
- [ ] Session expires after 7 days
- [ ] Multiple tabs share session
- [ ] Logout affects all tabs

## **Protection Tests**
- [ ] Can't access /student without auth
- [ ] Can't access /instructor without auth
- [ ] Students can't access instructor routes
- [ ] Direct URL access redirects to login
- [ ] API calls fail without auth

## **Data Flow Tests**
- [ ] User ID flows to all components
- [ ] No "user-1" anywhere
- [ ] Courses load for correct user
- [ ] Progress saves with real ID
- [ ] Enrollments isolated per user

---

# 🎬 DEMO SCRIPT

## **5-Minute Demo for Stakeholders**

### **Minute 1: Show Current Problem**
- Open app, show "user-1" everywhere
- Open two browsers, same data (BAD!)

### **Minute 2: Create New Account**
- Sign up as "Demo User"
- Show UUID generated
- Show profile in database

### **Minute 3: Test Protection**
- Logout
- Try accessing /student/courses
- Get redirected to login

### **Minute 4: Test Persistence**
- Login
- Close browser
- Reopen - still logged in

### **Minute 5: Show Isolation**
- Create second account
- Different courses
- Different progress
- Complete isolation

---

# 🚨 COMMON ISSUES & SOLUTIONS

## **Issue: "User is null" Errors**

### **Symptom:**
```
Cannot read property 'id' of null
```

### **Cause:**
Component rendering before auth loads

### **Solution:**
```javascript
const { user, loading } = useAuth()

if (loading) return <LoadingSpinner />
if (!user) return <Redirect to="/login" />

// Now safe to use user.id
```

## **Issue: Session Not Persisting**

### **Check:**
1. Cookies enabled in browser?
2. Secure cookie on localhost?
3. SameSite settings correct?

### **Solution:**
```javascript
// Development settings
const isDev = process.env.NODE_ENV === 'development'
cookieOptions: {
  secure: !isDev,  // false for localhost
  sameSite: 'lax'
}
```

## **Issue: RLS Blocking Access**

### **Debug Steps:**
1. Check auth.uid() in Supabase SQL editor
2. Temporarily disable RLS
3. Check if data returns
4. Fix policy if needed

---

# 📝 IMPLEMENTATION NOTES

## **Start Here:**
1. Test with one component first
2. Get login/logout working
3. Then replace all hardcoded IDs
4. Test each flow thoroughly

## **Don't Forget:**
- Error handling for network failures
- Loading states during auth
- Friendly error messages
- Success feedback

## **Keep for Reference:**
- Old mock auth code (comment out)
- Fallback to mock if auth fails
- Debug logs during development

---

# ✅ SUCCESS CRITERIA

**You know auth is working when:**

1. **No hardcoded IDs:** Search finds zero "user-1"
2. **Unique users:** Two accounts see different data
3. **Persistence works:** Refresh keeps you logged in
4. **Protection works:** Can't access without login
5. **Real UUIDs:** Console shows UUIDs not "user-1"
6. **Database correct:** Profiles match auth users
7. **Smooth UX:** No flashing, no delays
8. **Error handling:** Bad credentials show nice errors

**When all 8 criteria pass, Increment 1 is complete!**
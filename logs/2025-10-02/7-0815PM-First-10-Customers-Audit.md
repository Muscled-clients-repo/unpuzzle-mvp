# First 10 Customers - Marketing & Onboarding Audit
**Date**: October 2, 2025 - 8:15 PM
**Goal**: Identify what's needed to acquire and onboard first 10 customers
**Status**: In Progress

---

## A) Marketing Pages Audit

### ✅ **What You Have:**

#### **1. Landing Page (`/`)**
**Status**: Comprehensive ✅

**Sections:**
- Hero: Value prop + 2 CTAs ("Browse Courses", "Start Free Trial")
- AI Agents showcase (4 cards: Hint, Check, Reflect, Path)
- Learning metrics preview (Learn Rate, Execution Rate, etc.)
- AI-Enhanced course examples (3 course cards)
- **Pricing section** (inline on homepage)
  - Basic: $39/mo (10 AI interactions/day, read-only community)
  - Premium: $97/mo (Unlimited AI, instructor feedback, 24hr response)
  - **Founding member badge**: "First 50 Students Only"
- CTA section: "Start Learning Today" + "Become an Instructor"

**Issues Found:**
- ❌ Stripe links are test mode placeholders: `https://buy.stripe.com/test_your_basic_link`
- ❌ Founding member counter hardcoded: `{50 - 12}` (shows "38 spots remaining")
- ❌ No real testimonials/social proof
- ❌ Preview lesson link (`/preview`) goes nowhere (404)

---

#### **2. Browse Courses Page (`/courses`)**
**Status**: Functional but empty ✅

**Features:**
- Loads courses from Zustand store (`recommendedCourses`)
- Shows count: "X courses available"
- AI course cards with hover states
- Empty state: "No courses available"

**Issues Found:**
- ⚠️ Depends on `loadAllCourses()` from store (database query needed)
- ⚠️ No filters (category, difficulty, price)
- ⚠️ No search functionality
- ⚠️ Likely shows 0 courses if database empty

---

#### **3. Sign Up Page (`/signup`)**
**Status**: Complete ✅

**Features:**
- Full name, email, password validation
- "Agree to Terms" checkbox (required)
- Links to `/terms` and `/privacy` (both 404!)
- Social auth buttons (Google, etc.)
- Email confirmation flow
- Redirects to `/student` after signup

**Issues Found:**
- ❌ `/terms` page doesn't exist (404)
- ❌ `/privacy` page doesn't exist (404)
- ❌ No role selection (defaults to student?)
- ⚠️ "Check your email" message unclear if email confirmation needed

---

### ❌ **What You're Missing:**

1. **`/terms`** - Terms of Service page (REQUIRED legally)
2. **`/privacy`** - Privacy Policy page (REQUIRED legally)
3. **`/preview`** - Free lesson preview (linked from homepage)
4. **`/instructors`** - Become an Instructor page (linked from homepage CTA)
5. **About/How it Works** - Trust-building content
6. **Blog/Resources** - SEO and content marketing
7. **FAQ** - Common questions before buying

---

## B) Critical User Funnels

### **Funnel 1: Free Trial → Paid Conversion**

```
Landing Page (/)
  ↓ Click "Start Free Trial"
/signup (create account)
  ↓ Email confirmation?
/student (dashboard)
  ↓ Browse courses OR prompted to enroll?
/courses (browse catalog)
  ↓ Click course
/student/course/[id] (course detail - does this exist?)
  ↓ Enroll button
Video player with AI
  ↓ Use AI 10 times (hit limit)
Paywall prompt → Upgrade
  ↓ Click "Upgrade to Premium"
Stripe checkout ($97/mo)
  ↓ Payment success
Premium access unlocked
```

**Conversion Points:**
1. **Landing → Signup**: CTA clarity ✅
2. **Signup → First Course**: Onboarding prompt? ❓
3. **Free AI limit → Upgrade**: Paywall messaging? ❓
4. **Upgrade CTA → Stripe**: Link works? ❌ (test mode)

**Drop-off Risks:**
- ⚠️ No courses in catalog = immediate bounce
- ⚠️ Unclear how to enroll in first course
- ⚠️ AI limit reached with no clear upgrade path
- ❌ Stripe test links don't work in production

---

### **Funnel 2: Browse Courses → Enrollment**

```
/ (homepage)
  ↓ Click "Browse Courses"
/courses (catalog)
  ↓ Click course card
/student/course/[id] OR /course/[id]? (course detail)
  ↓ "Enroll" button
Enrollment modal/confirmation
  ↓ Confirm enrollment
/student/courses (my courses)
  ↓ Click course
/student/course/[id]/watch/[chapterId] (video player)
```

**Unknown Routes:**
- ❓ Course detail page for public browsing?
- ❓ Enrollment flow (modal? separate page?)
- ❓ Free vs paid courses (handled how?)

---

### **Funnel 3: Instructor Signup → First Course**

```
/ (homepage)
  ↓ Click "Become an Instructor"
/instructors (instructor landing - 404!)
  ↓ Signup as instructor
/signup (same as student signup?)
  ↓ Role selection? Or separate signup?
/instructor (dashboard)
  ↓ Create first course
/instructor/courses/new (course creation)
  ↓ Upload media, add chapters
/instructor/courses/[id]/edit
  ↓ Publish course
Course goes live on /courses
```

**Critical Gaps:**
- ❌ `/instructors` page missing (no instructor pitch)
- ❓ How does user choose "instructor" role during signup?
- ❓ Instructor vetting/approval process?

---

### **Funnel 4: Email → Activation**

```
Signup with email
  ↓ Receive confirmation email
Click confirmation link
  ↓ Redirect to platform
Email confirmed
  ↓ Where do they land?
/student? /onboarding? /welcome?
```

**Unknown:**
- ❓ Email confirmation required or optional?
- ❓ Welcome email sequence exists?
- ❓ Onboarding wizard after confirmation?

---

## C) Onboarding Experience Audit

### **Current Flow (Assumed):**

1. **User signs up** → Email/password + full name
2. **Email confirmation** → Click link (Supabase magic link?)
3. **Redirected to `/student`** → Student dashboard
4. **See empty state?** → No enrolled courses
5. **No guidance** → User confused what to do next

### **Critical Gaps:**

1. ❌ **No role selection** during signup
   - How does someone become instructor?
   - Is it automatic based on email domain?
   - Separate signup flow?

2. ❌ **No onboarding wizard**
   - First-time users need guidance
   - Show platform tour?
   - Prompt to browse courses?

3. ❌ **No welcome email**
   - Set expectations
   - Guide next steps
   - Link to support/resources

4. ❌ **No first course prompt**
   - Empty dashboard is confusing
   - Should auto-suggest popular course
   - Or show "Get Started" checklist

5. ❓ **Payment flow unclear**
   - Can user watch videos before paying?
   - Free tier vs paid tier enforcement?
   - Trial period (7 days? 14 days?)

---

## Critical Issues to Fix Before 10 Customers

### **🚨 Blockers (Must Fix):**

1. **Legal Pages Missing**
   - Create `/terms` (Terms of Service)
   - Create `/privacy` (Privacy Policy)
   - **Risk**: Can't legally collect user data without these

2. **Stripe Links Broken**
   - Replace test links with real Stripe checkout
   - Set up production Stripe products
   - Test payment flow end-to-end

3. **Instructor Signup Broken**
   - Create `/instructors` landing page
   - Add role selection to signup flow
   - OR create separate `/signup/instructor` route

4. **No Courses in Catalog**
   - Seed database with at least 1-3 demo courses
   - OR hide "Browse Courses" until content ready
   - **Risk**: Users bounce if catalog empty

### **⚠️ High Priority (Should Fix):**

5. **Missing `/preview` page**
   - Create free lesson preview
   - No login required
   - Show AI features in action

6. **No onboarding flow**
   - Create welcome wizard for first-time users
   - Guide to first course enrollment
   - Show AI features tour

7. **No upgrade prompts**
   - Show paywall when AI limit reached
   - Clear CTA to upgrade to premium
   - Link to working Stripe checkout

8. **Founding member counter**
   - Track actual signups in database
   - Update counter dynamically
   - Add urgency ("Only X spots left")

### **✅ Nice to Have (Can Wait):**

9. FAQ page
10. About/How it Works page
11. Blog for SEO
12. Testimonials section
13. Course filters/search

---

## Recommended Action Plan

### **Phase 1: Legal & Payment (1-2 days)**
1. Create `/terms` and `/privacy` pages (use templates)
2. Set up production Stripe products ($39/mo, $97/mo)
3. Replace test links with real Stripe checkout URLs
4. Test payment flow end-to-end

### **Phase 2: Instructor Flow (1-2 days)**
5. Create `/instructors` landing page (why become instructor?)
6. Add role selection to signup (student vs instructor toggle)
7. Test instructor signup → dashboard → course creation

### **Phase 3: Seed Content (1 day)**
8. Create 2-3 demo courses with real content
9. Test course browsing → enrollment → video playback
10. Verify AI interactions work in video player

### **Phase 4: Onboarding (1-2 days)**
11. Create first-time user wizard (skip/complete tour)
12. Add "Get Started" checklist on empty dashboard
13. Create welcome email with next steps

### **Phase 5: Growth Features (1-2 days)**
14. Create `/preview` free lesson page
15. Add upgrade prompts when AI limit hit
16. Dynamic founding member counter

**Total Estimate**: 6-9 days to be customer-ready

---

## Key Metrics to Track (PostHog)

### **Acquisition:**
- Landing page views
- Signup button clicks
- Signup completions
- Signup source (organic, referral, ads)

### **Activation:**
- Email confirmations
- First login after signup
- First course browsed
- First course enrolled

### **Engagement:**
- Video plays
- AI interactions
- Course completions
- Daily/weekly active users

### **Conversion:**
- AI limit reached (free → paywall)
- Upgrade button clicks
- Stripe checkout initiated
- Payment success
- Free → Paid conversion rate

### **Retention:**
- Day 1, 7, 30 return rate
- Courses per user
- AI interactions per session
- Churn signals (last activity > 7 days)

---

## Questions to Answer:

1. **Is payment required before watching videos?** Or free tier with AI limits?
2. **Email confirmation required or optional?** (Supabase setting)
3. **How do users become instructors?** Role selection or separate flow?
4. **Do you have demo courses?** Or need to create seed content?
5. **What's the trial period?** 7 days? 14 days? Or pay immediately?
6. **Founding member limit real?** Actually capping at 50 or just marketing?

---

## Next Steps:

**Immediate (Today):**
1. Decide on payment flow (free tier vs trial vs pay-to-access)
2. Set up production Stripe account
3. Create `/terms` and `/privacy` pages

**This Week:**
1. Fix instructor signup flow
2. Seed 2-3 demo courses
3. Test end-to-end user journey

**Before Launch:**
1. Add onboarding wizard
2. Create upgrade prompts
3. Set up PostHog events

Let me know which blockers to prioritize!

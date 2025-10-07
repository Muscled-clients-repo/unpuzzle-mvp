# Unpuzzle Pre-Launch Checklist
**Date**: October 2, 2025 - 8:30 PM
**Goal**: Identify what's needed before launching $4K/year Founding 50 offer

---

## Current Routes (What You Have)

### ✅ **Public/Marketing:**
- `/` - Landing page (has pricing, hero, features)
- `/login` - Login page
- `/signup` - Sign up page
- `/courses` - Browse courses (public catalog)
- `/course/[id]` - Course detail page
- `/blog` - Blog listing (mock data)
- `/blog/[slug]` - Blog post detail (mock data)
- `/community` - Community page

### ✅ **Student Dashboard:**
- `/student` - Dashboard
- `/student/courses` - My enrolled courses
- `/student/course/[id]` - Course overview
- `/student/course/[id]/content` - Course content page
- `/student/course/[id]/video/[videoId]` - Video player with AI
- `/student/goals` - Private mentorship/goals
- `/student/goals/history` - Goal history
- `/student/reflections` - Reflections
- `/student/requests` - Requests
- `/student/track-selection` - Track selection
- `/student/track-selection/questionnaire` - Questionnaire

### ✅ **Instructor Dashboard:**
- `/instructor` - Dashboard
- `/instructor/courses` - My courses
- `/instructor/course/new` - Create course
- `/instructor/course/[id]/edit` - Edit course
- `/instructor/course/[id]/analytics` - Course analytics
- `/instructor/course/[id]/video/[videoId]` - Video management
- `/instructor/media` - Media library
- `/instructor/studio` - Video editor/studio
- `/instructor/students` - Student list
- `/instructor/student-goals` - Student goals management
- `/instructor/student-goals/[studentId]` - Individual student goals
- `/instructor/student-goals/history` - Goals history
- `/instructor/requests` - All requests
- `/instructor/requests/track-assignments` - Track assignments
- `/instructor/engagement` - Engagement analytics
- `/instructor/course-goals` - Course goals management

### 🧪 **Debug/Test Pages (Remove before launch):**
- `/demo/video-v2`
- `/debug/course-visibility`
- `/test-components`
- `/test-normalized`
- `/test-ui-state`
- `/clear-all`
- `/playground/*`
- `/learn/[id]` (redundant with `/student/course/[id]`?)
- `/student/goals-mock` (mock version)

---

## ❌ What's Missing for Launch

### **Critical (Must Have):**

#### 1. **Legal Pages (BLOCKER)**
- ❌ `/terms` - Terms of Service
- ❌ `/privacy` - Privacy Policy
- ❌ `/refund` - Refund Policy (important for $4K offer)

**Why critical:**
- Sign up page links to these (currently 404)
- Legally required to collect user data
- Stripe requires terms for payment processing

---

#### 2. **Pricing/Sales Pages**
- ❌ `/pricing` or update homepage pricing section
  - Current: Has pricing inline on homepage (Basic $39, Premium $97)
  - Needed: Update to $4K/year Founding 50 offer
  - Or create separate `/founding-50` landing page

**Issues found on current homepage:**
- Stripe links are test mode: `https://buy.stripe.com/test_your_basic_link`
- Pricing is $39/$97 subscription (but you want $4K/year)
- "First 50 students" counter is hardcoded: `{50 - 12}`

---

#### 3. **Free Course (Lead Magnet)**
- ❌ `/course/upwork-1k-free` - Free "Get to $1K/mo" course
- This is your email capture mechanism from ad funnel
- Should be accessible without payment
- Limit: 10 AI interactions

**What it needs:**
- 5 video lessons
- Downloadable resources (proposal templates)
- Email gate to access
- Limited AI interactions (10 max)

---

#### 4. **Strategy Call Booking**
- ❌ `/book-call` or Calendly integration
- For $4K sales, need Zoom call booking
- Should collect:
  - Name, email, phone
  - Current revenue
  - Primary goal
  - Preferred call time

**Options:**
- Embed Calendly widget
- Or build custom booking page with Calendly API

---

#### 5. **Payment Flow**
- ❌ `/checkout/founding-50` - $4K payment page
- Replace test Stripe links with real checkout
- Stripe product setup:
  - $4,000/year one-time (or subscription)
  - Payment link or hosted checkout
  - Success redirect to `/welcome` or `/student`

---

### **High Priority (Should Have):**

#### 6. **Onboarding/Welcome Flow**
- ❌ `/welcome` - First-time user wizard after signup
- ❌ `/onboarding` - Goal selection + track assignment
- Guide new users to first course
- Explain AI features
- Set expectations

**Current issue:**
- User signs up → Lands on empty `/student` dashboard
- No guidance on what to do next
- Confusing UX

---

#### 7. **About/Story Page**
- ❌ `/about` - Your $500K story, credibility, why you're building this
- Important for trust before $4K ask
- Include:
  - Revenue proof screenshots
  - Upwork earnings history
  - Why building to $10M in public
  - Who you are

---

#### 8. **Instructor Landing Page** (If allowing other instructors later)
- ❌ `/instructors` - "Become an Instructor" page
- Currently linked from homepage CTA: "Become an Instructor"
- Goes to 404

**For now:**
- Either remove the CTA (you're solo instructor)
- Or create placeholder: "Instructor applications opening Q1 2026"

---

#### 9. **Success/Confirmation Pages**
- ❌ `/success` - After $4K payment success
- ❌ `/welcome-founding-50` - Onboarding for paying members
- What happens after they pay $4K?
  - Welcome email
  - Discord invite
  - First course unlocked
  - Schedule first 1-on-1

---

#### 10. **Email Verification Flow**
- ❓ Email confirmation page/flow
- Supabase sends magic link → Where does it redirect?
- Should redirect to `/verify-email` → then `/student` or `/onboarding`

---

### **Nice to Have (Can Wait):**

#### 11. **FAQ Page**
- `/faq` - Common questions before buying
- "Is $4K refundable?"
- "How does goal-based access work?"
- "What if I can't commit 10-20 hrs/week?"

---

#### 12. **Testimonials/Social Proof Page**
- `/success-stories` - Student case studies
- Won't have this for first 10 customers
- Build after first wins

---

#### 13. **Free Preview Lesson** (From homepage link)
- ❌ `/preview` - Currently linked from homepage, goes to 404
- "🎁 Try one complete lesson free before you buy"
- Should show video player with AI features
- No login required

---

## 🗑️ What to Remove Before Launch

### **Delete These Routes:**
```bash
# Test/debug pages
src/app/demo/
src/app/debug/
src/app/test-*/
src/app/playground/
src/app/clear-all/

# Mock/duplicate pages
src/app/student/goals-mock/
src/app/learn/[id]/ # (if redundant with /student/course/[id])
```

### **Update Sidebar:**
- Remove links to deleted pages
- Clean up instructor sidebar (already removed lessons/confusions)

---

## 📊 Data Requirements

### **Seed Database With:**
1. **Your First Course**
   - Upload "Upwork $100K Blueprint" or starter course
   - At least 3-5 videos with transcripts
   - Test video player + AI interactions

2. **Free Course**
   - "Get to $1K/mo in 30 Days"
   - 5 short lessons (~20 min total)
   - Accessible without payment

3. **Blog Posts** (if keeping blog)
   - Replace mock data with 2-3 real posts
   - Or hide blog until you have content

### **Stripe Setup:**
1. **Create Product:**
   - Name: "Founding 50 - Annual Membership"
   - Price: $4,000/year (one-time or recurring)
   - Description: "Lock in lifetime rate - First 50 members only"

2. **Payment Links:**
   - Generate checkout URL
   - Replace test links on homepage
   - Test payment flow end-to-end

3. **Webhooks:**
   - Listen for `checkout.session.completed`
   - Grant access to courses after payment
   - Send welcome email

---

## ⚙️ Technical Issues to Fix

### **1. Broken Links (404s):**
- `/terms` ← Linked from signup
- `/privacy` ← Linked from signup
- `/preview` ← Linked from homepage
- `/instructors` ← Linked from homepage

### **2. Test Mode Artifacts:**
- Stripe test links on pricing section
- Hardcoded "38 spots remaining" counter
- Mock blog data

### **3. Email Flow:**
- Email confirmation required? (Supabase setting)
- Welcome email after signup? (Set up in Supabase or ConvertKit)
- Payment confirmation email? (Stripe webhook)

### **4. AI Cost Protection:**
- Free course: 10 AI interactions max
- Paid members: Unlimited
- Rate limiting implemented? (Check server actions)

---

## 🚀 Launch Checklist (In Order)

### **Week 1: Legal & Core Pages**
- [ ] Create `/terms` page (use template)
- [ ] Create `/privacy` page (use template)
- [ ] Create `/refund` page (30-day money back for $4K)
- [ ] Create `/about` page (your story + proof)
- [ ] Remove all test/debug routes
- [ ] Update homepage pricing to $4K/year offer

### **Week 2: Sales Flow**
- [ ] Set up Stripe $4K product (live mode)
- [ ] Create `/checkout/founding-50` page or use hosted checkout
- [ ] Integrate Calendly on `/book-call` page
- [ ] Test payment → access grant flow
- [ ] Create `/success` page (post-payment)

### **Week 3: Free Course**
- [ ] Record 5 free course lessons
- [ ] Upload to `/course/upwork-1k-free`
- [ ] Add email capture gate
- [ ] Implement 10 AI interaction limit
- [ ] Test email → free course → nurture sequence

### **Week 4: Onboarding**
- [ ] Create `/welcome` or `/onboarding` wizard
- [ ] Goal selection during signup or after
- [ ] First course unlock based on goal
- [ ] Welcome email with Discord invite
- [ ] Test full user journey: Ad → Email → Free Course → Call → $4K → Onboarding

---

## 📋 Pre-Launch Test Scenarios

### **Scenario 1: Free User Journey**
1. Click ad → Land on homepage
2. Click "Get Free Course" → Email popup
3. Enter email + revenue + goal → Redirect to free course
4. Watch 3 videos → Use 5 AI interactions
5. Receive Day 6 email → Click "Book Call"
6. Book strategy call → Zoom with you → Close $4K

### **Scenario 2: Direct Buyer Journey**
1. Click ad → Land on homepage
2. Click "Join Founding 50" → Book call directly
3. Strategy call → Send payment link
4. Pay $4K → Access unlocked
5. Land on `/welcome-founding-50` → Guided onboarding
6. Courses unlocked based on goal

### **Scenario 3: Payment Flow**
1. Complete Stripe checkout for $4K
2. Webhook triggers access grant
3. User redirected to `/success`
4. Email sent with Discord invite + next steps
5. Can access all courses for their goal tier
6. See "Monthly 1-on-1" booking button in dashboard

---

## 💰 Revenue Milestones

### **First 10 Customers = $40K**
**Requirements:**
- Legal pages ✅
- Working payment flow ✅
- Free course for lead gen ✅
- Strategy call booking ✅
- Onboarding for paid members ✅

### **First 50 Customers = $200K**
**Additional needs:**
- Testimonials from first 10
- Case studies (revenue proof)
- Referral program
- Better onboarding automation

---

## The Critical Path (Next 2 Weeks)

### **Must Do (Blockers):**
1. ✅ Create legal pages (`/terms`, `/privacy`, `/refund`)
2. ✅ Set up Stripe $4K product (live mode)
3. ✅ Update homepage pricing to $4K/year
4. ✅ Replace test Stripe links with real checkout
5. ✅ Record free course (5 lessons)
6. ✅ Set up Calendly for call booking
7. ✅ Test full payment → access flow

### **Should Do (High Value):**
8. Create `/about` page with your story
9. Create `/welcome` onboarding wizard
10. Set up email confirmation flow
11. Add AI rate limiting for free users
12. Remove test/debug routes

### **Can Wait:**
- FAQ page
- Testimonials (don't have yet)
- Instructor landing page (not needed for solo launch)
- Blog content (has mock data, can hide)

---

## Fastest Path to First Sale

**Day 1-3:**
- Create `/terms`, `/privacy`, `/refund` (templates)
- Set up Stripe $4K product
- Update homepage with real checkout link

**Day 4-7:**
- Record 5 free course lessons
- Upload to platform
- Add Calendly integration

**Day 8-10:**
- Run test ads ($500 budget)
- Book 5 strategy calls
- Close first 2-3 sales = $8K-12K

**Day 11-14:**
- Get testimonial from first customers
- Optimize ad/email based on data
- Scale to 10 sales = $40K

---

## Bottom Line

**You're 80% there. Critical gaps:**

1. **Legal pages** (2-3 hours to create from templates)
2. **Stripe live setup** (1 hour)
3. **Free course** (1 day to record + upload)
4. **Remove test routes** (30 min)
5. **Update pricing** (1 hour)

**Total time to launch-ready: 3-4 days of focused work.**

Then: Run ads → Book calls → Close $4K sales.

What should we tackle first?

# Unpuzzle MVP - Product Specification

## 🎯 Vision
AI-powered online course platform that accelerates learning through contextual assistance and adaptive content delivery. The only platform that measures how you learn, not just what you watch.

## 🤖 Core AI Agents

### 1. Puzzle Hint
- **Trigger**: Video pause or confusion detection (rewinding, repeated pauses)
- **Action**: Offers contextual hints based on current timestamp
- **Context**: Analyzes full transcript + last 30 seconds

### 2. Puzzle Check
- **Trigger**: Timed intervals or completion milestones
- **Action**: Context-aware quiz questions
- **Context**: Current position + recent content

### 3. Puzzle Reflect
- **Trigger**: End of sections or key concepts
- **Action**: Prompts voice/video reflection
- **Review**: Instructor/moderator feedback loop

### 4. Puzzle Path
- **Trigger**: Struggle detection (quiz failures, excessive rewinding, slow Execution Pace)
- **Action**: Injects supplementary content dynamically
- **Result**: Personalized learning path

## 📱 Complete Page Structure

### 🌐 Public Routes (Marketing)
- `/` - Landing page with hero, features, testimonials
- `/courses` - Browse all courses (with filters)
- `/course/[id]` - Course preview page (trailer, curriculum, reviews)
- `/pricing` - Pricing comparison table
- `/instructors` - Featured instructors showcase
- `/blog` - SEO content, learning tips
- `/blog/[slug]` - Individual blog posts
- `/about` - Company mission, team
- `/contact` - Support form
- `/privacy` - Privacy policy
- `/terms` - Terms of service

### 🔐 Authentication Routes
- `/signup` - Email/Google/GitHub registration
- `/login` - With role selection
- `/forgot-password` - Password reset flow
- `/verify-email` - Email confirmation

### 🎓 Learner Routes (Protected)
- `/learn` - Dashboard home
- `/learn/courses` - My enrolled courses
- `/learn/course/[id]/video/[videoId]` - Video player with AI agents
- `/learn/metrics` - Personal learning analytics
- `/learn/bookmarks` - Saved timestamps & notes
- `/learn/reflections` - My submitted reflections
- `/learn/settings` - Profile, preferences
- `/learn/billing` - Payment history, methods

### 👨‍🏫 Instructor Routes (Protected)
- `/teach` - Instructor dashboard
- `/teach/courses` - Manage all courses
- `/teach/course/new` - Create new course
- `/teach/course/[id]/edit` - Edit course details
- `/teach/course/[id]/content` - Manage videos, order
- `/teach/course/[id]/upload` - Upload new videos
- `/teach/course/[id]/quizzes` - Create/edit quizzes
- `/teach/course/[id]/analytics` - Course performance metrics
- `/teach/course/[id]/students` - Student roster & progress
- `/teach/course/[id]/reflections` - Review & respond to reflections
- `/teach/earnings` - Revenue dashboard
- `/teach/payouts` - Withdrawal requests
- `/teach/settings` - Instructor profile, bio
- `/teach/apply` - Application to become instructor (if not approved)

### 🛠️ Admin Routes (Protected - Platform Admins)
- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/instructors` - Approve/reject applications
- `/admin/courses` - Course moderation
- `/admin/reports` - Platform analytics
- `/admin/revenue` - Financial overview
- `/admin/support` - Support tickets
- `/admin/content` - Blog/marketing content CMS
- `/admin/settings` - Platform configuration

### 🔄 Shared/Utility Routes
- `/api/*` - Backend API endpoints
- `/webhook/*` - Stripe, video processing webhooks
- `/search` - Global search page
- `/notifications` - Notification center
- `/help` - Help center, FAQs
- `/404` - Not found page
- `/500` - Error page

## 🔄 User Flows

### Learner Journey
```
Sign Up → Browse Courses → Start Free Course
    ↓
Watch Video → Pause → AI Hint Offered
    ↓
Continue → Quiz Prompt → Complete Quiz
    ↓
Struggle Detected → Supplementary Content Added
    ↓
Complete Section → Reflection Prompt → Submit Recording
    ↓
Receive Feedback → Continue Learning
```

### Instructor Journey
```
Sign Up → Apply as Instructor → Approval
    ↓
Create Course → Upload Videos → Generate Transcripts
    ↓
Add Quiz Points → Set Reflection Prompts
    ↓
Publish Course → Monitor Analytics
    ↓
Review Reflections → Provide Feedback
```

## 💰 Monetization Model

### For Learners
- **Pay per course** (set by instructors)
- All AI features included with course purchase
- 10 free AI interactions to try before buying
- Access to free courses with limited AI

### For Instructors  
- **Free tier**: Up to $1000 in sales/month
- **Pro tier ($49/month)**: Unlimited sales
- **Platform commission**: 
  - 30% on free tier
  - 15% on pro tier

### Course Pricing
- Instructors set prices ($29-$299)
- AI features included (not separate charge)
- One-time purchase = lifetime access
- Bundles and discounts available

### Enterprise ($Custom)
- Custom AI training
- Private instance
- SSO integration
- Bulk licenses
- API access

## 💳 Payment Flows

### AI Trial to Purchase
```
Free User → Uses 10th AI interaction → "You've hit your trial limit"
    ↓
Show value: "You've improved your Learn Rate by 40% with AI"
    ↓
Purchase Course → Payment (Stripe) → Unlimited AI for this course
```

### Course Purchase (One-time)
```
Browse → Select Course → Preview Available
    ↓
Add to Cart → Checkout → Payment
    ↓
Lifetime Access Granted
```

### Instructor Earnings
```
Student Pays → 70% (free tier) or 85% (pro tier) to Instructor
    ↓
Monthly Threshold ($100) → Payout Options
    ↓
Bank Transfer / Stripe
```

## 🚀 Development Phases with Manual Checkpoints

### Phase 0: Project Setup ✅
**TODO:**
- [x] Initialize Next.js 14 project (v15.4.5 with React 19)
- [x] Install Tailwind CSS + Shadcn/ui (New York style configured)
- [x] Setup project structure (components, pages, lib, types)
- [x] Configure ESLint and Prettier (with Tailwind plugin)
- [x] Setup Git repository (local initialized, remote pending)
- [x] Create mock data files structure (courses, users, AI agents, analytics)
- [x] Setup environment variables template (.env.example)

**✋ CHECKPOINT: Review project structure and dependencies** ✅ COMPLETED 2025-08-06

### Phase 1: Core UI Components with Mock Data ✅
**TODO:**
- [x] Create layout components (Header, Sidebar, Footer)
- [x] Build video player component
- [x] Create AI chat sidebar component
- [x] Design AI agent cards (Hint, Check, Reflect, Path)
- [x] Build course card component
- [x] Create learning metrics display widgets  
- [x] Design responsive navigation menu
- [x] Build mock data for 2 courses with 5 videos each
- [x] Add dark/light mode toggle (bonus)
- [x] **ENHANCEMENT: Replaced with AI-Enhanced Course Cards** featuring:
  - AI Match Score (89% compatibility)
  - Learning metrics (Learn Rate, AI interactions, completion time)
  - Struggling topics detection with alerts
  - Time-based AI features (Hints, Quiz, Reflections, Adaptive Path)
  - Contextual CTAs and progress tracking

**✋ CHECKPOINT: Review component library and design system** ✅ COMPLETED 2025-08-06

### Phase 2: Learner Experience Pages
**TODO:**
- [x] `/` Landing page with hero section (COMPLETED)
- [x] `/courses` Browse courses page with filters (COMPLETED - with AI-enhanced course cards)
- [x] `/course/[id]` Course preview with curriculum (COMPLETED - comprehensive detail page with AI insights, curriculum, reviews, instructor profile)
- [x] `/learn` Dashboard with enrolled courses (COMPLETED - comprehensive learner dashboard)
- [x] `/learn/course/[id]/video/[videoId]` Video player with AI (COMPLETED - full video player with AI chat sidebar)
- [x] `/learn/metrics` Personal analytics page (COMPLETED - detailed learning metrics and analytics)
- [x] `/learn/bookmarks` Saved timestamps (COMPLETED - bookmark management interface)
- [x] `/learn/reflections` Submitted reflections list (COMPLETED - reflection history and management)
- [x] Mock AI interactions and responses (COMPLETED - AI chat sidebar with mock responses)

**✋ CHECKPOINT: Test complete learner flow with mock data** ✅ COMPLETED 2025-08-08

### Phase 3: Instructor Experience Pages
**TODO:**
- [ ] `/teach` Instructor dashboard
- [ ] `/teach/courses` Course management table
- [ ] `/teach/course/new` Course creation wizard
- [ ] `/teach/course/[id]/edit` Course details editor
- [ ] `/teach/course/[id]/content` Video management
- [ ] `/teach/course/[id]/analytics` Mock analytics charts
- [ ] `/teach/course/[id]/students` Student roster
- [ ] `/teach/earnings` Revenue dashboard with mock data
- [ ] Mock dropout heatmap visualization

**✋ CHECKPOINT: Review instructor tools and analytics**

### Phase 4: Authentication & Database Setup
**TODO:**
- [ ] Setup Supabase project
- [ ] Configure authentication (Email, Google, GitHub)
- [ ] Create database schema (users, courses, videos, enrollments)
- [ ] Setup Row Level Security policies
- [ ] Implement auth context and hooks
- [ ] Create API routes for data fetching
- [ ] Replace mock data with database queries
- [ ] Add loading and error states

**✋ CHECKPOINT: Test auth flow and data persistence**

### Phase 5: AI Integration
**TODO:**
- [ ] Setup OpenAI API integration
- [ ] Implement transcript processing
- [ ] Create vector embeddings with pgvector
- [ ] Build Puzzle Hint agent logic
- [ ] Implement Puzzle Check quiz generation
- [ ] Create Puzzle Reflect prompting
- [ ] Build Puzzle Path content recommendation
- [ ] Add real-time AI response streaming
- [ ] Implement usage tracking for free tier

**✋ CHECKPOINT: Test AI agents with real interactions**

### Phase 6: Video & Payment Infrastructure
**TODO:**
- [ ] Setup Backblaze B2 bucket
- [ ] Configure Bunny.net CDN
- [ ] Implement video upload flow
- [ ] Add video processing/transcoding
- [ ] Integrate Stripe for payments
- [ ] Create checkout flow
- [ ] Implement instructor payout system
- [ ] Add commission calculation logic
- [ ] Setup webhook handlers

**✋ CHECKPOINT: Test complete purchase and payout flow**

### Phase 7: Analytics & Metrics
**TODO:**
- [ ] Implement Learn Rate calculation
- [ ] Build Execution Rate tracking
- [ ] Create Execution Pace measurement
- [ ] Generate real dropout heatmaps
- [ ] Add PostHog analytics
- [ ] Create admin dashboard
- [ ] Implement instructor analytics
- [ ] Build student progress tracking

**✋ CHECKPOINT: Verify all metrics are accurate**

### Phase 8: Production Readiness
**TODO:**
- [ ] Add error boundaries
- [ ] Implement rate limiting
- [ ] Setup monitoring (Sentry)
- [ ] Optimize performance (lazy loading, caching)
- [ ] Add SEO meta tags
- [ ] Create sitemap
- [ ] Write API documentation
- [ ] Setup CI/CD pipeline
- [ ] Configure production environment
- [ ] Mobile responsive testing

**✋ CHECKPOINT: Final review before launch**


## 📊 Success Metrics
- Course completion rate (target: 40%+)
- AI interaction rate (target: 70%+ use hints)
- **Learning Behavior Metrics**:
  - Average Learn Rate: 30+ min/hour (50% active learning)
  - Execution Rate: 80%+ completion of prompted activities
  - Execution Pace: <60s average response time
- Monthly recurring revenue
- Instructor satisfaction (NPS 50+)
- Learning improvement (pre/post assessments)

## 🔧 Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, Shadcn/ui
- **Backend & Database**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **AI**: OpenAI API, Supabase Vector (pgvector for embeddings)
- **Video Storage**: Backblaze B2 (storage) + Bunny.net (CDN/streaming)
- **Payments**: Stripe
- **Analytics**: PostHog (open-source alternative)

### Future Vision (Post-MVP)
- **App Marketplace**: Instructors install domain-specific tools
  - Code courses: IDE, debugger, GitHub integration
  - Creative courses: Canvas tools, design assets
  - Skill courses: Practice trackers, form analyzers
- Developer API for third-party apps
- Revenue sharing with app developers

---

## 🔗 CLICKABLE DEMO LINKS (Current Implementation)

### 🌐 Public/Marketing Pages
- **Landing Page**: http://localhost:3000/
- **Browse All Courses**: http://localhost:3000/courses
- **Course Preview (Web Dev)**: http://localhost:3000/course/course-1
- **Course Preview (Machine Learning)**: http://localhost:3000/course/course-2
- **Course Preview (Data Science)**: http://localhost:3000/course/course-3

### 🎓 Learner Dashboard & Learning Experience  
- **Learner Dashboard**: http://localhost:3000/learn
- **Learning Metrics**: http://localhost:3000/learn/metrics
- **My Bookmarks**: http://localhost:3000/learn/bookmarks
- **My Reflections**: http://localhost:3000/learn/reflections

### 📹 Video Learning Experience (Core Feature)
**Web Development Course:**
- **Lesson 1 - HTML Fundamentals**: http://localhost:3000/learn/course/course-1/video/1
- **Lesson 2 - CSS Styling**: http://localhost:3000/learn/course/course-1/video/2
- **Lesson 3 - JavaScript Basics**: http://localhost:3000/learn/course/course-1/video/3
- **Lesson 4 - Responsive Design**: http://localhost:3000/learn/course/course-1/video/4
- **Lesson 5 - Project Building**: http://localhost:3000/learn/course/course-1/video/5

**Machine Learning Course:**
- **Lesson 1 - ML Introduction**: http://localhost:3000/learn/course/course-2/video/1
- **Lesson 2 - Linear Regression**: http://localhost:3000/learn/course/course-2/video/2
- **Lesson 3 - Data Preprocessing**: http://localhost:3000/learn/course/course-2/video/3
- **Lesson 4 - Neural Networks**: http://localhost:3000/learn/course/course-2/video/4
- **Lesson 5 - Model Evaluation**: http://localhost:3000/learn/course/course-2/video/5

**Data Science Course:**
- **Lesson 1 - Python Fundamentals**: http://localhost:3000/learn/course/course-3/video/1
- **Lesson 2 - Data Analysis**: http://localhost:3000/learn/course/course-3/video/2
- **Lesson 3 - Pandas & NumPy**: http://localhost:3000/learn/course/course-3/video/3
- **Lesson 4 - Data Visualization**: http://localhost:3000/learn/course/course-3/video/4
- **Lesson 5 - Statistical Analysis**: http://localhost:3000/learn/course/course-3/video/5

### 🧪 Experimental Features (Advanced)
**Enhanced Video Experience with Pause Annotations:**
- **Web Dev with Pause Features**: http://localhost:3000/learn/course/course-1/video/1/experimental
- **ML with Pause Features**: http://localhost:3000/learn/course/course-2/video/1/experimental
- **Data Science with Pause Features**: http://localhost:3000/learn/course/course-3/video/1/experimental

### 🎯 Key Features to Test:
1. **AI Chat Sidebar** - Click "Show AI Assistant" in any video page
2. **Pause Annotations** - Pause any video in experimental pages to see AI action prompts
3. **Learning Metrics** - View personalized analytics and AI insights
4. **Course Progression** - Navigate between lessons using next/previous buttons
5. **Responsive Design** - Test on different screen sizes
6. **AI-Enhanced Course Cards** - View AI match scores and learning predictions
7. **Bookmarks & Reflections** - Access saved content and submitted reflections

### ⚡ Live Development Server
**Current Port**: http://localhost:3000

**Note**: Make sure the development server is running with `npm run dev` before clicking these links.

---

### 📊 Implementation Status Summary
- ✅ **Phase 0**: Project Setup (100%)
- ✅ **Phase 1**: Core UI Components (100%) 
- ✅ **Phase 2**: Learner Experience (100% - All pages complete)
- ❌ **Phase 3**: Instructor Experience (0%)
- ❌ **Phase 4**: Auth & Database (0%)
- ❌ **Phase 5**: AI Integration (Mock data only)
- ❌ **Phase 6**: Video & Payments (0%)
- ❌ **Phase 7**: Analytics & Metrics (Mock data only)
- ❌ **Phase 8**: Production Readiness (Security fixes in progress)

**Overall Progress: ~50% Complete** (Phases 0-2 are fully complete with comprehensive learner experience)
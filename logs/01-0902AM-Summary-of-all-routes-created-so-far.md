# Unpuzzle MVP - Complete Route Summary
## Last Updated: 2025-08-10

## Route Structure Overview

The application follows a clear routing strategy:
- `/learn/*` - Public routes (no authentication required)
- `/student/*` - Authenticated student routes
- `/instructor/*` - Instructor dashboard and management
- `/moderator/*` - Moderator dashboard and management
- `/blog/*` - Blog system with static generation
- `/` - Public homepage
- `/courses` - Public course listing
- `/course/*` - Public course detail pages

---

## 🌐 Public Routes (No Authentication Required)

### Homepage & Course Discovery
- **[`http://localhost:3000/`](http://localhost:3000/)** - Homepage with hero section, course cards, and CTAs
- **[`http://localhost:3000/alt`](http://localhost:3000/alt)** - Alternative homepage design
- **[`http://localhost:3000/courses`](http://localhost:3000/courses)** - Public course listing page
- **[`http://localhost:3000/course/1`](http://localhost:3000/course/1)** - Public course detail page (example: course ID 1)
- **[`http://localhost:3000/course/1/alt`](http://localhost:3000/course/1/alt)** - Alternative course detail page design

### Learn Routes (Public Video Learning)
- **[`http://localhost:3000/learn/1`](http://localhost:3000/learn/1)** - Public video learning page with AI features (example: video ID 1)
- **[`http://localhost:3000/learn/course/1/video/video-1`](http://localhost:3000/learn/course/1/video/video-1)** - Video player page (example: course 1, video-1)
- **[`http://localhost:3000/learn/course/1/video/video-1/experimental`](http://localhost:3000/learn/course/1/video/video-1/experimental)** - Experimental video player

### Blog System (SEO Optimized with Static Generation)
- **[`http://localhost:3000/blog`](http://localhost:3000/blog)** - Blog listing page with categories and search
- **[`http://localhost:3000/blog/ai-powered-learning-revolution`](http://localhost:3000/blog/ai-powered-learning-revolution)** - Example blog post
- **[`http://localhost:3000/blog/stop-rewinding-start-understanding`](http://localhost:3000/blog/stop-rewinding-start-understanding)** - Example blog post
- **[`http://localhost:3000/blog/from-confusion-to-clarity`](http://localhost:3000/blog/from-confusion-to-clarity)** - Example blog post

---

## 🎓 Student Routes (Authentication Required)

### Student Dashboard
- **[`http://localhost:3000/student`](http://localhost:3000/student)** - Student dashboard homepage
- **[`http://localhost:3000/student/courses`](http://localhost:3000/student/courses)** - Student's enrolled courses
- **[`http://localhost:3000/student/metrics`](http://localhost:3000/student/metrics)** - Learning metrics and progress
- **[`http://localhost:3000/student/bookmarks`](http://localhost:3000/student/bookmarks)** - Saved content and bookmarks
- **[`http://localhost:3000/student/reflections`](http://localhost:3000/student/reflections)** - Learning reflections
- **[`http://localhost:3000/student/community`](http://localhost:3000/student/community)** - Community features

### Student Video Learning
- **[`http://localhost:3000/student/course/1/video/video-1`](http://localhost:3000/student/course/1/video/video-1)** - Authenticated video learning (example)

---

## 👨‍🏫 Instructor Routes

### Dashboard & Analytics
- **[`http://localhost:3000/instructor`](http://localhost:3000/instructor)** - Instructor dashboard with:
  - Total students & revenue
  - Execution rate & learn rate
  - Charts (Shopify-style) with date range picker
  - Global course selector dropdown
  - Profile dropdown for role switching

### Course Management
- **[`http://localhost:3000/instructor/courses`](http://localhost:3000/instructor/courses)** - Manage instructor courses
- **[`http://localhost:3000/instructor/course/new`](http://localhost:3000/instructor/course/new)** - Create new course
- **[`http://localhost:3000/instructor/course/1/analytics`](http://localhost:3000/instructor/course/1/analytics)** - Course analytics (example: course 1)

### Lesson Management
- **[`http://localhost:3000/instructor/lessons`](http://localhost:3000/instructor/lessons)** - Manage lessons
- **[`http://localhost:3000/instructor/lesson/new`](http://localhost:3000/instructor/lesson/new)** - Create new lesson (standalone videos)

### Student Interaction
- **[`http://localhost:3000/instructor/confusions`](http://localhost:3000/instructor/confusions)** - View and manage student confusions
- **[`http://localhost:3000/instructor/respond/confusion-1`](http://localhost:3000/instructor/respond/confusion-1)** - Respond to confusion (example)
- **[`http://localhost:3000/instructor/promote`](http://localhost:3000/instructor/promote)** - Promote courses and content

---

## 👮 Moderator Routes

### Dashboard
- **[`http://localhost:3000/moderator`](http://localhost:3000/moderator)** - Moderator dashboard (Trust Score removed from sidebar)
- **[`http://localhost:3000/moderator/respond/issue-1`](http://localhost:3000/moderator/respond/issue-1)** - Respond to community issue (example)

---

## 🏗️ Architecture Details

### State Management (Zustand)
All routes use Zustand for state management except blog content which uses static generation for SEO:
- User state (authentication, profile)
- Course state (filtering, selection)
- Video state (playback, transcripts)
- AI state (chat, confusions, reflections)
- Instructor state (metrics, analytics)
- Blog UI state (likes, bookmarks, filters)

### Key Features by Route Type

#### Public Routes (`/learn/*`)
- No authentication required
- YouTube transcript integration
- AI chat sidebar
- Confusion tracking
- Public access to course content

#### Student Routes (`/student/*`)
- Authentication required
- Personalized progress tracking
- Bookmarks and saved content
- Community features
- Enhanced video controls

#### Instructor Routes (`/instructor/*`)
- Global course selector (persists across navigation)
- Revenue and student metrics
- Learn rate tracking (mins/hr)
- Execution pace monitoring
- Confusion response system
- Course and lesson creation

#### Blog Routes (`/blog/*`)
- Static generation for SEO
- Server-side metadata generation
- Client-side interactivity (likes, bookmarks)
- Newsletter subscription
- Related posts

### Component Architecture

#### Shared Components
- **Sidebar** (`/components/layout/sidebar.tsx`) - Shared across all authenticated routes
- **Header** - Different variants for different route types
- **Course Selector** - Global dropdown in instructor routes

#### Layout Structure
- Fixed sidebar (non-scrollable)
- Responsive design
- Role-based navigation
- Profile dropdown with role switching

---

## 📝 Recent Updates

1. **Blog System Refactoring**: Migrated from full Zustand integration to Next.js static generation for better SEO
2. **Instructor Dashboard**: Redesigned with Shopify-style charts and metrics
3. **Global Course Selector**: Simplified UI, removed redundant elements
4. **Sidebar Optimization**: Using shared component instead of duplicates
5. **Homepage Standardization**: Using third course card design with AI tips

---

## 🚀 Deployment Notes

### Static Generation
- Blog posts are pre-built at build time
- Blog content stored in `/src/data/blog-posts.ts`
- SEO metadata generated server-side

### Authentication Flow
- Public routes: `/`, `/learn/*`, `/blog/*`, `/courses`, `/course/*`
- Protected routes: `/student/*`, `/instructor/*`, `/moderator/*`
- Role-based access control implemented

### Performance Optimizations
- Static generation for blog
- Lazy loading for video components
- Optimized Zustand slices
- Minimal client-side state for blog

---

## 📊 Route Statistics

- **Total Routes**: 28
- **Public Routes**: 9
- **Student Routes**: 7
- **Instructor Routes**: 9
- **Moderator Routes**: 2
- **Blog Routes**: 2 (with 6 example blog posts)

## 🔗 Available Blog Posts

Current blog posts with direct links:
1. [`AI Powered Learning Revolution`](http://localhost:3000/blog/ai-powered-learning-revolution)
2. [`Stop Rewinding, Start Understanding`](http://localhost:3000/blog/stop-rewinding-start-understanding)
3. [`From Confusion to Clarity`](http://localhost:3000/blog/from-confusion-to-clarity)
4. [`Build, Learn, Ship, Repeat`](http://localhost:3000/blog/build-learn-ship-repeat)
5. [`Instructor Insights: Feedback Loops`](http://localhost:3000/blog/instructor-insights-feedback-loops)
6. [`Community Learning Multiplier Effect`](http://localhost:3000/blog/community-learning-multiplier-effect)

---

## 🔄 Pending/In Progress

- Affiliate marketing system (discussed but not implemented)
- Advanced analytics dashboards
- Payment integration
- Email notification system
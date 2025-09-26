# Community Page Data Analysis & Database Design

**Date:** September 25, 2025
**Context:** Community page component cleanup and database schema design
**Status:** Analysis complete, database design pending decisions

---

## EXECUTIVE SUMMARY

Based on analysis of the current community page components, I've identified the data structures currently used (static/mock data) and mapped them against the existing Supabase database schema. This document outlines the inferred data shapes and poses critical questions for database implementation.

---

## CURRENT COMMUNITY PAGE STRUCTURE

### **Main Route:** `/src/app/community/page.tsx`
- **CommunityHeader** - Hero section with gallery, pricing CTA, and tabbed navigation
- **CommunityReviewsSection** - Customer reviews and ratings display

### **Active Components** (9 total, used in CommunityHeader tabs):
1. `CommunityPostsFeed` - Community posts and discussions
2. `CommunityGoalsSection` - Student goal tracking and progress
3. `CommunityCoursesSection` - Course catalog organized by goals
4. `GoalDiggersLeaderboard` - Student rankings and achievements
5. `SuccessProofSection` - Success stories and testimonials
6. `AffiliatesSection` - Affiliate program information
7. `CommunityResourcesSection` - Resource library
8. `CommunityReviewsSection` - Customer reviews
9. `CommunityHeader` - Main header with navigation

---

## INFERRED DATA SHAPES FROM COMPONENTS

### **1. Reviews & Ratings** ✅ **STATIC CONTENT**
*Removed from database design - staying as hardcoded component data*

### **2. Community Posts & Activities**
```typescript
interface Post {
  id: string
  author: {
    name: string
    role: 'instructor' | 'student'
    avatar?: string
    goal: string              // "Goal: $5K Shopify Agency"
  }
  content: string
  timestamp: string
  isPinned: boolean
  likes: number
  replies: Reply[]
  isLiked: boolean
}

interface Reply {
  id: string
  author: {
    name: string
    role: 'instructor' | 'student'
    goal: string
  }
  content: string
  timestamp: string
}

interface RecentActivity {
  id: number
  user: string               // "Sarah M." (from profiles.full_name)
  action: string             // "completed 'Building Your First Shopify App'"
  time: string              // "2 mins ago"
  type: 'course' | 'goal' | 'quiz' | 'reflection' | 'video' | 'conversation' | 'system'
  // course: completing courses, starting new courses
  // goal: going from $1k agency to $2k agency goal or $1k mrr to $2k mrr in SaaS goal
  // quiz: taking quizzes on video pages, quiz score
  // reflection: submitting reflections such as voice memo or looms (possibly more in the future)
  // video: video completions
  // conversation: AI summary of student's posts from conversation_messages table (goal conversations between student and instructor)
  // system: automated tracking like login streaks, course completions, video AI agent activity
}
```

### **3. Goals & Progress Tracking**
```typescript
interface Goal {
  id: string
  title: string
  track: 'agency' | 'saas'
  startAmount: string         // "$0"
  targetAmount: string        // "$5000"
  status: 'active' | 'completed' | 'paused'
  progress: number           // 0-100 percentage
  startDate: string
  completedDate?: string
  milestones: Milestone[]
  metrics?: GoalMetrics
  actions?: Action[]
}

interface GoalMetrics {
  learnRate: number          // minutes of video per hour session
  executionRate: number      // percentage of milestones hit on time
  executionPace: 'fast' | 'steady' | 'slow'
  ranking: number           // ranking by speed (days to complete)
  daysToComplete?: number
}

interface Milestone {
  id: string
  title: string
  targetAmount: string      // "$1000"
  completed: boolean
  completedDate?: string
}
```

### **4. Courses & Learning Content**
```typescript
interface Course {
  id: string
  title: string
  description: string
  duration: string          // "4h 30m"
  videos: number
  progress: number          // 0-100
  completed: boolean
  completedDate?: string
  goalTrack: 'agency' | 'saas'
  goalLevel: string         // '$1K', '$3K', '$5K'
  instructor: string
  thumbnail?: string
  category: 'sales' | 'service-delivery' | 'marketing'
  order: number
  actions: string[]         // list of required actions
}

interface CoursesByGoal {
  goalTitle: string         // "Goal: $5K Shopify Agency"
  goalLevel: string         // "$5K"
  status: 'completed' | 'current' | 'upcoming'
  courses: Course[]
}
```

### **5. Gallery & Media**
```typescript
interface GalleryItem {
  id: number
  type: 'video' | 'image'
  src: string
  thumbnail?: string        // for videos
  title: string
  description: string
}
```

---

## EXISTING DATABASE SCHEMA ANALYSIS

### **Current Tables (from Supabase migrations):**

#### **Core User System:**
- `profiles` - User profiles with role ('student', 'instructor', 'admin')
- `subscriptions` - User subscription management
- `tracks` - Learning tracks (agency, saas)
- `track_goals` - Goals within each track
- `courses` - Course content with instructor assignments

#### **Learning & Progress:**
- `course_track_assignments` - Links courses to tracks
- `course_goal_assignments` - Links courses to goals
- `user_actions` - Action tracking with points system
- `conversations` - AI conversation system
- `reflections` - Student reflection submissions
- `quiz_attempts` - Quiz completion tracking

#### **Key Relationships:**
- `profiles.current_track_id` → `tracks.id`
- `profiles.current_goal_id` → `track_goals.id`
- `courses.instructor_id` → `profiles.id`

---

## CRITICAL QUESTIONS FOR DATABASE DESIGN

### **1. Community Architecture Decision**
**Question:** Should we implement the community-based schema from the design document, or work with the current track/goal structure?

**Current State:** Components expect community-isolated data, but database uses global tracks/goals.

**Options:**
- A) Implement full community schema (communities, community_memberships tables)
- B) Adapt components to use existing track/goal structure
- C) Hybrid approach - keep tracks/goals but add community grouping

### **2. Reviews & Testimonials** ✅ **DECIDED**
**Decision:** Reviews will remain static/curated content (no database integration).

**Current State:** All reviews are hardcoded mock data - **KEEPING AS IS**.

**Database Needs:** None - reviews stay in component as static data.

### **3. Community Posts & Discussions**
**Question:** Should the community posts be real user-generated content or instructor-managed announcements?

**Current State:** Mock discussion data with likes/replies.

**Database Needs:**
- `community_posts` table
- `post_replies` and `post_likes` tables
- Real-time updates or static content?

### **4. Activity Feed** ✅ **DECIDED**
**Decision:** Real-time user actions from existing tracking systems.

**Current State:** Mock activity data - **WILL CONNECT TO REAL DATA**.

**Database Integration:**
- Use existing tables: `quiz_attempts`, `reflections`, `conversation_messages`
- Track `profiles.current_goal_id` changes for goal transitions
- Track: quiz scores, reflection submissions, conversation summaries
- System actions: course completions, goal upgrades, milestones reached
- User actions: posts in conversation_messages, reflections submitted

### **5. Leaderboards & Rankings**
**Question:** Real competitive leaderboards or motivational mock data?

**Current State:** Mock leaderboard with earnings and rankings.

**Database Needs:**
- Real rankings: Query `user_actions` with goal progress
- Privacy concerns: anonymized vs. real names

### **6. Data Privacy & Isolation**
**Question:** How should student data be isolated and protected?

**Current State:** RLS policies exist but don't match community isolation patterns.

**Database Needs:**
- Community-based RLS policies
- Student consent for public data display
- Anonymization strategies

---

## RECOMMENDED IMPLEMENTATION APPROACH

### **Phase 1: Static to Semi-Dynamic**
1. ✅ Keep reviews and testimonials static (curated by instructor) - **CONFIRMED**
2. ✅ Make activity feed pull from real `user_actions` + goal conversations - **CONFIRMED**
3. Real course progress from existing tables
4. Static gallery and pricing content

### **Phase 2: Community Features**
1. Implement real community posts system
2. Add user-to-user interactions (likes, replies)
3. Real leaderboards with privacy controls
4. Community-scoped data isolation

### **Phase 3: Full Community Platform**
1. Multi-community support
2. Community-based subscriptions
3. Advanced analytics and metrics
4. Full community management tools

---

## IMMEDIATE NEXT STEPS NEEDED

### **Decision Points:**
1. **Confirm community architecture** - Full community system or current track/goal structure?
2. ✅ **Define data sources** - Reviews will remain static, other components TBD
3. **Privacy requirements** - How much student data should be public?
4. **Real-time needs** - Which features need live updates?

### **Database Tasks (pending decisions):**
1. Create missing tables for chosen approach
2. Update RLS policies for data isolation
3. Build queries for component data needs
4. Set up proper indexes for performance

### **Application Tasks:**
1. Connect components to real data sources
2. Add loading states and error handling
3. Implement proper TypeScript interfaces
4. Add data fetching patterns

---

**This analysis provides the foundation for converting the static community page into a fully functional, database-driven community platform. Please review the questions above and provide direction on the architecture decisions.**
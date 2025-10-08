# Community Page Database Integration Plan

## Executive Summary

The `/community` route currently uses mock data across multiple sections. This document provides a comprehensive strategy to integrate it with our existing database schema, identifying gaps, proposing new tables, and outlining implementation steps.

---

## Current State Analysis

### Mock Data Components

#### 1. **Community Posts Feed** (`CommunityPostsFeed.tsx`)
**Mock Data:**
- Posts with author, content, timestamp, likes, replies
- Author details: name, role (instructor/student), goal
- Reply threads with nested conversations
- Like counts and user interaction state

**Features:**
- Create posts
- Reply to posts
- Like/unlike posts
- Filter by: all posts, instructor posts, my posts
- Pin important posts (instructor only)

#### 2. **Goal Diggers Leaderboard** (`GoalDiggersLeaderboard.tsx`)
**Mock Data:**
- Student rankings based on multiple metrics
- Earnings ranges ($0-$1k, $1k-$5k, etc.)
- Learn rate (minutes/hour)
- Execution rate (percentage)
- Days active
- Completed goals count
- Total actions taken
- Amount earned
- Badges (top-performer, consistent, fast-learner, goal-crusher)

**Features:**
- Sort by: ranking, amount earned, actions taken, learn rate, name
- Filter by: all goals, agency track, saas track, top 10
- Real-time ranking changes

#### 3. **Success Stories** (`SuccessStoriesSection.tsx`)
**Mock Data:**
- Student achievements
- Anonymous names ("Member A", "Member B")
- Achievement descriptions
- Earnings details
- Goal type (shopify, ai, saas)
- Story text
- Date achieved

#### 4. **Community Stats** (`CommunityHeader.tsx`)
**Mock Data:**
- Total students
- Active this week
- Total community earnings
- Average learn rate
- Goal breakdown by type
- Real-time activities (scrolling feed)

---

## Existing Database Schema Analysis

### Relevant Tables

#### 1. **`profiles`**
```typescript
{
  id: string
  email: string
  full_name: string
  role: 'student' | 'instructor' | 'admin'
  current_track_id: string
  current_goal_id: string
  track_assigned_at: string
  goal_assigned_at: string
  created_at: string
  updated_at: string
}
```
**Usage:** Base user data, current track/goal assignment

#### 2. **`tracks`**
```typescript
{
  id: string
  name: string  // 'Agency Track', 'SaaS Track'
  description: string
  is_active: boolean
  created_at: string
}
```
**Usage:** Track definitions (Agency, SaaS)

#### 3. **`track_goals`**
```typescript
{
  id: string
  track_id: string
  name: string  // 'agency-1k', 'agency-3k', 'saas-5k-mrr'
  description: string
  target_amount: number
  is_default: boolean
  is_active: boolean
  order_position: number
  created_at: string
}
```
**Usage:** Goal definitions with target amounts

#### 4. **`student_track_assignments`**
```typescript
{
  id: string
  student_id: string
  track_id: string
  goal_id: string
  status: 'active' | 'completed' | 'paused'
  assigned_at: string
  completed_at: string | null
  created_at: string
}
```
**Usage:** Track and goal assignments per student

#### 5. **`goal_conversations`**
```typescript
{
  id: string
  student_id: string
  track_id: string
  goal_id: string
  status: 'active' | 'completed' | 'archived'
  transition_to_track_id: string | null
  created_at: string
  updated_at: string
}
```
**Usage:** Conversation threads for goal tracking

#### 6. **`conversation_messages`**
```typescript
{
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: string
  visibility: string
  reply_to_id: string | null
  is_draft: boolean
  created_at: string
  updated_at: string
}
```
**Usage:** Messages within goal conversations (could be repurposed for community posts)

#### 7. **`courses`** + **`course_goal_assignments`**
```typescript
// courses: {id, title, instructor_id, ...}
// course_goal_assignments: {course_id, goal_id}
```
**Usage:** Courses mapped to goals

#### 8. **`enrollments`**
```typescript
{
  id: string
  user_id: string
  course_id: string
  progress_percent: number
  completed_videos: number
  total_videos: number
  last_accessed_at: string
  completed_at: string | null
}
```
**Usage:** Student course progress

#### 9. **`video_progress`** (implied from enrollments)
**Usage:** Track video completion for learn rate calculations

---

## Database Gaps & Required Changes

### 🔴 MISSING TABLES

#### 1. **`community_posts`** (NEW)
```sql
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'students_only', 'track_specific')),
  track_filter UUID REFERENCES tracks(id),  -- NULL = all tracks, specific = track-only
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

CREATE INDEX idx_community_posts_author ON community_posts(author_id);
CREATE INDEX idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX idx_community_posts_pinned ON community_posts(is_pinned) WHERE is_pinned = TRUE;
```

**Why:** Dedicated table for community posts (separate from goal conversations)

#### 2. **`community_post_replies`** (NEW)
```sql
CREATE TABLE community_post_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to_id UUID REFERENCES community_post_replies(id),  -- For nested replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_community_post_replies_post ON community_post_replies(post_id);
CREATE INDEX idx_community_post_replies_author ON community_post_replies(author_id);
```

**Why:** Threaded replies with support for nested conversations

#### 3. **`community_post_likes`** (NEW)
```sql
CREATE TABLE community_post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_community_post_likes_post ON community_post_likes(post_id);
CREATE INDEX idx_community_post_likes_user ON community_post_likes(user_id);
```

**Why:** Track likes with one-to-one user-post relationship

#### 4. **`student_earnings`** (NEW)
```sql
CREATE TABLE student_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES track_goals(id),
  amount DECIMAL(10, 2) NOT NULL,
  earnings_type TEXT CHECK (earnings_type IN ('milestone', 'manual_update', 'goal_completion')),
  proof_url TEXT,  -- Optional: screenshot/proof link
  verified_by UUID REFERENCES profiles(id),  -- Instructor verification
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_earnings_student ON student_earnings(student_id);
CREATE INDEX idx_student_earnings_goal ON student_earnings(goal_id);
```

**Why:** Track actual earnings for leaderboard rankings and success stories

#### 5. **`student_actions`** (NEW)
```sql
CREATE TABLE student_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'video_completed', 'reflection_submitted', 'quiz_taken',
    'goal_milestone', 'course_completed', 'community_post',
    'resource_shared', 'track_joined'
  )),
  goal_id UUID REFERENCES track_goals(id),
  track_id UUID REFERENCES tracks(id),
  metadata JSONB,  -- Flexible field for action-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_actions_student ON student_actions(student_id);
CREATE INDEX idx_student_actions_type ON student_actions(action_type);
CREATE INDEX idx_student_actions_created ON student_actions(created_at DESC);
```

**Why:** Track all student actions for leaderboard "actions taken" metric and activity feed

#### 6. **`student_badges`** (NEW)
```sql
CREATE TABLE student_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'top-performer', 'consistent', 'fast-learner', 'goal-crusher'
  )),
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- NULL = permanent
  criteria_met JSONB,  -- Store why badge was awarded
  UNIQUE(student_id, badge_type)
);

CREATE INDEX idx_student_badges_student ON student_badges(student_id);
```

**Why:** Store achievement badges displayed on leaderboard and profiles

#### 7. **`success_stories`** (NEW)
```sql
CREATE TABLE success_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES track_goals(id),
  achievement_title TEXT NOT NULL,
  story_content TEXT NOT NULL,
  earnings_amount DECIMAL(10, 2),
  is_public BOOLEAN DEFAULT FALSE,
  is_anonymous BOOLEAN DEFAULT TRUE,  -- Show as "Member A"
  display_name TEXT,  -- Override if not anonymous
  proof_urls TEXT[],  -- Array of proof screenshots
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_success_stories_student ON success_stories(student_id);
CREATE INDEX idx_success_stories_goal ON success_stories(goal_id);
CREATE INDEX idx_success_stories_public ON success_stories(is_public) WHERE is_public = TRUE;
```

**Why:** Store and display student success stories with anonymity options

#### 8. **`community_resources`** (NEW)
```sql
CREATE TABLE community_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT CHECK (resource_type IN (
    'template', 'cheatsheet', 'guide', 'video', 'tool', 'other'
  )),
  file_url TEXT,
  external_url TEXT,
  track_id UUID REFERENCES tracks(id),  -- NULL = all tracks
  goal_id UUID REFERENCES track_goals(id),  -- NULL = all goals
  is_featured BOOLEAN DEFAULT FALSE,
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_resources_author ON community_resources(author_id);
CREATE INDEX idx_community_resources_track ON community_resources(track_id);
```

**Why:** Store community-shared resources (templates, guides, tools)

---

### 🟡 COLUMNS TO ADD TO EXISTING TABLES

#### **`profiles`** - Add Privacy & Display Settings
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_earnings BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_on_leaderboard BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_actions_count INTEGER DEFAULT 0;  -- Cached count
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10, 2) DEFAULT 0.00;  -- Cached sum
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
```

**Why:** Support leaderboard display, privacy controls, and cached metrics

#### **`video_progress`** - Add Learn Rate Tracking
```sql
-- Assuming video_progress table exists (not in provided schema)
ALTER TABLE video_progress ADD COLUMN IF NOT EXISTS watch_duration_seconds INTEGER;
ALTER TABLE video_progress ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER;
ALTER TABLE video_progress ADD COLUMN IF NOT EXISTS learn_rate DECIMAL(5, 2);  -- mins watched per hour
```

**Why:** Calculate learn rate for leaderboard rankings

#### **`goal_conversations`** - Add Execution Rate Tracking
```sql
ALTER TABLE goal_conversations ADD COLUMN IF NOT EXISTS execution_rate DECIMAL(5, 2);  -- Percentage
ALTER TABLE goal_conversations ADD COLUMN IF NOT EXISTS days_active INTEGER DEFAULT 0;
```

**Why:** Track goal execution metrics for leaderboard

---

## Implementation Strategy

### Phase 1: Core Community Posts (Week 1)

**Priority: HIGH**

#### Tasks:
1. **Create tables:**
   - `community_posts`
   - `community_post_replies`
   - `community_post_likes`

2. **Create API routes:**
   - `POST /api/community/posts` - Create post
   - `GET /api/community/posts` - List posts (with filters)
   - `POST /api/community/posts/[id]/like` - Toggle like
   - `POST /api/community/posts/[id]/reply` - Add reply
   - `PATCH /api/community/posts/[id]/pin` - Pin post (instructor only)
   - `DELETE /api/community/posts/[id]` - Delete post (soft delete)

3. **Update components:**
   - `CommunityPostsFeed.tsx` - Replace mock data with API calls
   - Use TanStack Query for data fetching and mutations

4. **Implement features:**
   - Real-time post creation
   - Like/unlike functionality
   - Reply threading
   - Post filtering
   - Pin/unpin (instructors only)

#### Database Migrations:
```sql
-- Migration: 001_create_community_posts.sql
CREATE TABLE community_posts (...);
CREATE TABLE community_post_replies (...);
CREATE TABLE community_post_likes (...);
```

---

### Phase 2: Student Tracking & Metrics (Week 2)

**Priority: HIGH**

#### Tasks:
1. **Create tables:**
   - `student_earnings`
   - `student_actions`
   - `student_badges`

2. **Update existing tables:**
   - Add columns to `profiles` (display_name, privacy settings, cached metrics)
   - Add learn_rate to `video_progress`
   - Add execution_rate to `goal_conversations`

3. **Create background jobs:**
   - Calculate learn rate daily (video watch time / total time)
   - Calculate execution rate (goals completed / time period)
   - Update `total_actions_count` and `total_earnings` cache
   - Award badges based on criteria

4. **Create API routes:**
   - `GET /api/community/leaderboard` - Get rankings with filters/sorting
   - `POST /api/community/earnings` - Log earnings (students)
   - `PATCH /api/community/earnings/[id]/verify` - Verify earnings (instructors)

#### Database Migrations:
```sql
-- Migration: 002_create_student_tracking.sql
CREATE TABLE student_earnings (...);
CREATE TABLE student_actions (...);
CREATE TABLE student_badges (...);
ALTER TABLE profiles ADD COLUMN ...;
```

---

### Phase 3: Leaderboard Integration (Week 2-3)

**Priority: MEDIUM**

#### Tasks:
1. **Create leaderboard query logic:**
   - Aggregate `student_earnings` by student
   - Calculate rankings based on multiple metrics
   - Support filters (track, goal type, top N)
   - Support sorting (ranking, earnings, actions, learn rate)

2. **Create API route:**
   - `GET /api/community/leaderboard?sortBy=ranking&filterBy=all&timeframe=lifetime`

3. **Update component:**
   - `GoalDiggersLeaderboard.tsx` - Replace mock data with API

4. **Implement features:**
   - Real-time ranking updates (WebSocket or polling)
   - Earnings ranges display
   - Badge display
   - Privacy controls (hide students who opt out)

#### Example Query:
```sql
SELECT
  p.id,
  p.display_name,
  p.full_name,
  p.current_goal_id,
  p.total_earnings,
  p.total_actions_count,
  p.show_on_leaderboard,
  gc.execution_rate,
  gc.days_active,
  COUNT(sta.id) FILTER (WHERE sta.completed_at IS NOT NULL) as completed_goals,
  COALESCE(AVG(vp.learn_rate), 0) as avg_learn_rate,
  ARRAY_AGG(DISTINCT sb.badge_type) as badges
FROM profiles p
LEFT JOIN goal_conversations gc ON gc.student_id = p.id AND gc.status = 'active'
LEFT JOIN student_track_assignments sta ON sta.student_id = p.id
LEFT JOIN student_badges sb ON sb.student_id = p.id
LEFT JOIN video_progress vp ON vp.user_id = p.id
WHERE p.role = 'student' AND p.show_on_leaderboard = TRUE
GROUP BY p.id, gc.execution_rate, gc.days_active
ORDER BY p.total_earnings DESC
LIMIT 50;
```

---

### Phase 4: Success Stories (Week 3)

**Priority: MEDIUM**

#### Tasks:
1. **Create table:**
   - `success_stories`

2. **Create API routes:**
   - `POST /api/community/success-stories` - Submit story (students)
   - `GET /api/community/success-stories` - List stories (public)
   - `PATCH /api/community/success-stories/[id]/verify` - Verify story (instructors)
   - `PATCH /api/community/success-stories/[id]/publish` - Publish story

3. **Update component:**
   - `SuccessStoriesSection.tsx` - Replace mock data

4. **Implement features:**
   - Anonymous display ("Member A")
   - Proof upload (screenshots)
   - Instructor verification
   - Public/private toggle

---

### Phase 5: Community Stats & Activity Feed (Week 3-4)

**Priority: LOW**

#### Tasks:
1. **Create real-time activity system:**
   - Use `student_actions` table for recent activities
   - WebSocket or Server-Sent Events for live feed

2. **Create API routes:**
   - `GET /api/community/stats` - Get community stats
   - `GET /api/community/activity-feed` - Get recent activities (SSE)

3. **Update component:**
   - `CommunityHeader.tsx` - Replace mock stats and live feed

4. **Calculate stats:**
   - Total students: `COUNT(profiles WHERE role = 'student')`
   - Active this week: `COUNT(DISTINCT student_id FROM student_actions WHERE created_at > NOW() - INTERVAL '7 days')`
   - Total earnings: `SUM(total_earnings FROM profiles)`
   - Avg learn rate: `AVG(learn_rate FROM video_progress)`

---

### Phase 6: Community Resources (Week 4)

**Priority: LOW**

#### Tasks:
1. **Create table:**
   - `community_resources`

2. **Create API routes:**
   - `POST /api/community/resources` - Upload resource
   - `GET /api/community/resources` - List resources
   - `GET /api/community/resources/[id]/download` - Download resource

3. **Update component:**
   - `CommunityResourcesSection.tsx` - Replace mock data

4. **Implement features:**
   - File uploads (PDFs, templates, etc.)
   - Track download counts
   - Filter by track/goal

---

## Data Privacy & Security Considerations

### Privacy Controls

1. **Student Opt-Out:**
   - `profiles.show_on_leaderboard` - Hide from public leaderboards
   - `profiles.is_public_profile` - Hide profile from public view
   - `profiles.show_earnings` - Hide earnings details

2. **Anonymity:**
   - Success stories: `success_stories.is_anonymous` - Display as "Member A"
   - Community posts: Always show at least display_name or initials

3. **Instructor Verification:**
   - Earnings require `verified_by` instructor ID before showing on leaderboard
   - Success stories require verification before publishing

### Data Integrity

1. **Cached Metrics:**
   - `profiles.total_actions_count` - Updated by trigger on `student_actions` insert
   - `profiles.total_earnings` - Updated by trigger on `student_earnings` insert
   - Prevents expensive aggregations on every leaderboard load

2. **Soft Deletes:**
   - Community posts: Use `deleted_at` timestamp
   - Preserve data for moderation history

3. **Rate Limiting:**
   - Community posts: Max 10 per hour per user
   - Likes: Max 100 per hour per user
   - Replies: Max 20 per hour per user

---

## Database Triggers & Functions

### 1. Update Total Actions Count
```sql
CREATE OR REPLACE FUNCTION update_total_actions_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET total_actions_count = total_actions_count + 1,
      last_active_at = NOW()
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_total_actions_count
AFTER INSERT ON student_actions
FOR EACH ROW EXECUTE FUNCTION update_total_actions_count();
```

### 2. Update Total Earnings
```sql
CREATE OR REPLACE FUNCTION update_total_earnings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET total_earnings = (
    SELECT COALESCE(SUM(amount), 0)
    FROM student_earnings
    WHERE student_id = NEW.student_id
      AND verified_at IS NOT NULL
  )
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_total_earnings
AFTER INSERT OR UPDATE ON student_earnings
FOR EACH ROW EXECUTE FUNCTION update_total_earnings();
```

### 3. Auto-Award Badges
```sql
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- Top Performer: Top 10 in earnings
  IF (SELECT COUNT(*) FROM profiles WHERE total_earnings > NEW.total_earnings) < 10 THEN
    INSERT INTO student_badges (student_id, badge_type)
    VALUES (NEW.id, 'top-performer')
    ON CONFLICT (student_id, badge_type) DO NOTHING;
  END IF;

  -- Consistent: Active 30+ days in a row
  -- Fast Learner: Learn rate > 40 mins/hr
  -- Goal Crusher: Completed 3+ goals
  -- (Add logic for other badges)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_badges
AFTER UPDATE OF total_earnings, total_actions_count ON profiles
FOR EACH ROW EXECUTE FUNCTION check_and_award_badges();
```

---

## Questions for You

Before proceeding, I need your input on:

1. **Earnings Tracking:**
   - Should students self-report earnings, or do you want to integrate with payment platforms (Stripe, PayPal)?
   - Should earnings be verified by instructors before showing on leaderboard?

2. **Learn Rate Calculation:**
   - Definition: `(total video watch time in minutes / total time since first video) * 60`?
   - Or: `(videos completed this week / total videos available) * some factor`?

3. **Community Posts Privacy:**
   - Should ALL posts be public to everyone (including guests)?
   - Or only visible to authenticated students?
   - Should there be track-specific posts (only Agency Track students see certain posts)?

4. **Leaderboard Display:**
   - Show exact earnings amounts or earnings ranges ($5k-$10k)?
   - Show real names or allow custom display names?

5. **Success Stories:**
   - Who can submit? Students only or instructors too?
   - Auto-publish or require instructor approval?

6. **WebSocket Integration:**
   - Do you want real-time updates for community posts and leaderboard?
   - Or is polling every 30 seconds acceptable?

7. **Affiliates Section:**
   - Is this part of community or separate feature?
   - Should there be an `affiliates` table or use existing referral system?

---

## Next Steps

1. **Review this document** and answer the questions above
2. **Prioritize phases** - Confirm if order makes sense or adjust
3. **Database approval** - I'll create the migration files once you approve tables
4. **Start Phase 1** - Community posts integration

Let me know your thoughts and any modifications needed!

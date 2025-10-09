# Community Feature - Database Tables Design (MVP-FIRST)

**Date:** 2025-10-07 (Updated: 2025-10-08)
**Purpose:** Define database schema for community features based on `/community` route requirements

---

## Overview - MVP Approach

Based on the community page structure at `http://localhost:3001/community`, we need the following database tables:

1. **Community Posts** (forum/discussion feed) - **1 table** (MVP)
2. **Global Resources System** (downloadable templates, guides, tools - used across entire platform) - **3 tables**

**MVP Philosophy:** Start simple with JSONB for interactions, split into normalized tables when we have actual volume.

**Key Optimizations:**
- ✅ Reuse existing `profiles` table for goal tracking (add columns instead of new table)
- ✅ Reuse existing `user_actions` table with JSONB metadata for goal metrics
- ✅ **Community Posts: Use JSONB for likes/replies** (split when we have 500+ posts)
- ✅ **Global Resources: Single table** reused across community, videos, courses, conversations
- ✅ **Polymorphic linking:** One junction table for all resource attachments
- ✅ Combine resource downloads + ratings into single `resource_interactions` table

**Total: 4 new tables for MVP** (down from 8 in original design)

---

## 1. Community Posts - MVP Single Table

**Table name:** `community_posts`

**MVP Approach:** Store likes and replies in JSONB for simplicity. Split into separate tables when we reach 500+ posts.

```sql
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,

  -- MVP: Store interactions in JSONB (refactor to separate tables later)
  likes JSONB DEFAULT '[]', -- Array of {user_id, created_at}
  replies JSONB DEFAULT '[]', -- Array of {id, author_id, content, created_at}

  -- Cached counts for quick display
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_community_posts_author ON community_posts(author_id);
CREATE INDEX idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX idx_community_posts_pinned ON community_posts(is_pinned, created_at DESC);

-- JSONB indexes for querying likes/replies
CREATE INDEX idx_community_posts_likes ON community_posts USING GIN(likes);
CREATE INDEX idx_community_posts_replies ON community_posts USING GIN(replies);
```

### Example Data Structure:

```javascript
// Post record
{
  id: "uuid",
  author_id: "user-uuid",
  content: "Just launched my first client site!",
  is_pinned: false,

  // Likes stored as JSONB array
  likes: [
    {user_id: "user-1", created_at: "2025-10-08T10:30:00Z"},
    {user_id: "user-2", created_at: "2025-10-08T11:00:00Z"}
  ],

  // Replies stored as JSONB array
  replies: [
    {
      id: "reply-uuid-1",
      author_id: "user-3",
      content: "Congrats! What stack did you use?",
      created_at: "2025-10-08T10:45:00Z"
    }
  ],

  likes_count: 2,
  replies_count: 1,
  created_at: "2025-10-08T10:00:00Z"
}
```

### Helper Functions:

```sql
-- Function to add a like
CREATE OR REPLACE FUNCTION add_post_like(post_id UUID, user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_posts
  SET
    likes = likes || jsonb_build_object('user_id', user_id, 'created_at', NOW()),
    likes_count = likes_count + 1
  WHERE id = post_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(likes) AS like_item
      WHERE like_item->>'user_id' = user_id::text
    );
END;
$$ LANGUAGE plpgsql;

-- Function to add a reply
CREATE OR REPLACE FUNCTION add_post_reply(
  post_id UUID,
  author_id UUID,
  reply_content TEXT
)
RETURNS UUID AS $$
DECLARE
  reply_id UUID := gen_random_uuid();
BEGIN
  UPDATE community_posts
  SET
    replies = replies || jsonb_build_object(
      'id', reply_id,
      'author_id', author_id,
      'content', reply_content,
      'created_at', NOW()
    ),
    replies_count = replies_count + 1
  WHERE id = post_id;

  RETURN reply_id;
END;
$$ LANGUAGE plpgsql;
```

### Migration Path (When Needed):

**When to split:** Once you have 500+ posts OR posts with 50+ replies each

At that point, create:
- `community_post_likes` table
- `community_post_replies` table

And migrate JSONB data to normalized tables.

---

## 2. Goals System - LEVERAGE EXISTING TABLES

**✅ OPTIMIZATION:** Instead of creating new `user_goal_history` and `goal_metrics` tables, we enhance existing tables.

### Enhance Existing `profiles` Table

Add goal tracking columns to the existing `profiles` table:

```sql
-- Add goal tracking columns to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_completed_at TIMESTAMPTZ;

-- Revenue tracking (for monetary goal progress)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_revenue_earned DECIMAL(10,2) DEFAULT 0; -- For Agency Track (lifetime total revenue earned)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_mrr DECIMAL(10,2) DEFAULT 0; -- For SaaS Track (Monthly Recurring Revenue)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenue_updated_at TIMESTAMPTZ; -- Last time revenue was updated

-- Goal completion history
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completed_goals UUID[] DEFAULT '{}'; -- Array of completed goal IDs

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_profiles_total_revenue_earned ON profiles(total_revenue_earned);
CREATE INDEX IF NOT EXISTS idx_profiles_current_mrr ON profiles(current_mrr);
CREATE INDEX IF NOT EXISTS idx_profiles_completed_goals ON profiles USING GIN(completed_goals);

-- Note: profiles already has:
-- - current_track_id, current_goal_id, track_assigned_at, goal_assigned_at
```

**Why this works:**
- ✅ User can only have ONE active goal at a time (stored in `current_goal_id`)
- ✅ `total_revenue_earned` tracks Agency Track progress (cumulative: $1k → $10k → $25k total earned)
- ✅ `current_mrr` tracks SaaS Track progress (recurring: $1k MRR → $5k MRR → $20k MRR)
- ✅ `completed_goals` array maintains history of completed goals
- ✅ Users self-report revenue milestones
- ✅ No need for separate history table

**Revenue Tracking Difference:**
- **Agency Track:** Cumulative total revenue earned over time (grows indefinitely)
- **SaaS Track:** Current monthly recurring revenue (can go up or down)

**Revenue Submission & Approval Workflow:**

Users submit revenue updates via goal conversations with proof (Loom video/iPhone screen recording). We use the existing `conversation_messages` table with metadata for this workflow.

### **Submission Flow:**

1. **Student clicks "Submit Revenue Proof"** button on goal progress card
2. **Modal opens** asking for:
   - Amount (MRR for SaaS, Total Revenue for Agency)
   - Proof video URL (Loom or iCloud/iPhone screen recording)
3. **Creates conversation message** with metadata
4. **Button changes to "Under Review"** (disabled, with pulsing clock icon)
5. **Instructor sees notification** in goal conversation near progress card
6. **Instructor reviews** → Opens modal with video + approve/reject
7. **On approval:**
   - Progress bar updates
   - Button shows "Last verified: $X" with green checkmark
   - Can click to "Update Revenue" again
8. **On rejection:**
   - Button returns to "Submit Revenue Proof"
   - Student can immediately resubmit

### **Data Structure:**

```javascript
// When student submits revenue proof
conversation_message.metadata = {
  message_type: 'revenue_submission',
  track_type: 'agency', // or 'saas'
  submitted_amount: 5000.00,
  proof_video_url: 'https://loom.com/share/... or iCloud link',
  status: 'pending', // 'pending', 'approved', 'rejected'
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null
}

// When instructor approves
conversation_message.metadata.status = 'approved'
conversation_message.metadata.reviewed_by = 'instructor-uuid'
conversation_message.metadata.reviewed_at = NOW()

// Update user's profile based on track type
if (track_type === 'agency') {
  // Agency: ADD to total
  UPDATE profiles
  SET total_revenue_earned = total_revenue_earned + 5000.00,
      revenue_updated_at = NOW()
  WHERE id = 'user-uuid';
} else {
  // SaaS: REPLACE if higher (last 30 days MRR)
  UPDATE profiles
  SET current_mrr = GREATEST(current_mrr, 5000.00),
      revenue_updated_at = NOW()
  WHERE id = 'user-uuid';
}

// When instructor rejects
conversation_message.metadata.status = 'rejected'
conversation_message.metadata.reviewed_by = 'instructor-uuid'
conversation_message.metadata.reviewed_at = NOW()
conversation_message.metadata.rejection_reason = 'Video quality too low, please resubmit with clearer dashboard view'
// Profile is NOT updated
```

### **UI States:**

**Student View (Button States):**
1. **Default:** "Submit Revenue Proof" button (blue, enabled)
2. **Pending:** "Under Review" button (gray, disabled, pulsing clock icon)
3. **Approved:** Shows "Last verified: $5,000" with green checkmark + "Update Revenue" button
4. **Rejected:** Returns to "Submit Revenue Proof" button (can resubmit immediately)

**Instructor View (In Goal Conversation):**
- **Box near progress card:** "Student submitted revenue proof - [View & Review]"
- **Clicking "View & Review"** opens modal with:
  - Submitted amount
  - Embedded Loom video or video link
  - "Approve" button (green)
  - "Reject" button (red) with reason textarea

### **Revenue Update Logic:**

**Agency Track:**
- Submissions are **additive** (cumulative total)
- Example: Current $3k → Submit $2k → Approved → New total $5k

**SaaS Track:**
- Student submits **last 30 days MRR**
- Only replaces if **new amount is higher** than current
- Example: Current $1k MRR → Submit $800 → Approved → Stays $1k (doesn't decrease)
- Example: Current $1k MRR → Submit $1.5k → Approved → New MRR $1.5k

**Benefits of using conversation_messages:**
- ✅ Keeps revenue proof in context of the conversation
- ✅ No new table needed
- ✅ Easy to see submission history in timeline
- ✅ Can immediately resubmit if rejected
- ✅ Uses existing JSONB metadata field
- ✅ Inline review workflow for instructor

### Use Existing `user_actions` Table for Metrics

The `user_actions` table already has a `metadata JSONB` column. Store goal completion metrics there:

```sql
-- Example: When a goal is completed, create a user_action with metrics in metadata
INSERT INTO user_actions (
  user_id,
  action_type_id, -- reference to 'Goal Completed' action type
  goal_id,
  description,
  metadata
) VALUES (
  'user-uuid',
  'goal-completed-action-type-id',
  'completed-goal-id',
  'Completed: Build $10k/month Agency',
  '{
    "goal_completed": true,
    "days_to_complete": 45,
    "learn_rate": 15,
    "execution_rate": 87,
    "execution_pace": "steady",
    "ranking": 12,
    "total_points_earned": 450
  }'::jsonb
);

-- Note: user_actions already has:
-- - user_id, action_type_id, goal_id, points, description, metadata (JSONB), action_date, created_at
```

**Why this works:**
- ✅ Metrics are stored in flexible JSONB format
- ✅ Can query metrics with `metadata->>'days_to_complete'`
- ✅ No need for separate `goal_metrics` table
- ✅ Keeps all user activity in one place

---

## 3. Global Resources System - REUSABLE ACROSS PLATFORM

**✅ OPTIMIZATION:** Single `resources` table used globally across community, courses, videos, and goal conversations.

### Resources Table (Global)

**Table name:** `resources`

**Purpose:** Central repository for all downloadable resources, attachments, and files across the entire platform.

```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Creator
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Resource details
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'template', 'guide', 'checklist', 'pdf', 'video', 'tool', 'spreadsheet', 'code'
  category TEXT NOT NULL, -- 'client-acquisition', 'development', 'business', 'templates', 'marketing'

  -- Access control
  access TEXT NOT NULL DEFAULT 'free', -- 'free' or 'member-only'

  -- File information
  file_url TEXT NOT NULL, -- Backblaze B2/CDN URL to the resource file
  file_size BIGINT, -- Size in bytes
  format TEXT, -- e.g., "PDF", "ZIP", "XLSX", "MP4"
  mime_type TEXT, -- e.g., "application/pdf", "video/mp4"

  -- Metadata
  difficulty TEXT, -- 'beginner', 'intermediate', 'advanced'
  tags TEXT[], -- Array of tags

  -- Source context (optional - where was this resource originally created/uploaded?)
  source_type TEXT, -- 'community', 'course_video', 'goal_conversation', 'instructor_upload'
  source_id UUID, -- ID of the source entity (post_id, video_id, conversation_id, etc.)

  -- Stats (calculated/cached from resource_interactions)
  download_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,

  -- Flags
  is_popular BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_resources_creator ON resources(created_by);
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_access ON resources(access);
CREATE INDEX idx_resources_source ON resources(source_type, source_id);
CREATE INDEX idx_resources_popular ON resources(is_popular);
CREATE INDEX idx_resources_featured ON resources(is_featured);
CREATE INDEX idx_resources_rating ON resources(rating_average DESC);
CREATE INDEX idx_resources_downloads ON resources(download_count DESC);
CREATE INDEX idx_resources_tags ON resources USING GIN(tags);
```

### Resource Links Table (Junction/Many-to-Many)

**Table name:** `resource_links`

**Purpose:** Link resources to multiple entities (posts, videos, courses, conversations, etc.)

```sql
CREATE TABLE resource_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,

  -- Polymorphic linking - what entity is this resource attached to?
  entity_type TEXT NOT NULL, -- 'community_post', 'course_video', 'course', 'conversation'
  entity_id UUID NOT NULL, -- ID of the linked entity (references: community_posts.id, media_files.id, courses.id, conversations.id)

  -- Context (optional)
  timestamp_seconds INTEGER, -- For video resources: at what second in the video?
  label TEXT, -- Optional label like "Download at 5:32"
  display_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Ensure unique resource per entity (but allow same resource on multiple entities)
  UNIQUE(resource_id, entity_type, entity_id)
);

-- Indexes
CREATE INDEX idx_resource_links_resource ON resource_links(resource_id);
CREATE INDEX idx_resource_links_entity ON resource_links(entity_type, entity_id);
CREATE INDEX idx_resource_links_created_by ON resource_links(created_by);
```

### Example Usage:

```sql
-- 1. Create a resource (PDF template)
INSERT INTO resources (created_by, title, description, type, category, file_url, format)
VALUES (
  'instructor-uuid',
  'Client Onboarding Template',
  'Complete onboarding questionnaire template',
  'template',
  'client-acquisition',
  'https://cdn.example.com/templates/onboarding.pdf',
  'PDF'
);

-- 2. Link resource to a course video (at 5 minutes 30 seconds)
INSERT INTO resource_links (resource_id, entity_type, entity_id, timestamp_seconds, label)
VALUES (
  'resource-uuid',
  'course_video',
  'video-uuid',
  330, -- 5:30 in seconds
  'Download Template (5:30)'
);

-- 3. Link same resource to a community post
INSERT INTO resource_links (resource_id, entity_type, entity_id)
VALUES (
  'resource-uuid',
  'community_post',
  'post-uuid'
);

-- 4. Link same resource to a goal conversation
INSERT INTO resource_links (resource_id, entity_type, entity_id)
VALUES (
  'resource-uuid',
  'conversation',
  'conversation-uuid'
);

-- 5. Link resource to entire course (e.g., "Course Materials Bundle")
INSERT INTO resource_links (resource_id, entity_type, entity_id)
VALUES (
  'resource-uuid',
  'course',
  'course-uuid'
);
```

### Query Examples:

```sql
-- Get all resources for a specific video
SELECT r.*
FROM resources r
JOIN resource_links rl ON r.id = rl.resource_id
WHERE rl.entity_type = 'course_video'
  AND rl.entity_id = 'video-uuid'
ORDER BY rl.timestamp_seconds ASC;

-- Get all resources across the entire platform
SELECT * FROM resources
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- Get all resources linked to community posts
SELECT DISTINCT r.*
FROM resources r
JOIN resource_links rl ON r.id = rl.resource_id
WHERE rl.entity_type = 'community_post';

-- Get all resources for a course (including all its videos)
SELECT DISTINCT r.*
FROM resources r
JOIN resource_links rl ON r.id = rl.resource_id
WHERE rl.entity_type = 'course' AND rl.entity_id = 'course-uuid'
UNION
SELECT DISTINCT r.*
FROM resources r
JOIN resource_links rl ON r.id = rl.resource_id
JOIN media_files mf ON rl.entity_id = mf.id
WHERE rl.entity_type = 'course_video'
  AND mf.id IN (
    SELECT media_id FROM course_chapter_media
    WHERE chapter_id IN (
      SELECT id FROM course_chapters WHERE course_id = 'course-uuid'
    )
  );
```

### Resource Interactions Table (Downloads + Ratings Combined)

**Table name:** `resource_interactions`

**✅ OPTIMIZATION:** Single table tracks both downloads AND ratings per user.

```sql
CREATE TABLE resource_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES community_resources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable for guest downloads

  -- Download tracking
  downloaded_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0, -- Track multiple downloads by same user

  -- Rating tracking
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  rated_at TIMESTAMPTZ,

  -- Guest download tracking (when user_id is null)
  email TEXT, -- for guest downloads via email capture
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One interaction record per user per resource
  UNIQUE(resource_id, user_id)
);

-- Indexes
CREATE INDEX idx_resource_interactions_resource ON resource_interactions(resource_id);
CREATE INDEX idx_resource_interactions_user ON resource_interactions(user_id);
CREATE INDEX idx_resource_interactions_email ON resource_interactions(email);
CREATE INDEX idx_resource_interactions_downloaded ON resource_interactions(downloaded_at DESC) WHERE downloaded_at IS NOT NULL;
CREATE INDEX idx_resource_interactions_rated ON resource_interactions(rated_at DESC) WHERE rated_at IS NOT NULL;
```

**Why this works:**
- ✅ Single record per user per resource (enforced by UNIQUE constraint)
- ✅ User can download multiple times (`download_count` increments)
- ✅ User can rate after downloading (same record, add `rating` + `rated_at`)
- ✅ Guest downloads supported (`user_id` nullable, track via `email`)
- ✅ Eliminates need for 2 separate tables

---

## Summary - MVP-FIRST SCHEMA

### ✅ New Tables to Create: **4 tables** (down from 8)

1. **community_posts** - Forum posts with likes/replies in JSONB (MVP approach)
2. **resources** - Global resources table (used across platform: community, videos, courses, conversations)
3. **resource_links** - Junction table linking resources to entities (polymorphic many-to-many)
4. **resource_interactions** - Downloads + ratings combined

### ✅ Existing Tables to Enhance: **2 tables**

1. **profiles** - Add columns:
   - `goal_started_at TIMESTAMPTZ`
   - `goal_completed_at TIMESTAMPTZ`
   - `total_revenue_earned DECIMAL(10,2)` - Agency Track (cumulative total)
   - `current_mrr DECIMAL(10,2)` - SaaS Track (monthly recurring)
   - `revenue_updated_at TIMESTAMPTZ`
   - `completed_goals UUID[]`

2. **user_actions** - Already perfect! Use existing:
   - `metadata JSONB` - Store goal completion metrics
   - `goal_id` - Link to completed goal
   - `action_type_id` - Reference "Goal Completed" action type

### ✅ Existing Tables Used As-Is: **5 tables**

- **track_goals** - Goal definitions per track
- **tracks** - Track definitions (Agency/SaaS)
- **courses** - Course data
- **action_types** - Action type definitions
- **auth.users** - Supabase authentication

---

## Architecture Benefits

**Before (Over-engineered):** 8 new tables + 2 enhanced = **10 tables total**

**After (MVP-first):** 4 new tables + 2 enhanced = **6 tables total**

### Key Optimizations:

1. ✅ **Eliminated `user_goal_history`** - Use `profiles.current_goal_id` + `profiles.completed_goals[]`
2. ✅ **Eliminated `goal_metrics`** - Use `user_actions.metadata` JSONB
3. ✅ **Combined `resource_downloads` + `resource_ratings`** - Into single `resource_interactions` table
4. ✅ **MVP: Posts use JSONB for likes/replies** - Split into 3 tables when needed (500+ posts)
5. ✅ **Eliminated `community_post_likes` + `community_post_replies`** - Deferred until we have volume
6. ✅ **Global `resources` table** - Reusable across community, videos, courses, conversations (not community-specific)
7. ✅ **Polymorphic `resource_links`** - One junction table for all entity types (vs separate tables per entity)

### Performance & Scalability:

- ✅ JSONB works great for <500 posts with <50 replies each
- ✅ GIN indexes on JSONB for fast queries
- ✅ Fewer joins needed for goal queries
- ✅ Single UNIQUE constraint for resource interactions
- ✅ Easy migration path when we hit scale limits

### Migration Triggers (When to Split):

- **Community Posts:** Split to 3 tables when we have 500+ posts OR 50+ replies per post
- **Resources:** Already optimized, no split needed
- **Goals:** Already optimized using existing tables

---

## Next Steps - MVP Implementation

### Phase 1: Database Setup
1. ✅ Create migration file for **4 new tables**
   - `community_posts` (with JSONB likes/replies)
   - `resources` (global, reusable across platform)
   - `resource_links` (polymorphic junction table)
   - `resource_interactions` (downloads + ratings)

2. ✅ Create migration file to enhance `profiles` table
   - Add goal tracking columns

3. ✅ Set up Row Level Security (RLS) policies
   - Posts: Authors can edit/delete, everyone can read
   - Resources: Admin create, everyone can read
   - Interactions: Users manage their own

### Phase 2: Helper Functions
4. ✅ Create Postgres functions:
   - `add_post_like(post_id, user_id)` - Add like to JSONB array
   - `remove_post_like(post_id, user_id)` - Remove like from JSONB
   - `add_post_reply(post_id, author_id, content)` - Add reply to JSONB array
   - `complete_goal(user_id, goal_id, metrics)` - Update profiles + create user_action
   - `update_resource_stats()` - Aggregate download/rating counts

### Phase 3: API Layer
5. ✅ Build server actions for:
   - Community posts CRUD
   - Post likes/replies
   - Resources CRUD
   - Resource downloads/ratings
   - Goal completion workflow

### Phase 4: Real-time (Optional for MVP)
6. 🔄 Implement Supabase real-time subscriptions for:
   - New community posts
   - New likes/replies

### Phase 5: Future Migration (When Needed)
7. 📅 Split community posts when we hit 500+ posts:
   - Create `community_post_likes` table
   - Create `community_post_replies` table
   - Migrate JSONB data to normalized tables
   - Update queries to use new tables

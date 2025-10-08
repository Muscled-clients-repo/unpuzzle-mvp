# Community Feature - Database Tables Design

**Date:** 2025-10-07
**Purpose:** Define database schema for community features based on `/community` route requirements

---

## Overview

Based on the community page structure at `http://localhost:3001/community`, we need the following database tables:

1. **Community Posts** (forum/discussion feed)
2. **User Goals** (user goal tracking system)
3. **Community Resources** (downloadable templates, guides, tools)
4. **Goal Actions** (activities tied to goals)

**Note:** We already have a `courses` table, so courses don't need to be recreated.

---

## 1. Community Posts Table

**Table name:** `community_posts`

```sql
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_community_posts_author ON community_posts(author_id);
CREATE INDEX idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX idx_community_posts_pinned ON community_posts(is_pinned, created_at DESC);
```

### Post Likes Table

**Table name:** `community_post_likes`

```sql
CREATE TABLE community_post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one like per user per post
  UNIQUE(post_id, user_id)
);

-- Indexes
CREATE INDEX idx_post_likes_post ON community_post_likes(post_id);
CREATE INDEX idx_post_likes_user ON community_post_likes(user_id);
```

### Post Replies Table

**Table name:** `community_post_replies`

```sql
CREATE TABLE community_post_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_post_replies_post ON community_post_replies(post_id);
CREATE INDEX idx_post_replies_author ON community_post_replies(author_id);
CREATE INDEX idx_post_replies_created ON community_post_replies(created_at);
```

---

## 2. Goals System

**Note:** We already have the following existing tables:
- `track_goals` - Goal definitions per track (already exists)
- `profiles.current_goal_id` - References `track_goals(id)` (already exists)
- `user_actions` - User action tracking (already exists)

### User Goal History Table

**Table name:** `user_goal_history`

Track user's progression through different goals over time.

```sql
CREATE TABLE user_goal_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES track_goals(id) ON DELETE CASCADE,

  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused'
  progress INTEGER DEFAULT 0, -- percentage 0-100

  -- Dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_goal_history_user ON user_goal_history(user_id);
CREATE INDEX idx_user_goal_history_goal ON user_goal_history(goal_id);
CREATE INDEX idx_user_goal_history_status ON user_goal_history(status);
CREATE INDEX idx_user_goal_history_user_status ON user_goal_history(user_id, status);
```

### Goal Metrics Table

**Table name:** `goal_metrics`

Store performance metrics for completed goals.

```sql
CREATE TABLE goal_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_goal_history_id UUID NOT NULL REFERENCES user_goal_history(id) ON DELETE CASCADE,

  -- Metrics (for completed goals)
  learn_rate INTEGER, -- minutes per hour
  execution_rate INTEGER, -- percentage
  execution_pace TEXT, -- 'fast', 'steady', 'slow'
  ranking INTEGER, -- ranking by speed
  days_to_complete INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One metric record per goal history entry
  UNIQUE(user_goal_history_id)
);

-- Indexes
CREATE INDEX idx_goal_metrics_history ON goal_metrics(user_goal_history_id);
CREATE INDEX idx_goal_metrics_ranking ON goal_metrics(ranking);
```

### Enhance Existing user_actions Table

The `user_actions` table already exists. We may want to add these columns:

```sql
-- Add additional columns to existing user_actions table
ALTER TABLE user_actions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE user_actions ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE user_actions ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Note: user_actions already has:
-- - user_id, action_type_id, goal_id, points, description, metadata, action_date, created_at
```

---

## 3. Community Resources

### Resources Table

**Table name:** `community_resources`

```sql
CREATE TABLE community_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Resource details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- 'template', 'guide', 'checklist', 'video', 'course', 'tool'
  category TEXT NOT NULL, -- 'client-acquisition', 'development', 'business', 'templates', 'marketing'

  -- Access control
  access TEXT NOT NULL DEFAULT 'free', -- 'free' or 'member-only'

  -- File information
  file_url TEXT, -- S3/CDN URL to the resource file
  file_size TEXT, -- e.g., "2.5 MB"
  format TEXT NOT NULL, -- e.g., "PDF", "ZIP", "Excel + Google Sheets"

  -- Metadata
  difficulty TEXT, -- 'beginner', 'intermediate', 'advanced'
  tags TEXT[], -- Array of tags

  -- Stats
  download_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0, -- e.g., 4.87

  -- Flags
  is_popular BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_resources_category ON community_resources(category);
CREATE INDEX idx_resources_type ON community_resources(type);
CREATE INDEX idx_resources_access ON community_resources(access);
CREATE INDEX idx_resources_popular ON community_resources(is_popular);
CREATE INDEX idx_resources_new ON community_resources(is_new);
CREATE INDEX idx_resources_rating ON community_resources(rating DESC);
CREATE INDEX idx_resources_downloads ON community_resources(download_count DESC);
```

### Resource Downloads Table (for tracking)

**Table name:** `resource_downloads`

```sql
CREATE TABLE resource_downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES community_resources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable for guest downloads
  email TEXT, -- for guest downloads via email capture

  -- Metadata
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Indexes
CREATE INDEX idx_resource_downloads_resource ON resource_downloads(resource_id);
CREATE INDEX idx_resource_downloads_user ON resource_downloads(user_id);
CREATE INDEX idx_resource_downloads_email ON resource_downloads(email);
CREATE INDEX idx_resource_downloads_date ON resource_downloads(downloaded_at DESC);
```

### Resource Ratings Table

**Table name:** `resource_ratings`

```sql
CREATE TABLE resource_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES community_resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rating
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One rating per user per resource
  UNIQUE(resource_id, user_id)
);

-- Indexes
CREATE INDEX idx_resource_ratings_resource ON resource_ratings(resource_id);
CREATE INDEX idx_resource_ratings_user ON resource_ratings(user_id);
```

---

## 4. Additional Supporting Tables

No additional tables needed - `profiles` already has `current_goal_id` and `current_track_id`.

---

## Summary

### New Tables Created:
1. **community_posts** - Forum posts
2. **community_post_likes** - Post likes
3. **community_post_replies** - Post replies/comments
4. **user_goal_history** - User's progression through goals over time
5. **goal_metrics** - Performance metrics for completed goals
6. **community_resources** - Downloadable resources
7. **resource_downloads** - Download tracking
8. **resource_ratings** - User ratings for resources

### Existing Tables Used:
- **track_goals** - Goal definitions (already exists)
- **user_actions** - User action tracking (already exists, may need additional columns)
- **courses** - Course data (already exists)
- **profiles** - User profiles with current_goal_id (already exists)
- **auth.users** - Supabase auth (already exists)

---

## Next Steps

1. Create migration files for these tables
2. Set up Row Level Security (RLS) policies
3. Create database functions for:
   - Auto-updating post/resource stats
   - Calculating goal metrics
   - Aggregating ratings
4. Build API endpoints/actions for CRUD operations
5. Implement real-time subscriptions for community posts

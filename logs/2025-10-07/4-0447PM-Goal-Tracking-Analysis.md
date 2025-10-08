# Goal Tracking Analysis - Existing vs New Tables

**Date:** 2025-10-07
**Purpose:** Analyze if we need `user_goal_history` and `goal_metrics` tables

---

## What the UI Needs (from CommunityGoalsSection.tsx)

### Per User Goal Instance Data:
1. **Goal identification**
   - title (e.g., "Goal: $5K Shopify Agency")
   - track ('agency' or 'saas')
   - startAmount, targetAmount

2. **Status tracking**
   - status ('active', 'completed', 'paused')
   - progress (0-100%)
   - startDate
   - completedDate (optional)

3. **Performance metrics** (for completed goals)
   - learnRate (mins/hr)
   - executionRate (%)
   - executionPace ('fast', 'steady', 'slow')
   - ranking (by speed)
   - daysToComplete

4. **Actions timeline**
   - List of actions done during this goal
   - Each action has: type, title, date, details

---

## Existing Tables Analysis

### 1. `track_goals` table
```sql
- id, track_id, name, description, is_default, sort_order, is_active
```
**What it stores:** Goal DEFINITIONS (the template/type of goal like "$5K Agency")
**What it DOESN'T store:** Individual user's progress, dates, status, metrics

### 2. `profiles.current_goal_id`
**What it stores:** Which goal the user is CURRENTLY on
**What it DOESN'T store:** Historical goals, completion dates, metrics

### 3. `user_actions` table
```sql
- user_id, action_type_id, goal_id, points, description, metadata, action_date, created_at
```
**What it stores:** Individual actions a user took
**What it DOESN'T store:** Goal start/completion dates, progress %, status, metrics

---

## The Problem

### Current State:
- `track_goals` = goal templates/definitions
- `profiles.current_goal_id` = user's current goal (one snapshot)
- `user_actions` = list of actions user took (with goal_id reference)

### What's Missing:
When a user completes "$3K Agency" goal and moves to "$5K Agency":
1. ❌ No record of when they started "$3K Agency"
2. ❌ No record of when they completed "$3K Agency"
3. ❌ No way to show their progress was 100%
4. ❌ No way to store performance metrics (42 mins/hr learn rate, 94% execution, etc.)
5. ✅ We CAN see their actions via `user_actions` table filtered by old goal_id

### Example Scenario:
**User Journey:**
- Oct 2023: Started "$1K Agency" goal
- Jan 2024: Completed "$1K Agency" (took 90 days, 42 mins/hr learn rate)
- Jan 2024: Started "$2K Agency" goal
- Mar 2024: Completed "$2K Agency" (took 75 days)
- Apr 2024: Started "$3K Agency" goal
- Jun 2024: Completed "$3K Agency" (took 90 days, ranking #3)
- Jul 2024: Started "$5K Agency" goal (current, 75% progress)

**With current tables:**
- `profiles.current_goal_id` = "$5K Agency" ✅
- Can query `user_actions` for each goal ✅
- **Cannot answer:** When did they start each goal? ❌
- **Cannot answer:** When did they complete each goal? ❌
- **Cannot answer:** What was their progress on completed goals? ❌
- **Cannot answer:** What were their performance metrics? ❌

---

## Solutions

### Option 1: Use `user_goal_history` + `goal_metrics` (RECOMMENDED)

**user_goal_history:**
```sql
CREATE TABLE user_goal_history (
  id UUID,
  user_id UUID,
  goal_id UUID REFERENCES track_goals(id),
  status TEXT, -- 'active', 'completed', 'paused'
  progress INTEGER, -- 0-100
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ
);
```

**goal_metrics:**
```sql
CREATE TABLE goal_metrics (
  id UUID,
  user_goal_history_id UUID,
  learn_rate INTEGER,
  execution_rate INTEGER,
  execution_pace TEXT,
  ranking INTEGER,
  days_to_complete INTEGER
);
```

**Pros:**
- Clean separation of concerns
- Easy to query "show me all completed goals for user X"
- Easy to query "show me metrics for this goal instance"
- Matches the UI data structure exactly

**Cons:**
- Two new tables

---

### Option 2: Add columns to existing tables

#### 2a. Add to `profiles` table?
```sql
ALTER TABLE profiles ADD COLUMN goal_history JSONB;
```
❌ Anti-pattern - storing arrays/history in a single column
❌ Can't easily query/filter/join
❌ Hard to maintain data integrity

#### 2b. Use `user_actions` + metadata?
Store goal start/completion as special action types:
```sql
INSERT INTO user_actions (type='goal_started', goal_id, metadata={...})
INSERT INTO user_actions (type='goal_completed', goal_id, metadata={learn_rate: 42, ...})
```

**Pros:**
- No new tables

**Cons:**
- ❌ Mixing concerns (actions vs goal lifecycle)
- ❌ Metrics scattered in metadata JSONB (hard to query)
- ❌ No enforced structure for metrics
- ❌ Complex queries to get goal timeline
- ❌ Progress % updates would create many rows

#### 2c. Extend existing `goal_conversations` table?
Not suitable - that's for conversation tracking, not goal progression

---

### Option 3: Hybrid - Just `user_goal_history` (no separate metrics table)

```sql
CREATE TABLE user_goal_history (
  id UUID,
  user_id UUID,
  goal_id UUID,
  status TEXT,
  progress INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metrics columns (denormalized)
  learn_rate INTEGER,
  execution_rate INTEGER,
  execution_pace TEXT,
  ranking INTEGER,
  days_to_complete INTEGER
);
```

**Pros:**
- Only one new table
- Simpler queries (no joins for metrics)
- Metrics are nullable (only filled when completed)

**Cons:**
- Denormalized (metrics in same table as status)
- Can't have multiple metric calculations for same goal

---

## Recommendation

**Use Option 3: Single `user_goal_history` table with metrics columns**

**Why:**
1. We NEED to track goal instances (start/completion dates, status, progress)
2. `user_actions` is for actions, not goal lifecycle
3. `profiles.current_goal_id` only tracks current goal
4. Metrics are simple attributes of a completed goal (no need for separate table)
5. One goal instance = one set of metrics (1:1 relationship)

**Rename to:**
`user_goals` instead of `user_goal_history` (clearer name)

**Final Schema:**
```sql
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES track_goals(id) ON DELETE CASCADE,

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  progress INTEGER DEFAULT 0, -- 0-100

  -- Dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,

  -- Metrics (populated when completed)
  learn_rate INTEGER,
  execution_rate INTEGER,
  execution_pace TEXT,
  ranking INTEGER,
  days_to_complete INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

This gives us:
- Historical record of all goals user has worked on ✅
- Start/completion dates ✅
- Progress tracking ✅
- Performance metrics ✅
- Can join with `user_actions` to get actions per goal ✅

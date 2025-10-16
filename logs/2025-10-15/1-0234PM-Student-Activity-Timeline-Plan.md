# Student Activity Timeline - Database Design Plan

**Created:** October 15, 2025 @ 2:34 PM EST
**Purpose:** Unified student activity tracking across multiple views

---

## Overview

We need a unified way to track and display student activities across 3 different contexts:
1. **Student Journey Tab** (Instructor Video Page) - Activities filtered by video
2. **Goal Conversations** - Activities grouped by day
3. **Community/Goals Page** - Activities grouped by goal

---

## Activity Types to Track

All student actions that should appear in timelines:

1. **Video-related**
   - Video progress/completion
   - Video reflections (text, voice memo, screenshot, Loom video)
   - Video checkpoints reached

2. **Course-related**
   - Course enrollment
   - Course completion
   - Lesson completion

3. **Assessment-related**
   - Quiz attempts
   - Quiz completions
   - Quiz scores

4. **Goal-related**
   - Daily notes submitted
   - Success proof submissions
   - Goal milestones reached
   - Goal completion

5. **Communication-related**
   - Instructor messages in goal conversations
   - Student reflections/questions

---

## Database Design: Option 2 (Unified Activity Table)

### Why Option 2 Over Option 3?

**Option 2 (Unified Table with Triggers):**
- ✅ Can create composite indexes for fast filtering: `(video_id, student_id)`, `(student_id, date)`, `(student_id, goal_id)`
- ✅ Single query = faster performance
- ✅ Easier to paginate and sort across all activity types
- ✅ Scales better as data grows

**Option 3 (Database View):**
- ❌ Views cannot be indexed → slow queries as data grows
- ❌ Every query re-runs UNION across all tables
- ❌ Harder to optimize for different filter patterns

---

## Proposed Schema

### New Table: `student_activity_timeline`

```sql
CREATE TABLE student_activity_timeline (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Activity classification
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'video_progress',
    'video_completion',
    'text_reflection',
    'voice_reflection',
    'screenshot_reflection',
    'loom_reflection',
    'quiz_attempt',
    'quiz_completion',
    'course_enrollment',
    'course_completion',
    'lesson_completion',
    'checkpoint_reached',
    'daily_note',
    'success_proof',
    'goal_milestone',
    'goal_completion',
    'instructor_message'
  )),

  -- Temporal data
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  activity_date DATE GENERATED ALWAYS AS (DATE(created_at AT TIME ZONE 'America/New_York')) STORED,

  -- Context references (nullable - depends on activity type)
  video_id UUID REFERENCES media_files(id) ON DELETE CASCADE,
  video_timestamp_seconds INTEGER, -- For video-specific activities
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_chapters(id) ON DELETE CASCADE,
  goal_id UUID, -- Links to current_goal_id in profiles
  quiz_id UUID,

  -- Activity content
  content TEXT, -- Main text content (reflection, note, etc.)
  metadata JSONB DEFAULT '{}', -- Flexible storage for type-specific data

  -- Media attachments
  media_url TEXT, -- For voice memos, screenshots, Loom videos
  media_type TEXT, -- 'audio', 'image', 'video'
  media_duration_seconds INTEGER, -- For audio/video

  -- Response tracking (for reflections that need instructor response)
  requires_response BOOLEAN DEFAULT false,
  response_status TEXT CHECK (response_status IN ('pending', 'responded', NULL)),
  instructor_response TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id),

  -- Source reference (to original table for detailed data)
  source_table TEXT, -- 'reflections', 'quiz_attempts', 'video_progress', etc.
  source_id UUID, -- ID in the source table

  -- Indexes for fast queries
  INDEX idx_student_video (student_id, video_id, created_at DESC),
  INDEX idx_student_date (student_id, activity_date DESC),
  INDEX idx_student_goal (student_id, goal_id, created_at DESC),
  INDEX idx_video_all_students (video_id, created_at DESC),
  INDEX idx_response_status (student_id, response_status, created_at DESC)
    WHERE requires_response = true
);
```

---

## Use Cases & Queries

### 1. Student Journey Tab (Instructor Video Page)

**Scenario A: View specific student's activity on a video**
```sql
SELECT * FROM student_activity_timeline
WHERE video_id = 'abc123'
  AND student_id = 'sarah'
ORDER BY video_timestamp_seconds ASC;
```

**Scenario B: View all students' activity on a video**
```sql
SELECT
  sat.*,
  p.full_name,
  p.email
FROM student_activity_timeline sat
JOIN profiles p ON sat.student_id = p.id
WHERE video_id = 'abc123'
ORDER BY video_timestamp_seconds ASC;
```

**What it shows:**
- Timeline of reflections, quiz attempts, checkpoints at specific video timestamps
- All activities tied to THIS video only

---

### 2. Goal Conversations (Daily Activity View)

**Scenario: View all activities for a student on a specific day**
```sql
SELECT * FROM student_activity_timeline
WHERE student_id = 'sarah'
  AND activity_date = '2025-03-15'
ORDER BY created_at ASC;
```

**Grouped by day for the past week:**
```sql
SELECT
  activity_date,
  COUNT(*) as activity_count,
  json_agg(json_build_object(
    'type', activity_type,
    'content', content,
    'timestamp', created_at
  ) ORDER BY created_at) as activities
FROM student_activity_timeline
WHERE student_id = 'sarah'
  AND activity_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY activity_date
ORDER BY activity_date DESC;
```

**What it shows:**
- March 15: Watched 3 videos, completed quiz, wrote 2 reflections, submitted daily note
- March 14: Completed course, submitted success proof
- (All activities across all videos/courses, grouped by day)

---

### 3. Community/Goals Page (Activities Per Goal)

**Scenario: Show all activities for each goal a student completed**
```sql
-- For current/active goal
SELECT * FROM student_activity_timeline
WHERE student_id = 'sarah'
  AND goal_id = 'goal-1k'
ORDER BY created_at ASC;

-- For completed goals (with goal metadata)
SELECT
  goal_id,
  MIN(created_at) as goal_start,
  MAX(created_at) as goal_end,
  COUNT(*) as total_activities,
  json_agg(json_build_object(
    'type', activity_type,
    'content', content,
    'timestamp', created_at,
    'video_id', video_id,
    'course_id', course_id
  ) ORDER BY created_at) as timeline
FROM student_activity_timeline
WHERE student_id = 'sarah'
  AND goal_id IS NOT NULL
GROUP BY goal_id
ORDER BY MIN(created_at);
```

**What it shows:**
- Goal: $1K (Jan 1 - Mar 30): 45 activities → [timeline of all courses, videos, reflections, quizzes]
- Goal: $3K (Apr 1 - Jun 30): 62 activities → [timeline]
- Goal: $5K (Jul 1 - present): 28 activities so far → [timeline]

---

## Data Population Strategy

### Automatic Triggers

Create database triggers to automatically populate `student_activity_timeline` when activities occur:

```sql
-- Trigger when reflection is created
CREATE TRIGGER after_reflection_insert
AFTER INSERT ON reflections
FOR EACH ROW
EXECUTE FUNCTION create_activity_timeline_entry();

-- Similar triggers for:
-- quiz_attempts, video_progress, enrollments, learning_milestones, etc.
```

### Trigger Function Example

```sql
CREATE OR REPLACE FUNCTION create_activity_timeline_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'reflections' THEN
    INSERT INTO student_activity_timeline (
      student_id, activity_type, content, video_id,
      video_timestamp_seconds, requires_response,
      response_status, source_table, source_id, metadata
    ) VALUES (
      NEW.student_id,
      CASE
        WHEN NEW.media_type = 'audio' THEN 'voice_reflection'
        WHEN NEW.media_type = 'image' THEN 'screenshot_reflection'
        WHEN NEW.media_type = 'video' THEN 'loom_reflection'
        ELSE 'text_reflection'
      END,
      NEW.content,
      NEW.video_id,
      NEW.video_timestamp_seconds,
      true, -- Reflections need instructor response
      'pending',
      'reflections',
      NEW.id,
      json_build_object(
        'sentiment', NEW.sentiment,
        'media_url', NEW.media_url,
        'media_duration', NEW.media_duration_seconds
      )
    );
  END IF;

  -- Similar logic for other tables...

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Migration Strategy

1. **Create the new table** with indexes
2. **Create trigger functions** for each source table
3. **Backfill existing data** from current tables:
   - Reflections → activity timeline
   - Quiz attempts → activity timeline
   - Video progress → activity timeline
   - Enrollments → activity timeline
4. **Test queries** for all 3 use cases
5. **Update UI components** to fetch from new table

---

## Benefits of This Approach

1. **Single Source of Truth** - All activities in one place
2. **Fast Queries** - Proper indexes for each use case
3. **Flexible Filtering** - Can filter by video, date, goal, or combinations
4. **Easy Pagination** - Simple LIMIT/OFFSET on single table
5. **Automatic Sync** - Triggers keep timeline updated
6. **Rich Metadata** - JSONB allows type-specific data without schema changes
7. **Audit Trail** - Complete history of student progress
8. **Cross-Course Insights** - See activities across all courses for goal tracking

---

## Next Steps

1. Create migration file for `student_activity_timeline` table
2. Add missing fields to existing tables (e.g., `video_timestamp_seconds` to `reflections`)
3. Create trigger functions for automatic population
4. Backfill historical data
5. Create server actions to query timeline for each use case
6. Update UI components to use real data instead of mocks

---

## Questions to Resolve

1. Should we track video progress at specific intervals (every 10%) or only on completion?
2. How to handle goal_id when student switches goals? (Keep old activities with old goal_id?)
3. Should we soft-delete activities or hard-delete when source record is deleted?
4. What's the retention policy for activity data? (Keep forever vs. archive after X months)

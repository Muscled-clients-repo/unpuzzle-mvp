# Student Activity Timeline - Implementation Plan

**Created:** October 15, 2025 @ 4:48 PM EST
**Purpose:** Detailed implementation plan for student activity timeline tracking

---

## Overview

Create a unified `student_activity_timeline` table to track **11 activity types** and display them in **3 different contexts**:

1. **Student Journey Tab** (Instructor Video Page) - Activities filtered by video
2. **Goal Conversations** - Activities grouped by day
3. **Community/Goals Page** - Activities grouped by goal

---

## The 11 Activity Types

### Reflection Activities (4 types)
1. **`text`** - Text reflection at video timestamp
2. **`screenshot`** - Screenshot reflection at video timestamp
3. **`voice`** - Voice memo reflection at video timestamp
4. **`loom`** - Loom video reflection at video timestamp

### Learning Activities (2 types)
5. **`quiz`** - Quiz attempts/completions
6. **`ai_chat`** - AI interactions/conversations

### Course Activities (1 type)
7. **`course_completion`** - Student completed a course

### Goal Progress Activities (4 types)
8. **`daily_note_submission`** - Student submitted daily note
9. **`revenue_proof_submission`** - Student submitted revenue/success proof
10. **`goal_achieved`** - Student completed/achieved a goal
11. **`new_goal_entered`** - Student started a new goal

---

## Source Tables for Each Activity Type

| Activity Type | Source Table | Filter/Condition |
|---------------|--------------|------------------|
| `text` | `reflections` | `reflection_type = 'text'` |
| `screenshot` | `reflections` | `reflection_type = 'screenshot'` |
| `voice` | `reflections` | `reflection_type = 'voice'` |
| `loom` | `reflections` | `reflection_type = 'loom'` |
| `quiz` | `quiz_attempts` | All quiz attempts |
| `ai_chat` | `ai_interactions` | All AI interactions |
| `course_completion` | `enrollments` | When course is completed |
| `daily_note_submission` | `user_daily_notes` | On INSERT |
| `revenue_proof_submission` | `conversation_messages` | `message_type = 'revenue_submission'` |
| `goal_achieved` | `profiles` | `current_goal_id` changes AND old `goal_status = 'completed'` |
| `new_goal_entered` | `profiles` | `current_goal_id` changes |

---

## Database Schema

### Table: `student_activity_timeline`

```sql
CREATE TABLE student_activity_timeline (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Activity classification
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'text',
    'screenshot',
    'voice',
    'loom',
    'quiz',
    'ai_chat',
    'course_completion',
    'daily_note_submission',
    'revenue_proof_submission',
    'goal_achieved',
    'new_goal_entered'
  )),

  -- Temporal data
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  activity_date DATE GENERATED ALWAYS AS (DATE(created_at AT TIME ZONE 'America/New_York')) STORED,

  -- Context references (nullable - depends on activity type)
  video_id UUID REFERENCES media_files(id) ON DELETE CASCADE,
  video_timestamp_seconds DECIMAL(10,2), -- For reflections at specific video timestamps
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES track_goals(id) ON DELETE CASCADE, -- Links to goal this activity belongs to

  -- Activity content
  content TEXT, -- Main text content (reflection text, quiz result, daily note, etc.)
  metadata JSONB DEFAULT '{}', -- Flexible storage for type-specific data

  -- Media attachments (for voice/screenshot/loom reflections)
  media_url TEXT, -- For voice memos, screenshots, Loom videos
  media_type TEXT CHECK (media_type IN ('audio', 'image', 'video', NULL)),
  media_duration_seconds DECIMAL(10,2), -- For audio/video

  -- Response tracking (for reflections that need instructor response)
  requires_response BOOLEAN DEFAULT false,
  response_status TEXT CHECK (response_status IN ('pending', 'responded', NULL)),
  instructor_response TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id),

  -- Source reference (to original table for detailed data)
  source_table TEXT NOT NULL, -- 'reflections', 'quiz_attempts', 'ai_interactions', etc.
  source_id UUID -- ID in the source table
);

-- Indexes for fast queries across all 3 use cases
CREATE INDEX idx_student_video_timeline
  ON student_activity_timeline(student_id, video_id, video_timestamp_seconds ASC)
  WHERE video_id IS NOT NULL;

CREATE INDEX idx_student_date_timeline
  ON student_activity_timeline(student_id, activity_date DESC);

CREATE INDEX idx_student_goal_timeline
  ON student_activity_timeline(student_id, goal_id, created_at DESC)
  WHERE goal_id IS NOT NULL;

CREATE INDEX idx_video_all_students
  ON student_activity_timeline(video_id, created_at DESC)
  WHERE video_id IS NOT NULL;

CREATE INDEX idx_response_status
  ON student_activity_timeline(student_id, response_status, created_at DESC)
  WHERE requires_response = true;

-- Enable RLS
ALTER TABLE student_activity_timeline ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users view own activities
CREATE POLICY "Users view own activities" ON student_activity_timeline
  FOR SELECT USING (auth.uid() = student_id);

-- RLS Policy: Instructors view all student activities
CREATE POLICY "Instructors view all activities" ON student_activity_timeline
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('instructor', 'admin')
    )
  );
```

---

## Trigger Implementation Plan

### 1. Reflections Trigger (Types: text, screenshot, voice, loom)

```sql
CREATE OR REPLACE FUNCTION track_reflection_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
BEGIN
  -- Get student's current goal
  SELECT current_goal_id INTO v_goal_id
  FROM profiles
  WHERE id = NEW.user_id;

  -- Insert into activity timeline
  INSERT INTO student_activity_timeline (
    student_id, activity_type, created_at, video_id, video_timestamp_seconds,
    course_id, goal_id, content, media_url, media_type, media_duration_seconds,
    requires_response, response_status, source_table, source_id, metadata
  ) VALUES (
    NEW.user_id,
    NEW.reflection_type, -- 'text', 'screenshot', 'voice', 'loom'
    NEW.created_at,
    NEW.video_id,
    NEW.video_timestamp_seconds,
    NEW.course_id,
    v_goal_id,
    NEW.reflection_text,
    NEW.file_url, -- NULL for text reflections
    CASE
      WHEN NEW.reflection_type = 'voice' THEN 'audio'
      WHEN NEW.reflection_type = 'screenshot' THEN 'image'
      WHEN NEW.reflection_type = 'loom' THEN 'video'
      ELSE NULL
    END,
    NEW.duration_seconds,
    true, -- Reflections need instructor response
    'pending',
    'reflections',
    NEW.id,
    jsonb_build_object()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_reflection_insert
AFTER INSERT ON reflections
FOR EACH ROW
EXECUTE FUNCTION track_reflection_activity();
```

---

### 2. Quiz Attempts Trigger (Type: quiz)

```sql
CREATE OR REPLACE FUNCTION track_quiz_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
BEGIN
  -- Get student's current goal
  SELECT current_goal_id INTO v_goal_id
  FROM profiles
  WHERE id = NEW.user_id;

  -- Insert into activity timeline
  INSERT INTO student_activity_timeline (
    student_id, activity_type, created_at, video_id, course_id, goal_id,
    content, requires_response, source_table, source_id, metadata
  ) VALUES (
    NEW.user_id,
    'quiz',
    NEW.completed_at,
    NEW.video_id,
    NEW.course_id,
    v_goal_id,
    'Completed quiz: ' || NEW.correct_answers || '/' || NEW.questions_count || ' correct (' || NEW.score_percent || '%)',
    false, -- Quizzes don't need response
    'quiz_attempts',
    NEW.id,
    jsonb_build_object(
      'score_percent', NEW.score_percent,
      'passed', NEW.passed,
      'attempt_number', NEW.attempt_number
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_quiz_completion
AFTER UPDATE ON quiz_attempts
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION track_quiz_activity();
```

---

### 3. AI Interactions Trigger (Type: ai_chat)

```sql
CREATE OR REPLACE FUNCTION track_ai_chat_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
BEGIN
  -- Get student's current goal
  SELECT current_goal_id INTO v_goal_id
  FROM profiles
  WHERE id = NEW.user_id;

  -- Insert into activity timeline
  INSERT INTO student_activity_timeline (
    student_id, activity_type, created_at, video_id, course_id, goal_id,
    content, requires_response, source_table, source_id, metadata
  ) VALUES (
    NEW.user_id,
    'ai_chat',
    NEW.created_at,
    NEW.video_id,
    NEW.course_id,
    v_goal_id,
    'AI ' || NEW.interaction_type || ': ' || LEFT(NEW.prompt, 100) || '...',
    false,
    'ai_interactions',
    NEW.id,
    jsonb_build_object(
      'interaction_type', NEW.interaction_type,
      'video_timestamp_seconds', NEW.video_timestamp_seconds
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_ai_interaction
AFTER INSERT ON ai_interactions
FOR EACH ROW
EXECUTE FUNCTION track_ai_chat_activity();
```

---

### 4. Course Completion Trigger (Type: course_completion)

```sql
CREATE OR REPLACE FUNCTION track_course_completion_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
  v_course_title TEXT;
BEGIN
  -- Only track when course is newly completed
  IF OLD.progress_percent < 100 AND NEW.progress_percent >= 100 THEN
    -- Get student's current goal
    SELECT current_goal_id INTO v_goal_id
    FROM profiles
    WHERE id = NEW.user_id;

    -- Get course title
    SELECT title INTO v_course_title
    FROM courses
    WHERE id = NEW.course_id;

    -- Insert into activity timeline
    INSERT INTO student_activity_timeline (
      student_id, activity_type, created_at, course_id, goal_id,
      content, requires_response, source_table, source_id, metadata
    ) VALUES (
      NEW.user_id,
      'course_completion',
      NEW.completed_at,
      NEW.course_id,
      v_goal_id,
      'Completed course: ' || COALESCE(v_course_title, 'Unknown'),
      false,
      'enrollments',
      NEW.id,
      jsonb_build_object('course_title', v_course_title)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_course_completion
AFTER UPDATE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION track_course_completion_activity();
```

---

### 5. Daily Note Submission Trigger (Type: daily_note_submission)

```sql
CREATE OR REPLACE FUNCTION track_daily_note_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into activity timeline
  INSERT INTO student_activity_timeline (
    student_id, activity_type, created_at, goal_id,
    content, requires_response, source_table, source_id, metadata
  ) VALUES (
    NEW.user_id,
    'daily_note_submission',
    NEW.created_at,
    NEW.goal_id,
    LEFT(NEW.note, 200), -- First 200 chars of daily note
    false,
    'user_daily_notes',
    NEW.id,
    jsonb_build_object('note_date', NEW.note_date)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_daily_note_insert
AFTER INSERT ON user_daily_notes
FOR EACH ROW
EXECUTE FUNCTION track_daily_note_activity();
```

---

### 6. Revenue Proof Submission Trigger (Type: revenue_proof_submission)

```sql
CREATE OR REPLACE FUNCTION track_revenue_proof_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_goal_id UUID;
  v_metadata JSONB;
BEGIN
  -- Only track revenue submission messages
  IF NEW.message_type = 'revenue_submission' THEN
    -- Get student's current goal
    SELECT current_goal_id INTO v_goal_id
    FROM profiles
    WHERE id = NEW.sender_id;

    -- Extract revenue metadata
    v_metadata := NEW.metadata;

    -- Insert into activity timeline
    INSERT INTO student_activity_timeline (
      student_id, activity_type, created_at, goal_id,
      content, requires_response, source_table, source_id, metadata
    ) VALUES (
      NEW.sender_id,
      'revenue_proof_submission',
      NEW.created_at,
      v_goal_id,
      NEW.content,
      false,
      'conversation_messages',
      NEW.id,
      v_metadata
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_revenue_submission
AFTER INSERT ON conversation_messages
FOR EACH ROW
WHEN (NEW.message_type = 'revenue_submission')
EXECUTE FUNCTION track_revenue_proof_activity();
```

---

### 7. Goal Change Trigger (Types: goal_achieved, new_goal_entered)

```sql
CREATE OR REPLACE FUNCTION track_goal_change_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_old_goal_title TEXT;
  v_new_goal_title TEXT;
BEGIN
  -- Only track when goal ID actually changes
  IF OLD.current_goal_id IS DISTINCT FROM NEW.current_goal_id THEN

    -- Get old goal title
    IF OLD.current_goal_id IS NOT NULL THEN
      SELECT name INTO v_old_goal_title
      FROM track_goals
      WHERE id = OLD.current_goal_id;

      -- Track goal achievement if old goal was completed
      IF OLD.goal_status = 'completed' THEN
        INSERT INTO student_activity_timeline (
          student_id, activity_type, created_at, goal_id,
          content, requires_response, source_table, source_id, metadata
        ) VALUES (
          NEW.id,
          'goal_achieved',
          NOW(),
          OLD.current_goal_id,
          'Achieved goal: ' || COALESCE(v_old_goal_title, 'Unknown'),
          false,
          'profiles',
          NEW.id,
          jsonb_build_object(
            'goal_id', OLD.current_goal_id,
            'goal_title', v_old_goal_title,
            'goal_progress', OLD.goal_progress
          )
        );
      END IF;
    END IF;

    -- Get new goal title
    IF NEW.current_goal_id IS NOT NULL THEN
      SELECT name INTO v_new_goal_title
      FROM track_goals
      WHERE id = NEW.current_goal_id;

      -- Track new goal entry
      INSERT INTO student_activity_timeline (
        student_id, activity_type, created_at, goal_id,
        content, requires_response, source_table, source_id, metadata
      ) VALUES (
        NEW.id,
        'new_goal_entered',
        NOW(),
        NEW.current_goal_id,
        'Started new goal: ' || COALESCE(v_new_goal_title, 'Unknown'),
        false,
        'profiles',
        NEW.id,
        jsonb_build_object(
          'goal_id', NEW.current_goal_id,
          'goal_title', v_new_goal_title,
          'previous_goal_id', OLD.current_goal_id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_goal_change
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.current_goal_id IS DISTINCT FROM NEW.current_goal_id)
EXECUTE FUNCTION track_goal_change_activity();
```

---

## The 3 Use Cases with Queries

### Use Case 1: Student Journey Tab (Instructor Video Page)

**Filter:** Activities for a specific video (single student OR all students)

**Query for single student:**
```sql
SELECT
  sat.*,
  p.full_name,
  p.email
FROM student_activity_timeline sat
JOIN profiles p ON sat.student_id = p.id
WHERE sat.video_id = $1 -- specific video
  AND sat.student_id = $2 -- specific student
ORDER BY sat.video_timestamp_seconds ASC NULLS LAST, sat.created_at ASC;
```

**Query for all students on video:**
```sql
SELECT
  sat.*,
  p.full_name,
  p.email
FROM student_activity_timeline sat
JOIN profiles p ON sat.student_id = p.id
WHERE sat.video_id = $1 -- specific video
ORDER BY sat.created_at DESC;
```

**Example display:**
- 2:15 - Sarah: Text reflection "Great introduction!"
- 5:30 - Mike: Screenshot showing error
- 10:45 - Sarah: Quiz completed (8/10 correct)
- 12:30 - Emma: Voice memo about useCallback

---

### Use Case 2: Goal Conversations (Daily Activity View)

**Filter:** Activities grouped by day for a specific student

**Query for specific day:**
```sql
SELECT *
FROM student_activity_timeline
WHERE student_id = $1
  AND activity_date = $2
ORDER BY created_at ASC;
```

**Query grouped by day (past week):**
```sql
SELECT
  activity_date,
  COUNT(*) as activity_count,
  jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', activity_type,
      'content', content,
      'timestamp', created_at,
      'video_id', video_id,
      'course_id', course_id,
      'metadata', metadata
    ) ORDER BY created_at
  ) as activities
FROM student_activity_timeline
WHERE student_id = $1
  AND activity_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY activity_date
ORDER BY activity_date DESC;
```

**Example display:**
- **March 15, 2025** (8 activities)
  - 9:00 AM - Submitted daily note
  - 10:30 AM - Watched video & reflected at 5:20
  - 2:15 PM - Completed quiz (90%)
  - 4:45 PM - AI chat about React hooks
  - 8:30 PM - Submitted revenue proof ($2,500)

- **March 14, 2025** (5 activities)
  - 10:00 AM - Completed course "Agency Fundamentals"
  - 3:30 PM - Voice reflection on scaling strategies

---

### Use Case 3: Community/Goals Page (Activities Per Goal)

**Filter:** Activities grouped by goal for a specific student

**Query for current goal:**
```sql
SELECT *
FROM student_activity_timeline
WHERE student_id = $1
  AND goal_id = $2 -- current goal
ORDER BY created_at ASC;
```

**Query for all goals (with grouping):**
```sql
SELECT
  tg.name as goal_name,
  tg.id as goal_id,
  MIN(sat.created_at) as goal_started_at,
  MAX(CASE WHEN sat.activity_type = 'goal_achieved' THEN sat.created_at END) as goal_achieved_at,
  COUNT(*) as total_activities,
  COUNT(*) FILTER (WHERE sat.activity_type IN ('text', 'screenshot', 'voice', 'loom')) as reflections_count,
  COUNT(*) FILTER (WHERE sat.activity_type = 'quiz') as quizzes_count,
  COUNT(*) FILTER (WHERE sat.activity_type = 'course_completion') as courses_completed,
  jsonb_agg(
    jsonb_build_object(
      'id', sat.id,
      'type', sat.activity_type,
      'content', sat.content,
      'timestamp', sat.created_at,
      'video_id', sat.video_id,
      'course_id', sat.course_id
    ) ORDER BY sat.created_at
  ) as activity_timeline
FROM student_activity_timeline sat
JOIN track_goals tg ON sat.goal_id = tg.id
WHERE sat.student_id = $1
  AND sat.goal_id IS NOT NULL
GROUP BY tg.id, tg.name
ORDER BY MIN(sat.created_at);
```

**Example display:**
- **Goal: $1K Agency** (Jan 1 - Mar 30) - 45 activities
  - Timeline: Started goal → 10 videos watched → 5 quizzes → 3 courses completed → Revenue submission → Goal achieved

- **Goal: $3K Agency** (Apr 1 - Jun 30) - 62 activities
  - Timeline: Started goal → 15 videos → 8 quizzes → 4 courses → Multiple revenue submissions → Goal achieved

- **Goal: $5K Agency** (Jul 1 - present) - 28 activities (in progress)
  - Timeline: Started goal → 6 videos so far → 2 quizzes → 1 course completed

---

## Migration Steps

1. **Create the table** with all indexes and RLS policies
2. **Create all 7 trigger functions**
3. **Apply triggers** to source tables
4. **Backfill historical data** (optional - if needed)
   - Query existing reflections, quizzes, AI chats, etc.
   - Insert into timeline with original timestamps
5. **Test queries** for all 3 use cases
6. **Update UI components** to fetch from new table

---

## Benefits of This Approach

1. **Single source of truth** for all student activities
2. **Fast queries** with proper indexes for each use case
3. **No manual sync** - triggers keep timeline updated automatically
4. **Flexible filtering** - Can filter by video, date, goal, or any combination
5. **Complete audit trail** - Never lose activity history
6. **Easy pagination** - Simple LIMIT/OFFSET on single table
7. **Rich context** - JSONB metadata allows type-specific details
8. **Cross-course insights** - See all activities across entire learning journey

---

## Next Steps

1. Create migration file: `XXX_create_student_activity_timeline.sql`
2. Implement and test all 7 triggers
3. Backfill existing data (if needed)
4. Create server actions for each use case
5. Update UI components:
   - `StudentJourneySidebar.tsx` → Use real timeline data
   - Goal conversations page → Use real daily activity data
   - `CommunityGoalsSection.tsx` → Use real goal timeline data

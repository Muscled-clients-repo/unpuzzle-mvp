# Activity Timeline Investigation - Findings & Corrections

**Created:** October 15, 2025 @ 6:31 PM EST
**Purpose:** Verification findings before implementing activity timeline

---

## Summary

✅ All source tables verified
✅ Column names confirmed
⚠️ **1 Critical correction needed:** Foreign key reference
✅ No conflicting triggers found
✅ Profiles table goal columns verified
✅ Timezone handling validated

---

## Critical Correction Needed

### ❌ Foreign Key Reference Error

**In the implementation MD file, I used:**
```sql
video_id UUID REFERENCES media_files(id) ON DELETE CASCADE
```

**Correct reference should be:**
```sql
video_id UUID REFERENCES videos(id) ON DELETE CASCADE
```

**Reason:** The table is named `videos`, not `media_files`. All source tables reference `videos(id)`.

---

## Verified Column Names by Table

### ✅ 1. reflections
- **Columns verified:**
  - `id`, `user_id`, `course_id` (NOT NULL), `video_id` (NOT NULL)
  - `reflection_prompt`, `reflection_text` (NOT NULL)
  - `reflection_type` (CHECK: 'voice', 'screenshot', 'loom', 'text')
  - `instructor_response`, `instructor_responded_at`
  - `created_at`, `updated_at`
  - `file_url`, `duration_seconds`, `video_timestamp_seconds` (added in migration 049)

- **Note:** course_id and video_id made NOT NULL in migration 057

---

### ✅ 2. quiz_attempts
- **Columns verified:**
  - `id`, `user_id` (NOT NULL), `course_id`, `video_id`
  - `quiz_type`, `questions_count`, `correct_answers`, `score_percent`
  - `time_spent_seconds`, `attempt_number`, `passed`
  - `started_at`, `completed_at`

- **Key for trigger:** Use `completed_at` change (from NULL to NOT NULL) to detect quiz completion

---

### ✅ 3. ai_interactions
- **Columns verified:**
  - `id`, `user_id` (NOT NULL), `course_id`, `video_id`
  - `interaction_type`, `prompt` (NOT NULL), `response` (NOT NULL)
  - `video_timestamp_seconds`, `concepts_discussed`
  - `user_rating`, `helpful`
  - `created_at`

- **Existing trigger:** `trigger_increment_ai_interactions_v2` (AFTER INSERT) - increments counters, won't conflict

---

### ✅ 4. enrollments
- **Columns verified:**
  - `id`, `user_id` (NOT NULL), `course_id`
  - `enrolled_at`, `progress_percent`, `completed_videos`, `total_videos`
  - `current_lesson_title`, `current_video_id`, `estimated_time_remaining_formatted`
  - `ai_interactions_count`
  - `last_accessed_at`, `completed_at`

- **Key for trigger:** Watch for `progress_percent` changing from <100 to >=100 OR `completed_at` changing from NULL to NOT NULL

---

### ✅ 5. user_daily_notes
- **Columns verified:**
  - `id`, `user_id` (NOT NULL), `goal_id`
  - `note` (NOT NULL), `note_date`, `created_at`, `updated_at`

- **Existing trigger:** `user_daily_notes_updated_at` (BEFORE UPDATE) - just updates updated_at, won't conflict

---

### ✅ 6. conversation_messages
- **Columns verified:**
  - `id`, `conversation_id` (NOT NULL), `sender_id` (NOT NULL)
  - `message_type` (CHECK: 'daily_note', 'questionnaire_response', 'revenue_submission')
  - `content` (NOT NULL), `metadata`, `reply_to_id`, `target_date`
  - `created_at`, `updated_at`

- **Existing trigger:** `trigger_conversation_messages_updated_at` (BEFORE UPDATE) - just updates updated_at, won't conflict

- **For revenue submissions:** Filter by `message_type = 'revenue_submission'` and use AFTER INSERT trigger

---

### ✅ 7. profiles (for goal changes)
- **Goal-related columns verified:**
  - `current_goal_id` (UUID, REFERENCES track_goals(id))
  - `goal_assigned_at`
  - `goal_title`, `goal_current_amount`, `goal_target_amount`
  - `goal_progress` (INTEGER 0-100)
  - `goal_target_date`, `goal_start_date`
  - `goal_status` ('active', 'completed', 'paused')

- **Existing trigger:** `update_profiles_updated_at` (BEFORE UPDATE) - just updates updated_at, won't conflict

---

## Existing Triggers - No Conflicts

All existing triggers on source tables are either:
1. **BEFORE UPDATE** triggers that update `updated_at` timestamps (won't conflict)
2. **AFTER INSERT** triggers that increment counters (can coexist with our triggers)

PostgreSQL allows multiple triggers on the same table/event. Our **AFTER INSERT/UPDATE** triggers will run alongside existing ones.

---

## Foreign Key References - Verified

### ✅ Correct References:
- `student_id` → `profiles(id)` ✅
- `video_id` → **`videos(id)`** ✅ (NOT media_files)
- `course_id` → `courses(id)` ✅
- `goal_id` → `track_goals(id)` ✅
- `responded_by` → `profiles(id)` ✅

---

## Timezone Handling - Validated

### ✅ GENERATED Column Syntax
```sql
activity_date DATE GENERATED ALWAYS AS (DATE(created_at AT TIME ZONE 'America/New_York')) STORED
```

**Validation:**
- PostgreSQL supports GENERATED columns ✅
- `AT TIME ZONE 'America/New_York'` is valid PostgreSQL syntax ✅
- Converting TIMESTAMPTZ to DATE will give correct date in EST ✅

**Example:**
- Event at `2025-03-15 23:30:00 UTC` → Date: `2025-03-15` in EST (6:30 PM EST)
- Event at `2025-03-16 03:30:00 UTC` → Date: `2025-03-15` in EST (10:30 PM EST)

This ensures daily activity groupings are correct for US Eastern timezone.

---

## Trigger Function Corrections Needed

### 1. Reflections Trigger
**Columns to use:**
- ✅ `user_id` (not student_id)
- ✅ `reflection_text` (not reflection_content)
- ✅ `reflection_type` (correct values: 'text', 'screenshot', 'voice', 'loom')

### 2. Quiz Trigger
**Detection logic:**
```sql
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
```
This triggers only when quiz goes from in-progress to completed.

### 3. Enrollments Trigger
**Detection logic (either condition):**
```sql
IF (OLD.progress_percent < 100 AND NEW.progress_percent >= 100) OR
   (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL) THEN
```

### 4. Goal Change Trigger
**Use profiles.id, not student_id:**
```sql
INSERT INTO student_activity_timeline (
  student_id, ...
) VALUES (
  NEW.id,  -- profiles.id becomes student_id
  ...
)
```

---

## Schema Adjustments Needed in MD File

### Change 1: Foreign Key
```diff
- video_id UUID REFERENCES media_files(id) ON DELETE CASCADE,
+ video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
```

### Change 2: Trigger Function Variables
Update all trigger functions to use verified column names:
- `user_id` (not student_id in source tables)
- `reflection_text` (not reflection_content)
- For profiles trigger: `NEW.id` becomes `student_id` in activity timeline

---

## Implementation Ready Checklist

- [x] All source table schemas verified
- [x] Column names confirmed
- [x] Existing triggers documented (no conflicts)
- [x] Foreign key references verified
- [x] Timezone conversion validated
- [x] Corrections identified for MD file
- [ ] Update MD file with corrections
- [ ] Create migration SQL file
- [ ] Test triggers on sample data

---

## Next Steps

1. **Update implementation MD file** with corrected foreign key reference (videos, not media_files)
2. **Create migration file** with exact column names from this investigation
3. **Test each trigger** individually before deploying
4. **Backfill historical data** (optional) after triggers are working

---

## Notes for Implementation

### Important Reminders:
1. PostgreSQL allows **multiple triggers** on same table/event - no conflicts with existing triggers
2. Use **AFTER INSERT** for most activity creation (reflections, ai_chat, daily_notes, revenue_submissions)
3. Use **AFTER UPDATE** with WHEN clause for state changes (quiz completion, course completion, goal changes)
4. Always get `current_goal_id` from profiles to associate activities with goals
5. Use `GENERATED` column for `activity_date` to ensure consistent EST timezone conversion

### Trigger Execution Order:
If multiple AFTER triggers exist, they execute in **alphabetical order by trigger name**. Our trigger names should be descriptive:
- `after_reflection_activity_timeline`
- `after_quiz_completion_activity_timeline`
- `after_ai_chat_activity_timeline`
- etc.

This ensures clarity and predictable execution order.

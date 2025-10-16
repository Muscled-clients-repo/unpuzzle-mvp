# Live Database Verification - CRITICAL FINDINGS

**Created:** October 15, 2025 @ 6:54 PM EST
**Status:** 🚨 MAJOR DISCREPANCIES FOUND
**Action Required:** Review before implementing activity timeline

---

## 🚨 CRITICAL FINDING #1: Activity Table Already Exists!

### `community_activities` table EXISTS in live database

**Current Schema:**
```typescript
community_activities: {
  activity_type: string
  ai_conversation_id: string | null
  content: string | null
  conversation_message_id: string | null
  created_at: string | null
  goal_id: string | null
  goal_title: string | null
  id: string
  is_public: boolean | null
  media_file_id: string | null
  metadata: Json | null
  quiz_attempt_id: string | null
  reflection_id: string | null
  timestamp_seconds: number | null
  updated_at: string | null
  user_id: string
  video_title: string | null
}
```

**This table already tracks:**
- ✅ Activity type
- ✅ Goal ID linkage
- ✅ References to reflections, quizzes, AI conversations, conversation messages
- ✅ Media file ID
- ✅ Video timestamp
- ✅ Metadata JSONB
- ✅ Public/private flag

**QUESTION:** Should we:
1. Use the existing `community_activities` table instead of creating a new one?
2. Extend `community_activities` with missing columns?
3. Create separate `student_activity_timeline` for instructor use vs `community_activities` for student/public use?

---

## 🚨 CRITICAL FINDING #2: Foreign Key References

### ❌ NO `videos` table - Use `media_files` instead!

**Live Database has:**
- ✅ `media_files` table
- ❌ NO `videos` table

**All foreign keys must reference:**
```sql
video_id UUID REFERENCES media_files(id) ON DELETE CASCADE
```

**NOT:**
```sql
video_id UUID REFERENCES videos(id) ON DELETE CASCADE  -- WRONG!
```

---

## 🚨 CRITICAL FINDING #3: AI Interactions Table Name

### ❌ NO `ai_interactions` table

**Live Database has:**
- ✅ `video_ai_conversations` table (NOT `ai_interactions`)

**Schema:**
```typescript
video_ai_conversations: {
  id: string
  user_id: string
  user_message: string
  ai_response: string
  conversation_context: string | null
  media_file_id: string | null
  video_timestamp: number | null
  model_used: string | null
  parent_message_id: string | null
  metadata: Json | null
  created_at: string | null
}
```

**For triggers:** Use `video_ai_conversations`, NOT `ai_interactions`

---

## 🚨 CRITICAL FINDING #4: quiz_attempts Schema Mismatch

### Live DB schema is DIFFERENT from migrations

**Live Database has:**
```typescript
quiz_attempts: {
  id: string
  user_id: string | null  // NOTE: nullable!
  video_id: string
  course_id: string
  checkpoint_id: string | null

  // Different column names:
  percentage: number           // NOT score_percent
  score: number                // NOT correct_answers
  total_questions: number      // NOT questions_count
  video_timestamp: number      // NOT video_timestamp_seconds

  // Different structure:
  questions: Json              // Full quiz data
  user_answers: Json           // User's answers
  quiz_duration_seconds: number | null

  // Missing from live DB:
  // - completed_at
  // - passed
  // - attempt_number
  // - started_at
}
```

**Trigger implications:**
- ❌ Cannot use `completed_at` change detection (column doesn't exist!)
- ✅ Must use INSERT trigger only (no UPDATE trigger)
- ✅ Quiz is completed when row is inserted

---

## ✅ VERIFIED: Correct Column Names

### 1. reflections
```typescript
{
  id: string
  user_id: string
  course_id: string (NOT NULL)
  video_id: string (NOT NULL)

  reflection_text: string (NOT NULL)
  reflection_type: string | null  // 'voice', 'screenshot', 'loom', 'text'
  reflection_prompt: string | null

  file_url: string | null
  duration_seconds: number | null
  video_timestamp_seconds: number | null

  // Frame-based tracking (NEW!):
  duration_frames: number | null
  video_timestamp_frames: number | null

  // Activity linkage (NEW!):
  activity_id: string | null
  checkpoint_id: string | null

  instructor_response: string | null
  instructor_responded_at: string | null

  created_at: string | null
  updated_at: string | null
}
```

---

### 2. enrollments
```typescript
{
  id: string
  user_id: string (NOT NULL)
  course_id: string | null

  enrolled_at: string | null
  progress_percent: number | null
  completed_videos: number | null
  total_videos: number | null

  current_lesson_title: string | null
  current_video_id: string | null
  estimated_time_remaining_formatted: string | null

  ai_interactions_count: number | null

  last_accessed_at: string | null
  completed_at: string | null
}
```

**✅ Trigger logic:** Watch for `progress_percent >= 100` OR `completed_at` IS NOT NULL

---

### 3. user_daily_notes
```typescript
{
  id: string
  user_id: string (NOT NULL)
  goal_id: string | null
  note: string (NOT NULL)
  note_date: string | null
  created_at: string | null
  updated_at: string | null
}
```

**✅ All columns match expectations**

---

### 4. conversation_messages
```typescript
{
  id: string
  conversation_id: string (NOT NULL)
  sender_id: string (NOT NULL)
  message_type: string (NOT NULL)
  content: string (NOT NULL)
  metadata: Json | null
  reply_to_id: string | null
  target_date: string | null

  // NEW columns in live DB:
  draft_content: string | null
  is_draft: boolean
  shared_note_id: string | null
  visibility: string

  created_at: string | null
  updated_at: string | null
}
```

**✅ revenue_submission message_type exists**

---

### 5. profiles (Goal Columns)
```typescript
{
  current_goal_id: string | null
  current_track_id: string | null

  goal_title: string | null
  goal_current_amount: string | null
  goal_target_amount: string | null
  goal_progress: number | null
  goal_status: string | null

  goal_start_date: string | null
  goal_target_date: string | null
  goal_assigned_at: string | null
  goal_started_at: string | null
  goal_completed_at: string | null

  // NEW in live DB - IMPORTANT!
  completed_goals: string[] | null  // Array of completed goal IDs!
}
```

**🎯 Key Discovery:** `completed_goals` array exists!
- Can track goal history without separate table
- When goal changes, push old goal_id to this array

---

## Recommendations

### Option 1: Use Existing `community_activities` Table ⭐ RECOMMENDED
**Pros:**
- Already exists and is being used
- Has most columns we need
- References correct tables (media_files, video_ai_conversations)
- Has `is_public` for privacy control

**Cons:**
- Missing `activity_date` computed column (can add)
- Missing `requires_response` and response tracking (can add)
- Missing some activity types (can extend)

**Action:** Extend existing table with missing columns instead of creating new one

---

### Option 2: Create Separate `student_activity_timeline` Table
**Pros:**
- Full control over schema
- Can optimize for instructor use cases
- Clear separation of concerns

**Cons:**
- Duplicate data with `community_activities`
- Need to keep both tables in sync
- More complexity

**Action:** Only if we need significantly different structure

---

## Required Schema Corrections for Implementation Plan

### 1. Table Name
```diff
- CREATE TABLE student_activity_timeline (
+ -- Option A: Extend community_activities
+ ALTER TABLE community_activities ADD COLUMN ...

+ -- Option B: Create new table
+ CREATE TABLE student_activity_timeline (
```

### 2. Foreign Key References
```diff
- video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
+ video_id UUID REFERENCES media_files(id) ON DELETE CASCADE,
```

### 3. AI Chat Source Table
```diff
- source_table: 'ai_interactions'
+ source_table: 'video_ai_conversations'
```

### 4. Quiz Column Names
```diff
- NEW.correct_answers || '/' || NEW.questions_count
+ NEW.score || '/' || NEW.total_questions

- NEW.score_percent
+ NEW.percentage
```

### 5. Quiz Trigger Logic
```diff
- AFTER UPDATE ON quiz_attempts
- WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
+ AFTER INSERT ON quiz_attempts
+ -- Insert means quiz is completed
```

### 6. Quiz Video Timestamp
```diff
- NEW.video_timestamp_seconds
+ NEW.video_timestamp
```

---

## Next Steps - DECISION REQUIRED

1. **User Decision:** Should we:
   - A) Extend `community_activities` table?
   - B) Create new `student_activity_timeline` table?
   - C) Use `community_activities` as-is and just create triggers?

2. **After decision:** Update implementation MD with correct:
   - Table name (community_activities vs student_activity_timeline)
   - Foreign key references (media_files, not videos)
   - Source table names (video_ai_conversations, not ai_interactions)
   - Column names for quiz_attempts

3. **Test on staging** before production deployment

---

## Files to Update

1. `/logs/2025-10-15/2-0448PM-Activity-Timeline-Implementation.md` - Update with live DB findings
2. New migration file - Use correct table/column names
3. Trigger functions - Reference actual live DB schema

---

## Summary

✅ **Verified:** reflections, enrollments, user_daily_notes, conversation_messages, profiles
⚠️ **Different:** quiz_attempts (different columns, no completed_at)
⚠️ **Renamed:** ai_interactions → video_ai_conversations
⚠️ **Renamed:** videos → media_files
🚨 **Already Exists:** community_activities table (similar to planned student_activity_timeline)
🎯 **New Discovery:** profiles.completed_goals array for goal history

**AWAIT USER DECISION before proceeding with implementation.**

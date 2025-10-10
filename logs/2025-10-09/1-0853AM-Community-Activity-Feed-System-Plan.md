# Community Activity Feed System - Implementation Plan

**Created:** October 9, 2025 - 08:53 AM EST

## Overview

Create a comprehensive activity tracking system that displays student learning activities in the community feed. This system will track various learning actions (notes, quizzes, goal progress, etc.) and display them chronologically for community engagement.

---

## Current Database State (Verified from database.types.ts)

### Existing Tables We'll Use:

1. **`reflections`** - Video notes and voice memos
   - `id`, `user_id`, `course_id`, `reflection_text`, `file_url` (voice memo), `reflection_type`, `created_at`

2. **`quiz_attempts`** - Quiz completions
   - `id`, `user_id`, `video_id`, `video_timestamp`, `score`, `percentage`, `created_at`

3. **`goal_conversations`** - Goal conversation threads
   - `id`, `student_id`, `goal_id`, `status`, `created_at`

4. **`conversation_messages`** - Messages within goal conversations
   - `id`, `conversation_id`, `sender_id`, `content`, `created_at`

5. **`conversation_attachments`** - Files attached to messages (revenue proofs)
   - `id`, `message_id`, `filename`, `storage_path`, `mime_type`, `created_at`

### Tables That Don't Exist:
- ❌ `ai_interactions` - Not implemented yet (video questions/AI chat)
- ❌ Revenue submissions table - Uses `conversation_attachments` instead

---

## New Tables to Create

### 1. `community_activities` Table

**Purpose:** Centralized activity feed that links to source tables

**Columns:**
```sql
- id (UUID, PK)
- user_id (UUID, FK → profiles)
- activity_type (TEXT)
  Values: 'ai_chat', 'video_note', 'voice_memo', 'quiz', 'goal_message', 'revenue_proof', 'goal_achieved'

-- Foreign keys to source tables (nullable, only one will be set)
- ai_conversation_id (UUID, FK → video_ai_conversations)
- reflection_id (UUID, FK → reflections)
- quiz_attempt_id (UUID, FK → quiz_attempts)
- conversation_message_id (UUID, FK → conversation_messages)

-- Denormalized data for display performance
- video_id (UUID, FK → videos, nullable)
- video_timestamp (DECIMAL, nullable)
- goal_id (UUID, FK → track_goals, nullable)
- preview_text (TEXT) -- First 200 chars for feed preview
- metadata (JSONB) -- Flexible data storage

-- Visibility
- is_public (BOOLEAN, default true)

-- Timestamps
- created_at (TIMESTAMPTZ, default NOW())
```

**Indexes:**
- `user_id`, `activity_type`, `created_at DESC`, `is_public`, `video_id`, `goal_id`

**RLS Policies:**
- Users can view public activities
- Users can view their own activities (public + private)
- Users can create/update/delete their own activities

---

### 2. `private_notes` Table

**Purpose:** Student's personal notes with one-click sharing to goal conversations

**Columns:**
```sql
- id (UUID, PK)
- user_id (UUID, FK → profiles)
- title (TEXT, nullable)
- content (TEXT, NOT NULL)
- tags (TEXT[], nullable)

-- Context (optional)
- goal_id (UUID, FK → track_goals, nullable)
- media_file_id (UUID, FK → media_files, nullable)

-- Sharing tracking
- shared_to_conversation_id (UUID, FK → goal_conversations, nullable)
- shared_at (TIMESTAMPTZ, nullable)

-- Timestamps
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**Indexes:**
- `user_id`, `goal_id`, `shared_to_conversation_id`, `created_at DESC`

**RLS Policies:**
- Users can view their own private notes
- Users can create/update/delete their own notes
- No instructor access to private_notes table (they see via conversation_messages)

---

### 3. `video_ai_conversations` Table

**Purpose:** Store AI chat conversations where students ask questions about video content

**Columns:**
```sql
- id (UUID, PK)
- user_id (UUID, FK → profiles)
- media_file_id (UUID, FK → media_files, nullable)
- video_timestamp (DECIMAL, nullable) -- Timestamp context for question
- conversation_context (TEXT, nullable) -- Transcript excerpt sent to AI
- user_message (TEXT, NOT NULL) -- Student's question
- ai_response (TEXT, NOT NULL) -- AI's answer
- model_used (TEXT) -- e.g., 'gpt-4', 'claude-3'
- metadata (JSONB) -- Tokens, confidence, etc.
- created_at (TIMESTAMPTZ)
```

**Indexes:**
- `user_id`, `media_file_id`, `created_at DESC`

**RLS Policies:**
- Users can view their own AI conversations
- Users can create their own AI conversations
- Instructors cannot view (private learning assistant)

---

### 4. `instructor_video_checkpoints` Table

**Purpose:** Instructors can place quizzes/reflection prompts at specific video timestamps

**Columns:**
```sql
- id (UUID, PK)
- created_by (UUID, FK → profiles) -- Instructor who created it
- media_file_id (UUID, FK → media_files)
- prompt_type (TEXT) -- 'quiz', 'reflection', 'voice_memo'
- timestamp_seconds (DECIMAL) -- When video should pause and show prompt
- title (TEXT)
- instructions (TEXT, nullable)

-- For quiz prompts
- quiz_questions (JSONB, nullable) -- Pre-written questions array
  Format: [{ question: "", options: [], correctAnswer: "" }]
- passing_score (INTEGER, nullable) -- e.g., 70

-- For reflection prompts
- reflection_prompt (TEXT, nullable)
- requires_video (BOOLEAN, default false) -- Must submit Loom video?
- requires_audio (BOOLEAN, default false) -- Must submit voice memo?

-- Settings
- is_required (BOOLEAN, default false) -- Block video progress until completed?
- is_active (BOOLEAN, default true)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**Indexes:**
- `media_file_id`, `timestamp_seconds`, `is_active`, `created_by`

**RLS Policies:**
- Instructors can create/update/delete their own prompts
- All users can view active prompts for videos they have access to

**How It Works:**
1. Instructor edits video → Clicks timeline at 5:30 → "Add Quiz/Reflection"
2. Video player monitors timestamps → At 5:30, pauses and shows modal
3. Student completes prompt → Saves to `quiz_attempts` or `reflections` with `instructor_prompt_id`
4. Activity tracked in `community_activities`

---

### 5. Update Existing Tables for Prompt Tracking

**Add to `quiz_attempts`:**
```sql
ALTER TABLE quiz_attempts
ADD COLUMN checkpoint_id UUID REFERENCES instructor_video_checkpoints(id) ON DELETE SET NULL;
```

**Add to `reflections`:**
```sql
ALTER TABLE reflections
ADD COLUMN checkpoint_id UUID REFERENCES instructor_video_checkpoints(id) ON DELETE SET NULL;
```

**Purpose:** Links student responses back to instructor's checkpoint

---

### 6. Update `conversation_messages` Table

**Purpose:** Support shared notes as a message type in goal conversations

**Current Structure (Already Has):**
- `message_type` (TEXT) ✅ Already exists
- `content`, `conversation_id`, `sender_id`, `metadata`, etc.

**New Column to Add:**
```sql
-- Add to existing conversation_messages table
ALTER TABLE conversation_messages
ADD COLUMN shared_note_id UUID REFERENCES private_notes(id) ON DELETE SET NULL;
```

**Usage:**
- When note is shared, create message with:
  - `message_type = 'shared_note'` (use existing column)
  - `shared_note_id = [note ID]` (new column)
  - `content = [copy of note content]` (snapshot for display)

**Display Logic:**
- `message_type = 'text'` → Render as normal message
- `message_type = 'shared_note'` → Render with special note card UI
- Can JOIN to `private_notes` via `shared_note_id` for full note data

---

## Activity Types Mapping

| Activity Type | Source Table | Display Format |
|--------------|--------------|----------------|
| `ai_chat` | `video_ai_conversations` | "Asked AI at 2:20 of [Video Title]" |
| `video_note` | `reflections` | "Took notes at 3:45 of [Video Title]" |
| `voice_memo` | `reflections` (with file_url) | "Voice memo submitted at 4:30 of [Video Title]" |
| `quiz` | `quiz_attempts` | "AI Quiz taken at 3:30 of [Video Title] - Score: 85%" |
| `goal_message` | `conversation_messages` | "Daily progress submitted in private mentorship" |
| `revenue_proof` | `conversation_attachments` | "Revenue proof submitted for approval" |
| `goal_achieved` | `goal_conversations` (status change) | "Goal achieved and ready for review" |
| `private_note` | `private_notes` | "Took notes privately" (only visible to user unless shared) |

---

## Implementation Steps

### Phase 1: Database Migration
1. Create migration `131_community_activity_feed_system.sql`
2. Create both tables with full RLS policies
3. Add updated_at triggers
4. Test RLS policies

### Phase 2: Server Actions
1. Create `community-activity-actions.ts`:
   - `createCommunityActivity()`
   - `getCommunityActivities()` - Public feed
   - `getUserActivities()` - User's own activities
   - `deleteCommunityActivity()`

2. Create `private-notes-actions.ts`:
   - `createPrivateNote()`
   - `getPrivateNotes()`
   - `shareNoteToConversation()` - One-click share to today's goal conversation
   - `deletePrivateNote()`

### Phase 3: Auto-Tracking Integration
Add activity tracking to existing actions:

**`reflection-actions.ts`:**
```typescript
// After creating reflection
await createCommunityActivity({
  activity_type: fileUrl ? 'voice_memo' : 'video_note',
  reflection_id: newReflection.id,
  video_id: videoId,
  video_timestamp: timestamp,
  preview_text: reflectionText.substring(0, 200)
})
```

**`quiz-actions.ts`:**
```typescript
// After quiz completion
await createCommunityActivity({
  activity_type: 'quiz',
  quiz_attempt_id: quizAttempt.id,
  video_id: videoId,
  video_timestamp: timestamp,
  preview_text: `Score: ${score}/${totalQuestions}`
})
```

**`goal-conversation-actions.ts`:**
```typescript
// After sending message
await createCommunityActivity({
  activity_type: 'goal_message',
  conversation_message_id: messageId,
  goal_id: goalId,
  preview_text: message.substring(0, 200)
})

// When attachment is revenue proof
if (isRevenueProof) {
  await createCommunityActivity({
    activity_type: 'revenue_proof',
    conversation_message_id: messageId,
    goal_id: goalId,
    preview_text: 'Revenue proof submitted'
  })
}

// When goal status changes to 'completed'
if (newStatus === 'completed') {
  await createCommunityActivity({
    activity_type: 'goal_achieved',
    goal_id: goalId,
    preview_text: 'Goal achieved!'
  })
}
```

### Phase 4: UI Components
1. Update `CommunityHeader.tsx` to show activities in community tab
2. Create `CommunityActivityFeed.tsx` component with activity cards
3. Create `PrivateNotesPanel.tsx` for student dashboard
4. Add "Share with Instructor" button (one-click, irreversible)
5. Update goal conversation UI to render `message_type: 'shared_note'` messages

### Phase 5: Display Format
Each activity type renders with:
- User avatar + name
- Activity icon (note, quiz, message, etc.)
- Timestamp ("2 hours ago")
- Action description
- Preview text/image
- Link to source (video page, goal conversation, etc.)

---

## Data Flow Examples

### Example 1: Student Takes Video Note
```
1. Student writes note in video sidebar → reflection-actions.ts
2. Reflection saved to `reflections` table
3. Auto-create activity → community_activities table
4. Activity appears in community feed immediately
5. Clicking activity → navigates to video at timestamp
```

### Example 2: Student Shares Private Note
```
1. Student writes private note → private_notes table
2. Student clicks "Share with Instructor" button
3. System finds student's active goal_conversation for today
4. Auto-creates conversation_message with:
   - message_type: 'shared_note'
   - shared_note_id: [note ID]
   - content: [copy of note content]
   - conversation_id: [today's conversation]
5. Note appears in today's goal conversation thread
6. private_notes updated: shared_to_conversation_id, shared_at
7. Button changes to "Shared" (disabled, cannot unshare)
8. Instructor sees note inline in conversation
```

### Example 3: Revenue Proof Submission
```
1. Student uploads image in goal conversation
2. Attachment saved → conversation_attachments
3. Message saved → conversation_messages
4. Auto-create activity → community_activities (activity_type: 'revenue_proof')
5. Appears in student's activity timeline
6. Instructor sees in review queue + community feed
```

---

## Notes

- **Quiz Storage:** The `quiz_attempts` table already stores full quiz data (`questions` and `user_answers` as JSONB), so students can review past attempts. This is working correctly.

- **Instructor-Created Prompts:** New `instructor_video_prompts` table allows instructors to pre-place quizzes/reflections at specific video timestamps. Student responses link back via `instructor_prompt_id`.

- **Performance:** Activity feed uses `created_at DESC` index for fast chronological queries. Denormalized data (video_id, goal_id) avoids complex JOINs.

- **Privacy:** Private notes NEVER appear in public community feed. When shared, they appear ONLY in the specific goal conversation (visible to student + instructor).

- **Scalability:** JSONB metadata field allows adding new activity-specific data without schema changes.

---

## Success Criteria

✅ Students see their learning activities in chronological timeline
✅ Community feed shows public activities from all users
✅ Private notes system with instructor sharing works
✅ Activity tracking is automatic (no manual API calls needed)
✅ Performance: Feed loads in <500ms with proper indexing
✅ RLS ensures proper visibility control

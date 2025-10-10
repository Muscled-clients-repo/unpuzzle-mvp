# Testing Guide - Community Activity System

**Created:** October 9, 2025 - 1:00 PM EST

## Overview

This guide covers how to test the 4 new database tables and their server actions.

---

## Prerequisites

✅ All 4 migrations applied successfully:
- 131_video_ai_conversations.sql
- 132_private_notes_system.sql
- 133_instructor_video_checkpoints.sql
- 134_community_activities_timeline.sql

✅ Server actions created:
- video-ai-conversations-actions.ts
- private-notes-actions.ts
- instructor-checkpoints-actions.ts
- community-activity-actions.ts (already exists)

---

## Test 1: Video AI Conversations

### Setup
1. Navigate to any video page
2. Open browser console

### Test Case 1.1: Create AI Conversation
```typescript
// In browser console or test API route
const result = await fetch('/api/test-ai-chat', {
  method: 'POST',
  body: JSON.stringify({
    media_file_id: 'your-video-id',
    video_timestamp: 125.5,
    conversation_context: 'Transcript from 2:00 to 2:15...',
    user_message: 'What is useState?',
    ai_response: 'useState is a React Hook that lets you add state to functional components...',
    model_used: 'gpt-4'
  })
})
```

**Expected Output:**
```json
{
  "success": true,
  "conversation": {
    "id": "uuid",
    "user_id": "user-uuid",
    "media_file_id": "video-id",
    "parent_message_id": null,
    "video_timestamp": 125.5,
    "user_message": "What is useState?",
    "ai_response": "useState is a React Hook...",
    "created_at": "timestamp"
  }
}
```

### Test Case 1.2: Create Follow-up Question
```typescript
const result = await fetch('/api/test-ai-chat', {
  method: 'POST',
  body: JSON.stringify({
    media_file_id: 'your-video-id',
    parent_message_id: 'previous-conversation-id', // From 1.1
    video_timestamp: 125.5,
    user_message: 'Can I use multiple useState calls?',
    ai_response: 'Yes, you can use multiple useState calls...'
  })
})
```

**Expected Output:**
```json
{
  "success": true,
  "conversation": {
    "id": "new-uuid",
    "parent_message_id": "previous-conversation-id", // Links to parent
    "user_message": "Can I use multiple useState calls?",
    ...
  }
}
```

### Test Case 1.3: Get Video Conversations
```typescript
const result = await fetch('/api/video-ai-conversations?media_file_id=video-id')
```

**Expected Output:**
```json
{
  "conversations": [
    {
      "id": "uuid-1",
      "parent_message_id": null,
      "user_message": "What is useState?",
      "created_at": "2025-10-09T10:00:00Z"
    },
    {
      "id": "uuid-2",
      "parent_message_id": "uuid-1", // Follow-up
      "user_message": "Can I use multiple useState calls?",
      "created_at": "2025-10-09T10:01:00Z"
    }
  ]
}
```

### Verify in Database
```sql
SELECT * FROM video_ai_conversations
WHERE media_file_id = 'your-video-id'
ORDER BY created_at;
```

**Expected:**
- 2 rows (parent + follow-up)
- Second row has `parent_message_id` pointing to first row
- Both have same `media_file_id`

---

## Test 2: Private Notes

### Test Case 2.1: Create Private Note
```typescript
const result = await fetch('/api/private-notes', {
  method: 'POST',
  body: JSON.stringify({
    title: 'My React Notes',
    content: 'useState allows functional components to have state...',
    media_file_id: 'video-id',
    tags: ['react', 'hooks']
  })
})
```

**Expected Output:**
```json
{
  "success": true,
  "note": {
    "id": "note-uuid",
    "user_id": "user-uuid",
    "title": "My React Notes",
    "content": "useState allows...",
    "media_file_id": "video-id",
    "tags": ["react", "hooks"],
    "is_shared_with_instructor": false,
    "shared_at": null,
    "shared_to_conversation_id": null
  }
}
```

### Test Case 2.2: Get Private Notes
```typescript
const result = await fetch('/api/private-notes?media_file_id=video-id')
```

**Expected Output:**
```json
{
  "notes": [
    {
      "id": "note-uuid",
      "title": "My React Notes",
      "content": "useState allows...",
      "is_shared_with_instructor": false,
      "media_files": {
        "id": "video-id",
        "title": "React Hooks Tutorial"
      }
    }
  ]
}
```

### Test Case 2.3: Share Note to Instructor
**Prerequisites:**
- Student must have an active goal conversation
- Note must not already be shared

```typescript
const result = await fetch('/api/private-notes/share', {
  method: 'POST',
  body: JSON.stringify({
    noteId: 'note-uuid'
  })
})
```

**Expected Output:**
```json
{
  "success": true,
  "conversationId": "goal-conversation-uuid",
  "message": {
    "id": "message-uuid",
    "conversation_id": "goal-conversation-uuid",
    "message_type": "shared_note",
    "shared_note_id": "note-uuid",
    "content": "useState allows..." // Copy of note content
  }
}
```

### Verify in Database
```sql
-- Check note is marked as shared
SELECT id, is_shared_with_instructor, shared_at, shared_to_conversation_id
FROM private_notes
WHERE id = 'note-uuid';

-- Check conversation message was created
SELECT id, message_type, shared_note_id, content
FROM conversation_messages
WHERE shared_note_id = 'note-uuid';
```

**Expected:**
- `private_notes`: `is_shared_with_instructor = true`, `shared_at` has timestamp
- `conversation_messages`: New row with `message_type = 'shared_note'`

### Test Case 2.4: Try to Share Again (Should Fail)
```typescript
const result = await fetch('/api/private-notes/share', {
  method: 'POST',
  body: JSON.stringify({
    noteId: 'note-uuid' // Same note
  })
})
```

**Expected Output:**
```json
{
  "error": "Note already shared"
}
```

---

## Test 3: Instructor Checkpoints

### Test Case 3.1: Create Quiz Checkpoint (Instructor Only)
**Login as instructor account**

```typescript
const result = await fetch('/api/instructor-checkpoints', {
  method: 'POST',
  body: JSON.stringify({
    media_file_id: 'video-id',
    prompt_type: 'quiz',
    timestamp_seconds: 330, // 5:30
    title: 'useState Quiz',
    instructions: 'Answer these questions about useState',
    quiz_questions: [
      {
        question: 'What does useState return?',
        options: ['An array', 'An object', 'A string', 'A function'],
        correctAnswer: 'An array'
      }
    ],
    passing_score: 70,
    is_required: true
  })
})
```

**Expected Output:**
```json
{
  "success": true,
  "checkpoint": {
    "id": "checkpoint-uuid",
    "created_by": "instructor-uuid",
    "media_file_id": "video-id",
    "prompt_type": "quiz",
    "timestamp_seconds": 330,
    "title": "useState Quiz",
    "quiz_questions": [...],
    "passing_score": 70,
    "is_required": true,
    "is_active": true
  }
}
```

### Test Case 3.2: Get Video Checkpoints
```typescript
const result = await fetch('/api/instructor-checkpoints?media_file_id=video-id')
```

**Expected Output:**
```json
{
  "checkpoints": [
    {
      "id": "checkpoint-uuid",
      "timestamp_seconds": 330,
      "title": "useState Quiz",
      "is_active": true,
      "creator": {
        "id": "instructor-uuid",
        "full_name": "John Instructor"
      }
    }
  ]
}
```

### Test Case 3.3: Student Completes Quiz
**Switch to student account**

```typescript
// Create quiz attempt linked to checkpoint
const result = await fetch('/api/quiz-attempts', {
  method: 'POST',
  body: JSON.stringify({
    video_id: 'video-id',
    checkpoint_id: 'checkpoint-uuid', // Link to checkpoint
    questions: [...],
    user_answers: [...],
    score: 1,
    percentage: 100
  })
})
```

**Expected Output:**
```json
{
  "success": true,
  "quizAttempt": {
    "id": "attempt-uuid",
    "video_id": "video-id",
    "checkpoint_id": "checkpoint-uuid",
    "score": 1,
    "percentage": 100
  }
}
```

### Verify in Database
```sql
-- Check quiz attempt is linked to checkpoint
SELECT id, checkpoint_id, score, percentage
FROM quiz_attempts
WHERE checkpoint_id = 'checkpoint-uuid';
```

**Expected:**
- Row exists with `checkpoint_id` set

### Test Case 3.4: Checkpoint Completion Stats (Instructor)
```typescript
const result = await fetch('/api/instructor-checkpoints/stats?id=checkpoint-uuid')
```

**Expected Output:**
```json
{
  "success": true,
  "stats": {
    "totalCompletions": 1,
    "uniqueUsers": 1,
    "completionData": [
      {
        "user_id": "student-uuid",
        "score": 1,
        "percentage": 100
      }
    ]
  }
}
```

---

## Test 4: Community Activities

### Test Case 4.1: Create Activity from AI Chat
```typescript
const result = await fetch('/api/community-activities', {
  method: 'POST',
  body: JSON.stringify({
    activity_type: 'ai_chat',
    ai_conversation_id: 'conversation-uuid', // From Test 1
    media_file_id: 'video-id',
    video_title: 'React Hooks Tutorial',
    timestamp_seconds: 125.5,
    content: 'What is useState?', // Preview
    is_public: true
  })
})
```

**Expected Output:**
```json
{
  "success": true,
  "activity": {
    "id": "activity-uuid",
    "user_id": "user-uuid",
    "activity_type": "ai_chat",
    "ai_conversation_id": "conversation-uuid",
    "media_file_id": "video-id",
    "video_title": "React Hooks Tutorial",
    "content": "What is useState?",
    "is_public": true
  }
}
```

### Test Case 4.2: Get Public Community Activities
```typescript
const result = await fetch('/api/community-activities')
```

**Expected Output:**
```json
{
  "activities": [
    {
      "id": "activity-uuid",
      "activity_type": "ai_chat",
      "content": "What is useState?",
      "is_public": true,
      "profiles": {
        "id": "user-uuid",
        "full_name": "John Student",
        "avatar_url": "..."
      },
      "created_at": "timestamp"
    }
  ]
}
```

### Test Case 4.3: Get User's Activities (Private + Public)
```typescript
const result = await fetch('/api/community-activities/me')
```

**Expected Output:**
```json
{
  "activities": [
    {
      "id": "activity-1",
      "activity_type": "ai_chat",
      "is_public": true,
      ...
    },
    {
      "id": "activity-2",
      "activity_type": "video_note",
      "is_public": false, // Private note activity
      ...
    }
  ]
}
```

### Verify RLS Policies

**Test Public Access:**
```sql
-- As any user, should only see public activities
SELECT * FROM community_activities WHERE is_public = true;
-- ✅ Should work

-- Should NOT see others' private activities
SELECT * FROM community_activities WHERE is_public = false AND user_id != auth.uid();
-- ❌ Should return empty
```

**Test User Access:**
```sql
-- User should see ALL their own activities (public + private)
SELECT * FROM community_activities WHERE user_id = auth.uid();
-- ✅ Should return all user's activities
```

---

## Test 5: End-to-End Flow

### Complete Student Journey
1. **Student watches video**
2. **Selects in/out points (2:00-2:30)**
3. **Asks AI question**
   - Creates `video_ai_conversations` row
   - Auto-creates `community_activities` row
4. **Takes private note**
   - Creates `private_notes` row
5. **Shares note with instructor**
   - Updates `private_notes` (is_shared = true)
   - Creates `conversation_messages` row
6. **Hits checkpoint at 5:30**
   - Video pauses
   - Shows quiz modal
7. **Completes quiz**
   - Creates `quiz_attempts` row with checkpoint_id
   - Auto-creates `community_activities` row
8. **Views community feed**
   - Sees their AI chat activity
   - Sees their quiz completion
   - Sees other students' public activities

### Expected Database State
```sql
-- 1 AI conversation
SELECT COUNT(*) FROM video_ai_conversations WHERE user_id = 'student-uuid';
-- Result: 1

-- 1 private note (shared)
SELECT COUNT(*) FROM private_notes WHERE user_id = 'student-uuid' AND is_shared_with_instructor = true;
-- Result: 1

-- 1 conversation message (shared note)
SELECT COUNT(*) FROM conversation_messages WHERE message_type = 'shared_note';
-- Result: 1

-- 1 quiz attempt (linked to checkpoint)
SELECT COUNT(*) FROM quiz_attempts WHERE checkpoint_id IS NOT NULL;
-- Result: 1

-- 2 community activities (AI chat + quiz)
SELECT COUNT(*) FROM community_activities WHERE user_id = 'student-uuid';
-- Result: 2
```

---

## Test 6: Error Cases

### Test 6.1: Unauthorized Access
```typescript
// Try to create checkpoint as student
const result = await fetch('/api/instructor-checkpoints', {
  method: 'POST',
  body: JSON.stringify({
    media_file_id: 'video-id',
    prompt_type: 'quiz',
    ...
  })
})
```

**Expected Output:**
```json
{
  "error": "Only instructors can create checkpoints"
}
```

### Test 6.2: Missing Required Fields
```typescript
const result = await fetch('/api/video-ai-conversations', {
  method: 'POST',
  body: JSON.stringify({
    media_file_id: 'video-id',
    user_message: 'Question', // Missing ai_response
  })
})
```

**Expected Output:**
```json
{
  "error": "Failed to create conversation"
}
```

### Test 6.3: Delete Other User's Data
```typescript
// User A tries to delete User B's note
const result = await fetch('/api/private-notes/delete', {
  method: 'DELETE',
  body: JSON.stringify({
    noteId: 'user-b-note-id'
  })
})
```

**Expected Output:**
```json
{
  "error": "Failed to delete note" // RLS blocks this
}
```

---

## Quick Test Checklist

### ✅ Database Tables Created
- [ ] video_ai_conversations exists
- [ ] private_notes exists
- [ ] instructor_video_checkpoints exists
- [ ] community_activities exists

### ✅ Columns Added to Existing Tables
- [ ] conversation_messages.shared_note_id exists
- [ ] quiz_attempts.checkpoint_id exists
- [ ] reflections.checkpoint_id exists
- [ ] private_notes.shared_to_conversation_id exists

### ✅ RLS Policies Working
- [ ] Students can't see others' private activities
- [ ] Students can't create instructor checkpoints
- [ ] Instructors can't see private notes (unless shared)
- [ ] Public activities visible to all

### ✅ Server Actions Working
- [ ] createAIConversation returns conversation
- [ ] createPrivateNote returns note
- [ ] shareNoteToConversation creates message
- [ ] createCheckpoint (instructor only) returns checkpoint
- [ ] createCommunityActivity returns activity

### ✅ Data Relationships
- [ ] AI conversation with parent_message_id links correctly
- [ ] Private note shared_to_conversation_id links correctly
- [ ] Quiz attempt checkpoint_id links correctly
- [ ] Community activity foreign keys link correctly

---

## Tools for Testing

### Option 1: API Routes (Recommended)
Create test API routes:
```typescript
// app/api/test-ai-chat/route.ts
import { createAIConversation } from '@/app/actions/video-ai-conversations-actions'

export async function POST(req: Request) {
  const body = await req.json()
  const result = await createAIConversation(body)
  return Response.json(result)
}
```

### Option 2: Browser Console
```typescript
// In video page
const testAI = async () => {
  const { createAIConversation } = await import('@/app/actions/video-ai-conversations-actions')
  const result = await createAIConversation({ /* data */ })
  console.log(result)
}
testAI()
```

### Option 3: Direct Database Query
```sql
-- In Supabase SQL Editor
INSERT INTO video_ai_conversations (user_id, media_file_id, user_message, ai_response)
VALUES (auth.uid(), 'video-id', 'Test question', 'Test answer');

SELECT * FROM video_ai_conversations WHERE user_id = auth.uid();
```

---

## Success Criteria

✅ **All tests pass with expected outputs**
✅ **No errors in browser console**
✅ **Database tables have correct data**
✅ **RLS policies prevent unauthorized access**
✅ **Foreign key relationships work correctly**
✅ **Real-time subscriptions update UI (once UI is built)**

---

## Next Steps After Testing

1. If all tests pass → Proceed with UI implementation
2. If tests fail → Debug and fix server actions/migrations
3. Document any edge cases discovered
4. Add automated tests (Playwright/Jest)

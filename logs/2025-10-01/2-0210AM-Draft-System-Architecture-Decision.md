# Draft System Architecture Decision: Unified vs Feature-Specific

## Date: 2025-10-01 02:10AM EST

## Question
Should we use a single `drafts` table for all draft types (bug reports, feature requests, student goal entries, instructor responses) or feature-specific draft tables?

## Scope
**Current Draft Types (Only These 4):**
1. `bug_report` - Bug report modal (keep in `drafts` table)
2. `feature_request` - Feature request modal (keep in `drafts` table)
3. Student goal progress entry - Daily notes on goals page
4. Instructor feedback - Instructor responses on goals page

**NOT in scope:** Activity logs, milestones, video comments, forum posts (future considerations only)

## Current State Analysis

### Existing Tables

#### 1. `drafts` Table (General Purpose)
```sql
CREATE TABLE drafts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  type TEXT CHECK (type IN ('bug_report', 'feature_request', 'daily_note', 'instructor_response')),
  title TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Purpose:** Generic auto-save for modals/forms across app
**Current Users:** Bug reports, feature requests, goal messages

#### 2. `conversation_messages` Table (Domain-Specific)
```sql
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES goal_conversations,
  sender_id UUID REFERENCES auth.users,
  message_type TEXT CHECK (message_type IN ('daily_note', 'instructor_response', 'activity', 'milestone')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  target_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Purpose:** Persistent student-instructor communication
**Features:** Threading, attachments, chronological ordering, conversation context

## Architecture Analysis

### Option 1: Keep Using `drafts` Table (Current Approach)

#### How It Works
```
User types in goals page
  ↓
Auto-save to drafts table with type='daily_note'
  ↓
On send, create conversation_message
  ↓
Delete draft
```

#### Pros
✅ **Simple implementation** - One table handles all drafts
✅ **Easy querying** - `SELECT * FROM drafts WHERE user_id = ? AND type = 'daily_note'`
✅ **Consistent pattern** - Same logic for all features
✅ **Lightweight schema** - No additional tables needed
✅ **Cross-feature drafts** - User can have drafts for multiple features

#### Cons
❌ **Schema bloat** - CHECK constraint grows with every new feature
❌ **Lost domain context** - No conversation_id linkage
❌ **Metadata overload** - JSONB becomes dumping ground
❌ **No referential integrity** - Can't enforce foreign keys to conversations
❌ **Migration headaches** - Must update CHECK constraint for new types

### Option 2: Feature-Specific Draft Fields (Domain-Driven)

#### How It Works
```sql
ALTER TABLE conversation_messages
ADD COLUMN is_draft BOOLEAN DEFAULT FALSE;

-- Draft messages are just messages not yet sent
```

#### Pros
✅ **Domain integrity** - Drafts live in same table as final messages
✅ **Full context preserved** - conversation_id, target_date, all relationships intact
✅ **No type explosions** - No CHECK constraint updates needed
✅ **Referential integrity** - Proper foreign keys maintained
✅ **Query simplicity** - `WHERE conversation_id = ? AND is_draft = true`
✅ **Seamless transition** - Flip `is_draft` to `false` on send

#### Cons
❌ **Feature-specific implementation** - Each feature needs own draft strategy
❌ **Inconsistent patterns** - Goals use one approach, videos might use another
❌ **More complex queries** - Must filter drafts from regular messages
❌ **Schema modifications** - Need to add draft support per table

### Option 3: Hybrid Approach (Recommended)

**Use `drafts` table for:**
- ✅ Bug report modal
- ✅ Feature request modal

**Use domain tables for:**
- ✅ Student goal entries (goals page) → `conversation_messages.is_draft`
- ✅ Instructor responses (goals page) → `conversation_messages.is_draft`

## Recommendation: Hybrid Approach

### For Goals Page (Conversation Messages)

**Use domain table approach:**

```sql
-- Migration: Add draft support to conversation_messages
ALTER TABLE conversation_messages
ADD COLUMN is_draft BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_conversation_messages_drafts
ON conversation_messages(conversation_id, is_draft)
WHERE is_draft = TRUE;
```

**Benefits for Goals:**
1. **Preserve conversation context** - Draft knows which conversation it belongs to
2. **Target date intact** - Draft knows which day it's for
3. **File attachments work** - Can attach files to draft messages
4. **Threading preserved** - Can draft replies to specific messages
5. **Easy to send** - Just `UPDATE SET is_draft = false`

### Keep `drafts` Table For

**Only these modal forms:**
- Bug report modal
- Feature request modal

**That's it. No other use cases for now.**

## Implementation Strategy

### Step 1: Migrate Goals to Domain Drafts

```sql
-- 1. Add is_draft column to conversation_messages
ALTER TABLE conversation_messages
ADD COLUMN is_draft BOOLEAN DEFAULT FALSE;

-- 2. Create index for draft queries
CREATE INDEX idx_conversation_messages_drafts
ON conversation_messages(conversation_id, is_draft)
WHERE is_draft = TRUE;
```

### Step 2: Update Application Code

**Server Action:**
```typescript
// Create draft message (is_draft = true)
export async function createDraftMessage(data: MessageData) {
  return await supabase
    .from('conversation_messages')
    .insert({ ...data, is_draft: true })
}

// Publish draft (is_draft = false)
export async function publishDraft(draftId: string) {
  return await supabase
    .from('conversation_messages')
    .update({ is_draft: false })
    .eq('id', draftId)
}
```

**TanStack Query:**
```typescript
// Query for drafts
const { data: drafts } = useQuery({
  queryKey: ['conversation-drafts', conversationId],
  queryFn: () => getConversationDrafts(conversationId)
})

// Separate from regular messages
const { data: messages } = useQuery({
  queryKey: ['conversation-messages', conversationId],
  queryFn: () => getConversationMessages(conversationId) // is_draft = false
})
```

**Auto-save Hook:**
```typescript
// Instead of saving to drafts table, save to conversation_messages
const performAutoSave = async () => {
  if (draftId) {
    // Update existing draft
    await updateDraftMessage(draftId, { content: messageText })
  } else {
    // Create new draft
    const result = await createDraftMessage({
      conversation_id: conversationId,
      message_type: 'daily_note',
      content: messageText,
      target_date: targetDate,
      is_draft: true
    })
    setDraftId(result.id)
  }
}
```

### Step 3: Clean Up `drafts` Table

```sql
-- Keep drafts table ONLY for bug_report and feature_request
-- Remove daily_note and instructor_response types
ALTER TABLE drafts DROP CONSTRAINT drafts_type_check;
ALTER TABLE drafts ADD CONSTRAINT drafts_type_check
CHECK (type IN ('bug_report', 'feature_request'));

-- Note: This migration (111) is now INVALID and should be reverted
-- We will NOT use drafts table for conversation messages
```

## Performance Comparison

### Current: `drafts` Table
```sql
-- Query draft
SELECT * FROM drafts
WHERE user_id = ? AND type = 'daily_note' AND metadata->>'targetDate' = ?
-- No conversation context, metadata parsing required
```

### Recommended: Domain Table
```sql
-- Query draft
SELECT * FROM conversation_messages
WHERE conversation_id = ? AND is_draft = true AND target_date = ?
-- Full context, proper indexes, type-safe
```

**Performance winner:** Domain table (indexed foreign keys vs JSONB parsing)

## Data Integrity Comparison

### Current: `drafts` Table
- ❌ No foreign key to conversation
- ❌ Metadata is unstructured JSONB
- ❌ No guarantee target_date is valid
- ❌ No referential integrity

### Recommended: Domain Table
- ✅ Foreign key to conversation enforced
- ✅ Structured columns (target_date as DATE)
- ✅ Database validates relationships
- ✅ Cascading deletes work properly

## Migration Path

### Phase 1: Add Domain Draft Support
1. Add `is_draft` to `conversation_messages`
2. Update server actions to support drafts
3. Update TanStack queries to fetch drafts separately

### Phase 2: Switch Auto-Save Logic
1. Update `InlineMessageComposer` to use domain drafts
2. Test auto-save → publish flow
3. Verify file attachments work with drafts

### Phase 3: Clean Up
1. Revert migration 111 (the one that added conversation types to drafts)
2. Keep `drafts` table ONLY for `bug_report` and `feature_request`
3. Update documentation

## Decision

**Adopt Hybrid Approach (Scoped to Current Needs):**
- ✅ Use `conversation_messages.is_draft` for student goal entries
- ✅ Use `conversation_messages.is_draft` for instructor responses
- ✅ Keep `drafts` table ONLY for bug reports and feature requests
- ❌ Do NOT add any other types to `drafts` table

**Rationale:**
1. Better data integrity through proper foreign keys
2. Faster queries with indexed columns vs JSONB
3. Cleaner schema without type explosion
4. Domain-driven design aligns with architecture
5. Each feature's drafts live with its data
6. **No scope creep** - only handle the 4 types we actually need

**Current Draft Types Summary:**
| Draft Type | Storage Location | Purpose |
|------------|------------------|---------|
| Bug report | `drafts` table | Modal form draft |
| Feature request | `drafts` table | Modal form draft |
| Student goal entry | `conversation_messages.is_draft` | Goals page student notes |
| Instructor response | `conversation_messages.is_draft` | Goals page instructor feedback |

---

**Status:** Ready to implement
**Priority:** High
**Estimated Time:** 2 hours for migration

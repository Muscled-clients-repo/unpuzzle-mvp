# Root Cause Analysis: Draft Auto-Save Not Working for Goals Page

## Date: 2025-10-01 02:06AM EST

## Issue Summary
Draft auto-save feature works perfectly for bug reports but completely fails for daily progress entries on the goals page. No data is being saved to the `drafts` table.

## Investigation Timeline

### Initial Hypothesis (WRONG)
- Thought it was a React hook dependency array issue
- Believed the problem was in component state management
- Attempted to fix by adjusting `useEffect` dependencies

### Actual Root Cause Discovery
Checked the database schema for the `drafts` table:

**File:** `supabase/migrations/067_create_drafts_table.sql` (Line 5)

```sql
type TEXT NOT NULL CHECK (type IN ('bug_report', 'feature_request')),
```

**THE PROBLEM:** The CHECK constraint only allows two draft types:
- ✅ `bug_report`
- ✅ `feature_request`

**THE MISSING TYPES:** Added in code but never in schema:
- ❌ `daily_note` (for student progress entries)
- ❌ `instructor_response` (for instructor feedback)

## Why This Happened

### Code Changes Made
1. Updated `src/lib/actions/draft-actions.ts` - Added new types to TypeScript interface
2. Updated `src/hooks/use-draft-websocket.ts` - Added queries for new types
3. Updated components to use new draft types

### Schema Changes NOT Made
- **Never created a migration** to update the database CHECK constraint
- Database silently rejected inserts with `daily_note` and `instructor_response` types
- No error surfaced to the UI because the server action catches and logs errors

## Why Bug Reports Work vs Goals Don't

| Feature | Draft Type | In Schema? | Result |
|---------|------------|------------|--------|
| Bug Report Modal | `bug_report` | ✅ Yes | Works perfectly |
| Feature Request Modal | `feature_request` | ✅ Yes | Works perfectly |
| Daily Progress Entry | `daily_note` | ❌ No | **Silently fails** |
| Instructor Response | `instructor_response` | ❌ No | **Silently fails** |

## Architecture Violation Identified

**From Architecture Doc (Pattern 001):**
> **Layer Responsibility Distribution**
> - TanStack Query: Owns server-related state
> - Server Actions: Handle all server-side mutations, database operations
> - **Schema changes must accompany code changes**

**What Went Wrong:**
- Changed application code layer (TypeScript types)
- Changed data layer (server actions)
- **FORGOT to change database schema layer**

This violates the completeness principle - when adding new data types, ALL layers must be updated:
1. ✅ Database schema (migrations)
2. ✅ Server actions (TypeScript)
3. ✅ Client queries (hooks)
4. ✅ Components (UI)

**We only did steps 2-4, skipped step 1.**

## Solution

### Immediate Fix Required
Create migration to update CHECK constraint:

```sql
-- Migration: Add draft types for goal conversations
ALTER TABLE drafts
DROP CONSTRAINT drafts_type_check;

ALTER TABLE drafts
ADD CONSTRAINT drafts_type_check
CHECK (type IN ('bug_report', 'feature_request', 'daily_note', 'instructor_response'));
```

### Verification Steps
1. Run migration
2. Test draft save by typing in goals page
3. Check `drafts` table in database
4. Verify draft restoration on page refresh

## Lessons Learned

### 1. Database Schema is Part of Type System
When adding new enum-like values, check for:
- TypeScript enums/unions
- Database CHECK constraints
- Database ENUM types
- Validation logic in server actions

### 2. Silent Failures are Dangerous
The server action caught the error but didn't surface it to the UI. Need better error handling:
- Log database constraint violations clearly
- Surface schema errors to developers in dev mode
- Add type validation before database insert

### 3. Checklist for New Draft Types
When adding new draft type:
- [ ] Update TypeScript interface in `draft-actions.ts`
- [ ] Update database CHECK constraint (migration)
- [ ] Add query hook in `use-draft-websocket.ts`
- [ ] Test actual database insert (not just TypeScript)
- [ ] Verify restoration on page reload

### 4. Migration Discipline
Every schema change needs a migration file:
- Don't just change code and assume it works
- Test database operations, not just UI
- Migrations are code, treat them as such

## Impact Assessment

### User Impact
- **High:** Students cannot save draft progress entries
- **High:** Instructors cannot save draft feedback
- **Low:** Bug reports and feature requests unaffected

### Developer Impact
- Lost 2+ hours debugging wrong layer (React/hooks)
- Should have checked database first when data not appearing

## Prevention Strategy

### Code Review Checklist Addition
When reviewing PRs that add new enum values:
- Check for database constraints
- Verify migration exists
- Test actual database operations

### Documentation Update
Update architecture document Pattern 001 to emphasize:
> **Critical:** When adding new enum/union types that map to database constraints, you MUST:
> 1. Create migration to update database constraint
> 2. Update TypeScript types
> 3. Test database insert, not just TypeScript compilation

## Files to Change

### 1. Create Migration
**File:** `supabase/migrations/[next-number]_add_conversation_draft_types.sql`

### 2. No Code Changes Needed
All application code is already correct - just waiting for schema to match.

---

**Status:** Ready to implement fix
**Priority:** High
**Estimated Time:** 5 minutes (create + run migration)

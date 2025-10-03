# Track Selection Fix Summary

## Problem Found
- Code expects `student_track_assignments` table but database has `user_track_assignments`
- Code tries to use columns that don't exist (assignment_type, confidence_score, etc.)
- `course_recommendations` table referenced in code but doesn't exist

## Solution

### Step 1: Run Migration (106_rename_user_to_student_track_assignments.sql)
This migration will:
- Rename `user_track_assignments` → `student_track_assignments`
- Rename column `user_id` → `student_id`
- Update indexes and RLS policies

Run with: `npx supabase migration up`

### Step 2: Update Code
Replace `/src/lib/actions/track-actions.ts` with the simplified version in `track-actions-updated.ts`

Key changes:
- Removed non-existent columns (assignment_type, confidence_score, etc.)
- Using `status='active'` instead of `is_active`
- Simplified function parameters
- Removed course_recommendations references (table doesn't exist)

### Step 3: What You'll Lose
Since we're simplifying to match existing columns, these features won't work:
- Primary vs Secondary track assignments (no assignment_type column)
- Confidence scores from questionnaire (no confidence_score column)
- Tracking if assignment came from questionnaire vs manual (no assignment_source)
- Assignment reasoning/explanation (no assignment_reasoning column)

### Step 4: Testing
After migration and code update:
1. Login as student (12@123.com)
2. Navigate to track selection
3. Select a track
4. Should create assignment with just: track_id, student_id, status='active'

## Alternative: Keep All Features
If you want to keep all the track selection features, instead run a different migration to ADD the missing columns:

```sql
ALTER TABLE student_track_assignments
ADD COLUMN assignment_type TEXT DEFAULT 'primary',
ADD COLUMN confidence_score INTEGER DEFAULT 100,
ADD COLUMN assignment_source TEXT DEFAULT 'manual',
ADD COLUMN assignment_reasoning TEXT,
ADD COLUMN progress_percentage INTEGER DEFAULT 0;

CREATE TABLE course_recommendations (
  -- structure from migration 021
);
```

Then the original code would work as-is.
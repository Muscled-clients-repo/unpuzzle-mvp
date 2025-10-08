# Student Earning Milestones Table Design

**Date:** October 7, 2025
**Time:** 4:10 PM EST
**Context:** Community integration planning - earnings tracking system

---

## Overview

The `student_earning_milestones` table tracks historical earnings updates for students as they progress through their goals. This complements the existing `profiles.goal_current_amount` column which only tracks the current goal's earnings.

---

## Problem with Current System

**Existing:** `profiles` table has:
- `goal_current_amount` - Only tracks CURRENT goal earnings
- `goal_target_amount` - Target for current goal
- `goal_progress` - Progress percentage

**Limitations:**
- No history when student completes goal and moves to next
- No proof/verification system
- Can't calculate lifetime earnings across multiple goals
- Can't show milestone progression ($500 → $1k → $3k)

---

## Solution: Milestones Table

Create a new table that logs EVERY earnings update while keeping `profiles.goal_current_amount` for current state.

---

## Table Schema: `student_earning_milestones`

### Core Identification

| Column | Type | Null | Description |
|--------|------|------|-------------|
| `id` | UUID | NO | Primary key |
| `student_id` | UUID | NO | FK → profiles(id), CASCADE DELETE |
| `goal_id` | UUID | NO | FK → track_goals(id), CASCADE DELETE |
| `created_at` | TIMESTAMPTZ | NO | When milestone was created |
| `updated_at` | TIMESTAMPTZ | NO | Last modification time |

### Earnings Data

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `amount` | DECIMAL(10,2) | NO | - | New earnings total for this goal |
| `previous_amount` | DECIMAL(10,2) | YES | 0.00 | What it was before this update |

**Example:**
- Student had $500, now reports $750
- `amount = 750.00`
- `previous_amount = 500.00`

### Milestone Classification

| Column | Type | Null | Constraint | Description |
|--------|------|------|------------|-------------|
| `milestone_type` | TEXT | NO | CHECK constraint | Why this milestone was created |

**Allowed values:**
- `manual_update` - Student clicked "Update Earnings" button
- `goal_completion` - Student hit target amount (e.g., $1k goal completed)
- `goal_transition` - Snapshot when transitioning to next goal
- `instructor_adjustment` - Instructor manually corrected the amount
- `system_adjustment` - Backend/migration automated change

### Proof System

| Column | Type | Null | Description |
|--------|------|------|-------------|
| `proof_urls` | TEXT[] | YES | Array of CDN URLs for screenshots |
| `proof_storage_paths` | TEXT[] | YES | Raw Backblaze/S3 storage paths |

**Example:**
```
proof_urls: ['https://cdn.unpuzzle.com/proof/abc123.jpg', 'https://cdn.unpuzzle.com/proof/def456.jpg']
proof_storage_paths: ['b2://unpuzzle-proofs/student-123/2025-10-07-abc123.jpg', '...']
```

### Verification System

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `is_verified` | BOOLEAN | NO | FALSE | Has instructor reviewed & approved? |
| `verified_by` | UUID | YES | NULL | FK → profiles(id), which instructor verified |
| `verified_at` | TIMESTAMPTZ | YES | NULL | When verification happened |
| `verification_notes` | TEXT | YES | NULL | Instructor comments on verification |

**Workflow:**
1. Student uploads proof → `is_verified = FALSE`
2. Instructor reviews → Sets `is_verified = TRUE`, `verified_by = instructor_id`, `verified_at = NOW()`
3. Leaderboard only shows verified earnings

### Context & Details

| Column | Type | Null | Description |
|--------|------|------|-------------|
| `notes` | TEXT | YES | Student's description of how they earned this |
| `source` | TEXT | YES | Platform/method (e.g., "Upwork", "Fiverr", "Direct Client", "SaaS Revenue") |
| `client_info` | JSONB | YES | Structured data: client name, project name, etc. |

**Example `client_info`:**
```json
{
  "client_name": "ACME Corp",
  "project_name": "E-commerce Shopify Store",
  "contract_value": 1500,
  "platform": "Upwork"
}
```

### Privacy & Moderation

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `is_public` | BOOLEAN | NO | TRUE | Show on public leaderboard? (student controls) |
| `flagged_for_review` | BOOLEAN | NO | FALSE | Instructor suspects issue (fraud, error, etc.) |
| `flag_reason` | TEXT | YES | NULL | Why instructor flagged this |

**Use cases:**
- Student privacy: Set `is_public = FALSE` to hide from leaderboard
- Instructor moderation: Flag suspicious earnings without deleting

---

## Database Indexes

```sql
-- Fast lookups by student (most common query)
CREATE INDEX idx_student_earning_milestones_student
ON student_earning_milestones(student_id);

-- Fast lookups by goal
CREATE INDEX idx_student_earning_milestones_goal
ON student_earning_milestones(goal_id);

-- Recent milestones first (activity feed)
CREATE INDEX idx_student_earning_milestones_created
ON student_earning_milestones(created_at DESC);

-- Instructor dashboard: pending verifications
CREATE INDEX idx_student_earning_milestones_unverified
ON student_earning_milestones(is_verified)
WHERE is_verified = FALSE;

-- Instructor dashboard: flagged earnings
CREATE INDEX idx_student_earning_milestones_flagged
ON student_earning_milestones(flagged_for_review)
WHERE flagged_for_review = TRUE;
```

---

## Required Changes to `profiles` Table

Add these columns to support lifetime earnings:

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `lifetime_earnings` | DECIMAL(10,2) | NO | 0.00 | Sum of all completed goals (cached) |
| `last_earnings_update` | TIMESTAMPTZ | YES | NULL | When student last updated earnings |

**Why cached?**
- Leaderboard queries would be slow if summing all milestones every time
- Update `lifetime_earnings` when student completes a goal
- Use triggers to keep it in sync

---

## Data Flow Examples

### Example 1: Student Updates Earnings

**Initial state:**
- `profiles.goal_current_amount = 500.00`
- `profiles.current_goal_id = "agency-1k"`

**Student action:**
- Reports new earnings: $750
- Uploads 2 proof screenshots

**Result:**
```
INSERT INTO student_earning_milestones:
  student_id: abc-123
  goal_id: agency-1k
  amount: 750.00
  previous_amount: 500.00
  milestone_type: 'manual_update'
  proof_urls: ['url1.jpg', 'url2.jpg']
  is_verified: FALSE
  notes: "Built Shopify app for restaurant client"
  source: "Upwork"
  created_at: NOW()

UPDATE profiles:
  goal_current_amount = 750.00
  last_earnings_update = NOW()
```

### Example 2: Goal Completion

**State:**
- Student at $950, goal target is $1000
- Student updates to $1050

**System detects:** `amount >= target_amount`

**Result:**
```
INSERT milestone #1 (completion):
  amount: 1050.00
  previous_amount: 950.00
  milestone_type: 'goal_completion'
  notes: "Hit my first $1k goal!"

INSERT milestone #2 (transition snapshot):
  amount: 1050.00
  previous_amount: 1050.00
  milestone_type: 'goal_transition'

UPDATE profiles:
  lifetime_earnings = lifetime_earnings + 1050.00
  goal_current_amount = 0.00  (reset for next goal)
  current_goal_id = "agency-3k"  (next goal)
```

### Example 3: Instructor Verification

**Instructor dashboard shows:**
- Pending verifications (WHERE `is_verified = FALSE` AND `proof_urls IS NOT NULL`)

**Instructor action:**
- Reviews proof screenshots
- Approves milestone

**Result:**
```
UPDATE student_earning_milestones:
  is_verified = TRUE
  verified_by = instructor-uuid
  verified_at = NOW()
  verification_notes = "Upwork contract + payment screenshot verified. Looks legitimate."
```

### Example 4: Flagging Suspicious Earnings

**Scenario:**
- Student reports $5,000 in single day
- No previous earnings history

**Instructor action:**
- Flags for review

**Result:**
```
UPDATE student_earning_milestones:
  flagged_for_review = TRUE
  flag_reason = "Amount too high for new student. Needs detailed proof and explanation."
```

Earnings still count but marked for investigation.

---

## Key Queries

### Get Student's Earning History for Current Goal
```sql
SELECT
  amount,
  milestone_type,
  notes,
  source,
  is_verified,
  created_at
FROM student_earning_milestones
WHERE student_id = $1
  AND goal_id = $2
ORDER BY created_at DESC;
```

### Calculate Lifetime Earnings (Verified Only)
```sql
SELECT SUM(amount) as total_verified_earnings
FROM student_earning_milestones
WHERE student_id = $1
  AND is_verified = TRUE
  AND milestone_type IN ('goal_completion', 'goal_transition');
```

### Instructor Dashboard: Pending Verifications
```sql
SELECT
  sem.*,
  p.full_name,
  tg.name as goal_name
FROM student_earning_milestones sem
JOIN profiles p ON p.id = sem.student_id
JOIN track_goals tg ON tg.id = sem.goal_id
WHERE sem.is_verified = FALSE
  AND sem.proof_urls IS NOT NULL
ORDER BY sem.created_at ASC
LIMIT 20;
```

### Leaderboard Query (Verified Earnings Only)
```sql
SELECT
  p.id,
  p.display_name,
  p.lifetime_earnings,
  COUNT(sem.id) as total_milestones
FROM profiles p
LEFT JOIN student_earning_milestones sem
  ON sem.student_id = p.id
  AND sem.is_verified = TRUE
WHERE p.role = 'student'
  AND p.show_on_leaderboard = TRUE
GROUP BY p.id
ORDER BY p.lifetime_earnings DESC
LIMIT 50;
```

### Activity Feed: Recent Earnings Updates
```sql
SELECT
  p.display_name,
  sem.amount,
  sem.milestone_type,
  sem.created_at
FROM student_earning_milestones sem
JOIN profiles p ON p.id = sem.student_id
WHERE sem.is_public = TRUE
  AND sem.milestone_type IN ('manual_update', 'goal_completion')
ORDER BY sem.created_at DESC
LIMIT 10;
```

---

## Comparison: Before vs After

### Before (Current System)

**Tables used:**
- `profiles.goal_current_amount` only

**Limitations:**
- Only tracks current goal
- No history
- No proof system
- No verification
- Can't calculate lifetime earnings

### After (With Milestones)

**Tables used:**
- `profiles.goal_current_amount` (current goal)
- `profiles.lifetime_earnings` (cached total)
- `student_earning_milestones` (full history)

**Benefits:**
- Complete earnings history
- Proof upload system
- Instructor verification
- Lifetime earnings tracking
- Milestone progression ($500 → $1k → $3k)
- Success stories with proof
- Fraud prevention (flagging system)
- Student privacy controls

---

## Database Migration Strategy

### Step 1: Create Table
```sql
CREATE TABLE student_earning_milestones (
  -- columns as defined above
);

-- Add indexes
```

### Step 2: Add Columns to Profiles
```sql
ALTER TABLE profiles
ADD COLUMN lifetime_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN last_earnings_update TIMESTAMPTZ;
```

### Step 3: Backfill Historical Data (Optional)
If you want to preserve existing `goal_current_amount` data:
```sql
INSERT INTO student_earning_milestones (
  student_id,
  goal_id,
  amount,
  milestone_type,
  is_verified,
  created_at
)
SELECT
  id,
  current_goal_id,
  CAST(goal_current_amount AS DECIMAL),
  'system_adjustment',
  FALSE,
  NOW()
FROM profiles
WHERE goal_current_amount IS NOT NULL
  AND goal_current_amount != '0';
```

### Step 4: Create Triggers
```sql
-- Auto-update updated_at timestamp
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON student_earning_milestones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## Next Steps

1. Review this table design
2. Confirm all columns make sense
3. Create database migration files
4. Implement API routes for earnings updates
5. Build instructor verification dashboard
6. Integrate with leaderboard queries

---

## Open Questions

1. **Verification requirement:** Should earnings be HIDDEN from leaderboard until verified, or shown with "unverified" badge?

2. **Auto-verification:** Should small amounts (e.g., < $100) auto-verify without instructor review?

3. **Proof upload:** Required for all earnings updates, or optional?

4. **Flagging workflow:** When earnings are flagged, should they be removed from leaderboard or just marked?

5. **Edit capability:** Can students edit a milestone after submission, or is it immutable?

6. **Deletion:** Should milestone records be soft-deleted or hard-deleted?

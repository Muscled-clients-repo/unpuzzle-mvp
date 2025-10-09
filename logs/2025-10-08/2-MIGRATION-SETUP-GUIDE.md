# Migration Setup Guide

## New Migrations Created

Run these migrations in Supabase in this exact order:

### 1. `119_community_posts_mvp.sql` ✅
Community posts table with JSONB for MVP

### 2. `120_global_resources_system.sql` ✅
Global resources with polymorphic links (difficulty column removed)

### 3. `121_enhance_profiles_revenue_tracking.sql` ✅
Revenue tracking columns + helper functions for profiles

### 4. `122_remove_difficulty_from_resources.sql` ⚠️ NEW
Removes the difficulty column from resources table

### 5. `123_add_revenue_submission_message_type.sql` ⚠️ NEW
Adds 'revenue_submission' to message_type constraint

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project
2. Click "SQL Editor" in the sidebar
3. Copy and paste each migration file content
4. Run them one by one in order (119 → 123)

### Option 2: Supabase CLI
```bash
cd /Users/mahtabalam/Desktop/Coding/Unpuzzle-MVP

# Push all pending migrations
npx supabase db push
```

## Verification Commands

After running migrations, verify in Supabase SQL Editor:

```sql
-- 1. Check all new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('community_posts', 'resources', 'resource_links', 'resource_interactions');

-- 2. Check resources table doesn't have difficulty
SELECT column_name FROM information_schema.columns
WHERE table_name = 'resources' AND column_name = 'difficulty';
-- Should return 0 rows

-- 3. Check profiles has revenue columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('total_revenue_earned', 'current_mrr', 'completed_goals');

-- 4. Check message_type constraint includes revenue_submission
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'conversation_messages_message_type_check';
-- Should include 'revenue_submission' in the list

```

## Next Step: Update CurrentGoalCard Usage

You need to pass `conversationId` prop to `<CurrentGoalCard />` wherever it's used.

Find all usages:
```bash
grep -r "CurrentGoalCard" src/app --include="*.tsx" --include="*.ts"
```

Then update to:
```tsx
<CurrentGoalCard
  goal={goalData}
  conversationId={conversationId} // Add this prop
/>
```

## Testing Checklist

- [ ] All 5 migrations run successfully (119-123)
- [ ] Verification queries pass
- [ ] No difficulty column in resources table
- [ ] message_type constraint includes 'revenue_submission'
- [ ] conversationId prop added to CurrentGoalCard
- [ ] Can see "Submit Revenue Proof" button at /student/goals
- [ ] Modal opens when button clicked
- [ ] Can submit revenue proof successfully

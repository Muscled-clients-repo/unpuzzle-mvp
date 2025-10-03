# 🚨 CRITICAL BUG: Track Assignment Not Setting current_goal_id

## The Problem
When `assignTrackToStudent()` is called, it:
1. ✅ Creates record in `student_track_assignments` table
2. ❌ Does NOT update `profiles.current_goal_id`

## Why This Breaks Everything
- Course access is controlled by `profiles.current_goal_id`
- The `get_user_courses()` function ONLY checks `current_goal_id`
- So even after track assignment, student sees NO courses

## The Fix Needed

In `/src/lib/actions/track-actions.ts`, the `assignTrackToStudent` function needs to:

```typescript
// After creating the track assignment...

// If a goal_id is provided, update the profile
if (goalId) {
  await supabase
    .from('profiles')
    .update({ current_goal_id: goalId })
    .eq('id', user.id)
}

// OR if no goal_id provided, get the default goal for the track
if (!goalId) {
  const { data: defaultGoal } = await supabase
    .from('track_goals')
    .select('id')
    .eq('track_id', trackId)
    .eq('is_default', true)
    .single()

  if (defaultGoal) {
    await supabase
      .from('profiles')
      .update({ current_goal_id: defaultGoal.id })
      .eq('id', user.id)
  }
}
```

## Current Workaround
The track change approval flow in `request-actions.ts` DOES update `current_goal_id`:
```typescript
// Line 545 in request-actions.ts
profileUpdateData.current_goal_id = goalId
```

But the initial track assignment doesn't!

## Testing Impact
This explains why track selection might appear to work but courses don't show up.

## ✅ FIX APPLIED
Updated `/src/lib/actions/track-actions.ts` to:
1. Fetch default goal if no goalId provided
2. Update profiles.current_goal_id after creating/updating track assignment
3. Both tracks have default goals configured:
   - Agency Track → "$1K Agency"
   - SaaS Track → "$1K SaaS MRR"

The track selection flow should now work correctly!
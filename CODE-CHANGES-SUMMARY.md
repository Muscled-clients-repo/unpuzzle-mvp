# Code Changes Summary After Migration

## What Changed in the Database (Migration 106)
1. **Table renamed**: `user_track_assignments` → `student_track_assignments` ✅
2. **Column renamed**: `user_id` → `student_id` ✅

## Code Changes Made to `/src/lib/actions/track-actions.ts`

### 1. Updated Column References
- Changed `.eq('is_active', true)` → `.eq('status', 'active')` (line 231)
- Changed `.update({ is_active: false })` → `.update({ status: 'abandoned' })` (line 320)

### 2. Simplified Function Parameters
**Before:**
```typescript
assignTrackToStudent({
  trackId,
  assignmentType = 'primary',
  confidenceScore = 100,
  source = 'manual',
  reasoning
})
```

**After:**
```typescript
assignTrackToStudent({
  trackId,
  goalId  // optional, for linking to track_goals
})
```

### 3. Updated Database Operations
**Insert simplified to only use existing columns:**
```typescript
{
  student_id: user.id,
  track_id: trackId,
  goal_id: goalId || null,
  status: 'active',
  assigned_at: new Date().toISOString()
}
```

### 4. What Was Removed
These parameters/columns don't exist in the database, so removed:
- `assignment_type` (primary/secondary)
- `confidence_score`
- `assignment_source` (manual/questionnaire)
- `assignment_reasoning`
- `progress_percentage`

## Important Note About UI Components

The questionnaire page (`/src/app/student/track-selection/questionnaire/page.tsx`) is calling:
```typescript
await assignTrackToStudent(selectedTrack as 'agency' | 'saas')
```

This passes a string like 'agency' or 'saas', but the function now expects a `trackId` (UUID).

## To Test Track Selection:

1. First check if tracks exist in database:
```javascript
// Run: node check-tracks.js
const { data: tracks } = await supabase
  .from('tracks')
  .select('*')

// Should return tracks with actual UUIDs
```

2. The UI needs to pass track IDs, not track names/types
3. You may need to create tracks in the database if they don't exist

## Next Steps:
1. Verify tracks table has data with proper IDs
2. Update UI components to use track IDs instead of strings
3. Or create a helper function to map 'agency'/'saas' to actual track IDs
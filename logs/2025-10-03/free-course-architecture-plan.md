# Free Course Architecture Plan
**Date**: October 3, 2025
**Problem**: Need a public free course for lead generation, but current system requires users to be signed up, assigned to a track, and have a goal.

---

## Current System Analysis

### **How Course Access Works Now:**
1. User signs up → Gets assigned to a **track** (e.g., "Agency Track", "SaaS Track")
2. User gets assigned a **goal** within that track (e.g., "$1K/month", "$5K/month")
3. Courses are tagged with **goals** via `course_goal_assignments` table
4. User can ONLY see courses that match their current goal
5. RPC function `get_user_courses` filters courses by user's `current_goal_id`

### **The Problem:**
- Free course needs to be accessible BEFORE signup (lead magnet)
- OR accessible immediately after signup WITHOUT track/goal assignment
- Current system: No goal = No course access

---

## Solution Options (Ranked by Complexity)

### ✅ **Option 1: Special "Lead Magnet" Track & Goal (RECOMMENDED)**
**Complexity**: Low (2-3 hours)
**Works with existing architecture**: Yes
**Requires new tables**: No

#### **How it works:**
1. Create a special track: `"Lead Magnet Track"`
2. Create a special goal: `"Free Course Access"`
3. Tag free course with this goal
4. Auto-assign new signups to this track/goal
5. After they complete onboarding questionnaire → Reassign to real track/goal

#### **Benefits:**
- ✅ No architecture changes
- ✅ Uses existing goal-based access system
- ✅ Clean separation (free vs paid courses)
- ✅ Easy to track free users separately
- ✅ Can limit AI interactions per goal (10 for free, unlimited for paid)

#### **Implementation:**
```sql
-- Migration: Add lead magnet track/goal
INSERT INTO tracks (id, name, description, is_active)
VALUES (
  'lead-magnet-track-id',
  'Lead Magnet Track',
  'Default track for free course users before onboarding',
  true
);

INSERT INTO track_goals (id, track_id, name, description, is_default)
VALUES (
  'free-course-goal-id',
  'lead-magnet-track-id',
  'Free Course Access',
  'Access to free $1K/month course (10 AI interactions)',
  true
);

-- Tag free course with this goal
INSERT INTO course_goal_assignments (course_id, goal_id)
VALUES ('your-free-course-id', 'free-course-goal-id');
```

**Signup Flow:**
```typescript
// After user signs up (before onboarding)
await supabase
  .from('profiles')
  .update({
    current_track_id: 'lead-magnet-track-id',
    current_goal_id: 'free-course-goal-id',
    track_assigned_at: new Date(),
    goal_assigned_at: new Date()
  })
  .eq('id', user.id)

// Existing get_user_courses RPC will now return free course
```

**After Onboarding (when they pick real track/goal):**
```typescript
// Update to their chosen track/goal
await supabase
  .from('profiles')
  .update({
    current_track_id: selectedTrackId,
    current_goal_id: selectedGoalId,
    track_assigned_at: new Date(),
    goal_assigned_at: new Date()
  })
  .eq('id', user.id)

// They lose access to free course (unless you also tag it with their new goal)
```

---

### Option 2: Public Course Flag (Medium Complexity)
**Complexity**: Medium (4-6 hours)
**Works with existing architecture**: Partial (requires changes)
**Requires new tables**: No (just column addition)

#### **How it works:**
1. Add `is_public` boolean to `courses` table
2. Modify `get_user_courses` RPC to also return public courses
3. Public courses accessible even without track/goal assignment
4. Still track AI interactions separately for free users

#### **Implementation:**
```sql
-- Migration: Add is_public column
ALTER TABLE courses ADD COLUMN is_public BOOLEAN DEFAULT false;

UPDATE courses SET is_public = true WHERE id = 'your-free-course-id';
```

**Modified RPC:**
```sql
CREATE OR REPLACE FUNCTION get_user_courses_with_public(user_id UUID)
RETURNS TABLE (/* course fields */) AS $$
BEGIN
  RETURN QUERY
  -- Get goal-based courses (existing logic)
  SELECT c.* FROM courses c
  INNER JOIN course_goal_assignments cga ON c.id = cga.course_id
  INNER JOIN profiles p ON p.current_goal_id = cga.goal_id
  WHERE p.id = user_id AND c.status = 'published'

  UNION

  -- Get public courses
  SELECT c.* FROM courses c
  WHERE c.is_public = true AND c.status = 'published';
END;
$$ LANGUAGE plpgsql;
```

#### **Downsides:**
- Breaks clean goal-based architecture
- Public courses visible to everyone (even paid users)
- Need to handle AI interaction limits separately
- More complex access control logic

---

### Option 3: Separate Free Course System (High Complexity)
**Complexity**: High (8-12 hours)
**Works with existing architecture**: No (parallel system)
**Requires new tables**: Yes

#### **How it works:**
1. Create separate `free_courses` table
2. Separate access control, progress tracking
3. After user upgrades → Migrate to main course system
4. Completely separate from goal-based system

#### **Downsides:**
- ❌ Code duplication (two course systems)
- ❌ Complex migration when user upgrades
- ❌ Hard to maintain
- ❌ Different UI/UX for free vs paid

**Not recommended** - overengineering for a simple problem.

---

## 🎯 RECOMMENDED APPROACH: Option 1 (Lead Magnet Track/Goal)

### **Why this wins:**
1. ✅ **Zero breaking changes** to existing architecture
2. ✅ **Clean separation** of free vs paid users
3. ✅ **Reuses all existing code** (course access, progress, AI interactions)
4. ✅ **Easy to track** free users separately (analytics, conversion funnels)
5. ✅ **Simple upgrade path** (just reassign track/goal after onboarding)
6. ✅ **Can set different limits** per goal (10 AI interactions for free, unlimited for paid)

### **Implementation Steps (2-3 hours):**

#### **Step 1: Create Migration (30 min)**
```sql
-- File: supabase/migrations/XXX_add_lead_magnet_track.sql

-- Create Lead Magnet Track
INSERT INTO tracks (id, name, description, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Lead Magnet Track',
  'Default track for free course users before onboarding',
  true
);

-- Create Free Course Goal
INSERT INTO track_goals (id, track_id, name, description, is_default, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Free Course Access',
  'Get to $1K/month in 30 days - Free course with 10 AI interactions',
  true,
  0
);

-- Tag your free course with this goal
-- (Replace 'YOUR_FREE_COURSE_ID' with actual course ID)
INSERT INTO course_goal_assignments (course_id, goal_id)
VALUES (
  'YOUR_FREE_COURSE_ID',
  '00000000-0000-0000-0000-000000000002'
)
ON CONFLICT (course_id, goal_id) DO NOTHING;

-- Optional: Create AI interaction limit for this goal
CREATE TABLE IF NOT EXISTS goal_ai_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES track_goals(id) ON DELETE CASCADE NOT NULL UNIQUE,
  max_interactions INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO goal_ai_limits (goal_id, max_interactions)
VALUES ('00000000-0000-0000-0000-000000000002', 10);
```

#### **Step 2: Update Signup Flow (30 min)**

**File: `src/app/actions/auth-actions.ts` or wherever signup happens**

```typescript
// After user signs up successfully
export async function assignLeadMagnetTrack(userId: string) {
  const supabase = await createClient()

  const LEAD_MAGNET_TRACK_ID = '00000000-0000-0000-0000-000000000001'
  const FREE_COURSE_GOAL_ID = '00000000-0000-0000-0000-000000000002'

  const { error } = await supabase
    .from('profiles')
    .update({
      current_track_id: LEAD_MAGNET_TRACK_ID,
      current_goal_id: FREE_COURSE_GOAL_ID,
      track_assigned_at: new Date().toISOString(),
      goal_assigned_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) {
    console.error('Error assigning lead magnet track:', error)
    throw error
  }

  console.log('User assigned to Lead Magnet track - can now access free course')
}

// Call this in your signup completion handler
// Example:
async function handleSignupComplete(user: User) {
  await assignLeadMagnetTrack(user.id)

  // Redirect to free course
  redirect('/student/courses') // They'll see the free course
}
```

#### **Step 3: Update Onboarding Flow (1 hour)**

**File: `src/app/actions/onboarding-actions.ts`**

```typescript
export async function completeOnboarding(userId: string, data: {
  selectedTrackId: string
  selectedGoalId: string
}) {
  const supabase = await createClient()

  // Move user from Lead Magnet track to their chosen track/goal
  const { error } = await supabase
    .from('profiles')
    .update({
      current_track_id: data.selectedTrackId,
      current_goal_id: data.selectedGoalId,
      track_assigned_at: new Date().toISOString(),
      goal_assigned_at: new Date().toISOString(),
      onboarding_completed: true
    })
    .eq('id', userId)

  if (error) throw error

  // User now sees courses for their real goal
  // Free course disappears (unless you also tag it with their new goal)
}
```

#### **Step 4: AI Interaction Limits (30 min)**

**File: `src/app/actions/ai-interaction-actions.ts`**

```typescript
export async function checkAIInteractionLimit(userId: string): Promise<{
  allowed: boolean
  remaining: number
  limit: number
}> {
  const supabase = await createClient()

  // Get user's current goal
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_goal_id')
    .eq('id', userId)
    .single()

  if (!profile?.current_goal_id) {
    return { allowed: false, remaining: 0, limit: 0 }
  }

  // Get limit for this goal
  const { data: limitConfig } = await supabase
    .from('goal_ai_limits')
    .select('max_interactions')
    .eq('goal_id', profile.current_goal_id)
    .single()

  const limit = limitConfig?.max_interactions || 999999 // Unlimited if not set

  // Count user's AI interactions for this goal
  const { count } = await supabase
    .from('ai_interactions')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('goal_id', profile.current_goal_id)

  const used = count || 0
  const remaining = Math.max(0, limit - used)

  return {
    allowed: remaining > 0,
    remaining,
    limit
  }
}

// In your AI interaction handler
export async function handleAIInteraction(userId: string, query: string) {
  const { allowed, remaining } = await checkAIInteractionLimit(userId)

  if (!allowed) {
    throw new Error(`AI interaction limit reached. Upgrade to get unlimited interactions.`)
  }

  // Process AI interaction...

  // Track the interaction
  await supabase.from('ai_interactions').insert({
    user_id: userId,
    goal_id: profile.current_goal_id,
    query,
    response: aiResponse
  })

  return { response: aiResponse, remaining: remaining - 1 }
}
```

#### **Step 5: Optional - Keep Free Course After Upgrade (15 min)**

If you want users to keep access to free course even after onboarding:

```typescript
// When creating goal assignments, also include free course goal
async function assignUserToGoal(userId: string, newGoalId: string) {
  const FREE_COURSE_GOAL_ID = '00000000-0000-0000-0000-000000000002'

  // Check if free course should be tagged with new goal too
  const { data: freeCourse } = await supabase
    .from('course_goal_assignments')
    .select('course_id')
    .eq('goal_id', FREE_COURSE_GOAL_ID)
    .single()

  if (freeCourse) {
    // Tag free course with new goal (so they keep access)
    await supabase
      .from('course_goal_assignments')
      .insert({
        course_id: freeCourse.course_id,
        goal_id: newGoalId
      })
      .onConflict(['course_id', 'goal_id'])
      .ignore()
  }
}
```

---

## User Flows with This Approach

### **Flow 1: Free User (Lead Magnet)**
1. User visits landing page → Enters email
2. Signs up → Auto-assigned to "Lead Magnet Track" + "Free Course Access" goal
3. Redirects to `/student/courses` → Sees free course
4. Starts watching → Has 10 AI interactions
5. Gets email sequence → Books strategy call
6. Converts to paid → Goes through onboarding → Assigned real track/goal
7. Sees paid courses (free course optionally kept or removed)

### **Flow 2: Direct Paid User (Skips Free)**
1. User books strategy call directly
2. Pays $4K
3. Signs up → Goes through onboarding
4. Picks track + goal → Assigned immediately
5. Sees paid courses (no free course unless you tag it with their goal)

### **Flow 3: Free to Paid Upgrade**
1. User on free course (10 AI interactions used)
2. Clicks "Upgrade to Founding 50"
3. Books call → Pays $4K
4. Goes through onboarding → Picks real track/goal
5. Old goal = "Free Course Access" → New goal = "$5K/month Agency"
6. Course access updates automatically (existing RPC handles it)

---

## Database Schema Impact

### **New Tables:**
```sql
-- Only if you want to enforce AI limits per goal
CREATE TABLE goal_ai_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES track_goals(id) NOT NULL UNIQUE,
  max_interactions INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **New Rows (Existing Tables):**
- `tracks`: 1 new row ("Lead Magnet Track")
- `track_goals`: 1 new row ("Free Course Access")
- `course_goal_assignments`: 1 new row (free course → free goal)
- `goal_ai_limits`: 1 new row (free goal → 10 interactions)

### **No Schema Changes Required** ✅

---

## Testing Checklist

- [ ] New user signup → Auto-assigned to Lead Magnet track/goal
- [ ] User sees free course on `/student/courses`
- [ ] User can watch free course videos
- [ ] AI interaction limit enforced (10 max)
- [ ] AI interaction count accurate
- [ ] After 10 interactions → Error message + upgrade CTA
- [ ] Onboarding flow → Reassigns to real track/goal
- [ ] After onboarding → User sees paid courses
- [ ] Free course access removed (or kept if you choose)
- [ ] Existing paid users unaffected

---

## Alternative: Pre-Signup Access (If Needed)

If you need free course accessible BEFORE signup:

### **Option 1A: Guest Access with Lead Magnet Track**
1. Create "Guest" user type (no auth required)
2. Still use Lead Magnet track/goal
3. After they sign up → Migrate guest progress to real user

**Not recommended** - adds complexity, auth is simple.

### **Option 1B: Public Landing Page Preview**
1. Create custom `/free-course` page (outside main app)
2. Shows video player + content
3. After video 1 → Require signup to continue
4. After signup → Assign Lead Magnet track/goal
5. Redirect to `/student/courses` (see full course)

**Simpler if you want teaser before signup.**

---

## Migration Rollout Plan

### **Phase 1: Create Track/Goal (Day 1)**
- Run migration to add Lead Magnet track/goal
- Tag free course with new goal
- No user impact (existing users unaffected)

### **Phase 2: Update Signup Flow (Day 1)**
- Modify signup to auto-assign Lead Magnet track/goal
- Test with new user signup
- Verify free course appears

### **Phase 3: Add AI Limits (Day 2)**
- Create `goal_ai_limits` table
- Add free course limit (10 interactions)
- Update AI interaction logic to check limits

### **Phase 4: Update Onboarding (Day 2)**
- Modify onboarding to reassign track/goal
- Test free → paid upgrade flow
- Verify course access switches correctly

### **Phase 5: Add Upgrade CTAs (Day 3)**
- After 10 AI interactions → Show "Upgrade to Founding 50"
- In free course UI → "Unlock more courses with Founding 50"
- Email sequence → Pitch after Day 6

---

## Monitoring & Analytics

**Track these metrics:**
- Free course signups (users on Lead Magnet track)
- Free course completion rate
- AI interactions used (avg per free user)
- Free → Paid conversion rate
- Time to conversion (days from free signup to paid)

**Queries:**
```sql
-- Free users count
SELECT COUNT(*) FROM profiles WHERE current_goal_id = 'free-course-goal-id';

-- Free users who upgraded
SELECT COUNT(*) FROM profiles
WHERE current_goal_id != 'free-course-goal-id'
AND track_assigned_at > goal_assigned_at;

-- Avg AI interactions per free user
SELECT AVG(interaction_count) FROM (
  SELECT user_id, COUNT(*) as interaction_count
  FROM ai_interactions
  WHERE goal_id = 'free-course-goal-id'
  GROUP BY user_id
) sub;
```

---

## Pros & Cons Summary

### ✅ **Pros (Option 1: Lead Magnet Track/Goal):**
- No architecture changes
- Uses existing course access system
- Clean separation of free vs paid
- Easy to enforce AI limits per goal
- Simple upgrade path (just change goal)
- Future-proof (can add more free courses to same goal)
- Easy analytics (filter by goal)

### ❌ **Cons:**
- Need to create/maintain special track/goal
- Free users technically "in the system" (not truly public)
- Need to handle track/goal reassignment on upgrade

### **Verdict: Cons are minimal, pros are massive. Go with Option 1.**

---

## Next Steps

1. ✅ **Decide**: Confirm Option 1 (Lead Magnet Track/Goal)
2. ✅ **Create Migration**: Add track, goal, assignments
3. ✅ **Update Signup**: Auto-assign new users
4. ✅ **Add AI Limits**: Enforce 10 interactions for free
5. ✅ **Update Onboarding**: Reassign track/goal after questionnaire
6. ✅ **Add Upgrade CTAs**: Show upgrade prompts at limit
7. ✅ **Test End-to-End**: Free signup → course access → upgrade
8. ✅ **Deploy**: Ship it

**Estimated Total Time: 2-3 hours**

Ready to implement?

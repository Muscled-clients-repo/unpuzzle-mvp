# Phase 2.3: Profiles Table Track Assignment Cleanup - Simplified Implementation Plan
*Date: September 23, 2025*
*Updated: After application code analysis*

## Executive Summary

This document outlines the **simplified** redesign of track assignment architecture in the Unpuzzle MVP application. Based on analysis of actual application usage, the current system stores track assignments directly in the profiles table, creating tight coupling and limiting basic assignment tracking. This plan proposes a streamlined dedicated assignment table focused on essential functionality without over-engineering.

## Current Problem Analysis

### Issue: Track/Goal Assignments in Profiles Table

The current architecture stores track assignments directly in the `profiles` table, which creates multiple architectural and functional problems:

#### **Tight Coupling Issues**
- User profile data mixed with assignment logic
- Assignment changes require profile table updates
- Difficult to separate user management from learning path management

#### **No Assignment History**
- Cannot track when/why assignments changed
- No audit trail for track switches
- Lost context for learning journey progression
- Impossible to analyze assignment patterns

#### **Limited Flexibility**
- Cannot handle multiple tracks or temporary assignments
- No support for trial periods or conditional assignments
- Cannot implement complex assignment workflows
- Rigid one-track-per-user limitation

#### **Data Integrity Issues**
- Orphaned references when tracks/goals are deleted
- No validation of assignment consistency
- Potential for inconsistent states during updates

### Current Schema (Problematic Architecture)

```sql
-- In profiles table (CURRENT - PROBLEMATIC):
current_track_id UUID REFERENCES tracks(id)
current_goal_id UUID REFERENCES track_goals(id)
track_assigned_at TIMESTAMP
goal_assigned_at TIMESTAMP
```

**Problems with Current Schema**:
- Assignment data scattered across profile fields
- No relationship between track and goal assignments
- Timestamp tracking incomplete and inconsistent
- No status management for assignments

## Proposed Solution: Simplified Assignment Architecture

### Simplified Design Based on Actual Usage

```sql
CREATE TABLE user_track_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES track_goals(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'changed', 'abandoned')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Key Architecture Decisions

#### **Realistic Status Management**
- `active`: Current active assignment
- `changed`: Assignment changed to different track/goal (tracks aren't "completed")
- `abandoned`: Assignment abandoned or discontinued

#### **Essential Fields Only**
- **Removed**: `assignment_reason` - Not needed initially
- **Removed**: `notes` - Over-engineering for MVP stage
- **Removed**: `assigned_by` - Most assignments are self-selected
- **Removed**: `completed_at` - Tracks are ongoing, not completed

#### **Core Functionality**
- Track assignment history (when users switched tracks)
- Current active assignment tracking
- Simple status management aligned with actual user behavior

## Benefits of New Architecture

### 1. **Assignment History Tracking**

#### **Basic Learning Journey**
- Track when users switched tracks/goals
- Understand track change patterns over time
- Simple assignment timeline for each user

#### **Simplified Analytics**
```sql
-- Track change patterns
SELECT track_id, COUNT(*) as assignment_count
FROM user_track_assignments
GROUP BY track_id;

-- Track switching patterns
SELECT
    old_track.track_id as from_track,
    new_track.track_id as to_track,
    COUNT(*) as switch_count
FROM user_track_assignments old_track
JOIN user_track_assignments new_track ON old_track.user_id = new_track.user_id
WHERE old_track.status = 'changed'
  AND new_track.assigned_at > old_track.assigned_at
GROUP BY old_track.track_id, new_track.track_id;
```

### 2. **Cleaner Data Organization**

#### **Single Active Assignment Model**
- One active track per user (current behavior)
- Clear assignment timeline and history
- Simple track change workflow

#### **Basic Assignment Tracking**
- Track when assignments were made
- Track when assignments were changed/abandoned
- Foundation for future enhancements without over-engineering

### 3. **Simplified Query Patterns**

#### **Current Assignment Query**
```sql
-- Get user's current assignment (simplified)
SELECT uta.*, t.name as track_name, tg.name as goal_name
FROM user_track_assignments uta
JOIN tracks t ON uta.track_id = t.id
LEFT JOIN track_goals tg ON uta.goal_id = tg.id
WHERE uta.user_id = $1 AND uta.status = 'active';
```

#### **Assignment History Query**
```sql
-- Get assignment history (without over-engineering)
SELECT uta.*, t.name as track_name, tg.name as goal_name
FROM user_track_assignments uta
JOIN tracks t ON uta.track_id = t.id
LEFT JOIN track_goals tg ON uta.goal_id = tg.id
WHERE uta.user_id = $1
ORDER BY uta.assigned_at DESC;
```

#### **Basic Analytics**
```sql
-- Simple track popularity
SELECT t.name as track_name, COUNT(*) as total_assignments
FROM user_track_assignments uta
JOIN tracks t ON uta.track_id = t.id
GROUP BY t.id, t.name
ORDER BY total_assignments DESC;
```

## Simplified Migration Strategy

### **Step 1: Create Simplified Assignment Table**

```sql
-- Create the simplified assignment table
CREATE TABLE user_track_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES track_goals(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'changed', 'abandoned')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add essential indexes only
CREATE INDEX idx_user_track_assignments_user ON user_track_assignments(user_id);
CREATE INDEX idx_user_track_assignments_active ON user_track_assignments(user_id, status) WHERE status = 'active';
```

### **Step 2: Migrate Existing Data (Simple)**

```sql
-- Simple data migration without over-engineering
INSERT INTO user_track_assignments (user_id, track_id, goal_id, assigned_at, status)
SELECT
    id,
    current_track_id,
    current_goal_id,
    COALESCE(track_assigned_at, created_at),
    'active'
FROM profiles
WHERE current_track_id IS NOT NULL;
```

### **Step 3: Update Application Code (Simplified)**

#### **Server Action Updates**

**Before (Profiles-based)**:
```typescript
// OLD - Direct profile updates
export async function assignUserToTrack(userId: string, trackId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({
      current_track_id: trackId,
      track_assigned_at: new Date().toISOString()
    })
    .eq('id', userId);
}
```

**After (Simplified Assignment-based)**:
```typescript
// NEW - Simplified assignment table management
export async function assignUserToTrack(userId: string, trackId: string, goalId?: string) {
  // Mark previous assignment as changed
  await supabase
    .from('user_track_assignments')
    .update({ status: 'changed' })
    .eq('user_id', userId)
    .eq('status', 'active');

  // Create new assignment (simple)
  const { error } = await supabase
    .from('user_track_assignments')
    .insert({
      user_id: userId,
      track_id: trackId,
      goal_id: goalId,
      status: 'active'
    });
}
```

#### **React Query Hook Updates**

**Before**:
```typescript
// OLD - Direct profile query
const { data: userTrack } = useQuery({
  queryKey: ['user-track', userId],
  queryFn: () => supabase
    .from('profiles')
    .select('current_track_id, current_goal_id')
    .eq('id', userId)
    .single()
});
```

**After (Simplified)**:
```typescript
// NEW - Simple assignment-based query
const { data: currentAssignment } = useQuery({
  queryKey: ['user-track-assignment', userId],
  queryFn: () => supabase
    .from('user_track_assignments')
    .select(`
      *,
      tracks(id, name, description),
      track_goals(id, name, description)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
});
```

### **Step 4: Remove Old Columns and Cleanup**

```sql
-- Create backup before removing columns
CREATE TABLE backup_profiles_track_data_20250923 AS
SELECT id, current_track_id, current_goal_id, track_assigned_at, goal_assigned_at
FROM profiles;

-- Remove track columns from profiles table
ALTER TABLE profiles DROP COLUMN IF EXISTS current_track_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS current_goal_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS track_assigned_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS goal_assigned_at;
```

## Implementation Benefits

### **Cleaner Architecture**
- Profiles table focused on user data only
- Assignment history tracking capability
- Simple status management (active, changed, abandoned)

### **Basic Analytics Support**
- Track popularity analysis
- Assignment change patterns
- Simple user assignment timelines

### **Foundation for Future**
- Can extend with more fields later if needed
- Proper separation of concerns established
- Better data organization without over-engineering

## Implementation Timeline

**Week 1**: Create table and migrate data
**Week 2**: Update application code to use new table
**Week 3**: Test and verify functionality
**Week 4**: Remove old columns and cleanup

## Success Criteria

- ✅ All existing assignments migrated correctly
- ✅ No functionality broken during transition
- ✅ Assignment history tracking working
- ✅ Cleaner profiles table structure
- ✅ Foundation ready for future enhancements

This simplified approach provides the core benefits of separating track assignments from profiles without over-engineering the solution for the current MVP stage.
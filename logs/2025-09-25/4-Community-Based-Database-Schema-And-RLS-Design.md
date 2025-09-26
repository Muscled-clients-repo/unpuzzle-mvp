# Community-Based Database Schema and RLS Policy Design

**Date:** September 25, 2025
**Context:** Instructor Student Goals System - Community Architecture
**Status:** Design Document for Implementation

---

## EXECUTIVE SUMMARY

Based on the discovery that students should "buy into communities" where instructors own communities containing tracks, goals, and courses, we need a complete database schema redesign with proper RLS policies for security and data isolation.

**Current Problem:** No clear instructor-student relationship exists. RLS policies block all access when disabled.

**Proposed Solution:** Community-based hierarchy with proper RLS policies for secure multi-tenant access.

---

## PROPOSED SCHEMA ARCHITECTURE

### **1. Core Community Structure**

```sql
-- Communities table - owned by instructors
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  price DECIMAL(10,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community memberships - students buy into communities
CREATE TABLE community_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(community_id, student_id)
);
```

### **2. Enhanced Existing Tables**

```sql
-- Add community_id to tracks
ALTER TABLE tracks ADD COLUMN community_id UUID REFERENCES communities(id) ON DELETE CASCADE;

-- Add community_id to track_goals
ALTER TABLE track_goals ADD COLUMN community_id UUID REFERENCES communities(id) ON DELETE CASCADE;

-- Add community_id to courses (if courses table exists)
-- ALTER TABLE courses ADD COLUMN community_id UUID REFERENCES communities(id) ON DELETE CASCADE;

-- Update user_track_assignments to include community context
ALTER TABLE user_track_assignments ADD COLUMN community_id UUID REFERENCES communities(id) ON DELETE CASCADE;

-- Add instructor context to profiles for role clarity
ALTER TABLE profiles ADD COLUMN instructor_communities_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN student_communities_count INTEGER DEFAULT 0;
```

### **3. Indexes for Performance**

```sql
-- Community-based queries will be frequent
CREATE INDEX idx_communities_instructor ON communities(instructor_id);
CREATE INDEX idx_community_memberships_community ON community_memberships(community_id);
CREATE INDEX idx_community_memberships_student ON community_memberships(student_id);
CREATE INDEX idx_community_memberships_status ON community_memberships(status);

-- Enhanced existing indexes
CREATE INDEX idx_tracks_community ON tracks(community_id);
CREATE INDEX idx_track_goals_community ON track_goals(community_id);
CREATE INDEX idx_user_track_assignments_community ON user_track_assignments(community_id);
```

---

## RLS POLICY DESIGN

### **Security Principles**

1. **Community Isolation**: Students can only see data from communities they've joined
2. **Instructor Ownership**: Instructors can see all data in their owned communities
3. **Profile Privacy**: Users can only see profiles of people in their shared communities
4. **Payment Protection**: Payment status only visible to instructor and student involved

### **1. Communities Table RLS**

```sql
-- Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Policy 1: Instructors can see their own communities
CREATE POLICY "instructors_see_own_communities" ON communities
  FOR SELECT USING (instructor_id = auth.uid());

-- Policy 2: Students can see communities they've joined
CREATE POLICY "students_see_joined_communities" ON communities
  FOR SELECT USING (
    id IN (
      SELECT community_id
      FROM community_memberships
      WHERE student_id = auth.uid()
      AND status = 'active'
    )
  );

-- Policy 3: Instructors can modify their own communities
CREATE POLICY "instructors_modify_own_communities" ON communities
  FOR ALL USING (instructor_id = auth.uid());
```

### **2. Community Memberships RLS**

```sql
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;

-- Policy 1: Instructors see memberships in their communities
CREATE POLICY "instructors_see_community_memberships" ON community_memberships
  FOR SELECT USING (
    community_id IN (
      SELECT id FROM communities WHERE instructor_id = auth.uid()
    )
  );

-- Policy 2: Students see their own memberships
CREATE POLICY "students_see_own_memberships" ON community_memberships
  FOR SELECT USING (student_id = auth.uid());

-- Policy 3: Students can join communities (insert)
CREATE POLICY "students_can_join_communities" ON community_memberships
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Policy 4: Instructors can manage memberships in their communities
CREATE POLICY "instructors_manage_memberships" ON community_memberships
  FOR ALL USING (
    community_id IN (
      SELECT id FROM communities WHERE instructor_id = auth.uid()
    )
  );
```

### **3. Profiles Table RLS (Fixed)**

```sql
-- Re-enable RLS (currently disabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can see their own profile
CREATE POLICY "users_see_own_profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Policy 2: Instructors can see profiles of students in their communities
CREATE POLICY "instructors_see_community_students" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT cm.student_id
      FROM community_memberships cm
      JOIN communities c ON cm.community_id = c.id
      WHERE c.instructor_id = auth.uid()
      AND cm.status = 'active'
    )
  );

-- Policy 3: Students can see profiles of people in shared communities
CREATE POLICY "students_see_community_members" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT DISTINCT p.id
      FROM profiles p
      JOIN community_memberships cm1 ON p.id = cm1.student_id
      JOIN community_memberships cm2 ON cm1.community_id = cm2.community_id
      WHERE cm2.student_id = auth.uid()
      AND cm1.status = 'active'
      AND cm2.status = 'active'
    )
    OR
    -- Also see instructors of communities they're in
    id IN (
      SELECT c.instructor_id
      FROM communities c
      JOIN community_memberships cm ON c.id = cm.community_id
      WHERE cm.student_id = auth.uid()
      AND cm.status = 'active'
    )
  );

-- Policy 4: Users can update their own profile
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (id = auth.uid());
```

### **4. Enhanced Existing Table RLS**

```sql
-- Tracks: Community-scoped access
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_members_see_tracks" ON tracks
  FOR SELECT USING (
    community_id IN (
      SELECT cm.community_id
      FROM community_memberships cm
      WHERE cm.student_id = auth.uid()
      AND cm.status = 'active'
    )
    OR
    community_id IN (
      SELECT id FROM communities WHERE instructor_id = auth.uid()
    )
  );

-- Track Goals: Community-scoped access
ALTER TABLE track_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_members_see_goals" ON track_goals
  FOR SELECT USING (
    community_id IN (
      SELECT cm.community_id
      FROM community_memberships cm
      WHERE cm.student_id = auth.uid()
      AND cm.status = 'active'
    )
    OR
    community_id IN (
      SELECT id FROM communities WHERE instructor_id = auth.uid()
    )
  );

-- User Track Assignments: Community-scoped access
-- (Table already has RLS issues resolved earlier)
CREATE POLICY "community_track_assignments" ON user_track_assignments
  FOR SELECT USING (
    community_id IN (
      SELECT cm.community_id
      FROM community_memberships cm
      WHERE cm.student_id = auth.uid()
      AND cm.status = 'active'
    )
    OR
    community_id IN (
      SELECT id FROM communities WHERE instructor_id = auth.uid()
    )
  );
```

---

## APPLICATION QUERY PATTERNS

### **1. Instructor Dashboard - Student Goals**

```sql
-- Get students in instructor's communities with their goals
SELECT
  p.id as student_id,
  p.full_name,
  p.email,
  p.current_goal_id,
  tg.name as goal_name,
  tg.description as goal_description,
  c.name as community_name,
  cm.joined_at
FROM profiles p
JOIN community_memberships cm ON p.id = cm.student_id
JOIN communities c ON cm.community_id = c.id
LEFT JOIN track_goals tg ON p.current_goal_id = tg.id
WHERE c.instructor_id = auth.uid()
AND cm.status = 'active'
ORDER BY cm.joined_at DESC;
```

### **2. Student Dashboard - Available Communities**

```sql
-- Get communities student can join or has joined
SELECT
  c.*,
  p.full_name as instructor_name,
  cm.status as membership_status,
  cm.joined_at
FROM communities c
JOIN profiles p ON c.instructor_id = p.id
LEFT JOIN community_memberships cm ON c.id = cm.community_id AND cm.student_id = auth.uid()
WHERE c.is_active = true
ORDER BY cm.joined_at DESC NULLS LAST, c.created_at DESC;
```

### **3. Community-Scoped Track Access**

```sql
-- Get tracks available to user (based on community membership)
SELECT
  t.*,
  c.name as community_name
FROM tracks t
JOIN communities c ON t.community_id = c.id
JOIN community_memberships cm ON c.id = cm.community_id
WHERE cm.student_id = auth.uid()
AND cm.status = 'active'
ORDER BY t.created_at DESC;
```

---

## MIGRATION STRATEGY

### **Phase 1: Schema Creation (Safe)**

1. Create new tables (communities, community_memberships)
2. Add foreign key columns to existing tables
3. Create indexes
4. No RLS changes yet

### **Phase 2: Data Migration**

1. Create default community for existing instructor
2. Migrate existing student-goal relationships to community memberships
3. Update existing tracks/goals with community associations
4. Verify data integrity

### **Phase 3: RLS Implementation**

1. Test RLS policies in development
2. Apply policies one table at a time
3. Verify application queries work
4. Monitor for access issues

### **Phase 4: Application Updates**

1. Update instructor dashboard queries
2. Add community management UI
3. Update student enrollment flow
4. Test complete user journeys

---

## SECURITY BENEFITS

### **1. Data Isolation**
- Students only see data from communities they've paid for
- Instructors only see data from communities they own
- No cross-community data leakage

### **2. Scalability**
- Multiple instructors can operate independently
- Communities can have different pricing models
- Clear data boundaries for performance optimization

### **3. Business Model Alignment**
- Direct mapping of payment to data access
- Clear ownership and responsibility boundaries
- Support for different community types and pricing

---

## IMPLEMENTATION CHECKLIST

### **Database Changes**
- [ ] Create communities table
- [ ] Create community_memberships table
- [ ] Add community_id columns to existing tables
- [ ] Create performance indexes
- [ ] Test schema in development

### **RLS Policies**
- [ ] Implement communities table policies
- [ ] Implement community_memberships policies
- [ ] Fix profiles table policies
- [ ] Update existing table policies
- [ ] Test all policy combinations

### **Application Updates**
- [ ] Update instructor dashboard queries
- [ ] Create community management interface
- [ ] Update student goal queries
- [ ] Test complete user flows
- [ ] Monitor performance impact

### **Testing & Rollout**
- [ ] Unit test all RLS policies
- [ ] Integration test user scenarios
- [ ] Performance test with realistic data
- [ ] Gradual rollout with monitoring
- [ ] Rollback plan ready

---

This design provides a secure, scalable foundation for the community-based learning platform while solving the immediate instructor-student relationship and RLS policy issues.
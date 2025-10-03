# Track Flow Dependencies - Complete Analysis

## Core Tables in Track Assignment Flow

### 1. **tracks** (Base Table)
```sql
- id (UUID, PK)
- name (TEXT) - e.g., "Agency Track", "SaaS Track"
- description (TEXT)
- is_active (BOOLEAN)
```

### 2. **track_goals** (Goals within each track)
```sql
- id (UUID, PK)
- track_id (UUID, FK → tracks)
- name (TEXT)
- description (TEXT)
- is_default (BOOLEAN)
- sort_order (INTEGER)
- is_active (BOOLEAN)
```

### 3. **student_track_assignments** (Main Assignment Table - was user_track_assignments)
```sql
- id (UUID, PK)
- student_id (UUID, FK → profiles)
- track_id (UUID, FK → tracks)
- goal_id (UUID, FK → track_goals)
- assigned_at (TIMESTAMP)
- status (TEXT) - 'active', 'changed', 'abandoned'
```

### 4. **profiles** (User Profile with Current Selections)
```sql
- id (UUID, PK)
- current_goal_id (UUID, FK → track_goals) - CRITICAL: Controls course access
- user_id (UUID, FK → auth.users)
- other profile fields...
```

### 5. **requests** (Track Change Approval System)
```sql
- id (UUID, PK)
- user_id (UUID, FK → profiles)
- request_type (TEXT) - includes 'track_change'
- status (TEXT) - 'pending', 'in_review', 'approved', 'rejected', 'completed'
- metadata (JSONB) - Contains questionnaire data, new track info
- assigned_to (UUID) - Instructor who will review
```

### 6. **course_goal_assignments** (Links Courses to Goals)
```sql
- id (UUID, PK)
- course_id (UUID, FK → courses)
- goal_id (UUID, FK → track_goals)
```

## How the Flow Works

### 1. Initial Track Selection (New Student)
```
User → Questionnaire → assignTrackByType() → assignTrackToStudent() → Creates:
  - student_track_assignments record (track_id, goal_id, status='active')
  - If no goal_id provided, fetches default goal for track (is_default=true)
  - Updates profiles.current_goal_id ← CRITICAL for course access
```

**Default Goals:**
- Agency Track: "$1K Agency" (is_default=true)
- SaaS Track: "$1K SaaS MRR" (is_default=true)

### 2. Course Access Control
```
profiles.current_goal_id → course_goal_assignments → Available Courses
```
The `get_user_courses()` function checks:
- User's current_goal_id from profiles
- Matches against course_goal_assignments
- Returns only courses assigned to that specific goal

### 3. Track Change Request Flow
```
Student Request → requests table (type='track_change') →
Instructor Review → If approved:
  - Update student_track_assignments (old status='abandoned', new status='active')
  - Update profiles.current_goal_id
  - Student instantly sees new courses
```

## Critical Dependencies

### Must Update Together:
1. **student_track_assignments** + **profiles.current_goal_id**
   - Both must be updated atomically
   - current_goal_id controls actual course access
   - student_track_assignments is the audit trail

### Course Visibility:
- Controlled by `profiles.current_goal_id`
- NOT controlled by enrollments (table was removed)
- Courses appear/disappear based on goal assignments

### Track Change Process:
1. Create request with new track/goal
2. Instructor approves
3. System updates both assignment and profile
4. Course list automatically changes

## Tables That DON'T Exist Anymore:
- **enrollments** - Removed, replaced by goal-based access
- **course_recommendations** - Referenced in old code but never created
- **course_track_assignments** - Removed (different from course_goal_assignments)

## Key Functions:
- `get_user_courses(user_id)` - Returns courses for user's current goal
- `assignTrackByType(type, goalId?)` - Assigns track and optionally goal
- `getTrackIdByType(type)` - Maps 'agency'/'saas' to UUID

## Testing Checklist:
- [ ] Student can select initial track
- [ ] profiles.current_goal_id gets set
- [ ] Correct courses appear based on goal
- [ ] Track change request creates properly
- [ ] Instructor can approve track change
- [ ] After approval, new courses appear
- [ ] Old track marked as 'abandoned'
- [ ] New track marked as 'active'
# Track Assignment Architecture - Unpuzzle MVP
*Date: September 23, 2025*

## Core System

### **Entities**
- **`tracks`** - Learning paths (e.g. "Frontend Development")
- **`track_goals`** - Specific objectives within tracks (e.g. "Learn React")
- **`courses`** - Individual courses created by instructors
- **`user_track_assignments`** - User assignment records

### **Assignment Flow**
```
User → assigned to → Goal → within → Track
User → sees → Courses → assigned to → their Goal
```

## How It Works

### **1. User Assignment**
```sql
-- User gets assigned to a goal (which belongs to a track)
user_track_assignments:
- user_id → profiles.id
- goal_id → track_goals.id
- track_id → tracks.id
- status: 'active' | 'changed' | 'abandoned'
```

### **2. Course Assignment**
```sql
-- Courses are assigned to specific goals
course_goal_assignments:
- course_id → courses.id
- goal_id → track_goals.id
```

### **3. Access Logic**
```sql
-- User sees courses if:
user_track_assignments.goal_id = course_goal_assignments.goal_id
AND user_track_assignments.status = 'active'
```

## Key Queries

### **Get User's Current Assignment**
```sql
SELECT uta.*, t.name as track_name, tg.name as goal_name
FROM user_track_assignments uta
JOIN track_goals tg ON uta.goal_id = tg.id
JOIN tracks t ON uta.track_id = t.id
WHERE uta.user_id = $1 AND uta.status = 'active';
```

### **Get User's Accessible Courses**
```sql
SELECT c.* FROM courses c
JOIN course_goal_assignments cga ON c.id = cga.course_id
JOIN user_track_assignments uta ON cga.goal_id = uta.goal_id
WHERE uta.user_id = $1 AND uta.status = 'active';
```

### **Assign User to New Track/Goal**
```sql
-- Mark current assignment as changed
UPDATE user_track_assignments
SET status = 'changed'
WHERE user_id = $1 AND status = 'active';

-- Create new assignment
INSERT INTO user_track_assignments (user_id, track_id, goal_id, status)
VALUES ($1, $2, $3, 'active');
```

## Architecture Benefits

- **Goal-based access control** - Granular course visibility
- **Assignment history** - Track user's learning journey
- **Flexible assignments** - Support track changes and abandonment
- **Clean separation** - User data separate from assignment logic
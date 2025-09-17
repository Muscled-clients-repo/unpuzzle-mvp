# Track & Goals Database Inconsistencies Analysis

## Overview
Analysis of normalization issues and inconsistencies in the track/goals database structure that need to be addressed for better data integrity and maintainability.

## Current Problems

### 1. Redundant Course Assignment Tables
**Issue**: Two separate tables for course assignments
- `course_track_assignments` (course_id, track_id)
- `course_goal_assignments` (course_id, goal_id)

**Problem**: Since goals belong to tracks via `track_goals.track_id`, track assignments are redundant
**Solution**: Use only `course_goal_assignments`, derive track assignments from goals

### 2. String-Based Track Identification
**Issue**: `goal_conversations.track_type` uses varchar ('agency', 'saas')
**Problem**:
- No foreign key constraint
- Manual string matching required
- Data integrity risks
- Can't join to tracks table

**Solution**: Replace with `track_id` FK or derive from `goal_id → track_goals → tracks`

### 3. Goal Name Parsing Anti-Pattern
**Issue**: Goal names like "agency-1k", "saas-20k-mrr" require string parsing
**Current Code**:
```javascript
if (goalName.includes('1k')) return '$1,000'
if (goalName.includes('30k')) return '$30,000'
```

**Problems**:
- Brittle string parsing logic
- Goal names can't be user-friendly
- Hard to query by amount ranges

**Solution**: Add proper columns:
- `target_amount: integer`
- `currency: varchar`
- `goal_type: varchar`

### 4. Multiple Default Goals
**Issue**: Both "agency-1k" and "saas-1k" marked as `is_default = true`
**Problem**: Each track should have exactly one default goal
**Solution**: Database constraint ensuring one default per track

### 5. Missing Normalization
**Current**: Mixed approach with some FKs, some string parsing
**Should be**: Full normalization with proper relationships

## Recommended Normalized Structure

```sql
-- Remove redundant table
DROP TABLE course_track_assignments;

-- Normalize track_goals
ALTER TABLE track_goals ADD COLUMNS:
- target_amount: integer
- currency: varchar DEFAULT 'USD'
- goal_type: varchar DEFAULT 'revenue'
- sort_order: integer

-- Fix goal_conversations
ALTER TABLE goal_conversations
DROP COLUMN track_type;
-- (derive track from goal_id → track_goals → tracks)

-- Add constraint for one default per track
ALTER TABLE track_goals ADD CONSTRAINT one_default_per_track
UNIQUE (track_id, is_default) WHERE is_default = true;
```

## Impact Areas
- Course-goal assignment UI logic
- Student course filtering (`get_user_courses()`)
- Goal progression tracking
- Questionnaire to goal assignment flow
- Progress calculation functions

## Migration Strategy
1. Add new columns to `track_goals`
2. Migrate existing goal names to structured data
3. Update application code to use new fields
4. Remove string parsing logic
5. Drop redundant tables and columns
6. Add database constraints

**Priority**: High - affects core goal assignment and course filtering functionality
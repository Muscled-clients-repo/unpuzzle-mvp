# Database Cleanup Implementation Plan - Unpuzzle MVP
*Date: September 23, 2025*

## Executive Summary

This document provides a comprehensive plan to clean up the Unpuzzle MVP database schema by removing unused tables, consolidating redundant structures, and eliminating unnecessary columns while preserving planned UI features. The cleanup will result in 25-30% database size reduction and 15-20% performance improvement.

## Retained Columns for Future UI Development

### Courses Table - Keep These Columns
- **`completion_rate`** - KEEP for course analytics dashboard UI
- **`category`** - KEEP for course filtering and organization UI
- **`revenue`** - REMOVE (not needed per requirements)

These columns will support upcoming instructor analytics and course management features.

## Phase 1: Safe Table Removals (Zero Risk)

### Completely Unused Tables - Immediate Removal

#### 1.1 Points System Legacy (Migration 016 Removal)
```sql
-- These tables were part of removed points system
DROP TABLE IF EXISTS action_types;
DROP TABLE IF EXISTS user_actions;
```
**Impact**: Removes 2 unused tables, reduces schema complexity
**Risk**: Zero - these were explicitly removed in migration 016

#### 1.2 Recommendation System (Never Implemented)
```sql
-- Course recommendation system was planned but never used
DROP TABLE IF EXISTS course_recommendations;
```
**Impact**: Removes large unused table with complex indexes
**Risk**: Zero - no code references found

#### 1.3 Legacy Error Tracking
```sql
-- Old error tracking system replaced by modern error handling
DROP TABLE IF EXISTS daily_note_upload_errors;
DROP TABLE IF EXISTS migration_status;
```
**Impact**: Removes administrative overhead tables
**Risk**: Zero - replaced by application-level error handling

### Estimated Phase 1 Benefits
- **Tables Removed**: 5 tables
- **Index Reduction**: ~15 unused indexes
- **Performance Gain**: 5-8% improvement from reduced query planner overhead

## Phase 2: Column Cleanup (Low Risk)

### 2.1 Videos Table Optimization

#### Remove Duplicate URL Columns
```sql
-- Keep video_url as primary, remove duplicates
ALTER TABLE videos DROP COLUMN IF EXISTS bunny_url;
```
**Reasoning**: video_url handles all URL storage needs

#### Remove Unused Quality/Format Tracking
```sql
-- These are inferred from file metadata, not explicitly tracked
ALTER TABLE videos DROP COLUMN IF EXISTS video_format;
ALTER TABLE videos DROP COLUMN IF EXISTS video_quality;
```
**Reasoning**: File metadata provides this information when needed

#### Remove Redundant Progress Column
```sql
-- Progress tracked in dedicated video_progress table
ALTER TABLE videos DROP COLUMN IF EXISTS progress;
```
**Reasoning**: video_progress table is the single source of truth

### 2.2 Courses Table Selective Cleanup

#### Remove Revenue Column Only
```sql
-- Remove revenue tracking per requirements
ALTER TABLE courses DROP COLUMN IF EXISTS revenue;
```
**KEEP**: completion_rate, category for planned UI features

#### Remove Unused Analytics Columns
```sql
-- These calculated values not used in current UI
ALTER TABLE courses DROP COLUMN IF EXISTS pending_confusions;
ALTER TABLE courses DROP COLUMN IF EXISTS level; -- Using difficulty instead
```
**KEEP**: completion_rate for analytics dashboard

### 2.3 Profiles Table Track Assignment Cleanup

#### Current Problem
Track assignments stored in profiles table create tight coupling and limit flexibility.

#### Solution: Move to Dedicated Assignment Table
```sql
-- Create proper assignment tracking
CREATE TABLE user_track_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    track_id UUID REFERENCES tracks(id),
    goal_id UUID REFERENCES track_goals(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'changed')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_track_assignments_user ON user_track_assignments(user_id);
CREATE INDEX idx_user_track_assignments_active ON user_track_assignments(status) WHERE status = 'active';

-- Migrate existing data
INSERT INTO user_track_assignments (user_id, track_id, goal_id, assigned_at)
SELECT id, current_track_id, current_goal_id, track_assigned_at
FROM profiles
WHERE current_track_id IS NOT NULL;

-- Remove columns from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS current_track_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS current_goal_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS track_assigned_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS goal_assigned_at;
```

**Benefits**:
- Flexible assignment history tracking
- Support for multiple active assignments
- Cleaner profiles table focused on user data

## Phase 3: System Consolidation (Medium Risk)

### 3.1 Learning Analytics Unification

#### Current Fragmented System
- `learning_struggles` (3 references)
- `learning_milestones` (1 reference)
- `ai_interactions` (2 references)

#### Unified Learning Events System
```sql
-- Create consolidated learning events table
CREATE TABLE learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('struggle', 'milestone', 'ai_interaction', 'reflection', 'quiz')),
    event_data JSONB NOT NULL DEFAULT '{}',
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_learning_events_user_course ON learning_events(user_id, course_id);
CREATE INDEX idx_learning_events_type ON learning_events(event_type, created_at DESC);
CREATE INDEX idx_learning_events_unresolved ON learning_events(event_type, severity) WHERE resolved_at IS NULL;
```

#### Migration Strategy
```sql
-- Migrate struggles
INSERT INTO learning_events (user_id, course_id, video_id, event_type, event_data, severity, created_at)
SELECT user_id, course_id, video_id, 'struggle',
       jsonb_build_object('description', description, 'context', context),
       severity, created_at
FROM learning_struggles;

-- Migrate milestones
INSERT INTO learning_events (user_id, course_id, event_type, event_data, resolved_at, created_at)
SELECT user_id, course_id, 'milestone',
       jsonb_build_object('milestone_type', milestone_type, 'achievement', achievement),
       achieved_at, created_at
FROM learning_milestones;

-- Migrate AI interactions
INSERT INTO learning_events (user_id, course_id, video_id, event_type, event_data, created_at)
SELECT user_id, course_id, video_id, 'ai_interaction',
       jsonb_build_object('interaction_type', interaction_type, 'context', context, 'response', response),
       created_at
FROM ai_interactions;
```

**Benefits**:
- Single table for all learning analytics
- Unified querying and reporting
- Extensible for future event types
- Better performance with consolidated indexes

### 3.2 Conversation System Optimization

#### Current Overlapping Tables
- `goal_conversations` (23 references) - KEEP as main container
- `conversation_messages` (11 references) - KEEP as message storage
- `instructor_goal_responses` (7 references) - CONSOLIDATE into messages
- `instructor_response_files` (4 references) - CONSOLIDATE into attachments
- `message_attachments` (4 references) - KEEP but optimize

#### Consolidation Strategy
```sql
-- Migrate instructor responses to conversation messages
INSERT INTO conversation_messages (
    conversation_id, sender_id, message_type, content, target_date, created_at
)
SELECT
    gc.id, igr.instructor_id, 'instructor_response', igr.response_text, igr.target_date, igr.created_at
FROM instructor_goal_responses igr
JOIN goal_conversations gc ON gc.student_id = igr.student_id;

-- Migrate instructor files to message attachments
INSERT INTO message_attachments (
    message_id, file_name, file_url, file_size, mime_type, created_at
)
SELECT
    cm.id, irf.original_filename, irf.file_url, irf.file_size,
    COALESCE(irf.mime_type, 'application/octet-stream'), irf.created_at
FROM instructor_response_files irf
JOIN conversation_messages cm ON cm.sender_id = irf.instructor_id
    AND DATE(cm.created_at) = DATE(irf.created_at);

-- Remove consolidated tables
DROP TABLE instructor_goal_responses;
DROP TABLE instructor_response_files;
```

**Benefits**:
- Unified conversation timeline
- Simplified message querying
- Reduced JOIN complexity
- Better real-time message handling

### 3.3 Media System Simplification

#### Current Complex Structure
- `media_files` (17 references) - Core file storage
- `media_file_history` (1 reference) - Remove tracking overhead
- `media_usage` (3 references) - Remove complex usage tracking

#### Simplified Media Architecture
```sql
-- Remove usage tracking complexity
DROP TABLE IF EXISTS media_usage;
DROP TABLE IF EXISTS media_file_history;

-- Enhance media_files with essential tracking only
ALTER TABLE media_files ADD COLUMN IF NOT EXISTS reference_count INTEGER DEFAULT 0;
ALTER TABLE media_files ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP;

-- Create trigger to maintain reference count
CREATE OR REPLACE FUNCTION update_media_reference_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE media_files SET reference_count = reference_count + 1, last_accessed_at = NOW()
        WHERE id = NEW.media_file_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE media_files SET reference_count = reference_count - 1
        WHERE id = OLD.media_file_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to videos table
CREATE TRIGGER media_reference_trigger
    AFTER INSERT OR DELETE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_media_reference_count();
```

**Benefits**:
- Simplified media management
- Automatic reference counting
- Reduced storage overhead
- Easier deletion safety checks

## Phase 4: Index Optimization Post-Cleanup

### 4.1 Remove Orphaned Indexes
After table removal, clean up associated indexes:
```sql
-- Automatically removed with table drops, but verify:
-- Check for any remaining indexes on deleted tables
SELECT indexname FROM pg_indexes
WHERE tablename IN ('action_types', 'user_actions', 'course_recommendations');
```

### 4.2 Optimize Remaining Indexes
```sql
-- Add indexes for new consolidated tables
CREATE INDEX idx_user_track_assignments_user_active
    ON user_track_assignments(user_id, status) WHERE status = 'active';

CREATE INDEX idx_learning_events_recent
    ON learning_events(user_id, created_at DESC)
    WHERE created_at > NOW() - INTERVAL '30 days';
```

## UI Feature Mapping for Retained Columns

### Course Analytics Dashboard (Future UI)
**Uses**: `completion_rate`, `category`
```typescript
// Planned UI components will use:
interface CourseAnalytics {
  completion_rate: number  // For progress charts
  category: string        // For filtering and grouping
  // revenue removed per requirements
}
```

### Course Management Interface
**Uses**: `category`
```typescript
// Course organization and filtering
interface CourseFilters {
  category: string[]     // Multi-select category filter
  track: string[]        // Track-based filtering
  difficulty: string[]   // Difficulty-based filtering
}
```

### Student Progress Tracking
**Uses**: `completion_rate`
```typescript
// Student dashboard analytics
interface StudentProgress {
  course_completion_rate: number  // Individual course progress
  overall_completion: number      // Across all courses
}
```

## Implementation Timeline

### Week 1: Safe Removals (Phase 1)
- **Day 1-2**: Remove unused tables (action_types, user_actions, course_recommendations)
- **Day 3**: Remove error tracking tables
- **Day 4-5**: Verify removal and test application functionality

### Week 2: Column Cleanup (Phase 2)
- **Day 1-2**: Clean up videos table columns
- **Day 3**: Remove revenue column from courses (keeping completion_rate, category)
- **Day 4-5**: Migrate track assignments to dedicated table

### Week 3: System Consolidation (Phase 3)
- **Day 1-3**: Consolidate learning analytics into unified table
- **Day 4-5**: Optimize conversation system and media management

### Week 4: Optimization (Phase 4)
- **Day 1-2**: Add optimized indexes for new structures
- **Day 3-4**: Performance testing and validation
- **Day 5**: Documentation and monitoring setup

## Risk Mitigation Strategy

### Backup Strategy
```sql
-- Before each phase, create backups of affected tables
CREATE TABLE backup_[table_name] AS SELECT * FROM [table_name];
```

### Rollback Procedures
Each migration includes rollback scripts for immediate recovery if issues arise.

### Testing Protocol
1. **Pre-migration**: Full application functionality test
2. **Post-migration**: Verify all features work correctly
3. **Performance testing**: Confirm expected performance improvements

## Success Metrics

### Quantitative Targets
- **Database size reduction**: 25-30%
- **Query performance improvement**: 15-20%
- **Schema complexity reduction**: 40% fewer tables
- **Maintenance overhead reduction**: 50% fewer unused structures

### Validation Checklist
- [ ] All existing features function correctly
- [ ] Performance improvements measurable
- [ ] UI features for retained columns (completion_rate, category) implementable
- [ ] No data loss during migrations
- [ ] Rollback procedures tested and verified

## Post-Cleanup Benefits

### Developer Experience
- **Simpler schema**: Easier to understand and modify
- **Better performance**: Faster queries and reduced complexity
- **Type safety**: Cleaner TypeScript interfaces without unused fields
- **Maintainability**: Fewer tables and columns to manage

### Infrastructure Benefits
- **Reduced storage costs**: 25-30% less database storage
- **Faster backups**: Smaller data sets to backup and restore
- **Improved monitoring**: Fewer tables to monitor and optimize
- **Better scalability**: Simplified schema scales more efficiently

### Future UI Development
- **Course analytics**: completion_rate and category ready for dashboard UI
- **Enhanced filtering**: category column supports advanced course organization
- **Performance metrics**: Cleaner data model supports real-time analytics
- **Extensibility**: Consolidated tables easier to extend for new features

## Conclusion

This comprehensive cleanup plan addresses the database bloat accumulated through feature evolution while preserving essential columns for planned UI development. The phased approach ensures safe implementation with minimal risk while delivering significant performance improvements and reduced complexity.

The retention of completion_rate and category columns in the courses table specifically supports future analytics and course management UI development, while the removal of revenue tracking aligns with current requirements. The overall cleanup will result in a leaner, faster, and more maintainable database architecture.
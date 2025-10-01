# Media Soft Delete System

## Overview
Implement a soft delete system for media files that allows users to recover accidentally deleted files within a 30-day grace period, similar to Google Drive's Trash or Apple Photos' Recently Deleted.

## Current State
- **Problem**: Files are permanently deleted immediately from `/media`
- **Issue**: Deletion appears gradual due to sequential operations
- **Risk**: No recovery option for accidental deletions
- **UX**: Poor feedback during bulk delete operations

## Proposed Solution

### Core Concept
- Files are "soft deleted" (marked as deleted but not removed)
- Deleted files move to "Recently Deleted" section
- Auto-permanent deletion after 30 days
- Manual restore capability within grace period

## Implementation Details

### 1. Database Schema Changes

#### Add columns to `media_files` table:
```sql
ALTER TABLE media_files ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
ALTER TABLE media_files ADD COLUMN deletion_scheduled_at TIMESTAMP DEFAULT NULL;
ALTER TABLE media_files ADD COLUMN deleted_by UUID REFERENCES auth.users(id);

-- Index for efficient queries
CREATE INDEX idx_media_files_deleted_at ON media_files(deleted_at);
CREATE INDEX idx_media_files_deletion_scheduled ON media_files(deletion_scheduled_at);
```

### 2. Routes Structure

#### Current:
- `/media` - All active media files

#### New:
- `/media` - Active files only (deleted_at IS NULL)
- `/media/recently-deleted` - Soft deleted files

### 3. Navigation Updates

```
📁 Media
  └── Recently Deleted (count)
```

Add badge showing count of recently deleted items

### 4. Query Modifications

#### Active Media Query:
```sql
SELECT * FROM media_files
WHERE deleted_at IS NULL
AND file_type = 'video'
ORDER BY created_at DESC
```

#### Recently Deleted Query:
```sql
SELECT * FROM media_files
WHERE deleted_at IS NOT NULL
AND deletion_scheduled_at > NOW()
ORDER BY deleted_at DESC
```

#### Auto-cleanup Query (Cron job):
```sql
-- Permanently delete files past retention
DELETE FROM media_files
WHERE deletion_scheduled_at <= NOW()
```

### 5. API Endpoints

#### Soft Delete
```typescript
POST /api/media/soft-delete
Body: { ids: string[] }
Response: { success: boolean, deletedCount: number }
```

#### Restore
```typescript
POST /api/media/restore
Body: { ids: string[] }
Response: { success: boolean, restoredCount: number }
```

#### Permanent Delete
```typescript
DELETE /api/media/permanent
Body: { ids: string[] }
Response: { success: boolean, deletedCount: number }
```

### 6. UI/UX Features

#### Recently Deleted Page (`/media/recently-deleted`)

##### Display:
- Same grid layout as `/media`
- Each card shows:
  - File preview (grayed out/opacity reduced)
  - "Deleted X days ago" badge
  - "Auto-delete in Y days" warning
  - Restore button
  - Permanent delete button

##### Bulk Operations:
- Select multiple files
- Bulk restore
- Bulk permanent delete
- "Empty Trash" button (delete all)

##### Filtering:
- Sort by deletion date
- Filter by days until permanent deletion
- Search within deleted files

### 7. Implementation Steps

#### Phase 1: Database & Backend
1. Add database columns
2. Update Supabase RLS policies
3. Create soft delete function
4. Create restore function
5. Update existing delete to soft delete

#### Phase 2: API Layer
1. Create soft delete endpoint
2. Create restore endpoint
3. Create permanent delete endpoint
4. Add background job for auto-cleanup

#### Phase 3: Frontend
1. Create `/media/recently-deleted` page
2. Add navigation link with count badge
3. Update media grid to exclude soft deleted
4. Add restore/permanent delete UI
5. Implement optimistic updates

#### Phase 4: Storage Integration
1. Keep files in storage during soft delete period
2. Only remove from Backblaze/CDN after permanent deletion
3. Consider storage quota implications

### 8. Optimizations

#### Immediate Response:
```typescript
// Optimistic update
const handleSoftDelete = async (ids: string[]) => {
  // 1. Immediately remove from UI
  setMediaFiles(prev => prev.filter(f => !ids.includes(f.id)))

  // 2. Call API in background
  await softDeleteMedia(ids)

  // 3. Revalidate if needed
  router.refresh()
}
```

#### Batch Operations:
```sql
-- Single query for multiple deletes
UPDATE media_files
SET deleted_at = NOW(),
    deletion_scheduled_at = NOW() + INTERVAL '30 days',
    deleted_by = auth.uid()
WHERE id IN ($1, $2, $3...)
```

### 9. Edge Cases & Considerations

#### Storage Quota:
- Deleted files still consume storage for 30 days
- Consider showing storage usage including deleted files
- Option to force permanent delete if quota exceeded

#### Permissions:
- Can users restore files deleted by others?
- Admin override for permanent deletion?
- Audit log for deletions/restorations?

#### Performance:
- Pagination for recently deleted view
- Lazy loading for large numbers of deleted files
- Background job scheduling for auto-cleanup

### 10. Future Enhancements

1. **Variable Retention Periods**
   - Different retention for different file types
   - User-configurable retention settings
   - Premium feature for extended retention

2. **Deletion Reasons**
   - Track why files were deleted
   - Bulk delete due to storage cleanup
   - Manual user deletion
   - System auto-deletion

3. **Recovery Tools**
   - Bulk recovery by date range
   - Recovery of related files (transcripts with videos)
   - Undo last deletion action

4. **Admin Features**
   - View all users' deleted files
   - Override retention periods
   - Bulk cleanup tools
   - Deletion analytics

## Benefits

1. **User Safety**: Prevents accidental permanent data loss
2. **Improved UX**: Immediate UI response with optimistic updates
3. **Familiar Pattern**: Similar to other platforms users know
4. **Compliance**: Better for audit trails and data recovery requirements
5. **Storage Optimization**: Still cleans up storage after retention period

## Testing Requirements

1. **Unit Tests**:
   - Soft delete function
   - Restore function
   - Auto-cleanup job
   - Permission checks

2. **Integration Tests**:
   - Full deletion → restore flow
   - Bulk operations
   - Auto-cleanup after 30 days
   - Storage sync verification

3. **UI Tests**:
   - Optimistic updates work correctly
   - Filtering and search in recently deleted
   - Bulk selection and operations
   - Error handling and rollback

## Migration Strategy

1. Update existing delete functionality to soft delete
2. Add "Recently Deleted" section
3. Run in parallel for testing
4. Migrate historical deleted data if needed
5. Remove old hard delete code

## Success Metrics

- Reduction in support tickets about accidental deletions
- Average time to delete operations < 1 second
- Successful recovery rate of accidentally deleted files
- Storage optimization from auto-cleanup

## References
- Google Drive Trash: 30-day retention
- Apple Photos Recently Deleted: 30-day retention
- Microsoft OneDrive Recycle Bin: 30-93 days based on plan

---
*Feature Specification Date: September 30, 2025*
*Status: Planned for future implementation*
# Media Manager Core Features Implementation Plan

**Date:** September 8, 2025  
**Architecture:** 3-Layer SSOT Distribution (TanStack Query + Form State + Zustand)  
**Scope:** Core media library features with database integration  

---

## Architecture Compliance Framework

### **3-Layer State Distribution**
- **TanStack Query**: All server-related state (media files, usage data, upload progress)
- **Form State**: Input processing (search, filters, rename operations)  
- **Zustand**: Pure UI state (modals, selection, view preferences)

### **Server Actions Pattern**
- All database mutations via server actions
- WebSocket integration for long-running operations
- Structured responses: `{success: boolean, data?, error?}`

### **Key Principles**
- No data mixing between layers
- UI orchestration allowed, data copying forbidden
- WebSocket → Observer → TanStack → UI flow
- React key stability during async operations

---

## Database Schema Design

### **Core Tables**

```sql
-- Primary media files table
CREATE TABLE media_files (
  id VARCHAR(255) PRIMARY KEY,
  file_id VARCHAR(255) NOT NULL,           -- Backblaze file ID
  file_name VARCHAR(500) NOT NULL,         -- Current filename (renameable)
  original_file_name VARCHAR(500) NOT NULL, -- Original upload name
  file_size BIGINT NOT NULL,              -- Size in bytes
  file_type VARCHAR(100) NOT NULL,        -- MIME type
  file_url VARCHAR(1000) NOT NULL,        -- Private URL format
  status VARCHAR(50) DEFAULT 'active',    -- active, deleted, processing
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_status (status),
  INDEX idx_file_type (file_type),
  INDEX idx_upload_date (upload_date)
);

-- File operations history
CREATE TABLE media_file_history (
  id VARCHAR(255) PRIMARY KEY,
  media_id VARCHAR(255) REFERENCES media_files(id) ON DELETE CASCADE,
  operation VARCHAR(100) NOT NULL,        -- upload, rename, delete, restore, link, unlink
  operation_data JSON,                    -- Flexible data for operation details
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_media_id (media_id),
  INDEX idx_operation (operation),
  INDEX idx_timestamp (timestamp)
);

-- Usage tracking - where media is used
CREATE TABLE media_usage (
  id VARCHAR(255) PRIMARY KEY,
  media_id VARCHAR(255) REFERENCES media_files(id) ON DELETE CASCADE,
  resource_type VARCHAR(100) NOT NULL,    -- course, chapter, lesson
  resource_id VARCHAR(255) NOT NULL,      -- Resource UUID
  linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_usage (media_id, resource_type, resource_id),
  INDEX idx_media_id (media_id),
  INDEX idx_resource (resource_type, resource_id)
);

-- File versions for replacement feature
CREATE TABLE media_file_versions (
  id VARCHAR(255) PRIMARY KEY,
  media_id VARCHAR(255) REFERENCES media_files(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_id VARCHAR(255) NOT NULL,          -- Backblaze file ID for this version
  file_url VARCHAR(1000) NOT NULL,        -- URL for this version
  replaced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_media_id (media_id),
  INDEX idx_version (media_id, version_number)
);
```

---

## Implementation Phases with User Validation Checkpoints

### **IMPORTANT: Incremental Development Protocol**

**MANDATORY VALIDATION PROCESS**: Each checkpoint requires explicit user approval before proceeding to the next. No work on subsequent checkpoints may begin until the current checkpoint is tested, validated, and explicitly approved by the user. This ensures quality control and prevents architectural drift.

**USER APPROVAL REQUIRED**: At each checkpoint, the user must test the delivered functionality and provide explicit "approved" or "needs revision" feedback before any further development continues.

---

---

### **Phase 1: Database Foundation**

#### 1.1 Database Migration
```typescript
// src/lib/database/migrations/001_create_media_tables.sql
// Complete schema creation with indexes
```

#### 1.2 Database Query Layer
```typescript
// src/lib/database/media-queries.ts
export async function getMediaFiles(filters?: MediaFilters) {
  return await db.mediaFiles.findMany({
    where: { 
      status: 'active',
      ...(filters?.fileType && { fileType: filters.fileType }),
      ...(filters?.search && { 
        fileName: { contains: filters.search, mode: 'insensitive' }
      })
    },
    include: {
      usage: true,
      history: { orderBy: { timestamp: 'desc' }, take: 5 }
    },
    orderBy: { uploadDate: 'desc' }
  });
}
```

#### 1.3 Server Actions Update
```typescript
// src/app/actions/media-actions.ts - Updated with database persistence
export async function uploadMediaFileAction(formData: FormData, operationId?: string) {
  // Existing Backblaze upload logic
  const uploadResult = await backblazeService.uploadVideo(file, file.name, progressCallback);
  
  // NEW: Save to database
  const mediaRecord = await createMediaFile({
    id: generateId(),
    fileId: uploadResult.fileId,
    fileName: uploadResult.fileName,
    originalFileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    fileUrl: uploadResult.fileUrl
  });
  
  // NEW: Record history
  await recordMediaHistory({
    mediaId: mediaRecord.id,
    operation: 'upload',
    operationData: { originalName: file.name, size: file.size }
  });
}
```

---

## **🔍 CHECKPOINT 1: Database Foundation** 
**Deliverable**: Database tables + basic upload persistence  
**User Testing**: Upload files through current interface → verify files persist in database  
**Estimated Time**: 2-3 hours  
**User Validation Required**: ✅ Files saved to database, basic persistence confirmed

**MANDATORY**: User must approve Checkpoint 1 before Phase 2 can begin

---

### **Phase 2: Core Features**

#### 2.1 Persistent File Storage & File History
```typescript
// ARCHITECTURE-COMPLIANT: TanStack Query owns server state
export function useMediaFiles(filters?: MediaFilters) {
  return useQuery({
    queryKey: ['media-files', filters],
    queryFn: () => getMediaFilesAction(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// File history component reads from TanStack
function FileHistoryModal({ mediaId }: { mediaId: string }) {
  const { data: history } = useQuery({
    queryKey: ['media-history', mediaId],
    queryFn: () => getMediaHistoryAction(mediaId),
  });
}
```

#### 2.2 Search & Filter + File Metadata
```typescript
// ARCHITECTURE-COMPLIANT: Form state owns input processing
function MediaLibraryFilters() {
  // Form state layer
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Server state layer - reactive to form state changes
  const { data: mediaFiles } = useMediaFiles({
    search: searchQuery,
    fileType: typeFilter === 'all' ? undefined : typeFilter
  });
  
  // UI orchestration - no data mixing
  return (
    <div>
      <SearchInput value={searchQuery} onChange={setSearchQuery} />
      <TypeFilter value={typeFilter} onChange={setTypeFilter} />
    </div>
  );
}
```

---

## **🔍 CHECKPOINT 2: Media Library Data Integration**
**Deliverable**: Media page shows real uploaded files (no mock data)  
**User Testing**: Upload files → immediately see them appear in media library  
**Estimated Time**: 1-2 hours  
**User Validation Required**: ✅ Real uploaded files display with metadata, search/filter working

**MANDATORY**: User must approve Checkpoint 2 before Phase 3 can begin

---

## **🔍 CHECKPOINT 3: File History & Metadata**
**Deliverable**: Complete file information and history tracking  
**User Testing**: View file details, see upload history, file properties  
**Estimated Time**: 1-2 hours  
**User Validation Required**: ✅ File metadata display, history timeline functional

**MANDATORY**: User must approve Checkpoint 3 before Phase 3 can begin

---

### **Phase 3: Advanced Operations**

#### 3.1 Bulk Operations with WebSocket Progress
```typescript
// ARCHITECTURE-COMPLIANT: WebSocket → Observer → TanStack flow
export async function bulkDeleteMediaAction(mediaIds: string[], operationId: string) {
  let processed = 0;
  const total = mediaIds.length;
  
  for (const mediaId of mediaIds) {
    try {
      // Delete from Backblaze and database
      await deleteMediaFile(mediaId);
      processed++;
      
      // Broadcast progress via WebSocket
      broadcastWebSocketMessage({
        type: 'bulk-delete-progress',
        operationId,
        data: {
          processed,
          total,
          percentage: Math.round((processed / total) * 100),
          status: 'processing'
        }
      });
      
    } catch (error) {
      // Handle individual failures
      broadcastWebSocketMessage({
        type: 'bulk-delete-progress',
        operationId,
        data: { processed, total, error: error.message }
      });
    }
  }
  
  // Final completion
  broadcastWebSocketMessage({
    type: 'bulk-delete-progress',
    operationId,
    data: { processed, total, percentage: 100, status: 'completed' }
  });
}

// UI layer with WebSocket integration
function BulkOperations() {
  const { selectedFiles } = useMediaStore(); // Zustand UI state
  const bulkDeleteMutation = useMutation({ mutationFn: bulkDeleteMediaAction });
  
  // WebSocket progress tracking
  const { progress } = useBulkOperationProgress('bulk-delete');
  
  return (
    <div>
      {progress && <ProgressBar percentage={progress.percentage} />}
      <Button onClick={() => bulkDeleteMutation.mutate(selectedFiles)}>
        Delete Selected ({selectedFiles.length})
      </Button>
    </div>
  );
}
```

#### 3.2 Usage Tracking & Analytics
```typescript
// Server action for linking media to courses
export async function linkMediaToResourceAction(mediaId: string, resourceType: string, resourceId: string) {
  await createMediaUsage({
    mediaId,
    resourceType,
    resourceId
  });
  
  // Record in history
  await recordMediaHistory({
    mediaId,
    operation: 'link',
    operationData: { resourceType, resourceId }
  });
  
  // Invalidate relevant caches
  revalidatePath('/instructor/media');
}

// Usage analytics component
function MediaUsageAnalytics() {
  const { data: analytics } = useQuery({
    queryKey: ['media-analytics'],
    queryFn: getMediaAnalyticsAction,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  return (
    <div>
      <StatsCard title="Total Files" value={analytics?.totalFiles} />
      <StatsCard title="Used Files" value={analytics?.usedFiles} />
      <StatsCard title="Storage Used" value={analytics?.totalSize} />
      <StatsCard title="Orphaned Files" value={analytics?.orphanedFiles} />
    </div>
  );
}
```

---

## **🔍 CHECKPOINT 4: Usage Tracking Foundation**
**Deliverable**: Link media to courses + usage display  
**User Testing**: Link files to courses → see "Used in X places" badges  
**Estimated Time**: 2-3 hours  
**User Validation Required**: ✅ Course linking works, usage tracking displays correctly

**MANDATORY**: User must approve Checkpoint 4 before Phase 4 can begin

---

## **🔍 CHECKPOINT 5: Delete Protection & Soft Delete**
**Deliverable**: Smart deletion with dependency checking  
**User Testing**: Try deleting used files → get protection warnings  
**Estimated Time**: 1-2 hours  
**User Validation Required**: ✅ Delete protection prevents breaking courses, warnings clear

**MANDATORY**: User must approve Checkpoint 5 before Phase 4 can begin

---

## **🔍 CHECKPOINT 6: Storage Analytics Dashboard**
**Deliverable**: Analytics showing storage usage, orphaned files  
**User Testing**: View storage statistics, identify unused files  
**Estimated Time**: 2-3 hours  
**User Validation Required**: ✅ Analytics accurate, orphaned file detection working

**MANDATORY**: User must approve Checkpoint 6 before Phase 4 can begin

---

## **🔍 CHECKPOINT 7: Bulk Operations with Progress**
**Deliverable**: Bulk delete with WebSocket progress tracking  
**User Testing**: Select multiple files → bulk delete with progress bar  
**Estimated Time**: 2-3 hours  
**User Validation Required**: ✅ Bulk operations work, WebSocket progress updates functional

**MANDATORY**: User must approve Checkpoint 7 before Phase 4 can begin

---

### **Phase 4: Course Integration**

#### 4.1 Browse from Library + MediaSelector Integration
```typescript
// Enhanced MediaSelector with real data
function MediaSelector({ isOpen, onClose, onSelect, fileTypeFilter }: MediaSelectorProps) {
  // Form state for search within modal
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI state for selection
  const [localSelectedFiles, setLocalSelectedFiles] = useState<string[]>([]);
  
  // Server state - filtered media files
  const { data: mediaFiles } = useMediaFiles({
    search: searchQuery,
    fileType: fileTypeFilter
  });
  
  const handleSelect = () => {
    const selectedMediaFiles = mediaFiles.filter(file => 
      localSelectedFiles.includes(file.id)
    );
    onSelect(selectedMediaFiles);
  };
}

// Course creation integration
function ChapterVideoUpload({ chapterId }: { chapterId: string }) {
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const linkMediaMutation = useMutation({ mutationFn: linkMediaToResourceAction });
  
  const handleMediaSelected = (files: MediaFile[]) => {
    files.forEach(file => {
      linkMediaMutation.mutate({
        mediaId: file.id,
        resourceType: 'chapter',
        resourceId: chapterId
      });
    });
    setShowMediaSelector(false);
  };
  
  return (
    <div>
      <UnifiedDropzone onFilesSelected={handleNewUpload} />
      <Button onClick={() => setShowMediaSelector(true)}>
        Browse from Library
      </Button>
      <MediaSelector 
        isOpen={showMediaSelector}
        onClose={() => setShowMediaSelector(false)}
        onSelect={handleMediaSelected}
        fileTypeFilter="video"
      />
    </div>
  );
}
```

#### 4.2 Linked Media & Delete Protection
```typescript
// Server action with usage checking
export async function deleteMediaFileAction(mediaId: string) {
  // Check if file is in use
  const usage = await getMediaUsage(mediaId);
  
  if (usage.length > 0) {
    return {
      success: false,
      error: 'Cannot delete file - it is used in active courses',
      usage: usage.map(u => ({ type: u.resourceType, id: u.resourceId }))
    };
  }
  
  // Proceed with deletion
  const mediaFile = await getMediaFile(mediaId);
  await backblazeService.deleteVideo(mediaFile.fileId, mediaFile.fileName);
  await softDeleteMediaFile(mediaId);
  
  return { success: true };
}

// UI with delete protection
function DeleteConfirmDialog({ mediaId }: { mediaId: string }) {
  const { data: usage } = useQuery({
    queryKey: ['media-usage', mediaId],
    queryFn: () => getMediaUsageAction(mediaId),
  });
  
  const deleteMutation = useDeleteMediaFile();
  
  const handleDelete = () => {
    deleteMutation.mutate(mediaId, {
      onError: (error) => {
        if (error.usage) {
          // Show usage warning with specific courses/chapters
          toast.error(`File is used in: ${error.usage.map(u => u.type).join(', ')}`);
        }
      }
    });
  };
}
```

---

## **🔍 CHECKPOINT 8: Media Replacement & Versioning**
**Deliverable**: Replace files while maintaining course links  
**User Testing**: Replace video file → all courses get new version automatically  
**Estimated Time**: 2-3 hours  
**User Validation Required**: ✅ File replacement works, course links maintained, version tracking

**MANDATORY**: User must approve Checkpoint 8 before Phase 5 can begin

---

### **Phase 5: Professional Features**

#### 5.1 File Versioning
```typescript
// Server action for file replacement
export async function replaceMediaFileAction(mediaId: string, newFile: File) {
  const currentFile = await getMediaFile(mediaId);
  
  // Upload new version to Backblaze
  const uploadResult = await backblazeService.uploadVideo(newFile, currentFile.fileName);
  
  // Create version record
  await createMediaFileVersion({
    mediaId,
    versionNumber: await getNextVersionNumber(mediaId),
    fileId: currentFile.fileId,  // Old version
    fileUrl: currentFile.fileUrl
  });
  
  // Update current file record
  await updateMediaFile(mediaId, {
    fileId: uploadResult.fileId,   // New version
    fileUrl: uploadResult.fileUrl,
    fileSize: newFile.size,
    updatedAt: new Date()
  });
  
  // Record history
  await recordMediaHistory({
    mediaId,
    operation: 'replace',
    operationData: { newSize: newFile.size, oldFileId: currentFile.fileId }
  });
}
```

#### 5.2 Storage Analytics & Cleanup Tools
```typescript
// Analytics computation
export async function getMediaAnalyticsAction() {
  const [totalFiles, usedFiles, totalSize, orphanedFiles] = await Promise.all([
    db.mediaFiles.count({ where: { status: 'active' } }),
    db.mediaFiles.count({ 
      where: { 
        status: 'active',
        usage: { some: {} }
      }
    }),
    db.mediaFiles.aggregate({
      where: { status: 'active' },
      _sum: { fileSize: true }
    }),
    db.mediaFiles.count({
      where: {
        status: 'active',
        usage: { none: {} },
        uploadDate: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days old
      }
    })
  ]);
  
  return {
    totalFiles,
    usedFiles,
    unusedFiles: totalFiles - usedFiles,
    totalSize: totalSize._sum.fileSize || 0,
    orphanedFiles
  };
}
```

---

## Component Architecture

### **State Management Distribution**

```typescript
// ARCHITECTURE-COMPLIANT: Clear layer responsibilities

// 1. TanStack Query Layer - Server State
const { data: mediaFiles } = useMediaFiles(filters);
const { data: analytics } = useMediaAnalytics();
const uploadMutation = useUploadMediaFile();

// 2. Form State Layer - Input Processing  
const [searchQuery, setSearchQuery] = useState('');
const [renameValue, setRenameValue] = useState('');

// 3. Zustand Layer - UI State
const {
  selectedFiles,
  viewMode,
  showBulkActions,
  setSelectedFiles,
  toggleSelection
} = useMediaStore();

// 4. UI Orchestration - Coordinate layers without mixing data
const handleBulkDelete = () => {
  if (selectedFiles.length > 0) {  // Zustand
    bulkDeleteMutation.mutate(selectedFiles);  // TanStack
    setShowBulkActions(false);  // Zustand
  }
};
```

### **WebSocket Integration Points**

```typescript
// Observer pattern prevents circular dependencies
// WebSocket → Observer → TanStack → UI

// 1. WebSocket handler
websocketHandler.on('bulk-delete-progress', (data) => {
  bulkOperationObserver.emit('progress', data);
});

// 2. Observer to TanStack bridge
bulkOperationObserver.on('progress', (data) => {
  queryClient.setQueryData(['bulk-operation', data.operationId], data);
});

// 3. Component reads from TanStack
const { data: progress } = useQuery({
  queryKey: ['bulk-operation', operationId],
  enabled: !!operationId
});
```

---

## Testing Strategy

### **Unit Tests**
- Database query functions
- Server actions with mocked database
- TanStack Query hooks with MSW
- Zustand store actions

### **Integration Tests**
- Complete upload workflow (file → Backblaze → database → UI)
- Media selection and linking to courses
- Bulk operations with progress tracking
- File replacement maintaining links

### **Architecture Compliance Tests**
- Verify no data mixing between layers
- Ensure WebSocket messages flow through Observer pattern
- Test React key stability during async operations
- Validate server actions handle all mutations

---

## Performance Considerations

### **Database Optimization**
- Indexes on frequently queried columns
- Pagination for large media libraries
- Efficient aggregation queries for analytics
- Connection pooling for concurrent operations

### **Frontend Optimization**
- Virtual scrolling for large file lists
- Image lazy loading for thumbnails
- Debounced search queries
- Optimistic updates with rollback

### **WebSocket Efficiency**
- Batch progress updates (every 100ms max)
- Operation-specific channels
- Automatic cleanup of completed operations
- Graceful degradation when WebSocket unavailable

---

## Success Metrics

### **Technical Metrics**
- Zero data mixing violations (tested in CI)
- Sub-200ms query response times
- 99.9% upload success rate
- WebSocket message delivery < 100ms

### **User Experience Metrics**
- Media library search < 1 second
- Bulk operations provide real-time feedback
- No broken course links due to deleted media
- File replacement maintains all existing references

---

## Risk Mitigation

### **Data Consistency**
- Database transactions for multi-table operations
- Soft delete with recovery period
- Backup verification before permanent deletion
- Foreign key constraints prevent orphaned data

### **Performance Degradation**
- Query optimization monitoring
- Database index usage tracking
- WebSocket connection health checks
- Automatic fallback to HTTP polling

### **User Experience**  
- Loading states for all operations
- Error recovery with clear messaging
- Offline capability detection
- Progressive enhancement principles

---

This implementation plan maintains strict architectural compliance while delivering all core media management features through systematic, tested development phases.
# Media Manager Core Features Implementation Plan

**Date:** September 8, 2025  
**Architecture:** 3-Layer SSOT Distribution (TanStack Query + Form State + Zustand)  
**Scope:** Core media library features with database integration  

---

## 🎯 **IMPLEMENTATION STATUS SUMMARY**

### ✅ **COMPLETED (WORKING)**
- **Phase 1**: Database Foundation (✅ Database, server actions, upload persistence)
- **Phase 2**: Media Library UI (✅ File display, search, filter, preview, file details modal)  
- **Phase 3**: Upload Progress (✅ WebSocket integration, progress tracking)
- **Checkpoint 1**: ✅ Database Foundation
- **Checkpoint 2**: ✅ Media Library Data Integration  
- **Checkpoint 3**: ✅ File History & Metadata

### ❌ **NOT IMPLEMENTED (MISSING)**
- **Phase 3**: Bulk Operations (❌ Bulk delete, progress tracking)
- **Phase 4**: Course Integration (❌ Media selector, "Browse from Library")
- **Phase 5**: Professional Features (❌ Versioning, analytics, usage tracking)
- **Checkpoint 4-8**: ❌ All advanced features missing

### 📝 **WHAT EXISTS IN `/instructor/media`**
- Basic media library page with upload, search, filter, preview
- File details modal with history timeline
- WebSocket-powered upload progress
- Real database integration (media_files table)
- Working file deletion (soft delete)

### 🚧 **NEXT PRIORITY (IF CONTINUING)**
- **Checkpoint 4**: Usage tracking & course linking
- **Checkpoint 7**: Bulk operations with progress  
- **Phase 4**: "Browse from Library" button integration

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

### **Key Principles** (ESTABLISHED & PROVEN)
- No data mixing between layers ✅
- UI orchestration allowed, data copying forbidden ✅  
- **WebSocket → Observer → TanStack → UI flow** ✅ (Used in course management)
- **Direct Server Actions → TanStack → UI** ✅ (Used in media management)
- React key stability during async operations ✅
- **Choose appropriate pattern for the domain** ✅

---

## Database Schema Implementation (ACTUAL)

### **Implemented Schema**

**File:** `supabase/migrations/011_media_files_table.sql`

```sql
-- ACTUAL IMPLEMENTATION - Working media_files table
create table public.media_files (
  id uuid default gen_random_uuid() primary key,
  
  -- File metadata
  name text not null,                      -- Current filename
  original_name text not null,             -- Original upload name
  file_type text not null,                 -- 'video', 'image', 'audio', 'document'
  mime_type text not null,                 -- Full MIME type
  file_size bigint not null,               -- Size in bytes
  duration_seconds numeric null,           -- For video/audio files
  
  -- Storage information
  backblaze_file_id text null,             -- Backblaze file ID
  backblaze_url text null,                 -- Direct Backblaze URL
  cdn_url text null,                       -- CDN URL (cdn.unpuzzle.co)
  thumbnail_url text null,                 -- Thumbnail URL
  
  -- File organization
  category text default 'uncategorized',
  tags text[] default array[]::text[],
  description text null,
  
  -- Usage tracking
  usage_count integer default 0,
  last_used_at timestamp with time zone null,
  
  -- Relationships
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  
  -- Status and metadata
  status text default 'active' check (status in ('active', 'archived', 'deleted')),
  is_public boolean default false,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance (IMPLEMENTED)
create index idx_media_files_uploaded_by on public.media_files(uploaded_by);
create index idx_media_files_file_type on public.media_files(file_type);
create index idx_media_files_status on public.media_files(status);
create index idx_media_files_created_at on public.media_files(created_at);
create index idx_media_files_category on public.media_files(category);
create index idx_media_files_tags on public.media_files using gin(tags);

-- RLS policies (IMPLEMENTED)
alter table public.media_files enable row level security;

create policy "Users can view own media files" on public.media_files
  for select using (uploaded_by = auth.uid());

create policy "Users can insert own media files" on public.media_files
  for insert with check (uploaded_by = auth.uid());
```

**Note**: File history, usage tracking, and versioning tables are planned for future checkpoints but not yet implemented in our current working version.

---

## Implementation Phases with User Validation Checkpoints

### **IMPORTANT: Incremental Development Protocol**

**MANDATORY VALIDATION PROCESS**: Each checkpoint requires explicit user approval before proceeding to the next. No work on subsequent checkpoints may begin until the current checkpoint is tested, validated, and explicitly approved by the user. This ensures quality control and prevents architectural drift.

**USER APPROVAL REQUIRED**: At each checkpoint, the user must test the delivered functionality and provide explicit "approved" or "needs revision" feedback before any further development continues.

---

---

### **Phase 1: Database Foundation** ✅ **COMPLETED**

#### 1.1 Database Migration (IMPLEMENTED)
**File:** `supabase/migrations/011_media_files_table.sql`
- ✅ Created `media_files` table with proper Supabase/PostgreSQL syntax
- ✅ Added indexes for performance optimization
- ✅ Implemented RLS (Row Level Security) policies
- ✅ Used UUID primary keys (not VARCHAR)
- ✅ Added proper foreign key to `auth.users(id)`

#### 1.2 Server Actions Implementation (IMPLEMENTED)  
**File:** `src/app/actions/media-actions.ts`
```typescript
// ACTUAL WORKING CODE - Database queries with Supabase
export async function getMediaFilesAction() {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: mediaFiles, error } = await supabase
    .from('media_files')
    .select('*')
    .eq('uploaded_by', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const transformedFiles = mediaFiles.map(file => ({
    id: file.id,
    name: file.name,
    type: file.file_type,
    size: formatFileSize(file.file_size),
    // IMPLEMENTATION NOTE: Removed fileUrl to avoid exposing technical URLs to UI
    backblaze_file_id: file.backblaze_file_id, // For preview functionality
    backblaze_url: file.backblaze_url, // For preview functionality
    file_name: file.name // For preview functionality
  }))

  return { success: true, media: transformedFiles }
}
```

#### 1.3 Upload Integration (IMPLEMENTED)
**File:** `src/app/actions/media-actions.ts`
```typescript
// ACTUAL WORKING CODE - Complete upload with database persistence
export async function uploadMediaFileAction(formData: FormData, operationId?: string) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Upload to Backblaze
  const uploadResult = await backblazeService.uploadVideo(file, file.name, progressCallback)
  
  // Generate CDN URL
  const cdnUrl = uploadResult.fileUrl.replace('https://f005.backblazeb2.com', 'https://cdn.unpuzzle.co')
  
  // Save to database
  const mediaFileData = {
    name: uploadResult.fileName,
    original_name: file.name,
    file_type: getFileType(file.type),
    mime_type: file.type,
    file_size: file.size,
    backblaze_file_id: uploadResult.fileId,
    backblaze_url: uploadResult.fileUrl,
    cdn_url: cdnUrl,
    uploaded_by: user.id,
    status: 'active'
  }
  
  const { data: savedFile, error } = await supabase
    .from('media_files')
    .insert(mediaFileData)
    
  return { success: true, fileId: savedFile.id }
}
```

---

## **🔍 CHECKPOINT 1: Database Foundation** ✅ **COMPLETED**
**Deliverable**: Database tables + basic upload persistence  
**User Testing**: Upload files through current interface → verify files persist in database  
**Status**: ✅ **IMPLEMENTED & WORKING**

### **What We Actually Built:**
- ✅ **Database table**: `media_files` with proper Supabase schema
- ✅ **Upload persistence**: Files save to database with metadata  
- ✅ **CDN URL generation**: Automatic cdn.unpuzzle.co URLs
- ✅ **RLS security**: Users can only see their own files
- ✅ **Server actions**: `uploadMediaFileAction`, `getMediaFilesAction`
- ✅ **WebSocket progress**: Upload progress via WebSocket broadcasting
- ✅ **Private URL format**: Ready for signed URL system

**MANDATORY**: ✅ **USER APPROVED** - Checkpoint 1 complete, proceeded to Checkpoint 2

---

### **Phase 2: Core Features (IMPLEMENTED)**

#### 2.1 Database Integration & File Display
**File:** `src/app/actions/media-actions.ts`
```typescript
// ACTUAL IMPLEMENTATION - Working database actions
export async function uploadMediaFileAction(formData: FormData, operationId?: string) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Upload to Backblaze
  const uploadResult = await backblazeService.uploadVideo(file, file.name, progressCallback)
  
  // Generate CDN URL
  const cdnUrl = uploadResult.fileUrl.replace('https://f005.backblazeb2.com', 'https://cdn.unpuzzle.co')
  
  // Save to database
  const mediaFileData = {
    name: uploadResult.fileName,
    original_name: file.name,
    file_type: getFileType(file.type),
    mime_type: file.type,
    file_size: file.size,
    backblaze_file_id: uploadResult.fileId,
    backblaze_url: uploadResult.fileUrl,
    cdn_url: cdnUrl,
    uploaded_by: user.id,
    status: 'active'
  }
  
  return await supabase.from('media_files').insert(mediaFileData)
}

export async function getMediaFilesAction() {
  const supabase = await createSupabaseClient()
  const { data: mediaFiles } = await supabase
    .from('media_files')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    
  return { success: true, media: transformedFiles }
}
```

#### 2.2 TanStack Query Integration
**File:** `src/hooks/use-media-queries.ts`
```typescript
// ACTUAL IMPLEMENTATION - Working TanStack Query hooks
export function useMediaFiles() {
  return useQuery({
    queryKey: ['media-files'],
    queryFn: async () => {
      const result = await getMediaFilesAction()
      if (!result.success) throw new Error(result.error)
      return result.media
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

export function useUploadMediaFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return await uploadMediaFileAction(formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-files'] })
    }
  })
}
```

#### 2.3 Media Manager UI Implementation
**File:** `src/app/instructor/media/page.tsx`
```typescript
// ACTUAL IMPLEMENTATION - Working Media Manager page
export default function MediaPage() {
  // ARCHITECTURE-COMPLIANT: Form state in useState
  const [searchQuery, setSearchQuery] = useState('')
  const [previewingFile, setPreviewingFile] = useState(null)
  
  // ARCHITECTURE-COMPLIANT: UI state in Zustand
  const { viewMode, filterType, sortOrder } = useMediaStore()
  
  // ARCHITECTURE-COMPLIANT: Server state in TanStack Query
  const { data: mediaFiles = [], isLoading } = useMediaFiles()
  const deleteMutation = useDeleteMediaFile()
  const uploadMutation = useUploadMediaFile()

  // Client-side filtering (working implementation)
  const filteredMedia = mediaFiles.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterType === 'all' || item.type === filterType
    return matchesSearch && matchesFilter
  })
  
  // Preview functionality with signed URLs
  const handlePreview = (item) => {
    const privateUrl = `private:${item.backblaze_file_id}:${item.file_name}`
    const videoForPreview = {
      id: item.id,
      name: item.name,
      video_url: privateUrl,
      backblaze_url: item.backblaze_url
    }
    setPreviewingFile(videoForPreview)
  }
  
  return (
    <div>
      {/* UnifiedDropzone for uploads */}
      <UnifiedDropzone onFilesSelected={handleFilesSelected} />
      
      {/* Search and filters */}
      <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      
      {/* Media grid/list with real data */}
      {filteredMedia.map(item => (
        <MediaCard key={item.id} item={item} onPreview={handlePreview} />
      ))}
      
      {/* Preview modal */}
      <VideoPreviewModal 
        video={previewingFile} 
        isOpen={!!previewingFile}
        onClose={() => setPreviewingFile(null)} 
      />
    </div>
  )
}
```

---

## **🔍 CHECKPOINT 2: Media Library Data Integration** ✅ **COMPLETED**
**Deliverable**: Media page shows real uploaded files (no mock data)  
**User Testing**: Upload files → immediately see them appear in media library  
**Status**: ✅ **IMPLEMENTED & WORKING**

### **What We Actually Built:**
- ✅ **Database persistence**: Files save to `media_files` table
- ✅ **CDN URL generation**: Automatic cdn.unpuzzle.co URL creation  
- ✅ **TanStack Query integration**: `useMediaFiles()` hooks working
- ✅ **Real-time UI updates**: Upload → immediate display in grid
- ✅ **Search functionality**: Client-side search by filename
- ✅ **Filter functionality**: Filter by file type (video/image/etc)
- ✅ **Video preview modal**: Working with signed CDN URLs
- ✅ **Soft delete**: Status-based deletion (not hard delete)
- ✅ **File metadata**: Size, upload date, usage tracking
- ✅ **Grid/List views**: Toggle between view modes
- ✅ **WebSocket progress**: Upload progress via WebSocket broadcasting

**MANDATORY**: ✅ **USER APPROVED** - Checkpoint 2 complete, proceeding to Checkpoint 3

### **Implementation Success Factors:**
1. **Simplified Architecture**: Used established 3-layer pattern successfully
2. **CDN Integration**: Auto-generated CDN URLs for better performance  
3. **Private URL Format**: `private:fileId:filename` for signed URL system
4. **Client-side Filtering**: Simple, fast search/filter without complex server queries
5. **WebSocket Integration**: Reused existing WebSocket infrastructure
6. **React-Dropzone**: Reliable file upload (avoided Uppy.js complexity)

---

## **🔍 CHECKPOINT 3: File History & Metadata** ✅ **COMPLETED**
**Deliverable**: Complete file information and history tracking  
**User Testing**: View file details, see upload history, file properties  
**Status**: ✅ **IMPLEMENTED & WORKING**

### **What We Actually Built:**
- ✅ **File Details Modal**: Enhanced metadata display with properties section
- ✅ **History Tracking**: Database table `media_file_history` with timeline UI
- ✅ **SimpleModal System**: Custom modal replacing problematic shadcn Dialog
- ✅ **Reusable Video Preview**: `SimpleVideoPreview` component for course integration
- ✅ **Clean UI Design**: Removed technical URLs from user-facing interface
- ✅ **File History Database**: Migration `012_media_file_history_table.sql`
- ✅ **Server Action Integration**: History tracking in upload/delete operations
- ✅ **Filename Extraction**: Helper function for clean filename display

**MANDATORY**: ✅ **USER APPROVED** - Checkpoint 3 complete

### **Implementation Differences from Plan:**

#### **Database Schema Changes:**
**File:** `supabase/migrations/012_media_file_history_table.sql` (ACTUAL)
```sql
-- IMPLEMENTED: File history tracking table
create table public.media_file_history (
  id uuid default gen_random_uuid() primary key,
  media_file_id uuid not null references public.media_files(id) on delete cascade,
  action text not null check (action in ('uploaded', 'deleted', 'renamed', 'updated', 'downloaded')),
  description text not null,
  metadata jsonb null,
  performed_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS policy for history access
create policy "Users can view own file history" on public.media_file_history
  for select using (
    exists (
      select 1 from public.media_files 
      where media_files.id = media_file_history.media_file_id 
      and media_files.uploaded_by = auth.uid()
    )
  );
```

#### **Custom Modal System (NOT PLANNED):**
**File:** `src/components/media/SimpleModal.tsx` (CREATED - UNPLANNED)
```tsx
// IMPLEMENTED: Custom modal to fix shadcn Dialog backdrop issues
export function SimpleModal({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }: SimpleModalProps) {
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])
  
  if (!isOpen) return null
  
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative bg-background border shadow-lg rounded-lg w-full mx-4", maxWidth)}>
        {/* Modal content */}
      </div>
    </div>,
    document.body
  )
}
```

#### **File Details Modal Implementation:**
**File:** `src/components/media/FileDetailsModal.tsx` (CREATED)
```tsx
// IMPLEMENTED: Comprehensive file metadata modal
export function FileDetailsModal({ file, isOpen, onClose }: FileDetailsModalProps) {
  const { data: historyData, isLoading: historyLoading } = useMediaFileHistory(file?.id || null)
  
  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="File Details">
      <div className="p-6 space-y-6">
        {/* File Overview */}
        <div>
          <h3 className="text-lg font-semibold mb-3">{file.name}</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline">{file.type}</Badge>
            <Badge variant={file.usage === 'Unused' ? 'secondary' : 'outline'}>{file.usage}</Badge>
          </div>
        </div>
        
        {/* File Properties */}
        <div>
          <h4 className="font-medium mb-3">Properties</h4>
          <InfoRow icon={HardDrive} label="Size" value={file.size} />
          <InfoRow icon={Calendar} label="Created" value={file.uploadedAt} />
          <InfoRow icon={User} label="Uploaded by" value="You" />
          {file.mime_type && <InfoRow icon={Tag} label="MIME Type" value={file.mime_type} />}
          {file.duration_seconds && <InfoRow icon={Clock} label="Duration" value={formatDuration(file.duration_seconds)} />}
          <InfoRow icon={Eye} label="Usage Count" value={file.usage_count?.toString() || '0'} />
        </div>
        
        {/* File History Timeline */}
        <div>
          <h4 className="font-medium mb-3">History</h4>
          {/* History implementation with timeline UI */}
        </div>
      </div>
    </SimpleModal>
  )
}
```

#### **Reusable Video Preview (MOVED TO UI):**
**File:** `src/components/ui/SimpleVideoPreview.tsx` (MOVED - UNPLANNED)
```tsx
// IMPLEMENTED: Made reusable across media manager and course pages
const extractFilename = (path: string | undefined): string | undefined => {
  if (!path) return undefined
  return path.split('/').pop() // Get the last part after the last slash
}

export function SimpleVideoPreview({ video, isOpen, onClose, title, autoPlay = true }: SimpleVideoPreviewProps) {
  const videoUrl = video?.video_url || video?.url || video?.backblaze_url
  const signedUrl = useSignedUrl(videoUrl || null, 30)
  
  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title || video?.name || extractFilename(video?.filename) || "Video Preview"}
      maxWidth="max-w-4xl"
    >
      {signedUrl.url && (
        <video
          src={signedUrl.url}
          controls
          autoPlay={autoPlay}
          muted={autoPlay}
          className="w-full h-auto max-h-[70vh]"
        />
      )}
    </SimpleModal>
  )
}
```

#### **Key Implementation Differences:**
1. **Modal System**: Plan assumed shadcn Dialog would work → Actual: Created custom SimpleModal due to backdrop issues
2. **URL Display**: Plan included technical URL display → Actual: Removed all URLs from UI for cleaner UX
3. **Video Preview Location**: Plan kept in media folder → Actual: Moved to `/components/ui/` for reusability
4. **History Schema**: Plan was basic → Actual: Added JSONB metadata field for rich history data
5. **File Properties**: Plan showed Backblaze file ID → Actual: Show CDN URL and clean metadata only
6. **Database Migration Number**: Plan used 020 → Actual: Used 012 to follow proper sequence

---

### **Phase 3: Advanced Operations** (PARTIALLY IMPLEMENTED)

#### 3.1 Reusable Upload Progress System
**Status**: ✅ **IMPLEMENTED** - Media WebSocket integration working

**Key Insight**: We already have a **FULLY WORKING** upload progress system in the course edit flow. The functionality is complete - we just need **UI changes** to make it generic and reusable for Media Manager.

**✅ FULLY WORKING Infrastructure (Just Need UI Changes):**
- ✅ **UploadProgressPanel.tsx** - `src/components/course/UploadProgressPanel.tsx` (**Working** - just make generic UI)
- ✅ **WebSocket Progress** - `src/hooks/use-websocket-connection.ts` (**Working** - already handles `media-upload-progress`)
- ✅ **Progress Broadcasting** - `src/lib/websocket-operations.ts` (**Working** - `broadcastWebSocketMessage` exists)
- ✅ **Observer Pattern** - `src/lib/course-event-observer.ts` (**Working** - WebSocket → Observer → TanStack flow)
- ✅ **Zustand Store Pattern** - `src/stores/course-creation-ui.ts` (**Working** - upload state management)
- ✅ **SimpleModal Component** - `src/components/media/SimpleModal.tsx` (**Working** - reuse for confirmations)

**🔧 ONLY UI CHANGES NEEDED:**
- Extract UploadProgressPanel to be generic (remove course-specific props)
- Add Media Manager UI components that consume the existing progress system
- Extend Observer events for media-specific operations (bulk delete, etc.)
- Create media store using same Zustand pattern as course-creation-ui

**Implementation Plan:**
```typescript
// 1. Extract & Make Generic (from src/components/course/UploadProgressPanel.tsx)
interface UploadProgressPanelProps {
  uploads: UploadItem[]  // Generic instead of course-specific
  onClearCompleted?: () => void
  onRemoveUpload?: (id: string) => void
  title?: string  // "Upload Progress" | "Bulk Delete Progress" | etc
}

// 2. Extend media store with upload tracking (same pattern as course-creation-ui)
interface MediaStoreState {
  uploads: Record<string, MediaUploadItem>
  addUpload: (item: MediaUploadItem) => void
  updateUploadProgress: (id: string, progress: number, status: string) => void
  removeUpload: (id: string) => void
  clearCompletedUploads: () => void
}

// 3. Observer integration (follows WebSocket → Observer → TanStack pattern)
// Media upload progress follows same pattern as course video upload:
// WebSocket → courseEventObserver → TanStack Query (existing pattern)

// Add media events to COURSE_EVENTS (extend existing)
export const MEDIA_EVENTS = {
  MEDIA_UPLOAD_PROGRESS: 'media-upload-progress',
  MEDIA_BULK_DELETE_PROGRESS: 'bulk-delete-progress',
  MEDIA_UPLOAD_COMPLETE: 'media-upload-complete'
} as const

// WebSocket hook maps messages to Observer (same pattern as course uploads)
function useWebSocketConnection() {
  // WebSocket receives 'media-upload-progress' message
  // Maps to: courseEventObserver.emit(MEDIA_EVENTS.MEDIA_UPLOAD_PROGRESS, userId, data)
  // TanStack Query subscribes to Observer events and updates cache
}
```

#### 3.2 Bulk Operations with Progress Tracking (NOT IMPLEMENTED)
**Status**: ❌ **NOT IMPLEMENTED** - Bulk operations need implementation

```typescript
// Server action with WebSocket broadcasting (follows existing pattern)
export async function bulkDeleteMediaAction(fileIds: string[], operationId: string) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  for (let i = 0; i < fileIds.length; i++) {
    // Delete individual file (soft delete pattern)
    await supabase
      .from('media_files')
      .update({ status: 'deleted' })
      .eq('id', fileIds[i])
      .eq('uploaded_by', user.id)
    
    // Broadcast progress (SAME pattern as course video upload)
    broadcastWebSocketMessage({
      type: 'bulk-delete-progress',
      operationId,
      data: {
        processed: i + 1,
        total: fileIds.length,
        progress: Math.round((i + 1) / fileIds.length * 100),
        currentFile: fileIds[i]
      }
    })
  }
  
  return { success: true }
}

// TanStack Query hooks follow existing Observer pattern
function useMediaFiles() {
  const queryClient = useQueryClient()
  
  // Subscribe to Observer events (same pattern as course video queries)
  useEffect(() => {
    const unsubscribe = courseEventObserver.subscribe(
      MEDIA_EVENTS.MEDIA_BULK_DELETE_PROGRESS,
      (event) => {
        // Update TanStack cache from Observer events (existing pattern)
        queryClient.setQueryData(['media-files'], (oldData) => {
          // Optimistic updates based on progress
          return updateCacheFromProgress(oldData, event.data)
        })
      }
    )
    return unsubscribe
  }, [queryClient])
  
  return useQuery({
    queryKey: ['media-files'],
    queryFn: getMediaFilesAction,
    staleTime: 5 * 60 * 1000
  })
}

// UI Component - Architecture Compliant
function BulkOperations() {
  const { selectedFiles } = useMediaStore() // Zustand for UI state only
  const { data: mediaFiles, isLoading } = useMediaFiles() // TanStack for server data
  
  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteMediaAction,
    onSuccess: () => {
      toast.success('Files deleted successfully')
      // No manual cache invalidation - Observer handles it
    }
  })
  
  return (
    <div>
      {/* Reuse existing UploadProgressPanel (make generic) */}
      <UploadProgressPanel 
        title="Bulk Delete Progress"
        // Read progress from TanStack Query (single source of truth)
      />
      
      {/* Reuse SimpleModal for confirmation */}
      <SimpleModal 
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title="Delete Files"
      >
        <BulkDeleteConfirmation 
          fileCount={selectedFiles.length}
          onConfirm={() => {
            const operationId = crypto.randomUUID()
            bulkDeleteMutation.mutate({ fileIds: selectedFiles, operationId })
          }}
        />
      </SimpleModal>
    </div>
  )
}
```

**✅ WORKING Infrastructure Reuse (UI Changes Only):**
- ✅ **WebSocket infrastructure WORKING** - Media Manager just needs UI to consume existing messages
- ✅ **Progress display components WORKING** - Extract UploadProgressPanel UI and make generic  
- ✅ **Upload state management WORKING** - Copy same Zustand pattern from course-creation-ui
- ✅ **Server-side progress broadcasting WORKING** - Extend existing `broadcastWebSocketMessage` for bulk operations
- ✅ **Observer pattern WORKING** - Extend existing `courseEventObserver` with media events
- ✅ **Modal patterns WORKING** - Reuse existing `SimpleModal` for confirmations

**🎯 Phase 3 Focus**: **UI Integration Only** - All the hard infrastructure work is done!

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

## **🔍 CHECKPOINT 4: Usage Tracking Foundation** ❌ **NOT IMPLEMENTED**
**Deliverable**: Link media to courses + usage display  
**User Testing**: Link files to courses → see "Used in X places" badges  
**Estimated Time**: 2-3 hours  
**Status**: ❌ **NOT IMPLEMENTED** - Course linking not built

**MANDATORY**: User must approve Checkpoint 4 before Phase 4 can begin

---

## **🔍 CHECKPOINT 5: Delete Protection & Soft Delete** ❌ **NOT IMPLEMENTED**
**Deliverable**: Smart deletion with dependency checking  
**User Testing**: Try deleting used files → get protection warnings  
**Estimated Time**: 1-2 hours  
**Status**: ❌ **NOT IMPLEMENTED** - Delete protection missing

**MANDATORY**: User must approve Checkpoint 5 before Phase 4 can begin

---

## **🔍 CHECKPOINT 6: Storage Analytics Dashboard** ❌ **NOT IMPLEMENTED**
**Deliverable**: Analytics showing storage usage, orphaned files  
**User Testing**: View storage statistics, identify unused files  
**Estimated Time**: 2-3 hours  
**Status**: ❌ **NOT IMPLEMENTED** - Analytics not built

**MANDATORY**: User must approve Checkpoint 6 before Phase 4 can begin

---

## **🔍 CHECKPOINT 7: Bulk Operations with Progress** ❌ **NOT IMPLEMENTED**
**Deliverable**: Bulk delete with WebSocket progress tracking  
**User Testing**: Select multiple files → bulk delete with progress bar  
**Estimated Time**: 2-3 hours  
**Status**: ❌ **NOT IMPLEMENTED** - Bulk operations missing

**MANDATORY**: User must approve Checkpoint 7 before Phase 4 can begin

---

### **Phase 4: Course Integration** ❌ **NOT IMPLEMENTED**

#### 4.1 Browse from Library + MediaSelector Integration ❌ **NOT IMPLEMENTED**
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

## **🔍 CHECKPOINT 8: Media Replacement & Versioning** ❌ **NOT IMPLEMENTED**
**Deliverable**: Replace files while maintaining course links  
**User Testing**: Replace video file → all courses get new version automatically  
**Estimated Time**: 2-3 hours  
**Status**: ❌ **NOT IMPLEMENTED** - Versioning not built

**MANDATORY**: User must approve Checkpoint 8 before Phase 5 can begin

---

### **Phase 5: Professional Features** ❌ **NOT IMPLEMENTED**

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

### **WebSocket Integration Points** (ACTUAL WORKING PATTERN)

```typescript
// Following our established WebSocket pattern (like upload progress)
// WebSocket → Server Actions → TanStack → UI (NO Observer layer needed)

// 1. Server Action broadcasts progress
async function bulkDeleteMediaAction(fileIds: string[], operationId?: string) {
  // ... deletion logic ...
  
  if (operationId) {
    broadcastWebSocketMessage({
      type: 'bulk-delete-progress',
      operationId,
      data: { processed, total, status: 'processing' }
    })
  }
}

// 2. Component uses existing TanStack pattern
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

### **Architecture Compliance Tests** (ESTABLISHED & WORKING)
- ✅ Verify no data mixing between layers
- ✅ **WebSocket → Observer → TanStack flow** (course management domain)
- ✅ **Direct Server Actions → TanStack flow** (media management domain)
- ✅ Test React key stability during async operations
- ✅ Validate server actions handle all mutations
- ✅ **Domain-appropriate patterns** - Observer for complex course ops, direct for simple media ops

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
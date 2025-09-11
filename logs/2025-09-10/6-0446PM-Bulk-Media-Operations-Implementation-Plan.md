# Bulk Media Operations Implementation Plan

**Date:** September 10, 2025  
**Architecture:** 3-Layer SSOT Distribution (TanStack Query + Form State + Zustand)  
**Pattern Reference:** Video deletion concurrent processing + FloatingUploadPanel UI

---

## 🎯 **Implementation Overview**

This plan implements bulk media operations by reusing proven patterns from:
- **Video concurrent deletion flow** (`/src/hooks/use-video-queries.ts:410-460`)
- **FloatingUploadPanel progress UI** (`/src/components/ui/FloatingUploadPanel.tsx`)
- **Media WebSocket integration** (already working for uploads)

---

## 🏗️ **Architecture Compliance Framework**

### **3-Layer State Distribution**
- **TanStack Query**: Server state (media files, bulk operation results)
- **Form State**: Confirmation modal inputs, filter states during selection
- **Zustand**: Selection state, bulk operation UI state, drag selection state

### **Established Patterns to Reuse**
- ✅ **Concurrent Deletion Pattern**: Queue + batch processing from video deletion
- ✅ **FloatingPanel Pattern**: Progress UI from upload system
- ✅ **WebSocket Progress**: Existing media upload progress infrastructure
- ✅ **Observer Pattern**: WebSocket → Observer → TanStack → UI flow

---

## 📋 **Feature 1: Multi-Select UI with Drag Selection**

### **User Experience Requirements**
1. **Click Selection**: Click individual items to select/deselect
2. **Drag Selection**: Click and drag to select multiple items in one gesture
3. **Auto-scroll**: When dragging near page edges, automatically scroll
4. **Visual Feedback**: Highlight selected items, show selection rectangle during drag

### **Implementation Strategy: Zustand Selection State**

```typescript
// ARCHITECTURE-COMPLIANT: Zustand for pure UI selection state
interface MediaStoreState {
  // Selection state
  selectedFiles: Set<string>
  
  // Drag selection state
  dragSelection: {
    isActive: boolean
    startPoint: { x: number, y: number } | null
    currentPoint: { x: number, y: number } | null
    selectedDuringDrag: Set<string>
  }
  
  // Auto-scroll state
  autoScroll: {
    isScrolling: boolean
    direction: 'up' | 'down' | null
    speed: number
  }
  
  // Selection methods
  toggleSelection: (fileId: string) => void
  selectRange: (fromId: string, toId: string, allFileIds: string[]) => void
  selectAll: (fileIds: string[]) => void
  clearSelection: () => void
  
  // Drag selection methods
  startDragSelection: (point: { x: number, y: number }) => void
  updateDragSelection: (point: { x: number, y: number }, intersectingIds: string[]) => void
  finalizeDragSelection: () => void
  cancelDragSelection: () => void
  
  // Auto-scroll methods
  startAutoScroll: (direction: 'up' | 'down', speed: number) => void
  stopAutoScroll: () => void
}
```

### **Drag Selection Implementation Pattern**

```typescript
// ARCHITECTURE-COMPLIANT: React hook for drag selection behavior
export function useDragSelection(containerRef: RefObject<HTMLElement>) {
  const {
    dragSelection,
    selectedFiles,
    startDragSelection,
    updateDragSelection,
    finalizeDragSelection,
    cancelDragSelection,
    startAutoScroll,
    stopAutoScroll
  } = useMediaStore()
  
  // Mouse event handlers
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.target.closest('[data-selectable]')) {
      startDragSelection({ x: event.clientX, y: event.clientY })
    }
  }, [startDragSelection])
  
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!dragSelection.isActive) return
    
    // Update drag rectangle
    const currentPoint = { x: event.clientX, y: event.clientY }
    
    // Calculate intersecting elements
    const intersectingIds = getIntersectingElements(
      dragSelection.startPoint!,
      currentPoint,
      containerRef.current
    )
    
    updateDragSelection(currentPoint, intersectingIds)
    
    // Auto-scroll logic
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (containerRect) {
      const threshold = 50 // pixels from edge
      
      if (event.clientY < containerRect.top + threshold) {
        startAutoScroll('up', 2)
      } else if (event.clientY > containerRect.bottom - threshold) {
        startAutoScroll('down', 2)
      } else {
        stopAutoScroll()
      }
    }
  }, [dragSelection, updateDragSelection, startAutoScroll, stopAutoScroll])
  
  const handleMouseUp = useCallback(() => {
    if (dragSelection.isActive) {
      finalizeDragSelection()
      stopAutoScroll()
    }
  }, [dragSelection.isActive, finalizeDragSelection, stopAutoScroll])
  
  // Setup event listeners
  useEffect(() => {
    if (dragSelection.isActive) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragSelection.isActive, handleMouseMove, handleMouseUp])
  
  return {
    isDragActive: dragSelection.isActive,
    dragRectangle: getDragRectangle(dragSelection.startPoint, dragSelection.currentPoint)
  }
}
```

### **UI Components: Selection Interface**

```typescript
// ARCHITECTURE-COMPLIANT: Selection toolbar component
function BulkSelectionToolbar() {
  const { selectedFiles, clearSelection } = useMediaStore()
  const selectedCount = selectedFiles.size
  
  if (selectedCount === 0) return null
  
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <Card className="px-4 py-2 shadow-lg border">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedCount} file{selectedCount !== 1 ? 's' : ''} selected
          </span>
          
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            
            <Button size="sm" variant="outline" onClick={clearSelection}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ARCHITECTURE-COMPLIANT: Media grid with selection support
function MediaGrid() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { selectedFiles, toggleSelection } = useMediaStore()
  const { isDragActive, dragRectangle } = useDragSelection(containerRef)
  
  return (
    <div ref={containerRef} className="relative">
      {/* Drag selection rectangle */}
      {isDragActive && dragRectangle && (
        <div 
          className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-10"
          style={{
            left: dragRectangle.left,
            top: dragRectangle.top,
            width: dragRectangle.width,
            height: dragRectangle.height
          }}
        />
      )}
      
      {/* Media items grid */}
      <div className="grid grid-cols-4 gap-4">
        {mediaFiles.map(file => (
          <MediaCard
            key={file.id}
            file={file}
            isSelected={selectedFiles.has(file.id)}
            onToggleSelection={() => toggleSelection(file.id)}
            data-selectable={file.id}
          />
        ))}
      </div>
    </div>
  )
}
```

---

## 🗑️ **Feature 2: Bulk Delete with Progress**

### **User Experience Flow**
1. **Selection**: User selects multiple files
2. **Initiation**: Click "Delete" in bulk toolbar
3. **Confirmation**: Modal shows file list and deletion impact
4. **Progress**: Floating panel shows real-time deletion progress
5. **Completion**: Success feedback, files removed from UI

### **Implementation Strategy: Reuse Video Deletion Pattern**

```typescript
// ARCHITECTURE-COMPLIANT: Reuse concurrent deletion pattern from video queries
export function useBulkMediaDelete() {
  const queryClient = useQueryClient()
  const { selectedFiles, clearSelection } = useMediaStore()
  
  // REUSE PATTERN: Queue and batch processing like video deletion
  const [deleteQueue, setDeleteQueue] = useState<Set<string>>(new Set())
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set())
  
  // REUSE PATTERN: Process batched deletes with progress tracking
  const processBatchedDeletes = async (fileIds: string[]) => {
    console.log(`🚀 [BULK DELETE] Starting batch delete for ${fileIds.length} files:`, fileIds)
    
    // Generate operation ID for WebSocket tracking
    const operationId = `bulk_delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Add all files to pending deletes
    setPendingDeletes(prev => new Set([...prev, ...fileIds]))
    
    // Process deletions with WebSocket progress broadcasting
    const deleteOperations = fileIds.map(async (fileId, index) => {
      try {
        // Call server action with progress tracking
        const deleteResult = await deleteMediaFileAction(fileId, {
          operationId,
          current: index + 1,
          total: fileIds.length
        })
        
        // Remove from pending on success
        if (deleteResult.success) {
          setPendingDeletes(prev => {
            const newSet = new Set(prev)
            newSet.delete(fileId)
            return newSet
          })
          
          // Optimistic removal from TanStack cache
          queryClient.setQueryData(['media-files'], (oldData: any[]) =>
            oldData?.filter(file => file.id !== fileId) || []
          )
        }
        
        return { ...deleteResult, fileId }
      } catch (error) {
        console.error(`❌ [BULK DELETE] Failed to delete ${fileId}:`, error)
        return { success: false, error: error.message, fileId }
      }
    })
    
    // Wait for all deletions to complete
    const results = await Promise.all(deleteOperations)
    
    // Clear selection after completion
    clearSelection()
    
    // Show completion feedback
    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount
    
    if (failureCount === 0) {
      toast.success(`${successCount} files deleted successfully`)
    } else {
      toast.error(`${successCount} files deleted, ${failureCount} failed`)
    }
    
    return results
  }
  
  const startBulkDelete = () => {
    const fileIds = Array.from(selectedFiles)
    if (fileIds.length > 0) {
      setIsProcessingBatch(true)
      processBatchedDeletes(fileIds).finally(() => {
        setIsProcessingBatch(false)
      })
    }
  }
  
  return {
    startBulkDelete,
    isProcessingBatch,
    pendingDeletes: pendingDeletes.size
  }
}
```

### **Server Action: WebSocket-Enabled Bulk Delete**

```typescript
// ARCHITECTURE-COMPLIANT: Server action with WebSocket progress broadcasting
export async function deleteMediaFileAction(
  fileId: string, 
  progressInfo?: { operationId: string, current: number, total: number }
) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  try {
    // Soft delete the media file
    const { error } = await supabase
      .from('media_files')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', fileId)
      .eq('uploaded_by', user.id)
    
    if (error) throw error
    
    // Broadcast progress if part of bulk operation
    if (progressInfo) {
      await broadcastWebSocketMessage({
        type: 'bulk-delete-progress',
        operationId: progressInfo.operationId,
        data: {
          processed: progressInfo.current,
          total: progressInfo.total,
          progress: Math.round((progressInfo.current / progressInfo.total) * 100),
          currentFile: fileId,
          status: 'processing'
        }
      })
    }
    
    return { success: true, fileId }
  } catch (error) {
    console.error('Delete media file error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete file',
      fileId 
    }
  }
}
```

### **Progress UI: Reuse FloatingUploadPanel Pattern**

```typescript
// ARCHITECTURE-COMPLIANT: Reuse existing FloatingUploadPanel for bulk operations
function BulkOperationPanel() {
  const { data: bulkOperations = [] } = useQuery({
    queryKey: ['bulk-operations'],
    queryFn: getBulkOperationsStatus,
    refetchInterval: bulkOperations.some(op => op.status === 'processing') ? 1000 : false
  })
  
  // Transform bulk operations to match FloatingUploadPanel interface
  const panelItems = bulkOperations.map(op => ({
    id: op.operationId,
    name: `Deleting ${op.total} files`,
    uploadProgress: op.progress,
    status: op.status,
    uploadTimeRemaining: op.estimatedTimeRemaining
  }))
  
  if (panelItems.length === 0) return null
  
  return (
    <FloatingUploadPanel 
      items={panelItems}
      position="bottom-right"
      className="z-50"
    />
  )
}
```

---

## 🔌 **WebSocket Integration**

### **Reuse Existing Media WebSocket Infrastructure**

```typescript
// ARCHITECTURE-COMPLIANT: Extend existing media WebSocket events
// File: /src/lib/course-event-observer.ts
export const MEDIA_EVENTS = {
  MEDIA_UPLOAD_PROGRESS: 'media-upload-progress',
  MEDIA_UPLOAD_COMPLETE: 'media-upload-complete',
  
  // NEW: Bulk operation events
  MEDIA_BULK_DELETE_PROGRESS: 'media-bulk-delete-progress',
  MEDIA_BULK_DELETE_COMPLETE: 'media-bulk-delete-complete',
  MEDIA_BULK_OPERATION_ERROR: 'media-bulk-operation-error'
} as const

// REUSE PATTERN: WebSocket message mapping (already exists)
// File: /src/hooks/use-websocket-connection.ts
const mediaEventMapping = {
  'media-upload-progress': MEDIA_EVENTS.MEDIA_UPLOAD_PROGRESS,
  'bulk-delete-progress': MEDIA_EVENTS.MEDIA_BULK_DELETE_PROGRESS,
  'bulk-delete-complete': MEDIA_EVENTS.MEDIA_BULK_DELETE_COMPLETE
}
```

### **TanStack Query Integration with Observer**

```typescript
// ARCHITECTURE-COMPLIANT: Observer → TanStack → UI flow
export function useMediaFiles() {
  const queryClient = useQueryClient()
  
  // Subscribe to bulk delete progress events
  useEffect(() => {
    const unsubscribeBulkProgress = courseEventObserver.subscribe(
      MEDIA_EVENTS.MEDIA_BULK_DELETE_PROGRESS,
      (event) => {
        // Update bulk operations cache
        queryClient.setQueryData(['bulk-operations'], (oldOperations: any[] = []) => {
          const operationId = event.data.operationId
          const existingIndex = oldOperations.findIndex(op => op.operationId === operationId)
          
          if (existingIndex >= 0) {
            // Update existing operation
            const updated = [...oldOperations]
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...event.data,
              status: event.data.progress === 100 ? 'complete' : 'processing'
            }
            return updated
          } else {
            // Add new operation
            return [...oldOperations, {
              operationId,
              type: 'delete',
              ...event.data,
              status: 'processing'
            }]
          }
        })
      }
    )
    
    const unsubscribeBulkComplete = courseEventObserver.subscribe(
      MEDIA_EVENTS.MEDIA_BULK_DELETE_COMPLETE,
      (event) => {
        // Invalidate media files to refresh the list
        queryClient.invalidateQueries({ queryKey: ['media-files'] })
        
        // Clean up completed operation after delay
        setTimeout(() => {
          queryClient.setQueryData(['bulk-operations'], (oldOperations: any[] = []) =>
            oldOperations.filter(op => op.operationId !== event.data.operationId)
          )
        }, 3000)
      }
    )
    
    return () => {
      unsubscribeBulkProgress()
      unsubscribeBulkComplete()
    }
  }, [queryClient])
  
  return useQuery({
    queryKey: ['media-files'],
    queryFn: getMediaFilesAction,
    staleTime: 5 * 60 * 1000
  })
}
```

---

## 🎨 **UI Component Integration**

### **Main Media Page Updates**

```typescript
// ARCHITECTURE-COMPLIANT: Enhanced media page with bulk operations
export default function MediaPage() {
  // Form state for search/filters
  const [searchQuery, setSearchQuery] = useState('')
  
  // UI state from Zustand
  const { selectedFiles, viewMode } = useMediaStore()
  
  // Server state from TanStack
  const { data: mediaFiles = [], isLoading } = useMediaFiles()
  const { startBulkDelete, isProcessingBatch } = useBulkMediaDelete()
  
  return (
    <div className="container mx-auto p-6">
      {/* Header with selection info */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Media Library</h1>
        {selectedFiles.size > 0 && (
          <Badge variant="secondary">
            {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
          </Badge>
        )}
      </div>
      
      {/* Search and filters */}
      <MediaSearchFilters 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      {/* Media grid with selection */}
      <MediaGridWithSelection 
        files={mediaFiles}
        viewMode={viewMode}
        isLoading={isLoading}
      />
      
      {/* Bulk selection toolbar */}
      <BulkSelectionToolbar onBulkDelete={startBulkDelete} />
      
      {/* Bulk operation progress panel */}
      <BulkOperationPanel />
      
      {/* Confirmation modals */}
      <BulkDeleteConfirmationModal />
    </div>
  )
}
```

---

## 🧪 **Error Handling & Edge Cases**

### **Partial Failure Handling**
- Continue processing remaining files if some fail
- Collect and display error messages clearly
- Allow retry of failed operations
- Maintain UI consistency during partial failures

### **Performance Considerations**
- Limit selection to maximum 100 files for bulk operations
- Debounce drag selection updates (16ms for 60fps)
- Virtual scrolling for large media libraries
- Auto-scroll speed based on mouse proximity to edge

### **User Experience Safeguards**
- Confirm before bulk delete operations
- Show estimated time for large operations
- Allow cancellation of in-progress operations
- Preserve selection across page refreshes

---

## 📊 **Implementation Phases**

### **Phase 1: Selection UI (2-3 hours)**
1. Extend Zustand media store with selection state
2. Implement drag selection hook with auto-scroll
3. Create selection toolbar and visual feedback

### **Phase 2: Bulk Delete Progress (2-3 hours)**
1. Extend server actions with WebSocket progress
2. Reuse FloatingUploadPanel for bulk operations
3. Implement Observer pattern for progress events
4. Add confirmation modal with file list

### **Phase 3: Polish & Testing (1-2 hours)**
1. Error handling and retry mechanisms
2. Performance optimization for large selections
3. Mobile responsiveness
4. Accessibility improvements

**Total Estimated Time: 5-8 hours**

---

This implementation leverages proven patterns from the existing codebase while maintaining strict architectural compliance and providing a professional bulk operations experience.
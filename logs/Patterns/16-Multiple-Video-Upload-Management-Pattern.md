# Multiple Video Upload Management Pattern

*Extracted from working `/instructor/media` implementation*

## Overview

This document outlines the proven patterns for managing multiple concurrent video uploads in a React application, as successfully implemented in the `/instructor/media` route. The system handles real-time progress tracking, state management, user feedback, and complex interactions while maintaining performance and reliability.

## Core Architecture Principles

### 1. State Management Hierarchy
- **Form State**: React `useState` for ephemeral UI interactions
- **UI State**: Zustand store for complex UI behaviors (selection, drag operations, view preferences)
- **Server State**: TanStack Query for all server data with optimistic updates
- **Real-time Updates**: WebSocket integration with event observer pattern

### 2. Upload Operation Lifecycle
Each upload follows a predictable lifecycle with clear state transitions:
1. **Initialization**: User selects files
2. **Optimistic Addition**: Temporary file objects added to UI immediately
3. **Progress Tracking**: Real-time progress updates via WebSocket
4. **Completion**: Server validation and final state reconciliation
5. **Cleanup**: Temporary objects replaced with real data

### 3. Multi-Layer Progress Tracking
The system provides progress feedback at multiple levels:
- **Individual File Progress**: Per-file upload percentage and time remaining
- **Batch Progress**: Overall completion across multiple files
- **Visual Feedback**: Floating progress panel similar to Google Drive
- **Status States**: Clear visual indicators (uploading, processing, ready, error)

## Key Implementation Patterns

### Operation ID Strategy
Every upload operation receives a unique identifier for tracking:
- Generated format: `media_upload_${timestamp}_${random}`
- Used as temporary file ID during optimistic updates
- Enables matching progress events to specific files
- Prevents race conditions between concurrent uploads

### Optimistic UI Updates
Files appear in the interface immediately when selected:
- Temporary file objects created with operation ID
- Initial progress set to 0% with "uploading" status
- UI remains responsive during upload process
- Failed uploads cleanly removed from interface

### Real-time Progress Integration
WebSocket events provide live upload progress:
- Event subscription through centralized observer pattern
- TanStack Query cache updates maintain UI consistency
- Progress data includes percentage, time remaining, and status
- Automatic fallback to polling if WebSocket fails

### Floating Progress Panel
Google Drive-style progress display:
- Fixed positioning with minimize/maximize functionality
- Shows active uploads only (uploading, processing, recently completed)
- Individual file progress with time estimates
- Dismissible with smooth animations

## State Management Patterns

### TanStack Query Integration
Server state managed through React Query with:
- Optimistic updates for immediate UI feedback
- Automatic background refetching for data consistency
- Error handling with user-friendly messages
- Cache invalidation on completion

### Zustand Store Organization
UI state cleanly separated by concern:
- Selection state (single/multi/range/drag selection)
- View preferences (grid/list mode, filters, sorting)
- Modal states (preview, details, confirmation)
- Upload progress tracking
- Drag selection coordinates and auto-scroll

### Form State Management
Simple React state for:
- Search queries and filter inputs
- Modal visibility toggles
- Temporary UI interactions
- Animation trigger states

## User Experience Patterns

### Multi-Selection Capabilities
Comprehensive selection system supporting:
- Individual click selection
- Shift+click range selection
- Ctrl/Cmd+click multi-selection
- Drag rectangle selection with modifier key support
- Keyboard shortcuts (Escape to clear)

### Drag and Drop Interface
Unified dropzone component providing:
- Visual feedback for drag states (valid/invalid)
- File type and size validation
- Multiple file support with limits
- Error display for rejected files
- Disabled state during active uploads

### Progress Visualization
Multiple progress indicators:
- Per-file progress bars with percentage
- Time remaining estimates
- Status icons (uploading, processing, complete, error)
- Batch operation summaries
- Floating panel for ongoing operations

### Animation and Transitions
Smooth visual feedback for:
- File addition with fade-in effects
- Progress updates with smooth transitions
- Deletion with fade-out before removal
- Selection state changes
- Drag rectangle visualization

## Error Handling and Recovery

### Upload Failure Management
Robust error handling including:
- Network failure recovery
- File validation errors
- Server-side processing failures
- User-friendly error messages
- Automatic cleanup of failed uploads

### Race Condition Prevention
Careful handling of concurrent operations:
- Operation IDs prevent progress event mixing
- State updates are atomic and predictable
- UI remains consistent during rapid user actions
- Background operations don't interfere with user interactions

### Memory and Performance
Optimizations for large file handling:
- Lazy loading of file metadata
- Efficient progress update batching
- Automatic cleanup of completed operations
- Minimal re-renders through selective subscriptions

## Integration Points

### Backend Communication
Structured API integration with:
- FormData submission for file uploads
- Operation ID tracking throughout pipeline
- WebSocket events for real-time updates
- RESTful endpoints for file management

### Database Synchronization
Consistent data management:
- File metadata storage and retrieval
- Usage tracking across courses
- Tag management and filtering
- Audit trail maintenance

### Course Integration
Seamless connection to broader application:
- File usage tracking in courses and lessons
- Media library shared across instructors
- Bulk operations for content management
- Permission and access control

## Performance Considerations

### Concurrent Upload Management
System handles multiple simultaneous uploads:
- Parallel processing without UI blocking
- Bandwidth optimization through queuing
- Progress aggregation across operations
- Resource cleanup on completion

### UI Responsiveness
Maintains smooth user experience:
- Non-blocking progress updates
- Efficient state update patterns
- Minimal DOM manipulation
- Optimized re-rendering cycles

### Memory Management
Prevents memory leaks and bloat:
- Automatic cleanup of temporary objects
- Efficient event listener management
- Proper subscription cleanup
- Limited cache size with TTL

## Best Practices Extracted

### Separation of Concerns
Clear boundaries between different types of state management prevent complexity and bugs.

### Progressive Enhancement
System works with basic functionality and adds advanced features (drag selection, real-time progress) as enhancements.

### User Feedback Priority
Every user action receives immediate feedback, even if the actual operation takes time to complete.

### Error Recovery
Failures are gracefully handled with clear user communication and automatic cleanup.

### Consistency Patterns
Similar operations (upload, delete, tag) follow consistent patterns for predictable user experience.

### Pseudo Code

# Multiple Video Upload Management - Implementation Pseudocode

*Detailed implementation guide based on working `/instructor/media` system*

## 1. State Management Setup

### Zustand Store Structure
```pseudocode
// Media Store (Zustand)
CREATE MediaStore {
  // UI State
  viewMode: 'grid' | 'list'
  selectedFiles: Set<string>
  lastSelectedId: string | null
  
  // Upload State
  uploads: Record<operationId, UploadItem>
  
  // Selection Methods
  toggleSelection(fileId)
  selectRange(fromId, toId, allFileIds)
  clearSelection()
  
  // Upload Methods
  addUpload(upload)
  updateUpload(id, updates)
  removeUpload(id)
}

// Upload Item Structure
INTERFACE UploadItem {
  id: string
  name: string
  uploadProgress: number (0-100)
  uploadTimeRemaining: number | null
  status: 'uploading' | 'processing' | 'ready' | 'error'
  size: string
  operationId: string
}
```

### TanStack Query Setup
```pseudocode
// Media Queries Hook
FUNCTION useMediaQueries() {
  // Fetch media files
  mediaFiles = useQuery({
    queryKey: ['media-files'],
    queryFn: getMediaFilesFromServer,
    staleTime: 5 minutes
  })
  
  // Upload mutation
  uploadMutation = useMutation({
    mutationFn: uploadFileToServer,
    onMutate: optimisticUploadUpdate,
    onSuccess: handleUploadSuccess,
    onError: handleUploadError
  })
  
  RETURN { mediaFiles, uploadMutation }
}
```

## 2. File Upload Flow

### Initial File Selection
```pseudocode
FUNCTION handleFilesSelected(files) {
  FOR EACH file IN files {
    operationId = generateOperationId()
    
    // Start upload mutation
    uploadMutation.mutate({
      file: file,
      operationId: operationId
    })
  }
}

FUNCTION generateOperationId() {
  timestamp = getCurrentTimestamp()
  randomString = generateRandomString(15)
  RETURN "media_upload_" + timestamp + "_" + randomString
}
```

### Optimistic UI Updates
```pseudocode
FUNCTION optimisticUploadUpdate(file, operationId) {
  // Create temporary file object
  tempFile = {
    id: operationId,
    name: file.name,
    type: determineFileType(file.type),
    size: formatFileSize(file.size),
    status: 'uploading',
    uploadProgress: 0,
    uploadStartTime: getCurrentTime(),
    backblaze_file_id: operationId  // For progress matching
  }
  
  // Add to TanStack Query cache
  queryClient.setQueryData(['media-files'], (oldData) => {
    IF oldData IS null THEN RETURN [tempFile]
    RETURN [tempFile, ...oldData]
  })
  
  // Add to Zustand upload tracking
  mediaStore.addUpload(tempFile)
}
```

## 3. Real-time Progress Tracking

### WebSocket Event Setup
```pseudocode
FUNCTION setupProgressTracking() {
  // Subscribe to upload progress events
  eventObserver.subscribe('MEDIA_UPLOAD_PROGRESS', handleProgressUpdate)
  eventObserver.subscribe('MEDIA_UPLOAD_COMPLETE', handleUploadComplete)
}

FUNCTION handleProgressUpdate(event) {
  IF event.operationId IS empty THEN RETURN
  IF event.data.progress IS invalid THEN RETURN
  
  // Update TanStack Query cache
  queryClient.setQueryData(['media-files'], (currentData) => {
    RETURN currentData.map(file => {
      IF file.backblaze_file_id === event.operationId THEN {
        RETURN {
          ...file,
          uploadProgress: event.data.progress,
          status: 'uploading'
        }
      }
      RETURN file
    })
  })
  
  // Update Zustand store
  mediaStore.updateUpload(event.operationId, {
    uploadProgress: event.data.progress,
    status: 'uploading'
  })
}
```

### Upload Completion Handling
```pseudocode
FUNCTION handleUploadSuccess(result, file, operationId) {
  IF result.success THEN {
    // Show 100% completion briefly
    updateFileProgress(operationId, 100, 'ready')
    
    // Show success message
    showToast("✅ " + file.name + " uploaded successfully")
    
    // Delay then refresh from server
    setTimeout(() => {
      queryClient.invalidateQueries(['media-files'])
      mediaStore.removeUpload(operationId)
    }, 1500)
  } ELSE {
    // Handle failure
    showToast("❌ Upload failed: " + result.error)
    removeFailedUpload(operationId)
  }
}
```

## 4. Drag and Drop Interface

### Dropzone Setup
```pseudocode
FUNCTION setupDropzone() {
  dropzone = useDropzone({
    onDrop: handleFileDrop,
    accept: ['video/*', 'image/*', 'audio/*'],
    maxSize: 1GB,
    maxFiles: 20,
    disabled: isCurrentlyUploading
  })
  
  RETURN dropzone
}

FUNCTION handleFileDrop(acceptedFiles) {
  IF acceptedFiles.length > 0 THEN {
    handleFilesSelected(acceptedFiles)
  }
}
```

### Visual Feedback States
```pseudocode
FUNCTION renderDropzone(isDragActive, isDragReject, hasErrors) {
  className = buildClassName({
    "border-primary bg-primary/10": isDragActive AND NOT isDragReject,
    "border-destructive bg-destructive/10": isDragReject OR hasErrors,
    "border-muted hover:bg-muted/20": DEFAULT_STATE,
    "opacity-50 cursor-not-allowed": isUploading
  })
  
  message = determineMessage(isDragActive, isDragReject, isUploading)
  
  RETURN DropzoneComponent(className, message)
}
```

## 5. Selection Management

### Multi-Selection Logic
```pseudocode
FUNCTION handleItemSelection(fileId, event) {
  IF NOT isSelectionMode THEN RETURN
  
  IF event.shiftKey AND lastSelectedId EXISTS THEN {
    // Range selection
    selectRange(lastSelectedId, fileId, allFileIds)
  } ELSE IF event.ctrlKey OR event.metaKey THEN {
    // Add/remove from selection
    toggleSelection(fileId)
  } ELSE {
    // Replace selection
    clearSelection()
    toggleSelection(fileId)
  }
}

FUNCTION selectRange(fromId, toId, allFileIds) {
  fromIndex = allFileIds.indexOf(fromId)
  toIndex = allFileIds.indexOf(toId)
  
  IF fromIndex === -1 OR toIndex === -1 THEN RETURN
  
  startIndex = Math.min(fromIndex, toIndex)
  endIndex = Math.max(fromIndex, toIndex)
  rangeIds = allFileIds.slice(startIndex, endIndex + 1)
  
  FOR EACH id IN rangeIds {
    addToSelection(id)
  }
}
```

### Drag Selection Implementation
```pseudocode
FUNCTION useDragSelection(containerRef, allFileIds, enabled) {
  // Mouse down handler
  FUNCTION handleMouseDown(event) {
    IF NOT insideContainer(event.target) THEN RETURN
    
    selectionMode = determineSelectionMode(event) // shift/ctrl/normal
    containerPoint = getContainerRelativeCoords(event)
    
    startDragSelection(containerPoint, selectionMode)
  }
  
  // Mouse move handler
  FUNCTION handleMouseMove(event) {
    IF NOT dragSelection.isActive THEN RETURN
    
    currentPoint = getContainerRelativeCoords(event)
    intersectingIds = getIntersectingElements(
      dragSelection.startPoint,
      currentPoint,
      containerRef.current
    )
    
    updateDragSelection(currentPoint, intersectingIds)
    handleAutoScroll(event)
  }
  
  // Setup global event listeners
  document.addEventListener('mousedown', handleMouseDown, true)
  IF dragSelection.isActive THEN {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
}
```

## 6. Progress Visualization

### Floating Progress Panel
```pseudocode
FUNCTION FloatingUploadPanel(items, position) {
  isMinimized = useState(false)
  isDismissed = useState(false)
  
  // Filter active uploads
  activeUploads = items.filter(item => 
    item.status IN ['uploading', 'processing'] OR
    (item.status === 'ready' AND item.uploadProgress EXISTS)
  )
  
  IF activeUploads.length === 0 OR isDismissed THEN RETURN null
  
  // Calculate overall progress
  totalProgress = activeUploads.reduce((sum, item) => sum + item.uploadProgress, 0)
  averageProgress = totalProgress / activeUploads.length
  
  RETURN PanelComponent({
    items: activeUploads,
    progress: averageProgress,
    isMinimized: isMinimized,
    onToggleMinimize: () => setIsMinimized(!isMinimized),
    onDismiss: () => setIsDismissed(true)
  })
}
```

### Individual Progress Items
```pseudocode
FUNCTION renderProgressItem(item) {
  statusIcon = getStatusIcon(item.status)
  timeRemaining = formatTimeRemaining(item.uploadTimeRemaining)
  
  RETURN (
    <div className="progress-item">
      <div className="item-header">
        {statusIcon}
        <span className="filename">{item.name}</span>
        <span className="file-size">{item.size}</span>
      </div>
      
      IF item.uploadProgress EXISTS THEN {
        <div className="progress-section">
          <div className="progress-info">
            <span>{Math.round(item.uploadProgress)}%</span>
            IF timeRemaining THEN <span>{timeRemaining}</span>
          </div>
          <ProgressBar value={item.uploadProgress} />
        </div>
      }
      
      <StatusMessage status={item.status} />
    </div>
  )
}
```

## 7. Error Handling

### Upload Error Management
```pseudocode
FUNCTION handleUploadError(error, file, operationId) {
  console.error('Upload error:', error)
  
  // Show user-friendly error
  showToast("❌ Failed to upload " + file.name)
  
  // Remove from UI
  queryClient.setQueryData(['media-files'], (oldData) => {
    RETURN oldData.filter(f => f.id !== operationId)
  })
  
  // Update upload tracking
  mediaStore.updateUpload(operationId, {
    status: 'error',
    error: error.message
  })
  
  // Auto-remove after delay
  setTimeout(() => {
    mediaStore.removeUpload(operationId)
  }, 5000)
}
```

### Network Failure Recovery
```pseudocode
FUNCTION setupRetryLogic() {
  uploadMutation = useMutation({
    mutationFn: uploadFile,
    retry: (failureCount, error) => {
      IF failureCount < 3 AND isNetworkError(error) THEN {
        RETURN true
      }
      RETURN false
    },
    retryDelay: attemptIndex => Math.min(1000 * 2^attemptIndex, 30000)
  })
}
```

## 8. Bulk Operations

### Bulk Delete Implementation
```pseudocode
FUNCTION useBulkDelete() {
  RETURN useMutation({
    mutationFn: (fileIds, operationId, onAnimationStart) => {
      // Trigger fade-out animation
      IF onAnimationStart EXISTS THEN {
        onAnimationStart(fileIds)
      }
      
      // Wait for animation
      await delay(1200)
      
      // Execute delete
      RETURN bulkDeleteFiles(fileIds, operationId)
    },
    
    onSuccess: (result, fileIds) => {
      IF result.success THEN {
        showToast("✅ Deleted " + fileIds.length + " files")
        
        // Remove from cache
        queryClient.setQueryData(['media-files'], (oldData) => {
          RETURN oldData.filter(file => NOT fileIds.includes(file.id))
        })
        
        // Refresh data
        queryClient.invalidateQueries(['media-files'])
      }
    }
  })
}
```

## 9. Performance Optimizations

### Efficient Re-rendering
```pseudocode
// Memoize expensive calculations
FUNCTION useFilteredMedia(mediaFiles, searchQuery, filterType, selectedCourse) {
  RETURN useMemo(() => {
    RETURN mediaFiles.filter(item => {
      matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      matchesFilter = filterType === 'all' OR item.type === filterType
      matchesCourse = checkCourseFilter(item, selectedCourse)
      
      RETURN matchesSearch AND matchesFilter AND matchesCourse
    })
  }, [mediaFiles, searchQuery, filterType, selectedCourse])
}

// Virtualize large lists
FUNCTION useVirtualization(items, containerRef) {
  IF items.length > 100 THEN {
    RETURN useVirtualList({
      list: items,
      containerTarget: containerRef,
      itemHeight: 200,
      overscan: 5
    })
  }
  RETURN { list: items, containerProps: {}, wrapperProps: {} }
}
```

### Memory Management
```pseudocode
FUNCTION cleanupCompletedOperations() {
  // Auto-cleanup completed uploads
  useEffect(() => {
    timer = setInterval(() => {
      mediaStore.clearCompletedUploads()
    }, 30000) // Every 30 seconds
    
    RETURN () => clearInterval(timer)
  }, [])
}

FUNCTION preventMemoryLeaks() {
  // Cleanup event listeners
  useEffect(() => {
    RETURN () => {
      eventObserver.unsubscribeAll()
      clearAllTimers()
      resetUploadState()
    }
  }, [])
}
```

## 10. Integration Points

### Backend API Structure
```pseudocode
// Upload endpoint
POST /api/media/upload
BODY: FormData with file + operationId
RESPONSE: { success: boolean, fileId?: string, error?: string }

// WebSocket events
EVENT media-upload-progress {
  operationId: string,
  data: { progress: number, timeRemaining?: number }
}

EVENT media-upload-complete {
  operationId: string,
  fileId: string,
  success: boolean
}

// Bulk operations
POST /api/media/bulk-delete
BODY: { fileIds: string[], operationId: string }
RESPONSE: { success: boolean, deletedCount: number }
```

This pseudocode provides a complete implementation roadmap based on the proven patterns from your working media management system.

This pattern has proven successful in production with hundreds of concurrent uploads and provides a solid foundation for similar multi-file management systems.
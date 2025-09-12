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
# Enhanced Phase 2: Bulk Delete with WebSocket Progress
## Updated Implementation Plan Based on Enhanced Architecture Principles

## Executive Summary

This updated Phase 2 implementation plan leverages the enhanced architecture principles, specifically the **Bulk Operation State Management**, **Performance Patterns for Interactive UI**, and **Server Action Integration** patterns established in the architecture document.

**Core Enhancement**: Transform from basic bulk delete to a professional-grade bulk operation system with optimistic updates, selection-driven confirmation flows, and enterprise-level progress tracking.

## Architecture Foundation

### Enhanced State Management Patterns

#### Selection Set Management (Lines 469-473)
**Principle**: Efficient set operations for large item collections using Zustand Sets with O(1) operations

```typescript
// Enhanced media store with bulk operation preview state
interface BulkOperationPreview {
  selectedItems: Set<string>
  operationType: 'delete' | 'move' | 'tag'
  previewData: {
    totalSize: number
    affectedCourses: string[]
    warnings: string[]
    estimatedTime: number
  }
}

interface MediaStoreState {
  // Existing selection state
  selectedFiles: Set<string>
  
  // Enhanced bulk operation state
  bulkOperationPreview: BulkOperationPreview | null
  isPreviewLoading: boolean
  
  // Preview actions
  generateOperationPreview: (operation: 'delete' | 'move' | 'tag') => Promise<void>
  clearOperationPreview: () => void
}
```

#### Operation Preview State (Lines 471-472)
**Implementation**: Preview state shows operation effects before confirmation, coordinating with active selection without mixing data layers.

### Performance-First Architecture

#### Sub-100ms Visual Feedback (Lines 481-482)
**Standard**: All bulk operation UI updates must respond within 100ms, with visual feedback taking precedence over state persistence.

**Implementation Strategy**:
1. **Immediate UI Updates**: Selection feedback appears instantly
2. **Async State Sync**: Zustand updates happen asynchronously  
3. **Progressive Enhancement**: Operation preview loads progressively
4. **Graceful Degradation**: Core functionality works without preview data

#### Memory Management for Complex State (Lines 485)
**Pattern**: Efficient data structures and cleanup strategies for large selection sets and frequent updates.

## Enhanced Implementation Plan

### 2.1 Selection-Driven Confirmation System

#### Architecture-Compliant Preview Generation
**Principle**: Selection state from Zustand feeds TanStack mutations for operation preview generation

#### Enhanced Flow
1. **Selection State Read**: Extract `selectedFiles` Set from Zustand (O(1) operation)
2. **Preview Generation**: TanStack mutation calls server action for operation analysis
3. **Preview State Update**: Results populate `bulkOperationPreview` in Zustand
4. **Visual Coordination**: Components read preview state for confirmation UI
5. **Operation Execution**: Confirmed operations trigger actual bulk delete mutations

#### Server Action Integration Pattern
```typescript
// Preview generation server action
async function generateBulkDeletePreview(fileIds: string[]) {
  return {
    totalSize: calculateTotalSize(fileIds),
    affectedCourses: findAffectedCourses(fileIds),
    warnings: checkDeletionWarnings(fileIds),
    estimatedTime: estimateOperationTime(fileIds.length),
    operationId: generateOperationId()
  }
}

// TanStack mutation for preview
const usePreviewMutation = useMutation({
  mutationFn: generateBulkDeletePreview,
  onSuccess: (preview) => {
    // Update Zustand preview state
    useMediaStore.getState().setBulkOperationPreview(preview)
  }
})
```

### 2.2 Enhanced WebSocket Progress Implementation

#### Optimistic Updates for Bulk Operations (Lines 502-503)
**Pattern**: Use TanStack Query optimistic updates with selection state coordination for immediate feedback

#### Enhanced Progress Flow
1. **Optimistic Update**: Immediately mark selected items as "deleting" in TanStack cache
2. **Server Action Initiation**: Bulk delete server action starts with operation ID
3. **WebSocket Progress Stream**: Real-time updates via existing WebSocket infrastructure  
4. **Progressive State Updates**: TanStack Query merges WebSocket progress with optimistic state
5. **Error Recovery**: Partial failures restore optimistic state for failed items

#### Progress State Architecture
```typescript
// Enhanced progress tracking in TanStack Query
interface BulkOperationProgress {
  operationId: string
  type: 'delete' | 'move' | 'tag'
  totalItems: number
  completedItems: number
  failedItems: {
    id: string
    error: string
    retryable: boolean
  }[]
  status: 'pending' | 'processing' | 'partial-success' | 'complete' | 'failed'
  progress: number // 0-100
  estimatedTimeRemaining: number
  optimisticUpdates: string[] // Items optimistically updated
}
```

### 2.3 Professional Confirmation UI Components

#### Selection-Driven Form State (Lines 506-509)
**Pattern**: Bulk operation forms populate from Zustand selection state while maintaining form independence

#### Enhanced Confirmation Flow Components

##### BulkDeleteConfirmationModal
```typescript
interface BulkDeleteConfirmationProps {
  selectedCount: number
  onConfirm: () => void
  onCancel: () => void
}

// Form state derives from Zustand selection state
const BulkDeleteConfirmationModal = () => {
  const { selectedFiles, bulkOperationPreview } = useMediaStore()
  
  // Form state for confirmation options
  const [confirmationForm, setConfirmationForm] = useState({
    deleteFromCourses: true,
    createBackup: false,
    confirmText: ''
  })
  
  // Validation coordinates between form and selection state
  const isValid = useMemo(() => 
    confirmationForm.confirmText === 'DELETE' && 
    selectedFiles.size > 0 &&
    bulkOperationPreview?.warnings.every(w => w.acknowledged)
  , [confirmationForm, selectedFiles, bulkOperationPreview])
}
```

##### Enhanced BulkSelectionToolbar
```typescript
const BulkSelectionToolbar = () => {
  const { selectedFiles, bulkOperationPreview, isPreviewLoading } = useMediaStore()
  const { mutate: generatePreview } = usePreviewMutation()
  
  // Sub-100ms visual feedback for action buttons
  const handleDeleteClick = useCallback(() => {
    // Immediate visual feedback
    setIsGeneratingPreview(true)
    
    // Async preview generation
    generatePreview(Array.from(selectedFiles))
  }, [selectedFiles, generatePreview])
  
  return (
    <div className="bulk-toolbar">
      <Badge>{selectedFiles.size} selected</Badge>
      
      <Button 
        onClick={handleDeleteClick}
        disabled={selectedFiles.size === 0}
        loading={isPreviewLoading}
      >
        Delete ({selectedFiles.size})
      </Button>
    </div>
  )
}
```

### 2.4 Enterprise-Level Progress Display

#### Enhanced Progress Panel with Memory Management
```typescript
const BulkOperationProgressPanel = () => {
  const { data: progress } = useBulkOperationProgress(operationId)
  
  // Memory-efficient progress display for large operations
  const progressItems = useMemo(() => {
    // Only render visible items for performance
    return progress?.items.slice(0, 50) || []
  }, [progress])
  
  // Cleanup completed operations from memory
  useEffect(() => {
    if (progress?.status === 'complete') {
      // Cleanup after 5 seconds
      const timer = setTimeout(() => {
        queryClient.removeQueries(['bulkOperation', operationId])
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [progress?.status, operationId])
  
  return (
    <FloatingPanel>
      <ProgressHeader 
        operation={progress?.type}
        progress={progress?.progress}
        estimatedTime={progress?.estimatedTimeRemaining}
      />
      
      <ItemList items={progressItems} />
      
      {progress?.failedItems.length > 0 && (
        <ErrorRecoverySection 
          failures={progress.failedItems}
          onRetry={handleRetryFailed}
        />
      )}
    </FloatingPanel>
  )
}
```

### 2.5 Cross-Component Selection Coordination (Lines 473)

#### Loose Coupling Architecture
**Pattern**: Components read selection state from Zustand and coordinate actions through the same store

#### Implementation Examples

##### Media Item Component Updates
```typescript
const MediaItemCard = ({ file }) => {
  const { selectedFiles, isDragActive, toggleSelection } = useMediaStore()
  const isSelected = selectedFiles.has(file.id)
  
  // Visual coordination without tight coupling
  const cardClassName = cn(
    "media-card",
    isSelected && "selected",
    isDragActive && "drag-active"
  )
  
  // Action coordination through Zustand store
  const handleClick = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      toggleSelection(file.id)
    } else if (e.shiftKey) {
      // Range selection through store
      selectRange(lastSelectedId, file.id, allFileIds)
    } else {
      // Individual selection
      clearSelection()
      toggleSelection(file.id)
    }
  }, [file.id, toggleSelection])
}
```

##### Status Indicator Component
```typescript
const BulkOperationStatus = () => {
  const { selectedFiles } = useMediaStore()
  const { data: activeOperations } = useActiveBulkOperations()
  
  // Coordinate display without state ownership
  return (
    <StatusBar>
      {selectedFiles.size > 0 && (
        <SelectionIndicator count={selectedFiles.size} />
      )}
      
      {activeOperations?.map(op => (
        <OperationIndicator key={op.id} operation={op} />
      ))}
    </StatusBar>
  )
}
```

## Enhanced Testing Strategy

### Interactive Pattern Testing (Lines 523-535)

#### State Transition Verification
```typescript
describe('Bulk Delete Flow', () => {
  it('maintains state coordination across operation phases', async () => {
    // Phase 1: Selection state
    await selectMultipleItems(['file1', 'file2', 'file3'])
    expect(getSelectionState()).toHaveSize(3)
    
    // Phase 2: Preview generation
    await generateDeletePreview()
    expect(getPreviewState()).toBeDefined()
    expect(getSelectionState()).toHaveSize(3) // Selection unchanged
    
    // Phase 3: Operation execution
    await executeDelete()
    expect(getOptimisticState()).toHaveDeletedItems(['file1', 'file2', 'file3'])
    
    // Phase 4: WebSocket progress
    await simulateProgressUpdates()
    expect(getProgressState()).toHaveCompletedItems(3)
    
    // Phase 5: Cleanup
    await waitForOperationCleanup()
    expect(getSelectionState()).toHaveSize(0)
  })
})
```

#### Performance Validation
```typescript
describe('Bulk Operation Performance', () => {
  it('maintains sub-100ms response time for large selections', async () => {
    const startTime = performance.now()
    
    await selectLargeItemSet(1000) // 1000 items
    
    const responseTime = performance.now() - startTime
    expect(responseTime).toBeLessThan(100)
  })
  
  it('handles memory efficiently during large operations', async () => {
    const initialMemory = getMemoryUsage()
    
    await executeLargeBulkOperation(5000) // 5000 items
    await waitForOperationCompletion()
    
    const finalMemory = getMemoryUsage()
    expect(finalMemory - initialMemory).toBeLessThan(MEMORY_THRESHOLD)
  })
})
```

## Implementation Timeline

### Enhanced Sprint Planning

#### Sprint 1: Selection-Driven Confirmation (2-3 days)
- [ ] Implement operation preview state in Zustand
- [ ] Create preview generation TanStack mutations
- [ ] Build selection-driven confirmation forms
- [ ] Add sub-100ms visual feedback patterns
- [ ] Test state coordination across components

#### Sprint 2: WebSocket Progress with Optimistic Updates (2-3 days)
- [ ] Implement optimistic updates in TanStack Query
- [ ] Enhance WebSocket progress tracking
- [ ] Build professional progress display components
- [ ] Add error recovery and retry mechanisms
- [ ] Test performance with large operations

#### Sprint 3: Cross-Component Coordination (1-2 days)
- [ ] Implement loose coupling patterns across components
- [ ] Add memory management for large operations
- [ ] Enhance status indicators and feedback
- [ ] Complete integration testing
- [ ] Performance optimization and validation

## Success Metrics

### Enhanced Performance Standards
- **Visual Feedback**: < 100ms for all interactions
- **Memory Efficiency**: < 50MB increase for 1000+ item operations
- **Progress Accuracy**: Real-time progress within 5% accuracy
- **Error Recovery**: 95%+ success rate for retry operations

### User Experience Standards
- **Operation Preview**: Clear impact preview before confirmation
- **Progress Visibility**: Real-time progress for operations > 2 seconds
- **Error Handling**: Actionable error messages with recovery options
- **State Consistency**: No UI state desync during operations

## Risk Mitigation

### Enhanced Risk Management
- **Memory Leaks**: Automated cleanup for completed operations
- **WebSocket Reliability**: Graceful degradation to polling fallback
- **Partial Failures**: Individual item retry without full operation restart
- **State Coordination**: Comprehensive state transition testing

This enhanced Phase 2 plan leverages the new architecture principles to deliver enterprise-grade bulk operations while maintaining strict architectural compliance and professional performance standards.
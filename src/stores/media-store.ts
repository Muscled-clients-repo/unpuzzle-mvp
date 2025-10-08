import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { createSelectionStore, SelectionStoreState } from './create-selection-store'
import type { GenericUploadItem } from '@/components/ui/UploadProgressPanel'

interface MediaUploadItem extends GenericUploadItem {
  mediaId?: string
  operationId?: string
}

interface BulkOperationItem {
  id: string
  operationId: string
  operationType: 'delete' | 'move' | 'tag'
  filename: string
  progress: number
  status: 'pending' | 'processing' | 'complete' | 'error'
  error?: string
}

interface BulkOperationPreview {
  selectedItems: Set<string>
  operationType: 'delete' | 'move' | 'tag'
  previewData: {
    totalSize: number
    totalSizeFormatted: string
    affectedCourses: string[]
    warnings: string[]
    estimatedTime: number
    operationId: string
  }
}

/**
 * Media-specific extensions to selection state
 */
interface MediaExtensions {
  // Backward compatibility alias
  selectedFiles: Set<string>

  // View preferences
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void

  // Upload dashboard state
  showUploadDashboard: boolean
  setShowUploadDashboard: (show: boolean) => void

  // Filter preferences (persisted)
  filterType: string
  setFilterType: (type: string) => void

  sortOrder: 'asc' | 'desc'
  setSortOrder: (order: 'asc' | 'desc') => void

  // Modal states
  showPreviewModal: boolean
  previewingFile: string | null
  setShowPreviewModal: (show: boolean, fileId?: string) => void

  showDeleteConfirm: boolean
  deletingFile: string | null
  setShowDeleteConfirm: (show: boolean, fileId?: string) => void

  // Upload progress management (following course-creation-ui pattern)
  uploads: Record<string, MediaUploadItem>
  addUpload: (upload: MediaUploadItem) => void
  updateUpload: (id: string, updates: Partial<MediaUploadItem>) => void
  removeUpload: (id: string) => void
  clearCompletedUploads: () => void
  getUploadsArray: () => MediaUploadItem[]
  getTotalUploadProgress: () => number

  // Bulk operations progress (following same pattern)
  bulkOperations: Record<string, BulkOperationItem>
  addBulkOperation: (operation: BulkOperationItem) => void
  updateBulkOperation: (operationId: string, updates: Partial<BulkOperationItem>) => void
  removeBulkOperation: (operationId: string) => void
  clearCompletedBulkOperations: () => void
  getBulkOperationsArray: () => BulkOperationItem[]

  // Enhanced bulk operation preview state
  bulkOperationPreview: BulkOperationPreview | null
  isPreviewLoading: boolean

  // Preview actions
  setBulkOperationPreview: (preview: BulkOperationPreview | null) => void
  setPreviewLoading: (loading: boolean) => void
  clearOperationPreview: () => void
}

/**
 * Media store state - extends selection store with media-specific features
 */
interface MediaStoreState extends SelectionStoreState, MediaExtensions {}

// Temporary cache for React Strict Mode stability (like course system persistence)
let uploadCache: Record<string, MediaUploadItem> = {}
const bulkOperationCache: Record<string, BulkOperationItem> = {}

/**
 * Create base selection store using the factory with auto-scroll support
 */
const baseStoreCreator = createSelectionStore({
  dataAttribute: 'data-selectable',
  enableAutoScroll: true
})

export const useMediaStore = create<MediaStoreState>((set, get) => {
  // Get the base store implementation
  const baseStore = baseStoreCreator.getState()

  return {
    // Inherit all base selection functionality from factory
    ...baseStore,

    // Add backward compatibility alias that stays in sync
    selectedFiles: new Set<string>(),

    // Override toggleSelection to keep selectedFiles in sync
    toggleSelection: (fileId: string) => {
      set((state) => {
        const newSelection = new Set(state.selectedItems)
        if (newSelection.has(fileId)) {
          newSelection.delete(fileId)
        } else {
          newSelection.add(fileId)
        }
        return {
          selectedItems: newSelection,
          selectedFiles: newSelection, // Keep in sync
          lastSelectedId: fileId
        }
      })
    },

    // Override selectRange to keep selectedFiles in sync
    selectRange: (fromId: string, toId: string, allFileIds: string[]) => {
      const fromIndex = allFileIds.indexOf(fromId)
      const toIndex = allFileIds.indexOf(toId)

      if (fromIndex === -1 || toIndex === -1) return

      const start = Math.min(fromIndex, toIndex)
      const end = Math.max(fromIndex, toIndex)
      const rangeIds = allFileIds.slice(start, end + 1)

      const { selectedItems } = get()
      const newSelection = new Set(selectedItems)
      rangeIds.forEach(id => newSelection.add(id))

      set({
        selectedItems: newSelection,
        selectedFiles: newSelection, // Keep in sync
        lastSelectedId: toId
      })
    },

    // Override selectAll to keep selectedFiles in sync
    selectAll: (fileIds: string[]) => {
      const newSelection = new Set(fileIds)
      set({
        selectedItems: newSelection,
        selectedFiles: newSelection, // Keep in sync
        lastSelectedId: fileIds[fileIds.length - 1] || null
      })
    },

    // Override clearSelection to keep selectedFiles in sync
    clearSelection: () => {
      const empty = new Set<string>()
      set({
        selectedItems: empty,
        selectedFiles: empty, // Keep in sync
        lastSelectedId: null
      })
    },

    // Override drag selection methods to keep selectedFiles in sync
    startDragSelection: (point, mode) => {
      const { selectedItems } = get()
      const originalSelection = new Set(selectedItems)
      const newSelectedItems = mode === 'replace' ? new Set<string>() : selectedItems

      set({
        selectedItems: newSelectedItems,
        selectedFiles: newSelectedItems, // Keep in sync
        dragSelection: {
          isActive: true,
          startPoint: point,
          currentPoint: point,
          selectedDuringDrag: new Set<string>(),
          selectionMode: mode,
          originalSelection: originalSelection
        }
      })
    },

    updateDragSelection: (point, intersectingIds) => {
      const { dragSelection } = get()
      if (!dragSelection.isActive) return

      set({
        dragSelection: {
          ...dragSelection,
          currentPoint: point,
          selectedDuringDrag: new Set(intersectingIds)
        }
      })
    },

    finalizeDragSelection: () => {
      const { selectedItems, dragSelection } = get()
      if (!dragSelection.isActive) return

      let newSelection: Set<string>

      switch (dragSelection.selectionMode) {
        case 'replace':
          newSelection = new Set(dragSelection.selectedDuringDrag)
          break
        case 'add':
          newSelection = new Set([...selectedItems, ...dragSelection.selectedDuringDrag])
          break
        case 'range':
          newSelection = new Set([...selectedItems, ...dragSelection.selectedDuringDrag])
          break
        default:
          newSelection = selectedItems
      }

      set({
        selectedItems: newSelection,
        selectedFiles: newSelection, // Keep in sync
        dragSelection: {
          isActive: false,
          startPoint: null,
          currentPoint: null,
          selectedDuringDrag: new Set<string>(),
          selectionMode: 'replace',
          originalSelection: null
        }
      })
    },

    cancelDragSelection: () => {
      const { dragSelection } = get()
      const shouldRestoreSelection = dragSelection.selectionMode === 'replace' && dragSelection.originalSelection

      set({
        selectedItems: shouldRestoreSelection ? dragSelection.originalSelection! : get().selectedItems,
        selectedFiles: shouldRestoreSelection ? dragSelection.originalSelection! : get().selectedItems,
        dragSelection: {
          isActive: false,
          startPoint: null,
          currentPoint: null,
          selectedDuringDrag: new Set<string>(),
          selectionMode: 'replace',
          originalSelection: null
        }
      })
    },

    // Media-specific features
    viewMode: 'grid',
    setViewMode: (mode) => set({ viewMode: mode }),

    showUploadDashboard: false,
    setShowUploadDashboard: (show) => set({ showUploadDashboard: show }),

    // Auto-scroll methods inherit from base, no need to override
    startAutoScroll: baseStore.startAutoScroll!,
    stopAutoScroll: baseStore.stopAutoScroll!,

    // Filter preferences
    filterType: 'all',
    setFilterType: (type) => set({ filterType: type }),

    sortOrder: 'desc',
    setSortOrder: (order) => set({ sortOrder: order }),

    // Modal states
    showPreviewModal: false,
    previewingFile: null,
    setShowPreviewModal: (show, fileId) => set({
      showPreviewModal: show,
      previewingFile: show ? fileId || null : null
    }),

    showDeleteConfirm: false,
    deletingFile: null,
    setShowDeleteConfirm: (show, fileId) => set({
      showDeleteConfirm: show,
      deletingFile: show ? fileId || null : null
    }),

    // Upload progress management (with React Strict Mode stability cache)
    uploads: uploadCache, // Initialize from cache for stability
    addUpload: (upload) => set(state => {
      const newUploads = { ...state.uploads, [upload.id]: upload }
      uploadCache = newUploads // Sync to cache
      return { uploads: newUploads }
    }),
    updateUpload: (id, updates) => set(state => {
      const newUploads = {
        ...state.uploads,
        [id]: { ...state.uploads[id], ...updates }
      }
      uploadCache = newUploads // Sync to cache
      return { uploads: newUploads }
    }),
    removeUpload: (id) => set(state => {
      const newUploads = { ...state.uploads }
      delete newUploads[id]
      uploadCache = newUploads // Sync to cache
      return { uploads: newUploads }
    }),
    clearCompletedUploads: () => set(state => {
      const newUploads = Object.fromEntries(
        Object.entries(state.uploads).filter(([_, upload]) => upload.status !== 'complete')
      )
      uploadCache = newUploads // Sync to cache
      return { uploads: newUploads }
    }),
    getUploadsArray: () => Object.values(get().uploads),
    getTotalUploadProgress: () => {
      const uploads = Object.values(get().uploads)
      if (uploads.length === 0) return 100
      const totalProgress = uploads.reduce((sum, upload) => sum + upload.progress, 0)
      return Math.round(totalProgress / uploads.length)
    },

    // Bulk operations progress (following same pattern)
    bulkOperations: {},

    // Enhanced bulk operation preview state
    bulkOperationPreview: null,
    isPreviewLoading: false,
    addBulkOperation: (operation) => set(state => ({
      bulkOperations: { ...state.bulkOperations, [operation.operationId]: operation }
    })),
    updateBulkOperation: (operationId, updates) => set(state => ({
      bulkOperations: {
        ...state.bulkOperations,
        [operationId]: { ...state.bulkOperations[operationId], ...updates }
      }
    })),
    removeBulkOperation: (operationId) => set(state => {
      const newOperations = { ...state.bulkOperations }
      delete newOperations[operationId]
      return { bulkOperations: newOperations }
    }),
    clearCompletedBulkOperations: () => set(state => {
      const newOperations = Object.fromEntries(
        Object.entries(state.bulkOperations).filter(([_, op]) => op.status !== 'complete')
      )
      return { bulkOperations: newOperations }
    }),
    getBulkOperationsArray: () => Object.values(get().bulkOperations),

    // Preview actions implementation
    setBulkOperationPreview: (preview) => set({ bulkOperationPreview: preview }),
    setPreviewLoading: (loading) => set({ isPreviewLoading: loading }),
    clearOperationPreview: () => set({
      bulkOperationPreview: null,
      isPreviewLoading: false
    })
  }
})
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
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

interface MediaStoreState {
  // View preferences
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
  
  // Upload dashboard state
  showUploadDashboard: boolean
  setShowUploadDashboard: (show: boolean) => void
  
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
}

// Temporary cache for React Strict Mode stability (like course system persistence)
let uploadCache: Record<string, MediaUploadItem> = {}
const bulkOperationCache: Record<string, BulkOperationItem> = {}

export const useMediaStore = create<MediaStoreState>((set, get) => ({
  // View preferences
  viewMode: 'grid',
  setViewMode: (mode) => set({ viewMode: mode }),
  
  // Upload dashboard state
  showUploadDashboard: false,
  setShowUploadDashboard: (show) => set({ showUploadDashboard: show }),
  
  // Selection state
  selectedFiles: new Set<string>(),
  
  // Drag selection state
  dragSelection: {
    isActive: false,
    startPoint: null,
    currentPoint: null,
    selectedDuringDrag: new Set<string>()
  },
  
  // Auto-scroll state
  autoScroll: {
    isScrolling: false,
    direction: null,
    speed: 0
  },
  
  // Selection methods
  toggleSelection: (fileId) => {
    const { selectedFiles } = get()
    const newSelection = new Set(selectedFiles)
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId)
    } else {
      newSelection.add(fileId)
    }
    set({ selectedFiles: newSelection })
  },
  
  selectRange: (fromId, toId, allFileIds) => {
    const fromIndex = allFileIds.indexOf(fromId)
    const toIndex = allFileIds.indexOf(toId)
    
    if (fromIndex === -1 || toIndex === -1) return
    
    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    const rangeIds = allFileIds.slice(start, end + 1)
    
    const { selectedFiles } = get()
    const newSelection = new Set(selectedFiles)
    rangeIds.forEach(id => newSelection.add(id))
    
    set({ selectedFiles: newSelection })
  },
  
  selectAll: (fileIds) => {
    set({ selectedFiles: new Set(fileIds) })
  },
  
  clearSelection: () => {
    set({ 
      selectedFiles: new Set<string>(),
      dragSelection: {
        isActive: false,
        startPoint: null,
        currentPoint: null,
        selectedDuringDrag: new Set<string>()
      }
    })
  },
  
  // Drag selection methods
  startDragSelection: (point) => {
    console.log('[STORE] Starting drag selection at:', point)
    set({
      dragSelection: {
        isActive: true,
        startPoint: point,
        currentPoint: point,
        selectedDuringDrag: new Set<string>()
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
    const { selectedFiles, dragSelection } = get()
    if (!dragSelection.isActive) return
    
    // Merge selected during drag with existing selection
    const newSelection = new Set([...selectedFiles, ...dragSelection.selectedDuringDrag])
    
    set({
      selectedFiles: newSelection,
      dragSelection: {
        isActive: false,
        startPoint: null,
        currentPoint: null,
        selectedDuringDrag: new Set<string>()
      }
    })
  },
  
  cancelDragSelection: () => {
    set({
      dragSelection: {
        isActive: false,
        startPoint: null,
        currentPoint: null,
        selectedDuringDrag: new Set<string>()
      }
    })
  },
  
  // Auto-scroll methods
  startAutoScroll: (direction, speed) => {
    set({
      autoScroll: {
        isScrolling: true,
        direction,
        speed
      }
    })
  },
  
  stopAutoScroll: () => {
    set({
      autoScroll: {
        isScrolling: false,
        direction: null,
        speed: 0
      }
    })
  },
  
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
}))
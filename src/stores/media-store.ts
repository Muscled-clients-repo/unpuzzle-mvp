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
  selectedFiles: string[]
  setSelectedFiles: (files: string[]) => void
  toggleFileSelection: (fileId: string) => void
  clearSelection: () => void
  
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
  selectedFiles: [],
  setSelectedFiles: (files) => set({ selectedFiles: files }),
  toggleFileSelection: (fileId) => {
    const { selectedFiles } = get()
    const isSelected = selectedFiles.includes(fileId)
    set({
      selectedFiles: isSelected 
        ? selectedFiles.filter(id => id !== fileId)
        : [...selectedFiles, fileId]
    })
  },
  clearSelection: () => set({ selectedFiles: [] }),
  
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
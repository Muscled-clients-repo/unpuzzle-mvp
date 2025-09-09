import { create } from 'zustand'

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
}

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
}))
import { create } from 'zustand'

/**
 * Zustand store for blog UI state
 * Pattern 08: Pure UI state only - no server data
 */
interface BlogUIStore {
  // Table filters and preferences
  tableFilters: {
    status: 'all' | 'draft' | 'published' | 'archived'
    category: string
    search: string
  }
  setTableFilter: (key: keyof BlogUIStore['tableFilters'], value: string) => void
  resetTableFilters: () => void

  // Preview modal
  previewModal: {
    isOpen: boolean
    postId: string | null
  }
  openPreviewModal: (postId: string) => void
  closePreviewModal: () => void

  // Delete confirmation modal
  deleteModal: {
    isOpen: boolean
    postId: string | null
  }
  openDeleteModal: (postId: string) => void
  closeDeleteModal: () => void
}

export const useBlogUIStore = create<BlogUIStore>((set) => ({
  // Table filters
  tableFilters: {
    status: 'all',
    category: 'all',
    search: ''
  },
  setTableFilter: (key, value) =>
    set((state) => ({
      tableFilters: { ...state.tableFilters, [key]: value }
    })),
  resetTableFilters: () =>
    set({
      tableFilters: {
        status: 'all',
        category: 'all',
        search: ''
      }
    }),

  // Preview modal
  previewModal: {
    isOpen: false,
    postId: null
  },
  openPreviewModal: (postId) =>
    set({ previewModal: { isOpen: true, postId } }),
  closePreviewModal: () =>
    set({ previewModal: { isOpen: false, postId: null } }),

  // Delete confirmation modal
  deleteModal: {
    isOpen: false,
    postId: null
  },
  openDeleteModal: (postId) =>
    set({ deleteModal: { isOpen: true, postId } }),
  closeDeleteModal: () =>
    set({ deleteModal: { isOpen: false, postId: null } })
}))

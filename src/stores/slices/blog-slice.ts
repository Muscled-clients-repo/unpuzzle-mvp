import { StateCreator } from 'zustand'

export interface BlogUIState {
  // UI state only - no blog data
  selectedCategory: string
  searchQuery: string
  likedPosts: string[] // post IDs
}

export interface BlogSlice extends BlogUIState {
  // Actions for UI state
  setSelectedCategory: (category: string) => void
  setSearchQuery: (query: string) => void
  toggleLikePost: (postId: string) => void
  resetBlogFilters: () => void
}

export const createBlogSlice: StateCreator<BlogSlice> = (set, get) => ({
  // Initial UI state
  selectedCategory: 'all',
  searchQuery: '',
  likedPosts: [],

  // UI Actions only
  setSelectedCategory: (category: string) => {
    set({ selectedCategory: category })
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  toggleLikePost: (postId: string) => {
    const { likedPosts } = get()
    const isLiked = likedPosts.includes(postId)
    
    set({
      likedPosts: isLiked 
        ? likedPosts.filter(id => id !== postId)
        : [...likedPosts, postId]
    })
  },

  resetBlogFilters: () => {
    set({
      selectedCategory: 'all',
      searchQuery: ''
    })
  }
})
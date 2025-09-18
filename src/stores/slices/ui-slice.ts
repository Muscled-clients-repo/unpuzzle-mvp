import { StateCreator } from 'zustand'

/**
 * UI State - Pure UI concerns only, no server data
 */
export interface UIState {
  // Wizard Navigation
  currentWizardStep: 'info' | 'content' | 'review'
  
  // Modal Management
  activeModals: string[]
  modalData: Record<string, any>
  
  // Upload Progress (transient UI state for visual feedback)
  uploadProgress: Record<string, number>
  
  // Form States (temporary form data before submission)
  formErrors: Record<string, string[]>
  formTouched: Record<string, boolean>
  isDirty: boolean
  
  // Loading States (for UI transitions, not server loading)
  isWizardTransitioning: boolean
  isSidebarLoading: boolean
  
  // User Preferences (persisted)
  autoSave: boolean
  theme: 'light' | 'dark' | 'system'
  sidebarCollapsed: boolean
  videoPlayerVolume: number
  videoPlayerSpeed: number

  // Transcript Panel UI State
  transcriptPanelOpen: boolean
  transcriptPanelWidth: number
  highlightedSegmentIndex: number | null
  autoScrollTranscript: boolean

  // Temporary UI State
  selectedVideoIds: string[]
  draggedVideoId: string | null
  hoveredChapterId: string | null
  activeTab: string
  searchQuery: string
  filterStatus: 'all' | 'draft' | 'published'
}

/**
 * UI Actions - Methods to update UI state
 */
export interface UIActions {
  // Wizard Navigation
  setWizardStep: (step: UIState['currentWizardStep']) => void
  nextWizardStep: () => void
  prevWizardStep: () => void
  resetWizard: () => void
  
  // Modal Management
  openModal: (modalId: string, data?: any) => void
  closeModal: (modalId: string) => void
  closeAllModals: () => void
  updateModalData: (modalId: string, data: any) => void
  
  // Upload Progress (used by video mutations)
  setUploadProgress: (videoId: string, progress: number) => void
  clearUploadProgress: (videoId: string) => void
  clearAllUploadProgress: () => void
  
  // Form Management
  setFormError: (field: string, errors: string[]) => void
  clearFormError: (field: string) => void
  clearAllFormErrors: () => void
  setFormTouched: (field: string, touched: boolean) => void
  setFormDirty: (dirty: boolean) => void
  resetFormState: () => void
  
  // User Preferences
  toggleAutoSave: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleSidebar: () => void
  setVideoPlayerVolume: (volume: number) => void
  setVideoPlayerSpeed: (speed: number) => void
  
  // Temporary UI State
  setSelectedVideos: (videoIds: string[]) => void
  toggleVideoSelection: (videoId: string) => void
  clearVideoSelection: () => void
  setDraggedVideo: (videoId: string | null) => void
  setHoveredChapter: (chapterId: string | null) => void
  setActiveTab: (tab: string) => void
  setSearchQuery: (query: string) => void
  setFilterStatus: (status: 'all' | 'draft' | 'published') => void
  
  // Loading States
  setWizardTransitioning: (transitioning: boolean) => void
  setSidebarLoading: (loading: boolean) => void

  // Transcript Panel Actions
  setTranscriptPanelOpen: (open: boolean) => void
  setTranscriptPanelWidth: (width: number) => void
  setHighlightedSegmentIndex: (index: number | null) => void
  setAutoScrollTranscript: (autoScroll: boolean) => void

  // Reset Everything
  resetUI: () => void
}

/**
 * Combined UI Slice Type
 */
export interface UISlice extends UIState, UIActions {}

/**
 * Initial UI State
 */
const initialUIState: UIState = {
  // Wizard
  currentWizardStep: 'info',
  
  // Modals
  activeModals: [],
  modalData: {},
  
  // Upload Progress
  uploadProgress: {},
  
  // Form State
  formErrors: {},
  formTouched: {},
  isDirty: false,
  
  // Loading
  isWizardTransitioning: false,
  isSidebarLoading: false,
  
  // Preferences (will be persisted)
  autoSave: true,
  theme: 'system',
  sidebarCollapsed: false,
  videoPlayerVolume: 1,
  videoPlayerSpeed: 1,
  
  // Temporary UI
  selectedVideoIds: [],
  draggedVideoId: null,
  hoveredChapterId: null,
  activeTab: 'content',
  searchQuery: '',
  filterStatus: 'all',
}

/**
 * Create UI Slice
 */
export const createUISlice: StateCreator<UISlice> = (set, get) => ({
  ...initialUIState,
  
  // Wizard Navigation
  setWizardStep: (step) => set({ currentWizardStep: step }),
  
  nextWizardStep: () => set((state) => {
    const steps: UIState['currentWizardStep'][] = ['info', 'content', 'review']
    const currentIndex = steps.indexOf(state.currentWizardStep)
    const nextIndex = Math.min(currentIndex + 1, steps.length - 1)
    return { 
      currentWizardStep: steps[nextIndex],
      isWizardTransitioning: true 
    }
  }),
  
  prevWizardStep: () => set((state) => {
    const steps: UIState['currentWizardStep'][] = ['info', 'content', 'review']
    const currentIndex = steps.indexOf(state.currentWizardStep)
    const prevIndex = Math.max(currentIndex - 1, 0)
    return { 
      currentWizardStep: steps[prevIndex],
      isWizardTransitioning: true 
    }
  }),
  
  resetWizard: () => set({ 
    currentWizardStep: 'info',
    isWizardTransitioning: false 
  }),
  
  // Modal Management
  openModal: (modalId, data) => set((state) => ({
    activeModals: state.activeModals.includes(modalId) 
      ? state.activeModals 
      : [...state.activeModals, modalId],
    modalData: data ? { ...state.modalData, [modalId]: data } : state.modalData
  })),
  
  closeModal: (modalId) => set((state) => ({
    activeModals: state.activeModals.filter(id => id !== modalId),
    modalData: { ...state.modalData, [modalId]: undefined }
  })),
  
  closeAllModals: () => set({ 
    activeModals: [], 
    modalData: {} 
  }),
  
  updateModalData: (modalId, data) => set((state) => ({
    modalData: { ...state.modalData, [modalId]: data }
  })),
  
  // Upload Progress
  setUploadProgress: (videoId, progress) => set((state) => ({
    uploadProgress: { ...state.uploadProgress, [videoId]: progress }
  })),
  
  clearUploadProgress: (videoId) => set((state) => {
    const { [videoId]: _, ...rest } = state.uploadProgress
    return { uploadProgress: rest }
  }),
  
  clearAllUploadProgress: () => set({ uploadProgress: {} }),
  
  // Form Management
  setFormError: (field, errors) => set((state) => ({
    formErrors: { ...state.formErrors, [field]: errors },
    isDirty: true
  })),
  
  clearFormError: (field) => set((state) => {
    const { [field]: _, ...rest } = state.formErrors
    return { formErrors: rest }
  }),
  
  clearAllFormErrors: () => set({ formErrors: {} }),
  
  setFormTouched: (field, touched) => set((state) => ({
    formTouched: { ...state.formTouched, [field]: touched }
  })),
  
  setFormDirty: (dirty) => set({ isDirty: dirty }),
  
  resetFormState: () => set({
    formErrors: {},
    formTouched: {},
    isDirty: false
  }),
  
  // User Preferences
  toggleAutoSave: () => set((state) => ({ 
    autoSave: !state.autoSave 
  })),
  
  setTheme: (theme) => set({ theme }),
  
  toggleSidebar: () => set((state) => ({ 
    sidebarCollapsed: !state.sidebarCollapsed 
  })),
  
  setVideoPlayerVolume: (volume) => set({ 
    videoPlayerVolume: Math.max(0, Math.min(1, volume)) 
  }),
  
  setVideoPlayerSpeed: (speed) => set({ 
    videoPlayerSpeed: Math.max(0.25, Math.min(2, speed)) 
  }),
  
  // Temporary UI State
  setSelectedVideos: (videoIds) => set({ 
    selectedVideoIds: videoIds 
  }),
  
  toggleVideoSelection: (videoId) => set((state) => ({
    selectedVideoIds: state.selectedVideoIds.includes(videoId)
      ? state.selectedVideoIds.filter(id => id !== videoId)
      : [...state.selectedVideoIds, videoId]
  })),
  
  clearVideoSelection: () => set({ 
    selectedVideoIds: [] 
  }),
  
  setDraggedVideo: (videoId) => set({ 
    draggedVideoId: videoId 
  }),
  
  setHoveredChapter: (chapterId) => set({ 
    hoveredChapterId: chapterId 
  }),
  
  setActiveTab: (tab) => set({ 
    activeTab: tab 
  }),
  
  setSearchQuery: (query) => set({ 
    searchQuery: query 
  }),
  
  setFilterStatus: (status) => set({ 
    filterStatus: status 
  }),
  
  // Loading States
  setWizardTransitioning: (transitioning) => set({ 
    isWizardTransitioning: transitioning 
  }),
  
  setSidebarLoading: (loading) => set({
    isSidebarLoading: loading
  }),

  // Transcript Panel Actions
  setTranscriptPanelOpen: (open) => set({
    transcriptPanelOpen: open
  }),

  setTranscriptPanelWidth: (width) => set({
    transcriptPanelWidth: width
  }),

  setHighlightedSegmentIndex: (index) => set({
    highlightedSegmentIndex: index
  }),

  setAutoScrollTranscript: (autoScroll) => set({
    autoScrollTranscript: autoScroll
  }),

  // Reset Everything
  resetUI: () => set(initialUIState),
})
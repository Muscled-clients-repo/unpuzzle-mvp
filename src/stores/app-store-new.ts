import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { UISlice, createUISlice } from './slices/ui-slice'

/**
 * New Minimal App Store
 * Only contains UI state - server state is managed by TanStack Query
 */
export interface AppStore extends UISlice {}

/**
 * Create the store with persistence for user preferences only
 */
export const useAppStore = create<AppStore>()(
  persist(
    (set, get, api) => ({
      ...createUISlice(set, get, api),
    }),
    {
      name: 'unpuzzle-ui-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist user preferences, not transient UI state
        autoSave: state.autoSave,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        videoPlayerVolume: state.videoPlayerVolume,
        videoPlayerSpeed: state.videoPlayerSpeed,
      }),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Handle migrations if needed in the future
        return persistedState as AppStore
      },
    }
  )
)

/**
 * Selectors for common UI state combinations
 * Using shallow comparison to prevent infinite loops
 */
import { shallow } from 'zustand/shallow'

export const useWizardState = () => {
  const currentStep = useAppStore((state) => state.currentWizardStep)
  const isTransitioning = useAppStore((state) => state.isWizardTransitioning)
  const setWizardStep = useAppStore((state) => state.setWizardStep)
  const next = useAppStore((state) => state.nextWizardStep)
  const prev = useAppStore((state) => state.prevWizardStep)
  const reset = useAppStore((state) => state.resetWizard)
  
  return { currentStep, isTransitioning, setWizardStep, next, prev, reset }
}

export const useModalState = (modalId: string) => {
  const isOpen = useAppStore((state) => state.activeModals.includes(modalId))
  const data = useAppStore((state) => state.modalData[modalId])
  const openModal = useAppStore((state) => state.openModal)
  const closeModal = useAppStore((state) => state.closeModal)
  const updateModalData = useAppStore((state) => state.updateModalData)
  
  return {
    isOpen,
    data,
    open: (data?: any) => openModal(modalId, data),
    close: () => closeModal(modalId),
    update: (data: any) => updateModalData(modalId, data),
  }
}

export const useUploadProgress = () => {
  const progress = useAppStore((state) => state.uploadProgress, shallow)
  const setProgress = useAppStore((state) => state.setUploadProgress)
  const clearProgress = useAppStore((state) => state.clearUploadProgress)
  const clearAll = useAppStore((state) => state.clearAllUploadProgress)
  
  return { progress, setProgress, clearProgress, clearAll }
}

export const useFormState = () => {
  const errors = useAppStore((state) => state.formErrors, shallow)
  const touched = useAppStore((state) => state.formTouched, shallow)
  const isDirty = useAppStore((state) => state.isDirty)
  const setError = useAppStore((state) => state.setFormError)
  const clearError = useAppStore((state) => state.clearFormError)
  const clearAllFormErrors = useAppStore((state) => state.clearAllFormErrors)
  const setTouched = useAppStore((state) => state.setFormTouched)
  const setFormDirty = useAppStore((state) => state.setFormDirty)
  const reset = useAppStore((state) => state.resetFormState)
  
  return { errors, touched, isDirty, setError, clearError, clearAllFormErrors, setTouched, setFormDirty, reset }
}

export const usePreferences = () => {
  const autoSave = useAppStore((state) => state.autoSave)
  const theme = useAppStore((state) => state.theme)
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const toggleAutoSave = useAppStore((state) => state.toggleAutoSave)
  const setTheme = useAppStore((state) => state.setTheme)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  
  return { autoSave, theme, sidebarCollapsed, toggleAutoSave, setTheme, toggleSidebar }
}

export const useVideoSelection = () => {
  const selected = useAppStore((state) => state.selectedVideoIds, shallow)
  const setSelected = useAppStore((state) => state.setSelectedVideos)
  const toggle = useAppStore((state) => state.toggleVideoSelection)
  const clear = useAppStore((state) => state.clearVideoSelection)
  
  return { selected, setSelected, toggle, clear }
}

export const useDragState = () => {
  const draggedVideoId = useAppStore((state) => state.draggedVideoId)
  const hoveredChapterId = useAppStore((state) => state.hoveredChapterId)
  const setDraggedVideo = useAppStore((state) => state.setDraggedVideo)
  const setHoveredChapter = useAppStore((state) => state.setHoveredChapter)
  
  return { draggedVideoId, hoveredChapterId, setDraggedVideo, setHoveredChapter }
}

/**
 * Hook to check if user has unsaved changes
 */
export const useHasUnsavedChanges = () => {
  const isDirty = useAppStore((state) => state.isDirty)
  const uploadProgress = useAppStore((state) => state.uploadProgress)
  
  // Has unsaved changes if form is dirty or uploads in progress
  const hasActiveUploads = Object.keys(uploadProgress).length > 0
  
  return isDirty || hasActiveUploads
}

/**
 * Dev-only hook to inspect entire UI state
 */
export const useDebugUIState = () => {
  if (process.env.NODE_ENV === 'production') {
    return null
  }
  return useAppStore((state) => state)
}
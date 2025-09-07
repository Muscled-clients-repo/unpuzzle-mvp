import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { CourseCreationData, UploadItem, DragItem, DropTarget, EditingState, ModalState } from '@/types'

interface CourseCreationUIState {
  // ===== WIZARD NAVIGATION =====
  currentStep: 1 | 2 | 3 | 4 // 1=Basic, 2=Structure, 3=Upload, 4=Review
  completedSteps: Set<number>
  canProceedToStep: (step: number) => boolean
  setStep: (step: number) => void
  markStepCompleted: (step: number) => void
  
  // ===== REMOVED: courseData (violates architecture - TanStack owns server data) =====
  
  // ===== FORM DATA (Temporary edits, UI state) =====
  formData: CourseCreationData
  updateFormData: <K extends keyof CourseCreationData>(field: K, value: CourseCreationData[K]) => void
  validateForm: () => boolean
  clearForm: () => void
  
  // ===== EDITING STATES =====
  editing: EditingState
  startEdit: (type: EditingState['type'], id: string, field?: string) => void
  stopEdit: () => void
  isEditing: (type: string, id: string, field?: string) => boolean
  
  // ===== MODAL MANAGEMENT =====
  modal: ModalState
  openModal: (type: ModalState['type'], data?: any) => void
  closeModal: () => void
  
  // ===== DRAG & DROP STATE =====
  dragState: {
    isDragging: boolean
    dragItem: DragItem | null
    dropTarget: DropTarget | null
    previewData: any
  }
  startDrag: (item: DragItem) => void
  updateDragTarget: (target: DropTarget | null) => void
  endDrag: () => void
  
  // ===== UPLOAD MANAGEMENT REMOVED (Architecture violation - TanStack owns server state) =====
  
  // ===== PENDING OPERATIONS =====
  pendingDeletes: Set<string> // IDs of items marked for deletion
  markForDeletion: (id: string) => void
  unmarkForDeletion: (id: string) => void
  clearPendingDeletes: () => void
  
  // ===== VIDEO EDITING STATE (UI State - what's being edited) =====
  videoPendingChanges: Record<string, string> // videoId -> newTitle
  setVideoPendingChange: (videoId: string, newTitle: string) => void
  removeVideoPendingChange: (videoId: string) => void
  clearAllVideoPendingChanges: () => void
  getVideoPendingChangesCount: () => number
  
  // ===== UI PREFERENCES =====
  preferences: {
    autoSave: boolean
    showUploadProgress: boolean
    chapterExpanded: Record<string, boolean>
    viewMode: 'list' | 'grid'
  }
  updatePreference: <K extends keyof CourseCreationUIState['preferences']>(
    key: K, 
    value: CourseCreationUIState['preferences'][K]
  ) => void
  
  // ===== COMPUTED GETTERS =====
  getTotalVideosCount: () => number
  getTotalUploadSize: () => number
  getValidationErrors: () => string[]
  hasUnsavedChanges: () => boolean
}

export const useCourseCreationUI = create<CourseCreationUIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentStep: 1,
        completedSteps: new Set(),
        formData: {
          title: '',
          description: '',
          price: null,
          difficulty: 'beginner',
          plannedChapters: [],
          uploads: {}
        },
        editing: { type: null, id: null },
        modal: { type: null },
        dragState: {
          isDragging: false,
          dragItem: null,
          dropTarget: null,
          previewData: null
        },
        pendingDeletes: new Set(),
        videoPendingChanges: {},
        preferences: {
          autoSave: true,
          showUploadProgress: true,
          chapterExpanded: {},
          viewMode: 'list'
        },

        // Navigation methods
        canProceedToStep: (step: number) => {
          const { completedSteps } = get()
          // Can always go to current or previous steps
          if (step <= Math.max(...completedSteps, 1)) return true
          // Can only proceed to next step if current is completed
          return completedSteps.has(step - 1)
        },

        setStep: (step) => {
          const { canProceedToStep } = get()
          if (canProceedToStep(step)) {
            set({ currentStep: step })
          }
        },

        markStepCompleted: (step) => {
          set((state) => ({
            completedSteps: new Set([...state.completedSteps, step])
          }))
        },

        // ARCHITECTURE-COMPLIANT: Removed server state methods (TanStack owns server data)

        // Form data methods (UI state - temporary edits)
        updateFormData: (field, value) => {
          set((state) => ({
            formData: {
              ...state.formData,
              [field]: value
            }
          }))
        },

        // ARCHITECTURE-COMPLIANT: Removed getDisplayValue (components read directly from TanStack + formData)

        validateForm: () => {
          const { formData } = get()
          return (formData.title && formData.title.trim().length > 0) && 
                 (formData.description && formData.description.trim().length > 0)
        },

        clearForm: () => {
          set({
            formData: {
              title: '',
              description: '',
              price: null,
              difficulty: 'beginner',
              plannedChapters: [],
              uploads: {}
            }
          })
        },

        // Editing methods
        startEdit: (type, id, field) => {
          set({ editing: { type, id, field } })
        },

        stopEdit: () => {
          set({ editing: { type: null, id: null } })
        },

        isEditing: (type, id, field) => {
          const { editing } = get()
          return editing.type === type && 
                 editing.id === id && 
                 (field === undefined || editing.field === field)
        },

        // Modal methods
        openModal: (type, data) => {
          set({ modal: { type, data } })
        },

        closeModal: () => {
          set({ modal: { type: null } })
        },

        // Drag & drop methods
        startDrag: (item) => {
          set({
            dragState: {
              isDragging: true,
              dragItem: item,
              dropTarget: null,
              previewData: null
            }
          })
        },

        updateDragTarget: (target) => {
          set((state) => ({
            dragState: {
              ...state.dragState,
              dropTarget: target
            }
          }))
        },

        endDrag: () => {
          set({
            dragState: {
              isDragging: false,
              dragItem: null,
              dropTarget: null,
              previewData: null
            }
          })
        },

        // ARCHITECTURE-COMPLIANT: Removed upload methods (TanStack owns server state)

        // Pending deletes methods
        markForDeletion: (id) => {
          set((state) => ({
            pendingDeletes: new Set([...state.pendingDeletes, id])
          }))
        },

        unmarkForDeletion: (id) => {
          set((state) => {
            const newPendingDeletes = new Set(state.pendingDeletes)
            newPendingDeletes.delete(id)
            return { pendingDeletes: newPendingDeletes }
          })
        },

        clearPendingDeletes: () => {
          set({ pendingDeletes: new Set() })
        },

        // Video pending changes methods (UI state for what's being edited)
        setVideoPendingChange: (videoId, newTitle) => {
          set((state) => ({
            videoPendingChanges: {
              ...state.videoPendingChanges,
              [videoId]: newTitle
            }
          }))
        },

        removeVideoPendingChange: (videoId) => {
          set((state) => {
            const newPendingChanges = { ...state.videoPendingChanges }
            delete newPendingChanges[videoId]
            return { videoPendingChanges: newPendingChanges }
          })
        },

        clearAllVideoPendingChanges: () => {
          set({ videoPendingChanges: {} })
        },

        getVideoPendingChangesCount: () => {
          const { videoPendingChanges } = get()
          return Object.keys(videoPendingChanges).length
        },

        // Preferences methods
        updatePreference: (key, value) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              [key]: value
            }
          }))
        },

        // Computed getters
        getTotalVideosCount: () => {
          const { formData } = get()
          return formData.plannedChapters.reduce(
            (total, chapter) => total + chapter.plannedVideos.length, 0
          )
        },

        getTotalUploadSize: () => {
          const { uploads } = get()
          return Object.values(uploads).reduce(
            (total, upload) => total + upload.file.size, 0
          )
        },

        getValidationErrors: () => {
          const { formData } = get()
          const errors: string[] = []
          
          if (!formData.title || !formData.title.trim()) errors.push('Course title is required')
          if (!formData.description || !formData.description.trim()) errors.push('Course description is required')
          if (formData.plannedChapters.length === 0) errors.push('At least one chapter is required')
          
          return errors
        },

        hasUnsavedChanges: () => {
          const { formData } = get()
          return (formData.title && formData.title.trim().length > 0) ||
                 (formData.description && formData.description.trim().length > 0)
        }
      }),
      {
        name: 'course-creation-ui',
        partialize: (state) => ({
          preferences: state.preferences,
          formData: {
            ...state.formData,
            uploads: {} // Don't persist file objects
          }
        })
      }
    )
  )
)
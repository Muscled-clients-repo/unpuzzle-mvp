import { create } from 'zustand'
import { createSelectionStore, SelectionStoreState } from './create-selection-store'

/**
 * Project-specific extensions to selection state
 */
interface ProjectsExtensions {
  // Backward compatibility aliases
  selectedProjects: Set<string>
  toggleProjectSelection: (projectId: string) => void
  selectAllProjects: (projectIds: string[]) => void
  clearProjectSelection: () => void

  // Project-specific bulk operation preview
  bulkOperationPreview: {
    selectedItems: Set<string>
    operationType: 'delete' | 'tag'
    previewData?: any
  } | null
  setBulkOperationPreview: (preview: ProjectsSelectionState['bulkOperationPreview']) => void

  isPreviewLoading: boolean
  setPreviewLoading: (loading: boolean) => void
}

/**
 * Projects selection store - extends generic selection with project-specific features
 */
interface ProjectsSelectionState extends SelectionStoreState, ProjectsExtensions {}

/**
 * Create base selection store using the factory
 * This gives us all the standard selection functionality
 */
const baseStoreCreator = createSelectionStore({
  dataAttribute: 'data-selectable-project'
})

/**
 * Projects selection store - uses factory for selection logic, adds project-specific features
 */
export const useProjectsSelectionStore = create<ProjectsSelectionState>((set, get) => {
  // Get the base store implementation
  const baseStore = baseStoreCreator.getState()

  return {
    // Inherit all base selection functionality from factory
    ...baseStore,

    // Add backward compatibility alias that stays in sync
    selectedProjects: new Set<string>(),

    // Override toggleSelection to keep selectedProjects in sync
    toggleSelection: (itemId: string) => {
      set((state) => {
        const newSelection = new Set(state.selectedItems)

        if (newSelection.has(itemId)) {
          newSelection.delete(itemId)
        } else {
          newSelection.add(itemId)
        }

        return {
          selectedItems: newSelection,
          selectedProjects: newSelection, // Keep in sync
          lastSelectedId: itemId
        }
      })
    },

    // Backward compatibility wrapper methods
    toggleProjectSelection: (projectId: string) => {
      get().toggleSelection(projectId)
    },

    selectAllProjects: (projectIds: string[]) => {
      const newSelection = new Set(projectIds)
      set({
        selectedItems: newSelection,
        selectedProjects: newSelection, // Keep in sync
        lastSelectedId: projectIds[projectIds.length - 1] || null
      })
    },

    clearProjectSelection: () => {
      const empty = new Set<string>()
      set({
        selectedItems: empty,
        selectedProjects: empty, // Keep in sync
        lastSelectedId: null,
        bulkOperationPreview: null
      })
    },

    // Override selectRange to keep selectedProjects in sync
    selectRange: (fromId: string, toId: string, allItemIds: string[]) => {
      const fromIndex = allItemIds.indexOf(fromId)
      const toIndex = allItemIds.indexOf(toId)

      if (fromIndex === -1 || toIndex === -1) return

      const start = Math.min(fromIndex, toIndex)
      const end = Math.max(fromIndex, toIndex)
      const rangeIds = allItemIds.slice(start, end + 1)

      const { selectedItems } = get()
      const newSelection = new Set(selectedItems)
      rangeIds.forEach(id => newSelection.add(id))

      set({
        selectedItems: newSelection,
        selectedProjects: newSelection, // Keep in sync
        lastSelectedId: toId
      })
    },

    // Override drag selection methods to keep selectedProjects in sync
    startDragSelection: (point, mode) => {
      const { selectedItems } = get()
      const originalSelection = new Set(selectedItems)
      const newSelectedItems = mode === 'replace' ? new Set<string>() : selectedItems

      set({
        selectedItems: newSelectedItems,
        selectedProjects: newSelectedItems, // Keep in sync
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
        selectedProjects: newSelection, // Keep in sync
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
        selectedProjects: shouldRestoreSelection ? dragSelection.originalSelection! : get().selectedItems,
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

    // Project-specific extensions
    bulkOperationPreview: null,
    isPreviewLoading: false,

    setBulkOperationPreview: (preview) => {
      set({ bulkOperationPreview: preview })
    },

    setPreviewLoading: (loading) => {
      set({ isPreviewLoading: loading })
    }
  }
})

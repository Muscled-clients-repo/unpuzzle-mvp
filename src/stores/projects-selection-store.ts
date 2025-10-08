import { create } from 'zustand'
import { SelectionStoreState } from './create-selection-store'

/**
 * Projects selection store - extends generic selection with project-specific features
 * Uses the same selection logic as media store for consistency
 */
interface ProjectsSelectionState extends SelectionStoreState {
  // Rename generic properties for backward compatibility
  selectedProjects: Set<string>
  toggleProjectSelection: (projectId: string) => void
  selectAllProjects: (projectIds: string[]) => void
  clearProjectSelection: () => void

  // Drag selection state (matches media store pattern)
  dragSelection: {
    isActive: boolean
    startPoint: { x: number, y: number } | null
    currentPoint: { x: number, y: number } | null
    selectedDuringDrag: Set<string>
    selectionMode: 'replace' | 'add' | 'range'
    originalSelection: Set<string> | null
  }

  // Drag selection methods (matches media store pattern)
  startDragSelection: (point: { x: number, y: number }, mode: 'replace' | 'add' | 'range') => void
  updateDragSelection: (point: { x: number, y: number }, intersectingIds: string[]) => void
  finalizeDragSelection: () => void
  cancelDragSelection: () => void

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

export const useProjectsSelectionStore = create<ProjectsSelectionState>((set, get) => ({
  // Base selection state
  selectedItems: new Set<string>(),
  selectedProjects: new Set<string>(), // Direct property, not a getter
  lastSelectedId: null,

  // Base selection methods (implements SelectionStoreState)
  toggleSelection: (itemId: string) => {
    const { selectedItems } = get()
    const newSelection = new Set(selectedItems)

    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
    } else {
      newSelection.add(itemId)
    }

    set({
      selectedItems: newSelection,
      selectedProjects: newSelection, // Keep in sync
      lastSelectedId: itemId
    })
  },

  toggleProjectSelection: (projectId: string) => {
    // Direct implementation instead of calling toggleSelection to avoid stale state
    const { selectedProjects } = get()
    const newSelection = new Set(selectedProjects)

    if (newSelection.has(projectId)) {
      newSelection.delete(projectId)
    } else {
      newSelection.add(projectId)
    }

    set({
      selectedItems: newSelection,
      selectedProjects: newSelection,
      lastSelectedId: projectId
    })
  },

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

  selectAll: (itemIds: string[]) => {
    const newSelection = new Set(itemIds)
    set({
      selectedItems: newSelection,
      selectedProjects: newSelection, // Keep in sync
      lastSelectedId: itemIds[itemIds.length - 1] || null
    })
  },

  selectAllProjects: (projectIds: string[]) => {
    get().selectAll(projectIds)
  },

  clearSelection: () => {
    const empty = new Set<string>()
    set({
      selectedItems: empty,
      selectedProjects: empty, // Keep in sync
      lastSelectedId: null
    })
  },

  clearProjectSelection: () => {
    get().clearSelection()
    set({
      bulkOperationPreview: null,
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

  // Drag selection state (matches media store)
  dragSelection: {
    isActive: false,
    startPoint: null,
    currentPoint: null,
    selectedDuringDrag: new Set<string>(),
    selectionMode: 'replace',
    originalSelection: null
  },

  // Drag selection methods (copied from media store)
  startDragSelection: (point, mode) => {
    const { selectedProjects } = get()

    // Store original selection for cancellation restore
    const originalSelection = new Set(selectedProjects)

    // For replace mode, clear existing selection immediately when drag starts
    const newSelectedProjects = mode === 'replace' ? new Set<string>() : selectedProjects

    set({
      selectedItems: newSelectedProjects,
      selectedProjects: newSelectedProjects,
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
    const { selectedProjects, dragSelection } = get()
    if (!dragSelection.isActive) return

    let newSelection: Set<string>

    switch (dragSelection.selectionMode) {
      case 'replace':
        // For replace mode, selection was already cleared at start, just set the drag selection
        newSelection = new Set(dragSelection.selectedDuringDrag)
        break
      case 'add':
        // Add drag selection to existing selection
        newSelection = new Set([...selectedProjects, ...dragSelection.selectedDuringDrag])
        break
      case 'range':
        // For range selection, the selectedDuringDrag already contains the range
        newSelection = new Set([...selectedProjects, ...dragSelection.selectedDuringDrag])
        break
      default:
        newSelection = selectedProjects
    }

    set({
      selectedItems: newSelection,
      selectedProjects: newSelection,
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

    // For replace mode, restore the original selection if cancelled
    // For other modes, selection stays as is
    const shouldRestoreSelection = dragSelection.selectionMode === 'replace' && dragSelection.originalSelection

    set({
      selectedItems: shouldRestoreSelection ? dragSelection.originalSelection! : get().selectedProjects,
      selectedProjects: shouldRestoreSelection ? dragSelection.originalSelection! : get().selectedProjects,
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
  },
}))

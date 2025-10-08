import { create } from 'zustand'

/**
 * Configuration for selection store
 */
export interface SelectionStoreConfig {
  dataAttribute?: string // e.g., 'data-selectable', 'data-selectable-project'
  enableAutoScroll?: boolean // Enable auto-scroll during drag (media route needs this)
}

/**
 * Drag selection state
 */
export interface DragSelectionState {
  isActive: boolean
  startPoint: { x: number, y: number } | null
  currentPoint: { x: number, y: number } | null
  selectedDuringDrag: Set<string>
  selectionMode: 'replace' | 'add' | 'range'
  originalSelection: Set<string> | null
}

/**
 * Auto-scroll state (optional, for media route)
 */
export interface AutoScrollState {
  isScrolling: boolean
  direction: 'up' | 'down' | null
  speed: number
}

/**
 * Generic selection store state interface
 * Can be used for any selectable items (media files, projects, etc.)
 */
export interface SelectionStoreState {
  // Selection state
  selectedItems: Set<string>
  lastSelectedId: string | null

  // Drag selection state
  dragSelection: DragSelectionState

  // Auto-scroll state (optional)
  autoScroll?: AutoScrollState

  // Selection actions
  toggleSelection: (itemId: string) => void
  selectRange: (fromId: string, toId: string, allItemIds: string[]) => void
  selectAll: (itemIds: string[]) => void
  clearSelection: () => void

  // Drag selection actions
  startDragSelection: (point: { x: number, y: number }, mode: 'replace' | 'add' | 'range') => void
  updateDragSelection: (point: { x: number, y: number }, intersectingIds: string[]) => void
  finalizeDragSelection: () => void
  cancelDragSelection: () => void

  // Auto-scroll actions (optional)
  startAutoScroll?: (direction: 'up' | 'down', speed: number) => void
  stopAutoScroll?: () => void
}

/**
 * Factory function to create a selection store
 * Reusable for media files, projects, or any other selectable items
 *
 * @example
 * export const useMediaSelectionStore = createSelectionStore({
 *   dataAttribute: 'data-selectable',
 *   enableAutoScroll: true
 * })
 *
 * export const useProjectsSelectionStore = createSelectionStore({
 *   dataAttribute: 'data-selectable-project'
 * })
 */
export function createSelectionStore(config: SelectionStoreConfig = {}) {
  const { enableAutoScroll = false } = config

  return create<SelectionStoreState>((set, get) => ({
    // Initial state
    selectedItems: new Set<string>(),
    lastSelectedId: null,

    // Drag selection state
    dragSelection: {
      isActive: false,
      startPoint: null,
      currentPoint: null,
      selectedDuringDrag: new Set<string>(),
      selectionMode: 'replace',
      originalSelection: null
    },

    // Auto-scroll state (only if enabled)
    ...(enableAutoScroll && {
      autoScroll: {
        isScrolling: false,
        direction: null,
        speed: 0
      }
    }),

    // Toggle single selection (for CMD/Ctrl+Click)
    toggleSelection: (itemId: string) => {
      const { selectedItems } = get()
      const newSelection = new Set(selectedItems)

      if (newSelection.has(itemId)) {
        newSelection.delete(itemId)
      } else {
        newSelection.add(itemId)
      }

      set({ selectedItems: newSelection, lastSelectedId: itemId })
    },

    // Range selection (for Shift+Click)
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

      set({ selectedItems: newSelection, lastSelectedId: toId })
    },

    // Select all items
    selectAll: (itemIds: string[]) => {
      set({
        selectedItems: new Set(itemIds),
        lastSelectedId: itemIds[itemIds.length - 1] || null
      })
    },

    // Clear selection
    clearSelection: () => {
      set({
        selectedItems: new Set<string>(),
        lastSelectedId: null
      })
    },

    // Start drag selection
    startDragSelection: (point, mode) => {
      const { selectedItems } = get()

      // Store original selection for cancellation restore
      const originalSelection = new Set(selectedItems)

      // For replace mode, clear existing selection immediately when drag starts
      const newSelectedItems = mode === 'replace' ? new Set<string>() : selectedItems

      set({
        selectedItems: newSelectedItems,
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

    // Update drag selection as mouse moves
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

    // Finalize drag selection on mouse up
    finalizeDragSelection: () => {
      const { selectedItems, dragSelection } = get()
      if (!dragSelection.isActive) return

      let newSelection: Set<string>

      switch (dragSelection.selectionMode) {
        case 'replace':
          // For replace mode, selection was already cleared at start, just set the drag selection
          newSelection = new Set(dragSelection.selectedDuringDrag)
          break
        case 'add':
          // Add drag selection to existing selection
          newSelection = new Set([...selectedItems, ...dragSelection.selectedDuringDrag])
          break
        case 'range':
          // For range selection, the selectedDuringDrag already contains the range
          newSelection = new Set([...selectedItems, ...dragSelection.selectedDuringDrag])
          break
        default:
          newSelection = selectedItems
      }

      set({
        selectedItems: newSelection,
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

    // Cancel drag selection (restore original if replace mode)
    cancelDragSelection: () => {
      const { dragSelection } = get()

      // For replace mode, restore the original selection if cancelled
      // For other modes, selection stays as is
      const shouldRestoreSelection = dragSelection.selectionMode === 'replace' && dragSelection.originalSelection

      set({
        selectedItems: shouldRestoreSelection ? dragSelection.originalSelection! : get().selectedItems,
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

    // Auto-scroll methods (only if enabled)
    ...(enableAutoScroll && {
      startAutoScroll: (direction: 'up' | 'down', speed: number) => {
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
      }
    })
  }))
}

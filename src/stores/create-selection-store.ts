import { create } from 'zustand'

/**
 * Generic selection store state interface
 * Can be used for any selectable items (media files, projects, etc.)
 */
export interface SelectionStoreState {
  // Selection state
  selectedItems: Set<string>
  lastSelectedId: string | null

  // Selection actions
  toggleSelection: (itemId: string) => void
  selectRange: (fromId: string, toId: string, allItemIds: string[]) => void
  selectAll: (itemIds: string[]) => void
  clearSelection: () => void
}

/**
 * Factory function to create a selection store
 * Reusable for media files, projects, or any other selectable items
 *
 * @example
 * export const useMediaSelectionStore = createSelectionStore()
 * export const useProjectsSelectionStore = createSelectionStore()
 */
export function createSelectionStore() {
  return create<SelectionStoreState>((set, get) => ({
    // Initial state
    selectedItems: new Set<string>(),
    lastSelectedId: null,

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
    }
  }))
}

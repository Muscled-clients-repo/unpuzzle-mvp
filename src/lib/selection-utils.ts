import { SelectionStoreState } from '@/stores/create-selection-store'

interface CreateSelectionHandlerOptions {
  isSelectionMode: boolean
  isDragActive: boolean
  lastSelectedId: string | null
  allItemIds: string[]
  toggleSelection: SelectionStoreState['toggleSelection']
  selectRange: SelectionStoreState['selectRange']
  clearSelection: SelectionStoreState['clearSelection']
}

/**
 * Generic selection handler factory
 * Creates a consistent selection handler for any selectable items
 *
 * @example
 * const handleItemSelection = createSelectionHandler({
 *   isSelectionMode,
 *   isDragActive,
 *   lastSelectedId,
 *   allItemIds: sortedProjects.map(p => p.id),
 *   toggleSelection: toggleProjectSelection,
 *   selectRange,
 *   clearSelection: clearProjectSelection
 * })
 *
 * // Then use in onClick:
 * onClick={(e) => handleItemSelection(project.id, e)}
 */
export function createSelectionHandler({
  isSelectionMode,
  isDragActive,
  lastSelectedId,
  allItemIds,
  toggleSelection,
  selectRange,
  clearSelection
}: CreateSelectionHandlerOptions) {
  return (itemId: string, event?: React.MouseEvent) => {
    // Only handle selection if in selection mode and not currently dragging
    if (!isSelectionMode || isDragActive) return

    if (event) {
      if (event.shiftKey && lastSelectedId && allItemIds.length > 0) {
        // Range selection with Shift+click
        selectRange(lastSelectedId, itemId, allItemIds)
      } else if (event.ctrlKey || event.metaKey) {
        // Add/remove from selection with Ctrl/Cmd+click
        toggleSelection(itemId)
      } else {
        // Normal click - replace selection
        clearSelection()
        toggleSelection(itemId)
      }
    } else {
      // Fallback for direct calls without event
      toggleSelection(itemId)
    }
  }
}

"use client"

import { useCallback, useEffect, useRef, RefObject } from 'react'
import { SelectionStoreState } from '@/stores/create-selection-store'

interface DragRectangle {
  left: number
  top: number
  width: number
  height: number
}

// Helper function to convert screen coordinates to container-relative coordinates
function getContainerRelativeCoords(
  event: MouseEvent,
  container: HTMLElement
): { x: number, y: number } {
  const rect = container.getBoundingClientRect()
  return {
    x: event.clientX - rect.left + container.scrollLeft,
    y: event.clientY - rect.top + container.scrollTop
  }
}

// Helper function to determine selection mode based on modifier keys
function getSelectionMode(event: MouseEvent): 'replace' | 'add' | 'range' {
  if (event.shiftKey) {
    return 'range'
  } else if (event.ctrlKey || event.metaKey) { // Ctrl on Windows/Linux, Cmd on Mac
    return 'add'
  } else {
    return 'replace'
  }
}

// Helper function to calculate drag rectangle from two points (container-relative)
function getDragRectangle(
  startPoint: { x: number, y: number } | null,
  currentPoint: { x: number, y: number } | null
): DragRectangle | null {
  if (!startPoint || !currentPoint) return null

  const left = Math.min(startPoint.x, currentPoint.x)
  const top = Math.min(startPoint.y, currentPoint.y)
  const width = Math.abs(currentPoint.x - startPoint.x)
  const height = Math.abs(currentPoint.y - startPoint.y)

  return { left, top, width, height }
}

// Helper function to find elements intersecting with drag rectangle
function getIntersectingElements(
  startPoint: { x: number, y: number },
  currentPoint: { x: number, y: number },
  container: HTMLElement | null,
  dataAttribute: string
): string[] {
  if (!container) return []

  const dragRect = getDragRectangle(startPoint, currentPoint)
  if (!dragRect) return []

  const selectableElements = container.querySelectorAll(`[${dataAttribute}]`)
  const intersectingIds: string[] = []
  const containerRect = container.getBoundingClientRect()

  const dragLeft = dragRect.left
  const dragTop = dragRect.top
  const dragRight = dragLeft + dragRect.width
  const dragBottom = dragTop + dragRect.height

  selectableElements.forEach(element => {
    const rect = element.getBoundingClientRect()

    // Convert element rectangle to container-relative coordinates
    const elemLeft = rect.left - containerRect.left + container.scrollLeft
    const elemTop = rect.top - containerRect.top + container.scrollTop
    const elemRight = elemLeft + rect.width
    const elemBottom = elemTop + rect.height

    // Check for intersection
    const intersects = !(
      dragRight < elemLeft ||
      dragLeft > elemRight ||
      dragBottom < elemTop ||
      dragTop > elemBottom
    )

    if (intersects) {
      const itemId = element.getAttribute(dataAttribute)
      if (itemId) {
        intersectingIds.push(itemId)
      }
    }
  })

  return intersectingIds
}

interface UseDragSelectionOptions {
  containerRef: RefObject<HTMLElement>
  allItemIds: string[]
  isEnabled?: boolean
  dataAttribute?: string // e.g., 'data-selectable' or 'data-selectable-project'
  selectionStore: {
    selectedItems: Set<string>
    toggleSelection: SelectionStoreState['toggleSelection']
    clearSelection: SelectionStoreState['clearSelection']
  }
}

/**
 * Generic drag selection hook
 * Works with any selectable items (media files, projects, etc.)
 *
 * @example
 * const { isDragActive, dragRectangle } = useDragSelectionGeneric({
 *   containerRef,
 *   allItemIds: sortedProjects.map(p => p.id),
 *   isEnabled: isSelectionMode,
 *   dataAttribute: 'data-selectable-project',
 *   selectionStore: {
 *     selectedItems: selectedProjects,
 *     toggleSelection: toggleProjectSelection,
 *     clearSelection: clearProjectSelection
 *   }
 * })
 */
export function useDragSelectionGeneric({
  containerRef,
  allItemIds,
  isEnabled = true,
  dataAttribute = 'data-selectable',
  selectionStore
}: UseDragSelectionOptions) {
  const { selectedItems, toggleSelection, clearSelection } = selectionStore

  const isDraggingRef = useRef(false)
  const dragStartPoint = useRef<{ x: number, y: number } | null>(null)
  const currentDragPoint = useRef<{ x: number, y: number } | null>(null)
  const selectionModeRef = useRef<'replace' | 'add' | 'range'>('replace')
  const initialSelectionRef = useRef<Set<string>>(new Set())

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!isEnabled || !containerRef.current) return

    // Ignore if clicking on interactive elements
    const target = event.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('[data-no-drag]')
    ) {
      return
    }

    isDraggingRef.current = true
    selectionModeRef.current = getSelectionMode(event)
    initialSelectionRef.current = new Set(selectedItems)

    dragStartPoint.current = getContainerRelativeCoords(event, containerRef.current)
    currentDragPoint.current = dragStartPoint.current

    // Clear selection if in replace mode
    if (selectionModeRef.current === 'replace') {
      clearSelection()
    }
  }, [isEnabled, containerRef, selectedItems, clearSelection])

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current || !dragStartPoint.current) return

    currentDragPoint.current = getContainerRelativeCoords(event, containerRef.current)

    const intersectingIds = getIntersectingElements(
      dragStartPoint.current,
      currentDragPoint.current,
      containerRef.current,
      dataAttribute
    )

    // Apply selection based on mode
    if (selectionModeRef.current === 'replace') {
      clearSelection()
      intersectingIds.forEach(id => {
        if (!selectedItems.has(id)) {
          toggleSelection(id)
        }
      })
    } else if (selectionModeRef.current === 'add') {
      // Add mode: add dragged items to initial selection
      const targetSelection = new Set(initialSelectionRef.current)
      intersectingIds.forEach(id => targetSelection.add(id))

      // Sync with store
      clearSelection()
      Array.from(targetSelection).forEach(id => {
        if (!selectedItems.has(id)) {
          toggleSelection(id)
        }
      })
    }
  }, [containerRef, selectedItems, toggleSelection, clearSelection, dataAttribute])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
    dragStartPoint.current = null
    currentDragPoint.current = null
    initialSelectionRef.current = new Set()
  }, [])

  useEffect(() => {
    if (!isEnabled) return

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isEnabled, handleMouseDown, handleMouseMove, handleMouseUp])

  return {
    isDragActive: isDraggingRef.current,
    dragRectangle: getDragRectangle(dragStartPoint.current, currentDragPoint.current),
    selectedDuringDrag: selectedItems
  }
}

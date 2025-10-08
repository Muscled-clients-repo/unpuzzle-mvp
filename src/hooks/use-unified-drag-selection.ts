"use client"

import { useCallback, useEffect, RefObject } from 'react'
import { SelectionStoreState } from '@/stores/create-selection-store'

interface DragRectangle {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Configuration for unified drag selection hook
 */
interface UseDragSelectionConfig {
  containerRef: RefObject<HTMLElement>
  allItemIds: string[]
  enabled: boolean
  dataAttribute: string // e.g., 'data-selectable' or 'data-selectable-project'
  store: {
    dragSelection: SelectionStoreState['dragSelection']
    startDragSelection: SelectionStoreState['startDragSelection']
    updateDragSelection: SelectionStoreState['updateDragSelection']
    finalizeDragSelection: SelectionStoreState['finalizeDragSelection']
    cancelDragSelection: SelectionStoreState['cancelDragSelection']
    autoScroll?: SelectionStoreState['autoScroll']
    startAutoScroll?: SelectionStoreState['startAutoScroll']
    stopAutoScroll?: SelectionStoreState['stopAutoScroll']
  }
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
  } else if (event.ctrlKey || event.metaKey) {
    return 'add'
  } else {
    return 'replace'
  }
}

// Helper function to calculate drag rectangle
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

// Helper function to check if mouse is near edge for auto-scroll
function getAutoScrollDirection(
  event: MouseEvent,
  container: HTMLElement
): { direction: 'up' | 'down' | null, speed: number } {
  const rect = container.getBoundingClientRect()
  const mouseY = event.clientY - rect.top
  const scrollZone = 100 // pixels from edge to trigger scroll
  const maxSpeed = 20

  if (mouseY < scrollZone) {
    const distance = scrollZone - mouseY
    const speed = Math.min(maxSpeed, (distance / scrollZone) * maxSpeed)
    return { direction: 'up', speed }
  } else if (mouseY > rect.height - scrollZone) {
    const distance = mouseY - (rect.height - scrollZone)
    const speed = Math.min(maxSpeed, (distance / scrollZone) * maxSpeed)
    return { direction: 'down', speed }
  }

  return { direction: null, speed: 0 }
}

/**
 * Unified drag selection hook
 * Works with any route by accepting store methods and configuration
 *
 * @example
 * const { isDragActive, dragRectangle, selectedDuringDrag } = useUnifiedDragSelection({
 *   containerRef,
 *   allItemIds: projectIds,
 *   enabled: isSelectionMode,
 *   dataAttribute: 'data-selectable-project',
 *   store: useProjectsSelectionStore()
 * })
 */
export function useUnifiedDragSelection(config: UseDragSelectionConfig) {
  const {
    containerRef,
    allItemIds,
    enabled,
    dataAttribute,
    store
  } = config

  const {
    dragSelection,
    startDragSelection,
    updateDragSelection,
    finalizeDragSelection,
    cancelDragSelection,
    startAutoScroll,
    stopAutoScroll
  } = store

  // Global mouse event handlers
  const handleGlobalMouseDown = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement
    const container = containerRef.current

    // Only handle events within our container
    if (!container?.contains(target)) return

    // Check if this is a selectable item or empty space
    const isSelectableItem = target.closest(`[${dataAttribute}]`)
    const isInteractiveElement = target.closest('button, input, [role="button"], a')

    // Only start drag selection for selectable items or empty space (not interactive elements)
    if ((isSelectableItem || !isInteractiveElement) && !isInteractiveElement) {
      // Determine selection mode based on modifier keys
      const selectionMode = getSelectionMode(event)

      // Convert to container-relative coordinates immediately
      const containerPoint = getContainerRelativeCoords(event, container)

      startDragSelection(containerPoint, selectionMode)
    }
  }, [startDragSelection, containerRef, dataAttribute])

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!dragSelection.isActive || !containerRef.current) return

    // Prevent text selection during drag
    event.preventDefault()

    // Convert to container-relative coordinates
    const currentPoint = getContainerRelativeCoords(event, containerRef.current)

    // Calculate intersecting elements
    const intersectingIds = getIntersectingElements(
      dragSelection.startPoint!,
      currentPoint,
      containerRef.current,
      dataAttribute
    )

    updateDragSelection(currentPoint, intersectingIds)

    // Handle auto-scroll if enabled
    if (startAutoScroll && stopAutoScroll) {
      const { direction, speed } = getAutoScrollDirection(event, containerRef.current)
      if (direction) {
        startAutoScroll(direction, speed)
      } else {
        stopAutoScroll()
      }
    }
  }, [dragSelection.isActive, dragSelection.startPoint, updateDragSelection, containerRef, dataAttribute, startAutoScroll, stopAutoScroll])

  const handleMouseUp = useCallback(() => {
    if (dragSelection.isActive) {
      finalizeDragSelection()
      if (stopAutoScroll) {
        stopAutoScroll()
      }
    }
  }, [dragSelection.isActive, finalizeDragSelection, stopAutoScroll])

  // Auto-scroll effect (only if auto-scroll is enabled)
  useEffect(() => {
    if (!store.autoScroll?.isScrolling || !containerRef.current) return

    const container = containerRef.current
    const { direction, speed } = store.autoScroll

    const scrollInterval = setInterval(() => {
      if (direction === 'up') {
        container.scrollTop -= speed
      } else if (direction === 'down') {
        container.scrollTop += speed
      }
    }, 16) // ~60fps

    return () => clearInterval(scrollInterval)
  }, [store.autoScroll?.isScrolling, store.autoScroll?.direction, store.autoScroll?.speed, containerRef])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('mousedown', handleGlobalMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousedown', handleGlobalMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [enabled, handleGlobalMouseDown, handleMouseMove, handleMouseUp])

  return {
    isDragActive: dragSelection.isActive,
    dragRectangle: getDragRectangle(dragSelection.startPoint, dragSelection.currentPoint),
    selectedDuringDrag: dragSelection.selectedDuringDrag
  }
}

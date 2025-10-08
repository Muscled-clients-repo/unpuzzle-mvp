"use client"

import { useCallback, useEffect, useRef, RefObject } from 'react'
import { useProjectsSelectionStore } from '@/stores/projects-selection-store'

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
  container: HTMLElement | null
): string[] {
  if (!container) return []

  const dragRect = getDragRectangle(startPoint, currentPoint)
  if (!dragRect) return []

  const selectableElements = container.querySelectorAll('[data-selectable-project]')
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
      const projectId = element.getAttribute('data-selectable-project')
      if (projectId) {
        intersectingIds.push(projectId)
      }
    }
  })

  return intersectingIds
}

/**
 * Project drag selection hook - matches media route pattern
 * Uses store methods for drag selection state management
 */
export function useProjectsDragSelection(
  containerRef: RefObject<HTMLElement>,
  allProjectIds: string[] = [],
  enabled: boolean = true
) {
  const {
    dragSelection,
    selectedProjects,
    lastSelectedId,
    startDragSelection,
    updateDragSelection,
    finalizeDragSelection,
    cancelDragSelection
  } = useProjectsSelectionStore()

  // Global mouse event handlers
  const handleGlobalMouseDown = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement
    const container = containerRef.current

    // Only handle events within our container
    if (!container?.contains(target)) return

    // Check if this is a selectable item or empty space
    const isSelectableItem = target.closest('[data-selectable-project]')
    const isInteractiveElement = target.closest('button, input, [role="button"], a')

    // Only start drag selection for selectable items or empty space (not interactive elements)
    if ((isSelectableItem || !isInteractiveElement) && !isInteractiveElement) {
      // Determine selection mode based on modifier keys
      const selectionMode = getSelectionMode(event)

      // Convert to container-relative coordinates immediately
      const containerPoint = getContainerRelativeCoords(event, container)

      startDragSelection(containerPoint, selectionMode)
    }
  }, [startDragSelection, containerRef])

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
      containerRef.current
    )

    updateDragSelection(currentPoint, intersectingIds)
  }, [dragSelection.isActive, dragSelection.startPoint, updateDragSelection, containerRef])

  const handleMouseUp = useCallback(() => {
    if (dragSelection.isActive) {
      finalizeDragSelection()
    }
  }, [dragSelection.isActive, finalizeDragSelection])

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

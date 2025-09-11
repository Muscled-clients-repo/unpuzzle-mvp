"use client"

import { useCallback, useEffect, useRef, RefObject } from 'react'
import { useMediaStore } from '@/stores/media-store'

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

// Helper function to find elements intersecting with drag rectangle (optimized)
function getIntersectingElements(
  startPoint: { x: number, y: number },
  currentPoint: { x: number, y: number },
  container: HTMLElement | null,
  selectionMode: 'replace' | 'add' | 'range' = 'replace',
  lastSelectedId: string | null = null,
  allFileIds: string[] = []
): string[] {
  if (!container) return []
  
  const dragRect = getDragRectangle(startPoint, currentPoint)
  if (!dragRect) return []
  
  const selectableElements = container.querySelectorAll('[data-selectable]')
  const intersectingIds: string[] = []
  const containerRect = container.getBoundingClientRect()
  
  // Use container-relative coordinates throughout
  const dragLeft = dragRect.left
  const dragTop = dragRect.top
  const dragRight = dragLeft + dragRect.width
  const dragBottom = dragTop + dragRect.height
  
  // For range selection, we need to determine which items are in the drag area
  // and then select the range from lastSelectedId to those items
  if (selectionMode === 'range' && lastSelectedId && allFileIds.length > 0) {
    // Find items that intersect with drag rectangle
    const dragIntersectedIds: string[] = []
    
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
        const fileId = element.getAttribute('data-selectable')
        if (fileId) {
          dragIntersectedIds.push(fileId)
        }
      }
    })
    
    // For each intersected item, create range selection from lastSelectedId
    const rangeIds = new Set<string>()
    dragIntersectedIds.forEach(targetId => {
      const fromIndex = allFileIds.indexOf(lastSelectedId)
      const toIndex = allFileIds.indexOf(targetId)
      
      if (fromIndex !== -1 && toIndex !== -1) {
        const start = Math.min(fromIndex, toIndex)
        const end = Math.max(fromIndex, toIndex)
        for (let i = start; i <= end; i++) {
          rangeIds.add(allFileIds[i])
        }
      }
    })
    
    return Array.from(rangeIds)
  } else {
    // Normal drag intersection detection
    selectableElements.forEach(element => {
      const rect = element.getBoundingClientRect()
      
      // Convert element rectangle to container-relative coordinates
      const elemLeft = rect.left - containerRect.left + container.scrollLeft
      const elemTop = rect.top - containerRect.top + container.scrollTop
      const elemRight = elemLeft + rect.width
      const elemBottom = elemTop + rect.height
      
      // Check for intersection using standard algorithm
      const intersects = !(
        dragRight < elemLeft ||
        dragLeft > elemRight ||
        dragBottom < elemTop ||
        dragTop > elemBottom
      )
      
      if (intersects) {
        const fileId = element.getAttribute('data-selectable')
        if (fileId) {
          intersectingIds.push(fileId)
        }
      }
    })
    
    return intersectingIds
  }
}

// ARCHITECTURE-COMPLIANT: React hook for drag selection behavior
export function useDragSelection(containerRef: RefObject<HTMLElement>, allFileIds: string[] = []) {
  const {
    dragSelection,
    selectedFiles,
    lastSelectedId,
    startDragSelection,
    updateDragSelection,
    finalizeDragSelection,
    cancelDragSelection,
    startAutoScroll,
    stopAutoScroll,
    autoScroll
  } = useMediaStore()
  
  const autoScrollIntervalRef = useRef<NodeJS.Timeout>()
  
  // Auto-scroll implementation
  useEffect(() => {
    if (autoScroll.isScrolling && autoScroll.direction && containerRef.current) {
      const scrollContainer = containerRef.current
      
      autoScrollIntervalRef.current = setInterval(() => {
        const scrollAmount = autoScroll.speed * 10 // pixels per interval
        
        if (autoScroll.direction === 'up') {
          scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - scrollAmount)
        } else if (autoScroll.direction === 'down') {
          scrollContainer.scrollTop = scrollContainer.scrollTop + scrollAmount
        }
      }, 16) // 60fps
      
      return () => {
        if (autoScrollIntervalRef.current) {
          clearInterval(autoScrollIntervalRef.current)
        }
      }
    }
  }, [autoScroll.isScrolling, autoScroll.direction, autoScroll.speed, containerRef])
  
  // Global mouse event handlers using Event Delegation Hierarchy
  const handleGlobalMouseDown = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement
    const container = containerRef.current
    
    // Only handle events within our container
    if (!container?.contains(target)) return
    
    // Check if this is a selectable item or empty space
    const isSelectableItem = target.closest('[data-selectable]')
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
    
    // Now that we're moving, prevent text selection and default behaviors
    event.preventDefault()
    
    // Convert to container-relative coordinates
    const currentPoint = getContainerRelativeCoords(event, containerRef.current)
    
    // Calculate intersecting elements using container-relative coordinates with selection mode
    const intersectingIds = getIntersectingElements(
      dragSelection.startPoint!,
      currentPoint,
      containerRef.current,
      dragSelection.selectionMode,
      lastSelectedId,
      allFileIds
    )
    
    updateDragSelection(currentPoint, intersectingIds)
    
    // Auto-scroll logic
    const containerRect = containerRef.current.getBoundingClientRect()
    const threshold = 50 // pixels from edge
    const maxSpeed = 5 // maximum scroll speed
    
    if (event.clientY < containerRect.top + threshold) {
      // Near top edge - scroll up
      const distance = containerRect.top + threshold - event.clientY
      const speed = Math.min(maxSpeed, Math.max(1, distance / threshold * maxSpeed))
      startAutoScroll('up', speed)
    } else if (event.clientY > containerRect.bottom - threshold) {
      // Near bottom edge - scroll down
      const distance = event.clientY - (containerRect.bottom - threshold)
      const speed = Math.min(maxSpeed, Math.max(1, distance / threshold * maxSpeed))
      startAutoScroll('down', speed)
    } else {
      // Not near edges - stop auto-scroll
      stopAutoScroll()
    }
  }, [dragSelection, updateDragSelection, startAutoScroll, stopAutoScroll, containerRef])
  
  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (dragSelection.isActive) {
      const container = containerRef.current
      if (!container) return
      
      // Check if this was a meaningful drag (moved more than 5 pixels)
      const startPoint = dragSelection.startPoint
      const currentPoint = getContainerRelativeCoords(event, container)
      
      if (startPoint) {
        const distance = Math.sqrt(
          Math.pow(currentPoint.x - startPoint.x, 2) + 
          Math.pow(currentPoint.y - startPoint.y, 2)
        )
        
        if (distance > 5) {
          // Meaningful drag - prevent click events and finalize selection
          event.preventDefault()
          event.stopImmediatePropagation()
          finalizeDragSelection()
        } else {
          // Just a click - cancel drag selection and allow normal click handling
          cancelDragSelection()
        }
      } else {
        cancelDragSelection()
      }
      
      stopAutoScroll()
    }
  }, [dragSelection, finalizeDragSelection, cancelDragSelection, stopAutoScroll, containerRef])
  
  // Handle escape key to cancel drag selection
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && dragSelection.isActive) {
      cancelDragSelection()
      stopAutoScroll()
    }
  }, [dragSelection.isActive, cancelDragSelection, stopAutoScroll])
  
  // Setup global event listeners for Event Delegation Hierarchy
  useEffect(() => {
    // Use capture phase to intercept events before they reach children
    document.addEventListener('mousedown', handleGlobalMouseDown, true)
    
    return () => {
      document.removeEventListener('mousedown', handleGlobalMouseDown, true)
    }
  }, [handleGlobalMouseDown])
  
  useEffect(() => {
    if (dragSelection.isActive) {
      // Add global listeners for mouse move/up when dragging
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('keydown', handleKeyDown)
      
      // Prevent text selection during drag
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'crosshair'
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('keydown', handleKeyDown)
        
        // Restore normal cursor and text selection
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }
    }
  }, [dragSelection.isActive, handleMouseMove, handleMouseUp, handleKeyDown])
  
  // Calculate drag rectangle for rendering
  const dragRectangle = getDragRectangle(dragSelection.startPoint, dragSelection.currentPoint)
  
  return {
    isDragActive: dragSelection.isActive,
    dragRectangle,
    selectedDuringDrag: dragSelection.selectedDuringDrag,
    isAutoScrolling: autoScroll.isScrolling,
    autoScrollDirection: autoScroll.direction
  }
}
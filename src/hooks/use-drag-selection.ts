"use client"

import { useCallback, useEffect, useRef, RefObject } from 'react'
import { useMediaStore } from '@/stores/media-store'

interface DragRectangle {
  left: number
  top: number
  width: number
  height: number
}

// Helper function to calculate drag rectangle from two points
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
  
  const selectableElements = container.querySelectorAll('[data-selectable]')
  const intersectingIds: string[] = []
  
  selectableElements.forEach(element => {
    const rect = element.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    // Convert drag rectangle to container-relative coordinates
    const dragLeft = dragRect.left - containerRect.left + container.scrollLeft
    const dragTop = dragRect.top - containerRect.top + container.scrollTop
    const dragRight = dragLeft + dragRect.width
    const dragBottom = dragTop + dragRect.height
    
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
        intersectingIds.push(fileId)
      }
    }
  })
  
  return intersectingIds
}

// ARCHITECTURE-COMPLIANT: React hook for drag selection behavior
export function useDragSelection(containerRef: RefObject<HTMLElement>) {
  const {
    dragSelection,
    selectedFiles,
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
  
  // Mouse event handlers
  const handleMouseDown = useCallback((event: MouseEvent) => {
    // Only start drag selection if clicking on empty space or selectable items
    const target = event.target as HTMLElement
    const isSelectableItem = target.closest('[data-selectable]')
    const isEmptySpace = !target.closest('button, input, [role="button"]')
    
    console.log('[DRAG] mousedown detected:', { target: target.tagName, isSelectableItem: !!isSelectableItem, isEmptySpace })
    
    if (isEmptySpace || isSelectableItem) {
      // Don't prevent default here - let clicks work normally
      // Only prevent when we're sure it's a drag
      
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!containerRect) return
      
      // Convert to container-relative coordinates
      const point = {
        x: event.clientX,
        y: event.clientY
      }
      
      console.log('[DRAG] Starting drag selection at:', point)
      startDragSelection(point)
    }
  }, [startDragSelection, containerRef])
  
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!dragSelection.isActive || !containerRef.current) return
    
    console.log('[DRAG] Mouse move during drag')
    
    // Now that we're moving, prevent text selection
    event.preventDefault()
    
    // Update drag rectangle
    const currentPoint = { x: event.clientX, y: event.clientY }
    
    // Calculate intersecting elements
    const intersectingIds = getIntersectingElements(
      dragSelection.startPoint!,
      currentPoint,
      containerRef.current
    )
    
    console.log('[DRAG] Intersecting elements:', intersectingIds)
    
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
      // Check if this was a meaningful drag (moved more than 5 pixels)
      const startPoint = dragSelection.startPoint
      const currentPoint = { x: event.clientX, y: event.clientY }
      
      if (startPoint) {
        const distance = Math.sqrt(
          Math.pow(currentPoint.x - startPoint.x, 2) + 
          Math.pow(currentPoint.y - startPoint.y, 2)
        )
        
        if (distance > 5) {
          // Meaningful drag - prevent click events from firing and finalize selection
          event.preventDefault()
          event.stopPropagation()
          finalizeDragSelection()
        } else {
          // Just a click - cancel drag selection and let click events fire normally
          cancelDragSelection()
        }
      } else {
        cancelDragSelection()
      }
      
      stopAutoScroll()
    }
  }, [dragSelection, finalizeDragSelection, cancelDragSelection, stopAutoScroll])
  
  // Handle escape key to cancel drag selection
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && dragSelection.isActive) {
      cancelDragSelection()
      stopAutoScroll()
    }
  }, [dragSelection.isActive, cancelDragSelection, stopAutoScroll])
  
  // Setup event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      console.log('[DRAG] No container ref available')
      return
    }
    
    console.log('[DRAG] Setting up event listeners on container:', container)
    
    // Add mouse down listener to container
    container.addEventListener('mousedown', handleMouseDown)
    
    return () => {
      console.log('[DRAG] Cleaning up event listeners')
      container.removeEventListener('mousedown', handleMouseDown)
    }
  }, [handleMouseDown, containerRef])
  
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
"use client"

import React from 'react'
import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DragDropEnhancerProps {
  children: React.ReactNode
  item: {
    id: string
    type: 'video' | 'chapter'
    sourceChapterId?: string
    originalIndex: number
  }
  onDrop?: (draggedItem: any, targetItem: any) => void
  className?: string
}

/**
 * Simple drag & drop enhancer that works with our UI store
 * Wraps existing components with drag & drop functionality
 */
export function DragDropEnhancer({ 
  children, 
  item, 
  onDrop, 
  className 
}: DragDropEnhancerProps) {
  const ui = useCourseCreationUI()
  
  const handleDragStart = (e: React.DragEvent) => {
    ui.startDrag(item)
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item.id)
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }
  
  const handleDragEnd = (e: React.DragEvent) => {
    ui.endDrag()
    
    // Remove visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    // Update drop target in UI store
    ui.updateDragTarget({
      id: item.id,
      type: item.type === 'chapter' ? 'chapter' : 'chapter-content',
      chapterId: item.sourceChapterId
    })
  }
  
  const handleDragLeave = () => {
    ui.updateDragTarget(null)
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    
    const draggedItemId = e.dataTransfer.getData('text/plain')
    const draggedItem = ui.dragState.dragItem
    
    if (draggedItem && draggedItemId !== item.id && onDrop) {
      onDrop(draggedItem, item)
    }
    
    ui.endDrag()
  }
  
  const isDragging = ui.dragState.isDragging && ui.dragState.dragItem?.id === item.id
  const isDropTarget = ui.dragState.dropTarget?.id === item.id
  
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'group transition-all duration-200',
        isDragging && 'opacity-50 scale-95',
        isDropTarget && 'ring-2 ring-blue-500 bg-blue-50',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Drag handle component that can be used independently
 */
export function DragHandle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        'cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity',
        'flex items-center justify-center',
        className
      )}
      title="Drag to reorder"
      {...props}
    >
      <GripVertical className="h-4 w-4" />
    </div>
  )
}
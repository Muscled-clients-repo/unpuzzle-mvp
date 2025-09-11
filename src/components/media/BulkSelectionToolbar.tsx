"use client"

import { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useMediaStore } from "@/stores/media-store"
import { useBulkDeletePreview } from '@/hooks/use-media-queries'
import { BulkDeleteConfirmationModal } from './BulkDeleteConfirmationModal'
import { BulkTagModal } from './BulkTagModal'
import { Trash2, X, CheckSquare, Loader2, Tag } from "lucide-react"

interface BulkSelectionToolbarProps {
  onBulkDelete?: (operationId: string) => void
  allFileIds?: string[]
}

// ARCHITECTURE-COMPLIANT: Enhanced selection toolbar with preview integration
export function BulkSelectionToolbar({ onBulkDelete, allFileIds = [] }: BulkSelectionToolbarProps) {
  const { 
    selectedFiles, 
    clearSelection, 
    selectAll, 
    isPreviewLoading,
    setPreviewLoading,
    setBulkOperationPreview 
  } = useMediaStore()
  
  const selectedCount = selectedFiles.size
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  
  // TanStack mutation for preview generation
  const { mutate: generatePreview, isPending: isGeneratingPreview } = useBulkDeletePreview()
  
  const handleSelectAll = useCallback(() => {
    if (allFileIds.length > 0) {
      selectAll(allFileIds)
    }
  }, [allFileIds, selectAll])
  
  // Sub-100ms visual feedback for delete button
  const handleDeleteClick = useCallback(() => {
    if (!onBulkDelete) return
    
    // Immediate visual feedback
    setPreviewLoading(true)
    
    // Generate preview via TanStack mutation
    generatePreview(Array.from(selectedFiles), {
      onSuccess: (result) => {
        setPreviewLoading(false)
        
        if (result.success && result.preview) {
          // Update Zustand preview state
          setBulkOperationPreview({
            selectedItems: new Set(selectedFiles),
            operationType: 'delete' as const,
            previewData: {
              totalSize: result.preview.totalSize,
              totalSizeFormatted: result.preview.totalSizeFormatted,
              affectedCourses: result.preview.affectedCourses,
              warnings: result.preview.warnings,
              estimatedTime: result.preview.estimatedTime,
              operationId: result.preview.operationId
            }
          })
          
          // Show confirmation modal
          setShowConfirmModal(true)
        }
      },
      onError: () => {
        setPreviewLoading(false)
      }
    })
  }, [selectedFiles, onBulkDelete, generatePreview, setPreviewLoading, setBulkOperationPreview])
  
  const handleConfirmDelete = useCallback((operationId: string) => {
    if (onBulkDelete) {
      onBulkDelete(operationId)
    }
    setShowConfirmModal(false)
  }, [onBulkDelete])
  
  const handleCloseModal = useCallback(() => {
    setShowConfirmModal(false)
    // Clear preview state when modal closes
    setBulkOperationPreview(null)
  }, [setBulkOperationPreview])
  
  // Don't render if no files selected
  if (selectedCount === 0) return null
  
  const isAllSelected = allFileIds.length > 0 && selectedCount === allFileIds.length
  const isDeleteLoading = isPreviewLoading || isGeneratingPreview
  
  return (
    <>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="px-4 py-3 bg-white dark:bg-gray-800 shadow-lg border rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-4">
            {/* Selection count */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm font-medium">
                {selectedCount} file{selectedCount !== 1 ? 's' : ''} selected
              </Badge>
              
              {/* Select all button (if not all selected) */}
              {!isAllSelected && allFileIds.length > selectedCount && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleSelectAll}
                  className="h-6 px-2 text-xs"
                  disabled={isDeleteLoading}
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  All ({allFileIds.length})
                </Button>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              {/* Edit Tags button */}
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={() => setShowTagModal(true)}
                className="h-8"
                disabled={isDeleteLoading}
              >
                <Tag className="w-4 h-4 mr-2" />
                Edit Tags
              </Button>
              
              {/* Enhanced delete button with preview */}
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={handleDeleteClick}
                disabled={!onBulkDelete || isDeleteLoading}
                className="h-8"
              >
                {isDeleteLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {isDeleteLoading ? 'Analyzing...' : 'Delete'}
              </Button>
              
              {/* Cancel button */}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={clearSelection}
                className="h-8"
                disabled={isDeleteLoading}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <BulkDeleteConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
      />

      {/* Bulk Tag Modal */}
      <BulkTagModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        selectedFileIds={Array.from(selectedFiles)}
        selectedFileCount={selectedCount}
      />
    </>
  )
}
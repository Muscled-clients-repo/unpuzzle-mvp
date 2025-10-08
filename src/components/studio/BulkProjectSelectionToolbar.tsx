"use client"

import { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useProjectsSelectionStore } from "@/stores/projects-selection-store"
import { BulkProjectTagModal } from './BulkProjectTagModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2, X, CheckSquare, Tag } from "lucide-react"

interface BulkProjectSelectionToolbarProps {
  onBulkDelete?: (projectIds: string[]) => void
  allProjectIds?: string[]
}

export function BulkProjectSelectionToolbar({
  onBulkDelete,
  allProjectIds = []
}: BulkProjectSelectionToolbarProps) {
  const {
    selectedProjects,
    clearProjectSelection,
    selectAllProjects,
  } = useProjectsSelectionStore()

  const selectedCount = selectedProjects.size
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)

  const handleSelectAll = useCallback(() => {
    if (allProjectIds.length > 0) {
      selectAllProjects(allProjectIds)
    }
  }, [allProjectIds, selectAllProjects])

  const handleDeleteClick = useCallback(() => {
    setShowConfirmModal(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (onBulkDelete) {
      onBulkDelete(Array.from(selectedProjects))
    }
    setShowConfirmModal(false)
    clearProjectSelection()
  }, [onBulkDelete, selectedProjects, clearProjectSelection])

  // Don't render if no projects selected
  if (selectedCount === 0) return null

  const isAllSelected = allProjectIds.length > 0 && selectedCount === allProjectIds.length

  return (
    <>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="px-4 py-3 bg-white dark:bg-gray-800 shadow-lg border rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-4">
            {/* Selection count */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm font-medium">
                {selectedCount} project{selectedCount !== 1 ? 's' : ''} selected
              </Badge>

              {/* Select all button (if not all selected) */}
              {!isAllSelected && allProjectIds.length > selectedCount && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSelectAll}
                  className="h-6 px-2 text-xs"
                >
                  <CheckSquare className="w-3 h-3 mr-1" />
                  All ({allProjectIds.length})
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
              >
                <Tag className="w-4 h-4 mr-2" />
                Edit Tags
              </Button>

              {/* Delete button */}
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={!onBulkDelete}
                className="h-8"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>

              {/* Cancel button */}
              <Button
                size="sm"
                variant="outline"
                onClick={clearProjectSelection}
                className="h-8"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} Project{selectedCount !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} project{selectedCount !== 1 ? 's' : ''}.
              Exported videos in your media library will not be affected.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete {selectedCount} Project{selectedCount !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Tag Modal */}
      <BulkProjectTagModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        selectedProjectIds={Array.from(selectedProjects)}
        selectedProjectCount={selectedCount}
      />
    </>
  )
}

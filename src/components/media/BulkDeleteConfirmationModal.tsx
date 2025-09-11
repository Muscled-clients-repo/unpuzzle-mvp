"use client"

import { useCallback } from 'react'
import { useMediaStore } from '@/stores/media-store'
import { Button } from '@/components/ui/button'
import { FileX } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BulkDeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (operationId: string) => void
}

export function BulkDeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm 
}: BulkDeleteConfirmationModalProps) {
  const { selectedFiles, bulkOperationPreview, isPreviewLoading } = useMediaStore()
  const selectedCount = selectedFiles.size

  const handleConfirm = useCallback(() => {
    if (bulkOperationPreview) {
      onConfirm(bulkOperationPreview.previewData.operationId)
      onClose()
    }
  }, [bulkOperationPreview, onConfirm, onClose])

  // Don't render if no selection
  if (selectedCount === 0) {
    return null
  }

  const affectedCoursesCount = bulkOperationPreview?.previewData.affectedCourses.length || 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileX className="w-5 h-5 text-destructive" />
            Confirm Bulk Deletion
          </DialogTitle>
          <DialogDescription>
            You are about to permanently delete {selectedCount} file{selectedCount !== 1 ? 's' : ''}. 
            This action cannot be undone.
            {affectedCoursesCount > 0 && (
              <div className="mt-2 text-sm">
                Files are used in {affectedCoursesCount} course{affectedCoursesCount !== 1 ? 's' : ''}.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!bulkOperationPreview || isPreviewLoading}
          >
            {isPreviewLoading ? 'Analyzing...' : `Delete ${selectedCount} File${selectedCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
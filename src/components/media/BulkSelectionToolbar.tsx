"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useMediaStore } from "@/stores/media-store"
import { Trash2, X, CheckSquare } from "lucide-react"

interface BulkSelectionToolbarProps {
  onBulkDelete?: () => void
  allFileIds?: string[]
}

// ARCHITECTURE-COMPLIANT: Selection toolbar component
export function BulkSelectionToolbar({ onBulkDelete, allFileIds = [] }: BulkSelectionToolbarProps) {
  const { selectedFiles, clearSelection, selectAll } = useMediaStore()
  const selectedCount = selectedFiles.size
  
  // Don't render if no files selected
  if (selectedCount === 0) return null
  
  const handleSelectAll = () => {
    if (allFileIds.length > 0) {
      selectAll(allFileIds)
    }
  }
  
  const isAllSelected = allFileIds.length > 0 && selectedCount === allFileIds.length
  
  return (
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
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                All ({allFileIds.length})
              </Button>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            {/* Delete button - disabled for now until Phase 2 */}
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={onBulkDelete}
              disabled={!onBulkDelete} // Will be enabled in Phase 2
              className="h-8"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            
            {/* Cancel button */}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={clearSelection}
              className="h-8"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
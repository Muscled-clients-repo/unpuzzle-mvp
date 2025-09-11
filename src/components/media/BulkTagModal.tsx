"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Plus, X, Tag } from "lucide-react"
import { useBulkAddTags, useExistingTags } from "@/hooks/use-media-queries"

interface BulkTagModalProps {
  isOpen: boolean
  onClose: () => void
  selectedFileIds: string[]
  selectedFileCount: number
}

export function BulkTagModal({ isOpen, onClose, selectedFileIds, selectedFileCount }: BulkTagModalProps) {
  const [newTagInput, setNewTagInput] = useState("")
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([])
  
  // TanStack Query hooks
  const { data: existingTags = [] } = useExistingTags()
  const bulkAddMutation = useBulkAddTags()

  const handleAddNewTag = (tagText: string) => {
    const trimmedTag = tagText.trim()
    if (!trimmedTag || tagsToAdd.includes(trimmedTag)) return

    setTagsToAdd([...tagsToAdd, trimmedTag])
    setNewTagInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddNewTag(newTagInput)
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTagsToAdd(tagsToAdd.filter(tag => tag !== tagToRemove))
  }

  const handleExecute = async () => {
    if (tagsToAdd.length === 0) return

    try {
      await bulkAddMutation.mutateAsync({ fileIds: selectedFileIds, tagsToAdd })
      setTagsToAdd([])
      setNewTagInput("")
      onClose()
    } catch (error) {
      // Error handled by mutation hooks
      console.error("Bulk tag operation failed:", error)
    }
  }

  const isLoading = bulkAddMutation.isPending

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Add Tags
          </DialogTitle>
          <DialogDescription>
            Add tags to {selectedFileCount} selected file{selectedFileCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tag input */}
          <div className="flex gap-2">
            <Input
              placeholder="Type tag name and press Enter..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              autoFocus
            />
            <Button 
              onClick={() => handleAddNewTag(newTagInput)}
              disabled={!newTagInput.trim()}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Tags to add */}
          {tagsToAdd.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Tags to add:</div>
              <div className="flex flex-wrap gap-2">
                {tagsToAdd.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Existing tags suggestions */}
          {existingTags.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Existing tags (click to add):</div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {existingTags
                  .filter(tag => !tagsToAdd.includes(tag))
                  .map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleAddNewTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleExecute} 
            disabled={tagsToAdd.length === 0 || isLoading}
            className="min-w-32"
          >
            {isLoading ? "Adding..." : `Add ${tagsToAdd.length} tag${tagsToAdd.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
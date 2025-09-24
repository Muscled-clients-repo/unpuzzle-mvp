'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDraftMutations } from '@/hooks/use-draft-websocket'
import { Bug, Lightbulb, Trash2 } from 'lucide-react'

interface DraftListModalProps {
  isOpen: boolean
  onClose: () => void
  drafts: any[]
  type: 'bug_report' | 'feature_request'
  onSelectDraft: (draft: any) => void
}

export function DraftListModal({ isOpen, onClose, drafts, type, onSelectDraft }: DraftListModalProps) {
  const { deleteDraft } = useDraftMutations()

  const handleSelectDraft = (draft: any) => {
    onSelectDraft(draft)
    onClose()
  }

  const handleDeleteDraft = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation()
    deleteDraft(draftId)
  }

  const Icon = type === 'bug_report' ? Bug : Lightbulb
  const iconColor = type === 'bug_report' ? 'text-red-600' : 'text-green-600'
  const title = type === 'bug_report' ? 'Bug Report Drafts' : 'Feature Request Drafts'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${iconColor}`} />
            {title} ({drafts.length})
          </DialogTitle>
          <DialogDescription>
            Select a draft to continue working on, or delete drafts you no longer need.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[50vh] space-y-2 p-1">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className={`p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors ${
                type === 'bug_report' ? 'border-red-200' : 'border-green-200'
              }`}
              onClick={() => handleSelectDraft(draft)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">
                      {draft.title || 'Untitled Draft'}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {new Date(draft.updated_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  {draft.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {draft.description}
                    </p>
                  )}
                  {type === 'bug_report' && draft.metadata?.whereHappened && (
                    <p className="text-xs text-muted-foreground mt-1">
                      📍 {draft.metadata.whereHappened}
                    </p>
                  )}
                  {type === 'feature_request' && draft.metadata?.loomLink && (
                    <p className="text-xs text-blue-600 mt-1">
                      🎥 Loom video attached
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  onClick={(e) => handleDeleteDraft(e, draft.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onClose}
            className={type === 'bug_report' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
          >
            Start New {type === 'bug_report' ? 'Bug Report' : 'Feature Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
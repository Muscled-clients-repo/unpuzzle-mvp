"use client"

import { SimpleModal } from "../media/SimpleModal"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2 } from "lucide-react"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  isLoading?: boolean
}

export function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  isLoading = false
}: ConfirmDialogProps) {
  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
    >
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          {destructive && (
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={() => onConfirm()}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </SimpleModal>
  )
}
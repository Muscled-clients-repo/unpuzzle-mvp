"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  ChevronUp,
  ChevronDown,
  X,
  Upload,
  Check,
  AlertCircle,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadItem {
  id: string
  name: string
  uploadProgress?: number
  uploadTimeRemaining?: number | null
  status?: 'uploading' | 'processing' | 'ready' | 'error'
  size?: string
}

interface FloatingUploadPanelProps {
  items: UploadItem[]
  position?: 'top' | 'bottom-right' | 'bottom-center'
  className?: string
}

/**
 * Google Drive-style floating upload progress panel
 * Shows in a fixed position with minimize/maximize functionality
 */
export function FloatingUploadPanel({ 
  items, 
  position = 'bottom-right',
  className 
}: FloatingUploadPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  // Filter for active uploads (uploading, processing, or recently completed)
  const activeUploads = items.filter(item => 
    item.status === 'uploading' || 
    item.status === 'processing' || 
    (item.status === 'ready' && typeof item.uploadProgress === 'number')
  )

  // Don't render if no active uploads or dismissed
  if (activeUploads.length === 0 || isDismissed) {
    return null
  }

  // Calculate overall progress
  const totalProgress = activeUploads.reduce((acc, item) => acc + (item.uploadProgress || 0), 0)
  const averageProgress = totalProgress / activeUploads.length

  const formatTimeRemaining = (seconds: number | null | undefined): string => {
    if (!seconds || seconds <= 0) return ''
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      case 'ready':
        return <Check className="h-3 w-3 text-green-500" />
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      default:
        return <Upload className="h-3 w-3" />
    }
  }

  const positionClasses = {
    'top': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  }

  return (
    <div className={cn(
      "fixed z-50 bg-background border rounded-lg shadow-lg",
      "w-80 max-w-[90vw] transition-all duration-200",
      positionClasses[position],
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {activeUploads.length} upload{activeUploads.length !== 1 ? 's' : ''}
          </span>
          <Badge variant="secondary" className="text-xs">
            {Math.round(averageProgress)}%
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0 hover:bg-background/80"
          >
            {isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>


      {/* File List */}
      {!isMinimized && (
        <div className="max-h-60 overflow-y-auto">
          {activeUploads.map((item) => (
            <div key={item.id} className="p-3 border-b last:border-b-0 hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(item.status || 'uploading')}
                <span className="text-xs font-medium truncate flex-1">
                  {item.name}
                </span>
                {item.size && (
                  <span className="text-xs text-muted-foreground">
                    {item.size}
                  </span>
                )}
              </div>
              
              {typeof item.uploadProgress === 'number' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{Math.round(item.uploadProgress)}%</span>
                    {item.uploadTimeRemaining && (
                      <span>{formatTimeRemaining(item.uploadTimeRemaining)}</span>
                    )}
                  </div>
                  <Progress value={item.uploadProgress} className="h-1.5" />
                </div>
              )}

              {/* Status messages */}
              {item.status === 'processing' && (
                <p className="text-xs text-blue-600 mt-1">Processing...</p>
              )}
              {item.status === 'ready' && (
                <p className="text-xs text-green-600 mt-1">Upload complete</p>
              )}
              {item.status === 'error' && (
                <p className="text-xs text-red-600 mt-1">Upload failed</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Minimized State - Just show file count */}
      {isMinimized && (
        <div className="p-2 text-xs text-muted-foreground text-center">
          {activeUploads.length} file{activeUploads.length !== 1 ? 's' : ''} uploading
        </div>
      )}
    </div>
  )
}
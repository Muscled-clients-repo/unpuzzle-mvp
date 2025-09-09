import { Progress } from "@/components/ui/progress"

interface UploadItem {
  uploadProgress?: number
  uploadTimeRemaining?: number | null
  status?: string
}

interface UploadProgressProps {
  item: UploadItem
  className?: string
}

/**
 * Shared upload progress component for both Video and Media uploads
 * Shows progress bar with percentage and time remaining
 */
export function UploadProgress({ item, className }: UploadProgressProps) {
  // Show progress bar if uploading OR if recently completed (has progress data)
  if (typeof item.uploadProgress !== 'number' || (item.status !== 'uploading' && item.status !== 'ready')) {
    return null
  }

  const formatTimeRemaining = (seconds: number | null | undefined): string => {
    if (!seconds || seconds <= 0) return ''
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`
  }

  return (
    <div className={`mt-2 space-y-1 ${className || ''}`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{Math.round(item.uploadProgress)}%</span>
        <span>{formatTimeRemaining(item.uploadTimeRemaining)}</span>
      </div>
      <Progress 
        value={item.uploadProgress} 
        className="h-2" 
      />
    </div>
  )
}
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Loader2, Download, AlertCircle, CheckCircle2 } from 'lucide-react'

interface ExportProgress {
  phase: 'loading' | 'downloading' | 'processing' | 'encoding' | 'complete' | 'error'
  progress: number
  message: string
  currentClip?: number
  totalClips?: number
}

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (settings: ExportSettings) => void
  isExporting: boolean
  progress: ExportProgress | null
  projectTitle: string
  totalDurationSeconds?: number // Total duration of all clips
  clipCount?: number // Number of clips to export
}

export interface ExportSettings {
  title: string
  description: string
  resolution: '1920x1080' | '1280x720' | '854x480'
  fps: 30 | 60
  quality: 'high' | 'medium' | 'low'
}

const qualityPresets = {
  high: { bitrate: '10M', preset: 'slow' as const },
  medium: { bitrate: '5M', preset: 'medium' as const },
  low: { bitrate: '2M', preset: 'fast' as const },
}

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  isExporting,
  progress,
  projectTitle,
  totalDurationSeconds = 0,
  clipCount = 0
}: ExportDialogProps) {
  const [title, setTitle] = useState(projectTitle || 'Exported Video')
  const [description, setDescription] = useState('')
  const [resolution, setResolution] = useState<'1920x1080' | '1280x720' | '854x480'>('1920x1080')
  const [fps, setFps] = useState<30 | 60>(30)
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium')

  const handleExport = () => {
    onExport({
      title,
      description,
      resolution,
      fps,
      quality
    })
  }

  const getPhaseColor = () => {
    if (!progress) return 'bg-blue-500'
    switch (progress.phase) {
      case 'complete': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-blue-500'
    }
  }

  const getPhaseIcon = () => {
    if (!progress) return null
    switch (progress.phase) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
    }
  }

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Timeline</DialogTitle>
          <DialogDescription>
            Export {clipCount} clip{clipCount !== 1 ? 's' : ''} ({formatDuration(totalDurationSeconds)} total)
            {clipCount > 0 && <span className="block text-xs text-muted-foreground mt-1">
              Note: Only clips are exported. Empty timeline areas are skipped.
            </span>}
          </DialogDescription>
        </DialogHeader>

        {!isExporting ? (
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="export-title">Video Title</Label>
              <Input
                id="export-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter video title"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="export-description">Description (optional)</Label>
              <Textarea
                id="export-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this video"
                rows={3}
              />
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <Label htmlFor="export-resolution">Resolution</Label>
              <Select
                value={resolution}
                onValueChange={(value) => setResolution(value as any)}
              >
                <SelectTrigger id="export-resolution">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
                  <SelectItem value="1280x720">1280x720 (HD)</SelectItem>
                  <SelectItem value="854x480">854x480 (SD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* FPS */}
            <div className="space-y-2">
              <Label htmlFor="export-fps">Frame Rate</Label>
              <Select
                value={fps.toString()}
                onValueChange={(value) => setFps(parseInt(value) as any)}
              >
                <SelectTrigger id="export-fps">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 FPS</SelectItem>
                  <SelectItem value="60">60 FPS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quality */}
            <div className="space-y-2">
              <Label htmlFor="export-quality">Quality</Label>
              <Select
                value={quality}
                onValueChange={(value) => setQuality(value as any)}
              >
                <SelectTrigger id="export-quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High (10 Mbps, slower)</SelectItem>
                  <SelectItem value="medium">Medium (5 Mbps, balanced)</SelectItem>
                  <SelectItem value="low">Low (2 Mbps, faster)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={!title.trim()}
              >
                <Download className="mr-2 h-4 w-4" />
                Start Export
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-6">
            {/* Progress Header */}
            <div className="flex items-center gap-3">
              {getPhaseIcon()}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {progress?.message || 'Processing...'}
                </p>
                {progress?.currentClip && progress?.totalClips && (
                  <p className="text-xs text-muted-foreground">
                    Clip {progress.currentClip} of {progress.totalClips}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <Progress
              value={progress?.progress || 0}
              className={getPhaseColor()}
            />

            {/* Progress Percentage */}
            <p className="text-center text-sm text-muted-foreground">
              {progress?.progress || 0}%
            </p>

            {/* Phase-specific messages */}
            {progress?.phase === 'loading' && (
              <p className="text-xs text-muted-foreground text-center">
                Loading FFmpeg library (25MB)...
              </p>
            )}
            {progress?.phase === 'downloading' && (
              <p className="text-xs text-muted-foreground text-center">
                Downloading clips from CDN...
              </p>
            )}
            {progress?.phase === 'processing' && (
              <p className="text-xs text-muted-foreground text-center">
                Trimming and preparing clips...
              </p>
            )}
            {progress?.phase === 'encoding' && (
              <p className="text-xs text-muted-foreground text-center">
                Merging and encoding final video...
              </p>
            )}
            {progress?.phase === 'complete' && (
              <div className="text-center space-y-2">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Export completed successfully!
                </p>
                <p className="text-xs text-muted-foreground">
                  Video saved to media library
                </p>
              </div>
            )}
            {progress?.phase === 'error' && (
              <div className="text-center space-y-2">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Export failed
                </p>
                <p className="text-xs text-muted-foreground">
                  {progress.message}
                </p>
              </div>
            )}

            {/* Close Button (only show when complete or error) */}
            {(progress?.phase === 'complete' || progress?.phase === 'error') && (
              <div className="flex justify-end pt-4">
                <Button onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

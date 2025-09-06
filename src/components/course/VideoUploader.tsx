"use client"

import { useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface VideoUploadItem {
  id: string
  name: string
  progress: number
  status: 'uploading' | 'complete' | 'error'
}

interface VideoUploaderProps {
  onFilesSelected: (files: FileList) => void
  uploadQueue?: VideoUploadItem[]
  className?: string
  compact?: boolean // For edit mode - smaller upload area
}

export function VideoUploader({ 
  onFilesSelected, 
  uploadQueue = [], 
  className,
  compact = false 
}: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      onFilesSelected(files)
    }
  }, [onFilesSelected])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFilesSelected(files)
      // Reset input to allow selecting the same file again
      e.target.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  if (compact) {
    // Compact mode for edit page - just a button
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
          id="video-upload-compact"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className={className}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Videos
        </Button>
      </>
    )
  }

  // Full upload area for course creation
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Upload Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              "hover:border-primary hover:bg-accent/50",
              "cursor-pointer"
            )}
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">
              Drag & drop video files here
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
              id="video-upload-full"
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              Select Files
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
"use client"

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X } from 'lucide-react'
import { useUploadMediaFile } from '@/hooks/use-media-queries'

interface SimpleUploadProps {
  onClose: () => void
}

export function SimpleUpload({ onClose }: SimpleUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadMediaFile()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        uploadMutation.mutate(file)
      })
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        uploadMutation.mutate(file)
      })
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-4 border-b bg-muted/50 flex items-center justify-between">
        <h3 className="font-semibold">Upload Media Files</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div 
        className="p-8 border-2 border-dashed border-muted-foreground/25 m-4 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center text-center cursor-pointer">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {uploadMutation.isPending ? 'Uploading...' : 'Drop files here'}
          </h3>
          <p className="text-muted-foreground mb-4">
            Or click to browse your computer
          </p>
          <Button disabled={uploadMutation.isPending}>
            <Upload className="h-4 w-4 mr-2" />
            {uploadMutation.isPending ? 'Uploading...' : 'Select Files'}
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,image/*,audio/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  )
}
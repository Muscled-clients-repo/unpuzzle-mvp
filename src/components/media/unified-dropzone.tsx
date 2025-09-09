"use client"

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UnifiedDropzoneProps {
  onFilesSelected: (files: File[]) => void
  onClose?: () => void
  acceptedFileTypes?: string[]
  maxFileSize?: number
  maxFiles?: number
  isUploading?: boolean
  className?: string
  showHeader?: boolean
  headerTitle?: string
}

export function UnifiedDropzone({
  onFilesSelected,
  onClose,
  acceptedFileTypes = ['video/*', 'image/*', 'audio/*'],
  maxFileSize = 1024 * 1024 * 1024, // 1GB
  maxFiles = 20,
  isUploading = false,
  className,
  showHeader = true,
  headerTitle = "Upload Media Files"
}: UnifiedDropzoneProps) {
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFilesSelected(acceptedFiles)
    }
  }, [onFilesSelected])

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections
  } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {} as Record<string, string[]>),
    maxSize: maxFileSize,
    maxFiles,
    disabled: isUploading
  })

  const hasErrors = fileRejections.length > 0
  
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {showHeader && (
        <div className="p-4 border-b bg-muted/50 flex items-center justify-between">
          <h3 className="font-semibold">{headerTitle}</h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      
      <div
        {...getRootProps()}
        className={cn(
          "p-8 border-2 border-dashed transition-colors cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          {
            "border-primary/50 bg-primary/10": isDragActive && !isDragReject,
            "border-destructive/50 bg-destructive/10": isDragReject || hasErrors,
            "border-muted-foreground/25 bg-muted/10 hover:bg-muted/20": !isDragActive && !hasErrors,
            "opacity-50 cursor-not-allowed": isUploading,
          },
          showHeader ? "m-4 rounded-lg" : "rounded-lg"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center text-center">
          <Upload 
            className={cn(
              "h-12 w-12 mb-4",
              {
                "text-primary": isDragActive && !isDragReject,
                "text-destructive": isDragReject || hasErrors,
                "text-muted-foreground": !isDragActive && !hasErrors,
              }
            )} 
          />
          
          <h3 className="text-lg font-semibold mb-2">
            {isUploading 
              ? 'Uploading files...' 
              : isDragActive
                ? isDragReject 
                  ? 'Invalid file type'
                  : 'Drop files here'
                : 'Drag & drop files here'
            }
          </h3>
          
          <p className="text-muted-foreground mb-4">
            {isUploading 
              ? 'Please wait while files are being uploaded'
              : `Or click to browse (Max ${maxFiles} files, ${(maxFileSize / 1024 / 1024).toFixed(0)}MB each)`
            }
          </p>
          
          <Button disabled={isUploading} variant={hasErrors ? "destructive" : "default"}>
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Select Files'}
          </Button>
        </div>
        
        {hasErrors && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-md">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-4 w-4 text-destructive mr-2" />
              <span className="text-sm font-medium text-destructive">Upload Errors</span>
            </div>
            <ul className="text-xs text-destructive space-y-1">
              {fileRejections.map(({ file, errors }) => (
                <li key={file.name}>
                  <strong>{file.name}</strong>: {errors.map(e => e.message).join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
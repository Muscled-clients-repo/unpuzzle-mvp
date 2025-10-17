'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useBlogImageUpload, useBlogImageDelete } from '@/hooks/blog/useBlogImageUpload'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BlogImageUploadProps {
  value?: string // CDN URL
  onChange: (cdnUrl: string) => void
  onClear: () => void
  label?: string
  description?: string
  recommendedDimensions?: string
  className?: string
}

export function BlogImageUpload({
  value,
  onChange,
  onClear,
  label = 'Upload Image',
  description = 'Drag & drop an image or click to browse',
  recommendedDimensions,
  className
}: BlogImageUploadProps) {
  const uploadMutation = useBlogImageUpload()
  const deleteMutation = useBlogImageDelete()
  const [fileId, setFileId] = useState<string | undefined>()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]

    // Upload the file
    const result = await uploadMutation.mutateAsync(file)

    if (result.success && result.cdnUrl) {
      onChange(result.cdnUrl)
      setFileId(result.fileId)
    }
  }, [uploadMutation, onChange])

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1,
    disabled: uploadMutation.isPending
  })

  const handleRemove = async () => {
    if (fileId) {
      await deleteMutation.mutateAsync(fileId)
    }
    setFileId(undefined)
    onClear()
  }

  const isUploading = uploadMutation.isPending
  const isDeleting = deleteMutation.isPending

  // If image exists, show preview with remove button
  if (value) {
    return (
      <div className={cn("space-y-2", className)}>
        <label className="text-sm font-medium">{label}</label>
        <div className="relative border rounded-lg overflow-hidden bg-gray-50">
          <img
            src={value}
            alt="Uploaded image"
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-2 right-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Click the X button to remove and upload a new image</p>
          {recommendedDimensions && (
            <p className="text-xs text-blue-600">Recommended: {recommendedDimensions}</p>
          )}
        </div>
      </div>
    )
  }

  // Otherwise show dropzone
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium">{label}</label>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          {
            "border-primary/50 bg-primary/10": isDragActive && !isDragReject,
            "border-destructive/50 bg-destructive/10": isDragReject,
            "border-gray-300 bg-gray-50 hover:bg-gray-100": !isDragActive && !isDragReject,
            "opacity-50 cursor-not-allowed": isUploading,
          }
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-12 w-12 mb-4 text-primary animate-spin" />
              <p className="text-sm font-medium">Uploading image...</p>
            </>
          ) : (
            <>
              {isDragReject ? (
                <>
                  <ImageIcon className="h-12 w-12 mb-4 text-destructive" />
                  <p className="text-sm font-medium text-destructive">Invalid file type</p>
                  <p className="text-xs text-gray-500 mt-1">Only images are allowed</p>
                </>
              ) : isDragActive ? (
                <>
                  <Upload className="h-12 w-12 mb-4 text-primary" />
                  <p className="text-sm font-medium">Drop image here</p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 mb-4 text-gray-400" />
                  <p className="text-sm font-medium mb-1">{description}</p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP up to 10MB</p>
                  {recommendedDimensions && (
                    <p className="text-xs text-blue-600 mt-2">Recommended: {recommendedDimensions}</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

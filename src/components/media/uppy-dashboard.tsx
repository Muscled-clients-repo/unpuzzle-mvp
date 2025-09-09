"use client"

import { useEffect, useRef } from 'react'
import { Dashboard } from '@uppy/react'
import Uppy from '@uppy/core'
import XHRUpload from '@uppy/xhr-upload'
import { useUploadMediaFile } from '@/hooks/use-media-queries'

// Remove Uppy styles - will add via CDN or global CSS

interface UppyDashboardProps {
  onUploadSuccess?: (file: any, response: any) => void
  onUploadError?: (file: any, error: any) => void
  endpoint?: string
  allowedFileTypes?: string[]
  maxFileSize?: number
  maxNumberOfFiles?: number
}

export function UppyDashboard({
  onUploadSuccess,
  onUploadError,
  endpoint = '/api/media/upload', // Updated endpoint
  allowedFileTypes = ['video/*', 'image/*'],
  maxFileSize = 1024 * 1024 * 1024, // 1GB
  maxNumberOfFiles = 10
}: UppyDashboardProps) {
  const uppyRef = useRef<Uppy>()
  const uploadMutation = useUploadMediaFile()

  useEffect(() => {
    // ARCHITECTURE-COMPLIANT: Initialize Uppy instance
    const uppy = new Uppy({
      debug: true,
      autoProceed: false,
      allowMultipleUploads: true,
      restrictions: {
        maxFileSize,
        maxNumberOfFiles,
        allowedFileTypes
      }
    })

    // Configure XHR Upload
    uppy.use(XHRUpload, {
      endpoint,
      method: 'POST',
      formData: true,
      fieldName: 'file',
      // Add authorization headers if needed
      headers: {
        // 'Authorization': `Bearer ${token}` // TODO: Add auth token
      }
    })

    // ARCHITECTURE-COMPLIANT: Event handlers for TanStack Query integration
    uppy.on('upload-success', (file, response) => {
      console.log('📤 Upload success:', file.name, response)
      onUploadSuccess?.(file, response)
    })

    uppy.on('upload-error', (file, error) => {
      console.error('❌ Upload error:', file.name, error)
      onUploadError?.(file, error)
    })

    uppy.on('upload-progress', (file, progress) => {
      console.log('📈 Upload progress:', file.name, `${progress.percentage}%`)
      // TODO: Integrate with WebSocket progress system
    })

    uppy.on('complete', (result) => {
      console.log('✅ Upload complete:', result)
      // TODO: Trigger TanStack Query cache invalidation
    })

    uppyRef.current = uppy

    return () => {
      uppy.destroy()
    }
  }, [endpoint, onUploadSuccess, onUploadError, maxFileSize, maxNumberOfFiles])

  return (
    <div className="uppy-dashboard-container min-h-[400px]">
      {uppyRef.current && (
        <Dashboard
          uppy={uppyRef.current}
          proudlyDisplayPoweredByUppy={false}
          height={400}
          width="100%"
          theme="light"
          showProgressDetails={true}
          hideUploadButton={false}
          hideRetryButton={false}
          hidePauseResumeButton={false}
          hideCancelButton={false}
          showRemoveButtonAfterComplete={true}
          note="Drag and drop files here or click to browse"
        />
      )}
    </div>
  )
}